import { attr, eventually, expect } from "./helper";
import { app, createState, keyed, DIV, UL, LI, SPAN } from "../index";

type Item = { id: string; label: string };

/** the keyed container element (the app root's first child) */
function listNode(container: any) {
    return container.childNodes[0];
}

/** map of id -> the actual DOM node currently rendered for that id */
function nodesById(container: any): Record<string, any> {
    const out: Record<string, any> = {};
    const list = listNode(container);
    for (let i = 0; i < list.childNodes.length; i++) {
        const node = list.childNodes[i];
        out[attr(node, "id")!] = node;
    }
    return out;
}

/** ids in the order they currently appear in the DOM */
function orderInDom(container: any): string[] {
    const list = listNode(container);
    const ids: string[] = [];
    for (let i = 0; i < list.childNodes.length; i++) {
        ids.push(attr(list.childNodes[i], "id")!);
    }
    return ids;
}

function setup(items: Item[]) {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);

    const state = createState({ items });

    app(container, state, (s) => [DIV,
        keyed([UL, { class: "list" },
            ...s.items.map((it) => [LI, { key: it.id, id: it.id }, it.label]),
        ]),
    ]);

    return { state, container };
}

export default {
    "keyed(): renders entries in order inside the container": async () => {
        const { container } = setup([
            { id: "a", label: "A" },
            { id: "b", label: "B" },
            { id: "c", label: "C" },
        ]);

        await expect(container).toMatch(
            [DIV,
                [UL, { class: "list" },
                    [LI, { id: "a" }, "A"],
                    [LI, { id: "b" }, "B"],
                    [LI, { id: "c" }, "C"],
                ]
            ]
        );
    },

    "keyed(): throws when a child has no key": async () => {
        const err = expect(() => keyed([UL, [LI, { id: "x" }, "1"]] as any)).toFail();
        await expect(err.message).toEqual(`keyed(): no string key defined on child at index 0`);
    },

    "keyed(): throws on a non-string key": async () => {
        const err = expect(() => keyed([UL, [LI, { key: 1 }, "1"]] as any)).toFail();
        await expect(err.message).toEqual(`keyed(): no string key defined on child at index 0`);
    },

    "keyed(): throws on duplicate keys": async () => {
        const err = expect(() =>
            keyed([UL, [LI, { key: "x" }, "1"], [LI, { key: "x" }, "2"]] as any)).toFail();
        await expect(err.message).toEqual(`keyed(): duplicate key "x"`);
    },

    "keyed(): preserves node identity when items are swapped": async () => {
        const { state, container } = setup([
            { id: "a", label: "A" },
            { id: "b", label: "B" },
            { id: "c", label: "C" },
        ]);

        // initial render is synchronous, so the nodes exist already
        const before = nodesById(container);
        await expect(orderInDom(container)).toEqual(["a", "b", "c"]);

        // reverse the order
        state.patch({
            items: [
                { id: "c", label: "C" },
                { id: "b", label: "B" },
                { id: "a", label: "A" },
            ]
        });

        await eventually(() => orderInDom(container)).toEqual(["c", "b", "a"]);
        const after = nodesById(container);

        // every key kept its exact same DOM node (no recreation, true reorder)
        await expect(after["a"] === before["a"]).toEqual(true, "node for 'a' must be reused");
        await expect(after["b"] === before["b"]).toEqual(true, "node for 'b' must be reused");
        await expect(after["c"] === before["c"]).toEqual(true, "node for 'c' must be reused");
    },

    "keyed(): preserves per-node DOM state across a reorder": async () => {
        const { state, container } = setup([
            { id: "a", label: "A" },
            { id: "b", label: "B" },
        ]);

        // stamp some imperative DOM state on b's node (e.g. like focus/scroll)
        const bNode = nodesById(container)["b"];
        bNode.__scratch = "keepme";

        state.patch({
            items: [
                { id: "b", label: "B" },
                { id: "a", label: "A" },
            ]
        });

        await eventually(() => orderInDom(container)).toEqual(["b", "a"]);
        // same node instance => imperative state survived (naive diff would lose it)
        await expect(nodesById(container)["b"].__scratch).toEqual("keepme");
    },

    "keyed(): removing a middle item keeps the surviving nodes": async () => {
        const { state, container } = setup([
            { id: "a", label: "A" },
            { id: "b", label: "B" },
            { id: "c", label: "C" },
        ]);

        const before = nodesById(container);

        state.patch({
            items: [
                { id: "a", label: "A" },
                { id: "c", label: "C" },
            ]
        });

        await eventually(() => orderInDom(container)).toEqual(["a", "c"]);
        const after = nodesById(container);
        await expect(after["a"] === before["a"]).toEqual(true, "node for 'a' must be reused");
        await expect(after["c"] === before["c"]).toEqual(true, "node for 'c' must be reused");
        await expect(after["b"]).toEqual(undefined, "node for 'b' must be removed");
    },

    "keyed(): inserting an item in the middle keeps existing nodes": async () => {
        const { state, container } = setup([
            { id: "a", label: "A" },
            { id: "b", label: "B" },
        ]);

        const before = nodesById(container);

        state.patch({
            items: [
                { id: "a", label: "A" },
                { id: "x", label: "X" },
                { id: "b", label: "B" },
            ]
        });

        await eventually(() => orderInDom(container)).toEqual(["a", "x", "b"]);
        const after = nodesById(container);
        await expect(after["a"] === before["a"]).toEqual(true, "node for 'a' must be reused");
        await expect(after["b"] === before["b"]).toEqual(true, "node for 'b' must be reused");
        await expect(typeof after["x"]).toEqual("object", "node for 'x' must be created");
    },

    "keyed(): simultaneous reorder + insert + delete": async () => {
        const { state, container } = setup([
            { id: "a", label: "A" },
            { id: "b", label: "B" },
            { id: "c", label: "C" },
        ]);

        const before = nodesById(container);

        // b deleted, x inserted, order changes to [c, x, a]
        state.patch({
            items: [
                { id: "c", label: "C" },
                { id: "x", label: "X" },
                { id: "a", label: "A" },
            ]
        });

        await expect(container).toMatch(
            [DIV,
                [UL, { class: "list" },
                    [LI, { id: "c" }, "C"],
                    [LI, { id: "x" }, "X"],
                    [LI, { id: "a" }, "A"],
                ]
            ]
        );
        const after = nodesById(container);
        await expect(after["a"] === before["a"]).toEqual(true, "node for 'a' must be reused");
        await expect(after["c"] === before["c"]).toEqual(true, "node for 'c' must be reused");
    },

    "keyed(): patches content of a surviving key without recreating its node": async () => {
        const { state, container } = setup([
            { id: "a", label: "A" },
            { id: "b", label: "B" },
        ]);

        const before = nodesById(container);

        state.patch({
            items: [
                { id: "b", label: "B!" }, // moved AND relabeled
                { id: "a", label: "A" },
            ]
        });

        await expect(container).toMatch(
            [DIV,
                [UL, { class: "list" },
                    [LI, { id: "b" }, "B!"],
                    [LI, { id: "a" }, "A"],
                ]
            ]
        );
        // same node, new content
        await expect(nodesById(container)["b"] === before["b"]).toEqual(true);
    },

    "keyed(): changing the key at the same position recreates the node": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const mounted: string[] = [];
        const unmounted: string[] = [];
        const state = createState({ id: "a" });

        app(container, state, (s) => {
            const id = s.id; // capture per render, the closures below outlive `s.id`
            return [DIV,
                keyed([UL,
                    [LI, {
                        key: id, id,
                        onMount: () => { mounted.push(id); },
                        onUnmount: () => { unmounted.push(id); },
                    }, id.toUpperCase()],
                ]),
            ];
        });

        const before = nodesById(container)["a"];
        await expect(mounted).toEqual(["a"]);

        // same position, same tag but a new identity
        state.patch({ id: "b" });

        await eventually(() => orderInDom(container)).toEqual(["b"]);
        await expect(nodesById(container)["b"] === before)
            .toEqual(false, "a changed key must get a fresh node");
        await expect(unmounted).toEqual(["a"]);
        await expect(mounted).toEqual(["a", "b"]);
    },

    "keyed(): clearing all items removes every node": async () => {
        const { state, container } = setup([
            { id: "a", label: "A" },
            { id: "b", label: "B" },
        ]);

        state.patch({ items: [] });

        await expect(container).toMatch([DIV, [UL, { class: "list" }]]);
        await eventually(() => listNode(container).childNodes.length).toEqual(0);
    },

    "keyed(): grows from empty to a populated list": async () => {
        const { state, container } = setup([]);

        await expect(listNode(container).childNodes.length).toEqual(0);

        state.patch({
            items: [
                { id: "a", label: "A" },
                { id: "b", label: "B" },
            ]
        });

        await eventually(() => orderInDom(container)).toEqual(["a", "b"]);
    },

    "keyed(): per-render props update the container": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state = createState({ busy: false });

        app(container, state, (s) => [DIV,
            keyed([UL, { class: s.busy ? "list loading" : "list" },
                [LI, { key: "a" }, "A"]]),
        ]);

        await expect(attr(listNode(container), "class")).toEqual("list");

        state.patch({ busy: true });
        await eventually(() => attr(listNode(container), "class")).toEqual("list loading");
    },

    "keyed(): recovers when the list is unmounted then remounted": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state = createState({
            show: true,
            items: [{ id: "a", label: "A" }, { id: "b", label: "B" }] as Item[],
        });

        app(container, state, (s) => [DIV,
            s.show
                ? keyed([UL, { class: "list" },
                    ...s.items.map((it) => [LI, { key: it.id, id: it.id }, it.label])])
                : [SPAN, "hidden"],
        ]);

        await expect(orderInDom(container)).toEqual(["a", "b"]);

        state.patch({ show: false });
        await expect(container).toMatch([DIV, [SPAN, "hidden"]]);

        state.patch({ show: true });
        await eventually(() => orderInDom(container)).toEqual(["a", "b"]);
        // after remount a reorder still works correctly (memory re-synced)
        state.patch({ items: [{ id: "b", label: "B" }, { id: "a", label: "A" }] });
        await eventually(() => orderInDom(container)).toEqual(["b", "a"]);
    },

    "keyed(): two independent keyed lists do not interfere": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state = createState({
            left: [{ id: "a", label: "A" }, { id: "b", label: "B" }] as Item[],
            right: [{ id: "x", label: "X" }, { id: "y", label: "Y" }] as Item[],
        });

        app(container, state, (s) => [DIV,
            keyed([UL, { class: "left" },
                ...s.left.map((it) => [LI, { key: it.id, id: it.id }, it.label])]),
            keyed([UL, { class: "right" },
                ...s.right.map((it) => [LI, { key: it.id, id: it.id }, it.label])]),
        ]);

        // reorder only the left list
        state.patch({ left: [{ id: "b", label: "B" }, { id: "a", label: "A" }] });

        await expect(container).toMatch(
            [DIV,
                [UL, { class: "left" }, [LI, { id: "b" }, "B"], [LI, { id: "a" }, "A"]],
                [UL, { class: "right" }, [LI, { id: "x" }, "X"], [LI, { id: "y" }, "Y"]],
            ]
        );
    },

    "keyed(): nested keyed lists reconcile independently": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state = createState({
            groups: [
                { id: "g1", items: ["a", "b"] },
                { id: "g2", items: ["x", "y"] },
            ],
        });

        app(container, state, (s) => [DIV,
            keyed([UL, { class: "outer" },
                ...s.groups.map((g) => [LI, { key: g.id, id: g.id },
                    keyed([UL,
                        ...g.items.map((it) => [LI, { key: it, id: it }, it]),
                    ]),
                ]),
            ]),
        ]);

        const groupIds = () => orderInDom(container);
        const innerList = (gid: string) => {
            const outer = listNode(container);
            for (let i = 0; i < outer.childNodes.length; i++) {
                const g = outer.childNodes[i];
                if (attr(g, "id") === gid) return g.childNodes[0];
            }
            return undefined;
        };
        const itemsOf = (gid: string): string[] => {
            const inner = innerList(gid);
            const ids: string[] = [];
            for (let i = 0; i < inner.childNodes.length; i++) {
                ids.push(attr(inner.childNodes[i], "id")!);
            }
            return ids;
        };
        const itemNode = (gid: string, iid: string) => {
            const inner = innerList(gid);
            for (let i = 0; i < inner.childNodes.length; i++) {
                if (attr(inner.childNodes[i], "id") === iid) return inner.childNodes[i];
            }
            return undefined;
        };

        await expect(groupIds()).toEqual(["g1", "g2"]);
        await expect(itemsOf("g1")).toEqual(["a", "b"]);
        await expect(itemsOf("g2")).toEqual(["x", "y"]);

        const g2y = itemNode("g2", "y");
        const g1a = itemNode("g1", "a");

        // reorder the groups AND the items of g2 in one patch
        state.patch({
            groups: [
                { id: "g2", items: ["y", "x"] },
                { id: "g1", items: ["a", "b"] },
            ],
        });

        await eventually(() => groupIds()).toEqual(["g2", "g1"]);
        await expect(itemsOf("g2")).toEqual(["y", "x"]);
        await expect(itemsOf("g1")).toEqual(["a", "b"]);
        // the inner rows survived both the outer and the inner reorder
        await expect(itemNode("g2", "y") === g2y).toEqual(true, "inner node 'y' must be reused");
        await expect(itemNode("g1", "a") === g1a).toEqual(true, "inner node 'a' must be reused");
    },

    "keyed(): fires onUnmount for removed keys": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const unmounted: string[] = [];
        const state = createState({ items: [{ id: "a" }, { id: "b" }, { id: "c" }] as { id: string }[] });

        app(container, state, (s) => [DIV,
            // container without its own props (keyed injects the props object it needs)
            keyed([UL,
                ...s.items.map((it) => [
                    LI, { key: it.id, id: it.id, onUnmount: () => { unmounted.push(it.id); } }, it.id,
                ])]),
        ]);

        await expect(orderInDom(container)).toEqual(["a", "b", "c"]);

        state.patch({ items: [{ id: "a" }, { id: "c" }] });

        await eventually(() => orderInDom(container)).toEqual(["a", "c"]);
        await expect(unmounted).toEqual(["b"]);
    },

    "keyed(): fires onMount for rows inserted in the middle": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const mounted: string[] = [];
        const state = createState({ items: [{ id: "a" }, { id: "c" }] as { id: string }[] });

        app(container, state, (s) => [DIV,
            keyed([UL,
                ...s.items.map((it) => [
                    LI, { key: it.id, id: it.id, onMount: () => { mounted.push(it.id); } }, it.id,
                ])]),
        ]);

        await expect(orderInDom(container)).toEqual(["a", "c"]);
        await expect(mounted).toEqual(["a", "c"]);

        state.patch({ items: [{ id: "a" }, { id: "b" }, { id: "c" }] });

        await eventually(() => orderInDom(container)).toEqual(["a", "b", "c"]);
        // only the inserted row mounts. the survivors were reused, not recreated
        await expect(mounted).toEqual(["a", "c", "b"]);
    },

    "keyed(): skips falsy children from conditional rendering": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state = createState({
            showFooter: false,
            items: [{ id: "a", label: "A" }] as Item[],
        });

        app(container, state, (s) => [DIV,
            keyed([UL, { class: "list" },
                ...s.items.map((it) => [LI, { key: it.id, id: it.id }, it.label]),
                s.showFooter && [LI, { key: "footer", id: "footer" }, "F"],
            ]),
        ]);

        // false footer renders nothing and must not throw
        await expect(orderInDom(container)).toEqual(["a"]);

        state.patch({ showFooter: true });
        await eventually(() => orderInDom(container)).toEqual(["a", "footer"]);

        state.patch({ showFooter: false });
        await eventually(() => orderInDom(container)).toEqual(["a"]);
    },

    "keyed(): tolerates child vodes hoisted/reused across renders": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state = createState({ items: [{ id: "a", label: "A" }] as Item[] });
        // hoisted: the exact same vode (and props object) is passed on every render.
        // `key` is never removed from the props, so it stays valid across renders.
        const staticRow = [LI, { key: "static", id: "static" }, "S"];

        app(container, state, (s) => [DIV,
            keyed([UL, { class: "list" },
                staticRow,
                ...s.items.map((it) => [LI, { key: it.id, id: it.id }, it.label]),
            ]),
        ]);

        await expect(orderInDom(container)).toEqual(["static", "a"]);
        const staticNode = nodesById(container)["static"];

        state.patch({ items: [{ id: "b", label: "B" }, { id: "a", label: "A" }] });

        await eventually(() => orderInDom(container)).toEqual(["static", "b", "a"]);
        await expect(nodesById(container)["static"] === staticNode)
            .toEqual(true, "hoisted row must keep its DOM node");
    },

    "keyed(): replaces keyless children left over from a non-keyed render": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const unmounted: string[] = [];
        const state = createState({ items: [] as Item[] });

        // idiomatic empty-state: same container tag, non-keyed placeholder child
        app(container, state, (s) => [DIV,
            s.items.length
                ? keyed([UL, { class: "list" },
                    ...s.items.map((it) => [LI, { key: it.id, id: it.id }, it.label])])
                : [UL, { class: "list" },
                    [LI, {
                        id: "placeholder",
                        onUnmount: () => { unmounted.push("placeholder"); },
                    }, "no items"]],
        ]);

        await expect(orderInDom(container)).toEqual(["placeholder"]);

        state.patch({ items: [{ id: "a", label: "A" }, { id: "b", label: "B" }] });

        await eventually(() => orderInDom(container)).toEqual(["a", "b"]);
        // the placeholder was removed, not leaked next to the keyed items
        await expect(listNode(container).childNodes.length).toEqual(2);
        await expect(unmounted).toEqual(["placeholder"]);

        // and back to the placeholder (keyed -> non-keyed is plain positional diffing)
        state.patch({ items: [] });
        await eventually(() => orderInDom(container)).toEqual(["placeholder"]);
        await eventually(() => listNode(container).childNodes.length).toEqual(1);
    },

    "keyed(): does not duplicate server-rendered children on hydration": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        // simulate server-rendered HTML inside the app container: hydrated children
        // carry no key, so keyed() cannot reuse them, but it must replace, not duplicate
        const ul = document.createElement("ul");
        ul.setAttribute("class", "list");
        for (const id of ["a", "b"]) {
            const li = document.createElement("li");
            li.setAttribute("id", id);
            li.appendChild(document.createTextNode(id.toUpperCase()));
            ul.appendChild(li);
        }
        container.appendChild(ul);

        const state = createState({
            items: [{ id: "a", label: "A" }, { id: "b", label: "B" }] as Item[],
        });

        app(container, state, (s) => [DIV,
            keyed([UL, { class: "list" },
                ...s.items.map((it) => [LI, { key: it.id, id: it.id }, it.label]),
            ]),
        ]);

        await eventually(() => orderInDom(container)).toEqual(["a", "b"]);
        // exactly one node per item. the hydrated nodes were replaced, not left in place
        await expect(listNode(container).childNodes.length).toEqual(2);
        await expect(container).toMatch(
            [DIV,
                [UL, { class: "list" },
                    [LI, { id: "a" }, "A"],
                    [LI, { id: "b" }, "B"],
                ]
            ]
        );
    },

    "keyed(): preserves a user-supplied reconciled on the container": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        let calls = 0;
        const state = createState({ items: [{ id: "a", label: "A" }] as Item[] });

        app(container, state, (s) => [DIV,
            keyed([UL, { class: "list", reconciled: () => { calls++; } },
                ...s.items.map((it) => [LI, { key: it.id, id: it.id }, it.label]),
            ]),
        ]);

        // create path fires the hook once with oldVode === undefined
        await expect(calls).toEqual(1);

        state.patch({ items: [{ id: "b", label: "B" }, { id: "a", label: "A" }] });

        // keyed reconciliation still ran (order changed) and the user hook fired again
        await eventually(() => orderInDom(container)).toEqual(["b", "a"]);
        await expect(calls).toEqual(2);
    },

    "keyed(): moves only the minimum number of nodes (LIS reorder)": async () => {
        const items = ["a", "b", "c", "d", "e"].map((id) => ({ id, label: id.toUpperCase() }));
        const { state, container } = setup(items);

        // instrument every DOM insertion in the list: ChildNode.before() on the
        // children (anchors) and appendChild on the container itself
        let moves = 0;
        const byId = nodesById(container);
        for (const id of ["a", "b", "c", "d", "e"]) {
            const node = byId[id];
            const origBefore = node.before.bind(node);
            node.before = (...nodes: unknown[]) => { moves += nodes.length; return origBefore(...nodes); };
        }
        const list = listNode(container);
        const origAppend = list.appendChild.bind(list);
        list.appendChild = (child: unknown) => { moves++; return origAppend(child); };

        // rotate the first item to the back. a naive positional reorder
        // ("move desired[i] before childNodes[i]") does n-1 = 4 moves here
        state.patch({ items: [...items.slice(1), items[0]] });

        await eventually(() => orderInDom(container)).toEqual(["b", "c", "d", "e", "a"]);
        await expect(moves).toEqual(1, "rotating one item must move exactly one node");

        // every node kept its identity
        const after = nodesById(container);
        for (const id of ["a", "b", "c", "d", "e"]) {
            await expect(after[id] === byId[id]).toEqual(true, `node for '${id}' must be reused`);
        }
    },

    "keyed(): does not move any node when the order is unchanged": async () => {
        const items = ["a", "b", "c"].map((id) => ({ id, label: id.toUpperCase() }));
        const { state, container } = setup(items);

        let moves = 0;
        const byId = nodesById(container);
        for (const id of ["a", "b", "c"]) {
            const node = byId[id];
            const origBefore = node.before.bind(node);
            node.before = (...nodes: unknown[]) => { moves += nodes.length; return origBefore(...nodes); };
        }
        const list = listNode(container);
        const origAppend = list.appendChild.bind(list);
        list.appendChild = (child: unknown) => { moves++; return origAppend(child); };

        // same keys, same order
        state.patch({ items: items.map((it) => ({ ...it, label: it.label + "!" })) });

        await eventually(() => nodesById(container)["a"]?.childNodes[0]?.nodeValue).toEqual("A!");
        await expect(moves).toEqual(0, "an unchanged order must not move any node");
    },
};
