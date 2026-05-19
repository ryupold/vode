import { expect } from "./helper";
import { app, ARTICLE, BUTTON, createState, DIV, P, SPAN, SECTION } from "../index";

export default {
    "app(): successful initialization": () => {
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

        expect(container).toMatch(
            [DIV,
                [ARTICLE,
                    [P, "foo", [SPAN, "bar"]]
                ]
            ]
        );
    },

    //=== FAILURE CASES ===

    "app(): fails when the container has no parent": () => {
        const container = document.createElement("div");
        const err = expect(() => app(container, {}, () => [DIV]))
            .toFail();

        expect(err.message).toEqual("first argument to app() must be a valid HTMLElement inside the <html></html> document");
    },

    "app(): fails when the state is not an object": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const err = expect(() => app(container, "oops", () => [DIV]))
            .toFail();

        expect(err.message).toEqual("second argument to app() must be a state object");
    },

    "app(): fails when the dom factory is not a function": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const err = expect(() => app(container, {}, [DIV] as any))
            .toFail();

        expect(err.message).toEqual("third argument to app() must be a function that returns a vode");
    },

    //=== INITIAL PATCHES ===

    "app(): executes initial patches after first render": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state = { count: 6, start: 1 };

        app(container, state, () => [DIV],
            { count: 7 },
            () => ({ start: 2 })
        );

        expect(state).toEqual({ count: 7, start: 2 });
    },

    //=== STATE PATCHING ===

    "app(): patch with object updates state and re-renders DOM": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state: any = { msg: "hello" };
        app(container, state, (s: any) => [DIV, s.msg]);

        expect(state.msg).toEqual("hello");
        expect(container).toMatch([DIV, "hello"]);

        state.patch({ msg: "world" });

        expect(state.msg).toEqual("world");
        expect(container).toMatch([DIV, "world"]);
    },

    "app(): patch with effect function executes and applies result": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state: any = { count: 0 };
        app(container, state, (s: any) => [DIV, String(s.count)]);

        state.patch(() => ({ count: 5 }));

        expect(state.count).toEqual(5);
        expect(container).toMatch([DIV, "5"]);
    },

    "app(): patch with array applies multiple patches in sequence": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state: any = { a: 1, b: 2 };
        app(container, state, () => [DIV]);

        state.patch([{ a: 10 }, { b: 20 }]);

        expect(state.a).toEqual(10);
        expect(state.b).toEqual(20);
    },

    "app(): multiple sequential patches both apply": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state: any = { x: 0, y: 0 };
        app(container, state, () => [DIV]);

        state.patch({ x: 1 });
        state.patch({ y: 2 });

        expect(state).toEqual({ x: 1, y: 2 });
    },

    //=== LIFECYCLE ===

    "app(): onMount callback is called on newly created child elements": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        let mountCalled = false;
        app(container, {}, () =>
            [DIV,
                [SPAN, { onMount: () => { mountCalled = true; return {}; } }, "text"]
            ] as any
        );

        expect(mountCalled).toEqual(true);
    },

    //=== COMPONENTS ===

    "app(): component function as child renders correctly": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        app(container, {}, () =>
            [DIV,
                ((s: any) => [SPAN, "component rendered"]) as any
            ]
        );

        expect(container).toMatch(
            [DIV, [SPAN, "component rendered"]]
        );
    },

    "app(): component accesses state and renders dynamic content": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state: any = { label: "dynamic" };
        app(container, state, (s) =>
            [DIV,
                ((st: any) => [SPAN, st.label]) as any
            ]
        );

        expect(container).toMatch([DIV, [SPAN, "dynamic"]]);
    },

    //=== DEEP STATE ===

    "app(): deep nested state merges correctly via patch": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state: any = { nested: { value: 1, other: "keep" } };
        app(container, state, (s: any) => [DIV, String(s.nested.value)]);

        state.patch({ nested: { value: 2 } });

        expect(state.nested.value).toEqual(2);
        expect(state.nested.other).toEqual("keep");
        expect(container).toMatch([DIV, "2"]);
    },

    //=== IGNORED PATCHES ===

    "app(): patching with ignored types is a no-op": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state: any = { x: 1 };
        app(container, state, () => [DIV]);

        state.patch(null);
        state.patch(undefined);
        state.patch(42);
        state.patch("ignored");
        state.patch(true);

        expect(state.x).toEqual(1);
    },

    "app(): isolated state of multiple independent vode app instances": () => {
        const root = document.createElement("div");

        // APP 1 (foo) //
        const containerFoo = document.createElement("div");
        root.appendChild(containerFoo);
        const stateFoo = createState({ count: 0 });
        const patchFoo = app<typeof stateFoo>(containerFoo, stateFoo, (s) => [
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
        const patchBar = app<typeof stateBar>(containerBar, stateBar, (s) => [
            DIV,
            [P, `App 2 count: ${s.count}`],
        ]);
        /////////////////

        expect(containerFoo).toMatch(
            [DIV,
                [P, "App 1 count: 0"],
                [BUTTON, "Sync +1"],
            ]
        );

        expect(containerBar).toMatch(
            [DIV,
                [P, "App 2 count: 0"],
            ]
        );

        // Patch state1 independently: no effect on state2
        patchFoo({ count: 5 });

        expect(containerFoo).toMatch(
            [DIV,
                [P, "App 1 count: 5"],
                [BUTTON, "Sync +1"],
            ]
        );

        expect(containerBar).toMatch(
            [DIV,
                [P, "App 2 count: 0"],
            ]
        );

        // Patch state2 independently: no effect on state1
        patchBar({ count: 3 });

        expect(containerFoo).toMatch(
            [DIV,
                [P, "App 1 count: 5"],
                [BUTTON, "Sync +1"],
            ]
        );

        expect(containerBar).toMatch(
            [DIV,
                [P, "App 2 count: 3"],
            ]
        );

        // Sync state2 via the returned patch function
        patchBar({ count: 10 });

        expect(containerBar).toMatch(
            [DIV,
                [P, "App 2 count: 10"],
            ]
        );
    },

    "app(): root tag changes between renders": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        const state = createState({ useSection: false });

        const patch = app<typeof state>(container, state, (s) =>
            s.useSection ? [SECTION, "section mode"] : [DIV, "div mode"]
        );

        expect(container).toMatch([DIV, "div mode"]);

        patch({ useSection: true });

        expect(root).toMatch([DIV, [SECTION, "section mode"]]);
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
};