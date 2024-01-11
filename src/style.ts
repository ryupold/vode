import { StyleProp } from "./vode.js";


function generateCSS(style: StyleProp) {
    let css = '';
    for (const key in style) {
        const value = style[key];
        //transform camelCase to kebab-case
        const kebab = key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
        css += `${kebab}:${value};`;
    }
    return css;
}

function keyToKebab(key: string) : string {
    return key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}