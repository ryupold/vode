import { expect } from "./helper";
import { app, ARTICLE, DIV, P, SPAN } from "../index";

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
    }

};