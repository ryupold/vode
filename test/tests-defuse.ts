import { expect } from "./helper";
import { app, DIV, defuse } from "../index";

export default {
    "defuse(): on a container without _vode is a no-op": () => {
        const container = document.createElement("div");

        expect(() => defuse(container as any))
            .toSucceed();
    },

    "defuse(): removes _vode from container": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        app(container, {}, () => [DIV]);
        expect(typeof (container as any)._vode).toEqual("object");
        defuse(container as any);

        expect((container as any)._vode)
            .toEqual(undefined);
    },

    "defuse(): removes patch function from state": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        const state: any = {};
        app(container, state, () => [DIV]);
        expect(typeof state.patch).toEqual("function");
        defuse(container as any);

        expect(state.patch)
            .toEqual(undefined);
    },

    "defuse(): disables renderSync and renderAsync": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        app(container, {}, () => [DIV]);
        defuse(container as any);

        expect((container as any)._vode)
            .toEqual(undefined);
    },

    "defuse(): clears event listeners from rendered elements": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        app(container, {}, () => [DIV, { onclick: () => ({}) }] as any);
        const node = (container as any)._vode.vode.node;
        expect(typeof node.onclick).toEqual("function");
        defuse(container as any);

        expect(node.onclick)
            .toEqual(null);
    },

    "defuse(): recurses into child containers": () => {
        const root = document.createElement("div");
        const outer = document.createElement("div");
        const inner = document.createElement("div");
        root.appendChild(outer);
        outer.appendChild(inner);
        const state: any = {};
        app(inner, state, () => [DIV]);
        defuse(outer as any);

        expect(state.patch)
            .toEqual(undefined);
    },

    "defuse(): clears event listeners from child vodes without _vode": () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        app(container, {}, () => [DIV, { onclick: () => ({}) },
            [DIV, { onclick: () => ({}) }]
        ] as any);
        const v = (container as any)._vode.vode;
        const child1 = (v as any).node;
        const child1onclick = child1.onclick;
        const child2 = (v as any)[2].node;
        expect(typeof child1onclick).toEqual("function");
        expect(typeof child2.onclick).toEqual("function");
        defuse(container as any);

        expect(child1.onclick)
            .toEqual(null);
        expect(child2.onclick)
            .toEqual(null);
    },
};
