import { CalculatedColumn } from '../types';
import { DataGridProps } from '../DataGrid';
declare type SharedDataGridProps<R, K extends keyof R, SR> = Pick<DataGridProps<R, K, SR>, 'columns' | 'defaultColumnOptions'>;
interface ViewportColumnsArgs<R, K extends keyof R, SR> extends SharedDataGridProps<R, K, SR> {
    viewportWidth: number;
    scrollLeft: number;
    columnWidths: ReadonlyMap<string, number>;
}
export declare function useViewportColumns<R, K extends keyof R, SR>({ columns: rawColumns, columnWidths, viewportWidth, scrollLeft, defaultColumnOptions }: ViewportColumnsArgs<R, K, SR>): {
    columns: readonly CalculatedColumn<R, SR>[];
    viewportColumns: readonly CalculatedColumn<R, SR>[];
    totalColumnWidth: number;
    lastFrozenColumnIndex: number;
};
export {};
