// src/vode.ts
var globals = {
  currentViewTransition: undefined,
  requestAnimationFrame: window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : (cb) => cb(),
  startViewTransition: document.startViewTransition ? document.startViewTransition.bind(document) : null
};
function vode(tag, props, ...children) {
  if (!tag)
    throw new Error("first argument to vode() must be a tag name or a vode");
  if (Array.isArray(tag))
    return tag;
  else if (props)
    return [tag, props, ...children];
  else
    return [tag, ...children];
}
function app(container, state, dom, ...initialPatches) {
  if (!container?.parentElement)
    throw new Error("first argument to app() must be a valid HTMLElement inside the <html></html> document");
  if (!state || typeof state !== "object")
    throw new Error("second argument to app() must be a state object");
  if (typeof dom !== "function")
    throw new Error("third argument to app() must be a function that returns a vode");
  const _vode = {};
  _vode.syncRenderer = globals.requestAnimationFrame;
  _vode.asyncRenderer = globals.startViewTransition;
  _vode.qSync = null;
  _vode.qAsync = null;
  _vode.stats = { lastSyncRenderTime: 0, lastAsyncRenderTime: 0, syncRenderCount: 0, asyncRenderCount: 0, liveEffectCount: 0, patchCount: 0, syncRenderPatchCount: 0, asyncRenderPatchCount: 0 };
  Object.defineProperty(state, "patch", {
    enumerable: false,
    configurable: true,
    writable: false,
    value: async (action, isAsync) => {
      if (!action || typeof action !== "function" && typeof action !== "object")
        return;
      _vode.stats.patchCount++;
      if (action?.next) {
        const generator = action;
        _vode.stats.liveEffectCount++;
        try {
          let v = await generator.next();
          while (v.done === false) {
            _vode.stats.liveEffectCount++;
            try {
              _vode.patch(v.value, isAsync);
              v = await generator.next();
            } finally {
              _vode.stats.liveEffectCount--;
            }
          }
          _vode.patch(v.value, isAsync);
        } finally {
          _vode.stats.liveEffectCount--;
        }
      } else if (action.then) {
        _vode.stats.liveEffectCount++;
        try {
          const nextState = await action;
          _vode.patch(nextState, isAsync);
        } finally {
          _vode.stats.liveEffectCount--;
        }
      } else if (Array.isArray(action)) {
        if (action.length > 0) {
          for (const p of action) {
            _vode.patch(p, !document.hidden && !!_vode.asyncRenderer);
          }
        } else {
          _vode.qSync = mergeState(_vode.qSync || {}, _vode.qAsync, false);
          _vode.qAsync = null;
          try {
            globals.currentViewTransition?.skipTransition();
          } catch {}
          _vode.stats.syncRenderPatchCount++;
          _vode.renderSync();
        }
      } else if (typeof action === "function") {
        _vode.patch(action(_vode.state), isAsync);
      } else {
        if (isAsync) {
          _vode.stats.asyncRenderPatchCount++;
          _vode.qAsync = mergeState(_vode.qAsync || {}, action, false);
          await _vode.renderAsync();
        } else {
          _vode.stats.syncRenderPatchCount++;
          _vode.qSync = mergeState(_vode.qSync || {}, action, false);
          _vode.renderSync();
        }
      }
    }
  });
  function renderDom(isAsync) {
    const sw = Date.now();
    const vom = dom(_vode.state);
    _vode.vode = render(_vode.state, _vode.patch, container.parentElement, 0, _vode.vode, vom);
    if (container.tagName.toUpperCase() !== vom[0].toUpperCase()) {
      container = _vode.vode.node;
      container._vode = _vode;
    }
    if (!isAsync) {
      _vode.stats.lastSyncRenderTime = Date.now() - sw;
      _vode.stats.syncRenderCount++;
      _vode.isRendering = false;
      if (_vode.qSync)
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
      if (_vode.isRendering || !_vode.qSync)
        return;
      _vode.isRendering = true;
      _vode.state = mergeState(_vode.state, _vode.qSync, true);
      _vode.qSync = null;
      _vode.syncRenderer(sr);
    }
  });
  Object.defineProperty(_vode, "renderAsync", {
    enumerable: false,
    configurable: true,
    writable: false,
    value: async () => {
      if (_vode.isAnimating || !_vode.qAsync)
        return;
      await globals.currentViewTransition?.updateCallbackDone;
      if (_vode.isAnimating || !_vode.qAsync || document.hidden)
        return;
      _vode.isAnimating = true;
      const sw = Date.now();
      try {
        _vode.state = mergeState(_vode.state, _vode.qAsync, true);
        _vode.qAsync = null;
        globals.currentViewTransition = _vode.asyncRenderer(ar);
        await globals.currentViewTransition?.updateCallbackDone;
      } finally {
        _vode.stats.lastAsyncRenderTime = Date.now() - sw;
        _vode.stats.asyncRenderCount++;
        _vode.isAnimating = false;
      }
      if (_vode.qAsync)
        _vode.renderAsync();
    }
  });
  _vode.patch = state.patch;
  _vode.state = state;
  const root = container;
  root._vode = _vode;
  _vode.vode = render(state, _vode.patch, container.parentElement, Array.from(container.parentElement.children).indexOf(container), hydrate(container, true), dom(state));
  for (const effect of initialPatches) {
    _vode.patch(effect);
  }
  return _vode.patch;
}
function hydrate(element, prepareForRender) {
  if (element?.nodeType === Node.TEXT_NODE) {
    if (element.nodeValue?.trim() !== "")
      return prepareForRender ? element : element.nodeValue;
    return;
  } else if (element.nodeType === Node.COMMENT_NODE) {
    return;
  } else if (element.nodeType === Node.ELEMENT_NODE) {
    const tag = element.tagName.toLowerCase();
    const root = [tag];
    if (prepareForRender)
      root.node = element;
    if (element?.hasAttributes()) {
      const props = {};
      const attr = element.attributes;
      for (let a of attr) {
        props[a.name] = a.value;
      }
      root.push(props);
    }
    if (element.hasChildNodes()) {
      const remove = [];
      for (let child of element.childNodes) {
        const wet = child && hydrate(child, prepareForRender);
        if (wet)
          root.push(wet);
        else if (child && prepareForRender)
          remove.push(child);
      }
      for (let child of remove) {
        child.remove();
      }
    }
    return root;
  } else {
    return;
  }
}
function memo(compare, componentOrProps) {
  if (!compare || !Array.isArray(compare))
    throw new Error("first argument to memo() must be an array of values to compare");
  if (typeof componentOrProps !== "function")
    throw new Error("second argument to memo() must be a function that returns a vode or props object");
  componentOrProps.__memo = compare;
  return componentOrProps;
}
function createState(state) {
  if (!state || typeof state !== "object")
    throw new Error("createState() must be called with a state object");
  return state;
}
function createPatch(p) {
  return p;
}
function tag(v) {
  return v ? Array.isArray(v) ? v[0] : typeof v === "string" || v.nodeType === Node.TEXT_NODE ? "#text" : undefined : undefined;
}
function props(vode2) {
  if (Array.isArray(vode2) && vode2.length > 1 && vode2[1] && !Array.isArray(vode2[1])) {
    if (typeof vode2[1] === "object" && vode2[1].nodeType !== Node.TEXT_NODE) {
      return vode2[1];
    }
  }
  return;
}
function children(vode2) {
  const start = childrenStart(vode2);
  if (start > 0) {
    return vode2.slice(start);
  }
  return null;
}
function childCount(vode2) {
  const start = childrenStart(vode2);
  if (start < 0)
    return 0;
  return vode2.length - start;
}
function child(vode2, index) {
  const start = childrenStart(vode2);
  if (start > 0)
    return vode2[index + start];
  else
    return;
}
function childrenStart(vode2) {
  return props(vode2) ? vode2.length > 2 ? 2 : -1 : Array.isArray(vode2) && vode2.length > 1 ? 1 : -1;
}
function mergeState(target, source, allowDeletion) {
  if (!source)
    return target;
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
          if (Array.isArray(targetValue))
            target[key] = mergeState({}, value, allowDeletion);
          else if (typeof targetValue === "object")
            mergeState(target[key], value, allowDeletion);
          else
            target[key] = mergeState({}, value, allowDeletion);
        }
      } else if (Array.isArray(value)) {
        target[key] = [...value];
      } else if (value instanceof Date) {
        target[key] = new Date(value);
      } else {
        target[key] = mergeState({}, value, allowDeletion);
      }
    } else if (value === undefined && allowDeletion) {
      delete target[key];
    } else {
      target[key] = value;
    }
  }
  return target;
}
function render(state, patch, parent, childIndex, oldVode, newVode, xmlns) {
  newVode = remember(state, newVode, oldVode);
  const isNoVode = !newVode || typeof newVode === "number" || typeof newVode === "boolean";
  if (newVode === oldVode || !oldVode && isNoVode) {
    return oldVode;
  }
  const oldIsText = oldVode?.nodeType === Node.TEXT_NODE;
  const oldNode = oldIsText ? oldVode : oldVode?.node;
  if (isNoVode) {
    oldNode?.onUnmount && patch(oldNode.onUnmount(oldNode));
    oldNode?.remove();
    return;
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
      oldNode.onUnmount && patch(oldNode.onUnmount(oldNode));
      oldNode.replaceWith(text);
    } else {
      if (parent.childNodes[childIndex]) {
        parent.insertBefore(text, parent.childNodes[childIndex]);
      } else {
        parent.appendChild(text);
      }
    }
    return text;
  }
  if (isNode && (!oldNode || oldIsText || oldVode[0] !== newVode[0])) {
    const newvode = newVode;
    if (1 in newvode) {
      newvode[1] = remember(state, newvode[1], undefined);
    }
    const properties = props(newVode);
    xmlns = properties?.xmlns || xmlns;
    const newNode = xmlns ? document.createElementNS(xmlns, newVode[0]) : document.createElement(newVode[0]);
    newVode.node = newNode;
    patchProperties(state, patch, newNode, undefined, properties);
    if (oldNode) {
      oldNode.onUnmount && patch(oldNode.onUnmount(oldNode));
      oldNode.replaceWith(newNode);
    } else {
      if (parent.childNodes[childIndex]) {
        parent.insertBefore(newNode, parent.childNodes[childIndex]);
      } else {
        parent.appendChild(newNode);
      }
    }
    const newChildren = children(newVode);
    if (newChildren) {
      for (let i = 0;i < newChildren.length; i++) {
        const child2 = newChildren[i];
        const attached = render(state, patch, newNode, i, undefined, child2, xmlns);
        newVode[properties ? i + 2 : i + 1] = attached;
      }
    }
    newNode.onMount && patch(newNode.onMount(newNode));
    return newVode;
  }
  if (!oldIsText && isNode && oldVode[0] === newVode[0]) {
    newVode.node = oldNode;
    const newvode = newVode;
    const oldvode = oldVode;
    let hasProps = false;
    if (newvode[1]?.__memo) {
      const prev = newvode[1];
      newvode[1] = remember(state, newvode[1], oldvode[1]);
      if (prev !== newvode[1]) {
        const properties = props(newVode);
        patchProperties(state, patch, oldNode, props(oldVode), properties);
        hasProps = !!properties;
      }
    } else {
      const properties = props(newVode);
      patchProperties(state, patch, oldNode, props(oldVode), properties);
      hasProps = !!properties;
    }
    const newKids = children(newVode);
    const oldKids = children(oldVode);
    if (newKids) {
      for (let i = 0;i < newKids.length; i++) {
        const child2 = newKids[i];
        const oldChild = oldKids && oldKids[i];
        const attached = render(state, patch, oldNode, i, oldChild, child2, xmlns);
        if (attached) {
          newVode[hasProps ? i + 2 : i + 1] = attached;
        }
      }
    }
    if (oldKids) {
      const newKidsCount = newKids ? newKids.length : 0;
      for (let i = oldKids.length - 1;i >= newKidsCount; i--) {
        render(state, patch, oldNode, i, oldKids[i], undefined, xmlns);
      }
    }
    return newVode;
  }
  return;
}
function isNaturalVode(x) {
  return Array.isArray(x) && x.length > 0 && typeof x[0] === "string";
}
function isTextVode(x) {
  return typeof x === "string" || x?.nodeType === Node.TEXT_NODE;
}
function remember(state, present, past) {
  if (typeof present !== "function")
    return present;
  const presentMemo = present?.__memo;
  const pastMemo = past?.__memo;
  if (Array.isArray(presentMemo) && Array.isArray(pastMemo) && presentMemo.length === pastMemo.length) {
    let same = true;
    for (let i = 0;i < presentMemo.length; i++) {
      if (presentMemo[i] !== pastMemo[i]) {
        same = false;
        break;
      }
    }
    if (same)
      return past;
  }
  const newRender = unwrap(present, state);
  if (typeof newRender === "object") {
    newRender.__memo = present?.__memo;
  }
  return newRender;
}
function unwrap(c, s) {
  if (typeof c === "function") {
    return unwrap(c(s), s);
  } else {
    return c;
  }
}
function patchProperties(s, patch, node, oldProps, newProps) {
  if (!newProps && !oldProps)
    return;
  if (oldProps) {
    for (const key in oldProps) {
      const oldValue = oldProps[key];
      const newValue = newProps?.[key];
      if (oldValue !== newValue) {
        if (newProps)
          newProps[key] = patchProperty(s, patch, node, key, oldValue, newValue);
        else
          patchProperty(s, patch, node, key, oldValue, undefined);
      }
    }
  }
  if (newProps && oldProps) {
    for (const key in newProps) {
      if (!(key in oldProps)) {
        const newValue = newProps[key];
        newProps[key] = patchProperty(s, patch, node, key, undefined, newValue);
      }
    }
  } else if (newProps) {
    for (const key in newProps) {
      const newValue = newProps[key];
      newProps[key] = patchProperty(s, patch, node, key, undefined, newValue);
    }
  }
}
function patchProperty(s, patch, node, key, oldValue, newValue) {
  if (key === "style") {
    if (!newValue) {
      node.style.cssText = "";
    } else if (typeof newValue === "string") {
      if (oldValue !== newValue)
        node.style.cssText = newValue;
    } else if (oldValue && typeof oldValue === "object") {
      for (let k in { ...oldValue, ...newValue }) {
        if (!oldValue || newValue[k] !== oldValue[k]) {
          node.style[k] = newValue[k];
        } else if (oldValue[k] && !newValue[k]) {
          node.style[k] = undefined;
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
        eventHandler = (evt) => patch(action(s, evt));
      } else if (typeof newValue === "object") {
        eventHandler = () => patch(newValue);
      }
      node[key] = eventHandler;
    } else {
      node[key] = null;
    }
  } else if (newValue !== null && newValue !== undefined && newValue !== false) {
    node.setAttribute(key, newValue);
  } else {
    node.removeAttribute(key);
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
// src/merge-class.ts
function mergeClass(...classes) {
  if (!classes || classes.length === 0)
    return null;
  if (classes.length === 1)
    return classes[0];
  let finalClass = classes[0];
  for (let index = 1;index < classes.length; index++) {
    const a = finalClass, b = classes[index];
    if (!a) {
      finalClass = b;
    } else if (!b) {
      continue;
    } else if (typeof a === "string" && typeof b === "string") {
      const aSplit = a.split(" ");
      const bSplit = b.split(" ");
      const classSet = new Set([...aSplit, ...bSplit]);
      finalClass = Array.from(classSet).join(" ").trim();
    } else if (typeof a === "string" && Array.isArray(b)) {
      const classSet = new Set([...b, ...a.split(" ")]);
      finalClass = Array.from(classSet).join(" ").trim();
    } else if (Array.isArray(a) && typeof b === "string") {
      const classSet = new Set([...a, ...b.split(" ")]);
      finalClass = Array.from(classSet).join(" ").trim();
    } else if (Array.isArray(a) && Array.isArray(b)) {
      const classSet = new Set([...a, ...b]);
      finalClass = Array.from(classSet).join(" ").trim();
    } else if (typeof a === "string" && typeof b === "object") {
      finalClass = { [a]: true, ...b };
    } else if (typeof a === "object" && typeof b === "string") {
      finalClass = { ...a, [b]: true };
    } else if (typeof a === "object" && typeof b === "object") {
      finalClass = { ...a, ...b };
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
    } else
      throw new Error(`cannot merge classes of ${a} (${typeof a}) and ${b} (${typeof b})`);
  }
  return finalClass;
}
// src/state-context.ts
class KeyStateContext {
  state;
  path;
  keys;
  constructor(state, path) {
    this.state = state;
    this.path = path;
    this.keys = path.split(".");
  }
  get() {
    const keys = this.keys;
    let raw = this.state ? this.state[keys[0]] : undefined;
    for (let i = 1;i < keys.length && !!raw; i++) {
      raw = raw[keys[i]];
    }
    return raw;
  }
  put(value) {
    this.putDeep(value, this.state);
  }
  patch(value) {
    if (Array.isArray(value)) {
      const animation = [];
      for (const v of value) {
        animation.push(this.createPatch(v));
      }
      this.state.patch(animation);
    } else {
      this.state.patch(this.createPatch(value));
    }
  }
  createPatch(value) {
    const renderPatch = {};
    this.putDeep(value, renderPatch);
    return renderPatch;
  }
  putDeep(value, target) {
    const keys = this.keys;
    if (keys.length > 1) {
      let i = 0;
      let raw = target[keys[i]];
      if (typeof raw !== "object" || raw === null) {
        target[keys[i]] = raw = {};
      }
      for (i = 1;i < keys.length - 1; i++) {
        const p = raw;
        raw = raw[keys[i]];
        if (typeof raw !== "object" || raw === null) {
          p[keys[i]] = raw = {};
        }
      }
      raw[keys[i]] = value;
    } else {
      if (typeof target[keys[0]] === "object" && typeof value === "object")
        Object.assign(target[keys[0]], value);
      else
        target[keys[0]] = value;
    }
  }
}

class DelegateStateContext {
  state;
  get;
  put;
  patch;
  constructor(state, get, put, patch) {
    this.state = state;
    this.get = get;
    this.put = put;
    this.patch = patch;
  }
}
export {
  vode,
  tag,
  props,
  mergeClass,
  memo,
  hydrate,
  globals,
  createState,
  createPatch,
  childrenStart,
  children,
  childCount,
  child,
  app,
  WBR,
  VIEW,
  VIDEO,
  VAR,
  USE,
  UL,
  U,
  TSPAN,
  TRACK,
  TR,
  TITLE,
  TIME,
  THEAD,
  TH,
  TFOOT,
  TEXTPATH,
  TEXTAREA,
  TEXT,
  TEMPLATE,
  TD,
  TBODY,
  TABLE,
  SYMBOL,
  SWITCH,
  SVG,
  SUP,
  SUMMARY,
  SUB,
  STYLE,
  STRONG,
  STOP,
  SPAN,
  SOURCE,
  SMALL,
  SLOT,
  SET,
  SEMANTICS,
  SELECT,
  SECTION,
  SEARCH,
  SCRIPT,
  SAMP,
  S,
  RUBY,
  RT,
  RP,
  RECT,
  RADIALGRADIENT,
  Q,
  PROGRESS,
  PRE,
  POLYLINE,
  POLYGON,
  PICTURE,
  PATTERN,
  PATH,
  P,
  OUTPUT,
  OPTION,
  OPTGROUP,
  OL,
  OBJECT,
  NOSCRIPT,
  NAV,
  MUNDEROVER,
  MUNDER,
  MTR,
  MTEXT,
  MTD,
  MTABLE,
  MSUP,
  MSUBSUP,
  MSUB,
  MSTYLE,
  MSQRT,
  MSPACE,
  MS,
  MROW,
  MROOT,
  MPRESCRIPTS,
  MPHANTOM,
  MPATH,
  MPADDED,
  MOVER,
  MO,
  MN,
  MMULTISCRIPTS,
  MI,
  MFRAC,
  METER,
  METADATA,
  META,
  MERROR,
  MENU,
  MATH,
  MASK,
  MARKER,
  MARK,
  MAP,
  MAIN,
  MACTION,
  LINK,
  LINEARGRADIENT,
  LINE,
  LI,
  LEGEND,
  LABEL,
  KeyStateContext,
  KBD,
  INS,
  INPUT,
  IMG,
  IMAGE,
  IFRAME,
  I,
  HTML,
  HR,
  HGROUP,
  HEADER,
  HEAD,
  H6,
  H5,
  H4,
  H3,
  H2,
  H1,
  G,
  FORM,
  FOREIGNOBJECT,
  FOOTER,
  FILTER,
  FIGURE,
  FIGCAPTION,
  FIELDSET,
  FETURBULENCE,
  FETILE,
  FESPOTLIGHT,
  FESPECULARLIGHTING,
  FEPOINTLIGHT,
  FEOFFSET,
  FEMORPHOLOGY,
  FEMERGENODE,
  FEMERGE,
  FEIMAGE,
  FEGAUSSIANBLUR,
  FEFUNCR,
  FEFUNCG,
  FEFUNCB,
  FEFUNCA,
  FEFLOOD,
  FEDROPSHADOW,
  FEDISTANTLIGHT,
  FEDISPLACEMENTMAP,
  FEDIFFUSELIGHTING,
  FECONVOLVEMATRIX,
  FECOMPOSITE,
  FECOMPONENTTRANSFER,
  FECOLORMATRIX,
  FEBLEND,
  EMBED,
  EM,
  ELLIPSE,
  DelegateStateContext,
  DT,
  DL,
  DIV,
  DIALOG,
  DFN,
  DETAILS,
  DESC,
  DEL,
  DEFS,
  DD,
  DATALIST,
  DATA,
  COLGROUP,
  COL,
  CODE,
  CLIPPATH,
  CITE,
  CIRCLE,
  CAPTION,
  CANVAS,
  BUTTON,
  BR,
  BODY,
  BLOCKQUOTE,
  BDO,
  BDI,
  BASE,
  B,
  AUDIO,
  ASIDE,
  ARTICLE,
  AREA,
  ANNOTATION_XML,
  ANNOTATION,
  ANIMATETRANSFORM,
  ANIMATEMOTION,
  ANIMATE,
  ADDRESS,
  ABBR,
  A
};
