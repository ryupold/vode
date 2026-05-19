import { children, ChildVode, PatchableState, props, tag, Vode } from "../src/vode";
import { FakeElement, FakeTextNode } from "./mocks";

export class Expectation {
    constructor(public readonly what: any) { }

    toBeA(type: "undefined" | "object" | "function" | "bigint" | "boolean" | "number" | "string" | "symbol", failMessage?: string) {
        if (typeof this.what !== type) {
            throw new ExpectationError(this, `expected \n\ntypeof ${this.what}\n\nto be \n\n${type}${failMessage ? `\n\n${failMessage}` : ""}`);
        }
    }

    toEqual(other: any, failMessage?: string) {
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

    toMatch(v: ChildVode, state?: PatchableState | null, failMessage?: string) {
        const failSuffix = failMessage ? `\n\n${failMessage}` : "";

        if (this.what instanceof FakeElement || this.what instanceof FakeTextNode || typeof this.what === "string" || Array.isArray(this.what) || typeof this.what === "function") {
            const that = this;

            function deepCompare(e: FakeElement | FakeTextNode | ChildVode, cv: ChildVode, path: string[]): string[] | null {

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

                // string matches TextNode
                if (typeof cv === "string" && e instanceof FakeTextNode) {
                    if (cv !== e.wholeText) {
                        throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na text node with\n${cv}\n\nbut text was\n${e.wholeText}${failSuffix}`);
                    }
                }
                // string matches string
                else if (typeof cv === "string" && typeof e === "string") {
                    if (cv !== e) {
                        throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na text node with\n${cv}\n\nbut text was\n${e}${failSuffix}`);
                    }
                }

                // vode matches element
                else if (Array.isArray(cv) && e instanceof FakeElement) {
                    if (tag(cv)?.toUpperCase() !== e.tagName.toUpperCase()) {
                        throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\nan element <${tag(cv)?.toUpperCase()}>\n\nbut got <${e.tagName.toUpperCase()}>${failSuffix}`);
                    }

                    // compare attributes/props
                    const properties = props(cv);
                    if (properties) {
                        for (const [k, v] of Object.entries(properties)) {
                            const attributeValue = e.fakeAttributes[k];
                            if (!attributeValue) {
                                throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\nan element <${tag(cv)?.toUpperCase()}>\n\nwith attribute [${k}="${v}"]\n\nbut it was not found${failSuffix}`);
                            }
                            if (attributeValue !== v) {
                                throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\nan element <${tag(cv)?.toUpperCase()}>\n\nwith attribute [${k}="${v}"]\n\nbut it was [${k}="${attributeValue}"]${failSuffix}`);
                            }
                        }
                    }

                    // compare children
                    const kids = children(cv) || [];
                    for (let i = 0; i < kids.length; i++) {
                        deepCompare(e.children.item(i) as any, kids[i], [...path, `[${i}]${tag(kids[i] as Vode)?.toUpperCase() || "#text"}`]);
                    }
                    if (kids.length !== e.children.length) {
                        throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\n${kids.length} children\n\nbut <${e.tagName.toUpperCase()}> has ${e.children.length} children${failSuffix}`);
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
                        for (const [k, v] of Object.entries(properties)) {
                            const attributeValue = otherProperties[k];
                            if (!attributeValue) {
                                throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na vode [${tag(cv)?.toUpperCase()}]\n\nwith attribute [${k}="${v}"]\n\nbut it was not found${failSuffix}`);
                            }
                            if (attributeValue !== v) {
                                throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na vode [${tag(cv)?.toUpperCase()}]\n\nwith attribute [${k}="${v}"]\n\nbut its value was [${k}="${attributeValue}"]${failSuffix}`);
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

                // mismatch between text and element
                else if (typeof cv === "string" && e instanceof FakeElement) {
                    throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na text node\n\nbut got <${e.tagName.toUpperCase()}>${failSuffix}`);
                }
                // mismatch between text and vode
                else if (typeof cv === "string" && Array.isArray(e)) {
                    throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na text node\n\nbut got [${tag(e)?.toUpperCase()}]${failSuffix}`);
                }

                // mismatch between vode and text node
                else if (Array.isArray(cv) && e instanceof FakeTextNode) {
                    throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\nan element <${tag(cv)?.toUpperCase()}>\n\nbut got #text (${e.wholeText})${failSuffix}`);
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