import { mergeClass } from "../index";
import { expect } from "./helper";

export default {
    "mergeClass(): no args returns null": async () => {
        await expect(mergeClass()).toEqual(null);
    },

    "mergeClass(): single string returns it": async () => {
        await expect(mergeClass("foo")).toEqual("foo");
    },

    "mergeClass(): two strings are joined and deduplicated": async () => {
        await expect(mergeClass("foo", "bar")).toEqual("foo bar");
        await expect(mergeClass("foo bar", "bar baz")).toEqual("foo bar baz");
    },

    "mergeClass(): string and array": async () => {
        await expect(mergeClass("foo", ["bar", "baz"])).toEqual("bar baz foo");
    },

    "mergeClass(): array and string": async () => {
        await expect(mergeClass(["foo", "bar"], "baz")).toEqual("foo bar baz");
    },

    "mergeClass(): two arrays": async () => {
        await expect(mergeClass(["foo", "bar"], ["baz", "qux"])).toEqual("foo bar baz qux");
    },

    "mergeClass(): two string arrays with duplicates": async () => {
        await expect(mergeClass(["foo", "bar"], ["bar", "baz"])).toEqual("foo bar baz");
    },

    "mergeClass(): string and object": async () => {
        await expect(mergeClass("foo", { bar: true, baz: false })).toEqual({ foo: true, bar: true, baz: false });
    },

    "mergeClass(): object and string": async () => {
        await expect(mergeClass({ foo: true, bar: false }, "baz")).toEqual({ foo: true, bar: false, baz: true });
    },

    "mergeClass(): two objects": async () => {
        await expect(mergeClass({ foo: true, bar: true }, { bar: false, baz: true })).toEqual({ foo: true, bar: false, baz: true });
    },

    "mergeClass(): object and array (array items become class names with true)": async () => {
        await expect(mergeClass({ foo: true }, ["bar", "baz"])).toEqual({ foo: true, bar: true, baz: true });
        await expect(mergeClass({ active: true }, ["btn", "primary"])).toEqual({ active: true, btn: true, primary: true });
    },

    "mergeClass(): array and object (object keys become class names)": async () => {
        await expect(mergeClass(["foo", "bar"], { baz: true, qux: false })).toEqual({ foo: true, bar: true, baz: true, qux: false });
        await expect(mergeClass(["a", "b"], { c: true, d: false })).toEqual({ a: true, b: true, c: true, d: false });
    },

    "mergeClass(): falsy entries are skipped": async () => {
        await expect(mergeClass("foo", null, "bar")).toEqual("foo bar");
        await expect(mergeClass(null, "foo", undefined, "bar")).toEqual("foo bar");
    },

    "mergeClass(): multiple args (3+)": async () => {
        await expect(mergeClass("a", "b", "c")).toEqual("a b c");
        await expect(mergeClass("x", null, ["y", "z"], "w")).toEqual("y z x w");
    },

    "mergeClass(): incompatible types throw": async () => {
        await expect(() => (mergeClass as any)(123 as any, "foo")).toFail();
        await expect(() => (mergeClass as any)("foo", 456 as any)).toFail();
    }
};
