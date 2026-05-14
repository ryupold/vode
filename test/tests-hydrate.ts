import { expect } from "./helper";
import { hydrate, DIV, SPAN, P } from "../index";
import { MockElement, MockText } from "./mocks";

export default {
    "hydrate(): text node returns its text content": () => {
        const text = new MockText("hello world");

        expect(hydrate(text as any))
            .toMatch("hello world");
    },

    "hydrate(): empty element returns a vode": () => {
        const el = new MockElement("div");
        const result = hydrate(el as any);

        expect(result)
            .toMatch([DIV]);
    },

    "hydrate(): element with children returns full vode tree": () => {
        const parent = new MockElement("div");
        const child = new MockElement("span");
        parent.appendChild(child);

        expect(hydrate(parent as any))
            .toMatch([DIV, [SPAN]]);
    },

    "hydrate(): element with text child": () => {
        const parent = new MockElement("p");
        const text = new MockText("hello");
        parent.appendChild(text);

        expect(hydrate(parent as any))
            .toMatch([P, "hello"]);
    },

    "hydrate(): element with attributes reads them into props": () => {
        const el = new MockElement("div");
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
        const text = new MockText("   ");

        expect(hydrate(text as any))
            .toEqual(undefined);
    },

    "hydrate(): only element and text nodes are supported": () => {
        const comment = { nodeType: Node.COMMENT_NODE } as any;

        expect(hydrate(comment))
            .toEqual(undefined);
    },
};
