const NodeConstants = {
    ELEMENT_NODE: 1,
    // ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    // CDATA_SECTION_NODE: 4,
    // ENTITY_REFERENCE_NODE: 5,
    // ENTITY_NODE: 6,
    // PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    // DOCUMENT_NODE: 9,
    // DOCUMENT_TYPE_NODE: 10,
    // DOCUMENT_FRAGMENT_NODE: 11,
    // NOTATION_NODE: 12,
};

class FakeNodeList implements NodeListOf<ChildNode> {
    [index: number]: ChildNode;
    public readonly data: ChildNode[] = [];

    constructor() {
        let self = this;

        return new Proxy(this, {
            get(target, prop) {
                const key: string = typeof prop === "symbol" ? String(prop) : prop;

                if (<any>Number(key) == key && !(prop in target)) {
                    return self.data[parseInt(key)];
                }
                return target[prop as any];
            },
        });
    }

    item(index: number): ChildNode {
        return this.data[index] ?? null;
    }

    forEach(
        callbackfn: (value: ChildNode, key: number, parent: NodeListOf<ChildNode>) => void,
        thisArg?: any,
    ): void {
        for (let i = 0; i < this.length; i++) {
            callbackfn.bind(thisArg)(this.data[i], i, this);
        }
    }

    entries(): ArrayIterator<[number, ChildNode]> {
        return new Array(this.length)
            .fill(0)
            .map((_, i) => [i, this[i]] as [number, ChildNode])
        [Symbol.iterator]();
    }

    keys(): ArrayIterator<number> {
        return new Array(this.data.length)
            .fill(0)
            .map((_, i) => i)
        [Symbol.iterator]();
    }

    values(): ArrayIterator<ChildNode> {
        return new Array(this.data.length)
            .fill(0)
            .map((_, i) => this[i])
        [Symbol.iterator]();
    }

    [Symbol.iterator](): ArrayIterator<ChildNode> {
        return new Array(this.data.length)
            .fill(0)
            .map((_, i) => this[i])
        [Symbol.iterator]();
    }

    get length() {
        return this.data.length;
    }
}

export class FakeElement {
    public fakeAttributes: Record<string, string> = {};

    nodeType = NodeConstants.ELEMENT_NODE;
    ownerDocument: any = null;
    parentElement: HTMLElement | null = null;
    childNodes: NodeListOf<ChildNode> = new FakeNodeList();
    get children(): HTMLCollection {
        return this.childNodes as unknown as HTMLCollection;
    }
    style: { cssText: string } = { cssText: "" };

    readonly tagName: string;

    constructor(public tag?: string) {
        this.tagName = tag?.toUpperCase() || "???";
    }

    get firstChild() {
        return this.childNodes[0] ?? null;
    }
    get lastChild() {
        return this.childNodes[this.childNodes.length - 1] ?? null;
    }
    get nextSibling() {
        return null;
    }
    get attributes() {
        return Object.entries(this.fakeAttributes).map(([name, value]) => ({ name, value })) as any;
    }

    hasAttributes() {
        return Object.keys(this.fakeAttributes).length > 0;
    }
    hasChildNodes() {
        return this.childNodes.length > 0;
    }
    setAttribute(name: string, value: string) {
        this.fakeAttributes[name] = value;
    }
    removeAttribute(name: string) {
        delete this.fakeAttributes[name];
    }

    appendChild(child: FakeElement | FakeTextNode): FakeElement | FakeTextNode {
        // like the real DOM, appendChild moves: detach from the current parent first
        if (child.parentElement) {
            const i = (child.parentElement.childNodes as FakeNodeList).data.indexOf(child as any);
            if (i >= 0) (child.parentElement.childNodes as FakeNodeList).data.splice(i, 1);
        }
        (this.childNodes as FakeNodeList).data.push(child as any);
        (child as any).parentElement = this;
        return child;
    }
    remove() {
        if (this.parentElement) {
            const i = (this.parentElement.childNodes as FakeNodeList).data.indexOf(this as any);
            if (i >= 0) (this.parentElement.childNodes as FakeNodeList).data.splice(i, 1);
        }
    }
    replaceWith(...nodes: (FakeElement | FakeTextNode)[]) {
        const parent = this.parentElement;
        if (parent) {
            const i = (<FakeNodeList>parent.childNodes).data.indexOf(this as any);
            if (i >= 0) {
                (<FakeNodeList>parent.childNodes).data.splice(i, 1, ...(nodes as any));
            }
            for (const n of nodes) {
                n.parentElement = parent;
            }
        }
    }
    before(...nodes: (FakeElement | FakeTextNode)[]) {
        const parent = this.parentElement;
        if (parent) {
            if ((<FakeNodeList>parent.childNodes).data.indexOf(this as any) < 0) return;
            for (const n of nodes) {
                if (n === this) continue;
                if (n.parentElement) {
                    const ni = (<FakeNodeList>n.parentElement.childNodes).data.indexOf(n as any);
                    if (ni >= 0) (<FakeNodeList>n.parentElement.childNodes).data.splice(ni, 1);
                }
            }
            const filtered = nodes.filter((n) => n !== this);
            // like the real DOM, insert relative to `this` *after* detaching the moved
            // nodes (detaching an earlier sibling shifts this node's index)
            const i = (<FakeNodeList>parent.childNodes).data.indexOf(this as any);
            (<FakeNodeList>parent.childNodes).data.splice(i, 0, ...(filtered as any));
            for (const n of filtered) {
                n.parentElement = parent;
            }
        }
    }
    get [Symbol.iterator]() {
        return Array.prototype[Symbol.iterator].bind(this.children);
    }
}

export class FakeTextNode {
    nodeType = NodeConstants.TEXT_NODE;
    ownerDocument: any = null;
    parentElement: HTMLElement | null = null;
    constructor(public nodeValue: string) { }
    get wholeText() {
        return this.nodeValue;
    }
    remove() {
        if (this.parentElement) {
            const i = (<FakeNodeList>this.parentElement.childNodes).data.indexOf(this as any);
            if (i >= 0) (<FakeNodeList>this.parentElement.childNodes).data.splice(i, 1);
        }
    }
    replaceWith(...nodes: (FakeElement | FakeTextNode)[]) {
        const parent = this.parentElement;
        if (parent) {
            const i = (<FakeNodeList>parent.childNodes).data.indexOf(this as any);
            if (i >= 0) {
                (<FakeNodeList>parent.childNodes).data.splice(i, 1, ...(nodes as any));
            }
            for (const n of nodes) {
                n.parentElement = parent;
            }
        }
    }
    before(...nodes: (FakeElement | FakeTextNode)[]) {
        const parent = this.parentElement;
        if (parent) {
            if ((<FakeNodeList>parent.childNodes).data.indexOf(this as any) < 0) return;
            for (const n of nodes) {
                if (n === this) continue;
                if (n.parentElement) {
                    const ni = (<FakeNodeList>n.parentElement.childNodes).data.indexOf(n as any);
                    if (ni >= 0) (<FakeNodeList>n.parentElement.childNodes).data.splice(ni, 1);
                }
            }
            const filtered = nodes.filter((n) => n !== this);
            // like the real DOM, insert relative to `this` *after* detaching the moved
            // nodes (detaching an earlier sibling shifts this node's index)
            const i = (<FakeNodeList>parent.childNodes).data.indexOf(this as any);
            (<FakeNodeList>parent.childNodes).data.splice(i, 0, ...(filtered as any));
            for (const n of filtered) {
                n.parentElement = parent;
            }
        }
    }
}

export function resetMocks() {
    let hidden = false;
    let rafHandle = 0;
    const rafQueue = new Map<number, FrameRequestCallback>();
    let rafTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleNextFrame() {
        if (rafTimer !== null || hidden || rafQueue.size === 0) {
            return;
        }

        rafTimer = setTimeout(() => {
            rafTimer = null;

            if (hidden || rafQueue.size === 0) {
                scheduleNextFrame();
                return;
            }

            const now = performance.now();
            const callbacks = Array.from(rafQueue.values());
            rafQueue.clear();

            for (const cb of callbacks) {
                try {
                    cb(now);
                } catch (err: any) {
                    if ((globalThis.window as any).continueAfterRequestAnimationFrameError) {
                        (globalThis.window as any).requestAnimationFrameErrors ??= [];
                        (globalThis.window as any).requestAnimationFrameErrors.push(err);
                    } else {
                        throw err;
                    }
                }
            }

            scheduleNextFrame();
        }, 0);
    }

    const fakeDocument: any = {
        createElement: (tag: string) => {
            const el = new FakeElement(tag);
            el.ownerDocument = fakeDocument;
            return el;
        },
        createTextNode: (text: string) => {
            const t = new FakeTextNode(text);
            t.ownerDocument = fakeDocument;
            return t;
        },
        createElementNS: (ns: string, tag: string) => {
            const el = new FakeElement(tag);
            el.ownerDocument = fakeDocument;
            return el;
        },
        startViewTransition: (callbackOptions: any) => {
            return {
                finished: Promise.resolve(),
                ready: Promise.resolve(),
                updateCallbackDone: Promise.resolve(),
                skipTransition() { },
            };
        },
        _fake: true,
    };

    Object.defineProperty(fakeDocument, "hidden", {
        enumerable: true,
        configurable: true,
        get: () => hidden,
        set: (value: boolean) => {
            hidden = !!value;
            if (!hidden) {
                scheduleNextFrame();
            }
        },
    });

    const fakeWindow: any = {
        requestAnimationFrame: (cb: FrameRequestCallback) => {
            const id = ++rafHandle;
            rafQueue.set(id, cb);
            scheduleNextFrame();
            return id;
        },
        cancelAnimationFrame: (id: number) => {
            rafQueue.delete(id);
        },
        _fake: true,
    };
    fakeDocument.defaultView = fakeWindow;

    if ((<typeof fakeDocument>globalThis.document)?._fake) globalThis.document = undefined as any;
    if ((<typeof fakeWindow>globalThis.window)?._fake) globalThis.window = undefined as any;

    globalThis.document ??= fakeDocument as Document;
    globalThis.window ??= fakeWindow as Window & typeof globalThis;
}
