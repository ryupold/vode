import { expect } from "./helper";
import { hydrate, DIV, SPAN, P } from "../index";
import { FakeElement, FakeTextNode } from "./mocks";

export default {
    "hydrate(): text node returns its text content": () => {
        const text = new FakeTextNode("hello world");

        expect(hydrate(text as any))
            .toMatch("hello world");
    },

    "hydrate(): empty element returns a vode": () => {
        const el = new FakeElement("div");
        const result = hydrate(el as any);

        expect(result)
            .toMatch([DIV]);
    },

    "hydrate(): element with children returns full vode tree": () => {
        const parent = new FakeElement("div");
        const child = new FakeElement("span");
        parent.appendChild(child);

        expect(hydrate(parent as any))
            .toMatch([DIV, [SPAN]]);
    },

    "hydrate(): element with text child": () => {
        const parent = new FakeElement("p");
        const text = new FakeTextNode("hello");
        parent.appendChild(text);

        expect(hydrate(parent as any))
            .toMatch([P, "hello"]);
    },

    "hydrate(): element with attributes reads them into props": () => {
        const el = new FakeElement("div");
        el.setAttribute("class", "foo");
        el.setAttribute("id", "bar");

        expect(hydrate(el as any))
            .toMatch([DIV, { class: "foo", id: "bar" }]);
    },

    "hydrate(): unknown node type returns undefined": () => {
        const frag = { nodeType: 999 } as any;

        expect(hydrate(frag))
            .toEqual(undefined);
    },

    "hydrate(): empty text node returns undefined": () => {
        const text = new FakeTextNode("   ");

        expect(hydrate(text as any))
            .toEqual(undefined);
    },

    "hydrate(): only element and text nodes are supported": () => {
        const comment = { nodeType: Node.COMMENT_NODE } as any;

        expect(hydrate(comment))
            .toEqual(undefined);
    },

    "hydrate(): prepareForRender returns text node for text input": () => {
        const text = new FakeTextNode("hello");

        const result = hydrate(text as any, true);

        expect(result instanceof FakeTextNode).toEqual(true);
        expect((result as any).nodeValue).toEqual("hello");
    },

    "hydrate(): prepareForRender attaches .node to element vode": () => {
        const el = new FakeElement("div");

        const result = hydrate(el as any, true) as any;

        expect(Array.isArray(result)).toEqual(true);
        expect(result[0]).toEqual("div");
        expect(result.node instanceof FakeElement).toEqual(true);
        expect(result.node.tagName).toEqual("DIV");
    },

    "hydrate(): prepareForRender removes whitespace text nodes": () => {
        const el = new FakeElement("div");
        el.appendChild(new FakeTextNode("   "));
        el.appendChild(new FakeElement("span"));
        el.appendChild(new FakeTextNode("  "));

        expect(el.childNodes.length).toEqual(3);

        const result = hydrate(el as any, true);

        expect(el.childNodes.length).toEqual(1);
        expect((el.childNodes[0] as any).tagName).toEqual("SPAN");
    },
};
