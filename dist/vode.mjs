// src/vode.ts
var VODE = /* @__PURE__ */ Symbol("vode");
var NODE = /* @__PURE__ */ Symbol("node");
var STATS = /* @__PURE__ */ Symbol("stats");
var UNMOUNT_COUNT = /* @__PURE__ */ Symbol("ucount");
var MEMO = /* @__PURE__ */ Symbol("memo");
var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
function vode(tag2, props2, ...children2) {
  if (!tag2) throw new Error("first argument to vode() must be a tag name or a vode");
  if (Array.isArray(tag2)) return tag2;
  else if (props2 !== null && typeof props2 === "object")
    return [tag2, props2, ...children2];
  else if (props2 === void 0) return [tag2, ...children2];
  else return [tag2, props2, ...children2];
}
function app(container, state, dom, ...initialPatches) {
  if (!container?.parentElement)
    throw new Error(
      "first argument to app() must be a valid HTMLElement inside the <html></html> document"
    );
  if (!state || typeof state !== "object")
    throw new Error("second argument to app() must be a state object");
  if (typeof dom !== "function")
    throw new Error("third argument to app() must be a function that returns a vode");
  const patchableState = state;
  const _vode = {};
  _vode.document = container.ownerDocument;
  const win = _vode.document.defaultView;
  _vode.syncRenderer = win?.requestAnimationFrame ? win.requestAnimationFrame.bind(win) : function(cb) {
    const t = performance.now();
    cb(t);
    return t;
  };
  _vode.asyncRenderer = typeof _vode.document.startViewTransition === "function" ? _vode.document.startViewTransition.bind(_vode.document) : null;
  _vode.isRendering = 0;
  _vode.qAsync = null;
  _vode.stats = patchableState[STATS] ?? {
    lastSyncRenderTime: 0,
    lastAsyncRenderTime: 0,
    syncRenderCount: 0,
    asyncRenderCount: 0,
    liveEffectCount: 0,
    patchCount: 0,
    syncRenderPatchCount: 0,
    asyncRenderPatchCount: 0
  };
  patchableState[STATS] = _vode.stats;
  if ("patch" in state && typeof state.patch === "function" && Array.isArray(state.patch.initialPatches)) {
    initialPatches = [
      ...state.patch.initialPatches,
      ...initialPatches
    ];
  }
  async function promisePatch(action, animated) {
    _vode.stats.liveEffectCount++;
    try {
      const resolvedPatch = await action;
      await patchableState.patch(resolvedPatch, animated);
    } finally {
      _vode.stats.liveEffectCount--;
    }
  }
  async function generatorPatch(action, animated) {
    const generator = action;
    _vode.stats.liveEffectCount++;
    try {
      let v = await generator.next();
      while (v.done === false) {
        _vode.stats.liveEffectCount++;
        try {
          await patchableState.patch(v.value, animated);
          v = await generator.next();
        } finally {
          _vode.stats.liveEffectCount--;
        }
      }
      await patchableState.patch(v.value, animated);
    } finally {
      _vode.stats.liveEffectCount--;
    }
  }
  Object.defineProperty(state, "patch", {
    enumerable: false,
    configurable: true,
    writable: false,
    value: (action, animated) => {
      while (typeof action === "function") {
        action = action(_vode.state);
      }
      if (!action || typeof action !== "object") return;
      _vode.stats.patchCount++;
      if (typeof action.next === "function") {
        return generatorPatch(action, animated);
      } else if (typeof action.then === "function") {
        return promisePatch(action, animated);
      } else if (Array.isArray(action)) {
        if (action.length > 0) {
          for (const p of action) {
            patchableState.patch(p, !!_vode.asyncRenderer);
          }
        } else {
          mergeState(_vode.state, _vode.qAsync, true);
          _vode.qAsync = null;
          try {
            _vode.document.currentViewTransition?.skipTransition();
          } catch {
          }
          _vode.stats.syncRenderPatchCount++;
          _vode.renderSync();
        }
      } else {
        if (animated && !!_vode.asyncRenderer) {
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
  function renderDom(animated) {
    const sw = performance.now();
    _vode.vode = render(
      _vode.state,
      container.parentElement,
      0,
      0,
      _vode.vode,
      dom
    );
    if (container.tagName.toLowerCase() !== _vode.vode[0].toLowerCase()) {
      container = _vode.vode[NODE];
      container[VODE] = _vode;
    }
    if (!animated) {
      _vode.stats.lastSyncRenderTime = performance.now() - sw;
      const changesSinceRender = _vode.isRendering !== _vode.stats.syncRenderPatchCount;
      _vode.stats.syncRenderCount++;
      _vode.isRendering = 0;
      if (changesSinceRender) _vode.renderSync();
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
      await _vode.document.currentViewTransition?.updateCallbackDone;
      if (_vode.isAnimating || !_vode.qAsync) return;
      if (_vode.document.hidden) {
        _vode.state = mergeState(
          _vode.state,
          _vode.qAsync,
          true
        );
        _vode.qAsync = null;
        _vode.stats.syncRenderPatchCount++;
        _vode.renderSync();
        return;
      }
      _vode.isAnimating = true;
      const sw = performance.now();
      try {
        _vode.state = mergeState(
          _vode.state,
          _vode.qAsync,
          true
        );
        _vode.qAsync = null;
        if (_vode.asyncRenderer) {
          _vode.document.currentViewTransition = _vode.asyncRenderer(ar);
        } else {
          _vode.renderSync();
          return;
        }
        await _vode.document.currentViewTransition?.updateCallbackDone;
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
  root[VODE] = _vode;
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
    container = _vode.vode[NODE];
    container[VODE] = _vode;
  }
  const continueRendering = _vode.stats.syncRenderPatchCount !== patchCountBefore;
  _vode.isRendering = 0;
  _vode.stats.syncRenderCount++;
  if (continueRendering) _vode.renderSync();
  for (const effect of initialPatches) {
    patchableState.patch(effect);
  }
  return (action, animated) => patchableState.patch(action, animated);
}
function defuse(container) {
  if (container?.[VODE]) {
    let clearEvents2 = function(av) {
      if (!av?.[NODE]) return;
      const p = props(av);
      if (p) {
        for (const key in p) {
          if (key[0] === "o" && key[1] === "n") {
            av[NODE][key] = null;
          }
        }
        av[NODE].catch = null;
      }
      if (av[NODE][VODE]) {
        defuse(av[NODE]);
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
    const v = container[VODE];
    delete container[VODE];
    delete v.state[STATS];
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
  if (element?.nodeType === TEXT_NODE) {
    if (element.nodeValue?.trim() !== "")
      return prepareForRender ? element : element.nodeValue;
    return void 0;
  } else if (element.nodeType === ELEMENT_NODE) {
    const tag2 = element.tagName.toLowerCase();
    const root = [tag2];
    if (prepareForRender) root[NODE] = element;
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
        const wet = child2 && hydrate(child2, !!prepareForRender);
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
  if (!compare || !Array.isArray(compare))
    throw new Error("first argument to memo() must be an array of values to compare");
  if (typeof component !== "function")
    throw new Error("second argument to memo() must be a function that returns a child vode");
  if (component[MEMO]) {
    const comp = component;
    component = (s) => comp(s);
  }
  component[MEMO] = compare;
  return component;
}
function createState(state) {
  if (!state || typeof state !== "object")
    throw new Error("createState() must be called with a state object");
  if (!("patch" in state)) {
    Object.defineProperty(state, "patch", {
      enumerable: false,
      configurable: true,
      writable: false,
      value: (action, animated) => {
        const futureState = state;
        if (!Array.isArray(futureState.patch.initialPatches)) {
          futureState.patch.initialPatches = [];
        }
        futureState.patch.initialPatches.push(animated ? [action] : action);
      }
    });
  }
  if (!(STATS in state)) {
    state[STATS] = {
      lastSyncRenderTime: 0,
      lastAsyncRenderTime: 0,
      syncRenderCount: 0,
      asyncRenderCount: 0,
      liveEffectCount: 0,
      patchCount: 0,
      syncRenderPatchCount: 0,
      asyncRenderPatchCount: 0
    };
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
    if (typeof vode2[1] === "object" && vode2[1].nodeType !== TEXT_NODE) {
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
  if (Array.isArray(vode2) && vode2.length > 1) {
    const first = vode2[1];
    if (first && typeof first === "object" && !Array.isArray(first) && first.nodeType !== TEXT_NODE)
      return vode2.length > 2 ? 2 : -1;
    else return 1;
  }
  return -1;
}
function mergeState(target, source, allowDeletion) {
  if (typeof source !== "object") return target;
  for (const key in source) {
    const value = source[key];
    if (value && typeof value === "object") {
      const proto = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null) {
        target[key] = value;
      } else {
        const targetValue = target[key];
        if (targetValue) {
          if (Array.isArray(targetValue)) target[key] = mergeState({}, value, allowDeletion);
          else if (typeof targetValue === "object")
            mergeState(target[key], value, allowDeletion);
          else target[key] = mergeState({}, value, allowDeletion);
        } else {
          target[key] = mergeState({}, value, allowDeletion);
        }
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
    const isNoVode = !newVode || typeof newVode !== "object" && typeof newVode !== "string";
    if (newVode === oldVode || !oldVode && isNoVode) {
      return oldVode;
    }
    const oldIsText = oldVode?.nodeType === TEXT_NODE;
    const oldNode = oldIsText ? oldVode : oldVode?.[NODE];
    if (isNoVode) {
      if (oldNode) {
        unmountTree(state, oldVode);
        oldNode.remove();
      }
      return void 0;
    }
    const isText = !isNoVode && isTextVode(newVode);
    const isNode = !isNoVode && isNaturalVode(newVode);
    const alreadyAttached = !!newVode && typeof newVode !== "string" && !!(newVode?.[NODE] || newVode?.nodeType === TEXT_NODE);
    if (!isText && !isNode && !alreadyAttached && !oldVode) {
      throw new Error(
        `invalid ChildVode at index ${childIndex}: typeof ${typeof newVode}${typeof newVode === "object" ? "\ncould be that you are adding Props at the wrong position?" : ""}`
      );
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
      const text = parent.ownerDocument.createTextNode(newVode);
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
      if (newvode.length > 1) {
        newvode[1] = remember(state, newvode[1], void 0);
      }
      const properties = props(newVode);
      if (properties?.xmlns !== void 0) xmlns = properties.xmlns;
      const newNode = xmlns ? parent.ownerDocument.createElementNS(xmlns, newVode[0]) : parent.ownerDocument.createElement(newVode[0]);
      newVode[NODE] = newNode;
      if (typeof properties?.reconciled === "function") {
        properties.reconciled(state, newVode, Array.isArray(oldVode) ? oldVode : void 0);
      }
      patchProperties(state, newNode, void 0, properties, xmlns ?? null);
      if (!!properties && "catch" in properties) {
        newVode[NODE]["catch"] = null;
        newVode[NODE].removeAttribute("catch");
      }
      if (!!properties && "reconciled" in properties) {
        newVode[NODE]["reconciled"] = null;
        newVode[NODE].removeAttribute("reconciled");
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
        let indexP = 0;
        for (let i = 0; i < newVode.length - newStart; i++) {
          const child2 = newVode[i + newStart];
          const attached = render(state, newNode, i, indexP, void 0, child2, xmlns ?? null);
          newVode[i + newStart] = attached;
          if (attached) indexP++;
        }
      }
      newVode[UNMOUNT_COUNT] = (properties?.onUnmount ? 1 : 0) + sumChildUnmountCounts(newVode);
      if (typeof properties?.onMount === "function") {
        state.patch(
          properties.onMount(state, newNode)
        );
      }
      return newVode;
    }
    if (!oldIsText && isNode && oldVode[0] === newVode[0]) {
      const node = oldNode;
      newVode[NODE] = node;
      const properties = props(newVode);
      if (typeof properties?.reconciled === "function") {
        properties.reconciled(state, newVode, oldVode);
      }
      const oldProps = props(oldVode);
      if (properties?.xmlns !== void 0) xmlns = properties.xmlns;
      patchProperties(state, node, oldProps, properties, xmlns);
      if (!!properties?.catch && oldProps?.catch !== properties.catch) {
        node["catch"] = null;
        node.removeAttribute("catch");
      }
      if (!!properties?.reconciled && oldProps?.reconciled !== properties.reconciled) {
        node["reconciled"] = null;
        node.removeAttribute("reconciled");
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
          render(
            state,
            oldNode,
            i,
            i,
            oldVode[i + oldStart],
            void 0,
            xmlns
          );
        }
      }
      newVode[UNMOUNT_COUNT] = (properties?.onUnmount ? 1 : 0) + sumChildUnmountCounts(newVode);
      return newVode;
    }
  } catch (error) {
    const oldProps = props(oldVode);
    const newProps = props(newVode);
    const catchVode = typeof newVode === "function" ? oldProps?.catch : newProps?.catch;
    if (catchVode) {
      const catchNode = newVode?.[NODE] || oldVode?.[NODE];
      if (!catchNode) throw error;
      const handledVode = typeof catchVode === "function" ? catchVode(state, error) : catchVode;
      if (Array.isArray(newVode) && newVode[NODE]) {
        const partialCount = (newProps?.onUnmount ? 1 : 0) + sumChildUnmountCounts(newVode);
        if (partialCount > 0) {
          newVode[UNMOUNT_COUNT] = partialCount;
          unmountTree(state, newVode);
        }
      }
      while (catchNode.firstChild) catchNode.firstChild.remove();
      const errorUi = render(
        state,
        parent,
        childIndex,
        indexInParent,
        hydrate(catchNode, true),
        handledVode,
        xmlns
      );
      if (errorUi?.[NODE] === catchNode) {
        const errorUiProps = props(errorUi);
        if (typeof errorUiProps?.onMount === "function") {
          state.patch(
            errorUiProps.onMount(state, catchNode)
          );
        }
      }
      return errorUi;
    } else {
      throw error;
    }
  }
  return void 0;
}
function unmountTree(state, v) {
  if (!v || !Array.isArray(v)) return;
  if ((v?.[UNMOUNT_COUNT] ?? 0) === 0) return;
  const kidsStart = childrenStart(v);
  if (kidsStart > 0) {
    for (let i = v.length - 1; i >= kidsStart; i--) {
      unmountTree(state, v[i]);
    }
  }
  const p = props(v);
  if (typeof p?.onUnmount === "function") {
    state.patch(p.onUnmount(state, v[NODE]));
  }
}
function sumChildUnmountCounts(v) {
  const kidsStart = childrenStart(v);
  if (kidsStart < 1) return 0;
  let n = 0;
  for (let i = kidsStart; i < v.length; i++) {
    const k = v[i];
    if (Array.isArray(k)) {
      n += k[UNMOUNT_COUNT] ?? 0;
    }
  }
  return n;
}
function isNaturalVode(x) {
  return Array.isArray(x) && x.length > 0 && typeof x[0] === "string";
}
function isTextVode(x) {
  return typeof x === "string" || x?.nodeType === TEXT_NODE;
}
function remember(state, present, past) {
  while (typeof present === "function" && !present[MEMO]) {
    present = present(state);
  }
  if (typeof present !== "function") return present;
  const presentMemo = present?.[MEMO];
  const pastMemo = past?.[MEMO];
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
  if (present && typeof present === "object") {
    present[MEMO] = presentMemo;
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
          newProps[key] = patchProperty(
            s,
            node,
            key,
            oldValue,
            newValue,
            xmlMode
          );
        else patchProperty(s, node, key, oldValue, void 0, xmlMode);
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
        if (nv === void 0 || nv === null) {
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
      if (oldValue) node.style.cssText = "";
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
    else node.setAttribute(key, newValue);
  }
  return newValue;
}
function classString(classProp) {
  if (typeof classProp === "string") return classProp;
  else if (Array.isArray(classProp)) return classProp.map(classString).join(" ");
  else if (classProp && typeof classProp === "object")
    return Object.keys(classProp).filter((k) => classProp[k]).join(" ");
  else return "";
}

// src/keyed.ts
var TEXT_NODE2 = 3;
function keyed(container) {
  const kidsStart = childrenStart(container);
  if (kidsStart < 0) return container;
  const kids = container.slice(kidsStart).filter(
    (c) => !!c
  );
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < kids.length; i++) {
    const key = props(kids[i])?.key;
    if (typeof key !== "string")
      throw new Error(`keyed(): no string key defined on child at index ${i}`);
    if (seen.has(key)) throw new Error(`keyed(): duplicate key "${key}"`);
    seen.add(key);
  }
  const userProps = kidsStart === 2 ? container[1] : void 0;
  const userReconcile = userProps?.reconciled;
  const containerProps = {
    ...userProps,
    reconciled: typeof userReconcile === "function" ? (s, newVode, oldVode) => {
      reconcile(s, newVode, oldVode);
      userReconcile(s, newVode, oldVode);
    } : reconcile
  };
  return [container[0], containerProps, ...kids];
}
function reconcile(_s, newVode, oldVode) {
  if (!newVode || !oldVode) return;
  const oldStart = childrenStart(oldVode);
  if (oldStart < 0) return;
  const newStart = childrenStart(newVode);
  const oldSlots = oldVode.slice(oldStart);
  const slotByKey = /* @__PURE__ */ new Map();
  for (const slot of oldSlots) {
    const k = keyOf(slot);
    if (k !== void 0 && !slotByKey.has(k)) slotByKey.set(k, slot);
  }
  const newKeys = newStart > 0 ? newVode.slice(newStart).map(keyOf) : [];
  const newKeySet = new Set(newKeys);
  const removed = [];
  for (const slot of oldSlots) {
    const k = keyOf(slot);
    if (k === void 0 || slotByKey.get(k) !== slot || !newKeySet.has(k)) removed.push(slot);
  }
  const node = oldVode[NODE];
  const desired = [];
  for (const k of newKeys) {
    if (k === void 0) continue;
    const dn = nodeOf(slotByKey.get(k));
    if (dn) desired.push(dn);
  }
  for (const slot of removed) {
    const dn = nodeOf(slot);
    if (dn) desired.push(dn);
  }
  reorder(node, desired);
  const slots = oldVode;
  slots.length = oldStart;
  for (const k of newKeys) {
    slots.push(k !== void 0 ? slotByKey.get(k) : void 0);
  }
  for (const slot of removed) {
    slots.push(slot);
  }
}
function keyOf(v) {
  const k = props(v)?.key;
  return typeof k === "string" ? k : void 0;
}
function nodeOf(slot) {
  if (!slot) return void 0;
  if (slot.nodeType === TEXT_NODE2) return slot;
  return slot[NODE];
}
function reorder(parent, desired) {
  const n = desired.length;
  if (n < 2) return;
  const pos = /* @__PURE__ */ new Map();
  for (let i = 0; i < n; i++) pos.set(desired[i], i);
  const seq = [];
  const kids = parent.childNodes;
  for (let i = 0; i < kids.length; i++) {
    const p = pos.get(kids[i]);
    if (p !== void 0) seq.push(p);
  }
  if (seq.length === n) {
    let sorted = true;
    for (let i = 1; i < n; i++) {
      if (seq[i] < seq[i - 1]) {
        sorted = false;
        break;
      }
    }
    if (sorted) return;
  }
  const stays = lis(seq);
  let anchor;
  for (let i = n - 1; i >= 0; i--) {
    const node = desired[i];
    if (!stays.has(i)) {
      if (anchor && anchor.before) anchor.before(node);
      else if (parent.appendChild) parent.appendChild(node);
    }
    anchor = node;
  }
}
function lis(seq) {
  const tails = [];
  const prev = new Array(seq.length).fill(-1);
  for (let i = 0; i < seq.length; i++) {
    const v = seq[i];
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = lo + hi >> 1;
      if (seq[tails[mid]] < v) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[i] = tails[lo - 1];
    tails[lo] = i;
  }
  const stays = /* @__PURE__ */ new Set();
  let k = tails.length > 0 ? tails[tails.length - 1] : -1;
  while (k >= 0) {
    stays.add(seq[k]);
    k = prev[k];
  }
  return stays;
}

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
      finalClass = Array.from(classSet).join(" ");
    } else if (typeof a === "string" && Array.isArray(b)) {
      const classSet = /* @__PURE__ */ new Set([...a.split(" "), ...b]);
      finalClass = Array.from(classSet).join(" ");
    } else if (Array.isArray(a) && typeof b === "string") {
      const classSet = /* @__PURE__ */ new Set([...a, ...b.split(" ")]);
      finalClass = Array.from(classSet).join(" ");
    } else if (Array.isArray(a) && Array.isArray(b)) {
      const classSet = /* @__PURE__ */ new Set([...a, ...b]);
      finalClass = Array.from(classSet).join(" ");
    } else if (typeof a === "string" && typeof b === "object") {
      const aSplit = a.split(" ");
      const aObj = {};
      for (const cls of aSplit) if (cls) aObj[cls] = true;
      finalClass = { ...aObj, ...b };
    } else if (typeof a === "object" && typeof b === "string") {
      const bSplit = b.split(" ");
      const bObj = {};
      for (const cls of bSplit) if (cls) bObj[cls] = true;
      finalClass = { ...a, ...bObj };
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
var stylingElement;
function mergeStyle(...props2) {
  if (props2.length === 0) {
    return "";
  }
  if (props2.length === 1) {
    return props2[0];
  }
  if (typeof document !== "undefined") {
    const styling = stylingElement ??= document.createElement("div");
    try {
      const merged = styling.style;
      for (const style of props2) {
        if (typeof style === "object" && style !== null) {
          for (const key in style) {
            merged[key] = style[key];
          }
        } else if (typeof style === "string") {
          const old = merged.cssText;
          merged.cssText = old?.length > 0 && old[old.length - 1] !== ";" ? old + ";" + style : old + style;
        }
      }
      return merged.cssText;
    } finally {
      styling.style.cssText = "";
    }
  }
  return mergeStyleFallback(props2);
}
function mergeStyleFallback(props2) {
  const declarations = /* @__PURE__ */ new Map();
  const set = (rawProp, rawValue) => {
    const prop = rawProp.trim();
    if (!prop) return;
    const key = prop.startsWith("--") ? prop : prop.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
    const value = rawValue.trim();
    if (value === "") {
      declarations.delete(key);
    } else {
      declarations.set(key, value);
    }
  };
  for (const style of props2) {
    if (typeof style === "object" && style !== null) {
      for (const k in style) {
        const v = style[k];
        set(k, v === null || v === void 0 ? "" : String(v));
      }
    } else if (typeof style === "string") {
      for (const declaration of style.split(";")) {
        const i = declaration.indexOf(":");
        if (i < 0) continue;
        set(declaration.slice(0, i), declaration.slice(i + 1));
      }
    }
  }
  let out = "";
  for (const [k, v] of declarations) out += `${k}: ${v}; `;
  return out.trimEnd();
}

// src/merge-props.ts
function mergeProps(...props2) {
  if (props2.length === 0) return void 0;
  if (props2.length === 1) return props2[0];
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
    const keys = proxy[KEYS_SYMBOL];
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
        target[keys[0]] = value;
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
    function patch(value, animated) {
      if (animated) {
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
};
var KEYS_SYMBOL = /* @__PURE__ */ Symbol("keys");
function proxyState(state, keys) {
  return new Proxy(state, {
    get: (target, prop, receiver) => {
      if (prop === KEYS_SYMBOL) {
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

// src/tags.ts
var A = "a";
var ABBR = "abbr";
var ADDRESS = "address";
var AREA = "area";
var ARTICLE = "article";
var ASIDE = "aside";
var AUDIO = "audio";
var B = "b";
var BASE = "base";
var BDI = "bdi";
var BDO = "bdo";
var BLOCKQUOTE = "blockquote";
var BODY = "body";
var BR = "br";
var BUTTON = "button";
var CANVAS = "canvas";
var CAPTION = "caption";
var CITE = "cite";
var CODE = "code";
var COL = "col";
var COLGROUP = "colgroup";
var DATA = "data";
var DATALIST = "datalist";
var DD = "dd";
var DEL = "del";
var DETAILS = "details";
var DFN = "dfn";
var DIALOG = "dialog";
var DIV = "div";
var DL = "dl";
var DT = "dt";
var EM = "em";
var EMBED = "embed";
var FIELDSET = "fieldset";
var FIGCAPTION = "figcaption";
var FIGURE = "figure";
var FOOTER = "footer";
var FORM = "form";
var H1 = "h1";
var H2 = "h2";
var H3 = "h3";
var H4 = "h4";
var H5 = "h5";
var H6 = "h6";
var HEAD = "head";
var HEADER = "header";
var HGROUP = "hgroup";
var HR = "hr";
var HTML = "html";
var I = "i";
var IFRAME = "iframe";
var IMG = "img";
var INPUT = "input";
var INS = "ins";
var KBD = "kbd";
var LABEL = "label";
var LEGEND = "legend";
var LI = "li";
var LINK = "link";
var MAIN = "main";
var MAP = "map";
var MARK = "mark";
var MENU = "menu";
var META = "meta";
var METER = "meter";
var NAV = "nav";
var NOSCRIPT = "noscript";
var OBJECT = "object";
var OL = "ol";
var OPTGROUP = "optgroup";
var OPTION = "option";
var OUTPUT = "output";
var P = "p";
var PICTURE = "picture";
var PRE = "pre";
var PROGRESS = "progress";
var Q = "q";
var RP = "rp";
var RT = "rt";
var RUBY = "ruby";
var S = "s";
var SAMP = "samp";
var SCRIPT = "script";
var SEARCH = "search";
var SECTION = "section";
var SELECT = "select";
var SLOT = "slot";
var SMALL = "small";
var SOURCE = "source";
var SPAN = "span";
var STRONG = "strong";
var STYLE = "style";
var SUB = "sub";
var SUMMARY = "summary";
var SUP = "sup";
var TABLE = "table";
var TBODY = "tbody";
var TD = "td";
var TEMPLATE = "template";
var TEXTAREA = "textarea";
var TFOOT = "tfoot";
var TH = "th";
var THEAD = "thead";
var TIME = "time";
var TITLE = "title";
var TR = "tr";
var TRACK = "track";
var U = "u";
var UL = "ul";
var VAR = "var";
var VIDEO = "video";
var WBR = "wbr";
var ANIMATE = "animate";
var ANIMATEMOTION = "animateMotion";
var ANIMATETRANSFORM = "animateTransform";
var CIRCLE = "circle";
var CLIPPATH = "clipPath";
var DEFS = "defs";
var DESC = "desc";
var ELLIPSE = "ellipse";
var FEBLEND = "feBlend";
var FECOLORMATRIX = "feColorMatrix";
var FECOMPONENTTRANSFER = "feComponentTransfer";
var FECOMPOSITE = "feComposite";
var FECONVOLVEMATRIX = "feConvolveMatrix";
var FEDIFFUSELIGHTING = "feDiffuseLighting";
var FEDISPLACEMENTMAP = "feDisplacementMap";
var FEDISTANTLIGHT = "feDistantLight";
var FEDROPSHADOW = "feDropShadow";
var FEFLOOD = "feFlood";
var FEFUNCA = "feFuncA";
var FEFUNCB = "feFuncB";
var FEFUNCG = "feFuncG";
var FEFUNCR = "feFuncR";
var FEGAUSSIANBLUR = "feGaussianBlur";
var FEIMAGE = "feImage";
var FEMERGE = "feMerge";
var FEMERGENODE = "feMergeNode";
var FEMORPHOLOGY = "feMorphology";
var FEOFFSET = "feOffset";
var FEPOINTLIGHT = "fePointLight";
var FESPECULARLIGHTING = "feSpecularLighting";
var FESPOTLIGHT = "feSpotLight";
var FETILE = "feTile";
var FETURBULENCE = "feTurbulence";
var FILTER = "filter";
var FOREIGNOBJECT = "foreignObject";
var G = "g";
var IMAGE = "image";
var LINE = "line";
var LINEARGRADIENT = "linearGradient";
var MARKER = "marker";
var MASK = "mask";
var METADATA = "metadata";
var MPATH = "mpath";
var PATH = "path";
var PATTERN = "pattern";
var POLYGON = "polygon";
var POLYLINE = "polyline";
var RADIALGRADIENT = "radialGradient";
var RECT = "rect";
var SET = "set";
var STOP = "stop";
var SVG = "svg";
var SWITCH = "switch";
var SYMBOL = "symbol";
var TEXT = "text";
var TEXTPATH = "textPath";
var TSPAN = "tspan";
var USE = "use";
var VIEW = "view";
var ANNOTATION = "annotation";
var ANNOTATION_XML = "annotation-xml";
var MACTION = "maction";
var MATH = "math";
var MERROR = "merror";
var MFRAC = "mfrac";
var MI = "mi";
var MMULTISCRIPTS = "mmultiscripts";
var MN = "mn";
var MO = "mo";
var MOVER = "mover";
var MPADDED = "mpadded";
var MPHANTOM = "mphantom";
var MPRESCRIPTS = "mprescripts";
var MROOT = "mroot";
var MROW = "mrow";
var MS = "ms";
var MSPACE = "mspace";
var MSQRT = "msqrt";
var MSTYLE = "mstyle";
var MSUB = "msub";
var MSUBSUP = "msubsup";
var MSUP = "msup";
var MTABLE = "mtable";
var MTD = "mtd";
var MTEXT = "mtext";
var MTR = "mtr";
var MUNDER = "munder";
var MUNDEROVER = "munderover";
var SEMANTICS = "semantics";
export {
  A,
  ABBR,
  ADDRESS,
  ANIMATE,
  ANIMATEMOTION,
  ANIMATETRANSFORM,
  ANNOTATION,
  ANNOTATION_XML,
  AREA,
  ARTICLE,
  ASIDE,
  AUDIO,
  B,
  BASE,
  BDI,
  BDO,
  BLOCKQUOTE,
  BODY,
  BR,
  BUTTON,
  CANVAS,
  CAPTION,
  CIRCLE,
  CITE,
  CLIPPATH,
  CODE,
  COL,
  COLGROUP,
  DATA,
  DATALIST,
  DD,
  DEFS,
  DEL,
  DESC,
  DETAILS,
  DFN,
  DIALOG,
  DIV,
  DL,
  DT,
  ELLIPSE,
  EM,
  EMBED,
  FEBLEND,
  FECOLORMATRIX,
  FECOMPONENTTRANSFER,
  FECOMPOSITE,
  FECONVOLVEMATRIX,
  FEDIFFUSELIGHTING,
  FEDISPLACEMENTMAP,
  FEDISTANTLIGHT,
  FEDROPSHADOW,
  FEFLOOD,
  FEFUNCA,
  FEFUNCB,
  FEFUNCG,
  FEFUNCR,
  FEGAUSSIANBLUR,
  FEIMAGE,
  FEMERGE,
  FEMERGENODE,
  FEMORPHOLOGY,
  FEOFFSET,
  FEPOINTLIGHT,
  FESPECULARLIGHTING,
  FESPOTLIGHT,
  FETILE,
  FETURBULENCE,
  FIELDSET,
  FIGCAPTION,
  FIGURE,
  FILTER,
  FOOTER,
  FOREIGNOBJECT,
  FORM,
  G,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  HEAD,
  HEADER,
  HGROUP,
  HR,
  HTML,
  I,
  IFRAME,
  IMAGE,
  IMG,
  INPUT,
  INS,
  KBD,
  LABEL,
  LEGEND,
  LI,
  LINE,
  LINEARGRADIENT,
  LINK,
  MACTION,
  MAIN,
  MAP,
  MARK,
  MARKER,
  MASK,
  MATH,
  MENU,
  MERROR,
  META,
  METADATA,
  METER,
  MFRAC,
  MI,
  MMULTISCRIPTS,
  MN,
  MO,
  MOVER,
  MPADDED,
  MPATH,
  MPHANTOM,
  MPRESCRIPTS,
  MROOT,
  MROW,
  MS,
  MSPACE,
  MSQRT,
  MSTYLE,
  MSUB,
  MSUBSUP,
  MSUP,
  MTABLE,
  MTD,
  MTEXT,
  MTR,
  MUNDER,
  MUNDEROVER,
  NAV,
  NODE,
  NOSCRIPT,
  OBJECT,
  OL,
  OPTGROUP,
  OPTION,
  OUTPUT,
  P,
  PATH,
  PATTERN,
  PICTURE,
  POLYGON,
  POLYLINE,
  PRE,
  PROGRESS,
  Q,
  RADIALGRADIENT,
  RECT,
  RP,
  RT,
  RUBY,
  S,
  SAMP,
  SCRIPT,
  SEARCH,
  SECTION,
  SELECT,
  SEMANTICS,
  SET,
  SLOT,
  SMALL,
  SOURCE,
  SPAN,
  STATS,
  STOP,
  STRONG,
  STYLE,
  SUB,
  SUMMARY,
  SUP,
  SVG,
  SWITCH,
  SYMBOL,
  TABLE,
  TBODY,
  TD,
  TEMPLATE,
  TEXT,
  TEXTAREA,
  TEXTPATH,
  TFOOT,
  TH,
  THEAD,
  TIME,
  TITLE,
  TR,
  TRACK,
  TSPAN,
  U,
  UL,
  USE,
  VAR,
  VIDEO,
  VIEW,
  VODE,
  WBR,
  app,
  child,
  childCount,
  children,
  childrenStart,
  context,
  createPatch,
  createState,
  defuse,
  hydrate,
  keyed,
  memo,
  mergeClass,
  mergeProps,
  mergeStyle,
  props,
  tag,
  vode
};
