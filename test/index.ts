import vodeTests from "./tests-vode";
import appTests from "./tests-app";
import defuseTests from "./tests-defuse";
import hydrateTests from "./tests-hydrate";
import memoTests from "./tests-memo";
import createStateTests from "./tests-createState";
import createPatchTests from "./tests-createPatch";
import tagTests from "./tests-tag";
import childrenTests from "./tests-children";
import propsTests from "./tests-props";
import mergeClassTests from "./tests-mergeClass";
import mergeStyleTests from "./tests-mergeStyle";
import mergePropsTests from "./tests-mergeProps";
import stateContextTests from "./tests-state-context";
import mountUnmountTests from "./tests-mount-unmount";
import reconciledTests from "./tests-reconciled";
import exampleTests from "./tests-examples";
import catchTests from "./tests-catch";
import patchAdvancedTests from "./tests-patch-advanced";
import patchMergeTests from "./tests-patch-merge";
import keyedTests from "./tests-keyed";

export const tests = {
    ...vodeTests,
    ...appTests,
    ...defuseTests,
    ...hydrateTests,
    ...memoTests,
    ...mountUnmountTests,
    ...reconciledTests,

    ...createStateTests,
    ...createPatchTests,

    ...tagTests,
    ...propsTests,
    ...childrenTests,

    ...mergeClassTests,
    ...mergeStyleTests,
    ...mergePropsTests,

    ...stateContextTests,
    ...exampleTests,
    ...catchTests,
    ...patchAdvancedTests,
    ...patchMergeTests,
    ...keyedTests,
};
