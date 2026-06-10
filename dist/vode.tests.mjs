// src/vode.ts
var globals = {
  currentViewTransition: void 0,
  requestAnimationFrame: typeof window !== "undefined" && typeof window.requestAnimationFrame === "function" ? window.requestAnimationFrame.bind(window) : ((cb) => cb()),
  startViewTransition: typeof document !== "undefined" && typeof document.startViewTransition === "function" ? document.startViewTransition.bind(document) : null
};
function vode(tag2, props2, ...children2) {
  if (!tag2) throw new Error("first argument to vode() must be a tag name or a vode");
  if (Array.isArray(tag2)) return tag2;
  else if (typeof props2 === "object") return [tag2, props2, ...children2];
  else return [tag2, ...children2];
}
function app(container, state, dom, ...initialPatches) {
  if (!container?.parentElement) throw new Error("first argument to app() must be a valid HTMLElement inside the <html></html> document");
  if (!state || typeof state !== "object") throw new Error("second argument to app() must be a state object");
  if (typeof dom !== "function") throw new Error("third argument to app() must be a function that returns a vode");
  const _vode = {};
  _vode.syncRenderer = globals.requestAnimationFrame;
  _vode.asyncRenderer = globals.startViewTransition;
  _vode.isRendering = 0;
  _vode.qAsync = null;
  _vode.stats = { lastSyncRenderTime: 0, lastAsyncRenderTime: 0, syncRenderCount: 0, asyncRenderCount: 0, liveEffectCount: 0, patchCount: 0, syncRenderPatchCount: 0, asyncRenderPatchCount: 0 };
  const patchableState = state;
  if ("patch" in state && typeof state.patch === "function" && Array.isArray(state.patch.initialPatches)) {
    initialPatches = [...state.patch.initialPatches, ...initialPatches];
  }
  async function promisePatch(action, isAnimated) {
    _vode.stats.liveEffectCount++;
    try {
      const resolvedPatch = await action;
      await patchableState.patch(resolvedPatch, isAnimated);
    } finally {
      _vode.stats.liveEffectCount--;
    }
  }
  async function generatorPatch(action, isAnimated) {
    const generator = action;
    _vode.stats.liveEffectCount++;
    try {
      let v = await generator.next();
      while (v.done === false) {
        _vode.stats.liveEffectCount++;
        try {
          await patchableState.patch(v.value, isAnimated);
          v = await generator.next();
        } finally {
          _vode.stats.liveEffectCount--;
        }
      }
      await patchableState.patch(v.value, isAnimated);
    } finally {
      _vode.stats.liveEffectCount--;
    }
  }
  Object.defineProperty(state, "patch", {
    enumerable: false,
    configurable: true,
    writable: false,
    value: (action, isAnimated) => {
      while (typeof action === "function") {
        action = action(_vode.state);
      }
      if (!action || typeof action !== "object") return;
      _vode.stats.patchCount++;
      if (action?.next) {
        return generatorPatch(action, isAnimated);
      } else if (action.then) {
        return promisePatch(action, isAnimated);
      } else if (Array.isArray(action)) {
        if (action.length > 0) {
          for (const p of action) {
            patchableState.patch(p, !document.hidden && !!_vode.asyncRenderer);
          }
        } else {
          mergeState(_vode.state, _vode.qAsync, true);
          _vode.qAsync = null;
          try {
            globals.currentViewTransition?.skipTransition();
          } catch {
          }
          _vode.stats.syncRenderPatchCount++;
          _vode.renderSync();
        }
      } else {
        if (isAnimated) {
          _vode.stats.asyncRenderPatchCount++;
          _vode.qAsync = mergeState(_vode.qAsync || {}, action, false);
          _vode.renderAsync();
        } else {
          _vode.stats.syncRenderPatchCount++;
          mergeState(_vode.state, action, true);
          _vode.renderSync();
        }
      }
    }
  });
  function renderDom(isAnimated) {
    const sw = performance.now();
    _vode.vode = render(_vode.state, container.parentElement, 0, 0, _vode.vode, dom);
    if (container.tagName.toLowerCase() !== _vode.vode[0].toLowerCase()) {
      container = _vode.vode.node;
      container._vode = _vode;
    }
    if (!isAnimated) {
      _vode.stats.lastSyncRenderTime = performance.now() - sw;
      const changesSinceRender = _vode.isRendering !== _vode.stats.syncRenderPatchCount;
      _vode.stats.syncRenderCount++;
      _vode.isRendering = 0;
      if (changesSinceRender)
        _vode.renderSync();
    }
  }
  const sr = renderDom.bind(null, false);
  const ar = renderDom.bind(null, true);
  Object.defineProperty(_vode, "renderSync", {
    enumerable: false,
    configurable: true,
    writable: false,
    value: () => {
      if (_vode.isRendering) return;
      _vode.isRendering = _vode.stats.syncRenderPatchCount;
      _vode.syncRenderer(sr);
    }
  });
  Object.defineProperty(_vode, "renderAsync", {
    enumerable: false,
    configurable: true,
    writable: false,
    value: async () => {
      if (_vode.isAnimating || !_vode.qAsync) return;
      await globals.currentViewTransition?.updateCallbackDone;
      if (_vode.isAnimating || !_vode.qAsync || document.hidden) return;
      _vode.isAnimating = true;
      const sw = performance.now();
      try {
        _vode.state = mergeState(_vode.state, _vode.qAsync, true);
        _vode.qAsync = null;
        globals.currentViewTransition = _vode.asyncRenderer(ar);
        await globals.currentViewTransition?.updateCallbackDone;
      } finally {
        _vode.stats.lastAsyncRenderTime = performance.now() - sw;
        _vode.stats.asyncRenderCount++;
        _vode.isAnimating = false;
      }
      if (_vode.qAsync) _vode.renderAsync();
    }
  });
  _vode.state = patchableState;
  const root = container;
  root._vode = _vode;
  const indexInParent = Array.from(container.parentElement.children).indexOf(container);
  const patchCountBefore = _vode.stats.syncRenderPatchCount;
  _vode.isRendering = _vode.stats.syncRenderPatchCount;
  _vode.vode = render(
    state,
    container.parentElement,
    indexInParent,
    indexInParent,
    hydrate(container, true),
    dom
  );
  if (container.tagName.toLowerCase() !== _vode.vode[0].toLowerCase()) {
    container = _vode.vode.node;
    container._vode = _vode;
  }
  const continueRendering = _vode.stats.syncRenderPatchCount !== patchCountBefore;
  _vode.isRendering = 0;
  _vode.stats.syncRenderCount++;
  if (continueRendering) _vode.renderSync();
  for (const effect of initialPatches) {
    patchableState.patch(effect);
  }
  return (action) => patchableState.patch(action);
}
function defuse(container) {
  if (container?._vode) {
    let clearEvents2 = function(av) {
      if (!av?.node) return;
      const p = props(av);
      if (p) {
        for (const key in p) {
          if (key[0] === "o" && key[1] === "n") {
            av.node[key] = null;
          }
        }
        av.node["catch"] = null;
      }
      if (av.node._vode) {
        defuse(av.node);
      } else {
        const kids = children(av);
        if (kids) {
          for (let child2 of kids) {
            clearEvents2(child2);
          }
        }
      }
    };
    var clearEvents = clearEvents2;
    const v = container._vode;
    delete container["_vode"];
    Object.defineProperty(v.state, "patch", { value: void 0 });
    Object.defineProperty(v, "renderSync", { value: () => {
    } });
    Object.defineProperty(v, "renderAsync", { value: () => {
    } });
    clearEvents2(v.vode);
  } else {
    for (let child2 of container.children) {
      defuse(child2);
    }
  }
}
function hydrate(element, prepareForRender) {
  if (element?.nodeType === Node.TEXT_NODE) {
    if (element.nodeValue?.trim() !== "")
      return prepareForRender ? element : element.nodeValue;
    return void 0;
  } else if (element.nodeType === Node.ELEMENT_NODE) {
    const tag2 = element.tagName.toLowerCase();
    const root = [tag2];
    if (prepareForRender) root.node = element;
    if (element?.hasAttributes()) {
      const props2 = {};
      const attr = element.attributes;
      for (let a of attr) {
        props2[a.name] = a.value;
      }
      root.push(props2);
    }
    if (element.hasChildNodes()) {
      const remove = [];
      for (let child2 of element.childNodes) {
        const wet = child2 && hydrate(child2, prepareForRender);
        if (wet) root.push(wet);
        else if (child2 && prepareForRender) remove.push(child2);
      }
      for (let child2 of remove) {
        child2.remove();
      }
    }
    return root;
  } else {
    return void 0;
  }
}
function memo(compare, component) {
  if (!compare || !Array.isArray(compare)) throw new Error("first argument to memo() must be an array of values to compare");
  if (typeof component !== "function") throw new Error("second argument to memo() must be a function that returns a child vode");
  if (component.__memo) {
    const comp = component;
    component = (s) => comp(s);
  }
  component.__memo = compare;
  return component;
}
function createState(state) {
  if (!state || typeof state !== "object") throw new Error("createState() must be called with a state object");
  if (!("patch" in state)) {
    Object.defineProperty(state, "patch", {
      enumerable: false,
      configurable: true,
      writable: false,
      value: (action) => {
        const futureState = state;
        if (!Array.isArray(futureState.patch.initialPatches)) {
          futureState.patch.initialPatches = [];
        }
        futureState.patch.initialPatches.push(action);
      }
    });
  }
  return state;
}
function createPatch(p) {
  return p;
}
function tag(v) {
  const t = !!v && Array.isArray(v) && v[0];
  if (typeof t === "string") return t;
  return void 0;
}
function props(vode2) {
  if (Array.isArray(vode2) && vode2.length > 1 && vode2[1] && !Array.isArray(vode2[1])) {
    if (typeof vode2[1] === "object" && vode2[1].nodeType !== Node.TEXT_NODE) {
      return vode2[1];
    }
  }
  return void 0;
}
function children(vode2) {
  const start = childrenStart(vode2);
  if (start > 0) {
    return vode2.slice(start);
  }
  return void 0;
}
function childCount(vode2) {
  const start = childrenStart(vode2);
  if (start < 0) return 0;
  return vode2.length - start;
}
function child(vode2, index) {
  const start = childrenStart(vode2);
  if (start > 0) return vode2[index + start];
  else return void 0;
}
function childrenStart(vode2) {
  return props(vode2) ? vode2.length > 2 ? 2 : -1 : Array.isArray(vode2) && vode2.length > 1 ? 1 : -1;
}
function mergeState(target, source, allowDeletion) {
  if (!source) return target;
  for (const key in source) {
    const value = source[key];
    if (value && typeof value === "object") {
      const targetValue = target[key];
      if (targetValue) {
        if (Array.isArray(value)) {
          target[key] = [...value];
        } else if (value instanceof Date && targetValue !== value) {
          target[key] = new Date(value);
        } else {
          if (Array.isArray(targetValue)) target[key] = mergeState({}, value, allowDeletion);
          else if (typeof targetValue === "object") mergeState(target[key], value, allowDeletion);
          else target[key] = mergeState({}, value, allowDeletion);
        }
      } else if (Array.isArray(value)) {
        target[key] = [...value];
      } else if (value instanceof Date) {
        target[key] = new Date(value);
      } else {
        target[key] = mergeState({}, value, allowDeletion);
      }
    } else if (value === void 0 && allowDeletion) {
      delete target[key];
    } else {
      target[key] = value;
    }
  }
  return target;
}
function render(state, parent, childIndex, indexInParent, oldVode, newVode, xmlns) {
  try {
    newVode = remember(state, newVode, oldVode);
    const isNoVode = !newVode || typeof newVode === "number" || typeof newVode === "boolean";
    if (newVode === oldVode || !oldVode && isNoVode) {
      return oldVode;
    }
    const oldIsText = oldVode?.nodeType === Node.TEXT_NODE;
    const oldNode = oldIsText ? oldVode : oldVode?.node;
    if (isNoVode) {
      unmountTree(state, oldVode);
      oldNode?.remove();
      return void 0;
    }
    const isText = !isNoVode && isTextVode(newVode);
    const isNode = !isNoVode && isNaturalVode(newVode);
    const alreadyAttached = !!newVode && typeof newVode !== "string" && !!(newVode?.node || newVode?.nodeType === Node.TEXT_NODE);
    if (!isText && !isNode && !alreadyAttached && !oldVode) {
      throw new Error("Invalid vode: " + typeof newVode + " " + JSON.stringify(newVode));
    } else if (alreadyAttached && isText) {
      newVode = newVode.wholeText;
    } else if (alreadyAttached && isNode) {
      newVode = [...newVode];
    }
    if (oldIsText && isText) {
      if (oldNode.nodeValue !== newVode) {
        oldNode.nodeValue = newVode;
      }
      return oldVode;
    }
    if (isText && (!oldNode || !oldIsText)) {
      const text = document.createTextNode(newVode);
      if (oldNode) {
        unmountTree(state, oldVode);
        oldNode.replaceWith(text);
      } else {
        let inserted = false;
        for (let i = indexInParent; i < parent.childNodes.length; i++) {
          const nextSibling = parent.childNodes[i];
          if (nextSibling) {
            nextSibling.before(text);
            inserted = true;
            break;
          }
        }
        if (!inserted) {
          parent.appendChild(text);
        }
      }
      return text;
    }
    if (isNode && (!oldNode || oldIsText || oldVode[0] !== newVode[0])) {
      const newvode = newVode;
      if (1 in newvode) {
        newvode[1] = remember(state, newvode[1], void 0);
      }
      const properties = props(newVode);
      if (properties?.xmlns !== void 0) xmlns = properties.xmlns;
      const newNode = xmlns ? document.createElementNS(xmlns, newVode[0]) : document.createElement(newVode[0]);
      newVode.node = newNode;
      patchProperties(state, newNode, void 0, properties, xmlns ?? null);
      if (!!properties && "catch" in properties) {
        newVode.node["catch"] = null;
        newVode.node.removeAttribute("catch");
      }
      if (oldNode) {
        unmountTree(state, oldVode);
        oldNode.replaceWith(newNode);
      } else {
        let inserted = false;
        for (let i = indexInParent; i < parent.childNodes.length; i++) {
          const nextSibling = parent.childNodes[i];
          if (nextSibling) {
            nextSibling.before(newNode);
            inserted = true;
            break;
          }
        }
        if (!inserted) {
          parent.appendChild(newNode);
        }
      }
      const newStart = childrenStart(newVode);
      if (newStart > 0) {
        const childOffset = !!properties ? 2 : 1;
        let indexP = 0;
        for (let i = 0; i < newVode.length - newStart; i++) {
          const child2 = newVode[i + newStart];
          const attached = render(state, newNode, i, indexP, void 0, child2, xmlns ?? null);
          newVode[i + childOffset] = attached;
          if (attached) indexP++;
        }
      }
      newVode._unmountCount = (properties?.onUnmount ? 1 : 0) + sumChildUnmountCounts(newVode);
      if (typeof properties?.onMount === "function") {
        state.patch(properties.onMount(state, newNode));
      }
      return newVode;
    }
    if (!oldIsText && isNode && oldVode[0] === newVode[0]) {
      newVode.node = oldNode;
      const properties = props(newVode);
      const oldProps = props(oldVode);
      if (properties?.xmlns !== void 0)
        xmlns = properties.xmlns;
      patchProperties(state, oldNode, oldProps, properties, xmlns);
      if (!!properties?.catch && oldProps?.catch !== properties.catch) {
        newVode.node["catch"] = null;
        newVode.node.removeAttribute("catch");
      }
      const newStart = childrenStart(newVode);
      const oldStart = childrenStart(oldVode);
      if (newStart > 0) {
        let indexP = 0;
        for (let i = 0; i < newVode.length - newStart; i++) {
          const child2 = newVode[i + newStart];
          const oldChild = oldStart > 0 ? oldVode[i + oldStart] : void 0;
          const attached = render(state, oldNode, i, indexP, oldChild, child2, xmlns);
          newVode[i + newStart] = attached;
          if (attached) indexP++;
        }
      }
      if (oldStart > 0) {
        const newKidsCount = newStart > 0 ? newVode.length - newStart : 0;
        for (let i = oldVode.length - 1 - oldStart; i >= newKidsCount; i--) {
          render(state, oldNode, i, i, oldVode[i + oldStart], void 0, xmlns);
        }
      }
      newVode._unmountCount = (properties?.onUnmount ? 1 : 0) + sumChildUnmountCounts(newVode);
      return newVode;
    }
  } catch (error) {
    const catchVode = typeof newVode === "function" ? props(oldVode)?.catch : props(newVode)?.catch;
    if (catchVode) {
      const handledVode = typeof catchVode === "function" ? catchVode(state, error) : catchVode;
      return render(
        state,
        parent,
        childIndex,
        indexInParent,
        hydrate(newVode?.node || oldVode?.node, true),
        handledVode,
        xmlns
      );
    } else {
      throw error;
    }
  }
  return void 0;
}
function unmountTree(state, v) {
  if (!v || !Array.isArray(v)) return;
  if ((v._unmountCount | 0) === 0) return;
  const kids = children(v);
  if (kids) {
    for (let i = kids.length - 1; i >= 0; i--) {
      unmountTree(state, kids[i]);
    }
  }
  const p = props(v);
  if (typeof p?.onUnmount === "function") {
    state.patch(p.onUnmount(state, v.node));
  }
}
function sumChildUnmountCounts(v) {
  const kids = children(v);
  if (!kids) return 0;
  let n = 0;
  for (const k of kids) {
    if (k && Array.isArray(k)) {
      n += k._unmountCount | 0;
    }
  }
  return n;
}
function isNaturalVode(x) {
  return Array.isArray(x) && x.length > 0 && typeof x[0] === "string";
}
function isTextVode(x) {
  return typeof x === "string" || x?.nodeType === Node.TEXT_NODE;
}
function remember(state, present, past) {
  while (typeof present === "function" && !present.__memo) {
    present = present(state);
  }
  if (typeof present !== "function")
    return present;
  const presentMemo = present?.__memo;
  const pastMemo = past?.__memo;
  if (Array.isArray(presentMemo) && Array.isArray(pastMemo) && presentMemo.length === pastMemo.length) {
    let same = true;
    for (let i = 0; i < presentMemo.length; i++) {
      if (presentMemo[i] !== pastMemo[i]) {
        same = false;
        break;
      }
    }
    if (same) return past;
  }
  while (typeof present === "function") {
    present = present(state);
  }
  if (typeof present === "object") {
    present.__memo = presentMemo;
  }
  return present;
}
function patchProperties(s, node, oldProps, newProps, xmlns) {
  if (!newProps && !oldProps) return;
  const xmlMode = xmlns !== void 0;
  if (oldProps) {
    for (const key in oldProps) {
      const oldValue = oldProps[key];
      const newValue = newProps?.[key];
      if (oldValue !== newValue) {
        if (newProps)
          newProps[key] = patchProperty(s, node, key, oldValue, newValue, xmlMode);
        else
          patchProperty(s, node, key, oldValue, void 0, xmlMode);
      }
    }
  }
  if (newProps && oldProps) {
    for (const key in newProps) {
      if (!(key in oldProps)) {
        const newValue = newProps[key];
        newProps[key] = patchProperty(s, node, key, void 0, newValue, xmlMode);
      }
    }
  } else if (newProps) {
    for (const key in newProps) {
      const newValue = newProps[key];
      newProps[key] = patchProperty(s, node, key, void 0, newValue, xmlMode);
    }
  }
}
function patchProperty(s, node, key, oldValue, newValue, xmlMode) {
  if (key === "style") {
    if (!newValue) {
      node.style.cssText = "";
    } else if (typeof newValue === "string") {
      if (oldValue !== newValue) node.style.cssText = newValue;
    } else if (oldValue && typeof oldValue === "object") {
      for (let k in oldValue) {
        const nv = newValue[k];
        if (!nv) {
          node.style[k] = null;
        }
      }
      for (let k in newValue) {
        const ov = oldValue[k];
        const nv = newValue[k];
        if (ov !== nv) {
          node.style[k] = nv;
        }
      }
    } else {
      for (let k in newValue) {
        node.style[k] = newValue[k];
      }
    }
  } else if (key === "class") {
    if (newValue) {
      node.setAttribute("class", classString(newValue));
    } else {
      node.removeAttribute("class");
    }
  } else if (key[0] === "o" && key[1] === "n") {
    if (newValue) {
      let eventHandler = null;
      if (typeof newValue === "function") {
        const action = newValue;
        eventHandler = (evt) => s.patch(action(s, evt));
      } else if (typeof newValue === "object") {
        eventHandler = () => s.patch(newValue);
      }
      node[key] = eventHandler;
    } else {
      node[key] = null;
    }
  } else {
    if (!xmlMode) node[key] = newValue;
    if (newValue === void 0 || newValue === null || newValue === false)
      node.removeAttribute(key);
    else
      node.setAttribute(key, newValue);
  }
  return newValue;
}
function classString(classProp) {
  if (typeof classProp === "string")
    return classProp;
  else if (Array.isArray(classProp))
    return classProp.map(classString).join(" ");
  else if (typeof classProp === "object")
    return Object.keys(classProp).filter((k) => classProp[k]).join(" ");
  else
    return "";
}

// src/vode-tags.ts
var A = "a";
var ARTICLE = "article";
var ASIDE = "aside";
var BR = "br";
var BUTTON = "button";
var DIV = "div";
var FORM = "form";
var H1 = "h1";
var H2 = "h2";
var HEADER = "header";
var IMG = "img";
var INPUT = "input";
var LABEL = "label";
var LI = "li";
var MAIN = "main";
var NAV = "nav";
var P = "p";
var SECTION = "section";
var SPAN = "span";
var STRONG = "strong";
var UL = "ul";
var CIRCLE = "circle";
var SVG = "svg";

// src/merge-class.ts
function mergeClass(...classes) {
  if (!classes || classes.length === 0) return null;
  if (classes.length === 1) return classes[0];
  let finalClass = classes[0];
  for (let index = 1; index < classes.length; index++) {
    const a = finalClass, b = classes[index];
    if (!a) {
      finalClass = b;
    } else if (!b) {
      continue;
    } else if (typeof a === "string" && typeof b === "string") {
      const aSplit = a.split(" ");
      const bSplit = b.split(" ");
      const classSet = /* @__PURE__ */ new Set([...aSplit, ...bSplit]);
      finalClass = Array.from(classSet).join(" ").trim();
    } else if (typeof a === "string" && Array.isArray(b)) {
      const classSet = /* @__PURE__ */ new Set([...b, ...a.split(" ")]);
      finalClass = Array.from(classSet).join(" ").trim();
    } else if (Array.isArray(a) && typeof b === "string") {
      const classSet = /* @__PURE__ */ new Set([...a, ...b.split(" ")]);
      finalClass = Array.from(classSet).join(" ").trim();
    } else if (Array.isArray(a) && Array.isArray(b)) {
      const classSet = /* @__PURE__ */ new Set([...a, ...b]);
      finalClass = Array.from(classSet).join(" ").trim();
    } else if (typeof a === "string" && typeof b === "object") {
      finalClass = { [a]: true, ...b };
    } else if (typeof a === "object" && typeof b === "string") {
      finalClass = { ...a, [b]: true };
    } else if (typeof a === "object" && Array.isArray(b)) {
      const aa = { ...a };
      for (const item of b) {
        aa[item] = true;
      }
      finalClass = aa;
    } else if (Array.isArray(a) && typeof b === "object") {
      const aa = {};
      for (const item of a) {
        aa[item] = true;
      }
      for (const bKey of Object.keys(b)) {
        aa[bKey] = b[bKey];
      }
      finalClass = aa;
    } else if (typeof a === "object" && typeof b === "object") {
      finalClass = { ...a, ...b };
    } else throw new Error(`cannot merge classes of ${a} (${typeof a}) and ${b} (${typeof b})`);
  }
  return finalClass;
}

// src/merge-style.ts
var tempDivForStyling;
function mergeStyle(...props2) {
  if (!tempDivForStyling) {
    tempDivForStyling = document.createElement("div");
  }
  try {
    const merged = tempDivForStyling.style;
    for (const style of props2) {
      if (typeof style === "object" && style !== null) {
        for (const key in style) {
          merged[key] = style[key];
        }
      } else if (typeof style === "string") {
        merged.cssText += ";" + style;
      }
    }
    return merged.cssText;
  } finally {
    tempDivForStyling.style.cssText = "";
  }
}

// src/merge-props.ts
function mergeProps(...props2) {
  if (props2.length === 0) return void 0;
  if (props2.length === 1) return props2[0] || void 0;
  let combined;
  for (const p of props2) {
    if (typeof p !== "object" || p === null) continue;
    if (!combined) combined = {};
    for (const key in p) {
      if (key === "style") {
        combined.style = mergeStyle(combined.style, p.style);
      } else if (key === "class") {
        combined.class = mergeClass(combined.class, p.class);
      } else {
        combined[key] = p[key];
      }
    }
  }
  return combined;
}

// src/state-context.ts
function context(state, producePath) {
  if (producePath) {
    const proxy = producePath(proxyState(state, []));
    const keys = proxy["___KeYs___"];
    return new ProxyStateContextImpl(state, keys);
  }
  return new ProxyStateContextImpl(state, []);
}
var ProxyStateContextImpl = class _ProxyStateContextImpl {
  constructor(state, keys) {
    this.state = state;
    this.keys = keys;
    function putDeep(value, target) {
      if (keys.length > 1) {
        let i = 0;
        let raw = target[keys[i]];
        if (typeof raw !== "object" || raw === null) {
          target[keys[i]] = raw = {};
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
        if (typeof target[keys[0]] === "object" && typeof value === "object" && value !== null) {
          Object.assign(target[keys[0]], value);
        } else {
          target[keys[0]] = value;
        }
      } else {
        Object.assign(target, value);
      }
    }
    function createPatch2(value) {
      const renderPatch = {};
      putDeep(value, renderPatch);
      return renderPatch;
    }
    function get() {
      if (keys.length === 0)
        return state;
      let raw = state ? state[keys[0]] : void 0;
      for (let i = 1; i < keys.length && !!raw; i++) {
        raw = raw[keys[i]];
      }
      return raw;
    }
    function put(value) {
      putDeep(value, state);
    }
    function patch(value, isAsync) {
      if (isAsync) {
        state.patch([createPatch2(value)]);
      } else {
        state.patch(createPatch2(value));
      }
    }
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (prop === "get")
          return get;
        if (prop === "put")
          return put;
        if (prop === "patch")
          return patch;
        const newKeys = [...keys, String(prop)];
        return new _ProxyStateContextImpl(target.state, newKeys);
      },
      set: (target, p, newValue, receiver) => {
        throw new Error("ProxyStateContext is not meant to be directly mutated. Use put() or patch() methods on the StateContext instead");
      }
    });
  }
  state;
  keys;
  get() {
    return void 0;
  }
  put(value) {
  }
  patch(value) {
  }
};
function proxyState(state, keys) {
  return new Proxy(state, {
    get: (target, prop, receiver) => {
      if (prop === "___KeYs___") {
        return keys;
      }
      const newKeys = [...keys, String(prop)];
      return proxyState(state, newKeys);
    },
    set: (target, p, newValue, receiver) => {
      throw new Error("ProxyState is not meant to be directly mutated");
    }
  });
}

// test/mocks.ts
var NodeConstants = {
  ELEMENT_NODE: 1,
  ATTRIBUTE_NODE: 2,
  TEXT_NODE: 3,
  CDATA_SECTION_NODE: 4,
  ENTITY_REFERENCE_NODE: 5,
  ENTITY_NODE: 6,
  PROCESSING_INSTRUCTION_NODE: 7,
  COMMENT_NODE: 8,
  DOCUMENT_NODE: 9,
  DOCUMENT_TYPE_NODE: 10,
  DOCUMENT_FRAGMENT_NODE: 11,
  NOTATION_NODE: 12
};
var FakeNodeList = class {
  data = [];
  constructor() {
    let self = this;
    return new Proxy(this, {
      get(target, prop) {
        const key = typeof prop === "symbol" ? String(prop) : prop;
        if (Number(key) == key && !(prop in target)) {
          return self.data[parseInt(key)];
        }
        return target[prop];
      }
    });
  }
  item(index) {
    return this.data[index] ?? null;
  }
  forEach(callbackfn, thisArg) {
    for (let i = 0; i < this.length; i++) {
      callbackfn.bind(thisArg)(this.data[i], i, this);
    }
  }
  entries() {
    return new Array(this.length).fill(0).map((_, i) => [i, this[i]])[Symbol.iterator]();
  }
  keys() {
    return new Array(this.data.length).fill(0).map((_, i) => i)[Symbol.iterator]();
  }
  values() {
    return new Array(this.data.length).fill(0).map((_, i) => this[i])[Symbol.iterator]();
  }
  [Symbol.iterator]() {
    return new Array(this.data.length).fill(0).map((_, i) => this[i])[Symbol.iterator]();
  }
  get length() {
    return this.data.length;
  }
};
var FakeElement = class {
  constructor(tag2) {
    this.tag = tag2;
    this.tagName = tag2?.toUpperCase() || "???";
  }
  tag;
  fakeAttributes = {};
  nodeType = NodeConstants.ELEMENT_NODE;
  parentElement = null;
  childNodes = new FakeNodeList();
  get children() {
    return this.childNodes;
  }
  style = { cssText: "" };
  tagName;
  get firstChild() {
    return this.childNodes[0] ?? null;
  }
  get lastChild() {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }
  get nextSibling() {
    return null;
  }
  get attributes() {
    return Object.entries(this.fakeAttributes).map(([name, value]) => ({ name, value }));
  }
  hasAttributes() {
    return Object.keys(this.fakeAttributes).length > 0;
  }
  hasChildNodes() {
    return this.childNodes.length > 0;
  }
  setAttribute(name, value) {
    this.fakeAttributes[name] = value;
  }
  removeAttribute(name) {
    delete this.fakeAttributes[name];
  }
  appendChild(child2) {
    this.childNodes.data.push(child2);
    child2.parentElement = this;
    return child2;
  }
  remove() {
    if (this.parentElement) {
      const i = this.parentElement.childNodes.data.indexOf(this);
      if (i >= 0)
        this.parentElement.childNodes.data.splice(i, 1);
    }
  }
  replaceWith(...nodes) {
    const parent = this.parentElement;
    if (parent) {
      const i = parent.childNodes.data.indexOf(this);
      if (i >= 0) {
        parent.childNodes.data.splice(i, 1, ...nodes);
      }
      for (const n of nodes) {
        n.parentElement = parent;
      }
    }
  }
  before(...nodes) {
    const parent = this.parentElement;
    if (parent) {
      const i = parent.childNodes.data.indexOf(this);
      if (i >= 0) {
        for (const n of nodes) {
          if (n === this) continue;
          if (n.parentElement) {
            const ni = n.parentElement.childNodes.data.indexOf(n);
            if (ni >= 0) n.parentElement.childNodes.data.splice(ni, 1);
          }
        }
        const filtered = nodes.filter((n) => n !== this);
        parent.childNodes.data.splice(i, 0, ...filtered);
        for (const n of filtered) {
          n.parentElement = parent;
        }
      }
    }
  }
  get [Symbol.iterator]() {
    return Array.prototype[Symbol.iterator].bind(this.children);
  }
};
var FakeTextNode = class {
  constructor(nodeValue) {
    this.nodeValue = nodeValue;
  }
  nodeValue;
  nodeType = NodeConstants.TEXT_NODE;
  parentElement = null;
  get wholeText() {
    return this.nodeValue;
  }
  remove() {
    if (this.parentElement) {
      const i = this.parentElement.childNodes.data.indexOf(this);
      if (i >= 0)
        this.parentElement.childNodes.data.splice(i, 1);
    }
  }
  replaceWith(...nodes) {
    const parent = this.parentElement;
    if (parent) {
      const i = parent.childNodes.data.indexOf(this);
      if (i >= 0) {
        parent.childNodes.data.splice(i, 1, ...nodes);
      }
      for (const n of nodes) {
        n.parentElement = parent;
      }
    }
  }
  before(...nodes) {
    const parent = this.parentElement;
    if (parent) {
      const i = parent.childNodes.data.indexOf(this);
      if (i >= 0) {
        for (const n of nodes) {
          if (n === this) continue;
          if (n.parentElement) {
            const ni = n.parentElement.childNodes.data.indexOf(n);
            if (ni >= 0) n.parentElement.childNodes.data.splice(ni, 1);
          }
        }
        const filtered = nodes.filter((n) => n !== this);
        parent.childNodes.data.splice(i, 0, ...filtered);
        for (const n of filtered) {
          n.parentElement = parent;
        }
      }
    }
  }
};

// test/helper.ts
var isBrowser = typeof window !== "undefined" && typeof HTMLElement !== "undefined";
function isRealElement(node) {
  return isBrowser && node instanceof HTMLElement;
}
function isRealTextNode(node) {
  return isBrowser && node instanceof Text;
}
var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function retry(fn, waitTime) {
  const { promise, resolve, reject } = Promise.withResolvers();
  function retryInternal(timeLeft) {
    const start = performance.now();
    try {
      const prom = fn();
      if (typeof prom?.then === "function") {
        prom.then(resolve).catch((err) => {
          if (timeLeft >= 0) {
            setTimeout(
              () => retryInternal(timeLeft - (performance.now() - start)),
              10
            );
          } else {
            reject(err);
          }
        });
      } else {
        resolve(prom);
      }
    } catch (err) {
      if (timeLeft >= 0) {
        setTimeout(() => {
          retryInternal(timeLeft - (performance.now() - start));
        }, 10);
      } else {
        reject(err);
      }
    }
  }
  retryInternal(waitTime);
  return promise;
}
var Expectation = class {
  constructor(what) {
    this.what = what;
  }
  what;
  toBeNotHidden() {
    if (document.hidden) {
      throw new ExpectationError(this, `expect the document to be not hidden. if you run this in a real browser this means the window must be in focus in order for the tests to work.`);
    }
  }
  toBeA(type, failMessage) {
    if (typeof this.what !== type) {
      throw new ExpectationError(this, `expected 

typeof ${this.what}

to be 

${type}${failMessage ? `

${failMessage}` : ""}`);
    }
  }
  toBeGreaterThan(other, failMessage) {
    if (!(this.what > other)) {
      throw new ExpectationError(this, `expected 

${this.what}

to be >

${other}${failMessage ? `

${failMessage}` : ""}`);
    }
  }
  toBeGreaterOrEqualThan(other, failMessage) {
    if (!(this.what >= other)) {
      throw new ExpectationError(this, `expected 

${this.what}

to be >= 

${other}${failMessage ? `

${failMessage}` : ""}`);
    }
  }
  toBeSmallerThan(other, failMessage) {
    if (!(this.what < other)) {
      throw new ExpectationError(this, `expected 

${this.what}

to be <

${other}${failMessage ? `

${failMessage}` : ""}`);
    }
  }
  toBeSmallerOrEqual(other, failMessage) {
    if (!(this.what <= other)) {
      throw new ExpectationError(this, `expected 

${this.what}

to be <= 

${other}${failMessage ? `

${failMessage}` : ""}`);
    }
  }
  async toEqual(other, failMessage, waitTimeMs = 100) {
    return await retry(
      async () => {
        const failSuffix = failMessage ? `

${failMessage}` : "";
        function deepCompare(a, b, path) {
          if (typeof a !== typeof b) {
            if (path.length === 0) path.push(``);
            path[path.length - 1] += ` (type: ${typeof a} != ${typeof b})`;
            return path;
          }
          if (typeof a !== "object" || a === null) {
            if (path.length === 0) path.push(``);
            path[path.length - 1] += ` (value: ${a} != ${b})`;
            return a !== b ? path : null;
          }
          for (const prop of Object.entries(a)) {
            const [k, v] = prop;
            const result = deepCompare(v, b[k], [...path, k]);
            if (result) {
              return result;
            }
          }
          for (const prop of Object.entries(b)) {
            const [k, v] = prop;
            const result = deepCompare(a[k], v, [...path, k]);
            if (result) {
              return result;
            }
          }
          return null;
        }
        if (typeof this.what === "object" && typeof other === "object" && this.what !== null && other !== null) {
          const unequal = deepCompare(this.what, other, []);
          if (unequal) {
            throw new ExpectationError(this, `expected 

${JSON.stringify(this.what, null, 2)}

 to equal 

${JSON.stringify(other, null, 2)}

They differ in: ${unequal.join(".")}${failSuffix}`);
          }
        } else {
          if (this.what !== other) {
            throw new ExpectationError(this, `expected (${typeof this.what})

${this.what}

to equal (${typeof other})

${other}${failSuffix}`);
          }
        }
      },
      waitTimeMs
    );
  }
  toSucceed(failMessage) {
    const failSuffix = failMessage ? `

${failMessage}` : "";
    if (typeof this.what !== "function") {
      throw new ExpectationError(this, `expected a function

but it is a ${typeof this.what}${failSuffix}`);
    }
    return this.what();
  }
  toFail(failMessage) {
    const failSuffix = failMessage ? `

${failMessage}` : "";
    if (typeof this.what !== "function") {
      throw new ExpectationError(this, `expected a function

but it is a ${typeof this.what}${failSuffix}`);
    }
    let r;
    try {
      r = this.what();
    } catch (err) {
      return err;
    }
    throw new ExpectationError(this, `expected function to fail

but it succeeded with a result of type ${typeof r}

${r}${failSuffix}`);
  }
  toSucceedAsync(failMessage, waitTime = 100) {
    const failSuffix = failMessage ? `

${failMessage}` : "";
    if (typeof this.what !== "function") {
      throw new ExpectationError(this, `expected a function

but it is a ${typeof this.what}${failSuffix}`);
    }
    return retry(() => this.what(), waitTime);
  }
  async toFailAsync(failMessage) {
    const failSuffix = failMessage ? `

${failMessage}` : "";
    if (typeof this.what !== "function") {
      throw new ExpectationError(this, `expected a function

but it is a ${typeof this.what}${failSuffix}`);
    }
    let r;
    try {
      if (typeof this.what === "function")
        r = await this.what();
      else
        r = await this.what;
    } catch (err) {
      return err;
    }
    throw new ExpectationError(this, `expected function to fail

but it succeeded with a result of type ${typeof r}

${r}${failSuffix}`);
  }
  async toMatch(v, state, failMessage, waitTimeMs = 100) {
    return await retry(
      async () => {
        const failSuffix = failMessage ? `

${failMessage}` : "";
        if (this.what instanceof FakeElement || this.what instanceof FakeTextNode || isRealElement(this.what) || isRealTextNode(this.what) || typeof this.what === "string" || Array.isArray(this.what) || typeof this.what === "function") {
          let deepCompare2 = function(e, cv, path) {
            while (typeof cv === "function") {
              if (!state) {
                throw new ExpectationError(that, `expected at
${path.join(" > ")}

a Component

but got no state passed in [toMatch]${failSuffix}`);
              }
              cv = cv(state);
            }
            while (typeof e === "function") {
              if (!state) {
                throw new ExpectationError(that, `expected at
${path.join(" > ")}

a Component

but got no state passed in [toMatch]${failSuffix}`);
              }
              e = e(state);
            }
            if (typeof cv === "string" && (e instanceof FakeTextNode || isRealTextNode(e))) {
              const text = e instanceof FakeTextNode ? e.wholeText : e.wholeText;
              if (cv !== text) {
                throw new ExpectationError(that, `expected at
${path.join(" > ")}

a text node with
${cv}

but text was
${text}${failSuffix}`);
              }
            } else if (typeof cv === "string" && typeof e === "string") {
              if (cv !== e) {
                throw new ExpectationError(that, `expected at
${path.join(" > ")}

a text node with
${cv}

but text was
${e}${failSuffix}`);
              }
            } else if (Array.isArray(cv) && (e instanceof FakeElement || isRealElement(e))) {
              const tagName = e instanceof FakeElement ? e.tagName : e.tagName;
              if (tag(cv)?.toUpperCase() !== tagName.toUpperCase()) {
                throw new ExpectationError(that, `expected at
${path.join(" > ")}

an element <${tag(cv)?.toUpperCase()}>

but got <${tagName.toUpperCase()}>${failSuffix}`);
              }
              const properties = props(cv);
              if (properties) {
                for (const [k, val] of Object.entries(properties)) {
                  let attributeValue;
                  if (e instanceof FakeElement) {
                    attributeValue = e.fakeAttributes[k] ?? null;
                  } else {
                    attributeValue = e.getAttribute(k);
                  }
                  if (attributeValue === null) {
                    throw new ExpectationError(that, `expected at
${path.join(" > ")}

an element <${tag(cv)?.toUpperCase()}>

with attribute [${k}="${val}"]

but it was not found${failSuffix}`);
                  }
                  if (attributeValue !== val) {
                    throw new ExpectationError(that, `expected at
${path.join(" > ")}

an element <${tag(cv)?.toUpperCase()}>

with attribute [${k}="${val}"]

but it was [${k}="${attributeValue}"]${failSuffix}`);
                  }
                }
              }
              const kids = children(cv) || [];
              const childNodes = e instanceof FakeElement ? e.children : e.childNodes;
              const allKidsAreText = kids.every((k) => typeof k === "string");
              if (allKidsAreText && isBrowser && kids.length > 1) {
                const expectedText = kids.join("");
                const actualText = e.textContent || "";
                if (expectedText !== actualText) {
                  throw new ExpectationError(that, `expected at
${path.join(" > ")}

text content "${expectedText}"

but got "${actualText}"${failSuffix}`);
                }
              } else {
                for (let i = 0; i < kids.length; i++) {
                  const childNode = e instanceof FakeElement ? childNodes.item(i) : childNodes.item(i);
                  deepCompare2(childNode, kids[i], [...path, `[${i}]${tag(kids[i])?.toUpperCase() || "#text"}`]);
                }
                const childCount2 = e instanceof FakeElement ? e.children.length : e.childNodes.length;
                if (kids.length !== childCount2) {
                  throw new ExpectationError(that, `expected at
${path.join(" > ")}

${kids.length} children

but <${tagName.toUpperCase()}> has ${childCount2} children${failSuffix}`);
                }
              }
            } else if (Array.isArray(cv) && Array.isArray(e)) {
              if (tag(cv)?.toUpperCase() !== tag(e)?.toUpperCase()) {
                throw new ExpectationError(that, `expected at
${path.join(" > ")}

a vode [${tag(cv)?.toUpperCase()}]

but got [${tag(e)?.toUpperCase()}]${failSuffix}`);
              }
              const properties = props(cv);
              const otherProperties = props(e) || {};
              if (properties) {
                for (const [k, val] of Object.entries(properties)) {
                  const attributeValue = otherProperties[k];
                  if (!attributeValue) {
                    throw new ExpectationError(that, `expected at
${path.join(" > ")}

a vode [${tag(cv)?.toUpperCase()}]

with attribute [${k}="${val}"]

but it was not found${failSuffix}`);
                  }
                  if (attributeValue !== val) {
                    throw new ExpectationError(that, `expected at
${path.join(" > ")}

a vode [${tag(cv)?.toUpperCase()}]

with attribute [${k}="${val}"]

but its value was [${k}="${attributeValue}"]${failSuffix}`);
                  }
                }
              }
              const kids = children(cv) || [];
              const otherKids = children(e) || [];
              for (let i = 0; i < kids.length; i++) {
                deepCompare2(otherKids[i], kids[i], [...path, `[${i}]${tag(kids[i])?.toUpperCase() || "#text"}`]);
              }
              if (kids.length !== otherKids.length) {
                throw new ExpectationError(that, `expected at
${path.join(" > ")}

${kids.length} children

but [${tag(e)?.toUpperCase()}] has ${otherKids.length} children${failSuffix}`);
              }
            } else if (typeof cv === "string" && (e instanceof FakeElement || isRealElement(e))) {
              const tagName = e instanceof FakeElement ? e.tagName : e.tagName;
              throw new ExpectationError(that, `expected at
${path.join(" > ")}

a text node

but got <${tagName.toUpperCase()}>${failSuffix}`);
            } else if (typeof cv === "string" && Array.isArray(e)) {
              throw new ExpectationError(that, `expected at
${path.join(" > ")}

a text node

but got [${tag(e)?.toUpperCase()}]${failSuffix}`);
            } else if (Array.isArray(cv) && (e instanceof FakeTextNode || isRealTextNode(e))) {
              const text = e instanceof FakeTextNode ? e.wholeText : e.wholeText;
              throw new ExpectationError(that, `expected at
${path.join(" > ")}

an element <${tag(cv)?.toUpperCase()}>

but got #text (${text})${failSuffix}`);
            } else if (Array.isArray(cv) && typeof e === "string") {
              throw new ExpectationError(that, `expected at
${path.join(" > ")}

an element <${tag(cv)?.toUpperCase()}>

but got #text (${e})${failSuffix}`);
            }
            return null;
          };
          var deepCompare = deepCompare2;
          const that = this;
          deepCompare2(this.what, v, [`${tag(v)?.toUpperCase() || "#text"}`]);
        } else {
          throw new ExpectationError(this, `expected an element or text node

but it is a ${typeof this.what}
${this.what}${failSuffix}`);
        }
      },
      waitTimeMs
    );
  }
};
var ExpectationError = class extends Error {
  constructor(expectation, message) {
    super(message);
    this.expectation = expectation;
  }
  expectation;
};
function expect(what) {
  return new Expectation(what);
}

// test/tests-vode.ts
var tests_vode_default = {
  "vode(): passing an already constructed vode returns it": async () => {
    const testVode = [DIV, { class: "test" }, "hello world"];
    await expect(vode(testVode)).toEqual(testVode);
  },
  "vode(): constructing a vode from parts": async () => {
    await expect(
      vode(
        DIV,
        { class: "test" },
        [SPAN, "hello"],
        [STRONG, { style: "color: green" }, "world"]
      )
    ).toEqual(
      [
        DIV,
        { class: "test" },
        [SPAN, "hello"],
        [STRONG, { style: "color: green" }, "world"]
      ]
    );
  },
  "vode(): passing an invalid tag fails": async () => {
    const err = expect(() => vode(null)).toFail();
    await expect(err.message).toEqual("first argument to vode() must be a tag name or a vode");
  }
};

// test/tests-app.ts
var tests_app_default = {
  "app(): successful initialization": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    const patch = expect(
      () => app(
        container,
        {},
        () => [
          DIV,
          [
            ARTICLE,
            [P, "foo", [SPAN, "bar"]]
          ]
        ]
      )
    ).toSucceed();
    expect(patch).toBeA("function");
    await expect(container).toMatch(
      [
        DIV,
        [
          ARTICLE,
          [P, "foo", [SPAN, "bar"]]
        ]
      ]
    );
  },
  //=== FAILURE CASES ===
  "app(): fails when the container has no parent": async () => {
    const container = document.createElement("div");
    const err = expect(() => app(container, {}, () => [DIV])).toFail();
    await expect(err.message).toEqual("first argument to app() must be a valid HTMLElement inside the <html></html> document");
  },
  "app(): fails when the state is not an object": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    const err = expect(() => app(container, "oops", () => [DIV])).toFail();
    await expect(err.message).toEqual("second argument to app() must be a state object");
  },
  "app(): fails when the dom factory is not a function": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    const err = expect(() => app(container, {}, [DIV])).toFail();
    await expect(err.message).toEqual("third argument to app() must be a function that returns a vode");
  },
  //=== INITIAL PATCHES ===
  "app(): executes initial patches after first render": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    const state = { count: 6, start: 1 };
    app(
      container,
      state,
      () => [DIV],
      { count: 7 },
      () => ({ start: 2 })
    );
    await expect(state).toEqual({ count: 7, start: 2 });
  },
  //=== STATE PATCHING ===
  "app(): patch with object updates state and re-renders DOM": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    const state = { msg: "hello" };
    app(container, state, (s) => [DIV, s.msg]);
    await expect(state.msg).toEqual("hello");
    await expect(container).toMatch([DIV, "hello"]);
    state.patch({ msg: "world" });
    await expect(state.msg).toEqual("world");
    await expect(container).toMatch([DIV, "world"]);
  },
  "app(): patch with effect function executes and applies result": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    const state = { count: 0 };
    app(container, state, (s) => [DIV, String(s.count)]);
    state.patch(() => ({ count: 5 }));
    await expect(state.count).toEqual(5);
    await expect(container).toMatch([DIV, "5"]);
  },
  "app(): patch with array applies multiple patches in sequence": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    const state = { a: 1, b: 2 };
    app(container, state, () => [DIV]);
    await state.patch([{ a: 10 }, { b: 20 }]);
    await expect(state).toEqual({ a: 10, b: 20 });
  },
  "app(): multiple sequential patches both apply": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    const state = { x: 0, y: 0 };
    app(container, state, () => [DIV]);
    state.patch({ x: 1 });
    state.patch({ y: 2 });
    await expect(state).toEqual({ x: 1, y: 2 });
  },
  //=== LIFECYCLE ===
  "app(): onMount callback is called on newly created child elements": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    let mountCalled = false;
    app(
      container,
      {},
      () => [
        DIV,
        [SPAN, { onMount: () => {
          mountCalled = true;
          return {};
        } }, "text"]
      ]
    );
    await expect(mountCalled).toEqual(true);
  },
  //=== COMPONENTS ===
  "app(): component function as child renders correctly": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    app(
      container,
      {},
      () => [
        DIV,
        ((s) => [SPAN, "component rendered"])
      ]
    );
    await expect(container).toMatch(
      [DIV, [SPAN, "component rendered"]]
    );
  },
  "app(): component accesses state and renders dynamic content": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    const state = { label: "dynamic" };
    app(
      container,
      state,
      (s) => [
        DIV,
        ((st) => [SPAN, st.label])
      ]
    );
    await expect(container).toMatch([DIV, [SPAN, "dynamic"]]);
  },
  //=== DEEP STATE ===
  "app(): deep nested state merges correctly via patch": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    const state = { nested: { value: 1, other: "keep" } };
    app(container, state, (s) => [DIV, String(s.nested.value)]);
    state.patch({ nested: { value: 2 } });
    await expect(state.nested.value).toEqual(2);
    await expect(state.nested.other).toEqual("keep");
    await expect(container).toMatch([DIV, "2"]);
  },
  //=== IGNORED PATCHES ===
  "app(): patching with ignored types is a no-op": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    const state = { x: 1 };
    app(container, state, () => [DIV]);
    state.patch(null);
    state.patch(void 0);
    state.patch(42);
    state.patch("ignored");
    state.patch(true);
    await expect(state.x).toEqual(1);
  },
  "app(): isolated state of multiple independent vode app instances": async () => {
    const root = document.createElement("div");
    const containerFoo = document.createElement("div");
    root.appendChild(containerFoo);
    const stateFoo = createState({ count: 0 });
    const patchFoo = app(containerFoo, stateFoo, (s) => [
      DIV,
      [P, `App 1 count: ${s.count}`],
      [BUTTON, {
        onclick: () => {
          patchBar({ count: stateBar.count + 1 });
          return { count: s.count + 1 };
        }
      }, "Sync +1"]
    ]);
    const containerBar = document.createElement("div");
    root.appendChild(containerBar);
    const stateBar = createState({ count: 0 });
    const patchBar = app(containerBar, stateBar, (s) => [
      DIV,
      [P, `App 2 count: ${s.count}`]
    ]);
    await expect(containerFoo).toMatch(
      [
        DIV,
        [P, "App 1 count: 0"],
        [BUTTON, "Sync +1"]
      ]
    );
    await expect(containerBar).toMatch(
      [
        DIV,
        [P, "App 2 count: 0"]
      ]
    );
    patchFoo({ count: 5 });
    await expect(containerFoo).toMatch(
      [
        DIV,
        [P, "App 1 count: 5"],
        [BUTTON, "Sync +1"]
      ]
    );
    await expect(containerBar).toMatch(
      [
        DIV,
        [P, "App 2 count: 0"]
      ]
    );
    patchBar({ count: 3 });
    await expect(containerFoo).toMatch(
      [
        DIV,
        [P, "App 1 count: 5"],
        [BUTTON, "Sync +1"]
      ]
    );
    await expect(containerBar).toMatch(
      [
        DIV,
        [P, "App 2 count: 3"]
      ]
    );
    patchBar({ count: 10 });
    await expect(containerBar).toMatch(
      [
        DIV,
        [P, "App 2 count: 10"]
      ]
    );
  },
  "app(): root tag changes between renders": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    const state = createState({ useSection: false });
    const patch = app(
      container,
      state,
      (s) => s.useSection ? [SECTION, "section mode"] : [DIV, "div mode"]
    );
    await expect(container).toMatch([DIV, "div mode"]);
    patch({ useSection: true });
    await expect(root).toMatch([DIV, [SECTION, "section mode"]]);
  },
  "app(): event handler with object patch": () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    const state = { count: 0 };
    app(
      container,
      state,
      (s) => [DIV, { onclick: { count: 42 } }, "click me"]
    );
    const el = container._vode.vode.node;
    expect(el.onclick).toBeA("function");
  },
  "app(): class as array renders correctly": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    app(
      container,
      {},
      () => [DIV, { class: ["foo", "bar", "baz"] }, "text"]
    );
    await expect(container).toMatch([DIV, { class: "foo bar baz" }, "text"]);
  },
  "app(): class as number becomes empty string": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    app(
      container,
      {},
      () => [DIV, { class: 123 }, "text"]
    );
    await expect(container).toMatch([DIV, { class: "" }, "text"]);
  },
  "app(): style object to string transition": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    const state = { useObject: true };
    app(
      container,
      state,
      (s) => [DIV, { style: s.useObject ? { color: "red" } : "color: blue" }, "text"]
    );
    await expect(container).toMatch([DIV, "text"]);
    state.patch({ useObject: false });
    await expect(container).toMatch([DIV, "text"]);
  }
};

// test/tests-defuse.ts
var tests_defuse_default = {
  "defuse(): on a container without _vode is a no-op": () => {
    const container = document.createElement("div");
    expect(() => defuse(container)).toSucceed();
  },
  "defuse(): removes _vode from container": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    app(container, {}, () => [DIV]);
    await expect(typeof container._vode).toEqual("object");
    defuse(container);
    await expect(container._vode).toEqual(void 0);
  },
  "defuse(): removes patch function from state": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    const state = {};
    app(container, state, () => [DIV]);
    await expect(typeof state.patch).toEqual("function");
    defuse(container);
    await expect(state.patch).toEqual(void 0);
  },
  "defuse(): disables renderSync and renderAsync": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    app(container, {}, () => [DIV]);
    defuse(container);
    await expect(container._vode).toEqual(void 0);
  },
  "defuse(): clears event listeners from rendered elements": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    app(container, {}, () => [DIV, { onclick: () => ({}) }]);
    const node = container._vode.vode.node;
    await expect(typeof node.onclick).toEqual("function");
    defuse(container);
    await expect(node.onclick).toEqual(null);
  },
  "defuse(): recurses into child containers": async () => {
    const root = document.createElement("div");
    const outer = document.createElement("div");
    const inner = document.createElement("div");
    root.appendChild(outer);
    outer.appendChild(inner);
    const state = {};
    app(inner, state, () => [DIV]);
    defuse(outer);
    await expect(state.patch).toEqual(void 0);
  },
  "defuse(): clears event listeners from child vodes without _vode": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    app(container, {}, () => [
      DIV,
      { onclick: () => ({}) },
      [DIV, { onclick: () => ({}) }]
    ]);
    const v = container._vode.vode;
    const child1 = v.node;
    const child1onclick = child1.onclick;
    const child2 = v[2].node;
    await expect(typeof child1onclick).toEqual("function");
    await expect(typeof child2.onclick).toEqual("function");
    defuse(container);
    await expect(child1.onclick).toEqual(null);
    await expect(child2.onclick).toEqual(null);
  }
};

// test/tests-hydrate.ts
var tests_hydrate_default = {
  "hydrate(): text node returns its text content": async () => {
    const text = new FakeTextNode("hello world");
    await expect(hydrate(text)).toMatch("hello world");
  },
  "hydrate(): empty element returns a vode": async () => {
    const el = new FakeElement("div");
    const result = hydrate(el);
    await expect(result).toMatch([DIV]);
  },
  "hydrate(): element with children returns full vode tree": async () => {
    const parent = new FakeElement("div");
    const child2 = new FakeElement("span");
    parent.appendChild(child2);
    await expect(hydrate(parent)).toMatch([DIV, [SPAN]]);
  },
  "hydrate(): element with text child": async () => {
    const parent = new FakeElement("p");
    const text = new FakeTextNode("hello");
    parent.appendChild(text);
    await expect(hydrate(parent)).toMatch([P, "hello"]);
  },
  "hydrate(): element with attributes reads them into props": async () => {
    const el = new FakeElement("div");
    el.setAttribute("class", "foo");
    el.setAttribute("id", "bar");
    await expect(hydrate(el)).toMatch([DIV, { class: "foo", id: "bar" }]);
  },
  "hydrate(): unknown node type returns undefined": async () => {
    const frag = { nodeType: 999 };
    await expect(hydrate(frag)).toEqual(void 0);
  },
  "hydrate(): empty text node returns undefined": async () => {
    const text = new FakeTextNode("   ");
    await expect(hydrate(text)).toEqual(void 0);
  },
  "hydrate(): only element and text nodes are supported": async () => {
    const comment = { nodeType: Node.COMMENT_NODE };
    await expect(hydrate(comment)).toEqual(void 0);
  },
  "hydrate(): prepareForRender returns text node for text input": async () => {
    const text = new FakeTextNode("hello");
    const result = hydrate(text, true);
    await expect(result instanceof FakeTextNode).toEqual(true);
    await expect(result.nodeValue).toEqual("hello");
  },
  "hydrate(): prepareForRender attaches .node to element vode": async () => {
    const el = new FakeElement("div");
    const result = hydrate(el, true);
    await expect(Array.isArray(result)).toEqual(true);
    await expect(result[0]).toEqual("div");
    await expect(result.node instanceof FakeElement).toEqual(true);
    await expect(result.node.tagName).toEqual("DIV");
  },
  "hydrate(): prepareForRender removes whitespace text nodes": async () => {
    const el = new FakeElement("div");
    el.appendChild(new FakeTextNode("   "));
    el.appendChild(new FakeElement("span"));
    el.appendChild(new FakeTextNode("  "));
    await expect(el.childNodes.length).toEqual(3);
    const result = hydrate(el, true);
    await expect(el.childNodes.length).toEqual(1);
    await expect(el.childNodes[0].tagName).toEqual("SPAN");
  }
};

// test/tests-memo.ts
var tests_memo_default = {
  "memo(): throws when compare is not an array": async () => {
    const err = expect(() => memo(null, (s) => [DIV])).toFail();
    await expect(err.message).toEqual("first argument to memo() must be an array of values to compare");
  },
  "memo(): throws when componentOrProps is not a function": async () => {
    const err = expect(() => memo([1], null)).toFail();
    await expect(err.message).toEqual("second argument to memo() must be a function that returns a child vode");
  },
  "memo(): integration with app prevents re-render when deps match": async () => {
    const state = createState({ count: 12 });
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    let box = { callCount: 0 };
    app(container, state, (s) => [DIV, memo(
      [s.count],
      (s2) => {
        box.callCount++;
        return [DIV, [SPAN, `${s2.count}`]];
      }
    )]);
    await expect(box).toEqual({ callCount: 1 });
    state.patch({ count: 12 });
    await expect(box).toEqual({ callCount: 1 });
    state.patch({ count: 13 });
    await expect(box).toEqual({ callCount: 2 });
    await expect(container).toMatch(
      [
        DIV,
        [
          DIV,
          [SPAN, "13"]
        ]
      ]
    );
  },
  "memo(): can be used with a nested component function": async () => {
    const state = createState({ count: 12 });
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    let callCount = 0;
    app(container, state, (s) => [
      DIV,
      () => memo(
        [s.count],
        (s2) => {
          callCount++;
          return [DIV, [SPAN, `${s2.count}`]];
        }
      )
    ]);
    await expect(callCount).toEqual(1);
    state.patch({ count: 12 });
    await expect(callCount).toEqual(1);
  },
  "memo(): can be used with the same component function": async () => {
    const state = createState({ test: "foo" });
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    let box = { callCount: 0 };
    const Comp = (s) => {
      box.callCount++;
      return [DIV, [SPAN, s.test]];
    };
    app(container, state, (s) => [
      DIV,
      memo(
        [s.test],
        Comp
      ),
      memo(
        [s.test],
        Comp
      )
    ]);
    await expect(box).toEqual({ callCount: 2 }, "Each memo should call the component function once on initial render, even if they are the same function");
    state.patch({ test: "foo" });
    await expect(box).toEqual({ callCount: 2 }, "Patching with the same value should not cause a re-render");
    state.patch({ test: "bar" });
    await expect(box).toEqual({ callCount: 4 }, "Patching with a different value should cause both memos to re-render, even if they use the same component function");
  },
  "memo(): memo with many item list": () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    const state = createState({ title: "hello", body: "world" });
    const CompMemoList = (s) => [
      DIV,
      { class: "container" },
      [H1, "Hello World"],
      [BR],
      [P, "This is a paragraph."],
      memo(
        [s.title, s.body],
        (s2) => {
          const list = [UL];
          for (let i = 0; i < 1e4; i++) {
            list.push(LI, `Item ${i}`);
          }
          return list;
        }
      )
    ];
    app(container, state, (s) => [
      DIV,
      CompMemoList
    ]);
  },
  "memo(): double-wrapping ignores the inner memo dependencies, only the outer memo is checked": async () => {
    const state = createState({ outer: 1, inner: 1 });
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    let box = { callCount: 0 };
    const comp = (s) => {
      box.callCount++;
      return [DIV, `${s.outer}`];
    };
    const memoed = (s) => memo([s.inner], comp);
    const doubleMemoed = (s) => memo([s.outer], memoed);
    expect(() => app(container, state, () => [DIV, doubleMemoed])).toSucceed();
    await expect(box).toEqual({ callCount: 1 });
    await expect(container).toMatch([DIV, [DIV, "1"]]);
    state.patch({ outer: 2 });
    await expect(box).toEqual({ callCount: 2 });
    state.patch({ inner: 2 });
    await expect(box).toEqual({ callCount: 2 });
    state.patch({ outer: 3 });
    await expect(box).toEqual({ callCount: 3 });
  }
};

// test/tests-createState.ts
var tests_createState_default = {
  "createState(): throws when state is not an object": async () => {
    const err = expect(() => createState(null)).toFail();
    await expect(err.message).toEqual("createState() must be called with a state object");
  },
  "createState(): adds patch function to state": async () => {
    const state = createState({ x: 1 });
    await expect(typeof state.patch).toEqual("function");
    await expect(state).toEqual({ x: 1, patch: state.patch });
  },
  "createState(): patch is non-enumerable": async () => {
    const state = createState({ x: 1 });
    await expect(Object.keys(state)).toEqual(["x"]);
  },
  "createState(): app picks up queued patches": async () => {
    const state = createState({ count: 0 });
    state.patch({ count: 1 });
    state.patch({ count: 2 });
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    app(container, state, () => [DIV]);
    await expect(state.count).toEqual(2);
  },
  "createState(): already-patchable state is kept as-is": async () => {
    const existingPatch = (action) => {
    };
    const state = { value: 5, patch: existingPatch };
    const result = createState(state);
    await expect(result.patch === existingPatch).toEqual(true);
  }
};

// test/tests-createPatch.ts
var tests_createPatch_default = {
  "createPatch(): just returns the input": async () => {
    const p = { a: 123 };
    await expect(createPatch(p) === p).toEqual(true);
  },
  "createPatch(): returns undefined as-is": async () => {
    await expect(createPatch(void 0)).toEqual(void 0);
  },
  "createPatch(): returns null as-is": async () => {
    await expect(createPatch(null)).toEqual(null);
  },
  "createPatch(): returns function as-is": async () => {
    const fn = () => ({});
    await expect(createPatch(fn) === fn).toEqual(true);
  },
  "createPatch(): returns primitive as-is": async () => {
    await expect(createPatch(42)).toEqual(42);
    await expect(createPatch("ignored")).toEqual("ignored");
    await expect(createPatch(false)).toEqual(false);
  }
};

// test/tests-tag.ts
var tests_tag_default = {
  "tag(): on a vode returns the tag name": async () => {
    await expect(tag([DIV])).toEqual("div");
  },
  "tag(): on a vode with props and children": async () => {
    await expect(tag([DIV, { class: "foo" }, [SPAN, "hi"]])).toEqual("div");
  },
  "tag(): on a text vode (string) returns undefined": async () => {
    await expect(tag("hello")).toEqual(void 0);
  },
  "tag(): on falsy values returns undefined": async () => {
    await expect(tag(null)).toEqual(void 0);
    await expect(tag(void 0)).toEqual(void 0);
  },
  "tag(): on no-vode values returns undefined": async () => {
    await expect(tag(0)).toEqual(void 0);
    await expect(tag(true)).toEqual(void 0);
  },
  "tag(): on empty array returns undefined": async () => {
    await expect(tag([])).toEqual(void 0);
  }
};

// test/tests-children.ts
var tests_children_default = {
  "children(): tag+props+children returns children array": async () => {
    const v = [DIV, { class: "x" }, [SPAN, "a"], [P, "b"]];
    const c = children(v);
    await expect(Array.isArray(c)).toEqual(true);
    await expect(c.length).toEqual(2);
  },
  "children(): tag+children (no props) returns children array": async () => {
    const v = [DIV, [SPAN, "a"], [P, "b"]];
    const c = children(v);
    await expect(Array.isArray(c)).toEqual(true);
    await expect(c.length).toEqual(2);
  },
  "children(): just-tag vode returns null": async () => {
    await expect(children([DIV])).toEqual(void 0);
  },
  "children(): text vode returns null": async () => {
    await expect(children("hello")).toEqual(void 0);
  },
  "childrenStart(): with props+children returns 2": async () => {
    await expect(childrenStart([DIV, { class: "x" }, [SPAN]])).toEqual(2);
  },
  "childrenStart(): without props but with children returns 1": async () => {
    await expect(childrenStart([DIV, [SPAN]])).toEqual(1);
  },
  "childrenStart(): just-tag returns -1": async () => {
    await expect(childrenStart([DIV])).toEqual(-1);
  },
  "childrenStart(): text vode returns -1": async () => {
    await expect(childrenStart("hello")).toEqual(-1);
  },
  "childCount(): matches actual child count": async () => {
    await expect(childCount([DIV, { class: "x" }, [SPAN, "a"], [P, "b"]])).toEqual(2);
    await expect(childCount([DIV, [SPAN]])).toEqual(1);
  },
  "childCount(): returns 0 for no-children vode": async () => {
    await expect(childCount([DIV])).toEqual(0);
    await expect(childCount("hello")).toEqual(0);
  },
  "child(): returns correct child at index": async () => {
    const v = [DIV, { class: "x" }, [SPAN, "a"], [P, "b"]];
    await expect(child(v, 0)).toEqual([SPAN, "a"]);
    await expect(child(v, 1)).toEqual([P, "b"]);
  },
  "child(): returns undefined for out-of-bounds": async () => {
    await expect(child([DIV, { class: "x" }, [SPAN]], 5)).toEqual(void 0);
  },
  "child(): returns undefined for text vode": async () => {
    await expect(child("hello", 0)).toEqual(void 0);
  }
};

// test/tests-props.ts
var tests_props_default = {
  "props(): on vode with props returns props object": async () => {
    await expect(props([DIV, { class: "foo" }, "hello"])).toEqual({ class: "foo" });
  },
  "props(): on just-tag vode returns undefined": async () => {
    await expect(props([DIV])).toEqual(void 0);
  },
  "props(): on text vode returns undefined": async () => {
    await expect(props("hello")).toEqual(void 0);
  },
  "props(): on vode where second element is an array (child) returns undefined": async () => {
    await expect(props([DIV, [SPAN]])).toEqual(void 0);
  },
  "props(): on vode where second element is null returns undefined": async () => {
    await expect(props([DIV, null, "hi"])).toEqual(void 0);
  },
  "props(): on falsy input returns undefined": async () => {
    await expect(props(null)).toEqual(void 0);
    await expect(props(void 0)).toEqual(void 0);
  },
  "props(): on vode with length 1 returns undefined": async () => {
    await expect(props([DIV])).toEqual(void 0);
  }
};

// test/tests-mergeClass.ts
var tests_mergeClass_default = {
  "mergeClass(): no args returns null": async () => {
    await expect(mergeClass()).toEqual(null);
  },
  "mergeClass(): single string returns it": async () => {
    await expect(mergeClass("foo")).toEqual("foo");
  },
  "mergeClass(): two strings are joined and deduplicated": async () => {
    await expect(mergeClass("foo", "bar")).toEqual("foo bar");
    await expect(mergeClass("foo bar", "bar baz")).toEqual("foo bar baz");
  },
  "mergeClass(): string and array": async () => {
    await expect(mergeClass("foo", ["bar", "baz"])).toEqual("bar baz foo");
  },
  "mergeClass(): array and string": async () => {
    await expect(mergeClass(["foo", "bar"], "baz")).toEqual("foo bar baz");
  },
  "mergeClass(): two arrays": async () => {
    await expect(mergeClass(["foo", "bar"], ["baz", "qux"])).toEqual("foo bar baz qux");
  },
  "mergeClass(): two string arrays with duplicates": async () => {
    await expect(mergeClass(["foo", "bar"], ["bar", "baz"])).toEqual("foo bar baz");
  },
  "mergeClass(): string and object": async () => {
    await expect(mergeClass("foo", { bar: true, baz: false })).toEqual({ foo: true, bar: true, baz: false });
  },
  "mergeClass(): object and string": async () => {
    await expect(mergeClass({ foo: true, bar: false }, "baz")).toEqual({ foo: true, bar: false, baz: true });
  },
  "mergeClass(): two objects": async () => {
    await expect(mergeClass({ foo: true, bar: true }, { bar: false, baz: true })).toEqual({ foo: true, bar: false, baz: true });
  },
  "mergeClass(): object and array (array items become class names with true)": async () => {
    await expect(mergeClass({ foo: true }, ["bar", "baz"])).toEqual({ foo: true, bar: true, baz: true });
    await expect(mergeClass({ active: true }, ["btn", "primary"])).toEqual({ active: true, btn: true, primary: true });
  },
  "mergeClass(): array and object (object keys become class names)": async () => {
    await expect(mergeClass(["foo", "bar"], { baz: true, qux: false })).toEqual({ foo: true, bar: true, baz: true, qux: false });
    await expect(mergeClass(["a", "b"], { c: true, d: false })).toEqual({ a: true, b: true, c: true, d: false });
  },
  "mergeClass(): falsy entries are skipped": async () => {
    await expect(mergeClass("foo", null, "bar")).toEqual("foo bar");
    await expect(mergeClass(null, "foo", void 0, "bar")).toEqual("foo bar");
  },
  "mergeClass(): multiple args (3+)": async () => {
    await expect(mergeClass("a", "b", "c")).toEqual("a b c");
    await expect(mergeClass("x", null, ["y", "z"], "w")).toEqual("y z x w");
  },
  "mergeClass(): incompatible types throw": async () => {
    await expect(() => mergeClass(123, "foo")).toFail();
    await expect(() => mergeClass("foo", 456)).toFail();
  }
};

// test/tests-mergeStyle.ts
function normalizeStyle(s) {
  return s.replace(/;\s*/g, ";").replace(/:\s*/g, ":").replace(/^;/, "").replace(/;$/, "").toLowerCase();
}
function hasStyle(result, prop, value) {
  const normalized = normalizeStyle(result);
  return normalized.includes(`${prop}:${value}`.toLowerCase());
}
var tests_mergeStyle_default = {
  "mergeStyle(): no args returns empty string": async () => {
    await expect(mergeStyle()).toEqual("");
  },
  "mergeStyle(): object style sets properties, returns cssText": async () => {
    const result = mergeStyle({ color: "red", fontSize: "14px" });
    await expect(typeof result).toEqual("string");
  },
  "mergeStyle(): single string includes the style": async () => {
    const result = mergeStyle("color: red");
    await expect(hasStyle(result, "color", "red")).toEqual(true);
  },
  "mergeStyle(): two strings are concatenated": async () => {
    const result = mergeStyle("color: red", "font-size: 14px");
    await expect(hasStyle(result, "color", "red")).toEqual(true);
    await expect(hasStyle(result, "font-size", "14px")).toEqual(true);
  },
  "mergeStyle(): object then string": async () => {
    const result = mergeStyle({ color: "red" }, "font-size: 14px");
    await expect(hasStyle(result, "font-size", "14px")).toEqual(true);
  },
  "mergeStyle(): null and undefined entries are skipped": async () => {
    const result = mergeStyle(null, "color: red", void 0);
    await expect(hasStyle(result, "color", "red")).toEqual(true);
  },
  "mergeStyle(): multiple objects and strings alternate": async () => {
    const result = mergeStyle(
      { color: "red" },
      "font-size: 14px",
      { background: "blue" }
    );
    await expect(hasStyle(result, "font-size", "14px")).toEqual(true);
  }
};

// test/tests-mergeProps.ts
var tests_mergeProps_default = {
  "mergeProps(): no args returns undefined": async () => {
    await expect(mergeProps()).toEqual(void 0);
  },
  "mergeProps(): single arg returned as-is": async () => {
    const p = { class: "foo" };
    await expect(mergeProps(p) === p).toEqual(true);
  },
  "mergeProps(): single falsy arg returns undefined": async () => {
    await expect(mergeProps(null)).toEqual(void 0);
    await expect(mergeProps(void 0)).toEqual(void 0);
  },
  "mergeProps(): two plain objects merged": async () => {
    await expect(mergeProps({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  },
  "mergeProps(): right overwrites left for simple keys": async () => {
    await expect(mergeProps({ a: 1, b: "x" }, { b: 2 })).toEqual({ a: 1, b: 2 });
  },
  "mergeProps(): class merged via mergeClass": async () => {
    await expect(mergeProps({ class: "foo" }, { class: "bar" })).toEqual({ class: "foo bar" });
  },
  "mergeProps(): style merged via mergeStyle (strings)": async () => {
    const result = mergeProps({ style: "color: red" }, { style: "font-size: 14px" });
    await expect(result.style.includes("color: red")).toEqual(true);
    await expect(result.style.includes("font-size: 14px")).toEqual(true);
  },
  "mergeProps(): null and undefined entries skipped": async () => {
    await expect(mergeProps({ a: 1 }, null, { b: 2 }, void 0)).toEqual({ a: 1, b: 2 });
  },
  "mergeProps(): multiple args (3+)": async () => {
    await expect(mergeProps({ a: 1 }, { b: 2 }, { c: 3 })).toEqual({ a: 1, b: 2, c: 3 });
  },
  "mergeProps(): first arg null returns defined from later args": async () => {
    await expect(mergeProps(null, { a: 1 })).toEqual({ a: 1 });
  }
};

// test/tests-state-context.ts
var tests_state_context_default = {
  "context(s)...get(): returns whole state": async () => {
    const state = createState({ a: 1, b: 2 });
    const ctx = context(state);
    await expect(ctx.get()).toEqual({ a: 1, b: 2 });
  },
  "context(s)...get(): deep nested": async () => {
    const state = createState({ a: { b: { c: 42 } } });
    const ctx = context(state);
    await expect(ctx.a.b.c.get()).toEqual(42);
  },
  "context(s)...get(): missing nested path returns undefined": async () => {
    const state = createState({ a: {} });
    const ctx = context(state);
    await expect(ctx.a.b.get()).toEqual(void 0);
  },
  "context(s)...put(): silently mutates state": async () => {
    const state = createState({ a: { b: 1 } });
    const ctx = context(state);
    ctx.a.b.put(2);
    await expect(state.a.b).toEqual(2);
  },
  "context(s)...put(): on nested object replaces the sub-object": async () => {
    const state = createState({ a: { b: { x: 1, y: 2 } } });
    const ctx = context(state);
    ctx.a.b.put({ y: 99 });
    await expect(state.a.b).toEqual({ y: 99 });
  },
  "context(s)...put(): at root level with empty keys": async () => {
    const state = createState({ a: 1, b: 2 });
    const ctx = context(state);
    ctx.put({ b: void 0 });
    await expect(state).toEqual({ a: 1 });
  },
  "context(s)...patch(): calls state.patch with proper deep partial": async () => {
    const state = createState({ a: { b: 1 } });
    const ctx = context(state);
    ctx.a.b.patch(2);
    const patches = state.patch.initialPatches;
    await expect(patches.length).toEqual(1);
    await expect(patches[0]).toEqual({ a: { b: 2 } });
  },
  "context(s)...patch(): async wraps in array": async () => {
    const state = createState({ a: { b: 1 } });
    const ctx = context(state);
    ctx.a.b.patch(2, true);
    const patches = state.patch.initialPatches;
    await expect(patches.length).toEqual(1);
    await expect(Array.isArray(patches[0])).toEqual(true);
    await expect(patches[0][0]).toEqual({ a: { b: 2 } });
  },
  "context(s)...patch(): on nested deep path three levels": async () => {
    const state = createState({ x: { y: { z: 0 } } });
    const ctx = context(state);
    ctx.x.y.z.patch(100);
    const patches = state.patch.initialPatches;
    await expect(patches.length).toEqual(1);
    await expect(patches[0]).toEqual({ x: { y: { z: 100 } } });
  },
  "context(s)...put(): with intermediate null creates objects along the path": async () => {
    const state = createState({ a: null });
    const ctx = context(state);
    ctx.a.b.put(42);
    await expect(state.a?.b).toEqual(42);
    ctx.a.put(null);
    await expect(state.a).toEqual(null);
    await expect(state.a?.b).toEqual(void 0);
  },
  "context(s)...put(): with three-level intermediate null": async () => {
    const state = createState({ a: null });
    const ctx = context(state);
    ctx.a.b.c.put(99);
    await expect(state.a?.b.c).toEqual(99);
  },
  "context(s)...put(): with multiple intermediate nulls": async () => {
    const state = createState({ a: { x: null, y: 1 } });
    const ctx = context(state);
    ctx.a.x.z.put("deep");
    await expect(state.a.x?.z).toEqual("deep");
    await expect(state.a.y).toEqual(1);
  },
  "context(s)...put(): merges into existing object properties via Object.assign": async () => {
    const state = createState({ items: { count: 0, name: "test", hidden: false } });
    const ctx = context(state);
    ctx.items.put({ count: 5 });
    await expect(state.items).toEqual({ count: 5, name: "test", hidden: false });
  },
  "context(state, s => s).get(): returns whole state": async () => {
    const state = createState({ a: 1, b: 2 });
    const ctx = context(state, (s) => s);
    await expect(ctx.get()).toEqual({ a: 1, b: 2 });
  },
  "context(state, s => s.a.b.c).get(): deep nested": async () => {
    const state = createState({ a: { b: { c: 42 } } });
    const ctx = context(state, (s) => s.a.b.c);
    await expect(ctx.get()).toEqual(42);
  },
  "context(state, s => s.a.b).get(): missing nested path returns undefined": async () => {
    const state = createState({ a: {} });
    const ctx = context(state, (s) => s.a.b);
    await expect(ctx.get()).toEqual(void 0);
  },
  "context(state, s => s.a.b).put(): silently mutates state": async () => {
    const state = createState({ a: { b: 1 } });
    const ctx = context(state, (s) => s.a.b);
    ctx.put(2);
    await expect(state.a.b).toEqual(2);
  },
  "context(state, s => s.a.b).put(): on nested object replaces the sub-object": async () => {
    const state = createState({ a: { b: { x: 1, y: 2 } } });
    const ctx = context(state, (s) => s.a.b);
    ctx.put({ y: 99 });
    await expect(state.a.b).toEqual({ y: 99 });
  },
  "context(state, s => s).put(): at root level with empty keys": async () => {
    const state = createState({ a: 1, b: 2 });
    const ctx = context(state, (s) => s);
    ctx.put({ b: void 0 });
    await expect(state).toEqual({ a: 1 });
  },
  "context(state, s => s.a.b).patch(): calls state.patch with proper deep partial": async () => {
    const state = createState({ a: { b: 1 } });
    const ctx = context(state, (s) => s.a.b);
    ctx.patch(2);
    const patches = state.patch.initialPatches;
    await expect(patches.length).toEqual(1);
    await expect(patches[0]).toEqual({ a: { b: 2 } });
  },
  "context(state, s => s.a.b).patch(): async wraps in array": async () => {
    const state = createState({ a: { b: 1 } });
    const ctx = context(state, (s) => s.a.b);
    ctx.patch(2, true);
    const patches = state.patch.initialPatches;
    await expect(patches.length).toEqual(1);
    await expect(Array.isArray(patches[0])).toEqual(true);
    await expect(patches[0][0]).toEqual({ a: { b: 2 } });
  },
  "context(state, s => s.x.y.z).patch(): on nested deep path three levels": async () => {
    const state = createState({ x: { y: { z: 0 } } });
    const ctx = context(state, (s) => s.x.y.z);
    ctx.patch(100);
    const patches = state.patch.initialPatches;
    await expect(patches.length).toEqual(1);
    await expect(patches[0]).toEqual({ x: { y: { z: 100 } } });
  },
  "context(state, s => s.x).y.z: continue proxy sub-state targeting": async () => {
    const state = createState({ x: { y: { z: 0 } } });
    const ctx = context(state, (s) => s.x).y.z;
    ctx.patch(100);
    const patches = state.patch.initialPatches;
    await expect(patches.length).toEqual(1);
    await expect(patches[0]).toEqual({ x: { y: { z: 100 } } });
  },
  "context(state, s => s.a.b).put(): with intermediate null creates objects": async () => {
    const state = createState({ a: null });
    const ctx = context(state, (s) => s.a.b);
    ctx.put(42);
    await expect(state.a?.b).toEqual(42);
  },
  "context(state, s => s.a.b.c).put(): with three-level intermediate null": async () => {
    const state = createState({ a: null });
    const ctx = context(state, (s) => s.a.b.c);
    ctx.put(99);
    await expect(state.a?.b.c).toEqual(99);
  },
  "context(state, s => s.a.x.z).put(): with multiple intermediate nulls": async () => {
    const state = createState({ a: { x: null, y: 1 } });
    const ctx = context(state, (s) => s.a.x.z);
    ctx.put("deep");
    await expect(state.a.x?.z).toEqual("deep");
    await expect(state.a.y).toEqual(1);
  },
  "context(state, s => s.items).put(): merges into existing object properties via Object.assign": async () => {
    const state = createState({ items: { count: 0, name: "test", hidden: false } });
    const ctx = context(state, (s) => s.items);
    ctx.put({ count: 5 });
    await expect(state.items).toEqual({ count: 5, name: "test", hidden: false });
  },
  "context(state, s => s.get|put|patch...): 'get','put','patch' as intermediate properties without conflict": async () => {
    const state = createState({
      endpoints: {
        get: { count: 1 },
        put: { count: 2 },
        patch: { count: 3 }
      }
    });
    const getCtx = context(state, (s) => s.endpoints.get);
    await expect(getCtx.get()).toEqual({ count: 1 });
    const putCtx = context(state, (s) => s.endpoints.put);
    putCtx.put({ count: 99 });
    await expect(state.endpoints.put).toEqual({ count: 99 });
    const patchCtx = context(state, (s) => s.endpoints.patch);
    patchCtx.patch({ count: 42 });
    const patches = state.patch.initialPatches;
    await expect(patches[0]).toEqual({ endpoints: { patch: { count: 42 } } });
  }
};

// test/tests-mount-unmount.ts
function setup() {
  const root = document.createElement("div");
  const container = document.createElement("div");
  root.appendChild(container);
  return container;
}
var tests_mount_unmount_default = {
  "onMount(): called when node is attached to the DOM": async () => {
    const container = setup();
    let mountCalled = false;
    app(
      container,
      {},
      () => [
        DIV,
        [
          ARTICLE,
          {
            onMount: (s, ele) => {
              if (ele.tagName !== "ARTICLE") throw new ExpectationError(expect(ele), `Expected ARTICLE, got ${ele.tagName}`);
              mountCalled = true;
            }
          },
          [P, "foo", [SPAN, "bar"]]
        ]
      ]
    );
    await expect(mountCalled).toEqual(true);
  },
  "onMount(): called in order of child nodes first, then parent onMounts": async () => {
    const container = setup();
    const mounts = [];
    app(
      container,
      {},
      () => [
        DIV,
        [
          ARTICLE,
          {
            onMount: (s, ele) => {
              mounts.push("mount outer");
            }
          },
          [
            P,
            {
              onMount: (s, ele) => {
                mounts.push("mount inner");
              }
            },
            "foo",
            [SPAN, "bar"]
          ]
        ]
      ]
    );
    await expect(mounts).toEqual(["mount inner", "mount outer"]);
  },
  "onMount(): deep nesting 4+ levels with onMount at each level": async () => {
    const container = setup();
    const mounts = [];
    app(
      container,
      {},
      () => [
        DIV,
        [
          NAV,
          {
            onMount: (s, ele) => {
              mounts.push("mount nav");
            }
          },
          [
            MAIN,
            {
              onMount: (s, ele) => {
                mounts.push("mount main");
              }
            },
            [
              SECTION,
              {
                onMount: (s, ele) => {
                  mounts.push("mount section");
                }
              },
              [
                ARTICLE,
                {
                  onMount: (s, ele) => {
                    mounts.push("mount article");
                  }
                },
                [P, "deep text"]
              ]
            ]
          ]
        ]
      ]
    );
    await expect(mounts).toEqual([
      "mount article",
      "mount section",
      "mount main",
      "mount nav"
    ]);
  },
  "onMount(): multiple siblings with onMount on initial render": async () => {
    const container = setup();
    const mounts = [];
    app(
      container,
      {},
      () => [
        DIV,
        [
          P,
          {
            onMount: (s, ele) => {
              mounts.push("mount p");
            }
          },
          "first"
        ],
        [
          SPAN,
          {
            onMount: (s, ele) => {
              mounts.push("mount span");
            }
          },
          "second"
        ]
      ]
    );
    await expect(mounts).toEqual(["mount p", "mount span"]);
  },
  "onMount(): A->A path - onMount added during update does NOT fire": async () => {
    const container = setup();
    const mounts = [];
    const state = createState({ addMount: false });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        [
          P,
          s.addMount ? {
            onMount: (s2, ele) => {
              mounts.push("mount p");
            }
          } : {},
          "text"
        ]
      ]
    );
    await expect(mounts).toEqual([]);
    patch({ addMount: true });
    await expect(mounts).toEqual([]);
  },
  "onMount(): A->A path - onMount removed during update does not cause issues": async () => {
    const container = setup();
    const mounts = [];
    const state = createState({ removeMount: false });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        [
          P,
          s.removeMount ? {} : {
            onMount: (s2, ele) => {
              mounts.push("mount p");
            }
          },
          "text"
        ]
      ]
    );
    await expect(mounts).toEqual(["mount p"]);
    patch({ removeMount: true });
    await expect(mounts).toEqual(["mount p"]);
  },
  "onMount(): A->A path - onMount changed during update does NOT fire the new one": async () => {
    const container = setup();
    const mounts = [];
    const state = createState({ version: "a" });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        [
          P,
          {
            onMount: s.version === "a" ? (s2, ele) => {
              mounts.push("mount a");
            } : (s2, ele) => {
              mounts.push("mount b");
            }
          },
          "text"
        ]
      ]
    );
    await expect(mounts).toEqual(["mount a"]);
    patch({ version: "b" });
    await expect(mounts).toEqual(["mount a"]);
  },
  "onMount(): A->B path - element replaced with different tag fires new onMount": async () => {
    const container = setup();
    const mounts = [];
    const state = createState({ showArticle: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.showArticle ? [
          ARTICLE,
          {
            onMount: (s2, ele) => {
              mounts.push("mount article");
            }
          },
          [P, "text"]
        ] : [
          ASIDE,
          {
            onMount: (s2, ele) => {
              mounts.push("mount aside");
            }
          },
          [P, "text"]
        ]
      ]
    );
    await expect(mounts).toEqual(["mount article"]);
    patch({ showArticle: false });
    await expect(mounts).toEqual(["mount article", "mount aside"]);
  },
  "onMount(): A->B path - swap back fires the other element's onMount": async () => {
    const container = setup();
    const mounts = [];
    const state = createState({ showArticle: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.showArticle ? [
          ARTICLE,
          {
            onMount: (s2, ele) => {
              mounts.push("mount article");
            }
          },
          [P, "text"]
        ] : [
          ASIDE,
          {
            onMount: (s2, ele) => {
              mounts.push("mount aside");
            }
          },
          [P, "text"]
        ]
      ]
    );
    await expect(mounts).toEqual(["mount article"]);
    patch({ showArticle: false });
    await expect(mounts).toEqual(["mount article", "mount aside"]);
    patch({ showArticle: true });
    await expect(mounts).toEqual(["mount article", "mount aside", "mount article"]);
    patch({ showArticle: false });
    await expect(mounts).toEqual([
      "mount article",
      "mount aside",
      "mount article",
      "mount aside"
    ]);
  },
  "onMount(): A->B path - children's onMounts also fire in new tree": async () => {
    const container = setup();
    const mounts = [];
    const state = createState({ showArticle: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.showArticle ? [
          ARTICLE,
          [
            P,
            {
              onMount: (s2, ele) => {
                mounts.push("mount p");
              }
            },
            [SPAN, "nested"]
          ]
        ] : [
          ASIDE,
          [
            DIV,
            {
              onMount: (s2, ele) => {
                mounts.push("mount div");
              }
            },
            "replacement"
          ]
        ]
      ]
    );
    await expect(mounts).toEqual(["mount p"]);
    patch({ showArticle: false });
    await expect(mounts).toEqual(["mount p", "mount div"]);
  },
  "onMount(): text -> element fires new element's onMount": async () => {
    const container = setup();
    const mounts = [];
    const state = createState({ showElement: false });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.showElement ? [
          ARTICLE,
          {
            onMount: (s2, ele) => {
              mounts.push("mount article");
            }
          },
          [P, "foo"]
        ] : "plain text"
      ]
    );
    await expect(mounts).toEqual([]);
    patch({ showElement: true });
    await expect(mounts).toEqual(["mount article"]);
  },
  "onMount(): mixed onMount presence in tree": async () => {
    const container = setup();
    const mounts = [];
    app(
      container,
      {},
      () => [
        DIV,
        [
          SECTION,
          {
            onMount: (s, ele) => {
              mounts.push("mount section");
            }
          },
          [
            ARTICLE,
            [
              P,
              {
                onMount: (s, ele) => {
                  mounts.push("mount p");
                }
              },
              "foo"
            ],
            [
              ASIDE,
              [SPAN, "bar"]
            ]
          ]
        ]
      ]
    );
    await expect(mounts).toEqual(["mount p", "mount section"]);
  },
  "onMount(): sibling subtree depths fire in correct order": async () => {
    const container = setup();
    const mounts = [];
    app(
      container,
      {},
      () => [
        DIV,
        [
          SECTION,
          [
            DIV,
            {
              onMount: (s, ele) => {
                mounts.push("mount div");
              }
            },
            [
              P,
              {
                onMount: (s, ele) => {
                  mounts.push("mount p-deep");
                }
              },
              "deep"
            ]
          ],
          [
            NAV,
            {
              onMount: (s, ele) => {
                mounts.push("mount nav");
              }
            },
            "shallow"
          ]
        ]
      ]
    );
    await expect(mounts).toEqual([
      "mount p-deep",
      "mount div",
      "mount nav"
    ]);
  },
  "onMount(): added children from count increase fire onMount": async () => {
    const container = setup();
    const mounts = [];
    const state = createState({ count: 1 });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        [
          SECTION,
          s.count >= 1 && [P, { onMount: (s2, ele) => {
            mounts.push("mount p0");
          } }, "item 0"],
          s.count >= 2 && [P, { onMount: (s2, ele) => {
            mounts.push("mount p1");
          } }, "item 1"],
          s.count >= 3 && [P, { onMount: (s2, ele) => {
            mounts.push("mount p2");
          } }, "item 2"]
        ]
      ]
    );
    await expect(mounts).toEqual(["mount p0"]);
    patch({ count: 2 });
    await expect(mounts).toEqual(["mount p0", "mount p1"]);
    patch({ count: 3 });
    await expect(mounts).toEqual(["mount p0", "mount p1", "mount p2"]);
  },
  "onMount(): conditional child fires onMount when added": async () => {
    const container = setup();
    const mounts = [];
    const state = createState({ show: false });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        [
          P,
          "static",
          s.show && [
            SPAN,
            {
              onMount: (s2, ele) => {
                mounts.push("mount span");
              }
            },
            "conditional"
          ]
        ]
      ]
    );
    await expect(mounts).toEqual([]);
    patch({ show: true });
    await expect(mounts).toEqual(["mount span"]);
  },
  "onMount(): with catched component, replacement vode's onMount fires when error occurs": async () => {
    const container = setup();
    const mounts = [];
    const broken = () => {
      throw new Error("boom");
    };
    app(
      container,
      {},
      () => [
        DIV,
        {
          catch: [
            SECTION,
            {
              onMount: (s, ele) => {
                mounts.push("mount fallback");
              }
            },
            "fallback"
          ]
        },
        broken
      ]
    );
    await expect(mounts).toEqual(["mount fallback"]);
  },
  "onMount(): with catched component, returned vode's onMount fires and receives error": async () => {
    const container = setup();
    const mounts = [];
    const caughtErrors = [];
    const broken = () => {
      throw new Error("boom");
    };
    app(
      container,
      {},
      () => [
        DIV,
        {
          catch: (s, err) => {
            caughtErrors.push(err.message);
            return [
              SECTION,
              {
                onMount: (s2, ele) => {
                  mounts.push("mount fallback");
                }
              },
              "fallback"
            ];
          }
        },
        broken
      ]
    );
    await expect(mounts).toEqual(["mount fallback"]);
    await expect(caughtErrors).toEqual(["boom"]);
  },
  "onMount(): with catched component, original element's onMount does NOT fire when error caused replacement": async () => {
    const container = setup();
    const logs = [];
    const broken = () => {
      throw new Error("boom");
    };
    app(
      container,
      {},
      () => [
        DIV,
        {
          catch: [
            ARTICLE,
            {
              onMount: (s, ele) => {
                logs.push("mount fallback");
              }
            },
            "fallback"
          ]
        },
        [
          SECTION,
          {
            onMount: (s, ele) => {
              logs.push("mount original section");
            },
            onUnmount: (s, ele) => {
              logs.push("unmount original section");
            }
          },
          broken
        ]
      ]
    );
    await expect(logs).toEqual(["mount fallback"]);
  },
  "onUnmount(): called when node is removed from the DOM": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ showArticle: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.showArticle && [
          ARTICLE,
          {
            onUnmount: (s2, ele) => {
              unmounts.push("unmount article");
            }
          },
          [P, "foo", [SPAN, "bar"]]
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ showArticle: false });
    await expect(unmounts).toEqual(["unmount article"]);
  },
  "onUnmount(): called for all child nodes that have registerd when parent node is removed from the DOM": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ showArticle: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.showArticle && [
          ARTICLE,
          {
            onUnmount: (s2, ele) => {
              unmounts.push("unmount outer");
            }
          },
          [
            P,
            {
              onUnmount: (s2, ele) => {
                unmounts.push("unmount inner");
              }
            },
            "foo",
            [SPAN, "bar"]
          ]
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ showArticle: false });
    await expect(unmounts).toEqual(["unmount inner", "unmount outer"]);
  },
  "onUnmount(): A->A path - onUnmount added during update fires on later removal": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ toggle: false, remove: false });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        !s.remove && [
          SECTION,
          s.toggle ? {
            onUnmount: (s2, ele) => {
              unmounts.push("unmount section");
            }
          } : {},
          [P, {
            onUnmount: s.toggle && ((s2, ele) => {
              unmounts.push("unmount p");
            })
          }, "text"]
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    let before = container._vode.stats.syncRenderCount;
    patch({ toggle: true });
    await expect(() => expect(container._vode.stats.syncRenderCount).toBeGreaterThan(before)).toSucceedAsync();
    await expect(unmounts).toEqual([]);
    before = container._vode.stats.syncRenderCount;
    patch({ remove: true });
    await expect(() => expect(container._vode.stats.syncRenderCount).toBeGreaterThan(before)).toSucceedAsync();
    await expect(unmounts).toEqual(["unmount p", "unmount section"]);
  },
  "onUnmount(): A->A path - onUnmount removed during update does not fire": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ toggle: false, remove: false });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        !s.remove && [
          SECTION,
          !s.toggle && {
            onUnmount: (s2, ele) => {
              unmounts.push("unmount section");
            }
          },
          [P, "text"]
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ remove: true, toggle: false });
    await expect(unmounts).toEqual([]);
  },
  "onUnmount(): A->A path - onUnmount changed during update fires the new one": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ version: "a", remove: false });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        !s.remove && [
          SECTION,
          {
            onUnmount: s.version === "a" ? (s2, ele) => {
              unmounts.push("unmount a");
            } : (s2, ele) => {
              unmounts.push("unmount b");
            }
          },
          [P, "text"]
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    const before = container._vode.stats.syncRenderCount;
    patch({ version: "b" });
    await expect(async () => await expect(container._vode.stats.syncRenderCount).toBeGreaterThan(before)).toSucceedAsync();
    await expect(unmounts).toEqual([]);
    patch({ remove: true });
    await expect(unmounts).toEqual(["unmount b"]);
  },
  "onUnmount(): A->B path - element replaced with different tag fires old onUnmount": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ showArticle: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.showArticle ? [
          ARTICLE,
          {
            onUnmount: (s2, ele) => {
              unmounts.push("unmount article");
            }
          },
          [P, "text"]
        ] : [
          ASIDE,
          {
            onUnmount: (s2, ele) => {
              unmounts.push("unmount aside");
            }
          },
          [P, "text"]
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ showArticle: false });
    await expect(unmounts).toEqual(["unmount article"]);
  },
  "onUnmount(): A->B path - swap back fires the other element's onUnmount": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ showArticle: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.showArticle ? [
          ARTICLE,
          {
            onUnmount: (s2, ele) => {
              unmounts.push("unmount article");
            }
          },
          [P, "text"]
        ] : [
          ASIDE,
          {
            onUnmount: (s2, ele) => {
              unmounts.push("unmount aside");
            }
          },
          [P, "text"]
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ showArticle: false });
    await expect(unmounts).toEqual(["unmount article"]);
    unmounts.length = 0;
    patch({ showArticle: true });
    await expect(unmounts).toEqual(["unmount aside"]);
    unmounts.length = 0;
    patch({ showArticle: false });
    await expect(unmounts).toEqual(["unmount article"]);
  },
  "onUnmount(): A->B path - replaced element's children onUnmounts also fire": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ showArticle: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.showArticle ? [
          ARTICLE,
          {
            onUnmount: (s2, ele) => {
              unmounts.push("unmount article");
            }
          },
          [
            P,
            {
              onUnmount: (s2, ele) => {
                unmounts.push("unmount p");
              }
            },
            "foo"
          ]
        ] : [
          ASIDE,
          {
            onUnmount: (s2, ele) => {
              unmounts.push("unmount aside");
            }
          },
          [SPAN, "bar"]
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ showArticle: false });
    await expect(unmounts).toEqual(["unmount p", "unmount article"]);
  },
  "onUnmount(): element -> text fires onUnmount": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ showElement: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.showElement ? [
          ARTICLE,
          {
            onUnmount: (s2, ele) => {
              unmounts.push("unmount article");
            }
          },
          [P, "foo"]
        ] : "plain text"
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ showElement: false });
    await expect(unmounts).toEqual(["unmount article"]);
  },
  "onUnmount(): text -> element registers onUnmount that fires later": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ showElement: false, remove: false });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.remove ? void 0 : s.showElement ? [
          ARTICLE,
          {
            onUnmount: (s2, ele) => {
              unmounts.push("unmount article");
            }
          },
          [P, "foo"]
        ] : "plain text"
      ]
    );
    await expect(unmounts).toEqual([]);
    const before = container._vode.stats.syncRenderCount;
    patch({ showElement: true });
    await expect(() => expect(container._vode.stats.syncRenderCount).toBeGreaterThan(before)).toSucceedAsync();
    await expect(unmounts).toEqual([]);
    patch({ remove: true });
    await expect(unmounts).toEqual(["unmount article"]);
  },
  "onUnmount(): deep nesting 4+ levels with onUnmount at each level": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ show: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.show && [
          NAV,
          {
            onUnmount: (s2, ele) => {
              unmounts.push("unmount nav");
            }
          },
          [
            MAIN,
            {
              onUnmount: (s2, ele) => {
                unmounts.push("unmount main");
              }
            },
            [
              SECTION,
              {
                onUnmount: (s2, ele) => {
                  unmounts.push("unmount section");
                }
              },
              [
                ARTICLE,
                {
                  onUnmount: (s2, ele) => {
                    unmounts.push("unmount article");
                  }
                },
                [P, "deep text"]
              ]
            ]
          ]
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ show: false });
    await expect(unmounts).toEqual([
      "unmount article",
      "unmount section",
      "unmount main",
      "unmount nav"
    ]);
  },
  "onUnmount(): multiple siblings - remove one fires only that sibling's subtree": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ showFirst: true, showSecond: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.showFirst && [
          ARTICLE,
          {
            onUnmount: (s2, ele) => {
              unmounts.push("unmount first");
            }
          },
          [
            P,
            {
              onUnmount: (s2, ele) => {
                unmounts.push("unmount first-child");
              }
            },
            "a"
          ]
        ],
        s.showSecond && [
          ASIDE,
          {
            onUnmount: (s2, ele) => {
              unmounts.push("unmount second");
            }
          },
          [
            SPAN,
            {
              onUnmount: (s2, ele) => {
                unmounts.push("unmount second-child");
              }
            },
            "b"
          ]
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ showFirst: false });
    await expect(unmounts).toEqual(["unmount first-child", "unmount first"]);
  },
  "onUnmount(): multiple siblings - remove parent fires all": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ show: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.show && [
          SECTION,
          [
            ARTICLE,
            {
              onUnmount: (s2, ele) => {
                unmounts.push("unmount first");
              }
            },
            [P, "a"]
          ],
          [
            ASIDE,
            {
              onUnmount: (s2, ele) => {
                unmounts.push("unmount second");
              }
            },
            [SPAN, "b"]
          ]
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ show: false });
    await expect(unmounts).toEqual(["unmount second", "unmount first"]);
  },
  "onUnmount(): stale children cleanup - fewer new children than old fires removed children's onUnmounts": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ count: 3 });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        [
          SECTION,
          s.count >= 1 && [P, { onUnmount: (s2, ele) => {
            unmounts.push("unmount p0");
          } }, "item 0"],
          s.count >= 2 && [P, { onUnmount: (s2, ele) => {
            unmounts.push("unmount p1");
          } }, "item 1"],
          s.count >= 3 && [P, { onUnmount: (s2, ele) => {
            unmounts.push("unmount p2");
          } }, "item 2"]
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ count: 1 });
    await expect(unmounts).toEqual(["unmount p1", "unmount p2"]);
  },
  "onUnmount(): mixed onUnmount presence in tree - only elements with onUnmount fire": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ show: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.show && [
          SECTION,
          {
            onUnmount: (s2, ele) => {
              unmounts.push("unmount section");
            }
          },
          [
            ARTICLE,
            [
              P,
              {
                onUnmount: (s2, ele) => {
                  unmounts.push("unmount p");
                }
              },
              "foo"
            ],
            [
              ASIDE,
              [SPAN, "bar"]
            ]
          ]
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ show: false });
    await expect(unmounts).toEqual(["unmount p", "unmount section"]);
  },
  "onUnmount(): sibling ordering - sibling subtree depths": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ show: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.show && [
          SECTION,
          [
            DIV,
            {
              onUnmount: (s2, ele) => {
                unmounts.push("unmount div");
              }
            },
            [
              P,
              {
                onUnmount: (s2, ele) => {
                  unmounts.push("unmount p-deep");
                }
              },
              "deep"
            ]
          ],
          [
            NAV,
            {
              onUnmount: (s2, ele) => {
                unmounts.push("unmount nav");
              }
            },
            "shallow"
          ]
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ show: false });
    await expect(unmounts).toEqual(["unmount nav", "unmount p-deep", "unmount div"]);
  },
  "onUnmount(): A->A path - children's unmounts shift when previous sibling's subtree changes": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ showExtraChild: true, remove: false });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        !s.remove && [
          SECTION,
          [
            P,
            {
              onUnmount: (s2, ele) => {
                unmounts.push("unmount p-first");
              }
            },
            s.showExtraChild && [
              SPAN,
              {
                onUnmount: (s2, ele) => {
                  unmounts.push("unmount span");
                }
              },
              "extra"
            ],
            "static"
          ],
          [
            ASIDE,
            {
              onUnmount: (s2, ele) => {
                unmounts.push("unmount aside");
              }
            },
            "text"
          ]
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ showExtraChild: false });
    await expect(unmounts).toEqual(["unmount span"]);
    patch({ remove: true });
    await expect(unmounts).toEqual([
      "unmount span",
      "unmount aside",
      "unmount p-first"
    ]);
  },
  "onUnmount(): root element replacement fires root's onUnmount": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ showDiv: true });
    const patch = app(
      container,
      state,
      (s) => s.showDiv ? [
        DIV,
        {
          onUnmount: (s2, ele) => {
            unmounts.push("unmount div");
          }
        },
        [P, "text"]
      ] : [
        ARTICLE,
        {
          onUnmount: (s2, ele) => {
            unmounts.push("unmount article");
          }
        },
        [SPAN, "other"]
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ showDiv: false });
    await expect(unmounts).toEqual(["unmount div"]);
  },
  "onUnmount(): child onUnmount fires when element is falsified after onUnmount was added via A->A update": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ addUnmount: false, show: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.show && [
          ARTICLE,
          s.addUnmount ? {
            onUnmount: (s2, ele) => {
              unmounts.push("unmount article");
            }
          } : {},
          [P, "foo"]
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    const before = container._vode.stats.syncRenderCount;
    patch({ addUnmount: true });
    await expect(async () => await expect(container._vode.stats.syncRenderCount).toEqual(before + 1)).toSucceedAsync();
    await expect(unmounts).toEqual([]);
    patch({ show: false });
    await expect(unmounts).toEqual(["unmount article"]);
  },
  "onUnmount(): A->B path - onUnmount from old children fire when switching tags": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ showArticle: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.showArticle ? [
          ARTICLE,
          [
            P,
            {
              onUnmount: (s2, ele) => {
                unmounts.push("unmount p-inner");
              }
            },
            [SPAN, "nested"]
          ]
        ] : [
          ASIDE,
          [
            DIV,
            {
              onUnmount: (s2, ele) => {
                unmounts.push("unmount div-inner");
              }
            },
            "replacement"
          ]
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ showArticle: false });
    await expect(unmounts).toEqual(["unmount p-inner"]);
  },
  "onUnmount(): memo hit + earlier sibling growth corrupts unmount indices": async () => {
    const container = setup();
    const fired = [];
    const state = createState({ expanded: false, showB: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        [
          SPAN,
          {
            onUnmount: (s2, ele) => {
              fired.push("unmount A");
            }
          },
          s.expanded && [
            ASIDE,
            {
              onUnmount: (s2, ele) => {
                fired.push("unmount A-child");
              }
            },
            "x"
          ]
        ],
        s.showB && memo([], () => [
          SECTION,
          {
            onUnmount: (s2, ele) => {
              fired.push("unmount B");
            }
          }
        ])
      ]
    );
    await expect(fired).toEqual([]);
    patch({ expanded: true });
    await expect(fired).toEqual([]);
    patch({ showB: false });
    await expect(fired).toEqual(["unmount B"]);
  },
  "onUnmount(): excess child removal + same-render sibling growth": async () => {
    const container = setup();
    const fired = [];
    const state = createState({ expanded: false, showB: true });
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        [
          SPAN,
          {
            onUnmount: (s2, ele) => {
              fired.push("unmount A");
            }
          },
          s.expanded && [
            ASIDE,
            {
              onUnmount: (s2, ele) => {
                fired.push("unmount A-child");
              }
            },
            "x"
          ]
        ],
        s.showB && [
          P,
          {
            onUnmount: (s2, ele) => {
              fired.push("unmount B");
            }
          }
        ]
      ]
    );
    await expect(fired).toEqual([]);
    patch({ expanded: true, showB: false });
    await expect(fired).toEqual(["unmount B"]);
  },
  "onUnmount(): with catched component, replacement vode's onUnmount fires when removed": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ show: true });
    const broken = () => {
      throw new Error("boom");
    };
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.show && [
          SECTION,
          {
            catch: [
              ARTICLE,
              {
                onUnmount: (s2, ele) => {
                  unmounts.push("unmount fallback");
                }
              },
              "fallback"
            ]
          },
          broken
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ show: false });
    await expect(unmounts).toEqual(["unmount fallback"]);
  },
  "onUnmount(): with catched component, deep replacement tree fires in post-order": async () => {
    const container = setup();
    const unmounts = [];
    const state = createState({ show: true });
    const broken = () => {
      throw new Error("boom");
    };
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.show && [
          SECTION,
          {
            catch: [
              ARTICLE,
              {
                onUnmount: (s2, ele) => {
                  unmounts.push("unmount article");
                }
              },
              [
                P,
                {
                  onUnmount: (s2, ele) => {
                    unmounts.push("unmount p");
                  }
                },
                "x"
              ],
              [
                SPAN,
                {
                  onUnmount: (s2, ele) => {
                    unmounts.push("unmount span");
                  }
                },
                "y"
              ]
            ]
          },
          broken
        ]
      ]
    );
    await expect(unmounts).toEqual([]);
    patch({ show: false });
    await expect(unmounts).toEqual(["unmount span", "unmount p", "unmount article"]);
  },
  "onMount() + onUnmount(): with catched component, full lifecycle symmetry of catch replacement": async () => {
    const container = setup();
    const logs = [];
    const state = createState({ show: true });
    const broken = () => {
      throw new Error("boom");
    };
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        s.show && [
          SECTION,
          {
            catch: [
              ARTICLE,
              {
                onMount: (s2, ele) => {
                  logs.push("mount article");
                },
                onUnmount: (s2, ele) => {
                  logs.push("unmount article");
                }
              },
              "fallback"
            ]
          },
          broken
        ]
      ]
    );
    await expect(logs).toEqual(["mount article"]);
    patch({ show: false });
    await expect(logs).toEqual(["mount article", "unmount article"]);
  },
  "onMount() + onUnmount: symmetry of calls": async () => {
    const container = setup();
    const state = createState({
      startTime: 0,
      inputReady: false,
      showInput: true,
      showTimer: true
    });
    const logs = [];
    const patch = app(
      container,
      state,
      (s) => {
        return [
          DIV,
          s.showInput && [INPUT, {
            type: "text",
            placeholder: "Auto-focused on mount",
            onMount: (s2, ele) => {
              logs.push("Input mounted");
              return { inputReady: true };
            },
            onUnmount: (s2, ele) => {
              logs.push("Input removed");
              return { inputReady: false };
            }
          }],
          s.showTimer && [P, {
            onMount: (s2, ele) => {
              logs.push("Timer started");
              return { startTime: Date.now() };
            },
            onUnmount: (s2, ele) => {
              logs.push("Timer removed");
            }
          }, "Mount/unmount lifecycle demo"]
        ];
      }
    );
    await expect(state.inputReady).toEqual(true);
    await expect(state.startTime != 0).toEqual(true);
    patch({ showInput: false });
    await expect(
      async () => await expect(state.inputReady).toEqual(false, "expected: inputReady == false")
    ).toSucceedAsync();
    patch({ showTimer: false });
    await expect(
      async () => await expect(container._vode.stats.syncRenderCount >= 4).toEqual(true)
    ).toSucceedAsync();
    await expect(logs).toEqual([
      "Input mounted",
      "Timer started",
      "Input removed",
      "Timer removed"
    ]);
  },
  "onMount() + onUnmount(): Not called when DOM does not require element creation or removal (same TAGs)": async () => {
    const container = setup();
    const logs = [];
    const Comp = (name) => () => [
      ARTICLE,
      [
        DIV,
        {
          onMount: () => logs.push("mount " + name),
          onUnmount: () => logs.push("unmount " + name)
        },
        "Component " + name
      ]
    ];
    const state = createState({ showB: false, showD: false });
    app(container, state, (s) => [
      DIV,
      // this way they both "share a slot"
      s.showB ? Comp("B") : Comp("A"),
      // this way each component occupies its own "slot"
      !s.showD && Comp("C"),
      s.showD && Comp("D")
    ]);
    await expect(container).toMatch(
      [
        DIV,
        [
          ARTICLE,
          [DIV, "Component A"]
        ],
        [
          ARTICLE,
          [DIV, "Component C"]
        ]
      ]
    );
    await expect(logs).toEqual(["mount A", "mount C"]);
    state.patch({ showB: true });
    await expect(container).toMatch(
      [
        DIV,
        [
          ARTICLE,
          [DIV, "Component B"]
        ],
        [
          ARTICLE,
          [DIV, "Component C"]
        ]
      ]
    );
    await expect(logs).toEqual(["mount A", "mount C"]);
    state.patch({ showD: true });
    await expect(container).toMatch(
      [
        DIV,
        [
          ARTICLE,
          [DIV, "Component B"]
        ],
        [
          ARTICLE,
          [DIV, "Component D"]
        ]
      ]
    );
    await expect(logs).toEqual([
      "mount A",
      "mount C",
      "unmount C",
      "mount D"
    ]);
  }
};

// test/tests-examples.ts
function setup2() {
  const root = document.createElement("div");
  const container = document.createElement("div");
  root.appendChild(container);
  return container;
}
var tests_examples_default = {
  "Example 1: Counter - increment/reset buttons, basic state patching": async () => {
    const container = setup2();
    const state = createState({ count: 0 });
    app(container, state, (s) => [
      DIV,
      [H1, `Count: ${s.count}`],
      [BUTTON, { onclick: () => ({ count: s.count + 1 }) }, "Increment"],
      [BUTTON, { onclick: () => ({ count: 0 }), disabled: s.count === 0 }, "Reset"]
    ]);
    await expect(container).toMatch(
      [
        DIV,
        [H1, "Count: 0"],
        [BUTTON, "Increment"],
        [BUTTON, "Reset"]
      ]
    );
    state.patch({ count: 1 });
    await expect(container).toMatch(
      [
        DIV,
        [H1, "Count: 1"],
        [BUTTON, "Increment"],
        [BUTTON, "Reset"]
      ]
    );
    state.patch({ count: 0 });
    await expect(state.count).toEqual(0);
    await expect(container).toMatch(
      [
        DIV,
        [H1, "Count: 0"],
        [BUTTON, "Increment"],
        [BUTTON, "Reset"]
      ]
    );
  },
  "Example 2: Todo List with State Context - nested state via context(), list rendering": async () => {
    const container = setup2();
    const state = createState({
      todos: {
        items: [
          { id: 1, text: "Buy milk", done: false },
          { id: 2, text: "Walk dog", done: true },
          { id: 3, text: "Read book", done: false }
        ],
        filter: "all",
        newTodo: ""
      }
    });
    app(container, state, (s) => {
      const filtered = s.todos.items.filter((item) => {
        if (s.todos.filter === "active") return !item.done;
        if (s.todos.filter === "done") return item.done;
        return true;
      });
      return [
        DIV,
        [H1, "Todos"],
        [INPUT, { type: "text", value: s.todos.newTodo }],
        [BUTTON, "Add"],
        [
          NAV,
          [BUTTON, { class: { active: s.todos.filter === "all" } }, "All"],
          [BUTTON, { class: { active: s.todos.filter === "active" } }, "Active"],
          [BUTTON, { class: { active: s.todos.filter === "done" } }, "Done"]
        ],
        [
          UL,
          ...filtered.map((item) => [LI, item.done ? `[X] ${item.text}` : `[ ] ${item.text}`])
        ]
      ];
    });
    await expect(container).toMatch(
      [
        DIV,
        [H1, "Todos"],
        [INPUT],
        [BUTTON, "Add"],
        [
          NAV,
          [BUTTON, { class: "active" }, "All"],
          [BUTTON, "Active"],
          [BUTTON, "Done"]
        ],
        [
          UL,
          [LI, "[ ] Buy milk"],
          [LI, "[X] Walk dog"],
          [LI, "[ ] Read book"]
        ]
      ]
    );
    state.patch({ todos: { filter: "active" } });
    await expect(state.todos.filter).toEqual("active");
    await expect(state.todos.items.length).toEqual(3);
    await expect(container).toMatch(
      [
        DIV,
        [H1, "Todos"],
        [INPUT],
        [BUTTON, "Add"],
        [
          NAV,
          [BUTTON, "All"],
          [BUTTON, { class: "active" }, "Active"],
          [BUTTON, "Done"]
        ],
        [
          UL,
          [LI, "[ ] Buy milk"],
          [LI, "[ ] Read book"]
        ]
      ]
    );
    state.patch({ todos: { filter: "done" } });
    await expect(container).toMatch(
      [
        DIV,
        [H1, "Todos"],
        [INPUT],
        [BUTTON, "Add"],
        [
          NAV,
          [BUTTON, "All"],
          [BUTTON, "Active"],
          [BUTTON, { class: "active" }, "Done"]
        ],
        [
          UL,
          [LI, "[X] Walk dog"]
        ]
      ]
    );
    state.patch({ todos: { filter: "all" } });
    await expect(state.todos.items.length).toEqual(3);
  },
  "Example 3: Data Fetching - loading/error/success state machine with ternary branches": async () => {
    const container = setup2();
    const state = createState({
      fetch: {
        status: "loading",
        result: null,
        error: null
      }
    });
    app(container, state, (s) => {
      return [
        DIV,
        s.fetch.status === "loading" ? [P, "Loading..."] : s.fetch.status === "error" ? [DIV, { class: "error" }, [P, "Error: ", s.fetch.error]] : [DIV, { class: "success" }, [P, "Result: ", s.fetch.result]],
        s.fetch.status !== "loading" && [BUTTON, "Fetch"],
        s.fetch.status === "error" && [BUTTON, "Retry"]
      ];
    });
    await expect(container).toMatch(
      [
        DIV,
        [P, "Loading..."]
      ]
    );
    state.patch({ fetch: { status: "success", result: "Fetched data" } });
    await expect(container).toMatch(
      [
        DIV,
        [
          DIV,
          { class: "success" },
          [P, "Result: ", "Fetched data"]
        ],
        [BUTTON, "Fetch"]
      ]
    );
    state.patch({ fetch: { status: "error", error: "Network error", result: null } });
    await expect(container).toMatch(
      [
        DIV,
        [
          DIV,
          { class: "error" },
          [P, "Error: ", "Network error"]
        ],
        [BUTTON, "Fetch"],
        [BUTTON, "Retry"]
      ]
    );
  },
  "Example 4: Tabbed Panel - tab switching via conditional rendering": async () => {
    const container = setup2();
    const state = createState({
      ui: {
        activeTab: "home"
      }
    });
    app(container, state, (s) => {
      const ctx2 = context(s).ui;
      return [
        DIV,
        [
          NAV,
          { class: "tabs" },
          [BUTTON, { class: { active: s.ui.activeTab === "home" } }, "Home"],
          [BUTTON, { class: { active: s.ui.activeTab === "settings" } }, "Settings"],
          [BUTTON, { class: { active: s.ui.activeTab === "profile" } }, "Profile"]
        ],
        [
          MAIN,
          s.ui.activeTab === "home" ? [SECTION, { class: "tab-content" }, [H2, "Home"], [P, "Welcome home!"]] : s.ui.activeTab === "settings" ? [SECTION, { class: "tab-content" }, [H2, "Settings"], [P, "Adjust your settings here."]] : [SECTION, { class: "tab-content" }, [H2, "Profile"], [P, "Manage your profile."]]
        ]
      ];
    });
    await expect(container).toMatch(
      [
        DIV,
        [
          NAV,
          { class: "tabs" },
          [BUTTON, "Home"],
          [BUTTON, "Settings"],
          [BUTTON, "Profile"]
        ],
        [
          MAIN,
          [
            SECTION,
            { class: "tab-content" },
            [H2, "Home"],
            [P, "Welcome home!"]
          ]
        ]
      ]
    );
    const ctx = context(state).ui;
    ctx.activeTab.patch("settings");
    await expect(container).toMatch(
      [
        DIV,
        [
          NAV,
          { class: "tabs" },
          [BUTTON, "Home"],
          [BUTTON, "Settings"],
          [BUTTON, "Profile"]
        ],
        [
          MAIN,
          [
            SECTION,
            { class: "tab-content" },
            [H2, "Settings"],
            [P, "Adjust your settings here."]
          ]
        ]
      ]
    );
    ctx.activeTab.patch("profile");
    await expect(container).toMatch(
      [
        DIV,
        [
          NAV,
          { class: "tabs" },
          [BUTTON, "Home"],
          [BUTTON, "Settings"],
          [BUTTON, "Profile"]
        ],
        [
          MAIN,
          [
            SECTION,
            { class: "tab-content" },
            [H2, "Profile"],
            [P, "Manage your profile."]
          ]
        ]
      ]
    );
  },
  "Example 5: Form Validation - live input validation with conditional error display": async () => {
    const container = setup2();
    const state = createState({
      form: {
        email: "",
        password: "",
        errors: {},
        submitted: false
      }
    });
    app(container, state, (s) => {
      return [
        DIV,
        s.form.submitted ? [P, { class: "success" }, "Form submitted successfully!"] : [
          FORM,
          [LABEL, "Email:"],
          [INPUT, { type: "email", value: s.form.email }],
          s.form.errors.email && [P, { class: "error" }, s.form.errors.email],
          [LABEL, "Password:"],
          [INPUT, { type: "password", value: s.form.password }],
          s.form.errors.password && [P, { class: "error" }, s.form.errors.password],
          [INPUT, { type: "submit", value: "Submit" }]
        ]
      ];
    });
    await expect(container).toMatch(
      [
        DIV,
        [
          FORM,
          [LABEL, "Email:"],
          [INPUT],
          [LABEL, "Password:"],
          [INPUT],
          [INPUT]
        ]
      ],
      state,
      "failed to create initial form"
    );
    state.patch({
      form: {
        email: "invalid email",
        errors: { email: "Email must contain @" }
      }
    });
    await expect(container).toMatch(
      [
        DIV,
        [
          FORM,
          [LABEL, "Email:"],
          [INPUT, { type: "email", value: "invalid email" }],
          [P, { class: "error" }, "Email must contain @"],
          [LABEL, "Password:"],
          [INPUT],
          [INPUT]
        ]
      ],
      state,
      "failed to patch invalid email error"
    );
    state.patch({
      form: {
        email: "user@ryupold.de",
        password: "123",
        errors: {
          email: void 0,
          password: "Password must be at least 6 characters"
        }
      }
    });
    await expect(container).toMatch(
      [
        DIV,
        [
          FORM,
          [LABEL, "Email:"],
          [INPUT],
          [LABEL, "Password:"],
          [INPUT],
          [P, { class: "error" }, "Password must be at least 6 characters"],
          [INPUT]
        ]
      ],
      state,
      "failed to patch invalid password error"
    );
    state.patch({
      form: {
        password: "secure123",
        errors: { password: void 0 }
      }
    });
    await expect(container).toMatch(
      [
        DIV,
        [
          FORM,
          [LABEL, "Email:"],
          [INPUT],
          [LABEL, "Password:"],
          [INPUT],
          [INPUT]
        ]
      ],
      state,
      "failed to patch valid password and clear error"
    );
  },
  "Example 6: Component Composition - nested components with dynamic props": async () => {
    const container = setup2();
    const state = createState({
      theme: "light",
      user: {
        name: "Alice",
        role: "Admin"
      }
    });
    const Badge = (s) => [SPAN, { class: `badge badge-${s.theme}` }, s.user.name];
    const Card = (s) => [
      SECTION,
      { class: `card card-${s.theme}` },
      [H2, "User Info"],
      [P, `Name: ${s.user.name}`],
      [P, `Role: ${s.user.role}`]
    ];
    const Header = (s) => [
      HEADER,
      { class: `header header-${s.theme}` },
      [H1, "App"],
      Badge
    ];
    app(container, state, (s) => [
      DIV,
      Header,
      [MAIN, Card],
      [BUTTON, {
        onclick: () => ({ theme: s.theme === "light" ? "dark" : "light" })
      }, "Toggle Theme"]
    ]);
    await expect(container).toMatch(
      [
        DIV,
        [
          HEADER,
          { class: "header header-light" },
          [H1, "App"],
          [SPAN, { class: "badge badge-light" }, "Alice"]
        ],
        [
          MAIN,
          [
            SECTION,
            { class: "card card-light" },
            [H2, "User Info"],
            [P, "Name: Alice"],
            [P, "Role: Admin"]
          ]
        ],
        [BUTTON, "Toggle Theme"]
      ]
    );
    state.patch({ theme: "dark" });
    await expect(container).toMatch(
      [
        DIV,
        [
          HEADER,
          { class: "header header-dark" },
          [H1, "App"],
          [SPAN, { class: "badge badge-dark" }, "Alice"]
        ],
        [
          MAIN,
          [
            SECTION,
            { class: "card card-dark" },
            [H2, "User Info"],
            [P, "Name: Alice"],
            [P, "Role: Admin"]
          ]
        ],
        [BUTTON, "Toggle Theme"]
      ]
    );
    state.patch({ user: { name: "Bob", role: "User" } });
    await expect(state.user.name).toEqual("Bob");
    await expect(state.user.role).toEqual("User");
    await expect(container).toMatch(
      [
        DIV,
        [
          HEADER,
          { class: "header header-dark" },
          [H1, "App"],
          [SPAN, { class: "badge badge-dark" }, "Bob"]
        ],
        [
          MAIN,
          [
            SECTION,
            { class: "card card-dark" },
            [H2, "User Info"],
            [P, "Name: Bob"],
            [P, "Role: User"]
          ]
        ],
        [BUTTON, "Toggle Theme"]
      ]
    );
  },
  "Example 7: Multi-Context - multiple independent state contexts": async () => {
    const container = setup2();
    const state = createState({
      panelA: {
        count: 0,
        label: "Panel A"
      },
      panelB: {
        count: 0,
        label: "Panel B"
      }
    });
    app(container, state, (s) => {
      const ctxA2 = context(s).panelA;
      const ctxB2 = context(s).panelB;
      return [
        DIV,
        [
          SECTION,
          { class: "panel-a" },
          [H2, ctxA2.label.get()],
          [P, `Count: ${s.panelA.count}`],
          [BUTTON, "Increment A"]
        ],
        [
          SECTION,
          { class: "panel-b" },
          [H2, ctxB2.label.get()],
          [P, `Count: ${s.panelB.count}`],
          [BUTTON, "Increment B"]
        ]
      ];
    });
    await expect(container).toMatch(
      [
        DIV,
        [
          SECTION,
          { class: "panel-a" },
          [H2, "Panel A"],
          [P, "Count: 0"],
          [BUTTON, "Increment A"]
        ],
        [
          SECTION,
          { class: "panel-b" },
          [H2, "Panel B"],
          [P, "Count: 0"],
          [BUTTON, "Increment B"]
        ]
      ]
    );
    const ctxA = context(state).panelA;
    ctxA.count.patch(5);
    await expect(state.panelA.count).toEqual(5);
    await expect(state.panelB.count).toEqual(0);
    await expect(container).toMatch(
      [
        DIV,
        [
          SECTION,
          { class: "panel-a" },
          [H2, "Panel A"],
          [P, "Count: 5"],
          [BUTTON, "Increment A"]
        ],
        [
          SECTION,
          { class: "panel-b" },
          [H2, "Panel B"],
          [P, "Count: 0"],
          [BUTTON, "Increment B"]
        ]
      ]
    );
    const ctxB = context(state).panelB;
    ctxB.count.patch(10);
    await expect(state.panelA.count).toEqual(5);
    await expect(state.panelB.count).toEqual(10);
    await expect(container).toMatch(
      [
        DIV,
        [
          SECTION,
          { class: "panel-a" },
          [H2, "Panel A"],
          [P, "Count: 5"],
          [BUTTON, "Increment A"]
        ],
        [
          SECTION,
          { class: "panel-b" },
          [H2, "Panel B"],
          [P, "Count: 10"],
          [BUTTON, "Increment B"]
        ]
      ]
    );
    await expect(ctxA.label.get()).toEqual("Panel A");
    await expect(ctxB.label.get()).toEqual("Panel B");
  },
  "Example 8: SVG Dynamic - SVG circle with dynamic radius/color": async () => {
    const container = setup2();
    const state = createState({
      svg: {
        radius: 20,
        color: "red",
        cx: 100,
        cy: 100
      }
    });
    app(container, state, (s) => {
      return [
        DIV,
        [
          SVG,
          { xmlns: "http://www.w3.org/2000/svg", width: "200", height: "200" },
          [CIRCLE, {
            cx: s.svg.cx,
            cy: s.svg.cy,
            r: s.svg.radius,
            fill: s.svg.color,
            stroke: "black",
            "stroke-width": "2"
          }]
        ],
        [P, `Radius: ${s.svg.radius}, Color: ${s.svg.color}`]
      ];
    });
    await expect(container).toMatch(
      [
        DIV,
        [
          SVG,
          { xmlns: "http://www.w3.org/2000/svg", width: "200", height: "200" },
          [CIRCLE, {
            cx: 100,
            cy: 100,
            r: 20,
            fill: "red",
            stroke: "black",
            "stroke-width": "2"
          }]
        ],
        [P, "Radius: 20, Color: red"]
      ]
    );
    const ctx = context(state).svg;
    ctx.radius.patch(30);
    ctx.color.patch("green");
    await expect(state.svg.radius).toEqual(30);
    await expect(state.svg.color).toEqual("green");
    await expect(container).toMatch(
      [
        DIV,
        [
          SVG,
          { xmlns: "http://www.w3.org/2000/svg", width: "200", height: "200" },
          [CIRCLE, {
            cx: 100,
            cy: 100,
            r: 30,
            fill: "green",
            stroke: "black",
            "stroke-width": "2"
          }]
        ],
        [P, "Radius: 30, Color: green"]
      ]
    );
    ctx.radius.patch(50);
    ctx.color.patch("blue");
    await expect(container).toMatch(
      [
        DIV,
        [
          SVG,
          { xmlns: "http://www.w3.org/2000/svg", width: "200", height: "200" },
          [CIRCLE, {
            cx: 100,
            cy: 100,
            r: 50,
            fill: "blue",
            stroke: "black",
            "stroke-width": "2"
          }]
        ],
        [P, "Radius: 50, Color: blue"]
      ]
    );
  },
  "Example 9: Dynamic Attributes - conditional elements + attribute changes": async () => {
    const container = setup2();
    const state = createState({
      config: {
        showImage: false,
        imageUrl: "https://ryupold.de/main/assets/img/pot.webp",
        alt: "Example image",
        linkEnabled: true,
        linkUrl: "https://ryupold.de",
        boxWidth: "100px",
        boxColor: "red"
      }
    });
    app(container, state, (s) => {
      return [
        DIV,
        s.config.showImage && [IMG, {
          src: s.config.imageUrl,
          alt: s.config.alt,
          class: "dynamic-image",
          "data-testid": "image"
        }],
        [BUTTON, s.config.showImage ? "Hide Image" : "Show Image"],
        [A, {
          href: s.config.linkEnabled ? s.config.linkUrl : void 0,
          class: { "link-disabled": !s.config.linkEnabled },
          "data-enabled": String(s.config.linkEnabled)
        }, s.config.linkEnabled ? "Click me" : "Link disabled"],
        [BUTTON, "Toggle Link"],
        [DIV, {
          style: {
            width: s.config.boxWidth,
            backgroundColor: s.config.boxColor
          },
          class: "dynamic-box"
        }, "Styled Box"],
        [BUTTON, "Change Style"]
      ];
    });
    await expect(container).toMatch(
      [
        DIV,
        [BUTTON, "Show Image"],
        [A, {
          href: "https://ryupold.de",
          "data-enabled": "true"
        }, "Click me"],
        [BUTTON, "Toggle Link"],
        [DIV, { class: "dynamic-box" }, "Styled Box"],
        [BUTTON, "Change Style"]
      ]
    );
    state.patch({ config: { showImage: true } });
    await expect(container).toMatch(
      [
        DIV,
        [IMG, {
          src: "https://ryupold.de/main/assets/img/pot.webp",
          alt: "Example image",
          class: "dynamic-image",
          "data-testid": "image"
        }],
        [BUTTON, "Hide Image"],
        [A, {
          href: "https://ryupold.de",
          "data-enabled": "true"
        }, "Click me"],
        [BUTTON, "Toggle Link"],
        [DIV, { class: "dynamic-box" }, "Styled Box"],
        [BUTTON, "Change Style"]
      ]
    );
    state.patch({ config: { showImage: false } });
    await expect(container).toMatch(
      [
        DIV,
        [BUTTON, "Show Image"],
        [A, {
          href: "https://ryupold.de",
          "data-enabled": "true"
        }, "Click me"],
        [BUTTON, "Toggle Link"],
        [DIV, { class: "dynamic-box" }, "Styled Box"],
        [BUTTON, "Change Style"]
      ]
    );
    state.patch({ config: { linkEnabled: false } });
    await expect(container).toMatch(
      [
        DIV,
        [BUTTON, "Show Image"],
        [A, {
          "data-enabled": "false"
        }, "Link disabled"],
        [BUTTON, "Toggle Link"],
        [DIV, { class: "dynamic-box" }, "Styled Box"],
        [BUTTON, "Change Style"]
      ]
    );
    state.patch({ config: { boxWidth: "200px", boxColor: "blue" } });
    await expect(state.config.boxWidth).toEqual("200px");
    await expect(state.config.boxColor).toEqual("blue");
  },
  "Example 10: Nested Vode-App - inner app with isolated state via memo + onMount": async () => {
    const container = setup2();
    const outerState = createState({ title: "Outer", visible: true });
    const innerState = createState({ counter: 0 });
    function IsolatedVodeApp(tag2, state, View) {
      return memo(
        [],
        () => [
          tag2,
          {
            onMount: (s, container2) => {
              app(container2, state, View);
            }
          }
        ]
      );
    }
    app(container, outerState, (s) => [
      DIV,
      [H1, s.title],
      [P, "Outer content"],
      s.visible && [
        DIV,
        { class: "inner-wrapper" },
        IsolatedVodeApp(
          DIV,
          innerState,
          (ins) => [
            DIV,
            [P, `Inner counter: ${ins.counter}`]
          ]
        )
      ],
      [BUTTON, { onclick: () => ({ title: "Outer Updated" }) }, "Change Title"]
    ]);
    await expect(container).toMatch(
      [
        DIV,
        [H1, "Outer"],
        [P, "Outer content"],
        [
          DIV,
          { class: "inner-wrapper" },
          [
            DIV,
            [P, "Inner counter: 0"]
          ]
        ],
        [BUTTON, "Change Title"]
      ]
    );
    innerState.patch({ counter: 7 });
    await expect(container).toMatch(
      [
        DIV,
        [H1, "Outer"],
        [P, "Outer content"],
        [
          DIV,
          { class: "inner-wrapper" },
          [
            DIV,
            [P, "Inner counter: 7"]
          ]
        ],
        [BUTTON, "Change Title"]
      ]
    );
    outerState.patch({ title: "Outer Updated" });
    await expect(outerState.title).toEqual("Outer Updated");
    await expect(innerState.counter).toEqual(7);
    await expect(container).toMatch(
      [
        DIV,
        [H1, "Outer Updated"],
        [P, "Outer content"],
        [
          DIV,
          { class: "inner-wrapper" },
          [
            DIV,
            [P, "Inner counter: 7"]
          ]
        ],
        [BUTTON, "Change Title"]
      ]
    );
    outerState.patch({ visible: false });
    await expect(container).toMatch(
      [
        DIV,
        [H1, "Outer Updated"],
        [P, "Outer content"],
        [BUTTON, "Change Title"]
      ]
    );
  },
  "Example 11: Error Boundary - isolated component crash with catch recovery": async () => {
    const container = setup2();
    const state = createState({
      users: [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Charlie" }
      ],
      corruptId: 2
    });
    const broken = (msg) => (() => {
      throw new Error(msg);
    });
    app(
      container,
      state,
      (s) => [
        DIV,
        [H1, "User List"],
        ...s.users.map(
          (user) => [
            SECTION,
            {
              class: "card",
              key: user.id,
              catch: [P, { class: "error" }, `\u26A0 Failed to load ${user.name}`]
            },
            user.id === s.corruptId ? broken(`crash ${user.id}`) : [P, user.name]
          ]
        )
      ]
    );
    await expect(container).toMatch(
      [
        DIV,
        [H1, "User List"],
        [SECTION, [P, "Alice"]],
        [P, { class: "error" }, "\u26A0 Failed to load Bob"],
        [SECTION, [P, "Charlie"]]
      ]
    );
    state.patch({ corruptId: 1 });
    await expect(container).toMatch(
      [
        DIV,
        [H1, "User List"],
        [P, { class: "error" }, "\u26A0 Failed to load Alice"],
        [SECTION, [P, "Bob"]],
        [SECTION, [P, "Charlie"]]
      ]
    );
  },
  "Example 12: State Machine - sequential phase transitions via function patches": async () => {
    const container = setup2();
    const state = createState({ phase: "idle", count: 0 });
    app(
      container,
      state,
      (s) => [
        DIV,
        [P, `Phase: ${s.phase}`],
        [P, `Count: ${s.count}`]
      ]
    );
    state.patch((s) => ({ phase: "running", count: 1 }));
    await expect(state.phase).toEqual("running");
    await expect(state.count).toEqual(1);
    function step(s) {
      const next = s.count < 5 ? { count: s.count + 1 } : { phase: "done", count: s.count };
      return next;
    }
    state.patch(step);
    await expect(state.count).toEqual(2);
    state.patch(step);
    await expect(container).toMatch(
      [
        DIV,
        [P, "Phase: running"],
        [P, "Count: 3"]
      ]
    );
    state.patch(step);
    state.patch(step);
    await expect(state.count).toEqual(5);
    await expect(state.phase).toEqual("running");
    state.patch(step);
    await expect(state.count).toEqual(5);
    await expect(state.phase).toEqual("done", "reached done phase");
  }
};

// test/tests-catch.ts
function setup3() {
  const root = document.createElement("div");
  const container = document.createElement("div");
  root.appendChild(container);
  return container;
}
var tests_catch_default = {
  "catch: function fallback renders instead of broken component": async () => {
    const container = setup3();
    const broken = () => {
      throw new Error("boom");
    };
    app(
      container,
      {},
      () => [
        DIV,
        [
          SECTION,
          { catch: (s, err) => [P, `caught: ${err.message}`] },
          broken
        ]
      ]
    );
    await expect(container).toMatch(
      [
        DIV,
        [P, "caught: boom"]
      ]
    );
  },
  "catch: static vode fallback renders instead of broken component": async () => {
    const container = setup3();
    const broken = () => {
      throw new Error("boom");
    };
    app(
      container,
      {},
      () => [
        DIV,
        [
          SECTION,
          { catch: [ARTICLE, "error occurred"] },
          broken
        ]
      ]
    );
    await expect(container).toMatch(
      [
        DIV,
        [ARTICLE, "error occurred"]
      ]
    );
  },
  "catch: nested error boundaries \u2014 inner catch handles inner error": async () => {
    const container = setup3();
    const broken = () => {
      throw new Error("inner boom");
    };
    app(
      container,
      {},
      () => [
        DIV,
        [
          SECTION,
          [
            P,
            {
              catch: [ARTICLE, "inner fallback"]
            },
            broken
          ]
        ]
      ]
    );
    await expect(container).toMatch(
      [
        DIV,
        [
          SECTION,
          [ARTICLE, "inner fallback"]
        ]
      ]
    );
  },
  "catch: nested error boundaries \u2014 outer catches when inner has no handler": async () => {
    const container = setup3();
    const broken = () => {
      throw new Error("boom");
    };
    app(
      container,
      {},
      () => [
        DIV,
        [
          SECTION,
          { catch: [P, "outer caught it"] },
          [ARTICLE, broken]
        ]
      ]
    );
    await expect(container).toMatch(
      [
        DIV,
        [P, "outer caught it"]
      ]
    );
  },
  "catch: error propagates when no handler exists on entire tree": async () => {
    const container = setup3();
    const broken = () => {
      throw new Error("crash");
    };
    let threw = false;
    try {
      app(
        container,
        {},
        () => [DIV, [P, broken]]
      );
    } catch {
      threw = true;
    }
    await expect(threw).toEqual(true);
  },
  "catch: catch handler changed on A\u2192A path": async () => {
    const container = setup3();
    const state = createState({ catchValue: "v1", showBroken: false });
    const broken = () => {
      throw new Error("boom");
    };
    const patch = app(
      container,
      state,
      (s) => [
        DIV,
        [
          SECTION,
          { catch: [P, s.catchValue] },
          s.showBroken ? broken : "ok"
        ]
      ]
    );
    await expect(container).toMatch(
      [DIV, [SECTION, "ok"]]
    );
    patch({ catchValue: "v2", showBroken: true });
    await expect(container).toMatch(
      [DIV, [P, "v2"]]
    );
  },
  "catch: error in one sibling doesn't affect the other": async () => {
    const container = setup3();
    const broken = () => {
      throw new Error("boom");
    };
    app(
      container,
      {},
      () => [
        DIV,
        [
          SECTION,
          { catch: [P, "whoops"] },
          broken
        ],
        [ARTICLE, "i am fine"]
      ]
    );
    await expect(container).toMatch(
      [
        DIV,
        [P, "whoops"],
        [ARTICLE, "i am fine"]
      ]
    );
  },
  "catch: bubbles up to the root component if deeply nested vodes dont catch it earlier": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    app(
      container,
      {},
      () => [
        DIV,
        {
          catch: (s, err) => [DIV, `caught: ${err.message}`]
        },
        [
          MAIN,
          [
            SECTION,
            [ARTICLE, {
              onMount: () => {
                throw new Error("boom");
              }
            }]
          ]
        ]
      ]
    );
    await expect(container).toMatch(
      [DIV, "caught: boom"]
    );
  },
  "catch: if catching in root vode with different Tag -> container will be replaced": async () => {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    await expect(root.firstChild === container).toEqual(true);
    app(
      container,
      {},
      () => [
        DIV,
        {
          catch: (s, err) => [P, `caught: ${err.message}`]
        },
        [
          MAIN,
          [
            SECTION,
            [ARTICLE, {
              onMount: () => {
                throw new Error("boom");
              }
            }]
          ]
        ]
      ]
    );
    await expect(root.firstChild === container).toEqual(false);
    await expect(root.firstChild).toMatch(
      [P, "caught: boom"]
    );
  },
  "catch: directly evaluated DOM expressions cannot be catched": async () => {
    globalThis.window.continueAfterRequestAnimationFrameError = true;
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    const error = new Error("boom");
    function ComponentWithError() {
      throw error;
    }
    const patch = app(container, { error: false }, (s) => {
      return [
        DIV,
        [
          DIV,
          {
            catch: (s2, err) => [P, `caught: ${err.message}`]
          },
          s.error ? ComponentWithError() : "no error"
        ]
      ];
    });
    patch({ error: true });
    await expect(
      () => expect(globalThis.window.requestAnimationFrameErrors[0]).toEqual(error)
    ).toSucceedAsync();
  },
  "catch: use old vodes catch if new vode needs evaluation before knowing": async () => {
    globalThis.window.continueAfterRequestAnimationFrameError = true;
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    function ComponentWithError() {
      throw new Error("boom");
    }
    const patch = app(container, { error: false }, (s) => {
      return [
        DIV,
        () => [
          DIV,
          { catch: (s2, err) => [P, `caught: ${err.message}`] },
          s.error ? ComponentWithError() : "no error"
        ]
      ];
    });
    patch({ error: true });
    await expect(container).toMatch(
      [
        DIV,
        [P, "caught: boom"]
      ]
    );
  }
};

// test/tests-patch-advanced.ts
function setup4() {
  const root = document.createElement("div");
  const container = document.createElement("div");
  root.appendChild(container);
  return container;
}
var tests_patch_advanced_default = {
  "patch(): generator function yields multiple state updates": async () => {
    const container = setup4();
    const state = createState({ count: 0 });
    app(container, state, (s) => [DIV, String(s.count)]);
    await expect(state.count).toEqual(0);
    state.patch(function* () {
      yield { count: 1 };
      yield { count: 2 };
      return { count: 3 };
    });
    await new Promise((r) => setTimeout(r, 0));
    await expect(state.count).toEqual(3);
    await expect(container).toMatch([DIV, "3"]);
  },
  "patch(): async generator yields over time": async () => {
    const container = setup4();
    const state = createState({ phase: "start", value: 0 });
    app(container, state, (s) => [DIV, s.phase, String(s.value)]);
    await expect(state.phase).toEqual("start");
    state.patch((async function* () {
      await expect(container._vode.stats.syncRenderPatchCount).toEqual(0);
      yield { phase: "working", value: 10 };
      await expect(container._vode.stats.syncRenderPatchCount).toEqual(1);
      yield { phase: "almost", value: 20 };
      await expect(container._vode.stats.syncRenderPatchCount).toEqual(2);
      return { phase: "done", value: 30 };
    })());
    await new Promise((r) => setTimeout(r, 0));
    await expect(state.phase).toEqual("done");
    await expect(state.value).toEqual(30);
    await expect(container).toMatch([DIV, "done", "30"]);
  },
  "patch(): Promise resolves and applies patch": async () => {
    const container = setup4();
    const state = createState({ msg: "before" });
    app(container, state, (s) => [DIV, s.msg]);
    await state.patch(Promise.resolve({ msg: "after" }));
    await expect(state).toEqual({ msg: "after" });
    await expect(container).toMatch([DIV, "after"]);
  },
  "patch(): array with empty patches applies nothing": async () => {
    const container = setup4();
    const state = createState({ x: 1, y: 2 });
    app(container, state, (s) => [DIV]);
    await state.patch([{}, {}]);
    await delay(10);
    await expect(state).toEqual({ x: 1, y: 2 });
  },
  "patch(): array with null/undefined items skips them": async () => {
    const container = setup4();
    const state = createState({ x: 0, y: 0 });
    app(container, state, (s) => [DIV, String(s.x), String(s.y)]);
    state.patch([null, { x: 10 }, void 0, { y: 20 }]);
    await expect(() => expect(state.x).toEqual(10)).toSucceedAsync();
    await expect(() => expect(state.y).toEqual(20)).toSucceedAsync();
  },
  "patch(): returns Promise for generator functions, can be awaited": async () => {
    const container = setup4();
    const state = createState({ count: 0 });
    app(container, state, (s) => [DIV, String(s.count)]);
    await expect(container._vode.stats.patchCount).toEqual(0);
    const result = state.patch(function* () {
      yield { count: 1 };
      return { count: 2 };
    });
    await expect(container._vode.stats.patchCount).toEqual(1);
    expect(result).toBeA("object");
    await expect(result instanceof Promise).toEqual(true);
    await result;
    await expect(container._vode.stats.patchCount).toEqual(3);
    await expect(state.count).toEqual(2);
    await expect(container).toMatch([DIV, "2"]);
  },
  "patch(): returns Promise for Promise patches, can be awaited": async () => {
    const container = setup4();
    const state = createState({ msg: "before" });
    app(container, state, (s) => [DIV, s.msg]);
    const result = state.patch(Promise.resolve({ msg: "after" }));
    expect(result).toBeA("object");
    await expect(result instanceof Promise).toEqual(true);
    await result;
    await expect(state.msg).toEqual("after");
    await expect(container).toMatch([DIV, "after"]);
  },
  "patch(): returns void for object patches": async () => {
    const container = setup4();
    const state = createState({ x: 1 });
    app(container, state, (s) => [DIV, String(s.x)]);
    const result = state.patch({ x: 2 });
    expect(result).toBeA("undefined");
    await expect(state.x).toEqual(2);
    await expect(container).toMatch([DIV, "2"]);
  },
  "patch(): forward promise error when one happens during patch": async () => {
    const container = setup4();
    const state = createState({ msg: "before" });
    app(container, state, (s) => [DIV, s.msg]);
    const mockPromise = Promise.withResolvers();
    const promisePatchResult = state.patch(mockPromise.promise);
    mockPromise.reject(new Error("promise error"));
    let err = await expect(() => promisePatchResult).toFailAsync("promise (1) error expected");
    expect(err.message).toEqual("promise error");
    err = await expect(() => state.patch(async () => {
      await delay(1);
      throw new Error("promise error");
    })).toFailAsync("promise (2) error expected");
    expect(err.message).toEqual("promise error");
  },
  "patch(): forward generator error when one happens during patch": async () => {
    const container = setup4();
    const state = createState({ msg: "before" });
    app(container, state, (s) => [DIV, s.msg]);
    const err = await expect(
      () => state.patch(
        async function* () {
          yield {};
          await delay(1);
          yield {};
          throw new Error("generator error");
        }
      )
    ).toFailAsync("generator error expected");
    expect(err.message).toEqual("generator error");
  },
  "patch(): forward error when one happens during patch": async () => {
    const container = setup4();
    const state = createState({ msg: "before" });
    app(container, state, (s) => [DIV, s.msg]);
    const err = await expect(
      () => state.patch(
        () => {
          throw new Error("void error");
        }
      )
    ).toFailAsync("void error expected");
    expect(err.message).toEqual("void error");
  }
};

// test/tests-patch-merge.ts
function setup5() {
  const root = document.createElement("div");
  const container = document.createElement("div");
  root.appendChild(container);
  return container;
}
var tests_patch_merge_default = {
  "patch-merge: array property replaces existing array": async () => {
    const container = setup5();
    const state = createState({ items: [1, 2, 3] });
    app(container, state, () => [DIV]);
    state.patch({ items: [4, 5, 6] });
    await expect(state.items).toEqual([4, 5, 6]);
  },
  "patch-merge: Date property stores correctly": async () => {
    const container = setup5();
    const state = createState({ date: /* @__PURE__ */ new Date("2024-01-01") });
    app(container, state, () => [DIV]);
    state.patch({ date: /* @__PURE__ */ new Date("2025-06-15") });
    await expect(state.date instanceof Date).toEqual(true);
    await expect(state.date.getFullYear()).toEqual(2025);
    await expect(state.date.getMonth()).toEqual(5);
    await expect(state.date.getDate()).toEqual(15);
  },
  "patch-merge: object replaces existing array property": async () => {
    const container = setup5();
    const state = createState({ data: [1, 2, 3] });
    app(container, state, () => [DIV]);
    state.patch({ data: { key: "value" } });
    await expect(Array.isArray(state.data)).toEqual(false);
    await expect(state.data.key).toEqual("value");
  },
  "patch-merge: object replaces existing primitive property": async () => {
    const container = setup5();
    const state = createState({ value: 42 });
    app(container, state, () => [DIV]);
    state.patch({ value: { nested: true } });
    await expect(state.value.nested).toEqual(true);
  },
  "patch-merge: new array property via patch": async () => {
    const container = setup5();
    const state = createState({ name: "test" });
    app(container, state, () => [DIV]);
    state.patch({ tags: ["a", "b", "c"] });
    await expect(Array.isArray(state.tags)).toEqual(true);
    await expect(state.tags).toEqual(["a", "b", "c"]);
  }
};

// test/index.ts
var tests = {
  ...tests_vode_default,
  ...tests_app_default,
  ...tests_defuse_default,
  ...tests_hydrate_default,
  ...tests_memo_default,
  ...tests_mount_unmount_default,
  ...tests_createState_default,
  ...tests_createPatch_default,
  ...tests_tag_default,
  ...tests_props_default,
  ...tests_children_default,
  ...tests_mergeClass_default,
  ...tests_mergeStyle_default,
  ...tests_mergeProps_default,
  ...tests_state_context_default,
  ...tests_examples_default,
  ...tests_catch_default,
  ...tests_patch_advanced_default,
  ...tests_patch_merge_default
};
export {
  tests
};
