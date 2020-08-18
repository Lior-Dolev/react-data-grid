import React from 'react';
import { CellRendererProps, SharedEditorContainerProps, SharedEditor2Props } from './types';
declare type SharedCellRendererProps<R, SR> = Pick<CellRendererProps<R, SR>, 'rowIdx' | 'row' | 'column' | 'lastFrozenColumnIndex'>;
interface EditCellRendererProps<R, SR> extends SharedCellRendererProps<R, SR>, Omit<React.HTMLAttributes<HTMLDivElement>, 'style' | 'children'> {
    editorPortalTarget: Element;
    editorContainerProps: SharedEditorContainerProps;
    editor2Props: SharedEditor2Props<R>;
}
declare const _default: <R, SR = unknown>(props: EditCellRendererProps<R, SR> & {
    ref?: React.RefObject<HTMLDivElement> | ((instance: HTMLDivElement | null) => void) | null | undefined;
}) => JSX.Element;
export default _default;
