import { childrenStart, ChildVode, PatchableState, props, Props, Tag, Vode } from "./vode";

export type KeyedProps<S = PatchableState> = Props<S> & { key: string | number };
export type KeyedVode<S = PatchableState> = [tag: Tag, props: Props<S> | KeyedChild<S>, ...children: KeyedChild<S>[]];
export type KeyedChild<S = PatchableState> = [tag: Tag, props: KeyedProps<S> | ChildVode<S>, ...children: ChildVode<S>[]];

export function keyed<S extends PatchableState>(container: KeyedVode<S>): Vode<S> {
    const kidsStart = childrenStart(container);
    if (kidsStart < 0) return container;

    for (let i = kidsStart; i < container.length; i++) {
        const p = props(container[i] as KeyedVode<S>) as KeyedProps;
        if (typeof p.key !== "string" && typeof p.key !== "number")
            throw new Error(`no string or number key defined on child at index ${i}`);
    }

    // TODO: implement keyed diffing algorithm 

    return container;
}