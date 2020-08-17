import React, { forwardRef, memo, useRef } from 'react';
import clsx from 'clsx';
import { EditorContainer, EditorPortal } from './editors';
import { wrapEvent } from './utils';
import { useCombinedRefs } from './hooks';
function Cell({ className, column, isCopied, isDraggedOver, isRowSelected, lastFrozenColumnIndex, row, rowIdx, eventBus, selectedCellProps, onRowClick, onKeyDown, onClick, onDoubleClick, onContextMenu, ...props }, ref) {
    const cellRef = useRef(null);
    const isSelected = selectedCellProps !== undefined;
    const isEditing = selectedCellProps?.mode === 'EDIT';
    const { cellClass } = column;
    className = clsx('rdg-cell', {
        'rdg-cell-frozen': column.frozen,
        'rdg-cell-frozen-last': column.idx === lastFrozenColumnIndex,
        'rdg-cell-selected': isSelected,
        'rdg-cell-copied': isCopied,
        'rdg-cell-dragged-over': isDraggedOver
    }, typeof cellClass === 'function' ? cellClass(row) : cellClass, className);
    function selectCell(openEditor) {
        eventBus.dispatch('SELECT_CELL', { idx: column.idx, rowIdx }, openEditor);
    }
    function handleClick() {
        selectCell();
        onRowClick?.(rowIdx, row, column);
    }
    function handleContextMenu() {
        selectCell();
    }
    function handleDoubleClick() {
        selectCell(true);
    }
    function onRowSelectionChange(checked, isShiftClick) {
        eventBus.dispatch('SELECT_ROW', { rowIdx, checked, isShiftClick });
    }
    function getCellContent() {
        if (selectedCellProps && selectedCellProps.mode === 'EDIT') {
            const { editorPortalTarget, ...editorProps } = selectedCellProps.editorContainerProps;
            const { scrollTop: docTop, scrollLeft: docLeft } = document.scrollingElement || document.documentElement;
            const { left, top } = cellRef.current.getBoundingClientRect();
            const gridLeft = left + docLeft;
            const gridTop = top + docTop;
            return (React.createElement(EditorPortal, { target: editorPortalTarget },
                React.createElement(EditorContainer, Object.assign({}, editorProps, { rowIdx: rowIdx, row: row, column: column, left: gridLeft, top: gridTop }))));
        }
        return (React.createElement(React.Fragment, null,
            React.createElement(column.formatter, { column: column, rowIdx: rowIdx, row: row, isCellSelected: isSelected, isRowSelected: isRowSelected, onRowSelectionChange: onRowSelectionChange }),
            selectedCellProps?.dragHandleProps && (React.createElement("div", Object.assign({ className: "rdg-cell-drag-handle" }, selectedCellProps.dragHandleProps)))));
    }
    return (React.createElement("div", Object.assign({ role: "gridcell", "aria-colindex": column.idx + 1, "aria-selected": isSelected, ref: useCombinedRefs(cellRef, ref), className: className, style: {
            width: column.width,
            left: column.left
        }, onKeyDown: selectedCellProps ? wrapEvent(selectedCellProps.onKeyDown, onKeyDown) : onKeyDown, onClick: isEditing ? onClick : wrapEvent(handleClick, onClick), onDoubleClick: isEditing ? onDoubleClick : wrapEvent(handleDoubleClick, onDoubleClick), onContextMenu: isEditing ? onContextMenu : wrapEvent(handleContextMenu, onContextMenu) }, props), getCellContent()));
}
export default memo(forwardRef(Cell));
//# sourceMappingURL=Cell.js.map