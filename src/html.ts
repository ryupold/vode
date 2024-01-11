import { ChildVode, Props, Vode } from "./vode.js";

export const htmlToVode = <S = any>(html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html.trim();

    const vodes = <ChildVode<S>[]>[];
    for (const child of div.childNodes) {
        const v = elementToVode(<Element>child);
        if (v != null) vodes.push(v);
    }
    return vodes;
}

const elementToVode = <S = any>(element: Element) => {
    if (element.nodeType === Node.TEXT_NODE) {
        return element.textContent?.trim();
    }
    if(element.nodeType !== Node.ELEMENT_NODE) {
        return undefined;
    }
    const vode = <Vode<S>>[element.tagName.toLowerCase()];

    if (element.hasAttributes()) {
        const props = <Props<S>>{};
        for (const att of element.attributes) {
            props[att.name] = att.value;
        }
        (<any[]>vode).push(props);
    }

    for (const child of element.childNodes) {
        const v = elementToVode(<Element>child);
        if (v && (typeof v !== "string" || v.length > 0)) (<any[]>vode).push(v);
    }
    return vode;
}