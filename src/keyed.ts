import { AttachedVode, childrenStart, ChildVode, DomElement, $NODE, NoVode, PatchableState, props, Props, RenderedVode, Tag, Vode } from "./vode";

export type KeyedProps<S = PatchableState> = Props<S> & { key: string };
export type KeyedVode<S = PatchableState> = [
    tag: Tag,
    props?: Props<S> | KeyedChild<S> | WideKeyedChild<S> | NoVode,
    ...children: (KeyedChild<S> | WideKeyedChild<S> | NoVode)[],
];
export type KeyedChild<S = PatchableState> = [
    tag: Tag,
    props: KeyedProps<S>,
    ...children: ChildVode<S>[],
];

/** necessary for children passed by using spread operator */
type WideKeyedChild<S = PatchableState> = (Tag | KeyedProps<S> | WideChild<S>)[];
type WideChild<S> = ChildVode<S> | (Tag | Props<S> | WideChild<S>)[];

const TEXT_NODE = 3;

type DomNode = DomElement;
type Slot = AttachedVode | DomNode | undefined;

/**
 * **Keyed reconciliation** for vode. Reuse, reorder, insert and remove list items
 * by a stable `key` instead of by position. Use this when you have a usecase where
 * the order of items can change dynamically, but you need to maintain the DOM reference
 * to the vode at the same position.
 *
 * ```ts
 * const state = {
 *   items: [
 *     { id: "1", label: "item 1" },
 *     { id: "2", label: "item 2" },
 *     { id: "3", label: "item 3" },
 *   ],
 * }
 * 
 * app(container, state, (s) => [DIV,
 *   keyed([UL, { class: "todos" },
 *     ...s.items.map(it => [LI, { key: it.id }, it.label]),
 *   ]),
 * ]);
 * ```
 *
 * All direct children of the vode passed to `keyed()` must carry a unique string `key` in their props.
 * **key**s must be unique strings within a call and should be a *stable identity* of the
 * item.
 */
export function keyed<S extends PatchableState = PatchableState>(
    container: KeyedVode<S>,
): Vode<S> {
    const kidsStart = childrenStart(container as unknown as Vode<S>);
    // no children to reconcile
    if (kidsStart < 0) return container as unknown as Vode<S>;

    // NoVode children are skipped
    const kids = (container.slice(kidsStart) as (KeyedChild<S> | NoVode)[]).filter(
        (c): c is KeyedChild<S> => !!c,
    );

    const seen = new Set<string>();
    for (let i = 0; i < kids.length; i++) {
        const key = (props(kids[i]) as KeyedProps<S> | undefined)?.key;
        if (typeof key !== "string")
            throw new Error(`keyed(): no string key defined on child at index ${i}`);
        if (seen.has(key)) throw new Error(`keyed(): duplicate key "${key}"`);
        seen.add(key);
    }

    // rebuild the container with a props object that carries the reconcile hook. a
    // container without its own props (`[tag, child, ...]`) gets a fresh one.
    const userProps = kidsStart === 2 ? (container[1] as Props<S>) : undefined;
    const userReconcile = userProps?.reconciled;
    const containerProps: Props<S> = {
        ...userProps,
        reconciled:
            typeof userReconcile === "function"
                ? (s: S, newVode: RenderedVode, oldVode: RenderedVode | undefined) => {
                    reconcile(s, newVode, oldVode);
                    userReconcile(s, newVode, oldVode);
                }
                : reconcile,
    };
    return [container[0], containerProps, ...kids] as unknown as Vode<S>;
}

function reconcile<S extends PatchableState>(
    _s: S,
    newVode: RenderedVode,
    oldVode: RenderedVode | undefined,
): void {
    if (!newVode || !oldVode) return;

    const oldStart = childrenStart(oldVode);
    // previous render produced no children, nothing to reconcile
    if (oldStart < 0) return;
    const newStart = childrenStart(newVode);

    const oldSlots = oldVode.slice(oldStart) as Slot[];
    const slotByKey = new Map<string, Slot>();
    for (const slot of oldSlots) {
        const k = keyOf(slot);
        // first occurrence wins (duplicate keys throw an error)
        if (k !== undefined && !slotByKey.has(k)) slotByKey.set(k, slot);
    }

    const newKeys: (string | undefined)[] =
        newStart > 0 ? (newVode.slice(newStart) as ChildVode[]).map(keyOf) : [];
    const newKeySet = new Set(newKeys);

    const removed: Slot[] = [];
    for (const slot of oldSlots) {
        const k = keyOf(slot);
        if (k === undefined || slotByKey.get(k) !== slot || !newKeySet.has(k)) removed.push(slot);
    }

    // reorder the real DOM
    const node = oldVode[$NODE] as unknown as DomNode;
    const desired: DomNode[] = [];
    for (const k of newKeys) {
        if (k === undefined) continue;
        const dn = nodeOf(slotByKey.get(k));
        if (dn) desired.push(dn);
    }
    for (const slot of removed) {
        const dn = nodeOf(slot);
        if (dn) desired.push(dn);
    }
    reorder(node, desired);

    // permute the old slot array in place so it lines up, by index
    const slots = oldVode as unknown as Slot[];
    slots.length = oldStart;
    for (const k of newKeys) {
        slots.push(k !== undefined ? slotByKey.get(k) : undefined);
    }
    for (const slot of removed) {
        slots.push(slot);
    }
}

function keyOf(v: Slot | ChildVode): string | undefined {
    const k = (props(v as ChildVode) as KeyedProps | undefined)?.key;
    return typeof k === "string" ? k : undefined;
}

function nodeOf(slot: Slot): DomNode | undefined {
    if (!slot) return undefined;
    if ((slot as DomNode).nodeType === TEXT_NODE) return slot as DomNode;
    return (slot as { [$NODE]?: DomNode })[$NODE];
}

function reorder(parent: DomNode, desired: DomNode[]): void {
    const n = desired.length;
    if (n < 2) return;

    // target position of every desired node
    const pos = new Map<DomNode, number>();
    for (let i = 0; i < n; i++) pos.set(desired[i], i);

    // target positions in current DOM order
    const seq: number[] = [];
    const kids = parent.childNodes;
    for (let i = 0; i < kids.length; i++) {
        const p = pos.get(kids[i] as DomNode);
        if (p !== undefined) seq.push(p);
    }

    // common case: nothing moved
    if (seq.length === n) {
        let sorted = true;
        for (let i = 1; i < n; i++) {
            if (seq[i] < seq[i - 1]) {
                sorted = false;
                break;
            }
        }
        if (sorted) return;
    }

    const stays = lis(seq);

    let anchor: DomNode | undefined;
    for (let i = n - 1; i >= 0; i--) {
        const node = desired[i];
        if (!stays.has(i)) {
            if (anchor && anchor.before) anchor.before(node);
            else if (parent.appendChild) parent.appendChild(node);
        }
        anchor = node;
    }
}

/** patient sort: the values forming a longest strictly increasing subsequence of `seq` */
function lis(seq: number[]): Set<number> {
    const tails: number[] = [];
    const prev = new Array<number>(seq.length).fill(-1);
    for (let i = 0; i < seq.length; i++) {
        const v = seq[i];
        // binary search: first subsequence length whose tail is >= v (to be replaced by v)
        let lo = 0, hi = tails.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (seq[tails[mid]] < v) lo = mid + 1;
            else hi = mid;
        }
        if (lo > 0) prev[i] = tails[lo - 1];
        tails[lo] = i;
    }

    const stays = new Set<number>();
    let k = tails.length > 0 ? tails[tails.length - 1] : -1;
    while (k >= 0) {
        stays.add(seq[k]);
        k = prev[k];
    }
    return stays;
}
