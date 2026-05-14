import { expect } from "./helper";
import { memo, DIV, app, createState, SPAN } from "../index";

export default {
    "memo(): returns the given function": () => {
        const fn = (s: any) => [DIV];
        const result = memo([1, 2], fn);
        expect(result === fn).toEqual(true);
    },

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
            .toEqual("second argument to memo() must be a function that returns a vode or props object");
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

    "memo(): works also with props factory": () => {
        const state = createState({ count: 12, prefix: "Count is: " });
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        let callCount = 0;
        app<typeof state>(container, state, (s) => [DIV,
            [DIV,
                memo(
                    [s.count],
                    (s) => {
                        callCount++;
                        return {
                            class: {
                                low: s.count < 10,
                                high: s.count >= 10,
                            }
                        };
                    }
                ),
                [SPAN, `${s.prefix}${s.count}`]
            ],
        ]);


        expect(callCount).toEqual(1);
        state.patch({ count: 12 });
        expect(callCount).toEqual(1); // unchanged count should not cause re-render
        state.patch({ count: 13 });
        expect(callCount).toEqual(2);
        state.patch({ prefix: "count: " });
        expect(callCount).toEqual(3);
        expect(container).toMatch(
            [DIV,
                [DIV, { class: { low: false, high: true } },
                    [SPAN, "count: 13"]
                ]
            ]
        );
    },
};
