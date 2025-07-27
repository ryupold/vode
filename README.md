![vode](./logo.svg)

Small web framework for minimal websites.
Each vode app has its own state and renders a tree of HTML elements.
The state is a singleton object that can be updated, and the UI will re-render when a patch object is supplied.

A `vode` is a representation of a virtual DOM node, which is a tree structure of HTML elements. It is written as tuple:

```
[TAG, PROPS?, CHILDREN...]
```

## Install

```bash
# npm
npm install @ryupold/vode --save

# yarn
yarn add @ryupold/vode

# bun
bun add @ryupold/vode
```

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
