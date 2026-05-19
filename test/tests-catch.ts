import { expect } from "./helper";
import { app, createState, DIV, ARTICLE, SECTION, P } from "../index";

function setup() {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    return container;
}

export default {
    "catch: function fallback renders instead of broken component": () => {
        const container = setup();
        const broken = () => { throw new Error("boom"); };

        app(container, {}, () =>
            [DIV,
                [SECTION,
                    { catch: (s: unknown, err: Error) => [P, `caught: ${err.message}`] },
                    broken
                ]
            ]
        );

        expect(container).toMatch(
            [DIV,
                [P, "caught: boom"]
            ]
        );
    },

    "catch: static vode fallback renders instead of broken component": () => {
        const container = setup();
        const broken = () => { throw new Error("boom"); };

        app(container, {}, () =>
            [DIV,
                [SECTION,
                    { catch: [ARTICLE, "error occurred"] },
                    broken
                ]
            ]
        );

        expect(container).toMatch(
            [DIV,
                [ARTICLE, "error occurred"]
            ]
        );
    },

    "catch: nested error boundaries — inner catch handles inner error": () => {
        const container = setup();
        const broken = () => { throw new Error("inner boom"); };

        app(container, {}, () =>
            [DIV,
                [SECTION,
                    [P,
                        {
                            catch: [ARTICLE, "inner fallback"]
                        },
                        broken
                    ]
                ]
            ]
        );

        expect(container).toMatch(
            [DIV,
                [SECTION,
                    [ARTICLE, "inner fallback"]
                ]
            ]
        );
    },

    "catch: nested error boundaries — outer catches when inner has no handler": () => {
        const container = setup();
        const broken = () => { throw new Error("boom"); };

        app(container, {}, () =>
            [DIV,
                [SECTION,
                    { catch: [P, "outer caught it"] },
                    [ARTICLE, broken]
                ]
            ]
        );

        expect(container).toMatch(
            [DIV,
                [P, "outer caught it"]
            ]
        );
    },

    "catch: error propagates when no handler exists on entire tree": () => {
        const container = setup();
        const broken = () => { throw new Error("crash"); };
        let threw = false;

        try {
            app(container, {}, () =>
                [DIV, [P, broken]]
            );
        } catch {
            threw = true;
        }

        expect(threw).toEqual(true);
    },

    "catch: catch handler changed on A→A path": () => {
        const container = setup();
        const state = createState({ catchValue: "v1", showBroken: false });
        const broken = () => { throw new Error("boom"); };

        const patch = app<typeof state>(container, state, (s) =>
            [DIV,
                [SECTION,
                    { catch: [P, s.catchValue] },
                    s.showBroken ? broken : "ok"
                ]
            ]
        );

        expect(container).toMatch(
            [DIV, [SECTION, "ok"]]
        );

        patch({ catchValue: "v2", showBroken: true });

        expect(container).toMatch(
            [DIV, [P, "v2"]]
        );
    },

    "catch: error in one sibling doesn't affect the other": () => {
        const container = setup();
        const broken = () => { throw new Error("boom"); };

        app(container, {}, () =>
            [DIV,
                [SECTION,
                    { catch: [P, "whoops"] },
                    broken
                ],
                [ARTICLE, "i am fine"]
            ]
        );

        expect(container).toMatch(
            [DIV,
                [P, "whoops"],
                [ARTICLE, "i am fine"]
            ]
        );
    },
};
