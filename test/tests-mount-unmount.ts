import { app, createState } from "../src/vode"
import { ARTICLE, DIV, P, SPAN } from "../src/vode-tags";
import { expect } from "./helper";

export default {
    "onMount(): called when node is attached to the DOM": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

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

        expect(mountCalled).toEqual(true);
    },

    "onMount(): called in order of child nodes first, then parent onMounts": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

        const mounts: string[] = [];

        app(container, {}, () =>
            [DIV,
                [ARTICLE,
                    {
                        onMount: (s: unknown, ele: HTMLElement) => {
                            mounts.push("mount article");
                        }
                    },

                    [P,
                        {
                            onMount: (s: unknown, ele: HTMLElement) => {
                                mounts.push("mount p");
                            }
                        },
                        "foo",
                        [SPAN, "bar"],
                    ]
                ]
            ]
        );

        expect(mounts).toEqual(["mount p", "mount article"]);
    },

    "onUnmount(): called when node is removed from the DOM": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);

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
}