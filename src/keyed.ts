import { ChildVode, PatchableState, Props, RECONCILE, ReconcileHook, Tag, Vode } from "./vode";

/** a single keyed entry: a stable key and the child vode to render for it */
export type KeyedEntry<S = PatchableState> = readonly [key: string | number, child: ChildVode<S>];

/** internal: an attached child slot is either an attached element-vode
 * (an array carrying a `.node`) or an attached text node. */
type Slot = (Vode & { node?: DomNode }) | (DomNode & { node?: never }) | undefined;
type DomNode = {
    nodeType?: number,
    childNodes: ArrayLike<DomNode>,
    before?: (n: DomNode) => void,
    appendChild?: (n: DomNode) => void,
};
type Container<S> = Vode<S> & { node?: DomNode };

const TEXT_NODE = 3;
/** the container is always `[tag, props, ...kids]`, so children start at index 2 */
const HEADER = 2;
/** symbol-keyed prop in which we stash this render's key order on the container, so
 * the next render's reconcile hook can recover the previous order from the old vode.
 * a symbol keeps it invisible to vode's prop-patching and `for..in`. */
const KEYS = Symbol("keyed.keys");

/**
 * Userspace **keyed reconciliation** for vode — efficient reordering, insertion
 * and removal of list items.
 *
 * vode reconciles children purely by index and never moves an existing DOM node;
 * it only reuses a node in place, creates a new one, or removes one. That means a
 * naive list patches content into whichever node happens to sit at each index,
 * losing element identity (focus, scroll, input state, running animations) and
 * re-touching every node after an insert/remove.
 *
 * `keyed()` fixes this. It is **stateless** — call it inline every render, like any
 * other vode helper; there is nothing to create once and reuse. It returns a fresh
 * container vode carrying a {@link RECONCILE} hook in its props. vode invokes that
 * hook during the container's `element -> element` reconcile, *before* it diffs the
 * children, handing it the previous render's attached array (the one still holding
 * the real DOM nodes) and the live node. The hook then:
 *
 * 1. physically reorders the container's real DOM children into the new key order
 *    (the one thing vode won't do), and
 * 2. permutes the slots of that old array so they line up, by index, with the new
 *    entries.
 *
 * vode's positional diff then lands each key on its own node: survivors are reused
 * in place (just a cheap prop/children patch, identity preserved), new keys are
 * created and inserted at the right spot, and removed keys are the trailing extras
 * vode unmounts and removes (so `onUnmount` still fires).
 *
 * ```ts
 * app(container, state, (s) => [DIV,
 *     // just call it inline every render:
 *     keyed(UL, { class: "todos" },
 *         s.items.map(it => [it.id, [LI, { id: it.id }, it.label]] as const)),
 * ]);
 * ```
 *
 * Contract:
 * - **Keys must be unique within a call** and should be a *stable identity* of the
 *   item (an id), never the array index — an index key defeats the whole point.
 * - The key order rides on the produced container's props (a symbol key), so the
 *   only thing tying one render to the next is the container DOM node itself. If a
 *   parent swaps the container's tag away and back, keyed simply re-syncs from the
 *   render it reappears on.
 *
 * @param tag tag of the container element that wraps the list (default `"div"`)
 * @param props props for the container element this render
 * @param entries the `[key, child]` entries to render, in the desired order
 */
export function keyed<S = PatchableState>(entries: readonly KeyedEntry<S>[]): Vode<S>;
export function keyed<S = PatchableState>(tag: Tag, entries: readonly KeyedEntry<S>[]): Vode<S>;
export function keyed<S = PatchableState>(tag: Tag, props: Props<S> | null | undefined, entries: readonly KeyedEntry<S>[]): Vode<S>;
export function keyed<S = PatchableState>(
    a: Tag | readonly KeyedEntry<S>[],
    b?: Props<S> | null | readonly KeyedEntry<S>[],
    c?: readonly KeyedEntry<S>[],
): Vode<S> {
    let tag: Tag, props: Props<S> | null | undefined, entries: readonly KeyedEntry<S>[];
    if (Array.isArray(a)) {
        tag = "div"; props = undefined; entries = a as readonly KeyedEntry<S>[];
    } else {
        tag = a as Tag;
        if (Array.isArray(b)) { props = undefined; entries = b as readonly KeyedEntry<S>[]; }
        else { props = b as Props<S> | null | undefined; entries = c as readonly KeyedEntry<S>[]; }
    }

    const n = entries.length;
    const nextKeys: string[] = new Array(n);
    const nextChildren: ChildVode<S>[] = new Array(n);
    const nextSet = new Set<string>();
    for (let i = 0; i < n; i++) {
        const key = String(entries[i][0]);
        if (nextSet.has(key)) throw new Error(`keyed(): duplicate key "${key}"`);
        nextSet.add(key);
        nextKeys[i] = key;
        nextChildren[i] = entries[i][1];
    }

    // closes over this render's keys; vode calls it (before the child diff) with the
    // *old* container array, which still holds the previous render's attached slots.
    const reconcile: ReconcileHook<S> = (oldVode, _newVode, node) => {
        const old = oldVode as Container<S>;
        const dom = node as unknown as DomNode;
        const prevKeys = (old[1] as Record<PropertyKey, unknown> | undefined)?.[KEYS] as string[] | undefined;
        // no recorded key order (a freshly created / hydrated container): nothing to
        // realign — let vode reconcile the children positionally as usual.
        if (!prevKeys) return;

        const oldSlot = new Map<string, Slot>();
        for (let i = 0; i < prevKeys.length; i++) {
            oldSlot.set(prevKeys[i], old[HEADER + i] as Slot);
        }

        const deleted: string[] = [];
        for (let i = 0; i < prevKeys.length; i++) {
            if (!nextSet.has(prevKeys[i])) deleted.push(prevKeys[i]);
        }

        // (1) reorder the real DOM: survivors in the new order, then the
        // soon-to-be-removed nodes parked at the tail. This is the move vode will
        // not perform itself.
        const desired: DomNode[] = [];
        for (let i = 0; i < n; i++) {
            if (oldSlot.has(nextKeys[i])) {
                const dn = nodeOf(oldSlot.get(nextKeys[i]));
                if (dn) desired.push(dn);
            }
        }
        for (let i = 0; i < deleted.length; i++) {
            const dn = nodeOf(oldSlot.get(deleted[i]));
            if (dn) desired.push(dn);
        }
        reorder(dom, desired);

        // (2) permute the old array's slots to line up with the new entries:
        // surviving key -> its old slot (reuse), new key -> undefined (create),
        // deleted keys appended at the tail (vode removes them as extras).
        const slots = old as unknown as Slot[];
        slots.length = HEADER;
        for (let i = 0; i < n; i++) {
            slots.push(oldSlot.has(nextKeys[i]) ? oldSlot.get(nextKeys[i]) : undefined);
        }
        for (let i = 0; i < deleted.length; i++) {
            slots.push(oldSlot.get(deleted[i]));
        }
    };

    // a fresh container for vode to reconcile. the reconcile hook + this render's key
    // order ride along as symbol-keyed props (invisible to prop-patching), so nothing
    // outside this array needs to be remembered between renders.
    const containerProps: Record<PropertyKey, unknown> = {
        ...(props as object),
        [RECONCILE]: reconcile,
        [KEYS]: nextKeys,
    };
    return [tag, containerProps, ...nextChildren] as unknown as Vode<S>;
}

/** the DOM node backing an attached slot (the text node itself, or an element
 * vode's `.node`), or undefined when the slot rendered nothing. */
function nodeOf(slot: Slot): DomNode | undefined {
    if (!slot) return undefined;
    if ((slot as DomNode).nodeType === TEXT_NODE) return slot as DomNode;
    return (slot as { node?: DomNode }).node;
}

/** reorder `parent`'s children to match `desired` (a permutation of the current
 * children), moving only nodes that are out of place. Relies only on `childNodes`
 * + `ChildNode.before`, both supported by the test fake DOM. */
function reorder(parent: DomNode, desired: DomNode[]): void {
    for (let i = 0; i < desired.length; i++) {
        const node = desired[i];
        const current = parent.childNodes[i] as DomNode | undefined;
        if (current === node) continue;
        // invariant: indices [0..i-1] already hold desired[0..i-1], so `node` is
        // not yet placed and sits at some index > i. Moving it before `current`
        // (at index i) doesn't disturb the settled prefix.
        if (current && current.before) current.before(node);
        else if (parent.appendChild) parent.appendChild(node);
    }
}
