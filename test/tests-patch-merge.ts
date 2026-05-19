import { expect } from "./helper";
import { app, createState, DIV } from "../index";

function setup() {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    return container;
}

export default {
    "patch-merge: array property replaces existing array": () => {
        const container = setup();
        const state: any = createState({ items: [1, 2, 3] });
        app(container, state, () => [DIV]);

        state.patch({ items: [4, 5, 6] });

        expect(state.items).toEqual([4, 5, 6]);
    },

    "patch-merge: Date property stores correctly": () => {
        const container = setup();
        const state: any = createState({ date: new Date("2024-01-01") });
        app(container, state, () => [DIV]);

        state.patch({ date: new Date("2025-06-15") });

        expect(state.date instanceof Date).toEqual(true);
        expect(state.date.getFullYear()).toEqual(2025);
        expect(state.date.getMonth()).toEqual(5);
        expect(state.date.getDate()).toEqual(15);
    },

    "patch-merge: object replaces existing array property": () => {
        const container = setup();
        const state: any = createState({ data: [1, 2, 3] });
        app(container, state, () => [DIV]);

        state.patch({ data: { key: "value" } });

        expect(Array.isArray(state.data)).toEqual(false);
        expect(state.data.key).toEqual("value");
    },

    "patch-merge: object replaces existing primitive property": () => {
        const container = setup();
        const state: any = createState({ value: 42 });
        app(container, state, () => [DIV]);

        state.patch({ value: { nested: true } });

        expect(state.value.nested).toEqual(true);
    },

    "patch-merge: new array property via patch": () => {
        const container = setup();
        const state: any = createState({ name: "test" });
        app(container, state, () => [DIV]);

        state.patch({ tags: ["a", "b", "c"] });

        expect(Array.isArray(state.tags)).toEqual(true);
        expect(state.tags).toEqual(["a", "b", "c"]);
    },
};
