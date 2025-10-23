declare module '@milkdown/plugin-slash' {
    export const slashFactory: <Id extends string>(
        id: Id
    ) => <T = Record<string, unknown>>() => T;
    export class SlashProvider {
        constructor(options: Record<string, unknown> | undefined);
        element: HTMLElement;
        onShow: () => void;
        onHide: () => void;
        show: () => void;
        hide: () => void;
        destroy: () => void;
        getContent: (
            view: unknown,
            matchNode?: (node: unknown) => boolean
        ) => string | undefined;
        update?: (view: unknown, prevState?: unknown) => void;
    }
}
