import React, { createElement, memo } from 'react';
import clsx from 'clsx';
function FilterRow({ columns, filters, onFiltersChange }) {
    function onChange(key, value) {
        const newFilters = { ...filters };
        newFilters[key] = value;
        onFiltersChange?.(newFilters);
    }
    return (React.createElement("div", { role: "row", "aria-rowindex": 2, className: "rdg-filter-row" }, columns.map(column => {
        const { key } = column;
        const className = clsx('rdg-cell', {
            'rdg-cell-frozen': column.frozen,
            'rdg-cell-frozen-last': column.isLastFrozenColumn
        });
        const style = {
            width: column.width,
            left: column.left
        };
        return (React.createElement("div", { key: key, style: style, className: className }, column.filterRenderer && createElement(column.filterRenderer, {
            column,
            value: filters?.[column.key],
            onChange: value => onChange(key, value)
        })));
    })));
}
export default memo(FilterRow);
//# sourceMappingURL=FilterRow.js.map