const NodeConstants = {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12,
};

export class MockElement {
    nodeType = NodeConstants.ELEMENT_NODE;
    childNodes: (MockElement | MockText)[] = [];
    children: (MockElement | MockText)[] = [];
    parentElement: MockElement | null = null;
    attributes: object = {};
    style: { cssText: string } = { cssText: "" };
    tagName = "UNKNOWN";
    private _attrs: Record<string, string> = {};

    constructor(public tag?: string) {
        if (tag) this.tagName = tag.toUpperCase();
    }

    get firstChild() { return this.childNodes[0] ?? null; }
    get lastChild() { return this.childNodes[this.childNodes.length - 1] ?? null; }
    get nextSibling() { return null; }

    hasAttributes() { return Object.keys(this._attrs).length > 0; }
    hasChildNodes() { return this.childNodes.length > 0; }
    setAttribute(name: string, value: string) { this._attrs[name] = value; }
    removeAttribute(name: string) { delete this._attrs[name]; }
    appendChild(child: MockElement | MockText) {
        this.childNodes.push(child); this.children.push(child); if (child.parentElement !== undefined) child.parentElement = this; return child;
    }
    remove() {
        if (this.parentElement) { const i = this.parentElement.childNodes.indexOf(this); if (i >= 0) this.parentElement.childNodes.splice(i, 1); }
    }
    replaceWith(...nodes: (MockElement | MockText)[]) {
        const parent = this.parentElement;
        if (parent) {
            const i = parent.childNodes.indexOf(this);
            if (i >= 0) { parent.childNodes.splice(i, 1, ...nodes); }
            for (const n of nodes) n.parentElement = parent;
        }
    }
    before(...nodes: (MockElement | MockText)[]) {
        const parent = this.parentElement;
        if (parent) {
            const i = parent.childNodes.indexOf(this);
            if (i >= 0) { parent.childNodes.splice(i, 0, ...nodes); }
            for (const n of nodes) n.parentElement = parent;
        }
    }
    get [Symbol.iterator]() { return Array.prototype[Symbol.iterator].bind(this.children); }
}

export class MockText {
    nodeType = NodeConstants.TEXT_NODE;
    parentElement: MockElement | null = null;
    constructor(public nodeValue: string) { }
    get wholeText() { return this.nodeValue; }
    remove() { if (this.parentElement) { const i = this.parentElement.childNodes.indexOf(this); if (i >= 0) this.parentElement.childNodes.splice(i, 1); } }
    replaceWith(...nodes: (MockElement | MockText)[]) {
        const parent = this.parentElement;
        if (parent) {
            const i = parent.childNodes.indexOf(this);
            if (i >= 0) { parent.childNodes.splice(i, 1, ...nodes); }
            for (const n of nodes) n.parentElement = parent;
        }
    }
    before(...nodes: (MockElement | MockText)[]) {
        const parent = this.parentElement;
        if (parent) {
            const i = parent.childNodes.indexOf(this);
            if (i >= 0) { parent.childNodes.splice(i, 0, ...nodes); }
            for (const n of nodes) n.parentElement = parent;
        }
    }
}

export function resetMocks() {
    const mockDoc: any = {
        createElement: (tag: string) => new MockElement(tag),
        createTextNode: (text: string) => new MockText(text),
        createElementNS: (ns: string, tag: string) => new MockElement(tag),
        hidden: false,
    };
    const mockWin: any = {
        requestAnimationFrame: (cb: any) => cb(Date.now()),
        startViewTransition: (callbackOptions: any) => {
            return {
                finished: Promise.resolve(),
                ready: Promise.resolve(),
                updateCallbackDone: Promise.resolve(),
                skipTransition() { },
            };
        }
    };

    globalThis.document ??= mockDoc as Document;
    globalThis.window ??= mockWin as (Window & typeof globalThis);
    globalThis.Node ??= NodeConstants as any;
}