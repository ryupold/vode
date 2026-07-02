import { attr, eventually, expect } from "./helper";
import { app, createState, $NODE, RenderedVode, ARTICLE, ASIDE, DIV, P } from "../index";

type Call = { newVode: RenderedVode; oldVode: RenderedVode | undefined };

function setup() {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    return container;
}

export default {
    "reconciled: fires on create with an attached newVode and no oldVode": async () => {
        const container = setup();
        const calls: Call[] = [];

        app(container, createState({}), () => [DIV,
            [ARTICLE, {
                reconciled: (_s: unknown, newVode: RenderedVode, oldVode?: RenderedVode) => {
                    calls.push({ newVode, oldVode });
                },
            }, [P, "text"]],
        ]);

        await eventually(() => calls.length).toEqual(1);
        await expect(calls[0].oldVode).toEqual(undefined, "create case must pass no oldVode");
        await expect(calls[0].newVode[0]).toEqual(ARTICLE);
        await expect(calls[0].newVode[$NODE] === (container.childNodes[0] as any))
            .toEqual(true, "newVode must carry the attached DOM node");
    },

    "reconciled: fires on every update, receiving the previous vode": async () => {
        const container = setup();
        const calls: Call[] = [];
        const state = createState({ count: 0 });

        app(container, state, (s) => [DIV,
            [ARTICLE, {
                reconciled: (_s: unknown, newVode: RenderedVode, oldVode?: RenderedVode) => {
                    calls.push({ newVode, oldVode });
                },
            }, [P, `Count: ${s.count}`]],
        ]);

        await eventually(() => calls.length).toEqual(1);

        state.patch({ count: 1 });
        await eventually(() => calls.length).toEqual(2);
        // update case: oldVode is exactly the vode of the previous render ...
        await expect(calls[1].oldVode === calls[0].newVode)
            .toEqual(true, "oldVode must be the newVode of the previous render");
        // ... and the DOM node was reused, not recreated
        await expect(calls[1].newVode[$NODE] === calls[0].newVode[$NODE])
            .toEqual(true, "the DOM node must be reused across updates");

        state.patch({ count: 2 });
        await eventually(() => calls.length).toEqual(3);
        await expect(calls[2].oldVode === calls[1].newVode).toEqual(true);
    },

    "reconciled: not called when the element is removed": async () => {
        const container = setup();
        let calls = 0;
        const state = createState({ show: true });

        app(container, state, (s) => [DIV,
            s.show && [ARTICLE, { reconciled: () => { calls++; } }, [P, "text"]],
        ]);

        await eventually(() => calls).toEqual(1);

        state.patch({ show: false });

        // wait until the removal landed in the DOM
        await eventually(() => container.childNodes.length).toEqual(0);
        await expect(calls).toEqual(1);
    },

    "reconciled: not called when the element is replaced by a text node": async () => {
        const container = setup();
        let calls = 0;
        const state = createState({ asText: false });

        app(container, state, (s) => [DIV,
            s.asText
                ? "plain text"
                : [ARTICLE, { reconciled: () => { calls++; } }, [P, "text"]],
        ]);

        await eventually(() => calls).toEqual(1);

        state.patch({ asText: true });

        await expect(container).toMatch([DIV, "plain text"]);
        await expect(calls).toEqual(1);
    },

    "reconciled: a replacement with another tag": async () => {
        const container = setup();
        const articleCalls: (RenderedVode | undefined)[] = [];
        const asideCalls: (RenderedVode | undefined)[] = [];
        const state = createState({ useAside: false });

        app(container, state, (s) => [DIV,
            s.useAside
                ? [ASIDE, {
                    reconciled: (_s: unknown, _n: RenderedVode, oldVode?: RenderedVode) => {
                        asideCalls.push(oldVode);
                    },
                }, [P, "aside"]]
                : [ARTICLE, {
                    reconciled: (_s: unknown, _n: RenderedVode, oldVode?: RenderedVode) => {
                        articleCalls.push(oldVode);
                    },
                }, [P, "article"]],
        ]);

        await eventually(() => articleCalls.length).toEqual(1);

        state.patch({ useAside: true });

        await eventually(() => asideCalls.length).toEqual(1);
        await expect(asideCalls[0]).toMatch([ARTICLE, [P, "article"]]);
        await expect(articleCalls.length).toEqual(1);
    },

    "reconciled: is stripped from the DOM node": async () => {
        const container = setup();
        const state = createState({ count: 0 });

        app(container, state, (s) => [DIV,
            [ARTICLE, { reconciled: () => { } }, `Count: ${s.count}`],
        ]);

        const node = container.childNodes[0] as any;
        await eventually(() => attr(node, "reconciled")).toEqual(undefined);
        await expect(node["reconciled"] ?? null)
            .toEqual(null, "the hook must not stay on the node as a property");

        // still stripped after an update render
        state.patch({ count: 1 });
        await eventually(() => node.childNodes[0]?.nodeValue).toEqual("Count: 1");
        await expect(attr(node, "reconciled")).toEqual(undefined);
        await expect(node["reconciled"] ?? null).toEqual(null);
    },
};
