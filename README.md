# vode

Small web framework for minimal websites.
Each vode app has its own state and renders a tree of HTML elements.
The state is a singleton object that can be updated, and the UI will re-render when a patch is supplied. Nesting vode-apps is undefined behavior for now.

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
import { BR, DIV, INPUT, SPAN } from 'vode-tags.js';


const init = createState({
    counter: 0,
});

type State = typeof init;

const appNode = document.getElementById('app') as ContainerNode<State>;

app<State>(appNode, init,
    (s) => [DIV,
        [INPUT, {
            type: 'button',
            onclick: { counter: s.counter + 1 },
            value: 'Click me',
        }],
        [BR],
        [SPAN, { style: { color: 'red' } }, `${s.counter}`],
    ]
);
```

## Claude

> Prompt: "what can you tell me about the overall design philosophy of the vode library based on what you see in `src/vode.ts`"


Based on my analysis of `src/vode.ts`, here's the overall design philosophy of the vode library:

### Core Design Philosophy

**Functional Virtual DOM with Minimal Abstractions**
- Uses array-based virtual nodes (`[tag, props?, ...children]`) instead of object-based structures
- Prioritizes simplicity and performance over complex abstractions

**State-Centric Architecture**
- Central state object with patch-based updates
- Immutable-style state management with deep merging
- Single source of truth pattern

**Zero-Dependency Minimalism**
- Pure TypeScript/JavaScript implementation
- No external dependencies or build tools required
- Direct DOM manipulation without heavy runtime

### Key Architectural Decisions

#### Virtual DOM Structure
```typescript
// Simple array-based nodes
["div", { class: "container" }, "Hello", ["span", "World"]]
```
- Minimal memory footprint
- Easy serialization/debugging
- Type-safe with TypeScript generics

#### Reactive State Management
```typescript
state.patch(newData)           // Direct updates
state.patch([effect, payload]) // Function-based effects
state.patch(promise)           // Async support
```
- Unified patch system for all state changes
- Built-in async/generator support
- Functional effects pattern

#### Performance Optimizations
- **Memoization**: `memo()` for component caching
- **Reconciliation**: Intelligent DOM diffing
- **Batched Updates**: RequestAnimationFrame-based rendering
- **Memory Management**: Proper cleanup with mount/unmount hooks

#### Developer Experience
- **Type Safety**: Full TypeScript support with generics
- **Debugging**: Built-in performance statistics
- **Flexibility**: Support for HTML, SVG, and MathML
- **Composability**: Functional component model

### Philosophy Summary

Vode follows a **"less is more"** philosophy, providing a lightweight alternative to heavyweight frameworks while maintaining modern reactive patterns. It emphasizes:

1. **Explicitness over magic** - Clear, predictable behavior
2. **Performance by design** - Minimal overhead, efficient updates
3. **Developer control** - Direct state manipulation without hidden abstractions
4. **Functional paradigms** - Immutable updates, pure components
5. **Modern web standards** - Leverages native browser APIs effectively

The library appears designed for developers who want React-like reactivity without the complexity and bundle size of modern frameworks.