import { app, ContainerNode, createState } from "../src/vode"
import { ARTICLE, ASIDE, DIV, MAIN, NAV, P, SECTION, SPAN } from "../src/tags";
import { eventually, expect } from "./helper";

function setup() {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    return container as unknown as ContainerNode;
}

export default {
    "onRender(): called when node is first rendered": async () => {
        const container = setup();
        let renderCalled = false;
        app(container, {}, () =>
            [DIV,
                [ARTICLE,
                    {
                        onRender: (s, vode) => {
                            renderCalled = true;
                        }
                    },
                    [P, "foo", [SPAN, "bar"]],
                ]
            ]
        );

        await eventually(() => expect(renderCalled).toEqual(true));
    },

    "onRender(): called on every render when state changes": async () => {
        const container = setup();
        const renderCalls: number[] = [];
        const state = createState({ count: 0 });
        const patch = app(container, state, (s) =>
            [DIV,
                [ARTICLE,
                    {
                        onRender: (s: any, vode: any) => {
                            renderCalls.push(s.count);
                        }
                    },
                    [P, `Count: ${s.count}`]
                ]
            ]
        );

        await eventually(() => expect(renderCalls).toEqual([0]));

        patch({ count: 1 });
        await eventually(() => expect(renderCalls).toEqual([0, 1]));

        patch({ count: 2 });
        await eventually(() => expect(renderCalls).toEqual([0, 1, 2]));
    },

    "onRender(): called for both new and existing elements": async () => {
        const container = setup();
        const renderCalls: string[] = [];
        const state = createState({ showArticle: false });
        const patch = app(container, state, (s) =>
            [DIV,
                s.showArticle
                    ? [ARTICLE,
                        {
                            onRender: (s: unknown, vode: any) => {
                                renderCalls.push("article");
                            }
                        },
                        [P, "article content"]
                    ]
                    : [ASIDE,
                        {
                            onRender: (s: unknown, vode: any) => {
                                renderCalls.push("aside");
                            }
                        },
                        [P, "aside content"]
                    ]
            ]
        );

        await eventually(() => expect(renderCalls).toEqual(["aside"]));

        patch({ showArticle: true });
        await eventually(() => expect(renderCalls).toEqual(["aside", "article"]));

        patch({ showArticle: false });
        await eventually(() => expect(renderCalls).toEqual(["aside", "article", "aside"]));
    },

    "onRender(): called in order of child nodes first, then parent onRenders": async () => {
        const container = setup();
        const renderCalls: string[] = [];
        app(container, {}, () =>
            [DIV,
                [ARTICLE,
                    {
                        onRender: (s: unknown, vode: any) => {
                            renderCalls.push("render outer");
                        }
                    },
                    [P,
                        {
                            onRender: (s: unknown, vode: any) => {
                                renderCalls.push("render inner");
                            }
                        },
                        "foo",
                        [SPAN, "bar"],
                    ]
                ]
            ]
        );

        await eventually(() => expect(renderCalls)
            .toEqual(["render inner", "render outer"]));
    },

    "onRender(): receives correct state parameter": async () => {
        const container = setup();
        let receivedState: any = null;
        const state = createState({ message: "hello" });
        app(container, state, (s) =>
            [DIV,
                [ARTICLE,
                    {
                        onRender: (s: any, vode: any) => {
                            receivedState = s;
                        }
                    },
                    [P, s.message]
                ]
            ]
        );

        await eventually(() => expect(receivedState.message).toEqual("hello"));
    },

    "onRender(): receives correct vode parameter with NODE": async () => {
        const container = setup();
        let receivedVode: any = null;
        app(container, {}, () =>
            [DIV,
                [ARTICLE,
                    {
                        onRender: (s: unknown, vode: any) => {
                            receivedVode = vode;
                        }
                    },
                    [P, "content"]
                ]
            ]
        );

        await eventually(() => {
            expect(!!receivedVode).toEqual(true);
            expect(receivedVode[0]).toEqual("article");
        });
    },

    "onRender(): called for nested elements on initial render": async () => {
        const container = setup();
        const renderCalls: string[] = [];
        app(container, {}, () =>
            [DIV,
                [NAV,
                    {
                        onRender: (s: unknown, vode: any) => {
                            renderCalls.push("nav");
                        }
                    },
                    [MAIN,
                        {
                            onRender: (s: unknown, vode: any) => {
                                renderCalls.push("main");
                            }
                        },
                        [SECTION,
                            {
                                onRender: (s: unknown, vode: any) => {
                                    renderCalls.push("section");
                                }
                            },
                            [ARTICLE,
                                {
                                    onRender: (s: unknown, vode: any) => {
                                        renderCalls.push("article");
                                    }
                                },
                                [P, "deep text"]
                            ]
                        ]
                    ]
                ]
            ]
        );

        await eventually(() => expect(renderCalls)
            .toEqual(["article", "section", "main", "nav"]));
    },

    "onRender(): A->B path - element replaced with different tag fires onRender for new element": async () => {
        const container = setup();
        const renderCalls: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.showArticle
                    ? [ARTICLE,
                        {
                            onRender: (s: unknown, vode: any) => {
                                renderCalls.push("render article");
                            }
                        },
                        [P, "text"]
                    ]
                    : [ASIDE,
                        {
                            onRender: (s: unknown, vode: any) => {
                                renderCalls.push("render aside");
                            }
                        },
                        [P, "text"]
                    ]
            ]
        );

        await eventually(() => expect(renderCalls).toEqual(["render article"]));
        patch({ showArticle: false });
        await eventually(() => expect(renderCalls).toEqual(["render article", "render aside"]));
    },

    "onRender(): works alongside onMount": async () => {
        const container = setup();
        const mountCalls: string[] = [];
        const renderCalls: string[] = [];
        app(container, {}, () =>
            [DIV,
                [ARTICLE,
                    {
                        onMount: (s: unknown, ele: HTMLElement) => {
                            mountCalls.push("mount article");
                        },
                        onRender: (s: unknown, vode: any) => {
                            renderCalls.push("render article");
                        }
                    },
                    [P, "foo", [SPAN, "bar"]],
                ]
            ]
        );

        await eventually(() => {
            expect(mountCalls).toEqual(["mount article"]);
            expect(renderCalls).toEqual(["render article"]);
        });
    },

    "onRender(): not called when element is removed": async () => {
        const container = setup();
        const renderCalls: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.showArticle && [ARTICLE,
                    {
                        onRender: (s: unknown, vode: any) => {
                            renderCalls.push("render article");
                        }
                    },
                    [P, "text"]
                ]
            ]
        );

        await eventually(() => expect(renderCalls).toEqual(["render article"]));
        patch({ showArticle: false });
        await eventually(() => expect(renderCalls).toEqual(["render article"]));
    }
};