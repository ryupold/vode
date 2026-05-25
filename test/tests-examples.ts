import { expect } from "./helper";
import { app, createState, context, Component, memo, DIV, SPAN, BUTTON, INPUT, FORM, UL, LI, H1, H2, P, IMG, A, LABEL, SECTION, NAV, HEADER, MAIN, SVG, CIRCLE, Tag, ChildVode, Vode, PatchableState } from "../index";

function setup() {
    const root = document.createElement("div");
    const container = document.createElement("div");
    root.appendChild(container);
    return container;
}

export default {
    "Example 1: Counter - increment/reset buttons, basic state patching": async () => {
        const container = setup();
        const state = createState({ count: 0 });

        app<typeof state>(container, state, (s) => [DIV,
            [H1, `Count: ${s.count}`],
            [BUTTON, { onclick: () => ({ count: s.count + 1 }) }, "Increment"],
            [BUTTON, { onclick: () => ({ count: 0 }), disabled: s.count === 0 }, "Reset"],
        ]);

        await expect(container).toMatch(
            [DIV,
                [H1, "Count: 0"],
                [BUTTON, "Increment"],
                [BUTTON, "Reset"],
            ]
        );

        state.patch({ count: 1 });

        await expect(container).toMatch(
            [DIV,
                [H1, "Count: 1"],
                [BUTTON, "Increment"],
                [BUTTON, "Reset"],
            ]
        );

        state.patch({ count: 0 });

        await expect(state.count).toEqual(0);
        await expect(container).toMatch(
            [DIV,
                [H1, "Count: 0"],
                [BUTTON, "Increment"],
                [BUTTON, "Reset"],
            ]
        );
    },

    "Example 2: Todo List with State Context - nested state via context(), list rendering": async () => {
        const container = setup();
        const state = createState({
            todos: {
                items: [
                    { id: 1, text: "Buy milk", done: false },
                    { id: 2, text: "Walk dog", done: true },
                    { id: 3, text: "Read book", done: false },
                ],
                filter: "all" as "all" | "active" | "done",
                newTodo: "",
            },
        });

        app<typeof state>(container, state, (s) => {
            const filtered = s.todos.items.filter((item) => {
                if (s.todos.filter === "active") return !item.done;
                if (s.todos.filter === "done") return item.done;
                return true;
            });

            return [DIV,
                [H1, "Todos"],
                [INPUT, { type: "text", value: s.todos.newTodo }],
                [BUTTON, "Add"],
                [NAV,
                    [BUTTON, { class: { active: s.todos.filter === "all" } }, "All"],
                    [BUTTON, { class: { active: s.todos.filter === "active" } }, "Active"],
                    [BUTTON, { class: { active: s.todos.filter === "done" } }, "Done"],
                ],
                [UL,
                    ...filtered.map(item => [LI, item.done ? `[X] ${item.text}` : `[ ] ${item.text}`]),
                ],
            ];
        });

        await expect(container).toMatch(
            [DIV,
                [H1, "Todos"],
                [INPUT],
                [BUTTON, "Add"],
                [NAV,
                    [BUTTON, { class: 'active' }, "All"],
                    [BUTTON, "Active"],
                    [BUTTON, "Done"],
                ],
                [UL,
                    [LI, "[ ] Buy milk"],
                    [LI, "[X] Walk dog"],
                    [LI, "[ ] Read book"],
                ],
            ]
        );

        state.patch({ todos: { filter: "active" } });

        await expect(state.todos.filter).toEqual("active");
        await expect(state.todos.items.length).toEqual(3);

        await expect(container).toMatch(
            [DIV,
                [H1, "Todos"],
                [INPUT],
                [BUTTON, "Add"],
                [NAV,
                    [BUTTON, "All"],
                    [BUTTON, { class: 'active' }, "Active"],
                    [BUTTON, "Done"],
                ],
                [UL,
                    [LI, "[ ] Buy milk"],
                    [LI, "[ ] Read book"],
                ],
            ]
        );

        state.patch({ todos: { filter: "done" } });

        await expect(container).toMatch(
            [DIV,
                [H1, "Todos"],
                [INPUT],
                [BUTTON, "Add"],
                [NAV,
                    [BUTTON, "All"],
                    [BUTTON, "Active"],
                    [BUTTON, { class: 'active' }, "Done"],
                ],
                [UL,
                    [LI, "[X] Walk dog"],
                ],
            ]
        );

        state.patch({ todos: { filter: "all" } });
        await expect(state.todos.items.length).toEqual(3);
    },

    "Example 3: Data Fetching - loading/error/success state machine with ternary branches": async () => {
        const container = setup();
        const state = createState({
            fetch: {
                status: "loading" as "loading" | "error" | "success",
                result: null as string | null,
                error: null as string | null,
            },
        });

        app<typeof state>(container, state, (s) => {
            return [
                DIV,
                s.fetch.status === "loading"
                    ? [P, "Loading..."]
                    : s.fetch.status === "error"
                        ? [DIV, { class: "error" }, [P, "Error: ", s.fetch.error]]
                        : [DIV, { class: "success" }, [P, "Result: ", s.fetch.result]],
                s.fetch.status !== "loading" && [BUTTON, "Fetch"],
                s.fetch.status === "error" && [BUTTON, "Retry"],
            ];
        });

        await expect(container).toMatch(
            [DIV,
                [P, "Loading..."],
            ]
        );

        state.patch({ fetch: { status: "success", result: "Fetched data" } });

        await expect(container).toMatch(
            [DIV,
                [DIV, { class: "success" },
                    [P, "Result: ", "Fetched data"],
                ],
                [BUTTON, "Fetch"],
            ]
        );

        state.patch({ fetch: { status: "error", error: "Network error", result: null } });

        await expect(container).toMatch(
            [DIV,
                [DIV, { class: "error" },
                    [P, "Error: ", "Network error"],
                ],
                [BUTTON, "Fetch"],
                [BUTTON, "Retry"],
            ]
        );
    },

    "Example 4: Tabbed Panel - tab switching via conditional rendering": async () => {
        const container = setup();
        const state = createState({
            ui: {
                activeTab: "home" as "home" | "settings" | "profile",
            },
        });

        app<typeof state>(container, state, (s) => {
            const ctx = context(s).ui;
            return [
                DIV,
                [NAV, { class: "tabs" },
                    [BUTTON, { class: { active: s.ui.activeTab === "home" } }, "Home"],
                    [BUTTON, { class: { active: s.ui.activeTab === "settings" } }, "Settings"],
                    [BUTTON, { class: { active: s.ui.activeTab === "profile" } }, "Profile"],
                ],
                [MAIN,
                    s.ui.activeTab === "home"
                        ? [SECTION, { class: "tab-content" }, [H2, "Home"], [P, "Welcome home!"]]
                        : s.ui.activeTab === "settings"
                            ? [SECTION, { class: "tab-content" }, [H2, "Settings"], [P, "Adjust your settings here."]]
                            : [SECTION, { class: "tab-content" }, [H2, "Profile"], [P, "Manage your profile."]],
                ],
            ];
        });

        await expect(container).toMatch(
            [DIV,
                [NAV, { class: "tabs" },
                    [BUTTON, "Home"],
                    [BUTTON, "Settings"],
                    [BUTTON, "Profile"],
                ],
                [MAIN,
                    [SECTION, { class: "tab-content" },
                        [H2, "Home"],
                        [P, "Welcome home!"],
                    ],
                ],
            ]
        );

        const ctx = context(state).ui;
        ctx.activeTab.patch("settings");

        await expect(container).toMatch(
            [DIV,
                [NAV, { class: "tabs" },
                    [BUTTON, "Home"],
                    [BUTTON, "Settings"],
                    [BUTTON, "Profile"],
                ],
                [MAIN,
                    [SECTION, { class: "tab-content" },
                        [H2, "Settings"],
                        [P, "Adjust your settings here."],
                    ],
                ],
            ]
        );

        ctx.activeTab.patch("profile");

        await expect(container).toMatch(
            [DIV,
                [NAV, { class: "tabs" },
                    [BUTTON, "Home"],
                    [BUTTON, "Settings"],
                    [BUTTON, "Profile"],
                ],
                [MAIN,
                    [SECTION, { class: "tab-content" },
                        [H2, "Profile"],
                        [P, "Manage your profile."],
                    ],
                ],
            ]
        );
    },

    "Example 5: Form Validation - live input validation with conditional error display": async () => {
        const container = setup();
        const state = createState({
            form: {
                email: "",
                password: "",
                errors: {} as { email?: string; password?: string },
                submitted: false,
            },
        });

        app<typeof state>(container, state, (s) => {
            return [
                DIV,
                s.form.submitted
                    ? [P, { class: "success" }, "Form submitted successfully!"]
                    : [FORM,
                        [LABEL, "Email:"],
                        [INPUT, { type: "email", value: s.form.email }],
                        s.form.errors.email && [P, { class: "error" }, s.form.errors.email],
                        [LABEL, "Password:"],
                        [INPUT, { type: "password", value: s.form.password }],
                        s.form.errors.password && [P, { class: "error" }, s.form.errors.password],
                        [INPUT, { type: "submit", value: "Submit" }],
                    ],
            ];
        });

        await expect(container).toMatch(
            [DIV,
                [FORM,
                    [LABEL, "Email:"],
                    [INPUT],
                    [LABEL, "Password:"],
                    [INPUT],
                    [INPUT],
                ],
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
            [DIV,
                [FORM,
                    [LABEL, "Email:"],
                    [INPUT, { type: "email", value: 'invalid email' }],
                    [P, { class: "error" }, "Email must contain @"],
                    [LABEL, "Password:"],
                    [INPUT],
                    [INPUT],
                ],
            ],

            state,
            "failed to patch invalid email error"
        );

        state.patch({
            form: {
                email: "user@ryupold.de",
                password: "123",
                errors: {
                    email: undefined,
                    password: "Password must be at least 6 characters"
                },
            },
        });

        await expect(container).toMatch(
            [DIV,
                [FORM,
                    [LABEL, "Email:"],
                    [INPUT],
                    [LABEL, "Password:"],
                    [INPUT],
                    [P, { class: "error" }, "Password must be at least 6 characters"],
                    [INPUT],
                ],
            ],

            state,
            "failed to patch invalid password error"
        );

        state.patch({
            form: {
                password: "secure123",
                errors: { password: undefined },
            },
        });

        await expect(container).toMatch(
            [DIV,
                [FORM,
                    [LABEL, "Email:"],
                    [INPUT],
                    [LABEL, "Password:"],
                    [INPUT],
                    [INPUT],
                ],
            ],

            state,
            "failed to patch valid password and clear error"
        );
    },

    "Example 6: Component Composition - nested components with dynamic props": async () => {
        const container = setup();
        const state = createState({
            theme: "light" as "light" | "dark",
            user: {
                name: "Alice",
                role: "Admin",
            },
        });

        type State = typeof state;

        const Badge: Component<State> = (s) =>
            [SPAN, { class: `badge badge-${s.theme}` }, s.user.name];

        const Card: Component<State> = (s) =>
            [SECTION, { class: `card card-${s.theme}` },
                [H2, "User Info"],
                [P, `Name: ${s.user.name}`],
                [P, `Role: ${s.user.role}`],
            ];

        const Header: Component<State> = (s) =>
            [HEADER, { class: `header header-${s.theme}` },
                [H1, "App"],
                Badge,
            ];

        app<State>(container, state, (s) => [
            DIV,
            Header,
            [MAIN, Card],
            [BUTTON, {
                onclick: () => ({ theme: s.theme === "light" ? "dark" : "light" }),
            }, "Toggle Theme"],
        ]);

        await expect(container).toMatch(
            [DIV,
                [HEADER, { class: "header header-light" },
                    [H1, "App"],
                    [SPAN, { class: "badge badge-light" }, "Alice"],
                ],
                [MAIN,
                    [SECTION, { class: "card card-light" },
                        [H2, "User Info"],
                        [P, "Name: Alice"],
                        [P, "Role: Admin"],
                    ],
                ],
                [BUTTON, "Toggle Theme"],
            ]
        );

        state.patch({ theme: "dark" });

        await expect(container).toMatch(
            [DIV,
                [HEADER, { class: "header header-dark" },
                    [H1, "App"],
                    [SPAN, { class: "badge badge-dark" }, "Alice"],
                ],
                [MAIN,
                    [SECTION, { class: "card card-dark" },
                        [H2, "User Info"],
                        [P, "Name: Alice"],
                        [P, "Role: Admin"],
                    ],
                ],
                [BUTTON, "Toggle Theme"],
            ]
        );

        state.patch({ user: { name: "Bob", role: "User" } });

        await expect(state.user.name).toEqual("Bob");
        await expect(state.user.role).toEqual("User");
        await expect(container).toMatch(
            [DIV,
                [HEADER, { class: "header header-dark" },
                    [H1, "App"],
                    [SPAN, { class: "badge badge-dark" }, "Bob"],
                ],
                [MAIN,
                    [SECTION, { class: "card card-dark" },
                        [H2, "User Info"],
                        [P, "Name: Bob"],
                        [P, "Role: User"],
                    ],
                ],
                [BUTTON, "Toggle Theme"],
            ]
        );
    },

    "Example 7: Multi-Context - multiple independent state contexts": async () => {
        const container = setup();
        const state = createState({
            panelA: {
                count: 0,
                label: "Panel A",
            },
            panelB: {
                count: 0,
                label: "Panel B",
            },
        });

        app<typeof state>(container, state, (s) => {
            const ctxA = context(s).panelA;
            const ctxB = context(s).panelB;
            return [DIV,
                [SECTION, { class: "panel-a" },
                    [H2, ctxA.label.get()],
                    [P, `Count: ${s.panelA.count}`],
                    [BUTTON, "Increment A"],
                ],
                [SECTION, { class: "panel-b" },
                    [H2, ctxB.label.get()],
                    [P, `Count: ${s.panelB.count}`],
                    [BUTTON, "Increment B"],
                ],
            ];
        });

        await expect(container).toMatch(
            [DIV,
                [SECTION, { class: "panel-a" },
                    [H2, "Panel A"],
                    [P, "Count: 0"],
                    [BUTTON, "Increment A"],
                ],
                [SECTION, { class: "panel-b" },
                    [H2, "Panel B"],
                    [P, "Count: 0"],
                    [BUTTON, "Increment B"],
                ],
            ]
        );

        const ctxA = context(state).panelA;
        ctxA.count.patch(5);

        await expect(state.panelA.count).toEqual(5);
        await expect(state.panelB.count).toEqual(0);

        await expect(container).toMatch(
            [DIV,
                [SECTION, { class: "panel-a" },
                    [H2, "Panel A"],
                    [P, "Count: 5"],
                    [BUTTON, "Increment A"],
                ],
                [SECTION, { class: "panel-b" },
                    [H2, "Panel B"],
                    [P, "Count: 0"],
                    [BUTTON, "Increment B"],
                ],
            ]
        );

        const ctxB = context(state).panelB;
        ctxB.count.patch(10);

        await expect(state.panelA.count).toEqual(5);
        await expect(state.panelB.count).toEqual(10);

        await expect(container).toMatch(
            [DIV,
                [SECTION, { class: "panel-a" },
                    [H2, "Panel A"],
                    [P, "Count: 5"],
                    [BUTTON, "Increment A"],
                ],
                [SECTION, { class: "panel-b" },
                    [H2, "Panel B"],
                    [P, "Count: 10"],
                    [BUTTON, "Increment B"],
                ],
            ]
        );

        await expect(ctxA.label.get()).toEqual("Panel A");
        await expect(ctxB.label.get()).toEqual("Panel B");
    },

    "Example 8: SVG Dynamic - SVG circle with dynamic radius/color": async () => {
        const container = setup();
        const state = createState({
            svg: {
                radius: 20,
                color: "red",
                cx: 100,
                cy: 100,
            },
        });

        app<typeof state>(container, state, (s) => {
            return [DIV,
                [SVG, { xmlns: "http://www.w3.org/2000/svg", width: "200", height: "200" },
                    [CIRCLE, {
                        cx: s.svg.cx,
                        cy: s.svg.cy,
                        r: s.svg.radius,
                        fill: s.svg.color,
                        stroke: "black",
                        "stroke-width": "2",
                    }],
                ],
                [P, `Radius: ${s.svg.radius}, Color: ${s.svg.color}`],
            ];
        });

        await expect(container).toMatch(
            [DIV,
                [SVG, { xmlns: "http://www.w3.org/2000/svg", width: "200", height: "200" },
                    [CIRCLE, {
                        cx: 100,
                        cy: 100,
                        r: 20,
                        fill: "red",
                        stroke: "black",
                        "stroke-width": "2",
                    }],
                ],
                [P, "Radius: 20, Color: red"],
            ]
        );

        const ctx = context(state).svg;
        ctx.radius.patch(30);
        ctx.color.patch("green");

        await expect(state.svg.radius).toEqual(30);
        await expect(state.svg.color).toEqual("green");

        await expect(container).toMatch(
            [DIV,
                [SVG, { xmlns: "http://www.w3.org/2000/svg", width: "200", height: "200" },
                    [CIRCLE, {
                        cx: 100,
                        cy: 100,
                        r: 30,
                        fill: "green",
                        stroke: "black",
                        "stroke-width": "2",
                    }],
                ],
                [P, "Radius: 30, Color: green"],
            ]
        );

        ctx.radius.patch(50);
        ctx.color.patch("blue");

        await expect(container).toMatch(
            [DIV,
                [SVG, { xmlns: "http://www.w3.org/2000/svg", width: "200", height: "200" },
                    [CIRCLE, {
                        cx: 100,
                        cy: 100,
                        r: 50,
                        fill: "blue",
                        stroke: "black",
                        "stroke-width": "2",
                    }],
                ],
                [P, "Radius: 50, Color: blue"],
            ]
        );
    },

    "Example 9: Dynamic Attributes - conditional elements + attribute changes": async () => {
        const container = setup();
        const state = createState({
            config: {
                showImage: false,
                imageUrl: "https://ryupold.de/main/assets/img/pot.webp",
                alt: "Example image",
                linkEnabled: true,
                linkUrl: "https://ryupold.de",
                boxWidth: "100px",
                boxColor: "red",
            },
        });

        app<typeof state>(container, state, (s) => {
            return [
                DIV,
                s.config.showImage && [IMG, {
                    src: s.config.imageUrl,
                    alt: s.config.alt,
                    class: "dynamic-image",
                    "data-testid": "image",
                }],
                [BUTTON, s.config.showImage ? "Hide Image" : "Show Image"],
                [A, {
                    href: s.config.linkEnabled ? s.config.linkUrl : undefined,
                    class: { "link-disabled": !s.config.linkEnabled },
                    "data-enabled": String(s.config.linkEnabled),
                }, s.config.linkEnabled ? "Click me" : "Link disabled"],
                [BUTTON, "Toggle Link"],
                [DIV, {
                    style: {
                        width: s.config.boxWidth,
                        backgroundColor: s.config.boxColor,
                    },
                    class: "dynamic-box",
                }, "Styled Box"],
                [BUTTON, "Change Style"],
            ];
        });

        await expect(container).toMatch(
            [DIV,
                [BUTTON, "Show Image"],
                [A, {
                    href: "https://ryupold.de",
                    "data-enabled": "true",
                }, "Click me"],
                [BUTTON, "Toggle Link"],
                [DIV, { class: "dynamic-box" }, "Styled Box"],
                [BUTTON, "Change Style"],
            ]
        );

        state.patch({ config: { showImage: true } });

        await expect(container).toMatch(
            [DIV,
                [IMG, {
                    src: "https://ryupold.de/main/assets/img/pot.webp",
                    alt: "Example image",
                    class: "dynamic-image",
                    "data-testid": "image",
                }],
                [BUTTON, "Hide Image"],
                [A, {
                    href: "https://ryupold.de",
                    "data-enabled": "true",
                }, "Click me"],
                [BUTTON, "Toggle Link"],
                [DIV, { class: "dynamic-box" }, "Styled Box"],
                [BUTTON, "Change Style"],
            ]
        );

        state.patch({ config: { showImage: false } });

        await expect(container).toMatch(
            [DIV,
                [BUTTON, "Show Image"],
                [A, {
                    href: "https://ryupold.de",
                    "data-enabled": "true",
                }, "Click me"],
                [BUTTON, "Toggle Link"],
                [DIV, { class: "dynamic-box" }, "Styled Box"],
                [BUTTON, "Change Style"],
            ]
        );

        state.patch({ config: { linkEnabled: false } });

        await expect(container).toMatch(
            [DIV,
                [BUTTON, "Show Image"],
                [A, {
                    "data-enabled": "false",
                }, "Link disabled"],
                [BUTTON, "Toggle Link"],
                [DIV, { class: "dynamic-box" }, "Styled Box"],
                [BUTTON, "Change Style"],
            ]
        );

        state.patch({ config: { boxWidth: "200px", boxColor: "blue" } });

        await expect(state.config.boxWidth).toEqual("200px");
        await expect(state.config.boxColor).toEqual("blue");
    },

    "Example 10: Nested Vode-App - inner app with isolated state via memo + onMount": async () => {
        const container = setup();

        const outerState = createState({ title: "Outer", visible: true });
        const innerState = createState({ counter: 0 });

        type Outer = typeof outerState;
        type Inner = typeof innerState;

        // Helper that wraps an inner app in a memo([]) component so the outer
        // app never re-renders the subtree - the inner app controls itself.
        function IsolatedVodeApp<OuterState, InnerState extends PatchableState>(
            tag: Tag,
            state: InnerState,
            View: (ins: InnerState) => Vode<InnerState>,
        ): ChildVode<OuterState> {
            /**
             * The memo with an empty dependency array prevents further render calls 
             * from the outer app so rendering of the subtree inside is controlled 
             * by the inner app.
             * Note that the top-level element of the inner app refers 
             * to the surrounding element and will change its state accordingly.
             */
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

        app<Outer>(container, outerState, (s) => [
            DIV,
            [H1, s.title],
            [P, "Outer content"],
            s.visible && [DIV, { class: "inner-wrapper" },
                IsolatedVodeApp<Outer, Inner>(
                    DIV,
                    innerState,
                    (ins) => [DIV,
                        [P, `Inner counter: ${ins.counter}`],
                    ]
                ),
            ],
            [BUTTON, { onclick: () => ({ title: "Outer Updated" }) }, "Change Title"],
        ]);

        // initial state
        await expect(container).toMatch(
            [DIV,
                [H1, "Outer"],
                [P, "Outer content"],
                [DIV, { class: "inner-wrapper" },
                    [DIV,
                        [P, "Inner counter: 0"],
                    ],
                ],
                [BUTTON, "Change Title"],
            ]
        );

        // patch inner state independently: inner updates, outer unchanged
        innerState.patch({ counter: 7 });

        await expect(container).toMatch(
            [DIV,
                [H1, "Outer"],
                [P, "Outer content"],
                [DIV, { class: "inner-wrapper" },
                    [DIV,
                        [P, "Inner counter: 7"],
                    ],
                ],
                [BUTTON, "Change Title"],
            ]
        );

        // patch outer state: inner is NOT re-rendered (memo([]) skips it),
        // so the inner counter stays at 7 (not reset to 0).
        outerState.patch({ title: "Outer Updated" });

        await expect(outerState.title).toEqual("Outer Updated");
        await expect(innerState.counter).toEqual(7);

        await expect(container).toMatch(
            [DIV,
                [H1, "Outer Updated"],
                [P, "Outer content"],
                [DIV, { class: "inner-wrapper" },
                    [DIV,
                        [P, "Inner counter: 7"],
                    ],
                ],
                [BUTTON, "Change Title"],
            ]
        );

        // hiding the outer wrapper removes the inner app entirely
        outerState.patch({ visible: false });

        await expect(container).toMatch(
            [DIV,
                [H1, "Outer Updated"],
                [P, "Outer content"],
                [BUTTON, "Change Title"],
            ]
        );
    },

    "Example 11: Error Boundary - isolated component crash with catch recovery": async () => {
        const container = setup();
        const state = createState({
            users: [
                { id: 1, name: "Alice" },
                { id: 2, name: "Bob" },
                { id: 3, name: "Charlie" },
            ],
            corruptId: 2,
        });
        const broken = (msg: string) => (() => { throw new Error(msg); }) as Component;

        app<typeof state>(container, state, (s) =>
            <Vode>[DIV,
                [H1, "User List"],
                ...s.users.map(user =>
                    [SECTION,
                        {
                            class: "card",
                            key: user.id,
                            catch: [P, { class: "error" }, `⚠ Failed to load ${user.name}`],
                        },
                        user.id === s.corruptId
                            ? broken(`crash ${user.id}`)
                            : [P, user.name],
                    ]
                )
            ]
        );

        await expect(container).toMatch(
            [DIV,
                [H1, "User List"],
                [SECTION, [P, "Alice"]],
                [P, { class: "error" }, "⚠ Failed to load Bob"],
                [SECTION, [P, "Charlie"]],
            ]
        );

        state.patch({ corruptId: 1 });

        await expect(container).toMatch(
            [DIV,
                [H1, "User List"],
                [P, { class: "error" }, "⚠ Failed to load Alice"],
                [SECTION, [P, "Bob"]],
                [SECTION, [P, "Charlie"]],
            ]
        );
    },

    "Example 12: State Machine - sequential phase transitions via function patches": async () => {
        const container = setup();
        const state = createState({ phase: "idle", count: 0 });
        type State = typeof state;

        app<State>(container, state, (s) =>
            [DIV,
                [P, `Phase: ${s.phase}`],
                [P, `Count: ${s.count}`],
            ]
        );

        state.patch((s) => ({ phase: "running", count: 1 }));
        await expect(state.phase).toEqual("running");
        await expect(state.count).toEqual(1);

        function step(s: State) {
            const next = s.count < 5
                ? { count: s.count + 1 }
                : { phase: "done", count: s.count };
            return next;
        }
        state.patch(step);

        await expect(state.count).toEqual(2);

        state.patch(step);

        await expect(container).toMatch(
            [DIV,
                [P, "Phase: running"],
                [P, "Count: 3"],
            ]
        );

        state.patch(step);
        state.patch(step);

        await expect(state.count).toEqual(5);
        await expect(state.phase).toEqual("running");

        state.patch(step);

        await expect(state.count).toEqual(5);
        await expect(state.phase).toEqual("done", "reached done phase");
    },
};
