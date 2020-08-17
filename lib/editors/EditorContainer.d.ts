import { CalculatedColumn, Omit, SharedEditorContainerProps } from '../types';
export interface EditorContainerProps<R, SR> extends Omit<SharedEditorContainerProps, 'editorPortalTarget'> {
    rowIdx: number;
    row: R;
    column: CalculatedColumn<R, SR>;
    top: number;
    left: number;
}
export default function EditorContainer<R, SR>({ rowIdx, column, row, rowHeight, left, top, onCommit, onCommitCancel, scrollLeft, scrollTop, firstEditorKeyPress: key }: EditorContainerProps<R, SR>): JSX.Element;
