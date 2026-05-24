import { delay, expect } from "./helper";
import { app, ContainerNode, createState, DIV } from "../index";

function setup() {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    return container as unknown as ContainerNode;
}

export default {
    "patch(): generator function yields multiple state updates": async () => {
        const container = setup();
        const state: any = createState({ count: 0 });
        app(container, state, (s: any) => [DIV, String(s.count)]);

        await expect(state.count).toEqual(0);

        state.patch(function* () {
            yield { count: 1 };
            yield { count: 2 };
            return { count: 3 };
        });

        await new Promise(r => setTimeout(r, 0));

        await expect(state.count).toEqual(3);
        await expect(container).toMatch([DIV, "3"]);
    },

    "patch(): async generator yields over time": async () => {
        const container = setup();
        const state: any = createState({ phase: "start", value: 0 });
        app(container, state, (s: any) => [DIV, s.phase, String(s.value)]);

        await expect(state.phase).toEqual("start");

        state.patch(async function* () {
            await expect(container._vode.stats.syncRenderPatchCount).toEqual(0);
            yield { phase: "working", value: 10 };
            await expect(container._vode.stats.syncRenderPatchCount).toEqual(1);
            yield { phase: "almost", value: 20 };
            await expect(container._vode.stats.syncRenderPatchCount).toEqual(2);
            return { phase: "done", value: 30 };
        }());

        await new Promise(r => setTimeout(r, 0));

        await expect(state.phase).toEqual("done");
        await expect(state.value).toEqual(30);
        await expect(container).toMatch([DIV, "done", "30"]);
    },

    "patch(): Promise resolves and applies patch": async () => {
        const container = setup();
        const state: any = createState({ msg: "before" });
        app(container, state, (s: any) => [DIV, s.msg]);

        state.patch(Promise.resolve({ msg: "after" }));

        await delay(10);

        await expect(state.msg).toEqual("after");
        await expect(container).toMatch([DIV, "after"]);
    },

    "patch(): array with empty patches applies nothing": async () => {
        const container = setup();
        const state: any = createState({ x: 1, y: 2 });
        app(container, state, (s: any) => [DIV]);

        state.patch([{}, {}]);
        await expect(state.x).toEqual(1);
        await expect(state.y).toEqual(2);
    },

    "patch(): array with null/undefined items skips them": async () => {
        const container = setup();
        const state: any = createState({ x: 0, y: 0 });
        app(container, state, (s: any) => [DIV, String(s.x), String(s.y)]);

        state.patch([null, { x: 10 }, undefined, { y: 20 }]);

        await delay(10);

        await expect(state.x).toEqual(10);
        await expect(state.y).toEqual(20);
    },
};
