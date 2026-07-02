import { expect } from "./helper";
import { hydrate, DIV, SPAN, P, $NODE } from "../index";
import { FakeElement, FakeTextNode } from "./mocks";

export default {
    "hydrate(): text node returns its text content": async () => {
        const text = new FakeTextNode("hello world");

        await expect(hydrate(text as any))
            .toMatch("hello world");
    },

    "hydrate(): empty element returns a vode": async () => {
        const el = new FakeElement("div");
        const result = hydrate(el as any);

        await expect(result)
            .toMatch([DIV]);
    },

    "hydrate(): element with children returns full vode tree": async () => {
        const parent = new FakeElement("div");
        const child = new FakeElement("span");
        parent.appendChild(child);

        await expect(hydrate(parent as any))
            .toMatch([DIV, [SPAN]]);
    },

    "hydrate(): element with text child": async () => {
        const parent = new FakeElement("p");
        const text = new FakeTextNode("hello");
        parent.appendChild(text);

        await expect(hydrate(parent as any))
            .toMatch([P, "hello"]);
    },

    "hydrate(): element with attributes reads them into props": async () => {
        const el = new FakeElement("div");
        el.setAttribute("class", "foo");
        el.setAttribute("id", "bar");

        await expect(hydrate(el as any))
            .toMatch([DIV, { class: "foo", id: "bar" }]);
    },

    "hydrate(): unknown node type returns undefined": async () => {
        const frag = { nodeType: 999 } as any;

        await expect(hydrate(frag))
            .toEqual(undefined);
    },

    "hydrate(): empty text node returns undefined": async () => {
        const text = new FakeTextNode("   ");

        await expect(hydrate(text as any))
            .toEqual(undefined);
    },

    "hydrate(): only element and text nodes are supported": async () => {
        const comment = { nodeType: 8 /* COMMENT_NODE */ } as any;

        await expect(hydrate(comment))
            .toEqual(undefined);
    },

    "hydrate(): prepareForRender returns text node for text input": async () => {
        const text = new FakeTextNode("hello");

        const result = hydrate(text as any, true);

        await expect(result instanceof FakeTextNode).toEqual(true);
        await expect((result as any).nodeValue).toEqual("hello");
    },

    "hydrate(): prepareForRender attaches $NODE to element vode": async () => {
        const el = new FakeElement("div");

        const result = hydrate(el as any, true) as any;

        await expect(Array.isArray(result)).toEqual(true);
        await expect(result[0]).toEqual("div");
        await expect(result[$NODE] instanceof FakeElement).toEqual(true);
        await expect(result[$NODE].tagName).toEqual("DIV");
    },

    "hydrate(): prepareForRender removes whitespace text nodes": async () => {
        const el = new FakeElement("div");
        el.appendChild(new FakeTextNode("   "));
        el.appendChild(new FakeElement("span"));
        el.appendChild(new FakeTextNode("  "));

        await expect(el.childNodes.length).toEqual(3);

        const result = hydrate(el as any, true);

        await expect(el.childNodes.length).toEqual(1);
        await expect((el.childNodes[0] as any).tagName).toEqual("SPAN");
    },
};
