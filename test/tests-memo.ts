import { expect } from "./helper";
import { memo, DIV, app, createState, SPAN, H1, BR, P, UL, LI, Component, Vode } from "../index";

export default {
    "memo(): throws when compare is not an array": async () => {
        const err = expect(() => memo(null as any, (s: any) => [DIV]))
            .toFail();
        await expect(err.message)
            .toEqual("first argument to memo() must be an array of values to compare");
    },

    "memo(): throws when componentOrProps is not a function": async () => {
        const err = expect(() => memo([1], null as any))
            .toFail();
        await expect(err.message)
            .toEqual("second argument to memo() must be a function that returns a child vode");
    },

    "memo(): integration with app prevents re-render when deps match": async () => {
        const state = createState({ count: 12 });
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        let box: { callCount: number } = { callCount: 0 };
        app(container, state, (s) => [DIV, memo(
            [s.count],
            (s) => {
                box.callCount++;
                return [DIV, [SPAN, `${s.count}`]];
            }
        )]);


        await expect(box).toEqual({ callCount: 1 });

        state.patch({ count: 12 }); //same value, should not re-render
        await expect(box).toEqual({ callCount: 1 });
        state.patch({ count: 13 }); //different value, should re-render

        await expect(box).toEqual({ callCount: 2 });
        await expect(container).toMatch(
            [DIV,
                [DIV,
                    [SPAN, "13"]
                ]
            ]
        );
    },

    "memo(): can be used with a nested component function": async () => {
        const state = createState({ count: 12 });
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        let callCount = 0;
        app(container, state, (s) => [DIV,
            () => memo(
                [s.count],
                (s) => {
                    callCount++;
                    return [DIV, [SPAN, `${s.count}`]];
                }
            )]);


        await expect(callCount).toEqual(1);
        state.patch({ count: 12 }); //same value, should not re-render
        await expect(callCount).toEqual(1);
    },

    "memo(): can be used with the same component function": async () => {
        const state = createState({ test: "foo" });
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        let box: { callCount: number } = { callCount: 0 };
        const Comp: Component<typeof state> = (s) => {
            box.callCount++;
            return [DIV, [SPAN, s.test]];
        };
        app(container, state, (s) => [DIV,
            memo(
                [s.test],
                Comp,
            ),
            memo(
                [s.test],
                Comp,
            ),
        ]);


        await expect(box).toEqual({ callCount: 2 }, "Each memo should call the component function once on initial render, even if they are the same function");
        state.patch({ test: "foo" });
        await expect(box).toEqual({ callCount: 2 }, "Patching with the same value should not cause a re-render");
        state.patch({ test: "bar" });
        await expect(box).toEqual({ callCount: 4 }, "Patching with a different value should cause both memos to re-render, even if they use the same component function");
    },

    "memo(): memo with many item list": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const state = createState({ title: "hello", body: "world" });
        type State = typeof state;

        const CompMemoList: Component<State> = (s) =>
            [DIV, { class: "container" },
                [H1, "Hello World"],
                [BR],
                [P, "This is a paragraph."],
                memo(
                    [s.title, s.body],
                    (s) => {
                        const items: Vode[] = [];
                        for (let i = 0; i < 10000; i++) {
                            items.push([LI, `Item ${i}`]);
                        }
                        return [UL, ...items] as Vode;
                    },
                )
            ];

        app(container, state, (s) => [DIV,
            CompMemoList,
        ]);
    },

    "memo(): a memoized component may return null (renders nothing)": async () => {
        const state = createState({ show: true });
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        app(container, state, (s) => [DIV,
            memo([s.show], (s) => s.show ? [SPAN, "here"] : null),
        ]);

        await expect(container).toMatch([DIV, [SPAN, "here"]]);

        state.patch({ show: false });
        await expect(container).toMatch([DIV]);

        state.patch({ show: true });
        await expect(container).toMatch([DIV, [SPAN, "here"]]);
    },

    "memo(): double-wrapping ignores the inner memo dependencies, only the outer memo is checked": async () => {
        const state = createState({ outer: 1, inner: 1 });
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        let box: { callCount: number } = { callCount: 0 };
        const comp = (s: typeof state) => {
            box.callCount++;
            return [DIV, `${s.outer}`];
        };

        const memoed = (s: typeof state) => memo([s.inner], comp);
        const doubleMemoed = (s: typeof state) => memo([s.outer], memoed);

        expect(() => app(container, state, () => [DIV, doubleMemoed]))
            .toSucceed();

        await expect(box).toEqual({ callCount: 1 });
        await expect(container).toMatch([DIV, [DIV, "1"]]);

        state.patch({ outer: 2 });
        await expect(box).toEqual({ callCount: 2 });
        state.patch({ inner: 2 });
        await expect(box).toEqual({ callCount: 2 });
        state.patch({ outer: 3 });
        await expect(box).toEqual({ callCount: 3 });
    },
};
