import React from 'react';
import { SelectCellFormatter } from './formatters';
// TODO: fix type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SelectColumn = {
    key: 'select-row',
    name: '',
    width: 35,
    maxWidth: 35,
    resizable: false,
    frozen: true,
    headerRenderer(props) {
        return (React.createElement(SelectCellFormatter, { "aria-label": "Select All", value: props.allRowsSelected, onChange: props.onAllRowsSelectionChange }));
    },
    formatter(props) {
        return (React.createElement(SelectCellFormatter, { "aria-label": "Select", tabIndex: -1, isCellSelected: props.isCellSelected, value: props.isRowSelected, onChange: props.onRowSelectionChange }));
    },
    formatterOptions: {
        focusable: true
    }
};
//# sourceMappingURL=Columns.js.map