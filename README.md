# ![vode-logo](./logo.svg)

[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Dependencies](https://img.shields.io/badge/dependencies-0-success)](package.json)
[![NPM](https://badge.fury.io/js/%40ryupold%2Fvode.svg)](https://www.npmjs.com/package/@ryupold/vode)
[![NPM Downloads](https://img.shields.io/npm/dm/@ryupold/vode)](https://www.npmjs.com/package/@ryupold/vode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A small web framework for a minimalistic development flow. Zero dependencies, no build step except for typescript compilation, and a simple virtual DOM implementation that is easy to understand and use. Autocompletion out of the box due to binding to `lib.dom.d.ts`.

It can be used to create single page applications or isolated components with complex state. The usage of arrays gives flexibility in composition and makes refactoring easy.

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

        const state = { counter: 0 };

        app(appNode, state,
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
        var appNode = document.getElementById('app');
        
        var state = { counter: 0 };

        V.app(appNode, state,
            (s) => ["div",
                ["input", {
                    type: 'button',
                    onclick: { counter: s.counter + 1 },
                    value: 'Click me',
                }
                ],
                ["br"],
                ["span", { style: { color: 'red' } }, `${s.counter}`],
            ]);
    </script>
</body>
</html>
```

### NPM

[![NPM](https://badge.fury.io/js/%40ryupold%2Fvode.svg)](https://www.npmjs.com/package/@ryupold/vode)

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
```typescript
import { app, createState, BR, DIV, INPUT, SPAN } from '@ryupold/vode';

const state = createState({
    counter: 0,
});

type State = typeof state;

const appNode = document.getElementById('app');

app<State>(appNode, state,
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

They are lightweight structures to describe what the DOM should look like.

Imagine this HTML:

```html
<div class="card">
  <div class="card-image">
    <figure class="image is-4by3">
      <img
        src="placeholders/1280x960.png"
        alt="Placeholder image"
      />
    </figure>
  </div>
  <div class="card-content">
    <div class="media">
      <div class="media-left">
        <figure class="image is-48x48">
          <img
            src="placeholders/96x96.png"
            alt="Placeholder image"
          />
        </figure>
      </div>
      <div class="media-content">
        <p class="title is-4">John Smith</p>
        <p class="subtitle is-6">@johnsmith</p>
      </div>
    </div>

    <div class="content">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. <a href="?post=vode">vode</a>. <a href="#">#css</a>
      <a href="#">#responsive</a>
      <br />
      <time datetime="2025-09-24">10:09 PM - 24 Sep 2025</time>
    </div>
  </div>
</div>
```

expressed as **"vode"** it would look like this:

```javascript
[DIV, { class: 'card' },
    [DIV, { class: 'card-image' },
        [FIGURE, { class: 'image is-4by3' },
            [IMG, {
                src: 'placeholders/1280x960.png',
                alt: 'Placeholder image'
            }]
        ]
    ],
    [DIV, { class: 'card-content' },
        [DIV, { class: 'media' },
            [DIV, { class: 'media-left' },
                [FIGURE, { class: 'image is-48x48' },
                    [IMG, {
                        src: 'placeholders/96x96.png',
                        alt: 'Placeholder image'
                    }]
                ]
            ],
            [DIV, { class: 'media-content' },
                [P, { class: 'title is-4' }, 'John Smith'],
                [P, { class: 'subtitle is-6' }, '@johnsmith']
            ]
        ],
        [DIV, { class: 'content' },
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ',
            [A, {href: '?post=vode'}, 'vode'], '. ', [A, { href: '#' }, '#css'],
            [A, { href: '#' }, '#responsive'],
            [BR],
            [TIME, { datetime: '2025-09-24' }, '10:09 PM - 24 Sep 2025']
        ]
    ]
]
```

Viewed alone it does not provide an obvious benefit (apart from looking better imho), 
but as the result of a function of state, it can become very useful to express conditional UI this way. 

### Component
```typescript
type Component<S> = (s: S) => ChildVode<S>;
```

A `Component<State>` is a function that takes a state object and returns a `Vode<State>`. 
It is used to render the UI based on the current state.

```typescript
// A full vode has a tag, properties, and children. props and children are optional.
const CompFoo = (s) => [SPAN, { class: "foo" }, s.isAuthenticated ? "foo" : "bar"];

const CompBar = (s) => [DIV, { class: "container" }, 
    
    // a child vode can be a string, which results in a text node
    [H1, "Hello World"], 
    
    // a vode can also be a self-closing tag
    [HR],

    // conditional rendering
    s.isAuthenticated 
        ? [STRONG, `and also hello ${s.user}`]
        : [FORM,
            [INPUT, { type: "email", name: "email" }],
            [INPUT, { type: "password", name: "pw" }],
            [INPUT, { type: "submit" }],
        ],
    // a child-vode of false, undefined or null is not rendered 
    !s.isAuthenticated && [HR],
    
    // style object maps directly to the HTML style attribute
    [P, { style: { color: "red", fontWeight: "bold" } }, "This is a paragraph."],
    [P, { style: "color: red; font-weight: bold;" }, "This is also a paragraph."],

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
        onclick: (s, evt) => {
            // objects returned by events are patched automatically
            return { counter: s.counter + 1 }; 
        },

        // you can set the patch object directly for events
        onmouseenter: { pointing: true },
        onmouseleave: { pointing: false },

        // a patch can be an async function
        onmouseup: async (s, evt) => {
            s.patch({ loading: true });
            const result = await apiCall();
            return { title: result.data.title, loading: false };
        },

        // you can also use a generator function that yields patches
        onmousedown: async function* (s, evt) {
            yield { loading: true }; 
            const result = await apiCall();
            yield { 
                body: result.data.body,
            };
            return { loading: false };
        },

        // events can be attached condionally
        ondblclick : s.counter > 20 && (s, evt) => {
            return { counter: s.counter * 2 }; 
        },

        class: { bar: s.pointing }
    }, "Click me!"],

    // components can be used as child-vodes, they are called lazy on render
    CompFoo,
    // or this way
    CompFoo(s),
];
```

### app

`app` is a function that takes a HTML node, a state object, and a render function (`Component<State>`).  
```typescript
const containerNode = document.getElementById('ANY-ELEMENT');
const state = {
    counter: 0,
    pointing: false,
    loading: false,
    title: '',
    body: '',
};

const patch = app(
    containerNode, 
    state, 
    (s) => 
        [DIV, 
            [P, { style: { color: 'red' } }, `${s.counter}`],
            [BUTTON, { onclick: () => ({ counter: s.counter + 1 }) }, 'Click me'],    
        ]
    );
```

It will analyse the current structure of the given `containerNode` and adjust its structure in the first render. 
When render-patches are applied to the `patch` function or via yield/return of events, 
the `containerNode` is updated to match the vode structure 1:1. 

#### isolated state
You can have multiple isolated vode app instances on a page, each with its own state and render function.
The returned patch function from `app` can be used to synchronize the state between them.

#### nested vode-app
It is possible to nest vode-apps inside vode-apps, but the library is not opinionated on how you do that. 
One can imagine this type of component:

```typescript
export function IsolatedVodeApp<OuterState, InnerState>(
    tag: Tag,
    state: InnerState,
    View: (ins: InnerState) => Vode<InnerState>,
): ChildVode<OuterState> {
    return memo<OuterState>([],
        () => [tag,
            {
                onMount: (s: OuterState, container: Element) => {
                    app<InnerState>(container, state, View);
                }
            }
        ]
    );
}
```
The `empty memo` prevents further render calls from the outer app
so rendering of the subtree inside is controlled by the inner app.
Take note of the fact that the top-level element of the inner app refers to the surrounding element and will change its state accordingly.

### state & patch
The state object you pass to [`app`](#app) can be updated directly or via `patch`. 
During the call to `app`, the state object is bound to the vode app instance and becomes a singleton from its perspective. 
Also a `patch` function is added to the state object; it is the same function that is also returned by `app`.
A re-render happens when a patch object is supplied to the `patch` function or via event.

```js
const s = {
    counter: 0,
    pointing: false,
    loading: false,
    title: 'foo',
    body: '',
};

app(appNode, s, s => AppView(s)); 
// after calling app(), the state object is bound to the appNode

// update state directly as it is a singleton (silent patch)
s.title = 'Hello World';

// render patch
s.patch({});

// render patch with a change that is applied to the state 
s.patch({ title: 'bar' }); 

// patch with a function that receives the state
s.patch((s) => ({body: s.body + ' baz'})); 

// patch with an async function that receives the state
s.patch(async (s) => {
    s.loading = true; // sometimes it is easier to combine a silent patch
    s.patch({});      // with an empty render patch
    const result = await apiCall();
    return { title: result.title, body: result.body, loading: false };
}); 

// patch with a generator function that yields patches
s.patch(async function*(s){
    yield { loading: true };
    const result = await apiCall();
    yield { title: result.title, body: result.body };
    return { loading: false }; 
});

// ignored, also: undefined, number, string, boolean, void
s.patch(null);

// setting a property in a patch to undefined deletes it from the state object
s.patch({ pointing: undefined });

// ❌ it is discouraged to patch inside the render step 💩
const ComponentEwww = (s) => {
    if(!s.isLoading)
        s.patch(() => startLoading());

    return [DIV, s.loading ? [PROGRESS] : s.title];
}
```

### memoization
To optimize performance, you can use `memo(Array, Component | PropsFactory)` to cache the result of a component function. 
This is useful when the component does not depend on the state or when the creation of the vode is expensive.
You can also pass a function that returns the Props object to memoize the attributes.

```typescript
const CompMemoFooBar = (s) => 
    [DIV, { class: "container" }, 
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

### helper functions

The library provides some helper functions to help with certain situations.

```typescript
import { tag, props, children, mergeClass, hydrate } from '@ryupold/vode';

// Merge class props intelligently
mergeClass('foo', ['baz', 'bar']);  // -> 'foo bar baz'
mergeClass(['foo'], { bar: true, baz: false }); // -> 'foo bar'

const myVode = [DIV, { class: 'foo' }, [SPAN, 'hello'], [STRONG, 'world']];

// access parts of a vode
tag(myVode);        // 'div'
props(myVode);      // { class: 'foo' }
children(myVode);   // [[SPAN, 'hello'], [STRONG, 'world']]

// get existing DOM element as a vode (can be helpful for analyzing/debugging)
const asVode = hydrate(document.getElementById('my-element'));
```

Additionally to the standard HTML attributes, you can define 2 special event attributes: 
`onMount(State, Element)` and `onUnmount(State, Element)` in the vode props. 
These are called when the element is created or removed during rendering. 
They receive the `State` as the first argument and the DOM element as the second argument.
Like the other events they can be patches too. 
> Be aware that `onMount/onUnmount` are only called when an element 
> is actually created/removed which might not always be the case during 
> rendering, as only a diff of the virtual DOM is applied.

### performance

The library is optimized for small to medium sized applications. In my own tests it could easily handle sites with tens of thousands of elements. Smart usage of `memo` can help to optimize performance further. You can find a comparison of the performance with other libraries [here](https://krausest.github.io/js-framework-benchmark/current.html).

This being said, the library does not focus on performance. It is designed to feel nice while coding, by providing a primitive that is simple to bent & form. I want the mental model to be easy to grasp and the API surface to be small so that a developer can focus on building a web application instead of learning the framework and get to a flow state as quick as possible.

## Contributing

The simplicity of [hyperapp](https://github.com/jorgebucaran/hyperapp) demonstrated that powerful frameworks don't require complexity, which inspired this library's design philosophy.

Not planning to add more features, just keeping it simple and easy (and hopefully bug free).

But if you find bugs or have suggestions, 
feel free to open an [issue](https://github.com/ryupold/vode/issues) or a pull request.

## License
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)