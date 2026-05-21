import { expect } from "./helper";
import { createState, app, DIV } from "../index";

export default {
    "createState(): throws when state is not an object": async () => {
        const err = expect(() => createState(null as any)).toFail();
        await expect(err.message)
            .toEqual("createState() must be called with a state object");
    },

    "createState(): adds patch function to state": async () => {
        const state = createState({ x: 1 });
        await expect(typeof (state as any).patch).toEqual("function");
        await expect((state)).toEqual({ x: 1, patch: (state as any).patch });
    },

    "createState(): patch is non-enumerable": async () => {
        const state = createState({ x: 1 });
        await expect(Object.keys(state)).toEqual(["x"]);
    },

    "createState(): app picks up queued patches": async () => {
        const state: any = createState({ count: 0 });
        state.patch({ count: 1 });
        state.patch({ count: 2 });
        const root = document.createElement("div");
        const container = document.createElement("div");
        root.appendChild(container);
        app(container, state, () => [DIV]);

        await expect(state.count)
            .toEqual(2);
    },

    "createState(): already-patchable state is kept as-is": async () => {
        const existingPatch = (action: any) => { };
        const state: any = { value: 5, patch: existingPatch };
        const result = createState(state);

        await expect(result.patch === existingPatch)
            .toEqual(true);
    },
};
