import { expect } from "./helper";
import { app, createState, DIV, ARTICLE, SECTION, P } from "../index";

function setup() {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    return container;
}

export default {
    "catch: function fallback renders instead of broken component": async () => {
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

        await expect(container).toMatch(
            [DIV,
                [P, "caught: boom"]
            ]
        );
    },

    "catch: static vode fallback renders instead of broken component": async () => {
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

        await expect(container).toMatch(
            [DIV,
                [ARTICLE, "error occurred"]
            ]
        );
    },

    "catch: nested error boundaries — inner catch handles inner error": async () => {
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

        await expect(container).toMatch(
            [DIV,
                [SECTION,
                    [ARTICLE, "inner fallback"]
                ]
            ]
        );
    },

    "catch: nested error boundaries — outer catches when inner has no handler": async () => {
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

        await expect(container).toMatch(
            [DIV,
                [P, "outer caught it"]
            ]
        );
    },

    "catch: error propagates when no handler exists on entire tree": async () => {
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

        await expect(threw).toEqual(true);
    },

    "catch: catch handler changed on A→A path": async () => {
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

        await expect(container).toMatch(
            [DIV, [SECTION, "ok"]]
        );

        patch({ catchValue: "v2", showBroken: true });

        await expect(container).toMatch(
            [DIV, [P, "v2"]]
        );
    },

    "catch: error in one sibling doesn't affect the other": async () => {
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

        await expect(container).toMatch(
            [DIV,
                [P, "whoops"],
                [ARTICLE, "i am fine"]
            ]
        );
    },
};
