import { expect } from "./helper";
import { app, createState, DIV, ARTICLE, SECTION, P, MAIN } from "../index";

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

    "catch: bubbles up to the root component if deeply nested vodes dont catch it earlier": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        app(container, {}, () =>
            [DIV,
                {
                    catch: (s: unknown, err: Error) => [DIV, `caught: ${err.message}`]
                },

                [MAIN,
                    [SECTION,
                        [ARTICLE, {
                            onMount: () => {
                                throw new Error("boom");
                            }
                        }],
                    ],
                ]
            ]
        );

        await expect(container).toMatch(
            [DIV, "caught: boom"],
        );
    },

    "catch: if catching in root vode with different Tag -> container will be replaced": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        await expect(root.firstChild === container).toEqual(true);

        app(container, {}, () =>
            [DIV,
                {
                    catch: (s: unknown, err: Error) => [P, `caught: ${err.message}`]
                },

                [MAIN,
                    [SECTION,
                        [ARTICLE, {
                            onMount: () => {
                                throw new Error("boom");
                            }
                        }],
                    ],
                ]
            ]
        );

        await expect(root.firstChild === container).toEqual(false);

        await expect(root.firstChild).toMatch(
            [P, "caught: boom"],
        );
    },

    "catch: directly evaluated DOM expressions cannot be catched": async () => {
        (globalThis.window as any).continueAfterRequestAnimationFrameError = true;
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const error = new Error("boom");
        function ComponentWithError() {
            throw error;
        }

        const patch = app(container, { error: false }, (s: any) => {
            return [DIV,
                [DIV,
                    {
                        catch: (s: unknown, err: Error) => [P, `caught: ${err.message}`]
                    },
                    s.error ? ComponentWithError() : "no error"
                ]
            ];
        });

        patch({ error: true });

        await expect(
            () => expect((globalThis.window as any).requestAnimationFrameErrors[0])
                .toEqual(error)
        ).toSucceedAsync();
    },

    "catch: use old vodes catch if new vode needs evaluation before knowing": async () => {
        (globalThis.window as any).continueAfterRequestAnimationFrameError = true;
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        function ComponentWithError() {
            throw new Error("boom");
        }

        const patch = app(container, { error: false }, (s: any) => {
            return [DIV,
                () => [DIV,
                    { catch: (s: unknown, err: Error) => [P, `caught: ${err.message}`] },
                    s.error ? ComponentWithError() : "no error"
                ]
            ];
        });

        patch({ error: true });

        await expect(container).toMatch(
            [DIV,
                [P, "caught: boom"]
            ]
        );
    },
};
