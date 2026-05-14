import { mergeClass } from "../index";
import { expect } from "./helper";

export default {
    "mergeClass(): no args returns null": () => {
        expect(mergeClass()).toEqual(null);
    },

    "mergeClass(): single string returns it": () => {
        expect(mergeClass("foo")).toEqual("foo");
    },

    "mergeClass(): two strings are joined and deduplicated": () => {
        expect(mergeClass("foo", "bar")).toEqual("foo bar");
        expect(mergeClass("foo bar", "bar baz")).toEqual("foo bar baz");
    },

    "mergeClass(): string and array": () => {
        expect(mergeClass("foo", ["bar", "baz"])).toEqual("bar baz foo");
    },

    "mergeClass(): array and string": () => {
        expect(mergeClass(["foo", "bar"], "baz")).toEqual("foo bar baz");
    },

    "mergeClass(): two arrays": () => {
        expect(mergeClass(["foo", "bar"], ["baz", "qux"])).toEqual("foo bar baz qux");
    },

    "mergeClass(): two string arrays with duplicates": () => {
        expect(mergeClass(["foo", "bar"], ["bar", "baz"])).toEqual("foo bar baz");
    },

    "mergeClass(): string and object": () => {
        expect(mergeClass("foo", { bar: true, baz: false })).toEqual({ foo: true, bar: true, baz: false });
    },

    "mergeClass(): object and string": () => {
        expect(mergeClass({ foo: true, bar: false }, "baz")).toEqual({ foo: true, bar: false, baz: true });
    },

    "mergeClass(): two objects": () => {
        expect(mergeClass({ foo: true, bar: true }, { bar: false, baz: true })).toEqual({ foo: true, bar: false, baz: true });
    },

    "mergeClass(): object and array": () => {
        expect(mergeClass({ foo: true }, ["bar", "baz"])).toEqual({ foo: true, 0: "bar", 1: "baz" });
    },

    "mergeClass(): array and object": () => {
        expect(mergeClass(["foo", "bar"], { baz: true, qux: false })).toEqual({ 0: "foo", 1: "bar", baz: true, qux: false });
    },

    "mergeClass(): falsy entries are skipped": () => {
        expect(mergeClass("foo", null, "bar")).toEqual("foo bar");
        expect(mergeClass(null, "foo", undefined, "bar")).toEqual("foo bar");
    },

    "mergeClass(): multiple args (3+)": () => {
        expect(mergeClass("a", "b", "c")).toEqual("a b c");
        expect(mergeClass("x", null, ["y", "z"], "w")).toEqual("y z x w");
    }
};
