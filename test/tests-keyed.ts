import { eventually, expect } from "./helper";
import { app, createState, keyed, DIV, UL, LI, SPAN } from "../index";

type Item = { id: string, label: string };

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
        out[node.fakeAttributes?.id] = node;
    }
    return out;
}

/** ids in the order they currently appear in the DOM */
function orderInDom(container: any): string[] {
    const list = listNode(container);
    const ids: string[] = [];
    for (let i = 0; i < list.childNodes.length; i++) {
        ids.push(list.childNodes[i].fakeAttributes?.id);
    }
    return ids;
}

function setup(items: Item[]) {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);

    const state = createState({ items });

    app(container, state, (s) => [DIV,
        keyed<typeof state>(UL, { class: "list" },
            s.items.map(it => [it.id, [LI, { id: it.id }, it.label]] as const)),
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

    "keyed(): throws on duplicate keys": async () => {
        const err = expect(() => keyed([["x", [LI, "1"]], ["x", [LI, "2"]]]))
            .toFail();
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
            keyed<typeof state>(UL, { class: s.busy ? "list loading" : "list" },
                [["a", [LI, "A"]]]),
        ]);

        await expect(listNode(container).fakeAttributes.class).toEqual("list");

        state.patch({ busy: true });
        await eventually(() => listNode(container).fakeAttributes.class).toEqual("list loading");
    },

    "keyed(): recovers when the list is unmounted then remounted": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state = createState({ show: true, items: [{ id: "a", label: "A" }, { id: "b", label: "B" }] as Item[] });

        app(container, state, (s) => [DIV,
            s.show
                ? keyed<typeof state>(UL, { class: "list" },
                    s.items.map(it => [it.id, [LI, { id: it.id }, it.label]] as const))
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
            keyed<typeof state>(UL, { class: "left" },
                s.left.map(it => [it.id, [LI, { id: it.id }, it.label]] as const)),
            keyed<typeof state>(UL, { class: "right" },
                s.right.map(it => [it.id, [LI, { id: it.id }, it.label]] as const)),
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

    "keyed(): fires onUnmount for removed keys": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const unmounted: string[] = [];
        const state = createState({ items: [{ id: "a" }, { id: "b" }, { id: "c" }] as { id: string }[] });

        app(container, state, (s) => [DIV,
            keyed<typeof state>(UL, s.items.map(it => [
                it.id,
                [LI, { id: it.id, onUnmount: () => { unmounted.push(it.id); } }, it.id],
            ] as const)),
        ]);

        await expect(orderInDom(container)).toEqual(["a", "b", "c"]);

        state.patch({ items: [{ id: "a" }, { id: "c" }] } as any);

        await eventually(() => orderInDom(container)).toEqual(["a", "c"]);
        await expect(unmounted).toEqual(["b"]);
    },
};
