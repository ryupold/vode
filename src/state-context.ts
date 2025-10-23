import { AnimatedPatch, DeepPartial, PatchableState, RenderPatch } from "./vode.js";

/**
 * Generates dot-notation path strings for all nested properties in an object type.
 * 
 * @example
 * type User = { profile: { settings: { theme: string } } };
 * type Paths = KeyPath<User>; // "profile" | "profile.settings" | "profile.settings.theme"
 */
export type KeyPath<ObjectType extends object> =
    { [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
        ? `${Key}` | `${Key}.${KeyPath<ObjectType[Key]>}`
        : `${Key}`
    }[keyof ObjectType & (string | number)];

/**
 * Extracts the value type at a given dot-notation path in an object type.
 * 
 * @example
 * type User = { profile: { settings: { theme: string } } };
 * type Theme = PathValue<User, "profile.settings.theme">; // string
 */
export type PathValue<T, P extends string> =
    P extends `${infer Key}.${infer Rest}`
    ? Key extends keyof T ? PathValue<T[Key], Rest> : never
    : P extends keyof T ? T[P] : never;

/**
 * Maps valid paths in an object type to paths that resolve to a specific substate type.
 * Used for type-safe path constraints in StateContext.
 * Ensures exact type matching (not just compatibility).
 * 
 * @example
 * type User = { profile: { name: string, settings: { theme: string } } };
 * type SettingsPaths = KeyToSubState<User, { theme: string }>; // "profile.settings"
 * type InvalidPath = KeyToSubState<User, { theme: string }, "profile">; // never (type mismatch)
 */
export type KeyToSubState<S extends object, Sub, K = KeyPath<S>> =
    K extends KeyPath<S> ? [PathValue<S, K>] extends [Sub] ? [Sub] extends [PathValue<S, K>] ? K
    : never : never : never;

/**
 * State context for type-safe access and manipulation of nested state paths
 * while still be able to access the parent state. 
 */
export interface StateContext<S extends PatchableState, SubState> extends SubStateContext<SubState> {
    /** 
     * parent state
     * @see PatchableState<S>
     */
    get state(): S;
}

/**
 * State context for type-safe access and manipulation of nested sub-state values without knowledge of the parent state.
 */
export interface SubStateContext<SubState> {
    /**
     * Reads the current value of the substate if it exists.
     * 
     * @returns The current value, or undefined if the path doesn't exist
     */
    get(): SubState | undefined;

    /**
     * Updates the nested sub-state value WITHOUT triggering a render.
     * This performs a silent mutation of the parent state object.
     * 
     * @param {DeepPartial<SubState>} value - The new value or partial update to apply
     */
    put(value: SubState | DeepPartial<SubState> | undefined | null): void;

    /**
     * Updates the nested sub-state value AND triggers a render.
     * This is the recommended way to update nested state in most cases.
     * 
     * @param value - The new value or partial update to apply
     */
    patch(value: SubState | DeepPartial<SubState> | Array<DeepPartial<SubState>> | undefined | null): void;
}

/**
 * Provides type-safe access to deeply nested state with path-based operations.
 * 
 * **When to use:**
 * - State is deeply nested
 * - Multiple components access the same nested path
 * - You need type safety for nested updates
 * 
 * **When to avoid:**
 * - Shallow state structures for main state
 * - State structure changes frequently
 * - Learning vode for the first time (start simpler)
 * 
 * @example
 * ```typescript
 * const state = createState({
 *   user: {
 *     profile: {
 *       settings: { theme: 'dark', lang: 'en' }
 *     }
 *   }
 * });
 * app(element, state, (s) => [DIV]);
 * 
 * // Create a context for the nested settings
 * const settingsCtx = new KeyStateContext(state, 'user.profile.settings');
 * 
 * // Read current value
 * const settings = settingsCtx.get(); // { theme: 'dark', lang: 'en' }
 * 
 * // Update and trigger render
 * settingsCtx.patch({ theme: 'light' });
 * 
 * // Update without render (silent mutation)
 * settingsCtx.put({ lang: 'de' });
 * state.patch({}); // trigger render manually later
 * ```
 * 
 * @template S - The root state type (must extend PatchableState)
 * @template SubState - The type of the nested state being accessed
 */
export class KeyStateContext<S extends PatchableState, SubState>
    implements StateContext<S, SubState> {
    private readonly keys: string[];

    constructor(
        public readonly state: S,
        public readonly path: KeyToSubState<S, SubState>
    ) {
        this.keys = path.split('.');
    }

    get(): SubState | undefined {
        const keys = this.keys;
        let raw = this.state ? (<any>this.state)[keys[0]] : undefined;
        for (let i = 1; i < keys.length && !!raw; i++) {
            raw = raw[keys[i]];
        }
        return raw;
    }

    put(value: SubState | DeepPartial<SubState> | undefined | null) {
        this.putDeep(value, this.state);
    }

    patch(value: SubState | DeepPartial<SubState> | Array<DeepPartial<SubState>> | undefined | null) {
        if (Array.isArray(value)) {
            const animation: AnimatedPatch<S> = [];
            for (const v of value) {
                animation.push(this.createPatch(v));
            }
            this.state.patch(animation);
        }
        else {
            this.state.patch(this.createPatch(value as DeepPartial<SubState>));
        }
    }

    /**
     * Creates a render-patch for the parent state by setting a nested sub-state value while creating necessary structure. 
     * 
     * @example
     * ```typescript
     * const ctx = new KeyStateContext(state, 'user.profile.settings');
     * const patch = ctx.createPatch({ theme: 'light' });
     * // patch is { user: { profile: { settings: { theme: 'light' } } } }
     * ```
     * 
     * @param value 
     * @returns {{key-path}:{...: value}} render-patch for the parent state
     */
    createPatch(value: SubState | DeepPartial<SubState> | undefined | null): RenderPatch<S> {
        const renderPatch: DeepPartial<S> = {};
        this.putDeep(value, renderPatch);
        return renderPatch;
    }

    private putDeep(value: SubState | DeepPartial<SubState> | undefined | null, target: S | DeepPartial<S>) {
        const keys = this.keys;
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
        } else {
            if (typeof (<any>target)[keys[0]] === "object" && typeof value === "object")
                Object.assign((<any>target)[keys[0]], value);
            else
                (<any>target)[keys[0]] = value;
        }
    }
}

/**
 * Provides type-safe access to sub-state with fetch & store delegate functions.
 * Implementer is responsible for reading/writing the sub-state correctly.
 * 
 * **When to use:**
 * - State structure is dynamic or complex
 * - You need custom logic for accessing nested state
 * - You want to encapsulate access logic outside of parent state
 * 
 * **When to avoid:**
 * - Simple, static state structures
 * - You want automatic path-based access (use KeyStateContext instead)
 * - Learning vode for the first time (start simpler)
 */
export class DelegateStateContext<S extends PatchableState, SubState>
    implements StateContext<S, SubState> {
    constructor(
        public readonly state: S,

        public readonly get: () => SubState | undefined,

        public readonly put: (value: SubState | DeepPartial<SubState> | undefined | null) => void,

        public readonly patch: (value: SubState | DeepPartial<SubState> | Array<DeepPartial<SubState>> | undefined | null) => void,
    ) {
    }
}