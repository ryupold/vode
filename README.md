# ![vode-logo](./logo.svg)

A small web framework for a minimalistic development flow. Zero dependencies, no build step except for typescript compilation, and a simple virtual DOM implementation that is easy to understand and use. Autocompletion out of the box due to binding to `lib.dom.d.ts`.

## Usage

### ESM
```html
<!DOCTYPE html>
<html>
<head>
    <title>ESM Example</title>
</head>
<body>
    <div id="app"></div>
    <script type="module">
        import { app, createState, BR, DIV, INPUT, SPAN } from 'https://unpkg.com/@ryupold/vode/dist/vode.min.mjs';

        const appNode = document.getElementById('app');

        app(appNode, { counter: 0 },
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
    </script>
</body>
</html>
```

### Classic
Binds the library to the global `V` variable.

```html
<!DOCTYPE html>
<html>
<head>
    <title>Classic Script Example</title>
    <script src="https://unpkg.com/@ryupold/vode/dist/vode.min.js"></script>
</head>
<body>
    <div id="app"></div>
    <script>
        const appNode = document.getElementById('app');
        V.app(appNode, { counter: 0 },
            (s) => ["DIV",
                ["INPUT", {
                    type: 'button',
                    onclick: { counter: s.counter + 1 },
                    value: 'Click me',
                }
                ],
                ["BR"],
                ["SPAN", { style: { color: 'red' } }, `${s.counter}`],
            ]);
    </script>
</body>
</html>
```

### NPM

```bash
# npm
npm install @ryupold/vode --save

# yarn
yarn add @ryupold/vode

# bun
bun add @ryupold/vode
```

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
import { app, createState, BR, DIV, INPUT, SPAN } from '@ryupold/vode';


const init = createState({
    counter: 0,
});

type State = typeof init;

const appNode = document.getElementById('app');

app<State>(appNode, init,
    (s: State) => [DIV,
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

## vode

A `vode` is a representation of a virtual DOM node, which is a tree structure of HTML elements. It is written as tuple:

```
[TAG, PROPS?, CHILDREN...]
```

As you can see, it is a simple array with the first element being the tag name, the second element being an optional properties object, and the rest being child-vodes.

### Component
```ts
type Component<S> = (s: S) => ChildVode<S>;
```

A `Component<State>` is a function that takes a state object and returns a `Vode<State>`. It is used to render the UI based on the current state.

```ts
// A full vode has a tag, properties, and children. props and children are optional.
const CompFooBar = (s) => [DIV, { class: "container" }, 
    
    // a child vode can be a string, which results in a text node
    [H1, "Hello World"], 
    
    // a vode can also be a self-closing tag
    [BR],
    
    // style object maps directly to the HTML style attribute
    [P, { style: { color: "red", fontWeight: "bold" } }, "This is a paragraph."],

    // class property has multiple forms
    [UL,
        [LI, {class: "class1 class2"}, "as string"],
        [LI, {class: ["class1", "class2"]}, "as array"],
        [LI, {class: {class1: true, class2: false}}, "as Record<string, boolean>"],
    ],

    // events get the state object as first argument
    // and the HTML event object as second argument
    [BUTTON, {
        // all on* events accept `Patch<State>`
        onclick: (state, evt) => {
            // objects returned by events are patched automatically
            return { counter: state.counter + 1 }; 
        },

        // you can set the patch object directly for events
        onmouseenter: { pointing: true },
        onmouseleave: { pointing: false },

        // a patch can be an async function
        onmouseup: async (state, evt) => {
            state.patch({ loading: true });
            const result = await apiCall();
            return { title: result.data.title, loading: false };
        },

        // you can also use a generator function that yields patches
        onmousedown: async function* (state, evt) {
            yield { loading: true }; 
            const result = await apiCall();
            yield { 
                body: result.data.body,
            };
            return { loading: false };
        },

        class: { bar: s.pointing }
    }, "Click me!"],
];
```

### app

`app` is a function that takes a HTML node, an initial state object, and a render function (`Component<State>`).  
```ts
const appNode = document.getElementById('APP-ID');
const initialState = {
    counter: 0,
    pointing: false,
    loading: false,
    title: '',
    body: '',
};
const patch = app<State>(appNode, initialState, (s) => CompFooBar(s));
```
It will render the initial state and update the DOM when patches are applied to the patch function or via events. All elements returnded by the render function are placed under `appNode`. 

You can have multiple isolated `app` instances on a page, each with its own state and render function. The returned patch function from `app` can be used to synchronize the state between them.

### state
The state is a singleton object that can be updated. A re-render happens when a patch object is supplied to the patch function or via event.

```ts
// type safe way to create the state object
const s = createState({
    counter: 0,
    pointing: false,
    loading: false,
    title: 'foo',
    body: '',
});

type State = typeof s;

app(appNode, s, ...); 
// after calling app(), the state object is bound to the appNode

// update state directly as it is a singleton (silent patch)
s.title = 'Hello World';

// render patch
s.patch({});

// render patch with a change that is applied to the state 
s.patch({ title: 'bar' }); 

// render patch with a function that receives the state
s.patch((s) => ({body: s.body + ' baz'})); 

// render patch with an async function that receives the state
s.patch(async (s) => {
    s.loading = true; // sometimes it is easier to combine a silent patch
    s.patch({});      // with an empty render patch
    const result = await apiCall();
    return { title: result.title, body: result.body, loading: false };
}); 

// you can also use a generator function that yields patches
s.patch(async function*(s){
    yield { loading: true };
    const result = await apiCall();
    yield { title: result.title, body: result.body };
    return { loading: false }; 
});

s.patch(null); // ignored, also: undefined, number, string, boolean, void

s.patch({ pointing: undefined }); // deletes the property from the state
```

### memoization
To optimize performance, you can use `memo(Array, Component | PropsFactory)` to cache the result of a component function. This is useful when the component does not depend on the state or when the creation of the vode is expensive. You can also pass a function that returns the Props object to memoize the attributes.

```ts
const CompMemoFooBar = (s) =>  [DIV, { class: "container" }, 
    [H1, "Hello World"], 
    [BR], 
    [P, "This is a paragraph."],
    
    // expensive component to render
    memo(
        // this array is shallow compared to the previous render
        [s.title, s.body], 
        // this is the component function that will be 
        // called only when the array changes
        (s) => {
            const list = [UL];
            for (let i = 0; i < 1000; i++) {
                list.push([LI, `Item ${i}`]);
            }
            return list;
        },
    )
];
```

### Direct access to DOM elements

Additionally to the standard HTML attributes, you can define 2 special event attributes: `onMount(State, Element)` and `onUnmount(State, Element)` in the vode props. These are called when the element is created or removed during rendering. They receive the `State` as the first argument and the DOM element as the second argument. Like the other events they can be patches too.

## Contributing

I was delighted by the simplicity of [hyperapp](https://github.com/jorgebucaran/hyperapp), which inspired me to create this library. 

Not planning to add more features, just keeping it simple and easy.

But if you find bugs or have suggestions, feel free to open an [issue](https://github.com/ryupold/vode/issues) or a pull request.

## License
[MIT](./LICENSE)