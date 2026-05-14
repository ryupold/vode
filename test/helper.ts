import { children, ChildVode, PatchableState, tag, Vode } from "../src/vode";
import { MockElement, MockText } from "./mocks";

export class Expectation {
    constructor(public readonly what: any) { }

    toBeA(type: "undefined" | "object" | "function" | "bigint" | "boolean" | "number" | "string" | "symbol") {
        if (typeof this.what !== type) {
            throw new ExpectationError(this, `expected \n\ntypeof ${this.what}\n\nto be \n\n${type}`);
        }
    }

    toEqual(other: any) {
        function deepCompare(a: any, b: any, path: string[]): string[] | null {
            if (typeof a !== typeof b) {
                if (path.length === 0) path.push(``);
                path[path.length - 1] += ` (type: ${typeof a} != ${typeof b})`;
                return path;
            }

            if (typeof a !== "object") {
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

        if (typeof this.what === "object" && typeof other === "object") {
            const unequal = deepCompare(this.what, other, []);
            if (unequal) {
                throw new ExpectationError(this, `expected \n\n${JSON.stringify(this.what, null, 2)}\n\n to equal \n\n${JSON.stringify(other, null, 2)}\n\nThey differ in: ${unequal.join(".")}`);
            }
        }
        else {
            if (this.what !== other) {
                throw new ExpectationError(this, `expected (${typeof this.what})\n\n${this.what}\n\nto equal (${typeof other})\n\n${other}`);
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

    toMatch(v: Vode, state?: PatchableState) {
        if (this.what instanceof MockElement || this.what instanceof MockText) {
            const that = this;
            function deepCompare(e: MockElement | MockText, cv: ChildVode, path: string[]): string[] | null {

                // unwrap component
                while (typeof cv === "function") {
                    if (!state) {
                        throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na Component\n\nbut got no state passed in [toMatch]`);
                    }
                    cv = cv(state);
                }

                if (typeof cv === "string" && e instanceof MockText) {
                    if (cv !== e.wholeText) {
                        throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na text node with\n${cv}\n\nbut text was\n${e.wholeText}`);
                    }
                }

                else if (Array.isArray(cv) && e instanceof MockElement) {
                    if (tag(cv)?.toLocaleUpperCase() !== e.tagName.toUpperCase()) {
                        throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\nan element <${tag(cv)}>\n\nbut got <${e.tagName}>`);
                    }
                    const kids = children(cv) || [];
                    for (let i = 0; i < kids.length; i++) {
                        deepCompare(e.children[i], kids[i], [...path, `${tag(kids[i] as Vode) || "#text"}`]);
                    }
                    if (kids.length !== e.children.length) {
                        throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\n${kids.length} children\n\nbut <${e.tagName}> has ${e.children.length} children`);
                    }
                }

                else if (typeof cv === "string" && e instanceof MockElement) {
                    throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\na text node\n\nbut got <${e.tagName}>`);
                }

                else if (Array.isArray(cv) && e instanceof MockText) {
                    throw new ExpectationError(that, `expected at\n${path.join(" > ")}\n\nan element <${tag(cv)}>\n\nbut got #text [${e.wholeText}]`);
                }

                return null;
            }

            deepCompare(this.what, v, [tag(v) || "#text"]);
        } else {
            throw new ExpectationError(this, `expected an element or text node\n\nbut it is a ${typeof this.what}\n${this.what}`);
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