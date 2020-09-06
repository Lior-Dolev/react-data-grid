import React, { memo, forwardRef } from 'react';
import clsx from 'clsx';
import Cell from './Cell';
import EditCell from './EditCell';
import { wrapEvent } from './utils';
function Row({ cellRenderer: CellRenderer = Cell, className, eventBus, rowIdx, isRowSelected, copiedCellIdx, draggedOverCellIdx, row, viewportColumns, selectedCellProps, onRowClick, rowClass, setDraggedOverRowIdx, onMouseEnter, top, 'aria-rowindex': ariaRowIndex, 'aria-selected': ariaSelected, ...props }, ref) {
    function handleDragEnter() {
        setDraggedOverRowIdx?.(rowIdx);
    }
    className = clsx('rdg-row', `rdg-row-${rowIdx % 2 === 0 ? 'even' : 'odd'}`, {
        'rdg-row-selected': isRowSelected,
        'rdg-group-row-selected': selectedCellProps?.idx === -1
    }, rowClass?.(row), className);
    return (React.createElement("div", Object.assign({ role: "row", "aria-rowindex": ariaRowIndex, "aria-selected": ariaSelected, ref: ref, className: className, onMouseEnter: wrapEvent(handleDragEnter, onMouseEnter), style: { top } }, props), viewportColumns.map(column => {
        const isCellSelected = selectedCellProps?.idx === column.idx;
        if (selectedCellProps?.mode === 'EDIT' && isCellSelected) {
            return (React.createElement(EditCell, { key: column.key, rowIdx: rowIdx, column: column, row: row, onKeyDown: selectedCellProps.onKeyDown, editorPortalTarget: selectedCellProps.editorPortalTarget, editorContainerProps: selectedCellProps.editorContainerProps, editor2Props: selectedCellProps.editor2Props }));
        }
        return (React.createElement(CellRenderer, { key: column.key, rowIdx: rowIdx, column: column, row: row, isCopied: copiedCellIdx === column.idx, isDraggedOver: draggedOverCellIdx === column.idx, isCellSelected: isCellSelected, isRowSelected: isRowSelected, eventBus: eventBus, dragHandleProps: isCellSelected ? selectedCellProps.dragHandleProps : undefined, onFocus: isCellSelected ? selectedCellProps.onFocus : undefined, onKeyDown: isCellSelected ? selectedCellProps.onKeyDown : undefined, onRowClick: onRowClick }));
    })));
}
export default memo(forwardRef(Row));
//# sourceMappingURL=Row.js.map