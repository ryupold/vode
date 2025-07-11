# vode

Small web framework for minimal websites.
Each vode app has its own state and renders a tree of HTML elements.
The state is a singleton object that can be updated, and the UI will re-render when a patch is supplied.

## Patch

The `patch` function returned by `app(...)` is a function that can be passed an object called `Patch` this object is used to update the state and re-render the UI. It takes a `Patch` object that describes the changes to be made to the state in a "trickle down manner". The `Patch` can be a simple object or a function that returns a new `Patch` to the current state. It can also be an async and/or genrator function that yields `Patch`es. Events also can return a `Patch`. When a number | boolean | string | null | undefined is applied as a `Patch`, it will be ignored.

## Usage

index.html

```html
<html>
<head>
    <title>Vode Example</title>
    <script type="module" src="main.js"></script>
</head>
<body>
    <div id="app"></div>
</body>
</html>
```

main.ts
```ts
import { vode, app, createState} from 'vode.js';
import { DIV, INPUT, SPAN } from 'vode-tags.js';


const init = createState({
    counter: 0,
});

const State = typeof init;

const appNode = document.getElementById('app') as ContainerNode<State>;

app<State>(appNode, init, 
   (s) => [DIV,
                [INPUT, {
                        type: 'button', 
                        onclick: { counter: s.counter + 1 }
                    }
                ], 
                [SPAN, {style: {color: 'red'}}, s.counter],
            ]
        ))),
    ]
);
```

## Github Copilot

> Prompt: "what can you tell me about the overall design philosophy of the vode library based on what you see in this file"


Based on the contents of `src/vode.ts`, here’s an analysis of the overall design philosophy of the **vode** library:

---

## 1. **Minimalism and Explicit Typing**
- The code uses TypeScript extensively, with highly expressive and specific type definitions for all core concepts (`Vode`, `Props`, `Patch`, etc.).
- Types facilitate both flexibility and safety, allowing various shapes for vNodes (virtual DOM nodes) and state patches.
- The design avoids heavy abstractions or “magical” behaviors, favoring direct and explicit operations.

## 2. **Flux-Inspired State Management**
- State is managed through patches and a `Dispatch` function, reminiscent of Flux or Redux architectures.
- Patches can be values, partial updates, effects, or even asynchronous generators/promises, supporting advanced update strategies.
- The `app` function wires together state, patching, and DOM rendering in a way that emphasizes a clear flow of state transformations.

## 3. **Virtual DOM, But Lean**
- The library defines its own vNode structure (`Vode`) and implements a custom diffing and rendering approach.
- Children, props, and tags are handled directly, without dependency on React, Vue, or similar frameworks.
- The rendering logic is recursive and imperative, with careful checks for node types, memoization, and props application.

## 4. **Functional Approach**
- Many utilities and API surfaces (like `vode`, `merge`, `patch`, `memo`) are designed to be composable and functional.
- Mutations are mostly avoided except for DOM updates and state transitions, keeping the core logic pure and predictable.

## 5. **Performance Awareness**
- Stats tracking (render time, patch count, etc.) is built into the container node, showing a concern for performance profiling and optimization.
- Memoization (`memo`).

## 6. **DOM and Event Integration**
- Props and event handlers are typed and patched in detail, supporting DOM events, SVG, and MathML out-of-the-box.
- There’s direct handling of mounting and unmounting hooks, which simplifies lifecycle management without the need for a heavy component system.

## 7. **Developer Ergonomics**
- Functions like `get`, `put`, `patchProps`, and `mergeClass` provide helpers for deep object operations, class merging, and patching, reducing boilerplate for common patterns.
- The overloads and flexible APIs (e.g., the `vode` function) make the library adaptable for various use cases, from simple tags to full components.

## 8. **No External Dependencies**
- The file is self-contained, with all logic implemented internally. This reinforces the “minimal web framework” approach.

---

**Summary:**  
The vode library aims for a **minimal, type-safe, and flexible** approach to building web interfaces. It borrows ideas from Flux (state management), virtual DOM frameworks, and functional programming, but does so in a lean and explicit way that prioritizes simplicity, performance, and developer control. It’s engineered for small, minimal websites and is likely best suited for users who want a fine-grained, no-nonsense alternative to larger frameworks.