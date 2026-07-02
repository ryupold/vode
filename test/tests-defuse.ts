import { expect } from "./helper";
import { app, DIV, defuse, $VODE, $NODE } from "../index";

export default {
    "defuse(): on a container without $VODE is a no-op": () => {
        const container = document.createElement("div");

        expect(() => defuse(container as any)).toSucceed();
    },

    "defuse(): removes $VODE from container": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        app(container, {}, () => [DIV]);
        await expect(typeof (container as any)[$VODE]).toEqual("object");
        defuse(container as any);

        await expect((container as any)[$VODE]).toEqual(undefined);
    },

    "defuse(): removes patch function from state": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        const state: any = {};
        app(container, state, () => [DIV]);
        await expect(typeof state.patch).toEqual("function");
        defuse(container as any);

        await expect(state.patch).toEqual(undefined);
    },

    "defuse(): disables renderSync and renderAsync": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        app(container, {}, () => [DIV]);
        defuse(container as any);

        await expect((container as any)[$VODE]).toEqual(undefined);
    },

    "defuse(): clears event listeners from rendered elements": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        app(container, {}, () => [DIV, { onclick: () => ({}) }] as any);
        const node = (container as any)[$VODE].vode[$NODE];
        await expect(typeof node.onclick).toEqual("function");
        defuse(container as any);

        await expect(node.onclick).toEqual(null);
    },

    "defuse(): recurses into child containers": async () => {
        const root = document.createElement("div");
        const outer = document.createElement("div");
        const inner = document.createElement("div");
        root.appendChild(outer);
        outer.appendChild(inner);
        const state: any = {};
        app(inner, state, () => [DIV]);
        defuse(outer as any);

        await expect(state.patch).toEqual(undefined);
    },

    "defuse(): clears event listeners from child vodes without $VODE": async () => {
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        app(container, {}, () => [DIV, { onclick: () => ({}) }, [DIV, { onclick: () => ({}) }]] as any);
        const v = (container as any)[$VODE].vode;
        const child1 = (v as any)[$NODE];
        const child1onclick = child1.onclick;
        const child2 = (v as any)[2][$NODE];
        await expect(typeof child1onclick).toEqual("function");
        await expect(typeof child2.onclick).toEqual("function");
        defuse(container as any);

        await expect(child1.onclick).toEqual(null);
        await expect(child2.onclick).toEqual(null);
    },
};
