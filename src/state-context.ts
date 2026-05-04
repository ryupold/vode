import { AnimatedPatch, DeepPartial, Patchable, PatchableState, RenderPatch } from "./vode";

/**
 * State context for type-safe access and manipulation of nested state paths
 * while still be able to access the parent state. 
 */
export interface StateContext<S extends Patchable<S>, SubState> extends SubContext<SubState> {
    /** 
     * parent state
     * @see PatchableState<S>
     */
    get state(): S;
}

/**
 * State context for type-safe access and manipulation of nested sub-state values without knowledge of the parent state.
 */
export interface SubContext<SubState> {
    /**
     * Reads the current value of the substate if it exists.
     * 
     * @returns The current value, or undefined if the path doesn't exist
     */
    get(): SubState;

    /**
     * Updates the nested sub-state value WITHOUT triggering a render.
     * This performs a silent mutation of the parent state object.
     * 
     * @param {DeepPartial<SubState>} value - The new value or partial update to apply
     */
    put(value: SubState | Partial<SubState> | DeepPartial<SubState>): void;

    /**
     * Updates the nested sub-state value AND triggers a render.
     * This is the recommended way to update nested state in most cases.
     * 
     * @param value - The new value or partial update to apply
     */
    patch(value: SubState | Partial<SubState> | DeepPartial<SubState> | Array<DeepPartial<SubState>>): void;
}

export type ProxyStateContext<S extends PatchableState, SubState> = StateContext<S, SubState> & {
    [K in keyof SubState]-?: SubState[K] extends object
    ? ProxyStateContext<S, SubState[K]>
    : StateContext<S, SubState[K]>
};

export type ProxySubContext<SubState> = SubContext<SubState> & {
    [K in keyof SubState]-?: SubState[K] extends object
    ? ProxySubContext<SubState[K]>
    : SubContext<SubState[K]>
};

/**
 * create a ProxyStateContext for type-safe dynamic access to nested state
 * 
 * @example
 * ```typescript
 * const state = createState({
 *   user: {
 *    profile: {
 *     settings: { theme: 'dark', lang: 'en' }
 *   }
 * });
 * 
 * // Create a proxy context for the state
 * const ctx = context(state).user.profile.settings;
 * 
 * // Access nested state dynamically
 * const settings = ctx.get(); // { theme: 'dark', lang: 'en' }
 * 
 * // Update and trigger render
 * ctx.patch({ theme: 'light' });
 * 
 * // Update without render (silent mutation)
 * ctx.put({ lang: 'de' });
 * ```
 * 
 * @param state 
 * @returns 
 */
export function context<S extends PatchableState>(state: S): ProxyStateContext<S, S> {
    return new ProxyStateContextImpl<S, S>(state, []) as unknown as ProxyStateContext<S, S>;
}

class ProxyStateContextImpl<S extends PatchableState, SubState>
    implements StateContext<S, SubState> {

    constructor(
        public readonly state: S,
        private readonly keys: string[]
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
                if (typeof (<any>target)[keys[0]] === "object" && typeof value === "object")
                    Object.assign((<any>target)[keys[0]], value);
                else
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

        function put(value: SubState | DeepPartial<SubState> | undefined | null) {
            putDeep(value, state);
        }

        function patch(value: SubState | DeepPartial<SubState> | Array<DeepPartial<SubState>> | undefined | null) {
            if (Array.isArray(value)) {
                const animation: AnimatedPatch<S> = [];
                for (const v of value) {
                    animation.push(createPatch(v));
                }
                state.patch(animation);
            }
            else {
                state.patch(createPatch(value as DeepPartial<SubState>));
            }
        }

        return new Proxy(this, {
            get: (target, prop, receiver) => {
                if (prop === 'state')
                    return state;

                if (prop === 'get')
                    return get;

                if (prop === 'put')
                    return put;

                if (prop === 'patch')
                    return patch;


                // otherwise return a new ProxyStateContext for nested access
                const newKeys = [...target.keys, String(prop)];
                return new ProxyStateContextImpl<S, any>(target.state, newKeys);
            }
        });
    }

    get(): SubState { return undefined as unknown as SubState; }
    put(value: SubState | DeepPartial<SubState>): void { }
    patch(value: SubState | DeepPartial<SubState> | DeepPartial<SubState>[]): void { }
}
