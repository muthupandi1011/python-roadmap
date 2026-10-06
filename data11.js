ROADMAP.push({
n: 21, track: "Frontend",
title: "React with TypeScript",
blurb: "Build user interfaces with React and TypeScript: components, props, state, hooks, data fetching, routing, global state, testing and the modern React 19 features.",
topics: [
X("What React is and project setup",
["React is a JavaScript library for building user interfaces. You build the screen from small pieces called components. A component is a function that returns a description of what the screen should look like. You then combine small components into bigger ones, like building blocks.",
 "React is declarative. You do not write steps such as 'find this element and change its text'. You describe the UI for the current data, and React changes the page for you when the data changes. To do this, React keeps a light copy of the UI in memory, often called the virtual DOM. After each change it compares the new copy with the old one and updates only the parts of the real page that are different.",
 "Today you start a React project with a build tool or a framework. Vite is the common choice for a single-page app: it gives a fast dev server and TypeScript support out of the box. Create React App was the old standard tool, but it is deprecated and you should not use it for new projects. If you need server rendering and file-based routing, the React team recommends a framework such as Next.js."],
["React is a library for UI, not a full framework. Routing and data fetching come from other libraries.",
 "A component is a function that returns JSX. Its name must start with a capital letter.",
 "Declarative: you describe the result for the current state, React works out the DOM changes.",
 "createRoot(element).render(<App />) starts the app. It replaced ReactDOM.render in React 18.",
 "Create a project: npm create vite@latest my-app -- --template react-ts.",
 "Files with JSX must use the .tsx extension. Plain logic files use .ts.",
 "StrictMode is a development helper. It adds extra checks and has no effect in production."],
"A team must build an admin dashboard for an online shop. They create the project with Vite and the react-ts template, and five minutes later everybody has a running app with hot reload and type checking. They split the screen into components such as Sidebar, OrderTable and OrderRow, and different developers work on different components at the same time.",
`
// terminal
// npm create vite@latest shop-admin -- --template react-ts
// cd shop-admin
// npm install
// npm run dev        (dev server on http://localhost:5173)
// npm run build      (type check + production files in dist/)

// src/main.tsx  - the entry point
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// src/App.tsx  - the first component
type GreetingProps = { name: string };

function Greeting({ name }: GreetingProps) {
  return <p>Hello, {name}!</p>;
}

export default function App() {
  return (
    <main>
      <h1>Shop admin</h1>
      <Greeting name="Asha" />
      <Greeting name="Ravi" />
    </main>
  );
}
`,
"React was created by Jordan Walke at Facebook and was open-sourced in May 2013. React 16 (2017) brought a new internal engine called Fiber, and React 18 (March 2022) brought createRoot and concurrent rendering. Create React App was deprecated in February 2025; Vite, created by Evan You in 2020, is now the usual build tool.",
[["React: Quick Start", "https://react.dev/learn"],
 ["React: Creating a React App", "https://react.dev/learn/creating-a-react-app"],
 ["Vite: Getting Started", "https://vite.dev/guide/"]]),

X("JSX and TSX",
["JSX is a syntax that lets you write markup inside JavaScript. It looks like HTML, but it is not HTML and it is not a string. A build tool turns every JSX tag into a normal function call that creates a small object. TSX is the same thing in a TypeScript file, so the compiler also checks the tag names, the attributes and their types.",
 "Inside JSX you use curly braces to go back to JavaScript. You can put any expression in the braces: a variable, a function call, a ternary or a map over an array. You cannot put statements such as if or for there. Attributes use camelCase names, and two names are different from HTML: className instead of class, and htmlFor instead of for.",
 "A component must return one root element. When you do not want an extra div on the page, wrap the elements in a fragment, written as <>...</>. Every tag must be closed, so you write <img /> and <br />. The style attribute takes an object, not a string."],
["JSX compiles to function calls. <h1>Hi</h1> becomes jsx('h1', { children: 'Hi' }).",
 "Curly braces hold expressions only. Use a ternary or && for conditions, and map for loops.",
 "Use className and htmlFor. Other attributes are camelCase: onClick, tabIndex, maxLength.",
 "A lowercase tag is an HTML element. A tag with a capital letter is your component.",
 "Fragments (<>...</>) group elements without adding a DOM node.",
 "React escapes all text in braces, so user text cannot inject HTML by accident.",
 "true, false, null and undefined render nothing. The number 0 does render."],
"A developer moves an HTML template into a React component. The build fails on 'class' and on an unclosed <input> tag, and TypeScript reports that 'onclick' does not exist and suggests 'onClick'. The errors are fixed before the page is ever opened in a browser.",
`
type User = { name: string; avatarUrl: string; isAdmin: boolean };

const user: User = { name: "Asha", avatarUrl: "/img/asha.png", isAdmin: true };
const tags: string[] = ["react", "typescript"];

export function Profile() {
  const size = 48;
  return (
    <>
      <h2 className="title">{user.name.toUpperCase()}</h2>
      <img src={user.avatarUrl} alt={"Photo of " + user.name} width={size} />

      {/* a condition: ternary or && */}
      {user.isAdmin ? <span className="badge">Admin</span> : null}

      {/* style takes an object with camelCase keys */}
      <p style={{ color: "gray", fontSize: 14 }}>Member since 2024</p>

      <label htmlFor="email">Email</label>
      <input id="email" type="email" maxLength={50} />

      <ul>
        {tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
    </>
  );
}

// What the compiler produces for <h2 className="title">Hi</h2>:
//   import { jsx } from "react/jsx-runtime";
//   jsx("h2", { className: "title", children: "Hi" });
`,
"JSX was released together with React in 2013 and many developers disliked it at first. TypeScript added TSX support in version 1.6 (2015). React 17 (October 2020) introduced the new JSX transform, so you no longer need to import React in every file that uses JSX.",
[["React: Writing Markup with JSX", "https://react.dev/learn/writing-markup-with-jsx"],
 ["React: JavaScript in JSX with Curly Braces", "https://react.dev/learn/javascript-in-jsx-with-curly-braces"],
 ["TypeScript Handbook: JSX", "https://www.typescriptlang.org/docs/handbook/jsx.html"]]),

X("Components and props",
["Props are the inputs of a component. The parent passes them like HTML attributes, and the component receives them as one object. In TypeScript you describe that object with a type or an interface. Then the compiler tells you when a prop is missing, has the wrong type or has a wrong name.",
 "Props are read-only. A component must never change its own props. Data flows one way, from parent to child. When a child needs to tell the parent that something happened, the parent passes a function as a prop and the child calls it. This one-way flow makes it easy to find where a value comes from.",
 "The special prop 'children' holds whatever you put between the opening and closing tags of a component. Its type is React.ReactNode. With children you can build wrapper components such as Card, Modal or Layout. This is called composition, and React uses it instead of class inheritance."],
["Type the props with a type or interface and destructure them in the parameter list.",
 "Mark optional props with ? and give default values in the destructuring.",
 "Props are read-only. To change something, call a callback prop from the parent.",
 "children has the type React.ReactNode: elements, strings, numbers, arrays, null.",
 "Data flows down through props; events flow up through callback props.",
 "Prefer composition (children, component props) over deep prop lists.",
 "A union type such as 'primary' | 'ghost' is better than string for a variant prop."],
"A design system team writes one Button component with a typed 'variant' prop. When a developer writes variant='primry' by mistake, the editor underlines it at once. Later the team renames a prop, and the compiler lists every one of the 140 places that must change.",
`
import type { ReactNode } from "react";

type ButtonProps = {
  label: string;
  variant?: "primary" | "ghost";      // optional
  disabled?: boolean;
  onClick: () => void;                // callback: child tells the parent
};

function Button({ label, variant = "primary", disabled = false, onClick }: ButtonProps) {
  return (
    <button className={"btn btn-" + variant} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}

type CardProps = {
  title: string;
  children: ReactNode;                // anything between <Card> and </Card>
};

function Card({ title, children }: CardProps) {
  return (
    <section className="card">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function OrderSummary() {
  const total = 1250;
  return (
    <Card title="Your order">
      <p>Total: {total} INR</p>
      <Button label="Pay now" onClick={() => console.log("pay")} />
      <Button label="Cancel" variant="ghost" onClick={() => console.log("cancel")} />
    </Card>
  );
}
`,
"The first versions of React used React.createClass and later ES6 classes for components. Function components became the standard way after hooks arrived in React 16.8 (February 2019). The old runtime check library prop-types has been replaced by TypeScript in most projects.",
[["React: Passing Props to a Component", "https://react.dev/learn/passing-props-to-a-component"],
 ["React: Using TypeScript", "https://react.dev/learn/typescript"],
 ["React: Your First Component", "https://react.dev/learn/your-first-component"]]),

X("State with useState",
["State is data that a component remembers between renders. A normal variable inside the function is created again on every render, so it cannot remember anything. useState gives you the current value and a setter function. When you call the setter, React renders the component again with the new value.",
 "You must treat state as immutable. Do not change an object or array in state directly. Create a new one with the spread syntax, map or filter, and pass it to the setter. React compares the old and the new value by reference, so if you change the same object and set it again, React sees no change and does not update the screen.",
 "Calling the setter does not change the variable in the code that is running. The new value arrives in the next render. React also groups several setter calls into one render, which is called batching. When the new value depends on the old one, pass a function to the setter. When two components need the same data, move the state up to their closest common parent and pass it down as props; this is called lifting state up."],
["const [value, setValue] = useState(initial). TypeScript infers the type from the initial value.",
 "Give the type yourself when it cannot be inferred: useState<User | null>(null).",
 "Never mutate state. Create a new object or array and set it.",
 "The state variable is a snapshot. It does not change during the current render.",
 "Use the functional form when the next value depends on the previous one: setCount(c => c + 1).",
 "Several updates in one event are batched into a single render.",
 "Lift state up to the closest common parent when two components share it."],
"On a shop page, the cart icon in the header and the product list both need the cart items. The team first kept the items inside the product list, so the header could not show the count. They lifted the state up to the page component and passed the items and an 'add' function down as props.",
`
import { useState } from "react";

type Item = { id: number; name: string; qty: number };

export function Cart() {
  const [items, setItems] = useState<Item[]>([]);
  const [coupon, setCoupon] = useState<string | null>(null);

  function addItem(name: string) {
    // new array, do not push into the old one
    setItems((prev) => [...prev, { id: Date.now(), name, qty: 1 }]);
  }

  function increase(id: number) {
    // new array AND a new object for the changed item
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qty: item.qty + 1 } : item))
    );
  }

  function remove(id: number) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const totalQty = items.reduce((sum, item) => sum + item.qty, 0); // derived, not state

  return (
    <div>
      <button onClick={() => addItem("Notebook")}>Add notebook</button>
      <button onClick={() => setCoupon("SAVE10")}>Apply coupon</button>
      <p>Items: {totalQty} {coupon && <span>(coupon {coupon})</span>}</p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.name} x {item.qty}
            <button onClick={() => increase(item.id)}>+</button>
            <button onClick={() => remove(item.id)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
`,
"useState arrived with hooks in React 16.8 (February 2019). Before that, only class components could hold state, with this.state and this.setState. React 18 (March 2022) added automatic batching, so updates inside promises and timers are grouped too, not only updates inside event handlers.",
[["React: State - A Component's Memory", "https://react.dev/learn/state-a-components-memory"],
 ["React: useState reference", "https://react.dev/reference/react/useState"],
 ["React: Queueing a Series of State Updates", "https://react.dev/learn/queueing-a-series-of-state-updates"]]),

X("Events and forms",
["You handle events by passing a function to props such as onClick, onChange and onSubmit. You pass the function itself; you do not call it. React gives the handler an event object. In TypeScript the event has a generic type, for example React.ChangeEvent<HTMLInputElement> for a text input and React.MouseEvent<HTMLButtonElement> for a button click.",
 "A controlled input gets its value from state and updates the state in onChange. React state is then the single source of truth, so you can validate, format or reset the field at any time. An uncontrolled input keeps its own value in the DOM. You read it only when you need it, with a ref or with FormData at submit time.",
 "A form submits when the user presses Enter or clicks the submit button. Handle the submit event on the form, not the click on the button, and call e.preventDefault() to stop the browser from reloading the page. For large forms with many fields and rules, teams often use a library such as React Hook Form."],
["Pass the handler, do not call it: onClick={save}, not onClick={save()}.",
 "Type inline handlers automatically; type separate handlers with React.ChangeEvent<...> and similar.",
 "Controlled: value + onChange, state is the source of truth.",
 "Uncontrolled: defaultValue, read the value with a ref or FormData.",
 "Handle onSubmit on the form and call e.preventDefault().",
 "Use e.currentTarget for the element that has the handler; it is typed correctly.",
 "A checkbox uses checked, not value. A select uses value on the select tag."],
"A sign-up form must show 'password too short' while the user types and must disable the button until the form is valid. The team uses controlled inputs, so the rules read the state on every key press. For a simple search box they use an uncontrolled input and read it once on submit.",
`
import { useState } from "react";

type LoginForm = { email: string; password: string; remember: boolean };

export function Login({ onLogin }: { onLogin: (data: LoginForm) => void }) {
  const [form, setForm] = useState<LoginForm>({ email: "", password: "", remember: false });
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.currentTarget;
    // one handler for all fields; [name] is a computed key
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();                       // no page reload
    if (form.password.length < 8) {
      setError("Password needs at least 8 characters");
      return;
    }
    setError("");
    onLogin(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" value={form.email} onChange={handleChange} required />
      <input name="password" type="password" value={form.password} onChange={handleChange} />
      <label>
        <input name="remember" type="checkbox" checked={form.remember} onChange={handleChange} />
        Remember me
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={form.email === ""}>Log in</button>
    </form>
  );
}
`,
"React has used its own event wrapper, called SyntheticEvent, since the first release in 2013, to give the same behaviour in all browsers. React 17 (October 2020) changed where the listeners are attached: from the document to the root container of the app. React 19 (December 2024) added the 'action' prop on forms, which can take a function.",
[["React: Responding to Events", "https://react.dev/learn/responding-to-events"],
 ["React: <input> reference", "https://react.dev/reference/react-dom/components/input"],
 ["React: <form> reference", "https://react.dev/reference/react-dom/components/form"]]),

X("Lists, keys and conditional rendering",
["To show a list you call map on an array and return one element for each item. React needs a 'key' prop on each element of the list. The key tells React which item is which when the list changes. A good key is a stable and unique id that comes from your data, such as a database id.",
 "Keys only have to be unique among siblings in the same list. Do not use the array index as a key when items can be added, removed or sorted, because then the index of an item changes and React mixes up the items. Do not create keys with Math.random() during render, because every render then gives new keys and React destroys and rebuilds all rows.",
 "For conditions you use normal JavaScript. An if with an early return works well for a whole component. Inside JSX you use a ternary for 'this or that' and && for 'this or nothing'. Be careful with && when the left side is a number: 0 is rendered as the text 0."],
["Render lists with array.map and give each element a key.",
 "The key must be stable, unique among siblings and come from the data.",
 "Index as key is only safe for a static list that never changes order.",
 "The key goes on the outermost element returned inside map.",
 "The component does not receive key as a prop. Pass the id again if the child needs it.",
 "Use cond ? <A /> : <B /> for two choices and cond && <A /> for one.",
 "Write items.length > 0 && ..., not items.length && ..., to avoid a 0 on the screen."],
"A task board lets users drag tasks to reorder them. With index keys, the text typed into an open comment box jumped to a different task after a drag. The team changed the key to the task id from the database and the bug was gone.",
`
import { useState } from "react";

type Todo = { id: string; text: string; done: boolean };
type Filter = "all" | "open" | "done";

export function TodoList({ todos, loading }: { todos: Todo[]; loading: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");

  if (loading) return <p>Loading...</p>;          // early return

  const visible = todos.filter((t) =>
    filter === "all" ? true : filter === "done" ? t.done : !t.done
  );

  return (
    <div>
      <button onClick={() => setFilter("all")}>All</button>
      <button onClick={() => setFilter("open")}>Open</button>
      <button onClick={() => setFilter("done")}>Done</button>

      {visible.length === 0 ? (
        <p>Nothing to show.</p>
      ) : (
        <ul>
          {visible.map((todo) => (
            <li key={todo.id} className={todo.done ? "done" : undefined}>
              {todo.text}
              {todo.done && <span> (finished)</span>}
            </li>
          ))}
        </ul>
      )}

      {todos.length > 0 && <p>{todos.length} tasks in total</p>}
    </div>
  );
}
`,
"Keys have been part of React since the early releases, because the list comparison algorithm depends on them. React 16.0 (September 2017) allowed a component to return an array, and React 16.2 (November 2017) added the short fragment syntax <>...</>.",
[["React: Rendering Lists", "https://react.dev/learn/rendering-lists"],
 ["React: Conditional Rendering", "https://react.dev/learn/conditional-rendering"],
 ["React: Preserving and Resetting State", "https://react.dev/learn/preserving-and-resetting-state"]]),

X("useEffect and the component life cycle",
["A component has a simple life: it mounts (appears on the screen), it updates (renders again with new props or state) and it unmounts (is removed). Rendering itself must be pure: it only calculates JSX. Work that touches the world outside React is a side effect, for example a network connection, a timer, a browser event listener or the document title. useEffect is the place for that work.",
 "useEffect takes a function and a list of dependencies. React runs the function after the component is shown on the screen. With no list, the effect runs after every render. With an empty list it runs once after mount. With values in the list it runs again only when one of those values has changed. Every value from the component that the effect uses must be in the list.",
 "The effect can return a cleanup function. React calls it before the effect runs again and when the component unmounts. Use it to close the connection, clear the timer or remove the listener. Many effects are not needed at all. If you can calculate a value from props or state, calculate it during render. If something should happen because the user clicked, do it in the event handler."],
["An effect synchronises the component with something outside React.",
 "No array: after every render. Empty array: once after mount. [a, b]: when a or b changes.",
 "Return a cleanup function to undo what the effect started.",
 "List every prop and state value the effect reads. Use the react-hooks ESLint plugin to check.",
 "In development with StrictMode, React mounts every component twice to test your cleanup.",
 "Do not use an effect for derived data or for reacting to a user action.",
 "The effect function cannot be async. Define an async function inside it and call it."],
"A chat screen connects to a room over a WebSocket. The effect opens the connection for the current roomId and the cleanup closes it. When the user switches rooms, React first closes the old connection and then opens the new one, so messages from the old room never appear in the new one.",
`
import { useEffect, useState } from "react";

type ChatProps = { roomId: string };

export function ChatRoom({ roomId }: ChatProps) {
  const [messages, setMessages] = useState<string[]>([]);
  const [online, setOnline] = useState(navigator.onLine);

  // 1. runs when roomId changes; cleanup closes the old socket first
  useEffect(() => {
    const socket = new WebSocket("wss://chat.example.com/rooms/" + roomId);
    socket.onmessage = (e: MessageEvent<string>) => {
      setMessages((prev) => [...prev, e.data]);
    };
    return () => socket.close();   // parent can use <ChatRoom key={roomId} /> to also clear old messages
  }, [roomId]);

  // 2. runs once: subscribe to a browser event, unsubscribe on unmount
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // 3. NOT an effect: derived data is calculated during render
  const count = messages.length;

  return (
    <section>
      <h2>Room {roomId} ({count} messages) {online ? "" : "- offline"}</h2>
      <ul>{messages.map((m, i) => <li key={i}>{m}</li>)}</ul>
    </section>
  );
}
`,
"useEffect arrived with hooks in React 16.8 (February 2019). It replaced the class methods componentDidMount, componentDidUpdate and componentWillUnmount. Since React 18 (March 2022), StrictMode runs each effect an extra time in development to find missing cleanup code.",
[["React: Synchronizing with Effects", "https://react.dev/learn/synchronizing-with-effects"],
 ["React: You Might Not Need an Effect", "https://react.dev/learn/you-might-not-need-an-effect"],
 ["React: useEffect reference", "https://react.dev/reference/react/useEffect"]]),

X("useRef and refs",
["useRef gives you an object with one property, current. React keeps the same object for the whole life of the component. You can read and change current at any time, and changing it does not cause a re-render. So a ref is a box for a value that the component must remember but that is not shown on the screen.",
 "The most common use is access to a DOM element. You create a ref with useRef<HTMLInputElement>(null) and pass it to the ref attribute of a tag. After React has put the element on the page, ref.current points to the real DOM node. Then you can call methods that React does not offer as props, such as focus(), scrollIntoView() or play() on a video.",
 "The second use is to store a mutable value such as a timer id, a previous value or an AbortController. To give a parent access to a DOM node inside your own component, the component must pass the ref on to the tag. In React 19, ref is a normal prop of function components. In React 18 and earlier you had to wrap the component in forwardRef."],
["useRef returns { current: value } and the object is stable across renders.",
 "Changing ref.current does not re-render. Use state for anything the user sees.",
 "DOM ref: useRef<HTMLDivElement>(null), then <div ref={myRef}>.",
 "ref.current is null until the element is mounted. Read it in handlers and effects.",
 "Do not read or write ref.current during rendering.",
 "React 19: ref is a normal prop. React 18 and earlier: use forwardRef.",
 "Store timer ids, sockets and other non-visual values in a ref."],
"A support chat must scroll to the newest message every time one arrives, and must put the cursor back in the text box after the user sends a message. Both need the real DOM nodes, so the component keeps one ref on the last list item and one on the input.",
`
import { useEffect, useRef, useState } from "react";

// React 19: ref is just a prop (React 18 needs forwardRef here)
type TextFieldProps = { label: string; ref?: React.Ref<HTMLInputElement> };

function TextField({ label, ref }: TextFieldProps) {
  return (
    <label>
      {label} <input ref={ref} type="text" />
    </label>
  );
}

export function Stopwatch() {
  const [seconds, setSeconds] = useState(0);
  const timerId = useRef<number | undefined>(undefined);   // survives re-renders
  const nameRef = useRef<HTMLInputElement>(null);          // DOM node

  function start() {
    if (timerId.current !== undefined) return;             // already running
    timerId.current = window.setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
  }

  function stop() {
    window.clearInterval(timerId.current);
    timerId.current = undefined;
  }

  useEffect(() => {
    nameRef.current?.focus();        // the node exists after mount
    return () => window.clearInterval(timerId.current);   // clear the timer on unmount
  }, []);

  return (
    <div>
      <TextField label="Runner name" ref={nameRef} />
      <p>{seconds} s</p>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
    </div>
  );
}
`,
"Early React used string refs, which are now removed. React 16.3 (March 2018) added createRef and forwardRef, and useRef arrived with hooks in React 16.8 (February 2019). React 19 (December 2024) made ref a normal prop for function components, so forwardRef is no longer needed in new code.",
[["React: Referencing Values with Refs", "https://react.dev/learn/referencing-values-with-refs"],
 ["React: Manipulating the DOM with Refs", "https://react.dev/learn/manipulating-the-dom-with-refs"],
 ["React: useRef reference", "https://react.dev/reference/react/useRef"]]),

X("Context and useContext",
["Sometimes many components at different depths need the same value, for example the logged-in user, the theme or the language. Passing it as a prop through every level in between is called prop drilling. The components in the middle do not use the value; they only pass it on. This makes the code noisy and hard to change.",
 "Context solves this. You create a context object with createContext. A provider component high in the tree holds the value. Any component below it can read the value with useContext, without props in between. When the value of the provider changes, React re-renders every component that reads that context.",
 "With TypeScript, a clean pattern is to create the context with null as the default value and to write a small custom hook such as useAuth. The hook reads the context and throws an error when no provider is found. The rest of the app uses only this hook, so the value is never null for the caller and a missing provider is found at once."],
["createContext<T | null>(null) creates the context; the provider gives it a value.",
 "useContext(MyContext) reads the value of the closest provider above.",
 "The default value is used only when there is no provider above the component.",
 "Wrap useContext in a custom hook that throws when the provider is missing.",
 "Every consumer re-renders when the provider value changes.",
 "Good for values that change rarely: user, theme, language.",
 "In React 19 you can write <ThemeContext value={...}>; before that <ThemeContext.Provider value={...}>."],
"In a banking app the user object was passed through seven levels of components to reach the avatar in the header and the 'transfer' button. The team created an AuthProvider at the top of the app and a useAuth hook. They deleted the user prop from more than thirty components in between.",
`
import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

type User = { id: number; name: string };
type AuthValue = {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // same object until user changes, so consumers do not re-render for nothing
  const value = useMemo<AuthValue>(
    () => ({ user, login: setUser, logout: () => setUser(null) }),
    [user]
  );

  // React 19 syntax. React 18: <AuthContext.Provider value={value}>
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

function Header() {
  const { user, logout } = useAuth();          // no props needed
  if (!user) return <p>Please log in</p>;
  return (
    <header>
      Hello {user.name} <button onClick={logout}>Log out</button>
    </header>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Header />
    </AuthProvider>
  );
}
`,
"React had an old, unofficial context feature for years. The current Context API with createContext was released in React 16.3 (March 2018), and the useContext hook followed in React 16.8 (February 2019). React 19 (December 2024) allows the context object itself to be used as the provider.",
[["React: Passing Data Deeply with Context", "https://react.dev/learn/passing-data-deeply-with-context"],
 ["React: useContext reference", "https://react.dev/reference/react/useContext"],
 ["React: createContext reference", "https://react.dev/reference/react/createContext"]]),

X("useReducer",
["useReducer is another way to keep state. Instead of calling a setter with the new value, you send an action that says what happened, for example 'item added'. A function called the reducer receives the current state and the action and returns the next state. All the rules for changing the state live in that one function.",
 "The reducer must be pure. It must not change the old state, call an API or use random values. It only calculates the new state from its two inputs. This makes it easy to test: you call it with a state and an action and check the result, with no React involved.",
 "TypeScript fits reducers very well. You write the actions as a discriminated union, where each action has a 'type' field with a literal string. Inside the switch the compiler knows which other fields each action has. Prefer useReducer when the state has several parts that change together, or when many handlers update the same state in different ways. For one simple value, useState is shorter and clearer."],
["const [state, dispatch] = useReducer(reducer, initialState).",
 "The reducer is (state, action) => newState and must be pure.",
 "Type actions as a discriminated union with a literal 'type' field.",
 "Return a new state object. Never mutate the old one.",
 "dispatch has a stable identity, so it is safe to pass down or put in context.",
 "Use it when several values change together or the update rules are complex.",
 "A reducer is easy to unit test because it is a plain function."],
"A checkout page had seven useState calls: items, coupon, shipping, step, error and more. A bug appeared because one handler updated the coupon but forgot to recalculate shipping. The team moved everything into one reducer, so each action updates all related fields in one place.",
`
import { useReducer } from "react";

type Item = { id: number; name: string; price: number; qty: number };
type CartState = { items: Item[]; coupon: string | null };

type CartAction =
  | { type: "added"; item: Item }
  | { type: "removed"; id: number }
  | { type: "qtyChanged"; id: number; qty: number }
  | { type: "couponApplied"; code: string }
  | { type: "cleared" };

const initialState: CartState = { items: [], coupon: null };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "added":
      return { ...state, items: [...state.items, action.item] };
    case "removed":
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case "qtyChanged":
      return {
        ...state,
        items: state.items.map((i) => (i.id === action.id ? { ...i, qty: action.qty } : i)),
      };
    case "couponApplied":
      return { ...state, coupon: action.code };
    case "cleared":
      return initialState;
  }
}

export function Cart() {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const total = state.items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div>
      <button onClick={() => dispatch({ type: "added", item: { id: Date.now(), name: "Pen", price: 20, qty: 1 } })}>
        Add pen
      </button>
      <button onClick={() => dispatch({ type: "cleared" })}>Clear</button>
      <p>{state.items.length} items, total {total}</p>
    </div>
  );
}
`,
"The reducer idea comes from the Flux pattern (Facebook, 2014) and from Redux, which Dan Abramov and Andrew Clark released in 2015. Redux took the idea from the Elm language. useReducer brought the same pattern into React itself with hooks in React 16.8 (February 2019).",
[["React: Extracting State Logic into a Reducer", "https://react.dev/learn/extracting-state-logic-into-a-reducer"],
 ["React: useReducer reference", "https://react.dev/reference/react/useReducer"],
 ["React: Scaling Up with Reducer and Context", "https://react.dev/learn/scaling-up-with-reducer-and-context"]]),

X("Performance: memo, useMemo and useCallback",
["A component re-renders when its state changes, when its parent re-renders or when a context it reads changes. A re-render is only a function call that produces new JSX, and React touches the real DOM only where something is different. So most re-renders are cheap, and you should measure before you optimise. The React DevTools Profiler shows which components rendered and how long they took.",
 "React gives three tools to skip work. memo wraps a component, and React skips its re-render when all props are the same as last time. useMemo remembers the result of a calculation until its dependencies change. useCallback remembers a function, so that a child wrapped in memo receives the same function each time. They only help together: memo is useless if the parent passes a new object or a new inline function on every render.",
 "The React Compiler does this work for you. It is a build-time tool that reads your components and adds the memoisation automatically, so in a project that uses it you write very few useMemo and useCallback calls by hand. A different kind of optimisation is code splitting. With lazy and Suspense, the code of a page is downloaded only when the user opens that page, so the first load is smaller."],
["Re-render causes: own state change, parent re-render, context change.",
 "memo(Component) skips the re-render when props are shallowly equal.",
 "useMemo(() => compute(), [deps]) caches a value.",
 "useCallback(fn, [deps]) caches a function. It is useMemo for functions.",
 "Memoisation has a cost. Use it for slow components and heavy calculations, not everywhere.",
 "The React Compiler adds memoisation automatically at build time.",
 "lazy(() => import('./Page')) with <Suspense fallback=...> loads code on demand."],
"A product page with 2,000 rows became slow: each key press in the search box re-rendered every row. The Profiler showed the rows as the cost. The team wrapped Row in memo, kept the 'select' handler stable with useCallback and moved the filter into useMemo. Typing became smooth again.",
`
import { lazy, memo, Suspense, useCallback, useMemo, useState } from "react";

type Product = { id: number; name: string; price: number };
type RowProps = { product: Product; onSelect: (id: number) => void };

// re-renders only when product or onSelect is a different reference
const Row = memo(function Row({ product, onSelect }: RowProps) {
  return <li onClick={() => onSelect(product.id)}>{product.name} - {product.price}</li>;
});

// the code for the chart is downloaded only when it is first shown
const SalesChart = lazy(() => import("./SalesChart"));   // needs a default export

export function ProductList({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showChart, setShowChart] = useState(false);

  // recalculated only when products or query change
  const visible = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query]
  );

  // same function on every render, so memo on Row can work
  const handleSelect = useCallback((id: number) => setSelectedId(id), []);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
      <p>Selected: {selectedId ?? "none"}</p>
      <ul>
        {visible.map((p) => <Row key={p.id} product={p} onSelect={handleSelect} />)}
      </ul>
      <button onClick={() => setShowChart(true)}>Show chart</button>
      {showChart && (
        <Suspense fallback={<p>Loading chart...</p>}>
          <SalesChart />
        </Suspense>
      )}
    </div>
  );
}
`,
"React.memo and React.lazy with Suspense were added in React 16.6 (October 2018). useMemo and useCallback arrived with hooks in React 16.8 (February 2019). The React Compiler, first shown under the name React Forget in 2021, reached version 1.0 in October 2025.",
[["React: memo reference", "https://react.dev/reference/react/memo"],
 ["React: useMemo reference", "https://react.dev/reference/react/useMemo"],
 ["React Compiler", "https://react.dev/learn/react-compiler"]]),

X("Custom hooks",
["A custom hook is a normal function whose name starts with 'use' and that calls other hooks. It lets you take stateful logic out of a component and reuse it in many components. The component becomes shorter and says what it wants, for example useDebounce(text, 300), and the hook contains how it is done.",
 "A custom hook shares logic, not state. Each component that calls the hook gets its own separate state and effects. If two components call useLocalStorage, they each have their own useState inside. To share the same state between components you need lifting state up, context or a store.",
 "All hooks follow two rules. First, call hooks only at the top level of a component or of another hook, never inside a condition, a loop or after an early return. Second, call hooks only from React function components or custom hooks. React finds the state of each hook by the order of the calls, so the order must be the same on every render. The eslint-plugin-react-hooks package checks both rules."],
["A custom hook is a function named useSomething that calls other hooks.",
 "It can take any arguments and return anything: a value, a tuple or an object.",
 "Each call has its own independent state.",
 "Rule 1: only at the top level. No hooks in conditions, loops or after early returns.",
 "Rule 2: only inside components and other hooks.",
 "Use generics to keep the types: useLocalStorage<T>(key, initial).",
 "Return a tuple 'as const' when you want array destructuring with correct types."],
"Four pages of an app had a search box, and each page copied the same timer code to wait until the user stops typing. One copy forgot to clear the timer and sent requests after the page was closed. The team wrote one useDebounce hook, tested it once and used it on all four pages.",
`
import { useEffect, useState } from "react";

// 1. returns the value only after it has stopped changing for 'delay' ms
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);       // cancel when value changes again
  }, [value, delay]);

  return debounced;
}

// 2. state that is saved in localStorage
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const saved = window.localStorage.getItem(key);    // runs only on the first render
    return saved !== null ? (JSON.parse(saved) as T) : initial;
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

// usage
export function Search() {
  const [text, setText] = useLocalStorage<string>("last-search", "");
  const query = useDebounce(text, 400);

  useEffect(() => {
    if (query !== "") console.log("search the API for", query);
  }, [query]);

  return <input value={text} onChange={(e) => setText(e.currentTarget.value)} />;
}
`,
"Custom hooks arrived together with hooks in React 16.8 (February 2019). Before that, logic was shared with mixins, higher-order components and render props, which all made the component tree deeper and harder to read. Hooks were first presented by Sophie Alpert and Dan Abramov at React Conf in October 2018.",
[["React: Reusing Logic with Custom Hooks", "https://react.dev/learn/reusing-logic-with-custom-hooks"],
 ["React: Rules of Hooks", "https://react.dev/reference/rules/rules-of-hooks"],
 ["React: Built-in Hooks", "https://react.dev/reference/react/hooks"]]),

X("Data fetching",
["Most apps load data from a server. A request has three possible states, and the UI must handle all of them: loading, error and success. The basic way in React is to start the request inside useEffect and to save the result in state. The fetch function does not fail on a 404 or 500 answer, so you must check response.ok yourself.",
 "Two problems appear quickly. First, the component may unmount, or the input may change, while the request is still running. Second, two requests may finish in a different order than they started, so old data replaces new data. This is a race condition. The fix is the cleanup function: create an AbortController, pass its signal to fetch and call abort() in the cleanup.",
 "Writing this by hand in every component is a lot of code, and you still have no cache, no retry and no shared loading state. For this reason most teams use a data library. TanStack Query is the most common one. You give it a key and a function that returns a promise. It handles caching, duplicate requests, retries, refetching in the background and the loading and error flags."],
["Always handle three states: loading, error, data.",
 "fetch only rejects on network failure. Check res.ok for HTTP errors.",
 "Cancel with AbortController in the effect cleanup.",
 "Ignore the AbortError in the catch block; it is not a real error.",
 "A race condition happens when an old response arrives after a newer one.",
 "TanStack Query v5: useQuery({ queryKey, queryFn }) returns data, isPending, error.",
 "The query key works like a dependency array: a new key means a new request."],
"A user list has a search box. The user types 'an' and then 'anna'. The request for 'an' is slow and arrives last, so the page shows the wrong results for 'anna'. After the team added an AbortController in the effect cleanup, the old request is cancelled as soon as the text changes.",
`
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

type User = { id: number; name: string };

async function getUser(id: number, signal?: AbortSignal): Promise<User> {
  const res = await fetch("/api/users/" + id, { signal });
  if (!res.ok) throw new Error("HTTP " + res.status);     // fetch does not throw on 404
  return (await res.json()) as User;
}

// A. by hand, with useEffect
export function UserCardManual({ id }: { id: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getUser(id, controller.signal)
      .then((data) => { setUser(data); setLoading(false); })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;             // cancelled on purpose
        setError(err.message);
        setLoading(false);
      });
    return () => controller.abort();                       // id changed or unmount
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p role="alert">Error: {error}</p>;
  return <h2>{user?.name}</h2>;
}

// B. with TanStack Query (the app is wrapped in <QueryClientProvider>)
export function UserCard({ id }: { id: number }) {
  const { data, isPending, error } = useQuery({
    queryKey: ["user", id],
    queryFn: ({ signal }) => getUser(id, signal),
  });

  if (isPending) return <p>Loading...</p>;
  if (error) return <p role="alert">Error: {error.message}</p>;
  return <h2>{data.name}</h2>;
}
`,
"The fetch API and later AbortController (2017) are browser standards, not part of React. Tanner Linsley released React Query in 2019; it was renamed TanStack Query with version 4 in 2022. Version 5 (October 2023) made the single object argument the only call style and renamed the loading flag to isPending.",
[["React: Fetching data with Effects", "https://react.dev/learn/synchronizing-with-effects#fetching-data"],
 ["TanStack Query: Overview", "https://tanstack.com/query/latest/docs/framework/react/overview"],
 ["TanStack Query: Queries", "https://tanstack.com/query/latest/docs/framework/react/guides/queries"]]),

X("Routing with React Router",
["A single-page app loads one HTML file. When the user moves to another page, JavaScript changes the URL and shows different components, without a full page reload. This is called client-side routing. React does not include a router. React Router is the most used library for it.",
 "You describe the routes as a tree. Each route has a path and an element to show. A path part that starts with a colon, such as :id, is a parameter, and you read it with the useParams hook. Routes can be nested: the parent route renders a shared layout, and the Outlet component marks the place where the matching child route appears.",
 "For navigation you use the Link or NavLink component instead of an a tag, because a normal link reloads the whole page. To navigate from code, for example after a successful login, you call the function from useNavigate. A protected route is a small component that checks whether the user is logged in. If not, it renders Navigate to send the user to the login page."],
["Wrap the app in BrowserRouter and describe pages with Routes and Route.",
 "path='products/:id' defines a parameter; useParams() reads it as a string.",
 "A layout route renders <Outlet /> where the child route goes.",
 "Use <Link to='...'> for navigation; <NavLink> also knows if it is active.",
 "useNavigate() returns a function for navigation from code.",
 "path='*' catches unknown URLs for a 'not found' page.",
 "Since v7 everything is imported from 'react-router'; v6 used 'react-router-dom'."],
"A web shop has a public catalogue and a private account area. The team puts all account pages under one parent route that renders a RequireAuth component. A visitor who opens /account/orders without logging in is sent to /login, and after login is sent back to the page they wanted.",
`
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, Outlet,
         useLocation, useNavigate, useParams } from "react-router";
import { useAuth } from "./auth";

function Layout() {
  return (
    <div>
      <nav>
        <NavLink to="/">Home</NavLink> <NavLink to="/products">Products</NavLink>
      </nav>
      <Outlet />                       {/* the child route renders here */}
    </div>
  );
}

function ProductPage() {
  const { id } = useParams<{ id: string }>();     // id is string | undefined
  const navigate = useNavigate();
  return (
    <div>
      <h2>Product {id}</h2>
      <button onClick={() => navigate(-1)}>Back</button>
    </div>
  );
}

function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<h1>Home</h1>} />
          <Route path="products" element={<Link to="/products/42">Product 42</Link>} />
          <Route path="products/:id" element={<ProductPage />} />
          <Route element={<RequireAuth />}>
            <Route path="account" element={<h1>My account</h1>} />
          </Route>
          <Route path="*" element={<h1>Page not found</h1>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
`,
"React Router was created by Ryan Florence and Michael Jackson in 2014. Version 6 (November 2021) introduced the Routes and element syntax and relative nested routes. Version 7 (November 2024) merged the Remix framework into React Router and moved all imports to the 'react-router' package.",
[["React Router: home", "https://reactrouter.com/home"],
 ["React Router: Routing (declarative mode)", "https://reactrouter.com/start/declarative/routing"],
 ["React Router: Navigating", "https://reactrouter.com/start/declarative/navigating"]]),

X("Global state management",
["Local state with useState is enough for most components. Some data is needed in many distant parts of the app, such as the cart, the logged-in user or the open notifications. Context can share it, but context has no way to subscribe to only one part of the value: every consumer re-renders on every change. For state that is large or changes often, a state library works better.",
 "Zustand is a small library. You create a store with a function, and the store is a hook. A component selects the part it needs, and it re-renders only when that part changes. There is no provider and very little code. Redux Toolkit is the official, modern way to write Redux. You define slices with reducers, combine them in one store and read them with useSelector. It has more structure, strong DevTools and is common in large teams and older codebases.",
 "First decide what kind of state you have. Server state is data that lives on the server and that you only cache in the browser, such as products or orders. It is best handled by TanStack Query or RTK Query. Client state exists only in the browser, such as a theme, a filter or an open dialog. When server state moves to a query library, the global client state that is left is usually small."],
["Start with local state, then lift it up, then context, then a store.",
 "Context is good for rarely changing values; a store is better for frequent updates.",
 "Zustand: create<State>()((set) => ({...})) returns a hook; select with a function.",
 "Redux Toolkit: createSlice + configureStore; components use useSelector and useDispatch.",
 "Redux Toolkit uses Immer, so reducers can be written as if they mutate the state.",
 "Server state belongs in TanStack Query or RTK Query, not in a hand-written store.",
 "Select the smallest piece of state you need, to avoid extra re-renders."],
"A team kept the whole product catalogue in a Redux store and wrote actions for loading, success and error for each API call. After moving the server data to TanStack Query, they deleted most of that code. The store kept only the cart and the UI settings, about fifty lines in total.",
`
// ---- Zustand: store/cart.ts ----
import { create } from "zustand";

type CartItem = { id: number; name: string };
type CartStore = {
  items: CartItem[];
  add: (item: CartItem) => void;
  clear: () => void;
};

export const useCart = create<CartStore>()((set) => ({
  items: [],
  add: (item) => set((state) => ({ items: [...state.items, item] })),
  clear: () => set({ items: [] }),
}));

// a component re-renders only when the selected value changes
export function CartBadge() {
  const count = useCart((state) => state.items.length);
  return <span>Cart ({count})</span>;
}

// ---- Redux Toolkit: the same store ----
import { configureStore, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { useSelector } from "react-redux";

const cartSlice = createSlice({
  name: "cart",
  initialState: { items: [] as CartItem[] },
  reducers: {
    added(state, action: PayloadAction<CartItem>) {
      state.items.push(action.payload);        // allowed: Immer makes a new state
    },
    cleared(state) {
      state.items = [];
    },
  },
});

export const { added, cleared } = cartSlice.actions;
export const store = configureStore({ reducer: { cart: cartSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;

export function ReduxCartBadge() {            // the app is wrapped in <Provider store={store}>
  const count = useSelector((state: RootState) => state.cart.items.length);
  return <span>Cart ({count})</span>;
}
`,
"Redux was created by Dan Abramov and Andrew Clark in 2015. Redux Toolkit 1.0 was released in October 2019 to remove the boilerplate, and it is now the recommended way to write Redux. Zustand was first released in 2019 by the Poimandres open-source group.",
[["React: Managing State", "https://react.dev/learn/managing-state"],
 ["Zustand documentation", "https://zustand.docs.pmnd.rs/"],
 ["Redux Toolkit: Quick Start", "https://redux-toolkit.js.org/tutorials/quick-start"]]),

X("Testing and modern React",
["Tests give you the confidence to change code. For a Vite project the usual tools are Vitest as the test runner and React Testing Library to render components. The idea of React Testing Library is to test a component the way a user uses it. You find elements by their role or visible text, you click and type, and you check what is on the screen. You do not check internal state.",
 "React 19 added several features. An Action is an async function that you pass to the action prop of a form; React tracks the pending state and errors for you. The hooks useActionState, useFormStatus and useOptimistic work with Actions. The new 'use' API reads a promise or a context during render, and it may be called inside a condition. Also, ref became a normal prop.",
 "Server Components are components that run only on the server, or at build time. Their code is not sent to the browser, and they can read a database or the file system directly. They cannot use state or effects. A file that starts with 'use client' marks a Client Component, which works like the components in this tutorial. Next.js is the most used framework built on these features. It adds file-based routing, server rendering and its own build system."],
["Vitest runs the tests; jsdom gives a fake browser DOM in Node.",
 "render(<Comp />) then screen.getByRole(...) to find elements like a user does.",
 "Use userEvent for clicks and typing; its methods return promises, so await them.",
 "getBy throws if not found; queryBy returns null; findBy waits and returns a promise.",
 "React 19: Actions, useActionState, useOptimistic, use, ref as a prop.",
 "Server Components run on the server and send no JavaScript for themselves.",
 "'use client' at the top of a file marks the start of client code."],
"Before each release a tester clicked through the login form by hand. The team wrote five component tests that fill the form, submit it and check the error messages. The tests run in a few seconds on every pull request, and a broken validation rule was caught before it reached production.",
`
// Counter.tsx
import { useState } from "react";

export function Counter({ onChange }: { onChange?: (n: number) => void }) {
  const [count, setCount] = useState(0);
  function increase() {
    setCount(count + 1);
    onChange?.(count + 1);
  }
  return <button onClick={increase}>Count: {count}</button>;
}

// Counter.test.tsx   (vite.config.ts: test: { environment: "jsdom" })
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Counter } from "./Counter";

describe("Counter", () => {
  it("starts at zero", () => {
    render(<Counter />);
    expect(screen.getByRole("button").textContent).toBe("Count: 0");
  });

  it("increases when the user clicks", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Counter onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Count: 0" }));

    expect(screen.getByRole("button").textContent).toBe("Count: 1");
    expect(onChange).toHaveBeenCalledWith(1);
  });
});

// React 19 Action: no onSubmit, no preventDefault, no loading state by hand
// const [error, formAction, isPending] = useActionState(saveName, null);
// <form action={formAction}> ... <button disabled={isPending}>Save</button></form>
`,
"React Testing Library was created by Kent C. Dodds in 2018. Vitest was started in late 2021 by Anthony Fu and the Vite team. Next.js was released by Zeit (now Vercel) in October 2016. React 19, with Actions, the use API and stable Server Components, was released in December 2024.",
[["React Testing Library: Introduction", "https://testing-library.com/docs/react-testing-library/intro/"],
 ["Vitest: Getting Started", "https://vitest.dev/guide/"],
 ["React 19 release post", "https://react.dev/blog/2024/12/05/react-19"],
 ["Next.js documentation", "https://nextjs.org/docs"]])
]});
