import React, { forwardRef, useState, useRef, useLayoutEffect, useEffect, useImperativeHandle, useCallback, createElement, } from "react";
import clsx from "clsx";
import { useGridWidth, useViewportColumns } from "./hooks";
import EventBus from "./EventBus";
import HeaderRow from "./HeaderRow";
import FilterRow from "./FilterRow";
import Row from "./Row";
import SummaryRow from "./SummaryRow";
import { assertIsValidKey, getColumnScrollPosition, getScrollbarSize, getVerticalRangeToRender, getNextSelectedCellPosition, isSelectedCellEditable, canExitGrid, isCtrlKeyHeldDown, isDefaultCellInput, } from "./utils";
import { CellNavigationMode, UpdateActions } from "./enums";
/**
 * Main API Component to render a data grid of rows and columns
 *
 * @example
 *
 * <DataGrid columns={columns} rows={rows} />
 */
function DataGrid({ 
// Grid and data Props
columns: rawColumns, rows, summaryRows, rowKey, onRowsUpdate, onRowsChange, 
// Dimensions props
width, height = 350, rowHeight = 35, headerRowHeight = rowHeight, headerFiltersHeight = 45, 
// Feature props
selectedRows, onSelectedRowsChange, sortColumn, sortDirection, onSort, filters, onFiltersChange, defaultColumnOptions, 
// Custom renderers
rowRenderer: RowRenderer = Row, emptyRowsRenderer, 
// Event props
onRowClick, onScroll, onColumnResize, onSelectedCellChange, onCheckCellIsEditable, 
// Toggles and modes
enableFilters = false, enableCellCopyPaste = false, enableCellDragAndDrop = false, cellNavigationMode = CellNavigationMode.NONE, 
// Miscellaneous
editorPortalTarget = document.body, rowClass, 
// ARIA
"aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, }, ref) {
    /**
     * states
     */
    const [eventBus] = useState(() => new EventBus());
    const [scrollTop, setScrollTop] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [columnWidths, setColumnWidths] = useState(() => new Map());
    const [selectedPosition, setSelectedPosition] = useState({ idx: -1, rowIdx: -1, mode: "SELECT" });
    const [copiedPosition, setCopiedPosition] = useState(null);
    const [isDragging, setDragging] = useState(false);
    const [draggedOverRowIdx, setOverRowIdx] = useState(undefined);
    const setDraggedOverRowIdx = useCallback((rowIdx) => {
        setOverRowIdx(rowIdx);
        latestDraggedOverRowIdx.current = rowIdx;
    }, []);
    /**
     * refs
     */
    const focusSinkRef = useRef(null);
    const prevSelectedPosition = useRef(selectedPosition);
    const latestDraggedOverRowIdx = useRef(draggedOverRowIdx);
    const lastSelectedRowIdx = useRef(-1);
    /**
     * computed values
     */
    const [gridRef, gridWidth] = useGridWidth(width);
    const viewportWidth = gridWidth - 2; // 2 for border width;
    const headerRowsCount = enableFilters ? 2 : 1;
    const summaryRowsCount = summaryRows?.length ?? 0;
    const isSelectable = selectedRows !== undefined && onSelectedRowsChange !== undefined;
    const { columns, viewportColumns, totalColumnWidth, lastFrozenColumnIndex, } = useViewportColumns({
        columns: rawColumns,
        columnWidths,
        scrollLeft,
        viewportWidth,
        defaultColumnOptions,
    });
    const totalHeaderHeight = headerRowHeight + (enableFilters ? headerFiltersHeight : 0);
    const clientHeight = height -
        2 - // border width
        totalHeaderHeight -
        summaryRowsCount * rowHeight -
        (totalColumnWidth > viewportWidth ? getScrollbarSize() : 0);
    const [rowOverscanStartIdx, rowOverscanEndIdx] = getVerticalRangeToRender(clientHeight, rowHeight, scrollTop, rows.length);
    /**
     * effects
     */
    useLayoutEffect(() => {
        if (selectedPosition === prevSelectedPosition.current ||
            selectedPosition.mode === "EDIT" ||
            !isCellWithinBounds(selectedPosition))
            return;
        prevSelectedPosition.current = selectedPosition;
        scrollToCell(selectedPosition);
        const column = columns[selectedPosition.idx];
        if (column.formatterOptions?.focusable)
            return; // Let the formatter handle focus
        focusSinkRef.current.focus();
    });
    useEffect(() => {
        if (!onSelectedRowsChange)
            return;
        const handleRowSelectionChange = ({ rowIdx, checked, isShiftClick, }) => {
            assertIsValidKey(rowKey);
            const newSelectedRows = new Set(selectedRows);
            const rowId = rows[rowIdx][rowKey];
            if (checked) {
                newSelectedRows.add(rowId);
                const previousRowIdx = lastSelectedRowIdx.current;
                lastSelectedRowIdx.current = rowIdx;
                if (isShiftClick &&
                    previousRowIdx !== -1 &&
                    previousRowIdx !== rowIdx) {
                    const step = Math.sign(rowIdx - previousRowIdx);
                    for (let i = previousRowIdx + step; i !== rowIdx; i += step) {
                        newSelectedRows.add(rows[i][rowKey]);
                    }
                }
            }
            else {
                newSelectedRows.delete(rowId);
                lastSelectedRowIdx.current = -1;
            }
            onSelectedRowsChange(newSelectedRows);
        };
        return eventBus.subscribe("SELECT_ROW", handleRowSelectionChange);
    }, [eventBus, onSelectedRowsChange, rows, rowKey, selectedRows]);
    useEffect(() => {
        return eventBus.subscribe("SELECT_CELL", selectCell);
    });
    useImperativeHandle(ref, () => ({
        scrollToColumn(idx) {
            scrollToCell({ idx });
        },
        scrollToRow(rowIdx) {
            const { current } = gridRef;
            if (!current)
                return;
            current.scrollTop = rowIdx * rowHeight;
        },
        selectCell,
        deselectCell,
        commitChanges: handleCommit2,
    }));
    /**
     * event handlers
     */
    function handleKeyDown(event) {
        if (enableCellCopyPaste &&
            isCtrlKeyHeldDown(event) &&
            isCellWithinBounds(selectedPosition)) {
            // event.key may be uppercase `C` or `V`
            const lowerCaseKey = event.key.toLowerCase();
            if (lowerCaseKey === "c") {
                handleCopy();
                return;
            }
            if (lowerCaseKey === "v") {
                handlePaste();
                return;
            }
        }
        switch (event.key) {
            case "Escape":
                setCopiedPosition(null);
                closeEditor();
                return;
            case "ArrowUp":
            case "ArrowDown":
            case "ArrowLeft":
            case "ArrowRight":
            case "Tab":
            case "Home":
            case "End":
            case "PageUp":
            case "PageDown":
                navigate(event);
                break;
            default:
                handleCellInput(event);
                break;
        }
    }
    function handleScroll(event) {
        const { scrollTop, scrollLeft } = event.currentTarget;
        setScrollTop(scrollTop);
        setScrollLeft(scrollLeft);
        onScroll?.(event);
    }
    const handleColumnResize = useCallback((column, width) => {
        const newColumnWidths = new Map(columnWidths);
        newColumnWidths.set(column.key, width);
        setColumnWidths(newColumnWidths);
        onColumnResize?.(column.idx, width);
    }, [columnWidths, onColumnResize]);
    function handleCommit({ cellKey, rowIdx, updated }) {
        onRowsUpdate?.({
            cellKey,
            fromRow: rowIdx,
            toRow: rowIdx,
            updated,
            action: UpdateActions.CELL_UPDATE,
        });
        closeEditor();
    }
    function handleRowsChange(row) {
        const updatedRows = [...rows];
        updatedRows[selectedPosition.rowIdx] = row;
        onRowsChange?.(updatedRows);
        closeEditor();
    }
    function handleCommit2() {
        const { idx, rowIdx } = selectedPosition;
        const column = columns[idx];
        if (selectedPosition.mode === "SELECT" ||
            column?.editor2 === undefined ||
            selectedPosition.row === rows[rowIdx]) {
            return;
        }
        handleRowsChange(selectedPosition.row);
    }
    function handleCopy() {
        const { idx, rowIdx } = selectedPosition;
        const value = rows[rowIdx][columns[idx].key];
        setCopiedPosition({ idx, rowIdx, value });
    }
    function handlePaste() {
        if (copiedPosition === null ||
            !isCellEditable(selectedPosition) ||
            (copiedPosition.idx === selectedPosition.idx &&
                copiedPosition.rowIdx === selectedPosition.rowIdx)) {
            return;
        }
        const { rowIdx: toRow } = selectedPosition;
        const cellKey = columns[selectedPosition.idx].key;
        const { rowIdx: fromRow, idx, value } = copiedPosition;
        const fromCellKey = columns[idx].key;
        onRowsUpdate?.({
            cellKey,
            fromRow,
            toRow,
            updated: { [cellKey]: value },
            action: UpdateActions.COPY_PASTE,
            fromCellKey,
        });
    }
    function handleCellInput(event) {
        if (!isCellWithinBounds(selectedPosition))
            return;
        const { key } = event;
        const column = columns[selectedPosition.idx];
        if (selectedPosition.mode === "EDIT") {
            if (column.editor2 !== undefined && key === "Enter") {
                // Custom editors can listen for the event and stop propagation to prevent commit
                handleCommit2();
            }
            return;
        }
        column.editorOptions?.onCellKeyDown?.(event);
        if (event.isDefaultPrevented())
            return;
        if (isCellEditable(selectedPosition) && isDefaultCellInput(event)) {
            setSelectedPosition(({ idx, rowIdx }) => ({
                idx,
                rowIdx,
                key,
                mode: "EDIT",
                row: rows[rowIdx],
                originalRow: rows[rowIdx],
            }));
        }
    }
    function handleDragEnd() {
        if (latestDraggedOverRowIdx.current === undefined)
            return;
        const { idx, rowIdx } = selectedPosition;
        const column = columns[idx];
        const cellKey = column.key;
        const value = rows[rowIdx][cellKey];
        onRowsUpdate?.({
            cellKey,
            fromRow: rowIdx,
            toRow: latestDraggedOverRowIdx.current,
            updated: { [cellKey]: value },
            action: UpdateActions.CELL_DRAG,
        });
        setDraggedOverRowIdx(undefined);
    }
    function handleMouseDown(event) {
        if (event.buttons !== 1)
            return;
        setDragging(true);
        window.addEventListener("mouseover", onMouseOver);
        window.addEventListener("mouseup", onMouseUp);
        function onMouseOver(event) {
            // Trigger onMouseup in edge cases where we release the mouse button but `mouseup` isn't triggered,
            // for example when releasing the mouse button outside the iframe the grid is rendered in.
            // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
            if (event.buttons !== 1)
                onMouseUp();
        }
        function onMouseUp() {
            window.removeEventListener("mouseover", onMouseOver);
            window.removeEventListener("mouseup", onMouseUp);
            setDragging(false);
            handleDragEnd();
        }
    }
    function handleDoubleClick(event) {
        event.stopPropagation();
        const column = columns[selectedPosition.idx];
        const cellKey = column.key;
        const value = rows[selectedPosition.rowIdx][cellKey];
        onRowsUpdate?.({
            cellKey,
            fromRow: selectedPosition.rowIdx,
            toRow: rows.length - 1,
            updated: { [cellKey]: value },
            action: UpdateActions.COLUMN_FILL,
        });
    }
    function handleRowChange(row, commitChanges) {
        if (selectedPosition.mode === "SELECT")
            return;
        if (commitChanges) {
            handleRowsChange(row);
        }
        else {
            setSelectedPosition((position) => ({ ...position, row }));
        }
    }
    function handleOnClose(commitChanges) {
        if (selectedPosition.mode === "SELECT")
            return;
        if (commitChanges) {
            handleRowsChange(selectedPosition.row);
        }
        closeEditor();
    }
    /**
     * utils
     */
    function isCellWithinBounds({ idx, rowIdx }) {
        return (rowIdx >= 0 && rowIdx < rows.length && idx >= 0 && idx < columns.length);
    }
    function isCellEditable(position) {
        return (isCellWithinBounds(position) &&
            isSelectedCellEditable({
                columns,
                rows,
                selectedPosition: position,
                onCheckCellIsEditable,
            }));
    }
    function selectCell(position, enableEditor = false) {
        if (!isCellWithinBounds(position))
            return;
        handleCommit2();
        if (enableEditor && isCellEditable(position)) {
            const row = rows[position.rowIdx];
            setSelectedPosition({
                ...position,
                mode: "EDIT",
                key: null,
                row,
                originalRow: row,
            });
        }
        else {
            setSelectedPosition({ ...position, mode: "SELECT" });
        }
        onSelectedCellChange?.({ ...position });
    }
    function deselectCell() {
        setSelectedPosition({ idx: -1, rowIdx: -1, mode: "SELECT" });
        setCopiedPosition(null);
        setDraggedOverRowIdx(undefined);
    }
    function closeEditor() {
        if (selectedPosition.mode === "SELECT")
            return;
        setSelectedPosition(({ idx, rowIdx }) => ({ idx, rowIdx, mode: "SELECT" }));
    }
    function getFrozenColumnsWidth() {
        if (lastFrozenColumnIndex === -1)
            return 0;
        const lastFrozenCol = columns[lastFrozenColumnIndex];
        return lastFrozenCol.left + lastFrozenCol.width;
    }
    function scrollToCell({ idx, rowIdx }) {
        const { current } = gridRef;
        if (!current)
            return;
        if (typeof idx === "number" && idx > lastFrozenColumnIndex) {
            const { clientWidth } = current;
            const { left, width } = columns[idx];
            const isCellAtLeftBoundary = left < scrollLeft + width + getFrozenColumnsWidth();
            const isCellAtRightBoundary = left + width > clientWidth + scrollLeft;
            if (isCellAtLeftBoundary || isCellAtRightBoundary) {
                const newScrollLeft = getColumnScrollPosition(columns, idx, scrollLeft, clientWidth);
                current.scrollLeft = scrollLeft + newScrollLeft;
            }
        }
        if (typeof rowIdx === "number") {
            if (rowIdx * rowHeight < scrollTop) {
                // at top boundary, scroll to the row's top
                current.scrollTop = rowIdx * rowHeight;
            }
            else if ((rowIdx + 1) * rowHeight > scrollTop + clientHeight) {
                // at bottom boundary, scroll the next row's top to the bottom of the viewport
                current.scrollTop = (rowIdx + 1) * rowHeight - clientHeight;
            }
        }
    }
    function getNextPosition(key, ctrlKey, shiftKey) {
        const { idx, rowIdx } = selectedPosition;
        switch (key) {
            case "ArrowUp":
                return { idx, rowIdx: rowIdx - 1 };
            case "ArrowDown":
                return { idx, rowIdx: rowIdx + 1 };
            case "ArrowLeft":
                return { idx: idx - 1, rowIdx };
            case "ArrowRight":
                return { idx: idx + 1, rowIdx };
            case "Tab":
                if (selectedPosition.idx === -1 && selectedPosition.rowIdx === -1) {
                    return shiftKey
                        ? { idx: columns.length - 1, rowIdx: rows.length - 1 }
                        : { idx: 0, rowIdx: 0 };
                }
                return { idx: idx + (shiftKey ? -1 : 1), rowIdx };
            case "Home":
                return ctrlKey ? { idx: 0, rowIdx: 0 } : { idx: 0, rowIdx };
            case "End":
                return ctrlKey
                    ? { idx: columns.length - 1, rowIdx: rows.length - 1 }
                    : { idx: columns.length - 1, rowIdx };
            case "PageUp":
                return { idx, rowIdx: rowIdx - Math.floor(clientHeight / rowHeight) };
            case "PageDown":
                return { idx, rowIdx: rowIdx + Math.floor(clientHeight / rowHeight) };
            default:
                return selectedPosition;
        }
    }
    function navigate(event) {
        const { key, shiftKey } = event;
        const ctrlKey = isCtrlKeyHeldDown(event);
        let nextPosition = getNextPosition(key, ctrlKey, shiftKey);
        let mode = cellNavigationMode;
        if (key === "Tab") {
            // If we are in a position to leave the grid, stop editing but stay in that cell
            if (canExitGrid({
                shiftKey,
                cellNavigationMode,
                columns,
                rowsCount: rows.length,
                selectedPosition,
            })) {
                // Allow focus to leave the grid so the next control in the tab order can be focused
                return;
            }
            mode =
                cellNavigationMode === CellNavigationMode.NONE
                    ? CellNavigationMode.CHANGE_ROW
                    : cellNavigationMode;
        }
        // Do not allow focus to leave
        event.preventDefault();
        nextPosition = getNextSelectedCellPosition({
            columns,
            rowsCount: rows.length,
            cellNavigationMode: mode,
            nextPosition,
        });
        selectCell(nextPosition);
    }
    function getDraggedOverCellIdx(currentRowIdx) {
        if (draggedOverRowIdx === undefined)
            return;
        const { rowIdx } = selectedPosition;
        const isDraggedOver = rowIdx < draggedOverRowIdx
            ? rowIdx < currentRowIdx && currentRowIdx <= draggedOverRowIdx
            : rowIdx > currentRowIdx && currentRowIdx >= draggedOverRowIdx;
        return isDraggedOver ? selectedPosition.idx : undefined;
    }
    function getSelectedCellProps(rowIdx) {
        if (selectedPosition.rowIdx !== rowIdx)
            return;
        if (selectedPosition.mode === "EDIT") {
            return {
                mode: "EDIT",
                idx: selectedPosition.idx,
                onKeyDown: handleKeyDown,
                editorPortalTarget,
                editorContainerProps: {
                    rowHeight,
                    scrollLeft,
                    scrollTop,
                    firstEditorKeyPress: selectedPosition.key,
                    onCommit: handleCommit,
                    onCommitCancel: closeEditor,
                },
                editor2Props: {
                    rowHeight,
                    row: selectedPosition.row,
                    onRowChange: handleRowChange,
                    onClose: handleOnClose,
                },
            };
        }
        return {
            mode: "SELECT",
            idx: selectedPosition.idx,
            onKeyDown: handleKeyDown,
            dragHandleProps: enableCellDragAndDrop && isCellEditable(selectedPosition)
                ? { onMouseDown: handleMouseDown, onDoubleClick: handleDoubleClick }
                : undefined,
        };
    }
    function getViewportRows() {
        const rowElements = [];
        for (let rowIdx = rowOverscanStartIdx; rowIdx <= rowOverscanEndIdx; rowIdx++) {
            const row = rows[rowIdx];
            let key = rowIdx;
            let isRowSelected = false;
            if (rowKey !== undefined) {
                const rowId = row[rowKey];
                isRowSelected = selectedRows?.has(rowId) ?? false;
                if (typeof rowId === "string" || typeof rowId === "number") {
                    key = rowId;
                }
            }
            rowElements.push(React.createElement(RowRenderer, { "aria-rowindex": headerRowsCount + rowIdx + 1, "aria-selected": isSelectable ? isRowSelected : undefined, key: key, rowIdx: rowIdx, row: row, viewportColumns: viewportColumns, lastFrozenColumnIndex: lastFrozenColumnIndex, eventBus: eventBus, isRowSelected: isRowSelected, onRowClick: onRowClick, rowClass: rowClass, top: rowIdx * rowHeight + totalHeaderHeight, copiedCellIdx: copiedPosition?.rowIdx === rowIdx ? copiedPosition.idx : undefined, draggedOverCellIdx: getDraggedOverCellIdx(rowIdx), setDraggedOverRowIdx: isDragging ? setDraggedOverRowIdx : undefined, selectedCellProps: getSelectedCellProps(rowIdx) }));
        }
        return rowElements;
    }
    // Reset the positions if the current values are no longer valid. This can happen if a column or row is removed
    if (selectedPosition.idx >= columns.length ||
        selectedPosition.rowIdx >= rows.length) {
        setSelectedPosition({ idx: -1, rowIdx: -1, mode: "SELECT" });
        setCopiedPosition(null);
        setDraggedOverRowIdx(undefined);
    }
    if (selectedPosition.mode === "EDIT" &&
        rows[selectedPosition.rowIdx] !== selectedPosition.originalRow) {
        // Discard changes if rows are updated from outside
        closeEditor();
    }
    return (React.createElement("div", { role: "grid", "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, "aria-multiselectable": isSelectable ? true : undefined, "aria-colcount": columns.length, "aria-rowcount": headerRowsCount + rows.length + summaryRowsCount, className: clsx("rdg", { "rdg-viewport-dragging": isDragging }), style: {
            width,
            height,
            "--header-row-height": `${headerRowHeight}px`,
            "--filter-row-height": `${headerFiltersHeight}px`,
            "--row-width": `${totalColumnWidth}px`,
            "--row-height": `${rowHeight}px`,
        }, ref: gridRef, onScroll: handleScroll },
        React.createElement(HeaderRow, { rowKey: rowKey, rows: rows, columns: viewportColumns, onColumnResize: handleColumnResize, lastFrozenColumnIndex: lastFrozenColumnIndex, allRowsSelected: selectedRows?.size === rows.length, onSelectedRowsChange: onSelectedRowsChange, sortColumn: sortColumn, sortDirection: sortDirection, onSort: onSort }),
        enableFilters && (React.createElement(FilterRow, { lastFrozenColumnIndex: lastFrozenColumnIndex, columns: viewportColumns, filters: filters, onFiltersChange: onFiltersChange })),
        rows.length === 0 && emptyRowsRenderer ? (createElement(emptyRowsRenderer)) : (React.createElement(React.Fragment, null,
            React.createElement("div", { ref: focusSinkRef, tabIndex: 0, className: "rdg-focus-sink", onKeyDown: handleKeyDown }),
            React.createElement("div", { style: { height: Math.max(rows.length * rowHeight, clientHeight) } }),
            getViewportRows(),
            summaryRows?.map((row, rowIdx) => (React.createElement(SummaryRow, { "aria-rowindex": headerRowsCount + rows.length + rowIdx + 1, key: rowIdx, rowIdx: rowIdx, row: row, bottom: rowHeight * (summaryRows.length - 1 - rowIdx), viewportColumns: viewportColumns, lastFrozenColumnIndex: lastFrozenColumnIndex })))))));
}
export default forwardRef(DataGrid);
//# sourceMappingURL=DataGrid.js.map