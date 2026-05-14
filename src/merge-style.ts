import { StyleProp } from "./vode";

let tempDivForStyling: HTMLElement | undefined;

/** merge `StyleProps`s regardless of type 
 * @returns {string} merged StyleProp */
export function mergeStyle(...props: StyleProp[]): StyleProp {
    if (!tempDivForStyling) {
        tempDivForStyling = document.createElement('div');
    }
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