import { eventually, expect } from "./helper";
import { app, ARTICLE, BUTTON, createState, DIV, P, SPAN, SECTION } from "../index";

export default {
    "app(): successful initialization": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const patch = expect(
            () => app(container, {}, () =>
                [DIV,
                    [ARTICLE,
                        [P, "foo", [SPAN, "bar"]]
                    ]
                ]
            )
        ).toSucceed();

        expect(patch).toBeA("function");

        await expect(container).toMatch(
            [DIV,
                [ARTICLE,
                    [P, "foo", [SPAN, "bar"]]
                ]
            ]
        );
    },

    //=== FAILURE CASES ===

    "app(): fails when the container has no parent": async () => {
        const container = document.createElement("div");
        const err = expect(() => app(container, {}, () => [DIV]))
            .toFail();

        await expect(err.message).toEqual("first argument to app() must be a valid HTMLElement inside the <html></html> document");
    },

    "app(): fails when the state is not an object": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const err = expect(() => app(container, "oops" as any, () => [DIV]))
            .toFail();

        await expect(err.message).toEqual("second argument to app() must be a state object");
    },

    "app(): fails when the dom factory is not a function": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const err = expect(() => app(container, {}, [DIV] as any))
            .toFail();

        await expect(err.message).toEqual("third argument to app() must be a function that returns a vode");
    },

    //=== INITIAL PATCHES ===

    "app(): executes initial patches after first render": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state = { count: 6, start: 1 };

        app(container, state, () => [DIV],
            { count: 7 },
            () => ({ start: 2 })
        );

        await expect(state).toEqual({ count: 7, start: 2 });
    },

    //=== STATE PATCHING ===

    "app(): patch with object updates state and re-renders DOM": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state: any = { msg: "hello" };
        app(container, state, (s: any) => [DIV, s.msg]);

        await expect(state.msg).toEqual("hello");
        await expect(container).toMatch([DIV, "hello"]);

        state.patch({ msg: "world" });

        await expect(state.msg).toEqual("world");
        await expect(container).toMatch([DIV, "world"]);
    },

    "app(): patch with effect function executes and applies result": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state: any = { count: 0 };
        app(container, state, (s: any) => [DIV, String(s.count)]);

        state.patch(() => ({ count: 5 }));

        await expect(state.count).toEqual(5);
        await expect(container).toMatch([DIV, "5"]);
    },

    "app(): patch with array applies multiple patches in sequence": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state: any = { a: 1, b: 2 };
        app(container, state, () => [DIV]);

        await state.patch([{ a: 10 }, { b: 20 }]);

        await expect(state).toEqual({ a: 10, b: 20 });
    },

    "app(): multiple sequential patches both apply": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state: any = { x: 0, y: 0 };
        app(container, state, () => [DIV]);

        state.patch({ x: 1 });
        state.patch({ y: 2 });

        await expect(state).toEqual({ x: 1, y: 2 });
    },

    //=== LIFECYCLE ===

    "app(): onMount callback is called on newly created child elements": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        let mountCalled = false;
        app(container, {}, () =>
            [DIV,
                [SPAN, { onMount: () => { mountCalled = true; return {}; } }, "text"]
            ] as any
        );

        await expect(mountCalled).toEqual(true);
    },

    //=== COMPONENTS ===

    "app(): component function as child renders correctly": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        app(container, {}, () =>
            [DIV,
                ((s: any) => [SPAN, "component rendered"]) as any
            ]
        );

        await expect(container).toMatch(
            [DIV, [SPAN, "component rendered"]]
        );
    },

    "app(): component accesses state and renders dynamic content": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state: any = { label: "dynamic" };
        app(container, state, (s) =>
            [DIV,
                ((st: any) => [SPAN, st.label]) as any
            ]
        );

        await expect(container).toMatch([DIV, [SPAN, "dynamic"]]);
    },

    //=== DEEP STATE ===

    "app(): deep nested state merges correctly via patch": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state: any = { nested: { value: 1, other: "keep" } };
        app(container, state, (s: any) => [DIV, String(s.nested.value)]);

        state.patch({ nested: { value: 2 } });

        await expect(state.nested.value).toEqual(2);
        await expect(state.nested.other).toEqual("keep");
        await expect(container).toMatch([DIV, "2"]);
    },

    //=== IGNORED PATCHES ===

    "app(): patching with ignored types is a no-op": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state: any = { x: 1 };
        app(container, state, () => [DIV]);

        state.patch(null);
        state.patch(undefined);
        state.patch(42);
        state.patch(42n);
        state.patch("ignored");
        state.patch(true);

        await expect(state.x).toEqual(1);
    },

    "app(): no-render child values are skipped": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        // false, null, undefined, numbers, booleans and bigints are all
        // NoVode values and must be ignored as children (not rendered, not thrown on)
        app(container, {}, () => [DIV,
            false,
            null,
            undefined,
            0,
            42,
            true,
            0n,
            42n,
            [SPAN, "kept"],
        ] as any);

        await expect(container).toMatch([DIV, [SPAN, "kept"]]);
    },

    "app(): isolated state of multiple independent vode app instances": async () => {
        const root = document.createElement("div");

        // APP 1 (foo) //
        const containerFoo = document.createElement("div");
        root.appendChild(containerFoo);
        const stateFoo = createState({ count: 0 });
        const patchFoo = app(containerFoo, stateFoo, (s) => [
            DIV,
            [P, `App 1 count: ${s.count}`],
            [BUTTON, {
                onclick: () => {
                    // sync state2 from app1 via the returned patch function
                    patchBar({ count: stateBar.count + 1 });
                    return { count: s.count + 1 };
                }
            }, "Sync +1"],
        ]);
        /////////////////

        // APP 2 (bar) //
        const containerBar = document.createElement("div");
        root.appendChild(containerBar);
        const stateBar = createState({ count: 0 });
        const patchBar = app(containerBar, stateBar, (s) => [
            DIV,
            [P, `App 2 count: ${s.count}`],
        ]);
        /////////////////

        await expect(containerFoo).toMatch(
            [DIV,
                [P, "App 1 count: 0"],
                [BUTTON, "Sync +1"],
            ]
        );

        await expect(containerBar).toMatch(
            [DIV,
                [P, "App 2 count: 0"],
            ]
        );

        // Patch state1 independently: no effect on state2
        patchFoo({ count: 5 });

        await expect(containerFoo).toMatch(
            [DIV,
                [P, "App 1 count: 5"],
                [BUTTON, "Sync +1"],
            ]
        );

        await expect(containerBar).toMatch(
            [DIV,
                [P, "App 2 count: 0"],
            ]
        );

        // Patch state2 independently: no effect on state1
        patchBar({ count: 3 });

        await expect(containerFoo).toMatch(
            [DIV,
                [P, "App 1 count: 5"],
                [BUTTON, "Sync +1"],
            ]
        );

        await expect(containerBar).toMatch(
            [DIV,
                [P, "App 2 count: 3"],
            ]
        );

        // Sync state2 via the returned patch function
        patchBar({ count: 10 });

        await expect(containerBar).toMatch(
            [DIV,
                [P, "App 2 count: 10"],
            ]
        );
    },

    "app(): root tag changes between renders": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        const state = createState({ useSection: false });

        const patch = app(container, state, (s) =>
            s.useSection ? [SECTION, "section mode"] : [DIV, "div mode"]
        );

        await expect(container).toMatch([DIV, "div mode"]);

        patch({ useSection: true });

        await expect(root).toMatch([DIV, [SECTION, "section mode"]]);
    },

    "app(): event handler with object patch": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        const state: any = { count: 0 };

        app(container, state, (s: any) =>
            [DIV, { onclick: { count: 42 } }, "click me"]
        );

        const el = (container as any)._vode.vode.node;
        expect(el.onclick).toBeA("function");
    },

    "app(): class as array renders correctly": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        app(container, {}, () =>
            [DIV, { class: ["foo", "bar", "baz"] }, "text"]
        );

        await expect(container).toMatch([DIV, { class: "foo bar baz" }, "text"]);
    },

    "app(): class as number becomes empty string": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        app(container, {}, () =>
            [DIV, { class: 123 as any }, "text"]
        );

        await expect(container).toMatch([DIV, { class: "" }, "text"]);
    },

    "app(): style object to string transition": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        const state: any = { useObject: true };

        app(container, state, (s: any) =>
            [DIV, { style: s.useObject ? { color: "red" } : "color: blue" }, "text"]
        );

        await expect(container).toMatch([DIV, "text"]);

        state.patch({ useObject: false });

        await expect(container).toMatch([DIV, "text"]);
    },

    "app(): style string to object transition drops stale inline styles": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        const state: any = { useObject: false };

        app(container, state, (s: any) =>
            [DIV, { style: s.useObject ? { fontWeight: "bold" } : "color: red" }, "text"]
        );

        const el = (container as any)._vode.vode.node;
        // normalizes (trailing ";", re-serialized props) while the fake DOM does not
        await eventually(() => /^color: red;?$/.test(el.style.cssText)).toEqual(true);

        state.patch({ useObject: true });

        // the old "color: red" must not survive the switch to an object style
        await eventually(() => /^color: red;?$/.test(el.style.cssText)).toEqual(false);
        await eventually(() => el.style.fontWeight).toEqual("bold");
    },

    "app(): hydrated (server-rendered) nodes fire onMount on the initial render": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        // pre-existing server-rendered child HTML: <div><span>text</span></div>
        const preSpan = document.createElement("span");
        preSpan.appendChild(document.createTextNode("text"));
        container.appendChild(preSpan);

        const calls: Array<[string, any]> = [];
        const state = createState({ mounted: false });

        app(container, state, () =>
            [DIV,
                [SPAN, {
                    onMount: (_s: any, node: any) => { calls.push(["mount", node]); return { mounted: true }; },
                    onUnmount: (_s: any, node: any) => { calls.push(["unmount", node]); },
                }, "text"]
            ] as any
        );

        const span = (container as any).children[0];
        await expect(span.tagName).toEqual("SPAN");
        await expect(calls.length).toEqual(1);
        await expect(calls[0][0]).toEqual("mount");
        await expect(calls[0][1] === span).toEqual(true);
        await eventually(() => state.mounted).toEqual(true);
    },

    "app(): onMount on the root vode fires once": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        let fired = 0;
        let mountedNode: any = null;
        const state = createState({});

        app(container, state, () =>
            [DIV, { onMount: (_s: any, node: any) => { fired++; mountedNode = node; } }, "hi"] as any);

        await eventually(() => fired).toEqual(1);
        // the root reuses the container element, and that is what onMount receives
        await expect(mountedNode === container || mountedNode?.tagName === "DIV").toEqual(true);
    },

    "app(): onMount fires bottom-up and exactly once per node (mixed hydrated + created)": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        // hydrated outer DIV with a hydrated SECTION; the inner P is created fresh
        const preSection = document.createElement("section");
        container.appendChild(preSection);

        const order: string[] = [];
        const state = createState({});

        app(container, state, () =>
            [DIV, { onMount: () => { order.push("root"); } },
                [SECTION, { onMount: () => { order.push("section"); } },
                    [P, { onMount: () => { order.push("p"); } }, "x"]
                ]
            ] as any);

        // children before parents; each node mounts exactly once
        await eventually(() => order.length).toEqual(3);
        await expect(order).toEqual(["p", "section", "root"]);
    },
};
