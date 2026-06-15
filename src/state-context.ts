import { DeepPartial, Patchable, PatchableState, RenderPatch } from "./vode";

/**
 * State context for type-safe access and manipulation of nested state paths
 * while still being able to access the parent state.
 */
export interface StateContext<S extends Patchable<S>, SubState> extends SubContext<SubState> { }

/**
 * State context for type-safe access and manipulation of nested sub-state values without knowledge of the parent state.
 */
export interface SubContext<SubState> {
    /**
     * Reads the current value of the sub-state if it exists.
     * 
     * @returns The current value, or undefined if the path doesn't exist
     */
    get(): SubState;

    /**
     * Updates the nested sub-state value WITHOUT triggering a render.
     * This performs a silent mutation of the parent state object.
     *
     * @param {SubState} value - The new value to assign
     */
    put(value: SubState): void;

    /**
     * Updates the nested sub-state value AND triggers a render.
     * This is the recommended way to update nested state in most cases.
     *
     * @param value - The new value or partial update to apply
     * @param animated - when true the patch runs through a view transition (if available)
     */
    patch(value: SubState | Partial<SubState> | DeepPartial<SubState>, animated?: boolean): void;
}

export type ProxyStateContext<S extends PatchableState, SubState> = StateContext<S, SubState> & {
    [K in keyof SubState]-?: SubState[K] extends object | null
    ? ProxyStateContext<S, SubState[K]>
    : StateContext<S, SubState[K]>
};

export type ProxySubContext<SubState> = SubContext<SubState> & {
    [K in keyof SubState]-?: SubState[K] extends object | null
    ? ProxySubContext<SubState[K]>
    : SubContext<SubState[K]>
};

type ProxyState<SubState> = SubState & {
    [K in keyof SubState]-?: NonNullable<SubState[K]> extends object | null
    ? ProxyState<NonNullable<SubState[K]>>
    : SubState[K]
};

/**
 * Creates a `ProxyStateContext` for type-safe access and manipulation of nested state.
 *
 * There are two ways to reach a subcontext:
 *
 * **1. Property chaining**: traverse the proxy directly via property access:
 * ```typescript
 * const ctx = context(state).user.profile.settings;
 * ```
 *
 * **2. Path producer function**: pass a callback that navigates 
 * the state tree; needed if your intermediate path contains 'get', 'put' or 'patch' properties that would conflict with the context API:
 * ```typescript
 * const ctx = context(state, s => s.user.profile.settings);
 * ```
 *
 * Both forms return a `ProxyStateContext` that supports the same operations:
 * ```typescript
 * ctx.get();                               // read current value
 * ctx.patch({ theme: 'light' });           // update and trigger render
 * ctx.put({ lang: 'de', theme: 'light' }); // update without render (silent mutation)
 * ```
 *
 * @param state - The root `PatchableState` to create a context on
 * @param producePath - Optional path producer; receives a proxy of the state and should return the desired sub-node
 * @returns A `ProxyStateContext` rooted at the given path, with further property-chain access available
 */

export function context<S extends PatchableState, SS = S>(state: S): ProxyStateContext<S, SS>;
export function context<S extends PatchableState, SS>(state: S, producePath: (ctx: ProxyState<S>) => ProxyState<SS>): ProxyStateContext<S, SS>;
export function context<S extends PatchableState, SS = S>(state: S, producePath?: (ctx: ProxyState<S>) => ProxyState<SS>): ProxyStateContext<S, SS> {
    if (producePath) {
        const proxy = producePath(proxyState<S>(state, [] as string[]));
        const keys = (proxy as any)["___KeYs___"] as string[];
        return new ProxyStateContextImpl<S, SS>(state, keys) as unknown as ProxyStateContext<S, SS>;
    }
    return new ProxyStateContextImpl<S, S>(state, []) as unknown as ProxyStateContext<S, SS>;
}

class ProxyStateContextImpl<S extends PatchableState, SubState> {

    constructor(
        readonly state: S,
        readonly keys: string[]
    ) {
        function putDeep(value: SubState | DeepPartial<SubState> | undefined | null, target: S | DeepPartial<S>) {
            if (keys.length > 1) {
                let i = 0;
                let raw = (<any>target)[keys[i]];
                if (typeof raw !== "object" || raw === null) {
                    (<any>target)[keys[i]] = raw = {};
                }
                for (i = 1; i < keys.length - 1; i++) {
                    const p = raw;
                    raw = raw[keys[i]];
                    if (typeof raw !== "object" || raw === null) {
                        p[keys[i]] = raw = {};
                    }
                }
                raw[keys[i]] = value;
            } else if (keys.length === 1) {
                (<any>target)[keys[0]] = value;
            } else {
                Object.assign(target, value as DeepPartial<S>);
            }
        }

        function createPatch(value: SubState | DeepPartial<SubState> | undefined | null): RenderPatch<S> {
            const renderPatch: DeepPartial<S> = {};
            putDeep(value, renderPatch);
            return renderPatch;
        }

        function get(): SubState | undefined {
            if (keys.length === 0)
                return state as unknown as SubState;

            let raw = state ? (<any>state)[keys[0]] : undefined;
            for (let i = 1; i < keys.length && !!raw; i++) {
                raw = raw[keys[i]];
            }
            return raw;
        }

        function put(value: SubState) {
            putDeep(value, state);
        }

        function patch(value: SubState | DeepPartial<SubState> | Array<DeepPartial<SubState>> | undefined | null, animated?: boolean) {
            if (animated) {
                state.patch([createPatch(value as DeepPartial<SubState>)]);
            }
            else {
                state.patch(createPatch(value as DeepPartial<SubState>));
            }
        }

        return new Proxy(this, {
            get: (target, prop, receiver) => {

                if (prop === 'get')
                    return get;

                if (prop === 'put')
                    return put;

                if (prop === 'patch')
                    return patch;

                // otherwise return a new ProxyStateContext for nested access
                const newKeys = [...keys, String(prop)];
                return new ProxyStateContextImpl<S, any>(target.state, newKeys);
            },
            set: (target: this, p: string | symbol, newValue: any, receiver: any) => {
                throw new Error("ProxyStateContext is not meant to be directly mutated. Use put() or patch() methods on the StateContext instead");
            }
        });
    }

}


function proxyState<S extends PatchableState>(
    state: S,
    keys: string[]
) {
    return new Proxy(state, {
        get: (target, prop, receiver) => {
            if (prop === "___KeYs___") {
                return keys;
            }

            const newKeys = [...keys, String(prop)];
            return proxyState<S>(state, newKeys);
        },
        set: (target: any, p: string | symbol, newValue: any, receiver: any) => {
            throw new Error("ProxyState is not meant to be directly mutated");
        }
    });
}
