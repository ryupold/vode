import { PatchableState, Props } from "./vode";
import { mergeStyle } from "./merge-style";
import { mergeClass } from "./merge-class";

/** merge `Props` from left to right 
 * utilizing `mergeStyle` for style properties and `mergeClass` for class properties.
 * @returns {Props<S>} merged Prop object or undefined if no props were provided
 */
export function mergeProps<S extends PatchableState = PatchableState>(...props: (Props<S> | undefined | null)[]): Props<S> | undefined {
    if (props.length === 0) return undefined;
    if (props.length === 1) return props[0] || undefined;

    let combined: Props<S> | undefined;

    for (const p of props) {
        if (typeof p !== "object" || p === null) continue;
        if (!combined) combined = {};

        for (const key in p) {
            if (key === 'style') {
                combined.style = mergeStyle(combined.style, p.style);
            } else if (key === 'class') {
                combined.class = mergeClass(combined.class, p.class);
            }
            else {
                combined[key] = p[key];
            }
        }
    }

    return combined;
}