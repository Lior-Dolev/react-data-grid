import { useMemo } from 'react';
import { getColumnMetrics, getHorizontalRangeToRender, getViewportColumns } from '../utils';
import { ValueFormatter } from '../formatters';
export function useViewportColumns({ columns: rawColumns, columnWidths, viewportWidth, scrollLeft, defaultColumnOptions }) {
    const minColumnWidth = defaultColumnOptions?.minWidth ?? 80;
    const defaultFormatter = defaultColumnOptions?.formatter ?? ValueFormatter;
    const defaultSortable = defaultColumnOptions?.sortable ?? false;
    const defaultResizable = defaultColumnOptions?.resizable ?? false;
    const { columns, lastFrozenColumnIndex, totalColumnWidth } = useMemo(() => {
        return getColumnMetrics({
            columns: rawColumns,
            minColumnWidth,
            viewportWidth,
            columnWidths,
            defaultSortable,
            defaultResizable,
            defaultFormatter
        });
    }, [columnWidths, defaultFormatter, defaultResizable, defaultSortable, minColumnWidth, rawColumns, viewportWidth]);
    const [colOverscanStartIdx, colOverscanEndIdx] = useMemo(() => {
        return getHorizontalRangeToRender(columns, lastFrozenColumnIndex, viewportWidth, scrollLeft);
    }, [scrollLeft, columns, lastFrozenColumnIndex, viewportWidth]);
    const viewportColumns = useMemo(() => {
        return getViewportColumns(columns, colOverscanStartIdx, colOverscanEndIdx);
    }, [colOverscanEndIdx, colOverscanStartIdx, columns]);
    return { columns, viewportColumns, totalColumnWidth, lastFrozenColumnIndex };
}
//# sourceMappingURL=useViewportColumns.js.map