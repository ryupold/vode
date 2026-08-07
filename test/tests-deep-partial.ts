import type { DeepPartial } from "../src/vode";

type State = {
    nested: {
        count: number;
        label: string;
    };
    items: {
        id: number;
        label: string;
    }[];
};

const nestedPatch: DeepPartial<State> = { nested: { count: 1 } };
const arrayReplacement: DeepPartial<State> = { items: [{ id: 1, label: "complete item" }] };

// note: during patch() arrays are replaced at runtime
const partialArrayElement: DeepPartial<State> = { items: [{ id: 1 }] };

void [nestedPatch, arrayReplacement, partialArrayElement];
