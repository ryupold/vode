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
   (s) => [DIV, { class: 'app' },
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