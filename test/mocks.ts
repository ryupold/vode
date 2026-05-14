class MockElement {
    nodeType = 1;
    childNodes: any[] = [];
    children: any[] = [];
    parentElement: any = null;
    attributes: any = {};
    style: any = { cssText: "" };
    tagName = "DIV";
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
    appendChild(child: any) { this.childNodes.push(child); this.children.push(child); if (child.parentElement !== undefined) child.parentElement = this; return child; }
    remove() { if (this.parentElement) { const i = this.parentElement.childNodes.indexOf(this); if (i >= 0) this.parentElement.childNodes.splice(i, 1); } }
    replaceWith(...nodes: any[]) {
        const parent = this.parentElement;
        if (parent) {
            const i = parent.childNodes.indexOf(this);
            if (i >= 0) { parent.childNodes.splice(i, 1, ...nodes); }
            for (const n of nodes) n.parentElement = parent;
        }
    }
    before(...nodes: any[]) {
        const parent = this.parentElement;
        if (parent) {
            const i = parent.childNodes.indexOf(this);
            if (i >= 0) { parent.childNodes.splice(i, 0, ...nodes); }
            for (const n of nodes) n.parentElement = parent;
        }
    }
    get [Symbol.iterator]() { return Array.prototype[Symbol.iterator].bind(this.children); }
}

class MockText {
    nodeType = 3;
    parentElement: any = null;
    constructor(public nodeValue: string) { }
    get wholeText() { return this.nodeValue; }
    remove() { if (this.parentElement) { const i = this.parentElement.childNodes.indexOf(this); if (i >= 0) this.parentElement.childNodes.splice(i, 1); } }
    replaceWith(...nodes: any[]) {
        const parent = this.parentElement;
        if (parent) {
            const i = parent.childNodes.indexOf(this);
            if (i >= 0) { parent.childNodes.splice(i, 1, ...nodes); }
            for (const n of nodes) n.parentElement = parent;
        }
    }
    before(...nodes: any[]) {
        const parent = this.parentElement;
        if (parent) {
            const i = parent.childNodes.indexOf(this);
            if (i >= 0) { parent.childNodes.splice(i, 0, ...nodes); }
            for (const n of nodes) n.parentElement = parent;
        }
    }
}

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
            skipTransition() {},
        };
    }
};
const NodeConstants = { ELEMENT_NODE: 1, TEXT_NODE: 3, COMMENT_NODE: 8 };

globalThis.document ??= mockDoc as any;
globalThis.window ??= mockWin as any;
globalThis.Node ??= NodeConstants as any;
