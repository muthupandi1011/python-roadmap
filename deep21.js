EXTRA(21, "What React is and project setup", {
  deep: [
    "When you write <App />, nothing is drawn. The JSX becomes a React element, a plain object such as { type: App, props: {}, key: null }. Calling root.render starts the render phase: React calls your component functions, collects the elements they return and builds a tree of 'fiber' nodes, one per component or DOM tag. It compares the new tree with the previous one. This comparison is called reconciliation, and the tree of elements is what people call the virtual DOM. Then comes the commit phase: React applies the list of real changes to the DOM in one go, and after that it runs effects.",
    "The render phase can be slow or interrupted, so React is allowed to call your component function more than once for one update, and may throw the result away. This is why a component must be pure: same props and state in, same JSX out, and no side effects during render. StrictMode makes this visible in development by calling every component function twice and by mounting every component twice (mount, unmount, mount). The second call is dimmed in the console. Production builds never do this.",
    "The virtual DOM is not a speed trick. Comparing two trees in memory and then updating the DOM is always more work than a perfect hand-written DOM update. The gain is that you never write the update code at all, and React does the DOM writes in batches, which avoids repeated layout work. React is also not the right choice for everything. A static marketing page with no interaction does not need it, and a tiny widget on an existing server-rendered site may be better with plain JavaScript than with a 40 kB library."
  ],
  iq: [
    { q: "What is the difference between the virtual DOM and the real DOM, and is the virtual DOM faster?", a: "The real DOM is the browser's tree of nodes; reading and changing it triggers layout and paint work and is expensive. The virtual DOM is only a tree of JavaScript objects that describes what the DOM should look like. React compares the new description with the old one and changes only the nodes that differ. It is not faster than an ideal manual update; it is fast enough and it saves you from writing the update code by hand.", c: `
const el = <h1 className="title">Hi</h1>;
console.log(el);
// { type: "h1", props: { className: "title", children: "Hi" }, key: null, ... }
// a plain object, not a DOM node. document.createElement is called only in the commit phase.
` },
    { q: "What are the render phase and the commit phase?", a: "In the render phase React calls your components and works out what has to change. It has no visible result and React may pause, repeat or throw it away. In the commit phase React writes the changes to the DOM, updates refs and then runs effects. useLayoutEffect runs inside the commit before the browser paints; useEffect normally runs after the paint." },
    { q: "Why does my component function log twice in development?", a: "StrictMode calls the component function twice on every render in development, and also runs mount, unmount and mount again for effects. The goal is to find impure components and missing cleanup. Nothing of this happens in production, so the fix is to make the component pure, not to remove StrictMode.", c: `
function Price({ cents }: { cents: number }) {
  console.log("render");                 // dev + StrictMode: printed twice, second time dimmed
  return <span>{(cents / 100).toFixed(2)}</span>;
}
` },
    { q: "Create React App is deprecated. What do you use, and why does it matter?", a: "For a client-only app, use Vite with the react-ts template. For an app that needs server rendering, routing and data loading, use a framework such as Next.js or React Router in framework mode. CRA used Webpack with slow cold starts and no longer received updates, so new projects started with outdated dependencies and security warnings.", c: `
npm create vite@latest my-app -- --template react-ts
cd my-app && npm install && npm run dev
# vite.config.ts already contains the react plugin; tsconfig has "jsx": "react-jsx"
` }
  ],
  tips: [
    "Install the React DevTools browser extension on day one. The Components tab shows props and state of every component, and the Profiler tab shows why a component rendered.",
    "Keep 'strict': true in tsconfig and run 'tsc --noEmit' in CI. Vite's dev server does not type check; it only strips the types.",
    "Use the '@/' import alias (resolve.alias in vite.config.ts and 'paths' in tsconfig) so that moving a file does not break twenty relative imports.",
    "Put VITE_ in front of environment variables (VITE_API_URL) and read them with import.meta.env. Variables without the prefix are not sent to the browser, which protects secrets."
  ]
});

EXTRA(21, "JSX and TSX", {
  deep: [
    "A JSX tag compiles to a call of jsx() from react/jsx-runtime (or createElement in the old transform). The first argument is the type: a string for a DOM tag, or the component function itself for a capitalised tag. That is why the capital letter matters: <button> becomes jsx('button', ...), while <Button> becomes jsx(Button, ...). The children become the props.children value: a single child is passed as is, several children as an array. A text child is a string, which is why the number 0 and the string '0' render but false and null do not.",
    "TypeScript checks JSX through the JSX namespace that comes with @types/react. The IntrinsicElements interface lists every DOM tag with its allowed attributes, so <div onClik> is a type error. For a component, TypeScript checks the attributes against the type of its first parameter. In a .tsx file the angle brackets of a type assertion clash with tags, so you must write 'value as Type' instead of '<Type>value', and a generic arrow function needs a trailing comma: const id = <T,>(x: T) => x.",
    "React escapes everything you put inside braces before it writes it into the DOM, so a string that contains <script> is shown as text. The only way to insert raw HTML is dangerouslySetInnerHTML, and then you must sanitise the input yourself. A href attribute is another gap: javascript: URLs are not blocked by the type system, so validate links that come from users. JSX is also not a template language: there is no if, no for, no filters. You use ordinary JavaScript expressions, which is more powerful and sometimes more noisy."
  ],
  iq: [
    { q: "What does this JSX compile to, and why do you not need to import React any more?", a: "Since React 17 the compiler inserts an import of jsx from react/jsx-runtime by itself. Each tag becomes one call with the type and a props object that includes children. Before React 17, every file needed 'import React' because the output was React.createElement.", c: `
<ul className="list">
  <li>{item}</li>
</ul>

// becomes
import { jsx } from "react/jsx-runtime";
jsx("ul", { className: "list", children: jsx("li", { children: item }) });
` },
    { q: "What does this render when items is an empty array?", a: "It renders the number 0. The expression items.length && ... evaluates to 0, and 0 is a valid text child, so a '0' appears on the page. Write items.length > 0 && ..., or use a ternary with null.", c: `
const items: string[] = [];
return <div>{items.length && <List items={items} />}</div>;
// output: <div>0</div>

return <div>{items.length > 0 && <List items={items} />}</div>;
// output: <div></div>
` },
    { q: "Why must a component name start with a capital letter?", a: "The compiler uses the first letter to decide what to generate. A lowercase tag becomes a string type and React creates a DOM element with that name. A capitalised tag becomes a reference to the variable, and React calls that function. A lowercase component is therefore treated as an unknown HTML tag and the function is never called.", c: `
function card() { return <div>Card</div>; }
<card />     // jsx("card", {}) -> an empty <card></card> element in the DOM, with a warning

function Card() { return <div>Card</div>; }
<Card />     // jsx(Card, {}) -> React calls Card()
` },
    { q: "Is JSX safe against XSS?", a: "Mostly. Text in braces is escaped, so user content cannot create elements or scripts. The gaps are dangerouslySetInnerHTML, which inserts raw HTML, and attributes such as href or src that receive a user-supplied javascript: URL. Sanitise HTML with a library such as DOMPurify and check URL schemes before rendering them." }
  ],
  tips: [
    "Use the 'as' form for assertions in .tsx files and a trailing comma for generic arrow functions (<T,>). The angle-bracket forms are parsed as tags.",
    "Prefer the React.ComponentProps<'button'> helper to type a wrapper around a DOM element. You get all native attributes without writing them out.",
    "Turn on the ESLint rules react/jsx-key and react/no-danger. They catch missing keys inside map and every use of dangerouslySetInnerHTML in review.",
    "For long conditional markup, compute a variable before the return (let content = ...; if (...) content = ...) instead of nesting ternaries three levels deep."
  ]
});

EXTRA(21, "Components and props", {
  deep: [
    "Each time a parent renders, it creates new element objects for its children, and React calls each child function again with the new props object. The props object is new on every render even when the values inside are the same. The child does not get a diff; it gets the whole object. React keeps the child's state because the fiber for that position in the tree stays the same. State lives on the fiber, not in the function or the props.",
    "A child re-renders by default when its parent does, whether or not its props changed. This is not a bug; it is the simple model, and it is cheap because the DOM is only touched where the output differs. Children passed as JSX from above are a natural exception: the element objects for props.children were created by the grandparent, so when only the middle component's state changes, those elements are the same references and React skips them. Composition with children therefore reduces work without any memo.",
    "React.FC is a type that some teams still use for components. It works, but it no longer adds children by itself since React 18 types, and it hides the props type behind a generic. A plain function with a typed parameter is the recommended style and gives the same checks. Avoid putting too many booleans on a component (isPrimary, isLarge, isOutlined); one union prop such as variant is clearer. Also avoid passing a whole object when the child needs two fields, because the child then depends on the shape of the object and re-renders when unrelated fields change."
  ],
  iq: [
    { q: "What is the difference between props and state?", a: "Props are inputs given by the parent; the component reads them and cannot change them. State is owned by the component and changed through its setter, which triggers a re-render. If a value is decided outside the component, it is a prop. If the component decides it in response to events, it is state. A value that can be computed from props or state should be neither; compute it during render." },
    { q: "Can a child component change its props?", a: "No. Props are read-only, and with TypeScript the parameter is usually typed so that mutation of the top level is an error. Mutating a nested object inside props would compile, but React would not notice and the parent still holds the old data, so the UI becomes inconsistent. The child calls a callback prop and the parent changes its own state.", c: `
function Title({ text }: { text: string }) {
  text = text.toUpperCase();        // only a local variable changes; the parent is not affected
  return <h1>{text}</h1>;
}

function Item({ item }: { item: { done: boolean } }) {
  item.done = true;                 // compiles, but the parent's state is now silently mutated: a bug
  return null;
}
` },
    { q: "The parent re-renders but passes the same props. Does the child render again?", a: "Yes. React calls every child whose parent rendered, unless the child is wrapped in memo and its props are shallowly equal, or the child element is the same object as before (for example it came through props.children). Rendering is usually cheap; add memo only when the Profiler shows a problem.", c: `
function Parent() {
  const [n, setN] = useState(0);
  return (
    <>
      <button onClick={() => setN(n + 1)}>{n}</button>
      <Child label="fixed" />      {/* Child renders on every click */}
    </>
  );
}
` },
    { q: "What is wrong with a default value like items = [] in the parameter list?", a: "The default is evaluated on every render, so when the prop is missing the component receives a new empty array each time. Any effect or memo that lists items as a dependency sees a new reference and runs again on every render. Move the default to a module-level constant, or handle undefined inside the component.", c: `
function List({ items = [] }: { items?: string[] }) {
  useEffect(() => { console.log("items changed"); }, [items]);   // prints on EVERY render
  return <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>;
}

const EMPTY: string[] = [];
function List2({ items = EMPTY }: { items?: string[] }) { ... }  // stable reference
` }
  ],
  tips: [
    "Export the props type next to the component (export type ButtonProps). Other components can then extend it instead of copying fields.",
    "Spread the rest of the props to the DOM element ({ label, ...rest }: ButtonProps & React.ComponentProps<'button'>) so callers can pass aria-label, data-testid or type without you adding each one.",
    "When a component takes more than six or seven props, split it or switch to composition: <Dialog><Dialog.Title /><Dialog.Body /></Dialog> scales better than a prop for every part.",
    "Make illegal states impossible with union props: { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; data: T } instead of three optional booleans."
  ]
});

EXTRA(21, "State with useState", {
  deep: [
    "React stores hook state on the fiber of the component as a linked list, one node per hook call, in call order. On the first render useState creates the node and saves the initial value. On later renders React walks the list and returns the saved value for the next hook in order. This is why hooks may not be called in a condition: the order would change and React would return the wrong node. The initial value argument is read only on the first render; after that it is ignored, so useState(expensive()) still runs expensive() every render, while useState(() => expensive()) runs it once.",
    "A setter call does not change anything at once. It puts an update into a queue on that hook and asks React to schedule a render. During the next render React runs the queue: a plain value replaces the state, an updater function receives the result of the previous update. Because the render has not happened yet, the state variable in your running code still holds the value from the current render. This is what people mean when they say state updates look asynchronous; in fact the variable is a constant snapshot of one render. Since React 18 all updates in the same task are batched into one render, including those inside promises, timers and native handlers; flushSync forces an immediate render when you really need the DOM updated right now.",
    "If you set the state to a value that is Object.is-equal to the current one, React bails out and skips the re-render of the children (it may still call this one component once more). This is why mutating an array and setting it again does nothing: the reference is the same. Immutability is not a style rule, it is how React detects change. Keep state minimal: do not store values that can be computed from other state or props, and do not copy props into state unless you want a one-time initial value, because the copy will not follow later prop changes."
  ],
  iq: [
    { q: "Why does console.log show the old value right after setCount?", a: "Because count is a const that belongs to the current render. setCount schedules a new render in which count will have the new value; it never changes the variable in the running function. Awaiting or adding a timeout does not help either: the closure still holds the old value. If you need the new value now, compute it in a local variable and use that.", c: `
const [count, setCount] = useState(0);

function handleClick() {
  setCount(count + 1);
  console.log(count);            // 0, the snapshot of this render
  const next = count + 1;        // use a local when you need it now
  save(next);
}
` },
    { q: "What is the final value after calling setCount(count + 1) three times, and with the functional form?", a: "Three plain calls give count + 1, because all three use the same snapshot value and the last write wins. Three functional calls give count + 3, because each updater receives the result of the previous one from the queue. Use the functional form whenever the next value depends on the previous one.", c: `
// count is 0
setCount(count + 1);
setCount(count + 1);
setCount(count + 1);          // next render: 1

setCount((c) => c + 1);
setCount((c) => c + 1);
setCount((c) => c + 1);       // next render: 3

setCount(count + 5);          // queue: replace with 5
setCount((c) => c + 1);       // then 5 + 1 -> next render: 6
` },
    { q: "Why does the list not update after I push into the array in state?", a: "push changes the same array object and setItems receives the same reference as before. React compares with Object.is, sees no change and skips the render. Create a new array with spread, concat, map or filter. The same applies to objects: use the spread syntax to copy and change.", c: `
const [items, setItems] = useState<string[]>([]);

items.push("new");
setItems(items);                    // same reference -> no re-render

setItems([...items, "new"]);        // new array -> re-render
setItems((prev) => [...prev, "new"]);   // best when the update depends on the previous value
` },
    { q: "What is the difference between useState(buildIndex(data)) and useState(() => buildIndex(data))?", a: "Both give the same initial value, but the first form calls buildIndex on every render and throws the result away after the first one. The second form passes a function that React calls only once. Use the lazy initializer for anything that is slow or reads from storage.", c: `
const [index] = useState(buildIndex(data));         // buildIndex runs on EVERY render
const [index2] = useState(() => buildIndex(data));  // runs once
` }
  ],
  tips: [
    "Group values that always change together into one state object, and keep values that change independently in separate useState calls. This avoids partial updates and useless re-renders.",
    "Use a union type for status instead of several booleans: useState<'idle' | 'loading' | 'error' | 'done'>('idle'). It makes impossible combinations like loading and error at the same time impossible.",
    "When a value only needs to be remembered but not displayed, use a ref instead of state. Setting state for a timer id or a previous scroll position causes renders for nothing.",
    "If you must reset state when a prop changes, give the component a key from the parent instead of writing an effect that calls the setter."
  ]
});

EXTRA(21, "Events and forms", {
  deep: [
    "React does not attach your handler to the DOM element. It attaches one native listener per event type to the root container and uses event delegation: when a click happens, React finds the fiber of the target, builds a SyntheticEvent that wraps the native one, and calls the onClick handlers from the target up to the root, in the same order as native bubbling. This is why e.stopPropagation() stops other React handlers but a native listener on document added with addEventListener runs independently of React's order.",
    "A controlled input is React state written into the DOM on every render. When the user types, the browser changes the input, onChange fires, you set state, React renders and writes the value back. If you forget to set state, React writes the old value back and the field looks frozen. If value is undefined on the first render and a string later, React warns that the input changed from uncontrolled to controlled, because it cannot switch modes. Always start with an empty string, never with undefined or null.",
    "The event object type depends on the element. For a text input use React.ChangeEvent<HTMLInputElement>; for a select React.ChangeEvent<HTMLSelectElement>; for a form React.FormEvent<HTMLFormElement>. e.target is typed as a general EventTarget because the event can bubble from any child; e.currentTarget is the element that owns the handler and has the exact type. Controlled inputs cost one render per key press, which is fine for most forms. For very large forms, uncontrolled inputs with FormData or a library such as React Hook Form, which uses refs, avoid that cost."
  ],
  iq: [
    { q: "What is the difference between a controlled and an uncontrolled input, and when do you use which?", a: "A controlled input has value and onChange; React state is the source of truth and the DOM only shows it. An uncontrolled input keeps its value in the DOM; you give a defaultValue and read the value later with a ref or FormData. Use controlled when you need to validate, format or react on every key press. Use uncontrolled for simple forms that are only read on submit.", c: `
// controlled: React owns the value
<input value={name} onChange={(e) => setName(e.currentTarget.value)} />

// uncontrolled: the DOM owns the value, read it on submit
function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  console.log(data.get("name"));
}
<form onSubmit={handleSubmit}><input name="name" defaultValue="" /></form>
` },
    { q: "What is wrong with onClick={handleDelete(id)}?", a: "The function is called during render, not on click. React receives its return value, usually undefined, as the handler, and the delete happens every time the component renders. If handleDelete sets state, you get an infinite loop. Pass a function: onClick={() => handleDelete(id)}.", c: `
<button onClick={handleDelete(id)}>Delete</button>       // runs during render, bug
<button onClick={() => handleDelete(id)}>Delete</button> // runs on click
<button onClick={handleReset}>Reset</button>             // fine when no argument is needed
` },
    { q: "Why do I get the warning that a component is changing an uncontrolled input to be controlled?", a: "On the first render value was undefined, so React treated the input as uncontrolled. Later the state got a string and React cannot switch the mode. This happens when the state starts as undefined or null, for example when it is filled from an API. Initialise with an empty string, or use value={form.name ?? ''}.", c: `
const [user, setUser] = useState<{ name: string } | null>(null);
<input value={user?.name} />                 // undefined at first -> warning

<input value={user?.name ?? ""} onChange={...} />   // always a string
` },
    { q: "What is the difference between e.target and e.currentTarget?", a: "e.target is the element where the event started, which can be a child of the element with the handler, so TypeScript types it loosely as EventTarget. e.currentTarget is the element that has the handler and is typed exactly, for example HTMLButtonElement. Prefer currentTarget in React handlers; it needs no cast and does not break when the markup inside changes." }
  ],
  tips: [
    "Give every input a name attribute and write one generic handleChange that uses e.currentTarget.name as the key. It replaces one handler per field.",
    "Type the submit handler on the form and let the button be type='submit'. Pressing Enter in a field then works for free, and you never attach onClick to a submit button.",
    "Show validation errors on blur or on submit, not on the first key press. Keep a 'touched' flag per field in state for that.",
    "For a form with more than about ten fields or with async validation, use React Hook Form with a Zod schema. It keeps the inputs uncontrolled, so typing stays fast, and gives you typed values."
  ]
});

EXTRA(21, "Lists, keys and conditional rendering", {
  deep: [
    "During reconciliation React compares the children of a node. Without keys it matches them by position: the first old child against the first new child, and so on. If a child at a position has the same type, React keeps the fiber, keeps its state and only updates props. With keys React matches by key instead of position, so an item that moved is recognised as the same one. Its DOM node and its state (open or closed, text in an input, scroll position) move with it. With index keys, deleting the first item makes every item take the key of its neighbour, and all the state shifts by one row.",
    "The same rule drives state preservation outside lists. A component at the same position with the same type keeps its state between renders, even when it is a different JSX expression in your code. If you render {isAdmin ? <Form role='admin' /> : <Form role='user' />}, both branches produce a Form at the same position, so switching keeps the typed text. Giving the two branches different keys, or placing them in different positions, forces React to unmount one and mount the other. Changing the key on purpose is the official way to reset a component to its initial state.",
    "A key only has to be unique among siblings. The same id can be used in another list. The key is consumed by React and is not passed as a prop; if the child needs the id, pass it again. Avoid Math.random() and avoid keys that change between renders, because every change destroys the DOM subtree and its state and makes the list slow. Fragments in a list need a key too: use <Fragment key={id}> instead of <>."
  ],
  iq: [
    { q: "Why is using the array index as a key a bug?", a: "The key says which item is which. With the index, the key belongs to a position, not to an item. After a deletion or a sort, the item at index 1 is a different item but React thinks it is the same one, so it keeps the old DOM node and state and only patches the text. Any state inside the row, such as an input value or a checkbox, now belongs to the wrong item. Use a stable id from the data.", c: `
// rows have an uncontrolled <input> inside
{todos.map((t, i) => <Row key={i} todo={t} />)}
// delete the first todo: every row keeps its input text, so the text of row 0 now shows next to todo 1

{todos.map((t) => <Row key={t.id} todo={t} />)}
// delete the first todo: React removes the row with that id; the other rows keep their own text
` },
    { q: "How do you reset a component's state from the parent without an effect?", a: "Change its key. A new key makes React unmount the old instance and mount a fresh one with the initial state. This is the recommended way to reset a form when the selected record changes; an effect that calls each setter is slower and easy to get wrong.", c: `
function UserPage({ userId }: { userId: string }) {
  return <ProfileForm key={userId} userId={userId} />;
  // when userId changes, ProfileForm starts again with fresh state
}
` },
    { q: "Two different branches render the same component type. Does the state survive the switch?", a: "Yes, if the component is at the same position in the tree. React only looks at the position and the type, not at which JSX expression created it. Both branches create a Counter at the first child position, so the fiber and its state are kept. Add different keys to each branch to make React treat them as different components.", c: `
{isFancy ? <Counter mode="fancy" /> : <Counter mode="plain" />}
// toggling isFancy keeps the count

{isFancy ? <Counter key="fancy" mode="fancy" /> : <Counter key="plain" mode="plain" />}
// toggling resets the count
` },
    { q: "What happens if you use Math.random() or a new uuid as the key during render?", a: "Every render produces new keys, so React cannot match any item to a previous one. It unmounts all rows and mounts new ones, losing their state, DOM focus and scroll position, and doing much more work than needed. If the data has no id, create one once when the data is loaded or created, not inside render." }
  ],
  tips: [
    "When the API returns no id, build one at load time (for example a counter or crypto.randomUUID()) and store it with the item. Do not derive keys inside the map.",
    "For a composite key, join the fields with a separator that cannot appear in them: key={order.id + ':' + line.sku}.",
    "Use the key trick to reset forms, animations and third-party widgets. It is one line and needs no effect.",
    "Render an explicit empty state ('No results') with a ternary instead of relying on an empty map. Users should never see a blank area and wonder whether the page is still loading."
  ]
});

EXTRA(21, "useEffect and the component life cycle", {
  deep: [
    "An effect belongs to one render. The function you pass is created during that render, so it closes over the props and state of that render. React saves it on the fiber together with the dependency array. After the commit, React compares each dependency with the previous one using Object.is; if any differs, it first runs the cleanup from the previous effect and then the new function. Effects of children run before effects of parents, and all cleanups of an update run before any new effect of that update. useEffect runs after the browser has painted in most cases, so it never blocks the first picture on the screen.",
    "Because the effect closes over one render, a stale closure appears when the effect runs for a long time but its dependencies say 'never run again'. The classic case is setInterval in an effect with an empty array: the callback sees count as 0 forever and setCount(count + 1) keeps setting 1. The fixes are the functional update, which does not need count at all, or listing count as a dependency so the interval is recreated on each change. The dependency array is not a tool to control when the effect runs; it is a description of what the effect reads, and lying to it creates exactly these bugs.",
    "An object or array created during render is a new reference on every render, so an effect that depends on it runs on every render. If the effect then sets state, the state change renders again, the object is new again and you have an infinite loop. Depend on the primitive fields instead, create the object inside the effect, or memoise it. In StrictMode during development React mounts, unmounts and mounts every component once more, so an effect runs twice on mount with a cleanup in between; a correct cleanup makes the two runs invisible. Finally, an effect is the wrong tool for computing values, for responding to a click, and for resetting state when a prop changes."
  ],
  iq: [
    { q: "Why does my effect run twice when the page loads?", a: "Because the app is wrapped in StrictMode and you are in development. React mounts the component, runs the effect, immediately runs the cleanup and the effect again. This only happens in development and only once on mount. It is a test that your cleanup undoes what the effect does; if you see two subscriptions or two requests that are not cancelled, the cleanup is missing. Do not remove StrictMode to hide it.", c: `
useEffect(() => {
  const socket = connect(roomId);        // dev console: connect, disconnect, connect
  return () => socket.close();           // with the cleanup the extra run is harmless
}, [roomId]);
` },
    { q: "This counter is stuck at 1. Why, and what are the fixes?", a: "The interval callback was created in the first render, where count is 0, and the effect never runs again because its array is empty. Every tick calls setCount(0 + 1). Use the functional update so the callback does not read count, or add count to the dependencies so the interval is recreated with a fresh closure.", c: `
const [count, setCount] = useState(0);

useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000);   // count is always 0 here
  return () => clearInterval(id);
}, []);                                                       // shows 1 and stops

useEffect(() => {
  const id = setInterval(() => setCount((c) => c + 1), 1000); // reads the latest value
  return () => clearInterval(id);
}, []);                                                       // 1, 2, 3, ...
` },
    { q: "Why does this effect loop forever?", a: "options is a new object on every render, so the dependency changes every time. The effect sets state, which renders again, which creates another new options object, and so on. Depend on the primitive value, build the object inside the effect, or wrap it in useMemo.", c: `
const options = { page, size: 20 };          // new object each render

useEffect(() => {
  loadUsers(options).then(setUsers);         // setUsers -> render -> new options -> effect -> ...
}, [options]);                               // infinite loop

useEffect(() => {
  loadUsers({ page, size: 20 }).then(setUsers);
}, [page]);                                  // runs only when page changes
` },
    { q: "When would you use useLayoutEffect instead of useEffect?", a: "useLayoutEffect runs synchronously after React has updated the DOM but before the browser paints. Use it when you must measure the DOM (size, position) and then change state so the user never sees the first layout, for example to position a tooltip. useEffect runs after paint, so a state change inside it would cause a visible flicker. Layout effects block painting, so keep them rare and small." }
  ],
  tips: [
    "Install eslint-plugin-react-hooks and treat the exhaustive-deps warning as an error. A missing dependency is almost always a real bug, not a style problem.",
    "Put the function that an effect needs inside the effect, or outside the component. A function defined in the component body is a new reference every render and would have to be a dependency.",
    "To react to the latest value of a prop inside a long-living effect without restarting it, store the value in a ref that you update in the render path (or with the useEffectEvent hook) and read ref.current inside the callback.",
    "Before writing an effect, ask three questions: Can I compute this during render? Should this happen in the event handler instead? Can a key reset solve it? Only if all answers are no, write the effect."
  ]
});

EXTRA(21, "useRef and refs", {
  deep: [
    "useRef is stored like any other hook on the fiber, but its value is just the same object { current } returned on every render. Changing current does not go through React's update queue, so no render is scheduled and no component sees the change until something else renders. For a DOM ref, React fills current during the commit phase, after it has created the DOM node, and sets it back to null when the node is removed. That is why current is null during the first render and inside the function body in general; read it in effects or event handlers.",
    "A ref callback is an alternative to a ref object: ref={(node) => ...} is called with the node when it mounts and with null when it unmounts. In React 19 the callback may return a cleanup function, which is called on unmount instead of a second call with null. Ref callbacks are useful when the element appears conditionally or when you need to run code the moment the node exists, for example to measure it or to connect a third-party library.",
    "Mutable refs break the rule that render output depends only on props and state. Reading ref.current during render gives a value that React cannot track, so the UI can be out of date, and writing it during render breaks under StrictMode's double invocation and concurrent rendering. Keep refs for things React does not render: timer ids, sockets, previous values, the last request. If a value should appear on the screen, it must be state. In React 19, ref is passed to function components as an ordinary prop, so forwardRef is only needed for code that must still run on React 18."
  ],
  iq: [
    { q: "Why does the screen not update when I change ref.current?", a: "Because a ref is outside React's state system. Changing current does not schedule a render, so the component function is not called and the JSX still shows the old number. The ref keeps the new value, and you will see it the next time something else causes a render. Use useState for anything the user should see.", c: `
const count = useRef(0);

<button onClick={() => { count.current++; console.log(count.current); }}>
  {count.current}            {/* stays 0 on screen while the console prints 1, 2, 3 */}
</button>
` },
    { q: "Why is inputRef.current null here?", a: "The ref is filled during the commit, after the component function has returned its JSX. During the render phase no DOM node exists yet, so current is still the initial null. Move the code into useEffect or into an event handler, where the node has been attached.", c: `
const inputRef = useRef<HTMLInputElement>(null);
inputRef.current?.focus();            // during render: current is null, nothing happens

useEffect(() => {
  inputRef.current?.focus();          // after mount: works
}, []);

return <input ref={inputRef} />;
` },
    { q: "How does a parent get a ref to an input that is inside your own component?", a: "A function component does not expose a DOM node by itself; the component must pass the ref through to the tag. In React 19, ref is a normal prop that you declare and forward. In React 18 you wrap the component in forwardRef, which gives the ref as the second argument. With useImperativeHandle you can expose a small custom API instead of the whole node.", c: `
// React 19
function TextInput({ ref, ...rest }: React.ComponentProps<"input">) {
  return <input ref={ref} {...rest} />;
}

// React 18
const TextInput18 = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function TextInput18(props, ref) {
    return <input ref={ref} {...props} />;
  }
);
` },
    { q: "What is the difference between useRef and a variable declared outside the component?", a: "A module-level variable is shared by every instance of the component on the page, so two counters would fight over it. A ref belongs to one instance and is thrown away when it unmounts. A variable inside the function body is the opposite: it is created new on every render and remembers nothing. useRef is the only one of the three that is both per instance and persistent." }
  ],
  tips: [
    "Type DOM refs with the exact element: useRef<HTMLInputElement>(null), useRef<HTMLDivElement>(null). You then get autocomplete for focus, scrollIntoView, getBoundingClientRect and so on.",
    "Keep the latest callback in a ref (latest.current = onEvent, updated in an effect) when a long-living subscription must call the newest version without being re-subscribed on every render.",
    "Store an AbortController in a ref when the user can start the same action again; abort the previous one before starting a new request.",
    "Use a ref callback with a cleanup function (React 19) when integrating a non-React library such as a map or a chart: create the instance when the node arrives and destroy it in the cleanup."
  ]
});

EXTRA(21, "Context and useContext", {
  deep: [
    "A context provider stores its value on its fiber. useContext walks up the fiber tree to find the nearest provider of that context and registers the component as a dependent. When the provider renders with a value that is not Object.is-equal to the previous one, React marks every dependent component below it for re-render, even those wrapped in memo and even those whose parents did not render. There is no partial subscription: a consumer that uses only user.name re-renders when theme changes if both live in the same context value.",
    "The most common mistake is an inline object as the value. value={{ user, setUser }} creates a new object each time the provider component renders, so all consumers re-render whenever the provider's parent renders, even when user has not changed. Memoise the value with useMemo, or keep the state inside a small provider component so its parent rarely renders. A related trick is to split one context into several (UserContext, ThemeContext, DispatchContext) so each consumer depends only on what it needs; the dispatch function from useReducer is stable and can live in its own context that never changes.",
    "Components passed as children to the provider are not re-rendered by the provider's state change unless they read the context, because their elements were created by the component above and are the same references. Context is not a store: it has no selectors and no middleware, and it makes components harder to reuse because they depend on an invisible ancestor. Use it for values that change rarely and are needed widely. For frequently changing data read by many components, a store with selectors (Zustand, Redux) avoids the re-render storm."
  ],
  iq: [
    { q: "Does a context change re-render every component below the provider?", a: "No. It re-renders every component that calls useContext for that context, no matter how deep they are, and memo does not stop that. Components in between that do not read the context are not re-rendered by the context change itself; they may still render because their parent rendered for another reason.", c: `
const Count = memo(function Count() {
  const n = useContext(CountContext);   // re-renders on every provider value change, despite memo
  return <span>{n}</span>;
});

const Static = memo(function Static() {
  return <p>no context here</p>;        // does not re-render when the value changes
});
` },
    { q: "What is wrong with this provider?", a: "The value object is created again on every render of App, so its reference changes even when user did not. Every consumer re-renders whenever App renders for any reason. Wrap the value in useMemo with [user] as dependency, or move the state into a dedicated provider component whose parent does not re-render often.", c: `
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tick, setTick] = useState(0);       // unrelated state
  return (
    <AuthContext value={{ user, setUser }}>  {/* new object each render -> all consumers render on each tick */}
      <Page />
    </AuthContext>
  );
}

const value = useMemo(() => ({ user, setUser }), [user]);   // fix
` },
    { q: "When is the default value of createContext used?", a: "Only when a component calls useContext and there is no matching provider above it in the tree. It is not a fallback for an undefined value passed to a provider. With TypeScript the usual pattern is createContext<T | null>(null) and a custom hook that throws when the value is null, so a forgotten provider fails loudly at the first render instead of producing confusing undefined errors later." },
    { q: "How can you avoid prop drilling without context?", a: "Use composition. Instead of passing user through Layout to Header to Avatar, let the top component create the Avatar element and pass it down as children or as a prop: <Layout header={<Header user={user} />}>. The middle components do not need to know about user at all. This also avoids extra re-renders, because the element is created once at the top." }
  ],
  tips: [
    "Export only the provider and the custom hook from the context module. Keep the context object private, so nobody can use it without the hook and its null check.",
    "Split state and dispatch into two contexts. Components that only send actions subscribe to the stable dispatch context and never re-render when the state changes.",
    "Give each context a displayName (AuthContext.displayName = 'Auth'). React DevTools then shows a readable name instead of Context.Provider.",
    "Put providers in one AppProviders component that nests them, and reuse it in tests with a custom render function so every test gets the same tree."
  ]
});

EXTRA(21, "useReducer", {
  deep: [
    "useReducer and useState share the same internal machinery; useState is a reducer whose action is the new value or an updater function. dispatch(action) puts the action in the hook's queue and schedules a render. During that render React runs the reducer over the queued actions in order, starting from the current state, and the result becomes the new state. The reducer is therefore called during rendering, which is why it must be pure: in StrictMode React calls it twice with the same inputs and compares nothing, so a reducer that mutates or has side effects produces wrong results only in development, which is very confusing.",
    "dispatch is created once and keeps the same identity for the life of the component. This makes it safe to pass to children wrapped in memo and to put in context without useCallback. Like a setter, dispatch does not change the state variable in the running code; reading state after dispatch gives the old value. If the reducer returns the same reference it received, React bails out and skips the re-render, exactly like a setter with an equal value. Returning a mutated old state is therefore the classic reducer bug: the data changed, the reference did not, nothing updates.",
    "TypeScript turns the reducer into a safe state machine. With a discriminated union for the actions, the switch narrows action to one member per case, and the compiler reports a missing field or a typo in the type string. If you add an exhaustive check with never in the default branch, a new action type without a case is a compile error. The downside of reducers is indirection: for a toggle or a text field a reducer is more code than useState for no gain. Choose it when transitions are complex, when several fields change together, or when you want to test the logic without rendering."
  ],
  iq: [
    { q: "When would you choose useReducer over useState?", a: "When one event changes several pieces of state at once, when the next state depends on complex rules, or when many different handlers update the same object. The reducer collects all transitions in one pure function, which is easier to read and to unit test. For a single value or a simple toggle, useState is shorter and clearer." },
    { q: "Why does the UI not update after this action?", a: "The reducer mutates the state object and returns the same reference. React compares the old and the new state with Object.is, sees the same object and skips the render. A reducer must return a new object; use the spread syntax or map and filter. The same mutation also breaks under StrictMode, because the reducer runs twice and pushes the item twice.", c: `
case "added":
  state.items.push(action.item);     // mutation
  return state;                      // same reference -> no re-render (and a double push in StrictMode)

case "added":
  return { ...state, items: [...state.items, action.item] };   // new reference -> re-render
` },
    { q: "How do you make sure every action type is handled?", a: "Add a default branch that assigns the action to a variable of type never. While all cases are covered, the action type is narrowed to never in the default branch and the code compiles. When somebody adds a new member to the union and forgets the case, the assignment fails at compile time.", c: `
switch (action.type) {
  case "added": ...
  case "removed": ...
  default: {
    const unhandled: never = action;     // compile error if a case is missing
    throw new Error("Unknown action " + JSON.stringify(unhandled));
  }
}
` },
    { q: "What does this print, and why?", a: "It prints 0. dispatch queues the action and schedules a render; the state constant of the current render does not change. The new count is visible in the next render. If you need the result immediately, compute it with the reducer yourself: const next = reducer(state, action).", c: `
const [state, dispatch] = useReducer(reducer, { count: 0 });

function handleClick() {
  dispatch({ type: "increment" });
  console.log(state.count);        // 0
}
` }
  ],
  tips: [
    "Name actions after what happened in the past tense (itemAdded, formSubmitted), not after the state change (setItems). It keeps the UI code free of update rules and makes logs readable.",
    "Unit test the reducer with plain assertions: expect(reducer(state, action)).toEqual(expected). No rendering, no mocking, and the tests run in milliseconds.",
    "Pass dispatch down through a dedicated context and keep the state in another. Components that only send actions never re-render on state changes.",
    "When the reducer needs a complex initial state, pass an init function as the third argument of useReducer so the work runs only once."
  ]
});

EXTRA(21, "Performance: memo, useMemo and useCallback", {
  deep: [
    "memo stores the previous props on the fiber and, before rendering, compares each prop of the new object with the old one using Object.is. If all are equal, React reuses the previous output and skips the subtree. This only works when the parent passes the same references. An inline object literal, an array built in render or an arrow function is new on every render, so the comparison fails and memo does nothing except cost the comparison. memo also cannot protect against a context change or against the component's own state change.",
    "useMemo and useCallback store a value plus a dependency array on the fiber. On each render React compares the dependencies with Object.is and returns the stored value when nothing changed. useCallback(fn, deps) is exactly useMemo(() => fn, deps). Neither guarantees the value is kept: React may throw the cache away, so they must only be an optimisation, never a correctness mechanism. Memoisation itself has a cost in memory and comparison time, and it makes code noisier, so it should be applied where the Profiler shows a problem: a slow subtree with stable inputs, an expensive calculation, or a reference that an effect or memo child depends on.",
    "The React Compiler changes this picture. It analyses each component at build time and inserts fine-grained caching for values and JSX, respecting the rules of React. In a project that uses it, most manual memo, useMemo and useCallback calls become unnecessary, and the compiler skips components that break the rules, so correctness of the code becomes the real lever. lazy and Suspense address a different cost: the download. lazy takes a function that returns import() of a module with a default export; the first render suspends, the nearest Suspense shows the fallback, and once the chunk is loaded the component renders. Split at route boundaries and for heavy optional features such as charts or editors, not for every small component."
  ],
  iq: [
    { q: "What triggers a re-render of a component?", a: "Three things: a change of its own state (useState or useReducer), a re-render of its parent, and a change of a context value it reads. Props changing is a consequence of the parent rendering, not a separate trigger. Note that a parent rendering re-renders the child even when the props are identical, unless the child is wrapped in memo." },
    { q: "Explain the difference between React.memo, useMemo and useCallback.", a: "memo wraps a component and skips its render when the props are shallowly equal. useMemo caches the result of a calculation between renders. useCallback caches a function reference; it is useMemo for functions. They work together: useCallback and useMemo keep references stable so that memo on the child can see equal props, and useMemo also prevents effects from re-running because of a new object.", c: `
const handleSelect = useCallback((id: number) => setSelected(id), []);
// is the same as
const handleSelect2 = useMemo(() => (id: number) => setSelected(id), []);
` },
    { q: "Row is wrapped in memo but still renders on every key press. Why?", a: "Because at least one prop is a new reference on every render: the inline onSelect arrow function and the style object literal. memo compares with Object.is, so new references mean different props. Memoise the handler with useCallback, move the style object outside the component or into useMemo, and pass primitives when you can.", c: `
<Row product={p} onSelect={(id) => setSelected(id)} style={{ padding: 8 }} />
// new function and new object every render -> memo never matches

const onSelect = useCallback((id: number) => setSelected(id), []);
const rowStyle = { padding: 8 };          // move to module scope, outside the component
<Row product={p} onSelect={onSelect} style={rowStyle} />
` },
    { q: "Is wrapping every handler in useCallback a good idea?", a: "No. useCallback only pays off when the function is a dependency of a memo child, a useEffect or a useMemo. If the receiving component is not memoised, it re-renders anyway, and you have added an allocation, a dependency comparison and noise. Measure with the Profiler first, or let the React Compiler decide. In a compiled project manual useCallback is mostly unnecessary.", c: `
function Form() {
  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setText(e.currentTarget.value), []);
  return <input onChange={onChange} />;   // <input> is a DOM element, not memo: no benefit at all
}
` }
  ],
  tips: [
    "Record a session in the React DevTools Profiler and enable 'Record why each component rendered'. Fix the top three components by self time before adding any memo.",
    "Move state down: a search box that re-renders a whole page is usually solved by giving the box its own component, not by memoising the page.",
    "Lift expensive children up as props or children: content created by a parent that does not change is skipped automatically, without memo.",
    "Wrap lazy routes in one Suspense near the router and show a skeleton, and add an ErrorBoundary around it so a failed chunk download shows a retry button instead of a white page."
  ]
});

EXTRA(21, "Custom hooks", {
  deep: [
    "A custom hook has no special status at runtime. React does not know it is a hook; it only sees the built-in hook calls inside it, which are added to the component's hook list in the order they happen. The use prefix is a convention that the ESLint plugin uses to know where to apply the rules, and that tells readers the function may hold state and effects. Because the hook list is positional, a hook that calls useState inside an if or after an early return changes the number or order of hooks between renders, and React reports a rendered fewer or more hooks error, or silently returns another hook's state.",
    "Each call to a custom hook is independent. If Header and Sidebar both call useAuth that is built on useState, there are two separate states. A custom hook extracts logic, not data. When two components must see the same value, the state has to live in a common parent, in context or in an external store; the custom hook can then be a thin wrapper that reads from there. A hook that returns an object or array built on each call also returns a new reference each time, which matters when the caller puts it into a dependency array.",
    "Good hooks have a small, explicit input and output. Pass primitives rather than objects, return stable functions (useCallback) when the caller may use them as dependencies, and clean up everything you start. Hooks that fetch data by hand (useFetch) are a learning exercise; in production use TanStack Query, which solves caching, deduplication and race conditions. Do not create a hook for a pure calculation that does not use hooks; a plain function is simpler and can be called anywhere, including inside conditions."
  ],
  iq: [
    { q: "What are the rules of hooks, and why do they exist?", a: "Call hooks only at the top level of a component or custom hook, never inside conditions, loops or after an early return; and call them only from React function components or custom hooks. React identifies each hook by its position in the call order on the fiber. If the order changes between renders, React pairs the calls with the wrong saved state.", c: `
function Profile({ user }: { user: User | null }) {
  if (!user) return <p>Please log in</p>;      // early return before a hook
  const [open, setOpen] = useState(false);     // error: hook order changes when user becomes null
  ...
}

function Profile2({ user }: { user: User | null }) {
  const [open, setOpen] = useState(false);     // hooks first
  if (!user) return <p>Please log in</p>;      // then early returns
  ...
}
` },
    { q: "Two components call the same custom hook. Do they share state?", a: "No. Each call creates its own hooks on the fiber of the component that called it. The logic is shared, the state is not. To share the value, lift the state up and pass it down, use context, or use a store such as Zustand, where the hook reads from a single external object.", c: `
function useCounter() {
  const [n, setN] = useState(0);
  return { n, increment: () => setN((c) => c + 1) };
}

function A() { const { n, increment } = useCounter(); ... }   // its own n
function B() { const { n } = useCounter(); ... }              // a different n, always 0 here
` },
    { q: "When should a reusable function be a custom hook and when a normal function?", a: "If it calls hooks (useState, useEffect, useContext or other custom hooks) it must be a hook, named with the use prefix and called at the top level. If it is a pure calculation or a plain side effect such as formatting a date or calling an API, make it a normal function. Normal functions are more flexible: they can be called conditionally, in loops and outside components." },
    { q: "How does a useDebounce hook work and what goes wrong without the cleanup?", a: "It keeps a debounced copy in state and starts a timer in an effect every time the input value changes. The cleanup clears the previous timer, so only the last timer after the user stops typing fires. Without the cleanup every key press would schedule its own update and the debounced value would step through every intermediate value with a delay.", c: `
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);      // remove this line: every key press fires later
  }, [value, delay]);
  return debounced;
}
` }
  ],
  tips: [
    "Return a tuple 'as const' for state-like hooks ([value, setValue]) and an object for hooks with many fields; callers can then rename tuple items freely.",
    "Add the hook's name to the ESLint rule config (additionalHooks) if it accepts a dependency array, so exhaustive-deps also checks calls of your hook.",
    "Test hooks with renderHook from @testing-library/react and act for updates, or test the component that uses them; never call a hook directly in a test.",
    "Keep a small hooks folder with one file per hook and a short comment on the contract: what it needs, what it returns and what it cleans up."
  ]
});

EXTRA(21, "Data fetching", {
  deep: [
    "A fetch started in an effect belongs to that render. When the dependency changes, React runs the cleanup of the old effect first and then the new effect, so there is a well-defined moment to cancel the old request. AbortController does that: fetch rejects with a DOMException named AbortError, the body stream is closed and the browser can drop the connection. Without cancellation, the old promise still resolves and its then callback still calls setState with stale data; the newest response can be overwritten by an older one. A boolean ignore flag in the closure is the minimal fix; abort is the complete one, because it also saves bandwidth and server work.",
    "In development with StrictMode the effect runs, is cleaned up and runs again, so you see two requests in the network tab with the first one cancelled. This is correct behaviour and shows the cleanup works. Note also that fetch resolves for any HTTP answer, including 404 and 500; only a network failure rejects. Parsing JSON of an error page then throws a confusing SyntaxError, so check response.ok before reading the body, and type the parsed result yourself, since res.json() returns any.",
    "Effects for data create a request waterfall: the parent fetches, renders the child, the child fetches. Every level adds a round trip. Libraries such as TanStack Query keep a cache keyed by the query key, deduplicate identical requests from several components, retry failed ones, refetch when the window regains focus and pass an AbortSignal to the query function, which solves the race condition for free. Frameworks go further and load data in route loaders or on the server, before any component renders. For a client-only app, the practical rule is: use a query library for server data and keep useEffect fetching for small demos or one-off cases."
  ],
  iq: [
    { q: "How do you cancel a fetch when the component unmounts or the input changes?", a: "Create an AbortController in the effect, pass controller.signal to fetch and call controller.abort() in the cleanup. The pending fetch rejects with an AbortError, which you ignore in the catch block. Because the cleanup runs before the next effect, every change of the dependency cancels the previous request.", c: `
useEffect(() => {
  const controller = new AbortController();
  fetch("/api/search?q=" + encodeURIComponent(query), { signal: controller.signal })
    .then((r) => r.json())
    .then(setResults)
    .catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;   // expected
      setError(String(err));
    });
  return () => controller.abort();
}, [query]);
` },
    { q: "What is the race condition in this code, and what is the minimal fix?", a: "The user types 'a' then 'ab'. Both requests are in flight; if the 'a' response arrives last, setResults overwrites the correct 'ab' results with stale data. The minimal fix is an ignore flag set in the cleanup so a stale response is dropped. The better fix is to abort the request.", c: `
useEffect(() => {
  let ignore = false;
  search(query).then((data) => {
    if (!ignore) setResults(data);     // a response from an older render is dropped
  });
  return () => { ignore = true; };
}, [query]);
` },
    { q: "Why can the effect function itself not be async?", a: "An async function always returns a promise, but React expects the effect to return either nothing or a cleanup function. React would receive a promise, could not call it as cleanup and warns. Define an async function inside the effect and call it, or use promise chains, and still return the cleanup synchronously.", c: `
useEffect(async () => { ... }, []);          // wrong: returns a Promise, not a cleanup

useEffect(() => {
  const controller = new AbortController();
  async function load() {
    const res = await fetch("/api/me", { signal: controller.signal });
    if (res.ok) setUser((await res.json()) as User);
  }
  load().catch(() => {});
  return () => controller.abort();            // the cleanup is returned synchronously
}, []);
` },
    { q: "Why does my error state never show for a 404 answer?", a: "fetch only rejects on network errors such as DNS failure or a lost connection. A 404 or 500 is a successful HTTP exchange, so the promise resolves and your code goes on to parse the body as JSON. Check res.ok (status 200 to 299) and throw an error yourself when it is false; TanStack Query also relies on the query function throwing to mark the query as an error." }
  ],
  tips: [
    "Write one typed api module (getUser, listOrders) that checks res.ok, parses JSON and returns typed data. Components and query functions then never call fetch directly.",
    "Use the query key like a dependency array and include every input of the request: ['orders', { page, status }]. A change in the key triggers a new request and a separate cache entry.",
    "Set a sensible staleTime (for example 30 seconds) in the QueryClient defaults; the default of 0 refetches on every mount and window focus, which surprises teams in the network tab.",
    "Validate API responses at the boundary with a schema library such as Zod. A typed fetch only trusts a cast; a schema catches a backend change at runtime with a clear message."
  ]
});

EXTRA(21, "Routing with React Router", {
  deep: [
    "Client-side routing is built on the History API. Link calls history.pushState on click, which changes the URL without a request to the server, and the router listens to popstate for the back and forward buttons. Then the router matches the new location against the route tree, ranking more specific paths above dynamic ones, and renders the matched elements nested inside each other through Outlet. Because the page is never reloaded, component state outside the changed route survives navigation, and anything inside the unmounted route is lost.",
    "A consequence is that the server must return index.html for every path. On a fresh load of /products/42 the browser asks the server for that URL; a static host that serves files answers 404 unless it has a fallback rule. Vite's dev server does this for you; in production you configure the fallback in Nginx, in the hosting platform or by using hash routing. useParams returns strings, and with a type argument the values are still string | undefined, because the type cannot know the route path; parse and validate them. Route elements are not re-mounted when only a parameter changes, so a page that loads data for :id must list id as an effect dependency or use a query key that includes it.",
    "React Router v6.4 added the data APIs: createBrowserRouter, loaders that fetch data before the route renders, actions for form submissions, and errorElement. v7 continues them and offers a framework mode with server rendering, which replaced Remix. The declarative BrowserRouter and Routes style shown here is still supported and is enough for many single-page apps. Protected routes are a client convenience only: they hide pages, they do not protect data. The API must still check the token on every request."
  ],
  iq: [
    { q: "Why use Link instead of a normal a tag?", a: "A normal anchor makes the browser request the page from the server, which reloads the whole app and loses all state. Link prevents the default and calls pushState, so only the URL and the matched components change. Link still renders a real anchor with href, so right-click, open in new tab and accessibility keep working." },
    { q: "The app works in development, but after deployment a refresh on /orders/5 gives 404. Why?", a: "The URL exists only inside the client-side router. On refresh the browser asks the server for /orders/5 and a static file server has no such file. Configure a fallback so unknown paths return index.html (try_files in Nginx, a rewrite rule on the host), or use HashRouter so the path lives after the # and is never sent to the server.", c: `
# nginx
location / {
  try_files $uri /index.html;
}
` },
    { q: "How do you implement a protected route, and what does it not protect?", a: "Make a layout route component that reads the auth state. If the user is not logged in, render Navigate to the login page with replace and remember the current location in state, so you can send the user back after login. Nest the private routes under it. This only hides screens; the server must still verify the token on every API call.", c: `
function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

// after login
const from = (location.state as { from?: Location } | null)?.from?.pathname ?? "/";
navigate(from, { replace: true });
` },
    { q: "Why is id typed as string | undefined, and what happens when the route param changes while the same component stays mounted?", a: "useParams cannot know your route path, so every value is possibly undefined and always a string; convert and validate it yourself. When the user goes from /products/1 to /products/2, the router keeps the same ProductPage instance and only changes the params, so state is not reset and an effect must depend on id. Add key={id} to the element if you want a full reset.", c: `
const { id } = useParams<{ id: string }>();     // string | undefined
const productId = Number(id);
if (!id || Number.isNaN(productId)) return <Navigate to="/404" replace />;

useEffect(() => { load(productId); }, [productId]);   // runs again when the param changes
` }
  ],
  tips: [
    "Keep a routes.ts file with path constants and small builder functions (productPath(id)), so a renamed URL is changed in one place and Link targets are type checked.",
    "Put the URL in charge of UI state that users want to share or refresh: filters, page number and sort order belong in search params (useSearchParams), not in useState.",
    "Lazy-load each top-level route with lazy and one Suspense near the router. The initial bundle then contains only the first screen.",
    "Add a route with path='*' and a real not-found component, and an errorElement or an ErrorBoundary around the router so a thrown error in one page does not blank the whole app."
  ]
});

EXTRA(21, "Global state management", {
  deep: [
    "External stores work differently from context. The store is a plain object outside React that holds the state and a list of listeners. A component subscribes through useSyncExternalStore (React 18), passing a selector; after every store update the hook compares the selected value with the previous one and re-renders the component only when it changed. This is the selective subscription that context lacks. It also means the selector must return a stable value: a selector that builds a new object or array on every call looks changed every time, which in Zustand v5 can cause an infinite update loop until you wrap it in useShallow.",
    "Redux follows the same model with more structure: one store, slices created with createSlice, actions dispatched through the store and reducers that must be pure. Redux Toolkit uses Immer inside createSlice, so you write state.items.push(x) and Immer records the change and produces a new immutable state object; returning a value and mutating in the same reducer is an error. The Redux DevTools show every action and let you jump between states, which is the main reason large teams keep it. The extra ceremony pays off when many developers touch the same state and when actions must be traceable.",
    "The decision ladder is: local state, then lift it up, then context for rarely changing values, then a store for shared and frequently changing client state. Before any of this, separate server state from client state. Server data cached with TanStack Query or RTK Query comes with loading, error, refetching and invalidation, which a hand-written store reimplements badly. What remains as true client state is usually small: auth session, theme, cart draft, UI flags. A store is not a place for form state or for values one component owns; putting everything global makes components impossible to reuse and test."
  ],
  iq: [
    { q: "Lifting state up, context, or a store: how do you choose?", a: "Lift state when two sibling components need the same value and the common parent is close. Use context when a value is needed by many components at different depths and changes rarely, such as the user or the theme. Use a store when shared state changes often and many components read different parts of it, because selectors avoid re-rendering everyone. Server data is a separate case and belongs in a query library." },
    { q: "What is the difference between server state and client state?", a: "Server state lives on the server and the browser only holds a copy that can be stale, shared with other users and must be refetched or invalidated: products, orders, profiles. Client state exists only in the browser and is fully owned by the app: theme, open dialog, selected tab, unsaved form draft. Treating server data as client state leads to hand-written loading flags, no cache and stale screens." },
    { q: "This Zustand component re-renders on every store change, or even loops. Why?", a: "The selector returns a new object on every call, so the equality check fails every time. In Zustand v5 a selector that always returns a new reference causes an infinite loop warning, and selecting the whole store re-renders on any change. Select primitives separately or wrap the object selector in useShallow.", c: `
const { items, coupon } = useCart((s) => ({ items: s.items, coupon: s.coupon }));   // new object each call

const items = useCart((s) => s.items);                                              // fine
const { items2, coupon2 } = useCart(useShallow((s) => ({ items2: s.items, coupon2: s.coupon })));  // fine
` },
    { q: "Redux reducers must be pure, so why does this Redux Toolkit reducer mutate state?", a: "It does not mutate the real state. createSlice wraps each reducer with Immer, which hands you a draft proxy, records the changes and produces a new frozen state object. You may either mutate the draft or return a new value, but not both in the same reducer. Outside createSlice, in a plain reducer, the same code would be a bug.", c: `
reducers: {
  added(state, action: PayloadAction<Item>) {
    state.items.push(action.payload);          // ok: Immer draft
  },
  cleared(state) {
    return { ...state, items: [] };            // ok: return a new state
  },
  broken(state) {
    state.items = [];
    return { ...state };                       // error: both mutated the draft and returned a value
  },
}
` }
  ],
  tips: [
    "Export typed hooks once (useAppDispatch = useDispatch.withTypes<AppDispatch>(), useAppSelector = useSelector.withTypes<RootState>()) and ban the raw hooks with a lint rule.",
    "In Zustand, define actions inside the store next to the state and select them separately; function references are stable, so components that only call actions never re-render.",
    "Persist only what must survive a reload (cart, theme) with the persist middleware or redux-persist, and version the stored shape so an old localStorage entry does not crash the app.",
    "Before adding a store, move every API response into TanStack Query. In most apps the remaining global state fits in one small Zustand store or one Redux slice."
  ]
});

EXTRA(21, "Testing and modern React", {
  deep: [
    "React Testing Library renders the component into a jsdom document and gives you queries that find elements the way users and assistive technology do: by role, label text, placeholder or visible text. getBy throws when nothing matches, queryBy returns null for asserting absence, and findBy returns a promise that waits up to one second for the element to appear, which is how you wait for data. userEvent simulates real interaction sequences (pointer events, focus, key presses) and returns promises; fireEvent dispatches a single raw DOM event. Testing Library wraps renders and events in act, so state updates are flushed before you assert.",
    "Testing implementation details is the main trap: asserting on state values, on the internal call order of hooks or on class names ties the test to the current code and breaks on every refactor. Test what the user sees and does: render with props, interact, assert on the screen and on callback props. Mock the network at the boundary with Mock Service Worker or vi.fn, not the hook that calls it. For hooks with no UI, renderHook from Testing Library exists, but a test through a real component is usually more valuable.",
    "Server Components run only on the server: they can be async, read a database directly and send their output as a serialised tree, not as JavaScript, so they cannot have state, effects or event handlers. Client Components, marked by 'use client' at the top of a file, are shipped to the browser and hydrated: React attaches event handlers to the server-rendered HTML and reuses it instead of rebuilding. Hydration requires the client render to produce the same tree as the server; a difference, such as Date.now() or a browser-only value during render, causes a hydration mismatch error and React falls back to client rendering of that subtree. React 19 Actions give forms a pending state and errors without hand-written flags, and the use API can read a promise or a context inside a condition because it does not store anything on the hook list."
  ],
  iq: [
    { q: "What is the difference between getBy, queryBy and findBy?", a: "getBy returns the element or throws at once, so use it when the element must be there. queryBy returns null instead of throwing, so use it to assert that something is not rendered. findBy returns a promise that retries until the element appears or a timeout passes, so use it after an async action such as a fetch.", c: `
render(<UserCard id={1} />);
expect(screen.queryByRole("alert")).toBeNull();                      // nothing yet, no throw
expect(await screen.findByText("Asha")).toBeTruthy();                // waits for the fetch
expect(screen.getByRole("heading").textContent).toBe("Asha");        // must exist now
` },
    { q: "Which of these can be a Server Component, and why?", a: "The first one can: it is async, reads data directly and renders markup without state or handlers. The second one must be a Client Component because it uses useState and onClick, so its file needs 'use client'. A Server Component may render a Client Component and pass serialisable props; a Client Component cannot import a Server Component, but it can receive one as children.", c: `
// app/orders/page.tsx  - server: no hooks, no handlers, may be async
export default async function OrdersPage() {
  const orders = await db.orders.findMany();
  return <ul>{orders.map((o) => <li key={o.id}><OrderToggle id={o.id} /></li>)}</ul>;
}

// OrderToggle.tsx
"use client";
export function OrderToggle({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  return <button onClick={() => setOpen(!open)}>{open ? "Hide" : "Show"} {id}</button>;
}
` },
    { q: "What causes a hydration mismatch, and how do you fix it?", a: "The HTML produced on the server differs from what the client renders on the first pass, for example a timestamp, a random id, window.innerWidth, or browser-only data read during render. React warns and re-renders that subtree on the client, which costs time and can flash. Render the same thing on both sides first and move the browser-only value into state set in an effect, or use useId for ids.", c: `
function Clock() {
  return <p>{new Date().toLocaleTimeString()}</p>;     // server and client differ -> mismatch
}

function Clock2() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => { setTime(new Date().toLocaleTimeString()); }, []);
  return <p>{time ?? "..."}</p>;                       // identical first render, then updated
}
` },
    { q: "What is a React 19 Action, and what do useActionState and the use API add?", a: "An Action is an async function passed to a form's action prop or started inside a transition; React tracks its pending state, resets the form on success and reports errors. useActionState wraps an action and returns the latest result, the action to pass to the form and an isPending flag. use reads a promise or a context during render and, unlike hooks, may be called inside conditions and loops; a pending promise suspends the component until it resolves." }
  ],
  tips: [
    "Create a test-utils file with a custom render that wraps the component in your providers (router, query client, auth) and import it everywhere instead of the library render.",
    "Prefer getByRole with the name option (getByRole('button', { name: 'Save' })) over test ids. It fails when the accessibility of the component breaks, which is a real bug.",
    "Mock HTTP with Mock Service Worker in tests and in Storybook; the components then run the real fetch code and the same handlers serve both.",
    "In a Next.js app, start every component as a Server Component and add 'use client' only to the leaves that need state or events; keep those leaves small so most code ships no JavaScript."
  ]
});
