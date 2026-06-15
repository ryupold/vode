import { app, Component, ContainerNode, createState, memo } from "../src/vode"
import { ARTICLE, ASIDE, DIV, INPUT, MAIN, NAV, P, SECTION, SPAN } from "../src/vode-tags";
import { eventually, expect, ExpectationError } from "./helper";

function setup() {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    return container as unknown as ContainerNode;
}

export default {
    "onMount(): called when node is attached to the DOM": async () => {
        const container = setup();
        let mountCalled = false;
        app(container, {}, () =>
            [DIV,
                [ARTICLE,
                    {
                        onMount: (s: unknown, ele: HTMLElement) => {
                            if (ele.tagName !== "ARTICLE") throw new ExpectationError(expect(ele), `Expected ARTICLE, got ${ele.tagName}`);
                            mountCalled = true;
                        }
                    },
                    [P, "foo", [SPAN, "bar"]],
                ]
            ]
        );

        await expect(mountCalled)
            .toEqual(true);
    },

    "onMount(): called in order of child nodes first, then parent onMounts": async () => {
        const container = setup();
        const mounts: string[] = [];
        app(container, {}, () =>
            [DIV,
                [ARTICLE,
                    {
                        onMount: (s: unknown, ele: HTMLElement) => {
                            mounts.push("mount outer");
                        }
                    },
                    [P,
                        {
                            onMount: (s: unknown, ele: HTMLElement) => {
                                mounts.push("mount inner");
                            }
                        },
                        "foo",
                        [SPAN, "bar"],
                    ]
                ]
            ]
        );

        await expect(mounts)
            .toEqual(["mount inner", "mount outer"]);
    },

    "onMount(): deep nesting 4+ levels with onMount at each level": async () => {
        const container = setup();
        const mounts: string[] = [];
        app(container, {}, () =>
            [DIV,
                [NAV,
                    {
                        onMount: (s: unknown, ele: HTMLElement) => {
                            mounts.push("mount nav");
                        }
                    },
                    [MAIN,
                        {
                            onMount: (s: unknown, ele: HTMLElement) => {
                                mounts.push("mount main");
                            }
                        },
                        [SECTION,
                            {
                                onMount: (s: unknown, ele: HTMLElement) => {
                                    mounts.push("mount section");
                                }
                            },
                            [ARTICLE,
                                {
                                    onMount: (s: unknown, ele: HTMLElement) => {
                                        mounts.push("mount article");
                                    }
                                },
                                [P, "deep text"]
                            ]
                        ]
                    ]
                ]
            ]
        );

        await expect(mounts)
            .toEqual([
                "mount article",
                "mount section",
                "mount main",
                "mount nav"
            ]);
    },

    "onMount(): multiple siblings with onMount on initial render": async () => {
        const container = setup();
        const mounts: string[] = [];
        app(container, {}, () =>
            [DIV,
                [P,
                    {
                        onMount: (s: unknown, ele: HTMLElement) => {
                            mounts.push("mount p");
                        }
                    },
                    "first"
                ],
                [SPAN,
                    {
                        onMount: (s: unknown, ele: HTMLElement) => {
                            mounts.push("mount span");
                        }
                    },
                    "second"
                ]
            ]
        );

        await expect(mounts)
            .toEqual(["mount p", "mount span"]);
    },

    "onMount(): A->A path - onMount added during update does NOT fire": async () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ addMount: false });
        const patch = app(container, state, (s) =>
            [DIV,
                [P,
                    s.addMount ? {
                        onMount: (s: unknown, ele: HTMLElement) => {
                            mounts.push("mount p");
                        }
                    } : {},
                    "text"
                ]
            ]
        );

        await expect(mounts).toEqual([]);
        patch({ addMount: true });
        await expect(mounts).toEqual([]);
    },

    "onMount(): A->A path - onMount removed during update does not cause issues": async () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ removeMount: false });
        const patch = app(container, state, (s) =>
            [DIV,
                [P,
                    s.removeMount ? {} : {
                        onMount: (s: unknown, ele: HTMLElement) => {
                            mounts.push("mount p");
                        }
                    },
                    "text"
                ]
            ]
        );

        await expect(mounts).toEqual(["mount p"]);
        patch({ removeMount: true });
        await expect(mounts).toEqual(["mount p"]);
    },

    "onMount(): A->A path - onMount changed during update does NOT fire the new one": async () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ version: "a" });
        const patch = app(container, state, (s) =>
            [DIV,
                [P,
                    {
                        onMount: s.version === "a"
                            ? (s: unknown, ele: HTMLElement) => { mounts.push("mount a"); }
                            : (s: unknown, ele: HTMLElement) => { mounts.push("mount b"); }
                    },
                    "text"
                ]
            ]
        );

        await expect(mounts).toEqual(["mount a"]);
        patch({ version: "b" });
        await expect(mounts).toEqual(["mount a"]);
    },

    "onMount(): A->B path - element replaced with different tag fires new onMount": async () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.showArticle
                    ? [ARTICLE,
                        {
                            onMount: (s: unknown, ele: HTMLElement) => {
                                mounts.push("mount article");
                            }
                        },
                        [P, "text"]
                    ]
                    : [ASIDE,
                        {
                            onMount: (s: unknown, ele: HTMLElement) => {
                                mounts.push("mount aside");
                            }
                        },
                        [P, "text"]
                    ]
            ]
        );

        await expect(mounts).toEqual(["mount article"]);
        patch({ showArticle: false });
        await expect(mounts).toEqual(["mount article", "mount aside"]);
    },

    "onMount(): A->B path - swap back fires the other element's onMount": async () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.showArticle
                    ? [ARTICLE,
                        {
                            onMount: (s: unknown, ele: HTMLElement) => {
                                mounts.push("mount article");
                            }
                        },
                        [P, "text"]
                    ]
                    : [ASIDE,
                        {
                            onMount: (s: unknown, ele: HTMLElement) => {
                                mounts.push("mount aside");
                            }
                        },
                        [P, "text"]
                    ]
            ]
        );

        await expect(mounts).toEqual(["mount article"]);
        patch({ showArticle: false });
        await expect(mounts).toEqual(["mount article", "mount aside"]);
        patch({ showArticle: true });
        await expect(mounts).toEqual(["mount article", "mount aside", "mount article"]);
        patch({ showArticle: false });
        await expect(mounts)
            .toEqual([
                "mount article",
                "mount aside",
                "mount article",
                "mount aside"
            ]);
    },

    "onMount(): A->B path - children's onMounts also fire in new tree": async () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.showArticle
                    ? [ARTICLE,
                        [P,
                            {
                                onMount: (s: unknown, ele: HTMLElement) => {
                                    mounts.push("mount p");
                                }
                            },
                            [SPAN, "nested"]
                        ]
                    ]
                    : [ASIDE,
                        [DIV,
                            {
                                onMount: (s: unknown, ele: HTMLElement) => {
                                    mounts.push("mount div");
                                }
                            },
                            "replacement"
                        ]
                    ]
            ]
        );

        await expect(mounts).toEqual(["mount p"]);
        patch({ showArticle: false });
        await expect(mounts).toEqual(["mount p", "mount div"]);
    },

    "onMount(): text -> element fires new element's onMount": async () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ showElement: false });
        const patch = app(container, state, (s) =>
            [DIV,
                s.showElement
                    ? [ARTICLE,
                        {
                            onMount: (s: unknown, ele: HTMLElement) => {
                                mounts.push("mount article");
                            }
                        },
                        [P, "foo"]
                    ]
                    : "plain text"
            ]
        );

        await expect(mounts).toEqual([]);
        patch({ showElement: true });
        await expect(mounts).toEqual(["mount article"]);
    },

    "onMount(): mixed onMount presence in tree": async () => {
        const container = setup();
        const mounts: string[] = [];
        app(container, {}, () =>
            [DIV,
                [SECTION,
                    {
                        onMount: (s: unknown, ele: HTMLElement) => {
                            mounts.push("mount section");
                        }
                    },
                    [ARTICLE,
                        [P,
                            {
                                onMount: (s: unknown, ele: HTMLElement) => {
                                    mounts.push("mount p");
                                }
                            },
                            "foo"
                        ],
                        [ASIDE,
                            [SPAN, "bar"]
                        ]
                    ]
                ]
            ]
        );

        await expect(mounts).toEqual(["mount p", "mount section"]);
    },

    "onMount(): sibling subtree depths fire in correct order": async () => {
        const container = setup();
        const mounts: string[] = [];
        app(container, {}, () =>
            [DIV,
                [SECTION,
                    [DIV,
                        {
                            onMount: (s: unknown, ele: HTMLElement) => {
                                mounts.push("mount div");
                            }
                        },
                        [P,
                            {
                                onMount: (s: unknown, ele: HTMLElement) => {
                                    mounts.push("mount p-deep");
                                }
                            },
                            "deep"
                        ]
                    ],
                    [NAV,
                        {
                            onMount: (s: unknown, ele: HTMLElement) => {
                                mounts.push("mount nav");
                            }
                        },
                        "shallow"
                    ]
                ]
            ]
        );

        await expect(mounts)
            .toEqual([
                "mount p-deep",
                "mount div",
                "mount nav"
            ]);
    },

    "onMount(): added children from count increase fire onMount": async () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ count: 1 });
        const patch = app(container, state, (s) =>
            [DIV,
                [SECTION,
                    s.count >= 1 && [P, { onMount: (s: unknown, ele: HTMLElement) => { mounts.push("mount p0"); } }, "item 0"],
                    s.count >= 2 && [P, { onMount: (s: unknown, ele: HTMLElement) => { mounts.push("mount p1"); } }, "item 1"],
                    s.count >= 3 && [P, { onMount: (s: unknown, ele: HTMLElement) => { mounts.push("mount p2"); } }, "item 2"],
                ]
            ]
        );

        await expect(mounts).toEqual(["mount p0"]);
        patch({ count: 2 });
        await expect(mounts).toEqual(["mount p0", "mount p1"]);
        patch({ count: 3 });
        await expect(mounts).toEqual(["mount p0", "mount p1", "mount p2"]);
    },

    "onMount(): conditional child fires onMount when added": async () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ show: false });
        const patch = app(container, state, (s) =>
            [DIV,
                [P,
                    "static",
                    s.show && [SPAN,
                        {
                            onMount: (s: unknown, ele: HTMLElement) => {
                                mounts.push("mount span");
                            }
                        },
                        "conditional"
                    ]
                ]
            ]
        );

        await expect(mounts).toEqual([]);
        patch({ show: true });
        await expect(mounts).toEqual(["mount span"]);
    },

    "onMount(): with caught component, replacement vode's onMount fires when error occurs": async () => {
        const container = setup();
        const mounts: string[] = [];
        const broken: any = () => { throw new Error("boom"); };
        app(container, {}, () =>
            [DIV,
                {
                    catch: [SECTION,
                        {
                            onMount: (s: unknown, ele: HTMLElement) => {
                                mounts.push("mount fallback");
                            }
                        },
                        "fallback"
                    ]
                },
                broken
            ]
        );

        await expect(mounts).toEqual(["mount fallback"]);
    },

    "onMount(): with caught component, returned vode's onMount fires and receives error": async () => {
        const container = setup();
        const mounts: string[] = [];
        const caughtErrors: string[] = [];
        const broken: any = () => { throw new Error("boom"); };
        app(container, {}, () =>
            [DIV,
                {
                    catch: (s: unknown, err: Error) => {
                        caughtErrors.push(err.message);
                        return [SECTION,
                            {
                                onMount: (s: unknown, ele: HTMLElement) => {
                                    mounts.push("mount fallback");
                                }
                            },
                            "fallback"
                        ];
                    }
                },
                broken
            ]
        );

        await expect(mounts).toEqual(["mount fallback"]);
        await expect(caughtErrors).toEqual(["boom"]);
    },

    "onMount(): with caught component, original element's onMount does NOT fire when error caused replacement": async () => {
        const container = setup();
        const logs: string[] = [];
        const broken: any = () => { throw new Error("boom"); };
        app(container, {}, () =>
            [DIV,
                {
                    catch: [ARTICLE,
                        {
                            onMount: (s: unknown, ele: HTMLElement) => {
                                logs.push("mount fallback");
                            }
                        },
                        "fallback"
                    ]
                },
                [SECTION,
                    {
                        onMount: (s: unknown, ele: HTMLElement) => {
                            logs.push("mount original section");
                        },
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            logs.push("unmount original section");
                        }
                    },
                    broken
                ]
            ]
        );

        // SECTION never finishes mounting (its child broke), so its onMount must not fire.
        // The catch on DIV replaces the broken subtree with ARTICLE whose onMount must fire.
        await expect(logs).toEqual(["mount fallback"]);
    },

    "onUnmount(): called when node is removed from the DOM": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.showArticle && [ARTICLE,
                    {
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            unmounts.push("unmount article");
                        }
                    },
                    [P, "foo", [SPAN, "bar"]],
                ]
            ]
        );

        await expect(unmounts).toEqual([]);
        patch({ showArticle: false });
        await expect(unmounts).toEqual(["unmount article"]);
    },

    "onUnmount(): called for all child nodes that have registered when parent node is removed from the DOM": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.showArticle && [ARTICLE,
                    {
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            unmounts.push("unmount outer");
                        }
                    },
                    [P,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                unmounts.push("unmount inner");
                            }
                        },
                        "foo",
                        [SPAN, "bar"]
                    ],
                ]
            ]
        );

        await expect(unmounts).toEqual([]);
        patch({ showArticle: false });
        await expect(unmounts).toEqual(["unmount inner", "unmount outer"]);
    },

    "onUnmount(): A->A path - onUnmount added during update fires on later removal": async () => {
        const container = setup() as unknown as ContainerNode;
        const unmounts: string[] = [];
        const state = createState({ toggle: false, remove: false });
        const patch = app(container, state, (s) =>
            [DIV,
                !s.remove && [SECTION,
                    s.toggle ? {
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            unmounts.push("unmount section");
                        }
                    } : {},
                    [P, {
                        onUnmount: s.toggle && ((s: unknown, ele: HTMLElement) => {
                            unmounts.push("unmount p");
                        })
                    }, "text"]
                ]
            ]
        );

        await expect(unmounts).toEqual([]);
        let before = container._vode.stats.syncRenderCount;
        patch({ toggle: true });
        await eventually(() => container._vode.stats.syncRenderCount).toBeGreaterThan(before);
        await expect(unmounts).toEqual([]);
        before = container._vode.stats.syncRenderCount;
        patch({ remove: true });
        await eventually(() => container._vode.stats.syncRenderCount).toBeGreaterThan(before);
        await expect(unmounts).toEqual(["unmount p", "unmount section"]);
    },

    "onUnmount(): A->A path - onUnmount removed during update does not fire": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ toggle: false, remove: false });
        const patch = app(container, state, (s) =>
            [DIV,
                !s.remove && [SECTION,
                    !s.toggle && {
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            unmounts.push("unmount section");
                        }
                    },
                    [P, "text"]
                ]
            ]
        );

        await expect(unmounts).toEqual([]);
        patch({ remove: true, toggle: false });
        await expect(unmounts).toEqual([]);
    },

    "onUnmount(): A->A path - onUnmount changed during update fires the new one": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ version: "a", remove: false });
        const patch = app(container, state, (s) =>
            [DIV,
                !s.remove && [SECTION,
                    {
                        onUnmount: s.version === "a"
                            ? (s: unknown, ele: HTMLElement) => { unmounts.push("unmount a"); }
                            : (s: unknown, ele: HTMLElement) => { unmounts.push("unmount b"); }
                    },
                    [P, "text"]
                ]
            ]
        );

        await expect(unmounts).toEqual([]);
        const before = container._vode.stats.syncRenderCount;
        patch({ version: "b" });
        await eventually(() => container._vode.stats.syncRenderCount).toBeGreaterThan(before);
        await expect(unmounts).toEqual([]);
        patch({ remove: true });
        await expect(unmounts).toEqual(["unmount b"]);
    },

    "onUnmount(): A->B path - element replaced with different tag fires old onUnmount": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.showArticle
                    ? [ARTICLE,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                unmounts.push("unmount article");
                            }
                        },
                        [P, "text"]
                    ]
                    : [ASIDE,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                unmounts.push("unmount aside");
                            }
                        },
                        [P, "text"]
                    ]
            ]
        );

        await expect(unmounts).toEqual([]);
        patch({ showArticle: false });
        await expect(unmounts).toEqual(["unmount article"]);
    },

    "onUnmount(): A->B path - swap back fires the other element's onUnmount": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.showArticle
                    ? [ARTICLE,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                unmounts.push("unmount article");
                            }
                        },
                        [P, "text"]
                    ]
                    : [ASIDE,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                unmounts.push("unmount aside");
                            }
                        },
                        [P, "text"]
                    ]
            ]
        );

        await expect(unmounts).toEqual([]);
        patch({ showArticle: false });
        await expect(unmounts).toEqual(["unmount article"]);
        unmounts.length = 0;
        patch({ showArticle: true });
        await expect(unmounts).toEqual(["unmount aside"]);
        unmounts.length = 0;
        patch({ showArticle: false });
        await expect(unmounts).toEqual(["unmount article"]);
    },

    "onUnmount(): A->B path - replaced element's children onUnmounts also fire": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.showArticle
                    ? [ARTICLE,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                unmounts.push("unmount article");
                            }
                        },
                        [P,
                            {
                                onUnmount: (s: unknown, ele: HTMLElement) => {
                                    unmounts.push("unmount p");
                                }
                            },
                            "foo"
                        ],
                    ]
                    : [ASIDE,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                unmounts.push("unmount aside");
                            }
                        },
                        [SPAN, "bar"]
                    ]
            ]
        );

        await expect(unmounts).toEqual([]);
        patch({ showArticle: false });
        await expect(unmounts).toEqual(["unmount p", "unmount article"]);
    },

    "onUnmount(): element -> text fires onUnmount": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showElement: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.showElement
                    ? [ARTICLE,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                unmounts.push("unmount article");
                            }
                        },
                        [P, "foo"]
                    ]
                    : "plain text"
            ]
        );

        await expect(unmounts).toEqual([]);
        patch({ showElement: false });
        await expect(unmounts).toEqual(["unmount article"]);
    },

    "onUnmount(): text -> element registers onUnmount that fires later": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showElement: false, remove: false });
        const patch = app(container, state, (s) =>
            [DIV,
                s.remove ? undefined :
                    s.showElement
                        ? [ARTICLE,
                            {
                                onUnmount: (s: unknown, ele: HTMLElement) => {
                                    unmounts.push("unmount article");
                                }
                            },
                            [P, "foo"]
                        ]
                        : "plain text"
            ]
        );

        await expect(unmounts).toEqual([]);
        const before = container._vode.stats.syncRenderCount;
        patch({ showElement: true });
        await eventually(() => container._vode.stats.syncRenderCount).toBeGreaterThan(before);
        await expect(unmounts).toEqual([]);
        patch({ remove: true });
        await expect(unmounts).toEqual(["unmount article"]);
    },

    "onUnmount(): deep nesting 4+ levels with onUnmount at each level": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ show: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.show && [NAV,
                    {
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            unmounts.push("unmount nav");
                        }
                    },
                    [MAIN,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                unmounts.push("unmount main");
                            }
                        },
                        [SECTION,
                            {
                                onUnmount: (s: unknown, ele: HTMLElement) => {
                                    unmounts.push("unmount section");
                                }
                            },
                            [ARTICLE,
                                {
                                    onUnmount: (s: unknown, ele: HTMLElement) => {
                                        unmounts.push("unmount article");
                                    }
                                },
                                [P, "deep text"]
                            ]
                        ]
                    ]
                ]
            ]
        );

        await expect(unmounts).toEqual([]);
        patch({ show: false });
        await expect(unmounts)
            .toEqual([
                "unmount article",
                "unmount section",
                "unmount main",
                "unmount nav"
            ]);
    },

    "onUnmount(): multiple siblings - remove one fires only that sibling's subtree": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showFirst: true, showSecond: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.showFirst && [ARTICLE,
                    {
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            unmounts.push("unmount first");
                        }
                    },
                    [P,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                unmounts.push("unmount first-child");
                            }
                        },
                        "a"
                    ]
                ],
                s.showSecond && [ASIDE,
                    {
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            unmounts.push("unmount second");
                        }
                    },
                    [SPAN,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                unmounts.push("unmount second-child");
                            }
                        },
                        "b"
                    ]
                ]
            ]
        );

        await expect(unmounts).toEqual([]);
        patch({ showFirst: false });
        await expect(unmounts).toEqual(["unmount first-child", "unmount first"]);
    },

    "onUnmount(): multiple siblings - remove parent fires all": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ show: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.show && [SECTION,
                    [ARTICLE,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                unmounts.push("unmount first");
                            }
                        },
                        [P, "a"]
                    ],
                    [ASIDE,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                unmounts.push("unmount second");
                            }
                        },
                        [SPAN, "b"]
                    ]
                ]
            ]
        );

        await expect(unmounts).toEqual([]);
        patch({ show: false });
        await expect(unmounts).toEqual(["unmount second", "unmount first"]);
    },

    "onUnmount(): stale children cleanup - fewer new children than old fires removed children's onUnmounts": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ count: 3 });
        const patch = app(container, state, (s) =>
            [DIV,
                [SECTION,
                    s.count >= 1 && [P, { onUnmount: (s: unknown, ele: HTMLElement) => { unmounts.push("unmount p0"); } }, "item 0"],
                    s.count >= 2 && [P, { onUnmount: (s: unknown, ele: HTMLElement) => { unmounts.push("unmount p1"); } }, "item 1"],
                    s.count >= 3 && [P, { onUnmount: (s: unknown, ele: HTMLElement) => { unmounts.push("unmount p2"); } }, "item 2"],
                ]
            ]
        );

        await expect(unmounts).toEqual([]);
        patch({ count: 1 });
        await expect(unmounts).toEqual(["unmount p1", "unmount p2"]);
    },

    "onUnmount(): mixed onUnmount presence in tree - only elements with onUnmount fire": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ show: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.show && [SECTION,
                    {
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            unmounts.push("unmount section");
                        }
                    },
                    [ARTICLE,
                        [P,
                            {
                                onUnmount: (s: unknown, ele: HTMLElement) => {
                                    unmounts.push("unmount p");
                                }
                            },
                            "foo"
                        ],
                        [ASIDE,
                            [SPAN, "bar"]
                        ]
                    ]
                ]
            ]
        );

        await expect(unmounts).toEqual([]);
        patch({ show: false });
        await expect(unmounts).toEqual(["unmount p", "unmount section"]);
    },

    "onUnmount(): sibling ordering - sibling subtree depths": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ show: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.show && [SECTION,
                    [DIV,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                unmounts.push("unmount div");
                            }
                        },
                        [P,
                            {
                                onUnmount: (s: unknown, ele: HTMLElement) => {
                                    unmounts.push("unmount p-deep");
                                }
                            },
                            "deep"
                        ]
                    ],
                    [NAV,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                unmounts.push("unmount nav");
                            }
                        },
                        "shallow"
                    ]
                ]
            ]
        );

        await expect(unmounts).toEqual([]);
        patch({ show: false });
        await expect(unmounts).toEqual(["unmount nav", "unmount p-deep", "unmount div"]);
    },

    "onUnmount(): A->A path - children's unmounts shift when previous sibling's subtree changes": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showExtraChild: true, remove: false });
        const patch = app(container, state, (s) =>
            [DIV,
                !s.remove && [SECTION,
                    [P,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                unmounts.push("unmount p-first");
                            }
                        },
                        s.showExtraChild && [SPAN,
                            {
                                onUnmount: (s: unknown, ele: HTMLElement) => {
                                    unmounts.push("unmount span");
                                }
                            },
                            "extra"
                        ],
                        "static"
                    ],
                    [ASIDE,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                unmounts.push("unmount aside");
                            }
                        },
                        "text"
                    ]
                ]
            ]
        );

        await expect(unmounts).toEqual([]);
        patch({ showExtraChild: false });
        await expect(unmounts).toEqual(["unmount span"]);
        patch({ remove: true });
        await expect(unmounts)
            .toEqual([
                "unmount span",
                "unmount aside",
                "unmount p-first"
            ]);
    },

    "onUnmount(): root element replacement fires root's onUnmount": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showDiv: true });
        const patch = app(container, state, (s) =>
            s.showDiv
                ? [DIV,
                    {
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            unmounts.push("unmount div");
                        }
                    },
                    [P, "text"]
                ]
                : [ARTICLE,
                    {
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            unmounts.push("unmount article");
                        }
                    },
                    [SPAN, "other"]
                ]
        );

        await expect(unmounts).toEqual([]);
        patch({ showDiv: false });
        await expect(unmounts).toEqual(["unmount div"]);
    },

    "onUnmount(): child onUnmount fires when element is falsified after onUnmount was added via A->A update": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ addUnmount: false, show: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.show && [ARTICLE,
                    s.addUnmount ? {
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            unmounts.push("unmount article");
                        }
                    } : {},
                    [P, "foo"]
                ]
            ]
        );

        await expect(unmounts).toEqual([]);
        const before = container._vode.stats.syncRenderCount;
        patch({ addUnmount: true });
        await eventually(() => container._vode.stats.syncRenderCount).toEqual(before + 1);
        await expect(unmounts).toEqual([]);
        patch({ show: false });
        await expect(unmounts).toEqual(["unmount article"]);
    },

    "onUnmount(): A->B path - onUnmount from old children fire when switching tags": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app(container, state, (s) =>
            [DIV,
                s.showArticle
                    ? [ARTICLE,
                        [P,
                            {
                                onUnmount: (s: unknown, ele: HTMLElement) => {
                                    unmounts.push("unmount p-inner");
                                }
                            },
                            [SPAN, "nested"]
                        ]
                    ]
                    : [ASIDE,
                        [DIV,
                            {
                                onUnmount: (s: unknown, ele: HTMLElement) => {
                                    unmounts.push("unmount div-inner");
                                }
                            },
                            "replacement"
                        ]
                    ]
            ]
        );

        await expect(unmounts).toEqual([]);
        patch({ showArticle: false });
        await expect(unmounts).toEqual(["unmount p-inner"]);
    },

    "onUnmount(): memo hit + earlier sibling growth corrupts unmount indices": async () => {
        const container = setup();
        const fired: string[] = [];
        const state = createState({ expanded: false, showB: true });
        const patch = app(container, state, (s) =>
            [DIV,
                [SPAN,
                    {
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            fired.push("unmount A");
                        }
                    },
                    s.expanded && [ASIDE,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                fired.push("unmount A-child");
                            }
                        },
                        "x"
                    ],
                ],
                s.showB && memo([], () => [SECTION,
                    {
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            fired.push("unmount B");
                        }
                    },
                ])
            ]
        );

        await expect(fired).toEqual([]);

        patch({ expanded: true });
        await expect(fired).toEqual([]);

        patch({ showB: false });
        await expect(fired).toEqual(["unmount B"]);
    },

    "onUnmount(): excess child removal + same-render sibling growth": async () => {
        const container = setup();
        const fired: string[] = [];
        const state = createState({ expanded: false, showB: true });
        const patch = app(container, state, (s) =>
            [DIV,
                [SPAN,
                    {
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            fired.push("unmount A");
                        }
                    },
                    s.expanded && [ASIDE,
                        {
                            onUnmount: (s: unknown, ele: HTMLElement) => {
                                fired.push("unmount A-child");
                            }
                        },
                        "x"
                    ],
                ],
                s.showB && [P,
                    {
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            fired.push("unmount B");
                        }
                    },
                ]
            ]
        );

        await expect(fired).toEqual([]);
        patch({ expanded: true, showB: false });
        await expect(fired).toEqual(["unmount B"]);
    },

    "onUnmount(): with caught component, replacement vode's onUnmount fires when removed": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ show: true });
        const broken: any = () => { throw new Error("boom"); };
        const patch = app(container, state, (s) =>
            [DIV,
                s.show && [SECTION,
                    {
                        catch: [ARTICLE,
                            {
                                onUnmount: (s: unknown, ele: HTMLElement) => {
                                    unmounts.push("unmount fallback");
                                }
                            },
                            "fallback"
                        ]
                    },
                    broken
                ]
            ]
        );

        await expect(unmounts).toEqual([]);
        patch({ show: false });
        await expect(unmounts).toEqual(["unmount fallback"]);
    },

    "onUnmount(): with caught component, deep replacement tree fires in post-order": async () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ show: true });
        const broken: any = () => { throw new Error("boom"); };
        const patch = app(container, state, (s) =>
            [DIV,
                s.show && [SECTION,
                    {
                        catch: [ARTICLE,
                            {
                                onUnmount: (s: unknown, ele: HTMLElement) => {
                                    unmounts.push("unmount article");
                                }
                            },
                            [P,
                                {
                                    onUnmount: (s: unknown, ele: HTMLElement) => {
                                        unmounts.push("unmount p");
                                    }
                                },
                                "x"
                            ],
                            [SPAN,
                                {
                                    onUnmount: (s: unknown, ele: HTMLElement) => {
                                        unmounts.push("unmount span");
                                    }
                                },
                                "y"
                            ]
                        ]
                    },
                    broken
                ]
            ]
        );

        await expect(unmounts).toEqual([]);
        patch({ show: false });
        await expect(unmounts).toEqual(["unmount span", "unmount p", "unmount article"]);
    },

    "onMount() + onUnmount(): with caught component, full lifecycle symmetry of catch replacement": async () => {
        const container = setup();
        const logs: string[] = [];
        const state = createState({ show: true });
        const broken: any = () => { throw new Error("boom"); };
        const patch = app(container, state, (s) =>
            [DIV,
                s.show && [SECTION,
                    {
                        catch: [ARTICLE,
                            {
                                onMount: (s: unknown, ele: HTMLElement) => {
                                    logs.push("mount article");
                                },
                                onUnmount: (s: unknown, ele: HTMLElement) => {
                                    logs.push("unmount article");
                                }
                            },
                            "fallback"
                        ]
                    },
                    broken
                ]
            ]
        );

        await expect(logs).toEqual(["mount article"]);
        patch({ show: false });
        await expect(logs).toEqual(["mount article", "unmount article"]);
    },

    "onMount() + onUnmount: symmetry of calls": async () => {
        const container = setup();
        const state = createState({
            startTime: 0,
            inputReady: false,
            showInput: true,
            showTimer: true
        });
        const logs: string[] = [];

        const patch = app(container, state, (s) => {
            return [DIV,
                s.showInput && [INPUT, {
                    type: 'text',
                    placeholder: 'Auto-focused on mount',
                    onMount: (s: typeof state, ele: HTMLElement) => {
                        logs.push('Input mounted');
                        return { inputReady: true };
                    },
                    onUnmount: (s: typeof state, ele: HTMLElement) => {
                        logs.push('Input removed');
                        return { inputReady: false };
                    }
                }],

                s.showTimer && [P, {
                    onMount: (s: typeof state, ele: HTMLElement) => {
                        logs.push('Timer started');
                        return { startTime: Date.now() };
                    },
                    onUnmount: (s: typeof state, ele: HTMLElement) => {
                        logs.push('Timer removed');
                    }
                }, 'Mount/unmount lifecycle demo']
            ]
        }
        );

        await expect(state.inputReady)
            .toEqual(true);
        await expect(state.startTime != 0)
            .toEqual(true);
        patch({ showInput: false });

        await eventually(() => state.inputReady).toEqual(false, "expected: inputReady == false");

        patch({ showTimer: false });

        await eventually(() => container._vode.stats.syncRenderCount).toBeGreaterOrEqualThan(4);

        await expect(logs).toEqual([
            'Input mounted',
            'Timer started',
            'Input removed',
            'Timer removed'
        ]);
    },

    "onMount() + onUnmount(): Not called when DOM does not require element creation or removal (same TAGs)": async () => {
        const container = setup();
        const logs = <string[]>[];
        const state = createState({ showB: false, showD: false });

        const Comp: (name: string) => Component<typeof state> = (name: string) => () => [ARTICLE,
            [DIV,
                {
                    onMount: () => logs.push("mount " + name),
                    onUnmount: () => logs.push("unmount " + name)
                },
                "Component " + name]
        ];
        app(container, state, s => [DIV,
            // this way they both "share a slot"
            s.showB ? Comp("B") : Comp("A"),

            // this way each component occupies its own "slot"
            !s.showD && Comp("C"),
            s.showD && Comp("D"),
        ]);

        await expect(container).toMatch(
            [DIV,
                [ARTICLE,
                    [DIV, "Component A"],
                ],
                [ARTICLE,
                    [DIV, "Component C"],
                ],
            ]
        );
        await expect(logs).toEqual(["mount A", "mount C"]);

        state.patch({ showB: true });

        await expect(container).toMatch(
            [DIV,
                [ARTICLE,
                    [DIV, "Component B"],
                ],
                [ARTICLE,
                    [DIV, "Component C"],
                ],
            ]
        );

        // as both components result in the same structure
        // of element types the unmount of A 
        // and mount of B does not occur
        await expect(logs).toEqual(["mount A", "mount C"]);


        state.patch({ showD: true });

        await expect(container).toMatch(
            [DIV,
                [ARTICLE,
                    [DIV, "Component B"],
                ],
                [ARTICLE,
                    [DIV, "Component D"],
                ],
            ]
        );

        // when the components occupy different slots in the vdom
        // their mount/unmount functions are called
        await expect(logs).toEqual([
            "mount A",
            "mount C",
            "unmount C",
            "mount D",
        ]);
    },
}
