import { children, ChildVode, PatchableState, props, tag, Vode } from "../src/vode";
import { FakeElement, FakeTextNode } from "./mocks";

// Helper to detect if we're in a browser environment with real DOM
const isBrowser = typeof window !== 'undefined' && typeof HTMLElement !== 'undefined';

// Type guards for real DOM elements
function isRealElement(node: any): node is HTMLElement {
    return isBrowser && node instanceof HTMLElement;
}
function isRealTextNode(node: any): node is Text {
    return isBrowser && node instanceof Text;
}

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class Expectation {
    constructor(public readonly what: any) { }

    toBeA(type: "undefined" | "object" | "function" | "bigint" | "boolean" | "number" | "string" | "symbol", failMessage?: string) {
        if (typeof this.what !== type) {
            throw new ExpectationError(this, `expected \n\ntypeof ${this.what}\n\nto be \n\n${type}${failMessage ? `\n\n${failMessage}` : ""}`);
        }
    }

    async toEqual(other: any, failMessage?: string, waitTimeMs: number = 1000) {
        await delay(0);
        let lastErr: any;
        const start = performance.now();
        while (start + waitTimeMs > performance.now()) {
            try {
                const failSuffix = failMessage ? `\n\n${failMessage}` : "";

                function deepCompare(a: any, b: any, path: string[]): string[] | null {
                    if (typeof a !== typeof b) {
                        if (path.length === 0) path.push(``);
                        path[path.length - 1] += ` (type: ${typeof a} != ${typeof b})`;
                        return path;
                    }

                    if (typeof a !== "object" || a === null) {
                        if (path.length === 0) path.push(``);
                        path[path.length - 1] += ` (value: ${a} != ${b})`;
                        return a !== b ? path : null;
                    }

                    for (const prop of Object.entries(a)) {
                        const [k, v] = prop;
                        const result = deepCompare(v, b[k], [...path, k]);
                        if (result) {
                            return result;
                        }
                    }

                    for (const prop of Object.entries(b)) {
                        const [k, v] = prop;
                        const result = deepCompare(a[k], v, [...path, k]);
                        if (result) {
                            return result;
                        }
                    }

                    return null;
                }

                if (typeof this.what === "object" && typeof other === "object" && this.what !== null && other !== null) {
                    const unequal = deepCompare(this.what, other, []);
                    if (unequal) {
                        throw new ExpectationError(this, `expected \n\n${JSON.stringify(this.what, null, 2)}\n\n to equal \n\n${JSON.stringify(other, null, 2)}\n\nThey differ in: ${unequal.join(".")}${failSuffix}`);
                    }
                }
                else {
                    if (this.what !== other) {
                        throw new ExpectationError(this, `expected (${typeof this.what})\n\n${this.what}\n\nto equal (${typeof other})\n\n${other}${failSuffix}`);
                    }
                }

                return;
            } catch (err) {
                lastErr = err;
                await delay(10);
            }
        }

        if (lastErr) {
            throw lastErr;
        }
    }

    toSucceed<Result>(...args: any): Result {
        if (typeof this.what !== "function") {
            throw new ExpectationError(this, `expected a function\n\nbut it is a ${typeof this.what}`);
        }
        return this.what(...args);
    }

    toFail(...args: any): Error {
        if (typeof this.what !== "function") {
            throw new ExpectationError(this, `expected a function\n\nbut it is a ${typeof this.what}`);
        }

        let r: any;
        try {
            r = this.what(...args);
        } catch (err: any) {
            return err;
        }
        throw new ExpectationError(this, `expected function to fail\n\nbut it succeeded with a result of type ${typeof r}\n\n${r}`);
    }

    async toMatch(v: ChildVode,
        state?: PatchableState | null,
        failMessage?: string,
        waitTimeMs: number = 1000
    ) {
        const start = performance.now();
        let lastErr: any;
        while (start + waitTimeMs > performance.now()) {
            try {
                const failSuffix = failMessage ? `\n\n${failMessage}` : "";

                // Support FakeElement, FakeTextNode, real HTMLElement, real Text nodes, strings, arrays, functions
                if (this.what instanceof FakeElement || this.what instanceof FakeTextNode ||
                    isRealElement(this.what) || isRealTextNode(this.what) ||
                    typeof this.what === "string" || Array.isArray(this.what) || typeof this.what === "function") {
                    const that = this;

                    function deepCompare(e: FakeElement | FakeTextNode | HTMLElement | Text | ChildVode, cv: ChildVode, path: string[]): string[] | null {

                        // unwrap component
                        while (typeof cv === "function") {
                            if (!state) {
                                throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na Component\n\nbut got no state passed in [toMatch]${failSuffix}`);
                            }
                            cv = cv(state);
                        }
                        while (typeof e === "function") {
                            if (!state) {
                                throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na Component\n\nbut got no state passed in [toMatch]${failSuffix}`);
                            }
                            e = e(state);
                        }

                        // string matches TextNode (fake or real)
                        if (typeof cv === "string" && (e instanceof FakeTextNode || isRealTextNode(e))) {
                            const text = e instanceof FakeTextNode ? e.wholeText : (e as Text).wholeText;
                            if (cv !== text) {
                                throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na text node with\n${cv}\n\nbut text was\n${text}${failSuffix}`);
                            }
                        }
                        // string matches string
                        else if (typeof cv === "string" && typeof e === "string") {
                            if (cv !== e) {
                                throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na text node with\n${cv}\n\nbut text was\n${e}${failSuffix}`);
                            }
                        }

                        // vode matches element (fake or real)
                        else if (Array.isArray(cv) && (e instanceof FakeElement || isRealElement(e))) {
                            const tagName = e instanceof FakeElement ? e.tagName : (e as HTMLElement).tagName;
                            if (tag(cv)?.toUpperCase() !== tagName.toUpperCase()) {
                                throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\nan element <${tag(cv)?.toUpperCase()}>\n\nbut got <${tagName.toUpperCase()}>${failSuffix}`);
                            }

                            // compare attributes/props
                            const properties = props(cv);
                            if (properties) {
                                for (const [k, val] of Object.entries(properties)) {
                                    let attributeValue: string | null;
                                    if (e instanceof FakeElement) {
                                        attributeValue = e.fakeAttributes[k] ?? null;
                                    } else {
                                        attributeValue = (e as HTMLElement).getAttribute(k);
                                    }
                                    if (!attributeValue) {
                                        throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\nan element <${tag(cv)?.toUpperCase()}>\n\nwith attribute [${k}="${val}"]\n\nbut it was not found${failSuffix}`);
                                    }
                                    if (attributeValue !== val) {
                                        throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\nan element <${tag(cv)?.toUpperCase()}>\n\nwith attribute [${k}="${val}"]\n\nbut it was [${k}="${attributeValue}"]${failSuffix}`);
                                    }
                                }
                            }

                            // compare children - handle browser text node normalization
                            const kids = children(cv) || [];
                            const childNodes = e instanceof FakeElement ? e.children : (e as HTMLElement).childNodes;

                            // Check if all kids are text (strings) - browsers may merge these
                            const allKidsAreText = kids.every(k => typeof k === "string");
                            if (allKidsAreText && isBrowser && kids.length > 1) {
                                // Browser likely merged text nodes - compare concatenated text
                                const expectedText = kids.join("");
                                const actualText = (e as HTMLElement).textContent || "";
                                if (expectedText !== actualText) {
                                    throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\ntext content "${expectedText}"\n\nbut got "${actualText}"${failSuffix}`);
                                }
                            } else {
                                // Normal child-by-child comparison
                                for (let i = 0; i < kids.length; i++) {
                                    const childNode = e instanceof FakeElement
                                        ? childNodes.item(i) as any
                                        : childNodes.item(i) as any;
                                    deepCompare(childNode, kids[i], [...path, `[${i}]${tag(kids[i] as Vode)?.toUpperCase() || "#text"}`]);
                                }
                                const childCount = e instanceof FakeElement ? e.children.length : (e as HTMLElement).childNodes.length;
                                if (kids.length !== childCount) {
                                    throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\n${kids.length} children\n\nbut <${tagName.toUpperCase()}> has ${childCount} children${failSuffix}`);
                                }
                            }
                        }
                        // vode matches vode
                        else if (Array.isArray(cv) && Array.isArray(e)) {
                            if (tag(cv)?.toUpperCase() !== tag(e)?.toUpperCase()) {
                                throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na vode [${tag(cv)?.toUpperCase()}]\n\nbut got [${tag(e)?.toUpperCase()}]${failSuffix}`);
                            }

                            // compare attributes/props
                            const properties = props(cv);
                            const otherProperties = props(e) || {};
                            if (properties) {
                                for (const [k, val] of Object.entries(properties)) {
                                    const attributeValue = otherProperties[k];
                                    if (!attributeValue) {
                                        throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na vode [${tag(cv)?.toUpperCase()}]\n\nwith attribute [${k}="${val}"]\n\nbut it was not found${failSuffix}`);
                                    }
                                    if (attributeValue !== val) {
                                        throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na vode [${tag(cv)?.toUpperCase()}]\n\nwith attribute [${k}="${val}"]\n\nbut its value was [${k}="${attributeValue}"]${failSuffix}`);
                                    }
                                }
                            }

                            // compare children
                            const kids = children(cv) || [];
                            const otherKids = children(e) || [];
                            for (let i = 0; i < kids.length; i++) {
                                deepCompare(otherKids[i], kids[i], [...path, `[${i}]${tag(kids[i] as Vode)?.toUpperCase() || "#text"}`]);
                            }
                            if (kids.length !== otherKids.length) {
                                throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\n${kids.length} children\n\nbut [${tag(e)?.toUpperCase()}] has ${otherKids.length} children${failSuffix}`);
                            }
                        }

                        // mismatch between text and element (fake or real)
                        else if (typeof cv === "string" && (e instanceof FakeElement || isRealElement(e))) {
                            const tagName = e instanceof FakeElement ? e.tagName : (e as HTMLElement).tagName;
                            throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na text node\n\nbut got <${tagName.toUpperCase()}>${failSuffix}`);
                        }
                        // mismatch between text and vode
                        else if (typeof cv === "string" && Array.isArray(e)) {
                            throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na text node\n\nbut got [${tag(e)?.toUpperCase()}]${failSuffix}`);
                        }

                        // mismatch between vode and text node (fake or real)
                        else if (Array.isArray(cv) && (e instanceof FakeTextNode || isRealTextNode(e))) {
                            const text = e instanceof FakeTextNode ? e.wholeText : (e as Text).wholeText;
                            throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\nan element <${tag(cv)?.toUpperCase()}>\n\nbut got #text (${text})${failSuffix}`);
                        }
                        // mismatch between vode and text
                        else if (Array.isArray(cv) && typeof e === "string") {
                            throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\nan element <${tag(cv)?.toUpperCase()}>\n\nbut got #text (${e})${failSuffix}`);
                        }

                        return null;
                    }

                    deepCompare(this.what, v, [`${tag(v as Vode)?.toUpperCase() || "#text"}`]);
                } else {
                    throw new ExpectationError(this, `expected an element or text node\n\nbut it is a ${typeof this.what}\n${this.what}${failSuffix}`);
                }
                return;
            } catch (err) {
                lastErr = err;
                await delay(10);
            }
        }

        if (lastErr) {
            throw lastErr;
        }
    }
};

export class ExpectationError extends Error {
    constructor(public readonly expectation: Expectation, message?: string) {
        super(message)
    }
}

export function expect(what: any) {
    return new Expectation(what);
}