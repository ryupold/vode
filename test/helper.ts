export class Expectation {
    constructor(public readonly what: any) { }

    toBeA(type: "undefined" | "object" | "function" | "bigint" | "boolean" | "number" | "string" | "symbol") {
        if(typeof this.what !== type){
            throw new ExpectationError(this, `[toBeA] expected ${this.what} to be typeof ${type}, but it is a ${typeof this.what} (value: ${this.what})`);
        }
    }

    toEqual(other: any) {
        function deepCompare(a: any, b: any, path: string[]): string[] | null {
            if (typeof a !== typeof b) {
                return path;
            }

            if (typeof a !== "object") {
                return a !== b ? path : null;
            }

            for (const prop of Object.getOwnPropertyNames(a)) {
                const result = deepCompare(a[prop], b[prop], [...path, prop]);
                if (result) {
                    return result;
                }
            }

            return null;
        }

        if (typeof this.what === "object" && typeof other === "object") {
            const unequal = deepCompare(this.what, other, []);
            if (unequal) {
                throw new ExpectationError(this, `[toEqual] expected \n${JSON.stringify(this.what, null, 2)}\n to equal \n${JSON.stringify(other, null, 2)}\n\nThey differ in: ${unequal.join(".")}`);
            }
        }
        else {
            if (this.what !== other) {
                throw new ExpectationError(this, `[toEqual] expected ${this.what} (typeof ${typeof this.what}) to equal ${other} (${typeof other})`);
            }
        }
    }

    toSucceed<Result>(...args: any): Result {
        if (typeof this.what !== "function") {
            throw new ExpectationError(this, `[toSucceed] expected a function but it is a ${typeof this.what}`);
        }
        return this.what(...args);
    }

    toFail(...args: any): Error {
        if (typeof this.what !== "function") {
            throw new ExpectationError(this, `[toFail] expected a function but it is a ${typeof this.what}`);
        }

        let r: any;
        try {
            r = this.what(...args);
        } catch (err: any) {
            return err;
        }
        throw new ExpectationError(this, `[toFail] expected to fail but got a result of type ${typeof r}: ${r}`);
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