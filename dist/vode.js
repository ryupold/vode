"use strict";
var V = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // index.ts
  var index_exports = {};
  __export(index_exports, {
    A: () => A,
    ABBR: () => ABBR,
    ADDRESS: () => ADDRESS,
    ANIMATE: () => ANIMATE,
    ANIMATEMOTION: () => ANIMATEMOTION,
    ANIMATETRANSFORM: () => ANIMATETRANSFORM,
    ANNOTATION: () => ANNOTATION,
    ANNOTATION_XML: () => ANNOTATION_XML,
    AREA: () => AREA,
    ARTICLE: () => ARTICLE,
    ASIDE: () => ASIDE,
    AUDIO: () => AUDIO,
    B: () => B,
    BASE: () => BASE,
    BDI: () => BDI,
    BDO: () => BDO,
    BLOCKQUOTE: () => BLOCKQUOTE,
    BODY: () => BODY,
    BR: () => BR,
    BUTTON: () => BUTTON,
    CANVAS: () => CANVAS,
    CAPTION: () => CAPTION,
    CIRCLE: () => CIRCLE,
    CITE: () => CITE,
    CLIPPATH: () => CLIPPATH,
    CODE: () => CODE,
    COL: () => COL,
    COLGROUP: () => COLGROUP,
    DATA: () => DATA,
    DATALIST: () => DATALIST,
    DD: () => DD,
    DEFS: () => DEFS,
    DEL: () => DEL,
    DESC: () => DESC,
    DETAILS: () => DETAILS,
    DFN: () => DFN,
    DIALOG: () => DIALOG,
    DIV: () => DIV,
    DL: () => DL,
    DT: () => DT,
    DelegateStateContext: () => DelegateStateContext,
    ELLIPSE: () => ELLIPSE,
    EM: () => EM,
    EMBED: () => EMBED,
    FEBLEND: () => FEBLEND,
    FECOLORMATRIX: () => FECOLORMATRIX,
    FECOMPONENTTRANSFER: () => FECOMPONENTTRANSFER,
    FECOMPOSITE: () => FECOMPOSITE,
    FECONVOLVEMATRIX: () => FECONVOLVEMATRIX,
    FEDIFFUSELIGHTING: () => FEDIFFUSELIGHTING,
    FEDISPLACEMENTMAP: () => FEDISPLACEMENTMAP,
    FEDISTANTLIGHT: () => FEDISTANTLIGHT,
    FEDROPSHADOW: () => FEDROPSHADOW,
    FEFLOOD: () => FEFLOOD,
    FEFUNCA: () => FEFUNCA,
    FEFUNCB: () => FEFUNCB,
    FEFUNCG: () => FEFUNCG,
    FEFUNCR: () => FEFUNCR,
    FEGAUSSIANBLUR: () => FEGAUSSIANBLUR,
    FEIMAGE: () => FEIMAGE,
    FEMERGE: () => FEMERGE,
    FEMERGENODE: () => FEMERGENODE,
    FEMORPHOLOGY: () => FEMORPHOLOGY,
    FEOFFSET: () => FEOFFSET,
    FEPOINTLIGHT: () => FEPOINTLIGHT,
    FESPECULARLIGHTING: () => FESPECULARLIGHTING,
    FESPOTLIGHT: () => FESPOTLIGHT,
    FETILE: () => FETILE,
    FETURBULENCE: () => FETURBULENCE,
    FIELDSET: () => FIELDSET,
    FIGCAPTION: () => FIGCAPTION,
    FIGURE: () => FIGURE,
    FILTER: () => FILTER,
    FOOTER: () => FOOTER,
    FOREIGNOBJECT: () => FOREIGNOBJECT,
    FORM: () => FORM,
    G: () => G,
    H1: () => H1,
    H2: () => H2,
    H3: () => H3,
    H4: () => H4,
    H5: () => H5,
    H6: () => H6,
    HEAD: () => HEAD,
    HEADER: () => HEADER,
    HGROUP: () => HGROUP,
    HR: () => HR,
    HTML: () => HTML,
    I: () => I,
    IFRAME: () => IFRAME,
    IMAGE: () => IMAGE,
    IMG: () => IMG,
    INPUT: () => INPUT,
    INS: () => INS,
    KBD: () => KBD,
    KeyStateContext: () => KeyStateContext,
    LABEL: () => LABEL,
    LEGEND: () => LEGEND,
    LI: () => LI,
    LINE: () => LINE,
    LINEARGRADIENT: () => LINEARGRADIENT,
    LINK: () => LINK,
    MACTION: () => MACTION,
    MAIN: () => MAIN,
    MAP: () => MAP,
    MARK: () => MARK,
    MARKER: () => MARKER,
    MASK: () => MASK,
    MATH: () => MATH,
    MENU: () => MENU,
    MERROR: () => MERROR,
    META: () => META,
    METADATA: () => METADATA,
    METER: () => METER,
    MFRAC: () => MFRAC,
    MI: () => MI,
    MMULTISCRIPTS: () => MMULTISCRIPTS,
    MN: () => MN,
    MO: () => MO,
    MOVER: () => MOVER,
    MPADDED: () => MPADDED,
    MPATH: () => MPATH,
    MPHANTOM: () => MPHANTOM,
    MPRESCRIPTS: () => MPRESCRIPTS,
    MROOT: () => MROOT,
    MROW: () => MROW,
    MS: () => MS,
    MSPACE: () => MSPACE,
    MSQRT: () => MSQRT,
    MSTYLE: () => MSTYLE,
    MSUB: () => MSUB,
    MSUBSUP: () => MSUBSUP,
    MSUP: () => MSUP,
    MTABLE: () => MTABLE,
    MTD: () => MTD,
    MTEXT: () => MTEXT,
    MTR: () => MTR,
    MUNDER: () => MUNDER,
    MUNDEROVER: () => MUNDEROVER,
    NAV: () => NAV,
    NOSCRIPT: () => NOSCRIPT,
    OBJECT: () => OBJECT,
    OL: () => OL,
    OPTGROUP: () => OPTGROUP,
    OPTION: () => OPTION,
    OUTPUT: () => OUTPUT,
    P: () => P,
    PATH: () => PATH,
    PATTERN: () => PATTERN,
    PICTURE: () => PICTURE,
    POLYGON: () => POLYGON,
    POLYLINE: () => POLYLINE,
    PRE: () => PRE,
    PROGRESS: () => PROGRESS,
    Q: () => Q,
    RADIALGRADIENT: () => RADIALGRADIENT,
    RECT: () => RECT,
    RP: () => RP,
    RT: () => RT,
    RUBY: () => RUBY,
    S: () => S,
    SAMP: () => SAMP,
    SCRIPT: () => SCRIPT,
    SEARCH: () => SEARCH,
    SECTION: () => SECTION,
    SELECT: () => SELECT,
    SEMANTICS: () => SEMANTICS,
    SET: () => SET,
    SLOT: () => SLOT,
    SMALL: () => SMALL,
    SOURCE: () => SOURCE,
    SPAN: () => SPAN,
    STOP: () => STOP,
    STRONG: () => STRONG,
    STYLE: () => STYLE,
    SUB: () => SUB,
    SUMMARY: () => SUMMARY,
    SUP: () => SUP,
    SVG: () => SVG,
    SWITCH: () => SWITCH,
    SYMBOL: () => SYMBOL,
    TABLE: () => TABLE,
    TBODY: () => TBODY,
    TD: () => TD,
    TEMPLATE: () => TEMPLATE,
    TEXT: () => TEXT,
    TEXTAREA: () => TEXTAREA,
    TEXTPATH: () => TEXTPATH,
    TFOOT: () => TFOOT,
    TH: () => TH,
    THEAD: () => THEAD,
    TIME: () => TIME,
    TITLE: () => TITLE,
    TR: () => TR,
    TRACK: () => TRACK,
    TSPAN: () => TSPAN,
    U: () => U,
    UL: () => UL,
    USE: () => USE,
    VAR: () => VAR,
    VIDEO: () => VIDEO,
    VIEW: () => VIEW,
    WBR: () => WBR,
    app: () => app,
    child: () => child,
    childCount: () => childCount,
    children: () => children,
    childrenStart: () => childrenStart,
    createPatch: () => createPatch,
    createState: () => createState,
    hydrate: () => hydrate,
    memo: () => memo,
    mergeClass: () => mergeClass,
    props: () => props,
    renderFunctions: () => renderFunctions,
    tag: () => tag,
    vode: () => vode
  });

  // src/vode.js
  var renderFunctions = {
    requestAnimationFrame: !!window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : ((cb) => cb()),
    startViewTransition: !!document.startViewTransition ? document.startViewTransition.bind(document) : !!window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : ((cb) => cb())
  };
  function vode(tag2, props2, ...children2) {
    if (!tag2)
      throw new Error("first argument to vode() must be a tag name or a vode");
    if (Array.isArray(tag2))
      return tag2;
    else if (props2)
      return [tag2, props2, ...children2];
    else
      return [tag2, ...children2];
  }
  function app(container, state, dom, ...initialPatches) {
    if (!container?.parentElement)
      throw new Error("first argument to app() must be a valid HTMLElement inside the <html></html> document");
    if (!state || typeof state !== "object")
      throw new Error("second argument to app() must be a state object");
    if (typeof dom !== "function")
      throw new Error("third argument to app() must be a function that returns a vode");
    const _vode = {};
    _vode.stats = { lastRenderTime: 0, renderCount: 0, liveEffectCount: 0, patchCount: 0, renderPatchCount: 0 };
    Object.defineProperty(state, "patch", {
      enumerable: false,
      configurable: true,
      writable: false,
      value: async (action, animate) => {
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
                _vode.patch(v.value, animate);
                v = await generator.next();
              } finally {
                _vode.stats.liveEffectCount--;
              }
            }
            _vode.patch(v.value, animate);
          } finally {
            _vode.stats.liveEffectCount--;
          }
        } else if (action.then) {
          _vode.stats.liveEffectCount++;
          try {
            const nextState = await action;
            _vode.patch(nextState, animate);
          } finally {
            _vode.stats.liveEffectCount--;
          }
        } else if (Array.isArray(action)) {
          _vode.stats.patchCount++;
          for (const p of action) {
            _vode.patch(p, true);
          }
        } else if (typeof action === "function") {
          _vode.patch(action(_vode.state), animate);
        } else {
          _vode.stats.renderPatchCount++;
          if (animate)
            _vode.qAnimate = mergeState(_vode.qAnimate || {}, action, false);
          else
            _vode.q = mergeState(_vode.q || {}, action, false);
          if (!_vode.isRendering)
            await _vode.render(animate);
        }
      }
    });
    Object.defineProperty(_vode, "render", {
      enumerable: false,
      configurable: true,
      writable: false,
      value: async (animate) => {
        if (!animate && (_vode.isRendering || !_vode.q) || animate && (_vode.isAnimating || !_vode.qAnimate))
          return;
        if (animate)
          _vode.isAnimating = true;
        else
          _vode.isRendering = true;
        _vode.state = mergeState(_vode.state, animate ? _vode.qAnimate : _vode.q, true);
        if (animate)
          _vode.qAnimate = null;
        else
          _vode.q = null;
        let sw = 0;
        const task = (animate && !document.hidden ? renderFunctions.startViewTransition : renderFunctions.requestAnimationFrame)(() => {
          try {
            sw = Date.now();
            const vom = dom(_vode.state);
            _vode.vode = render(_vode.state, _vode.patch, container.parentElement, 0, _vode.vode, vom);
            if (container.tagName.toUpperCase() !== vom[0].toUpperCase()) {
              container = _vode.vode.node;
              container._vode = _vode;
            }
            _vode.stats.lastRenderTime = Date.now() - sw;
            _vode.stats.renderCount++;
          } finally {
            if (!animate) {
              _vode.isRendering = false;
              if (_vode.q)
                _vode.render(animate);
            }
          }
        });
        if (animate) {
          try {
            await task?.finished;
          } finally {
            _vode.isAnimating = false;
            if (_vode.qAnimate)
              _vode.render(animate);
          }
        }
      }
    });
    _vode.patch = state.patch;
    _vode.state = state;
    _vode.q = null;
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
      return void 0;
    } else if (element.nodeType === Node.COMMENT_NODE) {
      return void 0;
    } else if (element.nodeType === Node.ELEMENT_NODE) {
      const tag2 = element.tagName.toLowerCase();
      const root = [tag2];
      if (prepareForRender)
        root.node = element;
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
          if (wet)
            root.push(wet);
          else if (child2 && prepareForRender)
            remove.push(child2);
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
    return !!v ? Array.isArray(v) ? v[0] : typeof v === "string" || v.nodeType === Node.TEXT_NODE ? "#text" : void 0 : void 0;
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
    return null;
  }
  function childCount(vode2) {
    return vode2.length - childrenStart(vode2);
  }
  function child(vode2, index) {
    return vode2[index + childrenStart(vode2)];
  }
  function childrenStart(vode2) {
    return props(vode2) ? 2 : 1;
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
      } else if (value === void 0 && allowDeletion) {
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
        newvode[1] = remember(state, newvode[1], void 0);
      }
      const properties = props(newVode);
      xmlns = properties?.xmlns || xmlns;
      const newNode = xmlns ? document.createElementNS(xmlns, newVode[0]) : document.createElement(newVode[0]);
      newVode.node = newNode;
      patchProperties(state, patch, newNode, void 0, properties);
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
        for (let i = 0; i < newChildren.length; i++) {
          const child2 = newChildren[i];
          const attached = render(state, patch, newNode, i, void 0, child2, xmlns);
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
        for (let i = 0; i < newKids.length; i++) {
          const child2 = newKids[i];
          const oldChild = oldKids && oldKids[i];
          const attached = render(state, patch, oldNode, i, oldChild, child2, xmlns);
          if (attached) {
            newVode[hasProps ? i + 2 : i + 1] = attached;
          }
        }
        for (let i = newKids.length; oldKids && i < oldKids.length; i++) {
          if (oldKids[i]?.node)
            oldKids[i].node.remove();
          else if (oldKids[i]?.nodeType === Node.TEXT_NODE)
            oldKids[i].remove();
        }
      }
      for (let i = newKids?.length || 0; i < oldKids?.length || 0; i++) {
        if (oldKids[i]?.node)
          oldKids[i].node.remove();
        else if (oldKids[i]?.nodeType === Node.TEXT_NODE)
          oldKids[i].remove();
      }
      return newVode;
    }
    return void 0;
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
      for (let i = 0; i < presentMemo.length; i++) {
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
            patchProperty(s, patch, node, key, oldValue, void 0);
        }
      }
    }
    if (newProps && oldProps) {
      for (const key in newProps) {
        if (!(key in oldProps)) {
          const newValue = newProps[key];
          newProps[key] = patchProperty(s, patch, node, key, void 0, newValue);
        }
      }
    } else if (newProps) {
      for (const key in newProps) {
        const newValue = newProps[key];
        newProps[key] = patchProperty(s, patch, node, key, void 0, newValue);
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
            node.style[k] = void 0;
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
    } else if (newValue !== null && newValue !== void 0 && newValue !== false) {
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

  // src/vode-tags.js
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

  // src/merge-class.js
  function mergeClass(a, b) {
    if (!a)
      return b;
    if (!b)
      return a;
    if (typeof a === "string" && typeof b === "string") {
      const aSplit = a.split(" ");
      const bSplit = b.split(" ");
      const classSet = /* @__PURE__ */ new Set([...aSplit, ...bSplit]);
      return Array.from(classSet).join(" ").trim();
    } else if (typeof a === "string" && Array.isArray(b)) {
      const classSet = /* @__PURE__ */ new Set([...b, ...a.split(" ")]);
      return Array.from(classSet).join(" ").trim();
    } else if (Array.isArray(a) && typeof b === "string") {
      const classSet = /* @__PURE__ */ new Set([...a, ...b.split(" ")]);
      return Array.from(classSet).join(" ").trim();
    } else if (Array.isArray(a) && Array.isArray(b)) {
      const classSet = /* @__PURE__ */ new Set([...a, ...b]);
      return Array.from(classSet).join(" ").trim();
    } else if (typeof a === "string" && typeof b === "object") {
      return { [a]: true, ...b };
    } else if (typeof a === "object" && typeof b === "string") {
      return { ...a, [b]: true };
    } else if (typeof a === "object" && typeof b === "object") {
      return { ...a, ...b };
    } else if (typeof a === "object" && Array.isArray(b)) {
      const aa = { ...a };
      for (const item of b) {
        aa[item] = true;
      }
      return aa;
    } else if (Array.isArray(a) && typeof b === "object") {
      const aa = {};
      for (const item of a) {
        aa[item] = true;
      }
      for (const bKey of Object.keys(b)) {
        aa[bKey] = b[bKey];
      }
      return aa;
    }
    throw new Error(`cannot merge classes of ${a} (${typeof a}) and ${b} (${typeof b})`);
  }

  // src/state-context.js
  var KeyStateContext = class {
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
      let raw = this.state ? this.state[keys[0]] : void 0;
      for (let i = 1; i < keys.length && !!raw; i++) {
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
      }
      this.state.patch(this.createPatch(value));
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
        for (i = 1; i < keys.length - 1; i++) {
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
  };
  var DelegateStateContext = class {
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
  };
  return __toCommonJS(index_exports);
})();
