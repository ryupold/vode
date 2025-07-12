import { DeepPartial } from "./vode.js";

type KeyPath<ObjectType extends object> =
    { [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
        ? `${Key}` | `${Key}.${KeyPath<ObjectType[Key]>}`
        : `${Key}`
    }[keyof ObjectType & (string | number)];

/** put a value deep inside an object addressed by a key path (creating necessary structure on the way). if target is null, a new object is created */
export function put<O extends object | unknown>(keyPath: O extends object ? KeyPath<O> : string, value: any = undefined, target: DeepPartial<O> | null = null) {
    if (!target) target = {} as O as any;

    const keys = keyPath.split('.');
    if (keys.length > 1) {
        let i = 0;
        let raw = (<any>target)[keys[i]];
        if (raw === undefined) {
            (<any>target)[keys[i]] = raw = {};
        }
        for (i = 1; i < keys.length - 1; i++) {
            const p = raw;
            raw = raw[keys[i]];
            if (raw === undefined) {
                raw = {};
                p[keys[i]] = raw;
            }
        }
        if (keys[i] === undefined) console.log(keyPath);
        raw[keys[i]] = value;
    } else {
        (<any>target)[keys[0]] = value;
    }
    return target
}

/** get a value deep inside an object by its key path */
export function get<O extends object | unknown>(keyPath: O extends object ? KeyPath<O> : string, source: DeepPartial<O>) {
    const keys = keyPath.split('.');
    let raw = source ? (<any>source)[keys[0]] : undefined;
    for (let i = 1; i < keys.length && !!raw; i++) {
        raw = raw[keys[i]];
    }
    return raw;
}