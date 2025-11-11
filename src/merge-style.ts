import { StyleProp } from "./vode.js";

const tempDivForStyling = document.createElement('div');

/** merge `StyleProps`s regardless of type 
 * @returns {string} merged StyleProp */
export function mergeStyle(...props: StyleProp[]): StyleProp {
    try{
        const merged = tempDivForStyling.style;
        for (const style of props) {
            if (typeof style === 'object' && style !== null) {
                for (const key in style) {
                    merged[key] = style[key];
                }
            } else if (typeof style === 'string') {
                merged.cssText += ';' + style;
            }
        }
        return merged.cssText;
    } finally {
        tempDivForStyling.style.cssText = '';
    }
}