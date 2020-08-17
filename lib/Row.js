import React, { memo, forwardRef } from 'react';
import clsx from 'clsx';
import Cell from './Cell';
import { wrapEvent } from './utils';
function Row({ cellRenderer: CellRenderer = Cell, className, eventBus, rowIdx, isRowSelected, lastFrozenColumnIndex, copiedCellIdx, draggedOverCellIdx, row, viewportColumns, selectedCellProps, onRowClick, rowClass, setDraggedOverRowIdx, onMouseEnter, top, 'aria-rowindex': ariaRowIndex, 'aria-selected': ariaSelected, ...props }, ref) {
    function handleDragEnter() {
        setDraggedOverRowIdx?.(rowIdx);
    }
    className = clsx('rdg-row', `rdg-row-${rowIdx % 2 === 0 ? 'even' : 'odd'}`, { 'rdg-row-selected': isRowSelected }, rowClass?.(row), className);
    return (React.createElement("div", Object.assign({ role: "row", "aria-rowindex": ariaRowIndex, "aria-selected": ariaSelected, ref: ref, className: className, onMouseEnter: wrapEvent(handleDragEnter, onMouseEnter), style: { top } }, props), viewportColumns.map(column => (React.createElement(CellRenderer, { key: column.key, rowIdx: rowIdx, column: column, lastFrozenColumnIndex: lastFrozenColumnIndex, row: row, isCopied: copiedCellIdx === column.idx, isDraggedOver: draggedOverCellIdx === column.idx, isRowSelected: isRowSelected, eventBus: eventBus, selectedCellProps: selectedCellProps?.idx === column.idx ? selectedCellProps : undefined, onRowClick: onRowClick })))));
}
export default memo(forwardRef(Row));
//# sourceMappingURL=Row.js.map