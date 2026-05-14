import { createPatch } from "../src/vode";
import { expect } from "./helper";

export default {
    "createPatch(): just returns the input": () => {
        const p = { a: 123 };
        expect(createPatch(p) === p).toEqual(true);
    }
};