import { app, createState } from "../src/vode"
import { ARTICLE, ASIDE, DIV, INPUT, MAIN, NAV, P, SECTION, SPAN } from "../src/vode-tags";
import { expect } from "./helper";

function setup() {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    return container;
}

export default {
    "onMount(): called when node is attached to the DOM": () => {
        const container = setup();
        let mountCalled = false;
        app(container, {}, () =>
            [DIV,
                [ARTICLE,
                    {
                        onMount: (s: unknown, ele: HTMLElement) => {
                            expect(ele.tagName).toEqual("ARTICLE");
                            mountCalled = true;
                        }
                    },
                    [P, "foo", [SPAN, "bar"]],
                ]
            ]
        );

        expect(mountCalled)
            .toEqual(true);
    },

    "onMount(): called in order of child nodes first, then parent onMounts": () => {
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

        expect(mounts)
            .toEqual(["mount inner", "mount outer"]);
    },

    "onMount(): deep nesting 4+ levels with onMount at each level": () => {
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

        expect(mounts)
            .toEqual([
                "mount article",
                "mount section",
                "mount main",
                "mount nav"
            ]);
    },

    "onMount(): multiple siblings with onMount on initial render": () => {
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

        expect(mounts)
            .toEqual(["mount p", "mount span"]);
    },

    "onMount(): A->A path - onMount added during update does NOT fire": () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ addMount: false });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(mounts).toEqual([]);
        patch({ addMount: true });
        expect(mounts).toEqual([]);
    },

    "onMount(): A->A path - onMount removed during update does not cause issues": () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ removeMount: false });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(mounts).toEqual(["mount p"]);
        patch({ removeMount: true });
        expect(mounts).toEqual(["mount p"]);
    },

    "onMount(): A->A path - onMount changed during update does NOT fire the new one": () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ version: "a" });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(mounts).toEqual(["mount a"]);
        patch({ version: "b" });
        expect(mounts).toEqual(["mount a"]);
    },

    "onMount(): A->B path - element replaced with different tag fires new onMount": () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(mounts).toEqual(["mount article"]);
        patch({ showArticle: false });
        expect(mounts).toEqual(["mount article", "mount aside"]);
    },

    "onMount(): A->B path - swap back fires the other element's onMount": () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(mounts).toEqual(["mount article"]);
        patch({ showArticle: false });
        expect(mounts).toEqual(["mount article", "mount aside"]);
        patch({ showArticle: true });
        expect(mounts).toEqual(["mount article", "mount aside", "mount article"]);
        patch({ showArticle: false });
        expect(mounts)
            .toEqual([
                "mount article",
                "mount aside",
                "mount article",
                "mount aside"
            ]);
    },

    "onMount(): A->B path - children's onMounts also fire in new tree": () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(mounts).toEqual(["mount p"]);
        patch({ showArticle: false });
        expect(mounts).toEqual(["mount p", "mount div"]);
    },

    "onMount(): text -> element fires new element's onMount": () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ showElement: false });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(mounts).toEqual([]);
        patch({ showElement: true });
        expect(mounts).toEqual(["mount article"]);
    },

    "onMount(): mixed onMount presence in tree": () => {
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

        expect(mounts).toEqual(["mount p", "mount section"]);
    },

    "onMount(): sibling subtree depths fire in correct order": () => {
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

        expect(mounts)
            .toEqual([
                "mount p-deep",
                "mount div",
                "mount nav"
            ]);
    },

    "onMount(): added children from count increase fire onMount": () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ count: 1 });
        const patch = app<typeof state>(container, state, (s) =>
            [DIV,
                [SECTION,
                    s.count >= 1 && [P, { onMount: (s: unknown, ele: HTMLElement) => { mounts.push("mount p0"); } }, "item 0"],
                    s.count >= 2 && [P, { onMount: (s: unknown, ele: HTMLElement) => { mounts.push("mount p1"); } }, "item 1"],
                    s.count >= 3 && [P, { onMount: (s: unknown, ele: HTMLElement) => { mounts.push("mount p2"); } }, "item 2"],
                ]
            ]
        );

        expect(mounts).toEqual(["mount p0"]);
        patch({ count: 2 });
        expect(mounts).toEqual(["mount p0", "mount p1"]);
        patch({ count: 3 });
        expect(mounts).toEqual(["mount p0", "mount p1", "mount p2"]);
    },

    "onMount(): conditional child fires onMount when added": () => {
        const container = setup();
        const mounts: string[] = [];
        const state = createState({ show: false });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(mounts).toEqual([]);
        patch({ show: true });
        expect(mounts).toEqual(["mount span"]);
    },

    "onUnmount(): called when node is removed from the DOM": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(unmounts).toEqual([]);
        patch({ showArticle: false });
        expect(unmounts).toEqual(["unmount article"]);
    },

    "onUnmount(): called for all child nodes that have registerd when parent node is removed from the DOM": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(unmounts).toEqual([]);
        patch({ showArticle: false });
        expect(unmounts).toEqual(["unmount inner", "unmount outer"]);
    },

    "onUnmount(): A->A path - onUnmount added during update fires on later removal": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ toggle: false, remove: false });
        const patch = app<typeof state>(container, state, (s) =>
            [DIV,
                !s.remove && [SECTION,
                    s.toggle ? {
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            unmounts.push("unmount section");
                        }
                    } : {},
                    [P, "text"]
                ]
            ]
        );

        expect(unmounts).toEqual([]);
        patch({ toggle: true });
        expect(unmounts).toEqual([]);
        patch({ remove: true });
        expect(unmounts).toEqual(["unmount section"]);
    },

    "onUnmount(): A->A path - onUnmount removed during update does not fire": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ toggle: false, remove: false });
        const patch = app<typeof state>(container, state, (s) =>
            [DIV,
                !s.remove && [SECTION,
                    s.toggle ? {} : {
                        onUnmount: (s: unknown, ele: HTMLElement) => {
                            unmounts.push("unmount section");
                        }
                    },
                    [P, "text"]
                ]
            ]
        );

        expect(unmounts).toEqual([]);
        patch({ toggle: true });
        expect(unmounts).toEqual([]);
        patch({ remove: true });
        expect(unmounts).toEqual([]);
    },

    "onUnmount(): A->A path - onUnmount changed during update fires the new one": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ version: "a", remove: false });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(unmounts).toEqual([]);
        patch({ version: "b" });
        expect(unmounts).toEqual([]);
        patch({ remove: true });
        expect(unmounts).toEqual(["unmount b"]);
    },

    "onUnmount(): A->B path - element replaced with different tag fires old onUnmount": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(unmounts).toEqual([]);
        patch({ showArticle: false });
        expect(unmounts).toEqual(["unmount article"]);
    },

    "onUnmount(): A->B path - swap back fires the other element's onUnmount": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(unmounts).toEqual([]);
        patch({ showArticle: false });
        expect(unmounts).toEqual(["unmount article"]);
        unmounts.length = 0;
        patch({ showArticle: true });
        expect(unmounts).toEqual(["unmount aside"]);
        unmounts.length = 0;
        patch({ showArticle: false });
        expect(unmounts).toEqual(["unmount article"]);
    },

    "onUnmount(): A->B path - replaced element's children onUnmounts also fire": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(unmounts).toEqual([]);
        patch({ showArticle: false });
        expect(unmounts).toEqual(["unmount p", "unmount article"]);
    },

    "onUnmount(): element -> text fires onUnmount": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showElement: true });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(unmounts).toEqual([]);
        patch({ showElement: false });
        expect(unmounts).toEqual(["unmount article"]);
    },

    "onUnmount(): text -> element registers onUnmount that fires later": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showElement: false, remove: false });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(unmounts).toEqual([]);
        patch({ showElement: true });
        expect(unmounts).toEqual([]);
        patch({ remove: true });
        expect(unmounts).toEqual(["unmount article"]);
    },

    "onUnmount(): deep nesting 4+ levels with onUnmount at each level": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ show: true });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(unmounts).toEqual([]);
        patch({ show: false });
        expect(unmounts)
            .toEqual([
                "unmount article",
                "unmount section",
                "unmount main",
                "unmount nav"
            ]);
    },

    "onUnmount(): multiple siblings - remove one fires only that sibling's subtree": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showFirst: true, showSecond: true });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(unmounts).toEqual([]);
        patch({ showFirst: false });
        expect(unmounts).toEqual(["unmount first-child", "unmount first"]);
    },

    "onUnmount(): multiple siblings - remove parent fires all": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ show: true });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(unmounts).toEqual([]);
        patch({ show: false });
        expect(unmounts).toEqual(["unmount second", "unmount first"]);
    },

    "onUnmount(): stale children cleanup - fewer new children than old fires removed children's onUnmounts": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ count: 3 });
        const patch = app<typeof state>(container, state, (s) =>
            [DIV,
                [SECTION,
                    s.count >= 1 && [P, { onUnmount: (s: unknown, ele: HTMLElement) => { unmounts.push("unmount p0"); } }, "item 0"],
                    s.count >= 2 && [P, { onUnmount: (s: unknown, ele: HTMLElement) => { unmounts.push("unmount p1"); } }, "item 1"],
                    s.count >= 3 && [P, { onUnmount: (s: unknown, ele: HTMLElement) => { unmounts.push("unmount p2"); } }, "item 2"],
                ]
            ]
        );

        expect(unmounts).toEqual([]);
        patch({ count: 1 });
        expect(unmounts).toEqual(["unmount p1", "unmount p2"]);
    },

    "onUnmount(): mixed onUnmount presence in tree - only elements with onUnmount fire": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ show: true });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(unmounts).toEqual([]);
        patch({ show: false });
        expect(unmounts).toEqual(["unmount p", "unmount section"]);
    },

    "onUnmount(): sibling ordering - sibling subtree depths": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ show: true });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(unmounts).toEqual([]);
        patch({ show: false });
        expect(unmounts).toEqual(["unmount nav", "unmount p-deep", "unmount div"]);
    },

    "onUnmount(): A->A path - children's unmounts shift when previous sibling's subtree changes": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showExtraChild: true, remove: false });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(unmounts).toEqual([]);
        patch({ showExtraChild: false });
        expect(unmounts).toEqual(["unmount span"]);
        patch({ remove: true });
        expect(unmounts)
            .toEqual([
                "unmount span",
                "unmount aside",
                "unmount p-first"
            ]);
    },

    "onUnmount(): root element replacement fires root's onUnmount": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showDiv: true });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(unmounts).toEqual([]);
        patch({ showDiv: false });
        expect(unmounts).toEqual(["unmount div"]);
    },

    "onUnmount(): child onUnmount fires when element is falsified after onUnmount was added via A->A update": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ addUnmount: false, show: true });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(unmounts).toEqual([]);
        patch({ addUnmount: true });
        expect(unmounts).toEqual([]);
        patch({ show: false });
        expect(unmounts).toEqual(["unmount article"]);
    },

    "onUnmount(): A->B path - onUnmount from old children fire when switching tags": () => {
        const container = setup();
        const unmounts: string[] = [];
        const state = createState({ showArticle: true });
        const patch = app<typeof state>(container, state, (s) =>
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

        expect(unmounts).toEqual([]);
        patch({ showArticle: false });
        expect(unmounts).toEqual(["unmount p-inner"]);
    },

    "onMount() + onUnmount: symmetry of calls": () => {
        const container = setup();
        const state = createState({
            startTime: 0,
            inputReady: false,
            showInput: true,
            showTimer: true
        });
        type State = typeof state;
        const logs: string[] = [];

        const patch = app<State>(container, state, (s) =>
            [DIV,
                s.showInput && [INPUT, {
                    type: 'text',
                    placeholder: 'Auto-focused on mount',
                    onMount: (s: State, ele: HTMLElement) => {
                        //(ele as HTMLInputElement).focus();
                        logs.push('Input mounted');
                        return { inputReady: true };
                    },
                    onUnmount: (s: State, ele: HTMLElement) => {
                        // console.log('Input removed');
                        logs.push('Input removed');
                        return { inputReady: false };
                    }
                }],

                s.showTimer && [P, {
                    onMount: (s: State, ele: HTMLElement) => {
                        logs.push('Timer started');
                        s.patch({ startTime: Date.now() });
                    },
                    onUnmount: (s: State, ele: HTMLElement) => {
                        console.log('Timer stopped after', Date.now() - s.startTime, 'ms');
                        logs.push('Timer removed');
                    }
                }, 'Mount/unmount lifecycle demo']
            ]
        );

        expect(state.inputReady)
            .toEqual(true);
        expect(state.startTime != 0)
            .toEqual(true);
        patch({ showInput: false });
        expect(state.inputReady)
            .toEqual(false);
        patch({ showTimer: false });
        expect(logs).toEqual([
            'Input mounted',
            'Timer started',
            'Input removed',
            'Timer removed'
        ]);
    },
}
