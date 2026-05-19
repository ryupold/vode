import { expect } from "./helper";
import { memo, DIV, app, createState, SPAN, H1, BR, P, UL, LI, Vode, FullVode, ChildVode, Component } from "../index";

export default {
    "memo(): throws when compare is not an array": () => {
        const err = expect(() => memo(null as any, (s: any) => [DIV]))
            .toFail();
        expect(err.message)
            .toEqual("first argument to memo() must be an array of values to compare");
    },

    "memo(): throws when componentOrProps is not a function": () => {
        const err = expect(() => memo([1], null as any))
            .toFail();
        expect(err.message)
            .toEqual("second argument to memo() must be a function that returns a child vode");
    },

    "memo(): integration with app prevents re-render when deps match": () => {
        const state = createState({ count: 12 });
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        let callCount = 0;
        app<typeof state>(container, state, (s) => [DIV, memo(
            [s.count],
            (s) => {
                callCount++;
                return [DIV, [SPAN, `${s.count}`]];
            }
        )]);


        expect(callCount).toEqual(1);

        state.patch({ count: 12 }); //same value, should not re-render
        expect(callCount).toEqual(1);
        state.patch({ count: 13 }); //different value, should re-render
        expect(callCount).toEqual(2);
        expect(container).toMatch(
            [DIV,
                [DIV,
                    [SPAN, "13"]
                ]
            ]
        );
    },

    "memo(): can be used with a nested component function": () => {
        const state = createState({ count: 12 });
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        let callCount = 0;
        app<typeof state>(container, state, (s) => [DIV,
            () => memo(
                [s.count],
                (s) => {
                    callCount++;
                    return [DIV, [SPAN, `${s.count}`]];
                }
            )]);


        expect(callCount).toEqual(1);
        state.patch({ count: 12 }); //same value, should not re-render
        expect(callCount).toEqual(1);
    },

    "memo(): can be used with the same component function": () => {
        const state = createState({ test: "foo" });
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        let callCount = 0;
        const Comp: Component<typeof state> = (s) => {
            callCount++;
            return [DIV, [SPAN, s.test]];
        };
        app<typeof state>(container, state, (s) => [DIV,
            memo(
                [s.test],
                Comp,
            ),
            memo(
                [s.test],
                Comp,
            ),
        ]);


        expect(callCount).toEqual(2);
        state.patch({ test: "foo" }); 
        expect(callCount).toEqual(2);
        state.patch({ test: "bar" }); 
        expect(callCount).toEqual(4);
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
                        const list = [UL];
                        for (let i = 0; i < 10000; i++) {
                            list.push(LI, `Item ${i}`);
                        }
                        return list;
                    },
                )
            ];

        app<State>(container, state, (s) => [DIV,
            CompMemoList,
        ]);
    },
};
