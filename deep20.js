EXTRA(20, "What TypeScript is and how it runs", {
  deep: [
    "The compiler works in stages. The scanner and parser turn the text into a syntax tree. The binder walks the tree and creates a symbol for every declaration and a flow graph for every function body. The checker then computes a type for every expression and compares them; this is where all errors come from. Finally the emitter writes JavaScript by printing the same tree without the type nodes, and by rewriting newer syntax into older syntax when the 'target' option asks for it. Checking and emitting are independent: by default tsc still writes the JavaScript files even when there are type errors, unless 'noEmitOnError' is on.",
    "Type erasure means almost everything TypeScript adds disappears, but not all of it. A few features produce real code: enums become objects, namespaces become functions, parameter properties become assignments in the constructor, and decorators become helper calls. Tools such as esbuild, swc, Babel and the Node.js type stripper handle one file at a time and never look at other files, so they cannot know whether an imported name is a type or a value. That is why the options 'isolatedModules' and 'verbatimModuleSyntax' exist: they report code that a single-file tool cannot translate correctly, for example a re-export of a type without the 'type' keyword.",
    "TypeScript is deliberately not sound. The design goals say that the type system should catch most mistakes with little effort, not prove the program correct. So there are known holes: any, assertions, array covariance and index access without bounds checking. The compiler also does not add polyfills. If you set 'target' to ES5 but use Promise or Array.prototype.includes, the syntax is translated but the missing runtime functions are your problem; the 'lib' option only tells the checker which APIs to assume exist. Finally, TypeScript is not a good fit for a ten line script or a quick prototype that changes every hour; the value grows with the size of the code base and the number of people touching it."
  ],
  iq: [
    { q: "Do types exist at runtime? Can you check whether an object is a User with instanceof or typeof?", a: "No. Interfaces and type aliases are erased before the code runs, so there is nothing to compare against. 'typeof' only knows the JavaScript primitives, and 'instanceof' needs a class, which is a real value. For an interface you must write your own check (a type guard) or validate the data with a schema library.", c: `
interface User { id: number; name: string }

function isUser(value: unknown) {
  // return value instanceof User;
  // Error: 'User' only refers to a type, but is being used as a value here.
  return typeof value === "object" && value !== null && "id" in value && "name" in value;
}
console.log(isUser({ id: 1, name: "Asha" }));   // true
` },
    { q: "Your code has type errors. Does 'tsc' still produce JavaScript files?", a: "Yes, by default it does. Type errors make tsc exit with a non-zero code, but it still emits the output, because the authors wanted migration from JavaScript to be possible with errors present. Set 'noEmitOnError' to true if you want the build to stop. In most modern projects the question is moot, because a bundler emits the code and 'tsc --noEmit' only checks." },
    { q: "If the bundler already compiles the TypeScript, why do we run tsc in CI as well?", a: "Bundlers and runners (Vite, esbuild, tsx, Node type stripping) only remove the type syntax. They do not check anything, so a project full of type errors still builds and starts. The only tool that reports errors is the type checker, so CI must run 'tsc --noEmit' (or the editor service equivalent) as a separate step, otherwise the types are decoration.", c: `
// this file 'runs' fine with tsx or esbuild, because they do not check types
const port: number = "3000";
// tsc --noEmit reports:
// error TS2322: Type 'string' is not assignable to type 'number'.
console.log(port);
` },
    { q: "Which TypeScript features generate runtime JavaScript, and why does that matter for Node.js type stripping?", a: "Enums, namespaces with values, parameter properties in constructors and legacy decorators all produce code; everything else is pure erasure. Node.js type stripping only deletes type syntax and refuses files that need real transformation, so such files fail to start. The 'erasableSyntaxOnly' option, added in TypeScript 5.8, makes the compiler report these features so a project stays compatible with strip-only runtimes." }
  ],
  tips: [
    "Start a project with 'npx tsc --init' and then delete the commented lines. A tsconfig with ten clear options is easier to maintain than the 100 line generated file.",
    "Add 'tsc --noEmit' to the CI pipeline and to a pre-push hook. The editor shows errors only for open files; the full check finds the rest.",
    "When migrating a JavaScript project, turn on 'allowJs' and 'checkJs' first and fix one folder at a time. Use '// @ts-check' comments in plain .js files to opt in early.",
    "Keep the TypeScript version pinned in package.json and upgrade it on purpose. Minor releases can add new errors in existing code, and a surprise upgrade on a release day is not fun."
  ]
});

EXTRA(20, "Basic types and type inference", {
  deep: [
    "Inference works in two directions. Bottom-up, the type of an expression is computed from its parts: 'let n = 1 + 2' is number. Top-down, called contextual typing, the expected type flows into an expression: in 'const f: (s: string) => void = (s) => s.trim()' the parameter 's' gets its type from the annotation, which is why callback parameters rarely need annotations. For a value with several candidate types, for example '[1, 'a']', the compiler takes the best common type or a union, here '(string | number)[]', and not a tuple. Tuples are never inferred from array literals unless something asks for them: an annotation, 'as const' or a const type parameter.",
    "Widening is the rule that decides when a literal keeps its exact type. The string literal expression paid has the literal type 'paid'. If it is assigned to a 'const', the literal type is kept, because the variable can never change. If it is assigned to a 'let' or stored in an object property, the type widens to string, because the compiler assumes you will assign other strings later. The same rule makes 'const point = { x: 1 }' have the type '{ x: number }'. This surprises people who build a discriminated union from an object literal: the 'kind' property widens to string and no longer matches the union. The fix is an annotation, 'as const' on the property, or 'satisfies'.",
    "null and undefined are two different types and two different runtime values, and strictNullChecks treats them separately. An array index, 'items[5]', is typed as the element type even when the index is out of range, because the compiler cannot know the length. The option 'noUncheckedIndexedAccess' changes this to 'T | undefined' for arrays and for index signatures, at the cost of more checks in loops. Also keep in mind that numbers are IEEE doubles: the type system does not distinguish integers from decimals, does not know about NaN, and 'number' includes Infinity. Do not expect the type checker to protect you from arithmetic mistakes."
  ],
  iq: [
    { q: "What is the type of x after 'let x = ...' and after 'const x = ...' when the value is the string hello? Why are they different?", a: "The let variable has type string and the const has the literal type 'hello'. A const can never be reassigned, so the compiler can keep the exact value as the type. A let is expected to receive other strings later, so the literal type is widened to string. The same widening happens for properties of a fresh object, even inside a const.", c: `
let a = "hello";            // string
const b = "hello";          // "hello"
const obj = { kind: "circle", r: 1 };   // { kind: string; r: number }

type Shape = { kind: "circle"; r: number } | { kind: "square"; s: number };
const s1: Shape = obj;
// Error: Type '{ kind: string; r: number; }' is not assignable to type 'Shape'.
const fixed = { kind: "circle", r: 1 } as const;
const s2: Shape = fixed;    // OK
console.log(a, b, s1, s2);
` },
    { q: "What is the difference between '{}', 'object' and 'Object' as types?", a: "The empty object type '{}' means any value that is not null or undefined, so numbers and strings are accepted; it says nothing about properties. 'object' means any non-primitive value: objects, arrays and functions, but not 42 or 'a'. 'Object' with a capital letter is the interface of the Object wrapper and behaves almost like '{}'. For a function that takes a real object, use 'object' or better a specific shape or 'Record<string, unknown>'.", c: `
const a: {} = 42;            // OK: 42 is not null or undefined
const b: object = 42;
// Error: Type 'number' is not assignable to type 'object'.
const c: object = [1, 2];    // OK: arrays are objects
console.log(a, b, c);
` },
    { q: "Is 'const names: string[] = []; names[0].toUpperCase()' a compile error? What really happens?", a: "It compiles without error under plain strict mode, because an index access returns the element type string. At runtime names[0] is undefined and the call throws. The compiler trusts array indexes for convenience. Turn on 'noUncheckedIndexedAccess' to make the index type 'string | undefined', or use 'names.at(0)', which is already typed as 'string | undefined'.", c: `
const names: string[] = [];
names[0].toUpperCase();      // no error with strict only; TypeError at runtime
// with noUncheckedIndexedAccess:
// Error: Object is possibly 'undefined'.
const first = names.at(0);   // string | undefined, so you must check
console.log(first?.toUpperCase());
` },
    { q: "Why does the handbook say to use 'number' and not 'Number'?", a: "Lowercase number is the primitive type. Capital Number is the interface of the boxed wrapper object created by 'new Number(5)'. A primitive is assignable to the wrapper type but not the other way around, so a function that takes Number accepts both and then cannot be passed where a number is required. The wrappers are almost never intended and most lint configurations forbid them." }
  ],
  tips: [
    "Turn on 'noUncheckedIndexedAccess' from day one in a new project. Adding it later to an old code base produces hundreds of errors at once.",
    "Prefer 'unknown' for an empty-array variable only if you really do not know the type yet. Usually you do: write 'const rows: Row[] = []' and the compiler checks every push.",
    "Use named tuple members, '[lat: number, lng: number]', so hover information and errors show names instead of positions.",
    "When a value can be absent, use 'undefined' consistently and keep 'null' for data that comes from JSON or a database. Mixing both doubles the number of checks."
  ]
});

EXTRA(20, "Typing functions", {
  deep: [
    "Function compatibility follows a few rules that explain most surprises. A function with fewer parameters is assignable to a function type with more, because ignoring extra arguments is safe; this is why 'array.map(x => x * 2)' works even though map passes three arguments. Parameter types are compared contravariantly under 'strictFunctionTypes': a callback that accepts 'Animal' can be used where a callback of 'Dog' is expected, but not the other way around. Method-style declarations ('method(x: T): void' inside an interface) are deliberately checked bivariantly, which is less safe but keeps 'Array<Dog>' assignable to 'Array<Animal>'.",
    "The void return type has a special relaxation. A function whose declared return type is void may return anything when it is checked against a function type with void return: 'const f: () => void = () => 42' is accepted, and the result is simply typed as void. This exists so that callbacks such as 'forEach(x => list.push(x))' compile, even though push returns a number. In a function declaration with an explicit ': void' annotation the rule does not apply and returning a value is an error. Overloads are resolved from top to bottom; the first matching signature wins, and the implementation signature is never visible to callers. A call whose argument is a union of two overload parameter types fails even though each member alone would work.",
    "The 'this' parameter is a fake first parameter that only sets the type of 'this' inside the function; it is removed from the compiled code. Default parameter values participate in inference ('limit = 10' makes limit a number) and an optional parameter is simply 'T | undefined' from the inside, but from the outside the two are different: the caller may omit an optional one but must pass something, even 'undefined', for a required 'T | undefined'. Avoid overloads when a union parameter or a generic does the job; overloads are duplicated declarations that must be kept in sync by hand, and the implementation body is checked loosely against them."
  ],
  iq: [
    { q: "Is 'const f: () => void = () => 42' an error? And 'function g(): void { return 42 }'?", a: "The first is accepted. When a function is assigned to a function type whose return is void, the real return value is ignored, so that callbacks like forEach can use expressions that return something. The second is an error, because an explicit void annotation on a declaration really means the function must not return a value.", c: `
const f: () => void = () => 42;          // OK, the result is ignored
const r = f();                           // r: void

function g(): void {
  return 42;
  // Error: Type 'number' is not assignable to type 'void'.
}

const list: number[] = [];
[1, 2].forEach((x) => list.push(x));     // OK thanks to the same rule
console.log(r, g(), list);
` },
    { q: "What is the difference between 'f(x?: number)' and 'f(x: number | undefined)'?", a: "Inside the function both see 'number | undefined'. From the outside they differ: an optional parameter may be left out, 'f()', while the union parameter is required, so 'f()' is an error and the caller must write 'f(undefined)'. The same distinction exists for object properties, and the option 'exactOptionalPropertyTypes' makes it even stricter.", c: `
function a(x?: number) { return x ?? 0; }
function b(x: number | undefined) { return x ?? 0; }

a();                 // OK
b();
// Error: Expected 1 arguments, but got 0.
b(undefined);        // OK
` },
    { q: "Why does this overloaded function reject a value whose type is a union of the two accepted types?", a: "Overload resolution tries each signature with the whole argument. The argument 'string | number' is not assignable to the string overload and not to the number overload, so no overload matches, even though the implementation could handle it. Either add a third overload that accepts the union or replace the overloads with a single signature that takes the union.", c: `
function parse(x: string): number;
function parse(x: number): string;
function parse(x: string | number): string | number {
  return typeof x === "string" ? Number(x) : String(x);
}

const input: string | number = Math.random() > 0.5 ? "1" : 1;
parse(input);
// Error: No overload matches this call.
` },
    { q: "Why can you pass a callback with fewer parameters than the function type declares, but not with more?", a: "Ignoring arguments is always safe at runtime, so a function of one parameter can be used where a function of three is expected; the extra arguments are simply not read. The opposite is unsafe: the extra parameter would receive undefined. This is why 'forEach(x => ...)' is fine although forEach passes value, index and array, and why '(a, b) => ...' is rejected where '(a) => void' is expected." }
  ],
  tips: [
    "Write explicit return types on exported functions and on functions that return object literals. It gives better error locations and stops accidental changes of the public API.",
    "Prefer an options object for functions with more than two or three parameters: 'send({ to, subject, retries })' is readable and makes every parameter optional or named for free.",
    "Use 'Parameters<typeof fn>' and 'ReturnType<typeof fn>' to type wrappers and mocks instead of copying signatures by hand.",
    "Avoid overloads when a generic or a union works. If you do write overloads, put the most specific signature first, because the first match wins."
  ]
});

EXTRA(20, "Objects: interfaces and type aliases", {
  deep: [
    "Internally an interface and an object type alias become almost the same thing, but they differ in three practical ways. An interface can be declared several times in the same scope and the declarations merge; this is how libraries let you add fields to 'Window' or to the Express 'Request'. A type alias is a name for any type, so it can name unions, tuples, primitives and mapped or conditional types, which an interface cannot. And when two parents have the same property with different types, 'interface X extends A, B' reports an error, while 'type X = A & B' silently gives that property the type 'never', which you only notice when you try to create a value.",
    "Assignability of object types is structural: the source must have every property of the target with a compatible type, and may have more. Excess property checking is a separate rule that runs only for a 'fresh' object literal written directly in a position with an expected type. As soon as the literal is stored in a variable, its freshness is gone and extra properties are allowed. Optional properties are also tricky: a type with 'email?: string' is satisfied by an object that has no email, by one with a string, and by default also by one where email is explicitly undefined; 'exactOptionalPropertyTypes' forbids the last case. With 'strictNullChecks', '{ email?: string }' and '{ email: string | undefined }' are therefore not the same type.",
    "readonly is shallow and only exists at compile time. A 'readonly' property can be assigned to a mutable property of the same shape without error, so a function that receives a '{ x: number }' can mutate an object you declared with 'readonly x'. A 'readonly number[]' passed where 'number[]' is expected is rejected, because the mutating array methods are missing, but a plain object with readonly properties is accepted. Index signatures tell the compiler that every string key exists, which hides missing keys; prefer 'Map' or 'Record<Key, V>' with a literal key union when the keys are known. Do not reach for interfaces to model a value that is one of several variants; a union of types is the right tool there."
  ],
  iq: [
    { q: "Interface or type alias: what are the real differences, not the style preferences?", a: "An interface can be merged by declaring it again, can be extended with 'extends' and can be implemented by a class; it can only describe object shapes and functions. A type alias can name anything, including unions, tuples, primitives and computed types. 'extends' reports conflicting property types as an error, while an intersection collapses the conflict to never. Error messages and performance are slightly better for interfaces when types are extended many times.", c: `
interface Window2 { title: string }
interface Window2 { width: number }           // merges with the first one
const w: Window2 = { title: "app", width: 800 };

type A = { id: string };
type B = { id: number };
type AB = A & B;                              // id: never, no error here
// const ab: AB = { id: 1 };
// Error: Type 'number' is not assignable to type 'never'.

// interface C extends A, B {}
// Error: Interface 'C' cannot simultaneously extend types 'A' and 'B'.
console.log(w);
` },
    { q: "Why does the compiler accept the variable but reject the literal in this code, when they have the same content?", a: "This is excess property checking. It applies only to a fresh object literal written directly where a type is expected, because an unknown key in a literal is almost always a typo. A value stored in a variable first is checked by normal structural assignability, where extra properties are allowed. The check is a convenience, not a guarantee that an object has no extra keys.", c: `
interface Options { timeout: number }

const saved = { timeout: 100, retries: 3 };
const a: Options = saved;                     // OK: structural, extras are fine
const b: Options = { timeout: 100, retries: 3 };
// Error: Object literal may only specify known properties,
//        and 'retries' does not exist in type 'Options'.
console.log(a, b);
` },
    { q: "Is '{ name?: string }' the same type as '{ name: string | undefined }'?", a: "No. With the optional property the key may be missing from the object. With the union the key must be present, even if its value is undefined. A literal '{}' is assignable to the first and rejected for the second. Inside a function both read as 'string | undefined'. With 'exactOptionalPropertyTypes' the optional version also stops accepting an explicit undefined value.", c: `
type Opt = { name?: string };
type Req = { name: string | undefined };

const a: Opt = {};                            // OK
const b: Req = {};
// Error: Property 'name' is missing in type '{}' but required in type 'Req'.
const c: Req = { name: undefined };           // OK
console.log(a, b, c);
` },
    { q: "Does a readonly property protect the object from being changed?", a: "Only through that type, and only at compile time. The emitted JavaScript has no freeze. A value with readonly properties can be assigned to a mutable type with the same shape, and code using that type can change it. For runtime protection you need Object.freeze, which is also shallow. Treat readonly as documentation that the compiler enforces for your own code paths.", c: `
type Frozen = { readonly total: number };
const bill: Frozen = { total: 10 };
// bill.total = 20;
// Error: Cannot assign to 'total' because it is a read-only property.

const mutable: { total: number } = bill;      // accepted
mutable.total = 20;                           // changes bill.total too
console.log(bill.total);                      // 20
` }
  ],
  tips: [
    "Pick one convention: interfaces for object shapes that may be extended or implemented, type aliases for unions, tuples and computed types. A lint rule (consistent-type-definitions) enforces it.",
    "Put shared domain types in a 'types' or 'models' folder and export them from one index file. Avoid declaring the same shape in two places with slightly different names.",
    "When a config object is built step by step, declare it with the target type at the start, 'const cfg: Config = {...}', so excess property checks catch typos; an untyped object checked later loses that protection.",
    "Use 'Readonly<T>' or 'readonly T[]' on function parameters you do not intend to change. It documents intent and stops accidental mutation of the caller's data."
  ]
});

EXTRA(20, "Union types, literal types and narrowing", {
  deep: [
    "Narrowing is implemented by control-flow analysis. The binder builds a flow graph for each function: every if, switch, loop, return, throw and assignment is a node. When the checker needs the type of a variable at a given point, it walks backwards through this graph and applies each condition it finds, so the 'declared type' of a variable can be narrowed to a smaller 'flow type' at that location. Assignments reset the narrowed type to the type of the assigned value. The analysis works on references the compiler can track: variables, parameters and property chains such as 'state.kind', but not on the result of a function call, which could change between calls.",
    "Narrowing can be lost in ways that surprise people. Narrowing a property through a function call does not work: 'isString(x.a)' tells the compiler nothing unless the function is a type predicate. Narrowing inside a callback used to be discarded for 'let' variables because the callback might run after a later assignment; since TypeScript 5.4 narrowing is kept in closures created after the last assignment to the variable, but a 'let' that is assigned again later still loses it. Destructuring a discriminated union into separate variables kept the link between them only from TypeScript 4.6. And a typeof check for 'object' includes null, so a null check must come first.",
    "A discriminated union needs a discriminant whose type is a literal (string, number, boolean literal, or undefined). If the property is typed as plain string, the switch cannot narrow. The exhaustive check with never works because after every case is handled, the remaining type of the variable is never, and only never is assignable to never; when a new member is added, the remaining type is that member and the assignment fails. Unions also interact with distributive conditional types and with 'keyof': 'keyof (A | B)' is only the common keys. Do not over-model with unions: a union of fifty literal types compiles slowly in large mapped types, and a boolean flag is fine when there really are only two states with the same data."
  ],
  iq: [
    { q: "Why does the narrowed type disappear inside the callback here, and how do you fix it?", a: "The variable is a 'let' that is assigned again after the callback is created. The callback may run after that assignment, so the compiler cannot trust the earlier null check and reports the error. Copy the value into a const before the callback, or do not reassign the variable. If a variable is never reassigned after the closure is created, TypeScript 5.4 and later keep the narrowing.", c: `
let value: string | null = Math.random() > 0.5 ? "x" : null;

if (value !== null) {
  setTimeout(() => value.toUpperCase(), 10);
  // Error: 'value' is possibly 'null'.
  const safe = value;                              // narrowed copy
  setTimeout(() => safe.toUpperCase(), 10);        // OK
}
value = null;                                      // this assignment breaks the narrowing
` },
    { q: "How do you make sure that a switch over a discriminated union handles every case, now and after someone adds a case next year?", a: "Add a default branch that assigns the value to a variable or parameter of type never. Inside the default the compiler has removed every handled member, so the remaining type is never and the assignment is fine. When a new member is added, the remaining type is that member, it is not assignable to never, and the compiler points to the switch. Returning from the helper also gives the function a correct return type.", c: `
type Shape = { kind: "circle"; r: number } | { kind: "square"; s: number } | { kind: "line"; len: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle": return Math.PI * shape.r ** 2;
    case "square": return shape.s ** 2;
    default: {
      const missing: never = shape;
      // Error: Type '{ kind: "line"; len: number; }' is not assignable to type 'never'.
      throw new Error("unhandled " + JSON.stringify(missing));
    }
  }
}
console.log(area({ kind: "circle", r: 1 }));
` },
    { q: "Does 'arr.filter(x => x !== null)' remove null from the element type?", a: "Since TypeScript 5.5, yes: the compiler infers a type predicate for a simple arrow function whose body is a narrowing check, so the result is 'string[]'. Before 5.5 the result stayed '(string | null)[]' and you had to write the predicate 'x is string' yourself. 'filter(Boolean)' still does not narrow, because Boolean is typed as returning boolean, not a predicate.", c: `
const mixed: (string | null)[] = ["a", null, "b"];
const strings = mixed.filter((x) => x !== null);      // string[] in TS 5.5+
const viaBoolean = mixed.filter(Boolean);             // still (string | null)[]
const explicit = mixed.filter((x): x is string => x !== null);   // string[] in any version
console.log(strings, viaBoolean, explicit);
` },
    { q: "Why does the discriminant of a union have to be a literal type? What goes wrong with 'kind: string'?", a: "Narrowing by a discriminant works by comparing the literal type of the property in each union member with the literal you test against. If the property is just string in every member, every member matches every value, nothing can be excluded and the members are indistinguishable to the compiler. Writing the object with a widened property, for example a const object without 'as const', produces exactly this problem when you try to pass it as a union member." }
  ],
  tips: [
    "Model UI and request state as a discriminated union ('idle | loading | success | error') with the data only in the member that really has it. Impossible combinations then cannot be written.",
    "Write a tiny 'assertNever(x: never): never' helper once and use it in every switch over a union. It turns a forgotten case into a compile error instead of a silent bug.",
    "Narrow early and store the result in a const. Deeply nested checks on 'obj.a.b' are fragile; a local 'const b = obj.a.b' is cheap and keeps the narrowing stable.",
    "Prefer 'kind' or 'type' as the discriminant name across the whole code base, and keep the literal values lowercase strings that match what the API sends."
  ]
});

EXTRA(20, "any, unknown, never and type assertions", {
  deep: [
    "In the type lattice, unknown is the top type: every type is assignable to it, and it is assignable to nothing except itself and any. never is the bottom type: nothing is assignable to it, and it is assignable to everything, which is why a function returning never can be used in any position and why a union 'string | never' is simply string. any breaks the lattice: it behaves as both top and bottom, so it is assignable to everything and everything is assignable to it, and every property access on it yields any again. That is why one any at the start of a chain quietly turns a whole module into unchecked JavaScript. 'noImplicitAny' only catches the places where the compiler would have inferred any by itself, for example an unannotated parameter; it does not stop you from writing any.",
    "never shows up in more places than unreachable code. The intersection of two incompatible types, 'string & number', is never. A discriminated union with every case handled narrows to never. A mapped type over never produces an empty object type. And narrowing a value to something impossible, for example a string check after x was already narrowed to number, gives never, which usually signals a logic error rather than a compiler bug. A function returning never also affects control flow after a call: code after 'fail()' is treated as unreachable, but only when the function is declared with an explicit ': never' return type annotation and is called through a name the compiler can see, not through an arbitrary expression.",
    "The 'as' operator is allowed when either type is assignable to the other, in the compiler's words when they 'sufficiently overlap'. 'unknown' overlaps with everything, which is why the double assertion 'x as unknown as T' bypasses the check completely; treat it as a code smell. 'satisfies' is different in nature: it is a check in the direction value to type, with contextual typing and excess property checks, but the expression keeps its own inferred type. The non-null operator is only an assertion to 'NonNullable', nothing more. Avoid assertions on data from outside the program (network, storage, user input), because an assertion that is wrong does not fail where it is written but somewhere far away, while a runtime check fails immediately with a clear message."
  ],
  iq: [
    { q: "any vs unknown vs never: explain each and say when you would use it.", a: "any disables checking: anything can be read, called or assigned. Use it almost never, perhaps when migrating old code. unknown accepts any value but allows nothing until you narrow it; use it for data from outside and for generic positions such as catch variables. never is the empty type: use it for functions that never return and for exhaustive checks, and recognise it in error messages as a sign that two types were combined into something impossible.", c: `
declare const a: any;
declare const u: unknown;

a.foo.bar();                 // compiles
// u.foo;                    // Error: 'u' is of type 'unknown'.
const s1: string = a;        // compiles
// const s2: string = u;     // Error: Type 'unknown' is not assignable to type 'string'.

function stop(): never { throw new Error("stop"); }
const s3: string = stop();   // OK: never is assignable to everything
console.log(s1, s3);
` },
    { q: "What does 'as' do at runtime, and when does the compiler refuse an assertion?", a: "Nothing at runtime: it is erased. It only changes the type the compiler assigns to the expression. The compiler refuses an assertion when neither type is assignable to the other, for example string to number, with the message that the conversion may be a mistake. People then write 'as unknown as T', which always compiles and is a signal that a runtime check or a different design is needed.", c: `
let raw: string = "42";
// const n1 = raw as number;
// Error: Conversion of type 'string' to type 'number' may be a mistake
//        because neither type sufficiently overlaps with the other.
const n2 = raw as unknown as number;   // compiles
console.log(n2.toFixed(1));            // TypeError at runtime: n2.toFixed is not a function
` },
    { q: "What problem does 'satisfies' solve that a type annotation and 'as' do not?", a: "An annotation 'const cfg: Record<string, Color> = ...' checks the value but then you only know the wide type: 'cfg.primary' is 'Color', and 'cfg.typo' is allowed. An assertion with 'as' does not check the value properly. 'satisfies' checks the value against the type, including excess properties, but the variable keeps the precise inferred type, so 'cfg.primary' is still known to be a string and unknown keys are errors.", c: `
type Color = string | [number, number, number];

const annotated: Record<string, Color> = { primary: "#fff", danger: [255, 0, 0] };
// annotated.primary.toUpperCase();
// Error: Property 'toUpperCase' does not exist on type 'Color'.

const checked = { primary: "#fff", danger: [255, 0, 0] } satisfies Record<string, Color>;
checked.primary.toUpperCase();          // OK: string
checked.danger[0].toFixed(0);           // OK: tuple
// checked.warning;                     // Error: Property 'warning' does not exist
console.log(annotated, checked);
` },
    { q: "Where does any enter a strict project without anyone writing it?", a: "From JSON.parse and response.json(), which return any; from catch variables in old configs (strict now makes them unknown); from untyped JavaScript dependencies without declaration files; from 'as any' in test code; and from implicit any in .js files when checkJs is off. The lint rules 'no-explicit-any' and 'no-unsafe-*' from typescript-eslint find most of these places." }
  ],
  tips: [
    "Enable the typescript-eslint rules 'no-explicit-any' and the 'no-unsafe-assignment' family. They turn hidden any values into visible warnings.",
    "Wrap 'JSON.parse' once in a helper that returns unknown, 'parseJson(text): unknown', and validate the result. Then no caller can pretend the data has a type.",
    "Replace 'x!' with a small 'assertDefined(x, message)' function. It throws a clear error at the right place and narrows the type for the compiler.",
    "Use 'satisfies' for configuration objects, route tables and lookup maps: you get the key checking of a type and the precise autocomplete of the literal."
  ]
});

EXTRA(20, "Generics", {
  deep: [
    "Type argument inference collects candidates. For each type parameter the compiler looks at every argument whose parameter type mentions it, infers a candidate from each, and then picks a single type: usually the union is not built, the first candidate wins and the others must be assignable to it, which is why 'pair(1, 'a')' with one T is an error instead of 'string | number'. If no candidate is found, T becomes its constraint, or unknown when there is none. Inference also flows from the expected return type (return type inference) and through callbacks in a left-to-right order, so putting the array before the callback in 'map(items, fn)' lets the callback parameter get its type.",
    "Generics are fully erased: there is one JavaScript function for all type arguments, and the function body cannot ask what T is. Inside the body T is opaque: the compiler only knows the constraint, so you cannot return a concrete value of the constraint type where T is required, because the caller may have picked a narrower subtype. Variance describes how generic types relate when their arguments relate. TypeScript infers variance from the structure of the type, and since 4.7 you may annotate it with 'in' and 'out' on type parameters to make checks faster and clearer. Arrays are treated as covariant even though they are mutable, a deliberate unsoundness: 'Dog[]' is assignable to 'Animal[]', and pushing a cat through the Animal view corrupts the Dog array without any compile error.",
    "Function parameters are contravariant under strictFunctionTypes, but method shorthand in interfaces and classes stays bivariant, which is exactly what keeps arrays covariant. Const type parameters ('<const T>', TypeScript 5.0) make the compiler infer literal and readonly tuple types for arguments without 'as const' at the call site. Do not use a generic when it does not connect two types: '<T>(x: T): void' is just 'unknown' with extra noise, and a type parameter that appears only in the return position, as in 'fetchJson<T>(url): Promise<T>', is a hidden assertion that the caller fills in blindly. Deeply generic code also costs compile time and produces long error messages; prefer a few concrete types for application code and keep heavy generics inside libraries and shared utilities."
  ],
  iq: [
    { q: "Why is 'Dog[]' assignable to 'Animal[]' and why is that unsafe? Show the problem.", a: "TypeScript treats arrays as covariant: if Dog is a subtype of Animal, Dog[] is a subtype of Animal[]. Reading is safe, but arrays are mutable, and through the Animal[] alias you can push a Cat into what is really a Dog array. The compiler allows it because array methods are declared as method shorthand, which is checked bivariantly. Use 'readonly Animal[]' for parameters that only read; that removes the mutation path.", c: `
interface Animal { name: string }
interface Dog extends Animal { bark(): void }

const dogs: Dog[] = [{ name: "Rex", bark() {} }];
const animals: Animal[] = dogs;             // accepted: arrays are covariant
animals.push({ name: "Tom" });              // no error: a cat is an Animal
dogs[1].bark();                             // TypeError at runtime: dogs[1].bark is not a function
` },
    { q: "This generic function does not compile. Why, when a string clearly satisfies the constraint?", a: "Inside the function T is unknown except for its constraint. The caller may choose T to be a narrower type, for example the literal type 'b'. A plain string is not assignable to every possible T, so returning it is rejected. Either return the constraint type instead of T, or take a value of type T as a parameter.", c: `
function defaultName<T extends string>(): T {
  return "anonymous";
  // Error: Type 'string' is not assignable to type 'T'.
  //   'string' is assignable to the constraint of type 'T',
  //   but 'T' could be instantiated with a different subtype of constraint 'string'.
}
const n = defaultName<"admin">();           // the caller could ask for this
console.log(n);
` },
    { q: "Why can you not write 'new T()' or 'typeof T' inside a generic function, and what do you do instead?", a: "Type parameters are erased; at runtime there is no value called T. To create instances, take the constructor as a parameter with a construct signature such as 'ctor: new () => T'. To know what T is at runtime, pass a value, a tag string or a schema that describes it.", c: `
class Order { total = 0 }

// function make<T>(): T { return new T(); }
// Error: 'T' only refers to a type, but is being used as a value here.

function make<T>(ctor: new () => T): T {
  return new ctor();
}
const o = make(Order);                      // o: Order
console.log(o.total);
` },
    { q: "'pair(1, 'a')' with 'function pair<T>(a: T, b: T)' fails. Why does the compiler not infer 'string | number'?", a: "Inference picks one candidate from the arguments and checks the others against it rather than widening to a union, because widening would hide most type mistakes in callbacks and comparisons. The first candidate is number and 'a' is not assignable to it. If you really want the union, write it explicitly with 'pair<string | number>(1, 'a')' or use two type parameters.", c: `
function pair<T>(a: T, b: T): [T, T] { return [a, b]; }

pair(1, 2);                                 // T = number
pair(1, "a");
// Error: Argument of type 'string' is not assignable to parameter of type 'number'.
pair<string | number>(1, "a");              // OK
` }
  ],
  tips: [
    "Give type parameters descriptive names when there are more than one: 'TItem, TKey' is easier to read than 'T, U' in a long signature.",
    "Put the parameter that drives inference first. In 'groupBy(items, item => item.id)' the callback gets its parameter type from items only because items comes first.",
    "Use 'readonly T[]' for array parameters your function does not modify. It accepts both mutable and readonly arrays and blocks accidental pushes.",
    "If a generic helper needs more than two type parameters or a nested conditional, stop and consider a few concrete overloads or separate functions. The next developer must be able to read it."
  ]
});

EXTRA(20, "Utility types", {
  deep: [
    "The utility types are not compiler magic; they are ordinary type aliases in lib.es5.d.ts written with mapped and conditional types, and you can read them with a go-to-definition in the editor. 'Partial<T>' is '{ [P in keyof T]?: T[P] }', 'Pick<T, K extends keyof T>' is '{ [P in K]: T[P] }' and 'Omit<T, K extends keyof any>' is 'Pick<T, Exclude<keyof T, K>>'. Because Pick and Partial map over 'keyof T' of a type parameter directly, they are homomorphic: they keep the optional and readonly modifiers of each property. Record is a mapped type over a key union and 'Record<string, V>' is simply an index signature.",
    "The details explain the common surprises. Omit accepts any key, even one that does not exist in T, because its constraint is 'keyof any' and not 'keyof T'; a typo in Omit is silent. Applied to a union, Omit and keyof see only the common keys, so 'Omit<A | B, 'id'>' collapses the union into one object type; a distributive version has to be written by hand with a conditional type. ReturnType and Parameters are conditional types with 'infer'; on an overloaded function they only see the last overload. Partial is shallow, and 'Required' removes both the question mark and the undefined that it implied.",
    "Awaited (4.5) is recursive, so 'Awaited<Promise<Promise<number>>>' is number, and it also handles thenables. Exclude and Extract are distributive conditional types and therefore only make sense on unions; 'Exclude<'a' | 'b', 'a'>' is 'b', but Exclude on an object type does nothing useful. Record<string, T> is a frequent lie: the type says every key has a value, so 'map.missing.toFixed()' compiles and crashes; use 'Partial<Record<K, T>>', 'noUncheckedIndexedAccess' or a Map. Do not build towering types out of utilities for a one-off shape: 'Partial<Pick<Omit<User, ...>>>' is slower to read than a plain three-line type."
  ],
  iq: [
    { q: "Write Pick and Partial yourself, and explain why Omit is defined through Pick and Exclude.", a: "Pick is a mapped type over the chosen keys, Partial maps over all keys and adds the question mark. Omit cannot remove keys directly in a mapped type, so it computes the keys to keep with Exclude on the union of keys and then picks them. Because Omit uses 'keyof any' as the constraint, it accepts keys that do not exist, which is a known weakness.", c: `
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
type MyPartial<T> = { [P in keyof T]?: T[P] };
type MyOmit<T, K extends keyof any> = MyPick<T, Exclude<keyof T, K>>;

interface User { id: number; name: string; readonly email: string }
type A = MyPick<User, "id" | "email">;   // { id: number; readonly email: string }
type B = MyPartial<User>;                // all optional, email stays readonly
type C = MyOmit<User, "id">;             // { name: string; readonly email: string }
type D = Omit<User, "typo">;             // no error: same as User
const d: D = { id: 1, name: "a", email: "e" };
console.log(d);
` },
    { q: "Partial<T> is shallow. Write DeepPartial<T> and name one case where it goes wrong.", a: "A recursive mapped type: for each property, if the value is an object, apply DeepPartial to it, otherwise keep it. The naive version also recurses into arrays, Dates, Maps and functions, turning a Date into an object with optional methods. Production versions check for arrays and built-ins first. Recursive types also hit the compiler depth limit on very deep or circular structures.", c: `
type DeepPartial<T> = T extends (...args: any[]) => any
  ? T
  : T extends object
    ? { [P in keyof T]?: DeepPartial<T[P]> }
    : T;

interface Settings {
  theme: { color: string; dark: boolean };
  tags: string[];
}
const patch: DeepPartial<Settings> = { theme: { dark: true } };   // OK
// note: tags becomes (string | undefined)[] with optional index, a known weakness
console.log(patch);
` },
    { q: "What happens when you apply Omit to a union type?", a: "keyof of a union is only the keys that all members share, so Omit sees the common keys and builds one object type with them. The discriminant and the member-specific properties disappear and the union is lost. To omit a key from each member separately, write a distributive helper: 'type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never'.", c: `
type Shape =
  | { kind: "circle"; id: number; r: number }
  | { kind: "square"; id: number; s: number };

type Lost = Omit<Shape, "id">;          // { kind: "circle" | "square" }  (r and s are gone)
type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;
type Kept = DistributiveOmit<Shape, "id">;
// { kind: "circle"; r: number } | { kind: "square"; s: number }
const k: Kept = { kind: "circle", r: 1 };
console.log(k);
` },
    { q: "Why can 'Record<string, number>' cause a runtime crash in code that passes the type checker?", a: "An index signature promises that every string key has a number value. The compiler therefore types 'counts.anything' as number, so calling a method on it compiles, but at runtime the key may be missing and the value is undefined. Use 'Partial<Record<string, number>>', turn on 'noUncheckedIndexedAccess', or use a Map whose get() returns 'number | undefined'.", c: `
const counts: Record<string, number> = { apples: 2 };
counts.pears.toFixed(1);               // compiles; TypeError at runtime
const safe: Partial<Record<string, number>> = counts;
// safe.pears.toFixed(1);              // Error: 'safe.pears' is possibly 'undefined'.
console.log(safe.pears?.toFixed(1));
` }
  ],
  tips: [
    "Derive request and response types from one source: 'type CreateUser = Omit<User, 'id'>' and 'type UpdateUser = Partial<CreateUser>'. A new field then flows into all of them.",
    "Use 'Parameters<typeof fn>[0]' to type the first argument of a library function whose option type is not exported.",
    "Reach for 'Awaited<ReturnType<typeof loadUser>>' to name the resolved value of an async function instead of exporting a second type by hand.",
    "When a Record is only partially filled, declare it as 'Partial<Record<Key, V>>' so every lookup forces a check."
  ]
});

EXTRA(20, "Enums, as const and literal unions", {
  deep: [
    "A numeric enum compiles to an immediately invoked function that fills an object in both directions: the generated line is Direction[Direction[Up] = 0] = Up, with Up as a string key. The result has four keys for two members, which is why 'Object.keys' and 'Object.values' on a numeric enum return names and numbers mixed. String enums produce a plain one-way object. A 'const enum' produces no object at all: the compiler replaces every use with the literal value, which needs knowledge of the enum declaration at every use site; single-file transpilers (Babel, esbuild, isolatedModules builds) cannot do this across files, so const enums exported from a library are a known source of breakage.",
    "Enums have unusual assignability rules. A string enum is nominal in practice: a plain literal with the same text is not assignable to it, so data from JSON must be converted or asserted. Numeric enums were almost the opposite: historically any number was assignable to a numeric enum type; since TypeScript 5.0 an out-of-range literal is an error, but a value of type number still passes, so a numeric enum does not validate anything. Enums are also not erasable syntax: Node.js type stripping and the 'erasableSyntaxOnly' option (5.8) reject them, and declaration merging between enums and namespaces makes tooling harder.",
    "'as const' is a const assertion: it asks for the narrowest type of a literal expression, so strings stay literal types, arrays become readonly tuples and object properties become readonly. The object exists at runtime and the type is derived from it with 'typeof' and indexed access, so the two cannot drift apart. The derived union is a normal literal union and is assignable to and from the strings an API sends. The cost is a slightly longer type expression and no reverse mapping; if you need to iterate the values, use the array form. Enums still make sense for bit flags with numeric operations and in code bases that already use them consistently; do not start a migration just for style."
  ],
  iq: [
    { q: "What does 'Object.keys' return for a numeric enum, and why?", a: "Both the names and the numbers as strings, for example ['0', '1', 'Up', 'Down'], because the compiled object contains a reverse mapping from the number to the name. String enums have no reverse mapping and return only the names. If you need to iterate the members, filter out the numeric keys or use a string enum or an 'as const' object instead.", c: `
enum Direction { Up, Down }
console.log(Object.keys(Direction));        // ["0", "1", "Up", "Down"]
console.log(Direction[0], Direction.Up);    // "Up" 0

enum Level { Low = "LOW", High = "HIGH" }
console.log(Object.keys(Level));            // ["Low", "High"]
` },
    { q: "Why does a string enum reject the plain string with the same value, and why does a numeric enum accept almost any number?", a: "String enum members are treated like unique types with a name, so the literal 'ACTIVE' is not the same type as 'Status.Active' even though the runtime value is equal. That makes data from APIs awkward. Numeric enums are treated as number-like; a number variable is assignable to the enum type, so a wrong value from outside passes the type checker. Only out-of-range numeric literals became errors in TypeScript 5.0.", c: `
enum Status { Active = "ACTIVE", Blocked = "BLOCKED" }
enum Code { Ok = 200, NotFound = 404 }

const s: Status = "ACTIVE";
// Error: Type '"ACTIVE"' is not assignable to type 'Status'.

const fromApi: number = 500;
const c: Code = fromApi;                    // no error, although 500 is not a member
console.log(s, c);
` },
    { q: "How do you get both a runtime list of allowed values and a matching type without an enum?", a: "Declare the values once in an array or object with 'as const', then derive the type with 'typeof' and an indexed access: '(typeof ROLES)[number]' for an array, '(typeof OBJ)[keyof typeof OBJ]' for an object. The array can be used for validation and dropdowns, and the derived union is a plain literal union that accepts the same strings the API sends.", c: `
const ROLES = ["admin", "editor", "viewer"] as const;
type Role = (typeof ROLES)[number];         // "admin" | "editor" | "viewer"

function isRole(x: string): x is Role {
  return (ROLES as readonly string[]).includes(x);
}
const input = "editor";
if (isRole(input)) {
  const r: Role = input;                    // OK, narrowed
  console.log(r);
}
// const bad: Role = "owner";
// Error: Type '"owner"' is not assignable to type 'Role'.
` },
    { q: "What is the difference between 'const' and 'readonly', and what does 'as const' add?", a: "'const' is a JavaScript keyword for a binding: the variable cannot be reassigned, but the object it points to can be mutated. 'readonly' is a TypeScript modifier for a property or array type: the compiler forbids writing through that type. 'as const' is a type assertion that makes an entire literal deeply readonly and keeps literal types, with no runtime effect at all; 'Object.freeze' is the runtime equivalent, and it is shallow." }
  ],
  tips: [
    "For values that come from an API or go to a database, use string literal unions. The stored value is readable and no mapping code is needed.",
    "Never export a 'const enum' from a shared package. Consumers built with esbuild, Babel or isolatedModules cannot inline it.",
    "Keep one 'as const' array per enumeration and derive the type, the validator and the UI options from it, so there is exactly one place to add a value.",
    "If a code base already uses enums, prefer string enums over numeric ones; they survive reordering and are readable in logs and database rows."
  ]
});

EXTRA(20, "Classes", {
  deep: [
    "A class declaration creates two entities with the same name: a value, the constructor function, and a type, the shape of an instance. The constructor itself has the type 'typeof Circle', which includes static members and the construct signature. This is why 'Circle' can appear in both positions, and why a function that needs a class as an argument takes 'new (...args: any[]) => T' rather than 'T'. Instance types are structural like every other type: two unrelated classes with the same public members are interchangeable, and a plain object literal with the right methods is accepted where the class type is expected. Only private and protected members make a class type nominal, because the compiler then requires that the member comes from the same declaration.",
    "TypeScript 'private' and 'protected' are erased, so the property is a normal enumerable key at runtime, visible in JSON.stringify and reachable with bracket access; the compiler even allows 'obj['secret']' as an escape hatch for tests. ECMAScript '#private' fields are real: they are not properties, cannot be read from outside and are per-class. When 'target' is below ES2022 the compiler emits WeakMap-based helpers for them. Class fields also depend on 'useDefineForClassFields': with the standard semantics a field declaration without an initialiser is emitted as 'field = undefined', which can overwrite a value set in a parent constructor; 'declare field: T' avoids the emit.",
    "'implements' is a check, not a source of types: the class members still need their own annotations, and parameters are not inferred from the interface. Abstract classes exist at runtime as normal constructors; only the compiler blocks 'new'. Methods are not bound, so passing 'this.handle' as a callback loses 'this'; arrow function properties fix it at the cost of one function per instance. 'strictPropertyInitialization' requires every non-optional field to be assigned in the constructor or declared with '!'. Prefer classes when you have state plus behaviour and identity, for example services and domain entities. For plain data, functions over interfaces are smaller, easier to serialise and easier to test."
  ],
  iq: [
    { q: "Does 'private' keep a value secret at runtime? What is the difference to '#private'?", a: "No. TypeScript private is a compile-time check only; after compilation the field is an ordinary property that appears in JSON output and can be read with bracket notation, which the compiler intentionally allows. A '#field' is private at the JavaScript level: it is not a property, it cannot be accessed from outside, and it does not appear in JSON. Choose '#' when real encapsulation matters, 'private' when you only want an API hint and better performance on old targets.", c: `
class Account {
  private balance = 100;
  #pin = "1234";
}
const acc = new Account();
// acc.balance;
// Error: Property 'balance' is private and only accessible within class 'Account'.
console.log(acc["balance"]);            // 100 - allowed on purpose, no error
console.log(JSON.stringify(acc));       // {"balance":100}  (#pin is absent)
// acc.#pin;                            // Error: Property '#pin' is not accessible outside class 'Account'
` },
    { q: "Are two classes with the same members interchangeable? When do classes stop being structural?", a: "Yes, as long as all members are public: class types are compared structurally like any object type, and even a plain object literal is accepted. As soon as a class has a private or protected member, instances of another class with a same-named private member are rejected, because the compiler requires the private member to originate from the same declaration. That is the closest TypeScript comes to nominal typing.", c: `
class Point { constructor(public x: number, public y: number) {} }
class Vector { constructor(public x: number, public y: number) {} }
const p: Point = new Vector(1, 2);              // OK: same shape
const q: Point = { x: 1, y: 2 };                // OK too

class Secret { private key = 1 }
class Other { private key = 1 }
const s: Secret = new Other();
// Error: Type 'Other' is not assignable to type 'Secret'.
//   Types have separate declarations of a private property 'key'.
console.log(p, q, s);
` },
    { q: "A class 'implements' an interface. Why does the compiler still complain about implicit any in the method parameters?", a: "'implements' only checks the finished class against the interface; it does not flow the interface types into the class body. Method parameters are therefore unannotated and fall under noImplicitAny. You must repeat the types, or assign the implementation to a typed variable or object literal where contextual typing applies, or use 'satisfies' with an object of functions.", c: `
interface Validator { check(input: string): boolean }

class LengthCheck implements Validator {
  check(input) {
    // Error: Parameter 'input' implicitly has an 'any' type.
    return input.length > 3;
  }
}
const v: Validator = { check: (input) => input.length > 3 };   // OK: input is contextually typed
console.log(new LengthCheck(), v);
` },
    { q: "Abstract class or interface: how do you choose?", a: "An interface is only a type: no runtime cost, a class can implement several, and plain objects can satisfy it. An abstract class exists at runtime, can hold shared implementation and state, and a class can extend only one. Use an interface for a contract; use an abstract class when several subclasses really share code, for example a template method with a few abstract steps. Many teams avoid abstract classes entirely and compose functions instead." }
  ],
  tips: [
    "Use parameter properties for injected dependencies: 'constructor(private readonly repo: UserRepo) {}' removes three lines of boilerplate per dependency.",
    "Define callbacks that are passed around as arrow function properties ('handleClick = () => {...}') or bind them once in the constructor, so 'this' is never lost.",
    "Keep classes for things with identity and behaviour (services, repositories, domain entities). Represent plain data with interfaces and functions; it serialises and tests more easily.",
    "For a class that must be mocked in tests, depend on an interface, not the class. Structural typing then lets a small object literal stand in for the real implementation."
  ]
});

EXTRA(20, "Advanced types: keyof, mapped and conditional types", {
  deep: [
    "TypeScript keeps two separate namespaces: the value space (variables, functions, classes as constructors, enums as objects) and the type space (interfaces, type aliases, type parameters). Some declarations live in both: a class and an enum create a value and a type with the same name. 'typeof' in a type position is the bridge from value to type, and 'keyof' works on types only. This is why 'keyof defaults' is an error for a variable (you need 'keyof typeof defaults') and why an interface name cannot be used in an expression. The namespaces also explain why the same identifier can be a type alias and a const at once without conflict.",
    "A mapped type over 'keyof T' where T is a type parameter is homomorphic: the compiler copies the optional and readonly modifiers from the source, and such a type applied to a primitive returns the primitive unchanged and applied to an array returns an array. Key remapping with 'as' (4.1) lets you rename or filter keys; mapping a key to never removes it. Conditional types are distributive when the checked type is a bare type parameter: 'ToArray<string | number>' becomes 'string[] | number[]', not '(string | number)[]'. Wrapping both sides in a tuple, '[T] extends [U]', turns distribution off. Distribution over never yields never, which is why 'IsNever<T> = T extends never ? true : false' returns never for never and needs the tuple trick.",
    "'infer' declares a type variable inside the extends clause; the compiler fills it by matching the structure, and from 4.7 you can constrain it with 'infer R extends string'. Recursive conditional and template literal types are allowed but the checker has an instantiation depth limit (around 50 nested levels for conditionals, 1000 for tail-recursive ones) and a limit on the size of unions produced by template literals (100,000 members), so 'Range<0, 1000>' style types fail. Complex types also slow down the editor and give error messages nobody can read. In application code, use these tools for small derivations such as 'keyof typeof config' or a 'FormErrors<T>'; leave the type-level programming to libraries like Zod, tRPC and Prisma, which earn the complexity by serving many users."
  ],
  iq: [
    { q: "What does 'ToArray<string | number>' produce, and how do you stop that behaviour?", a: "A conditional type whose checked type is a naked type parameter distributes over unions: each member is checked separately and the results are joined, so you get 'string[] | number[]'. If you want the union treated as one type, wrap both sides in a tuple: '[T] extends [any] ? T[] : never' produces '(string | number)[]'. Distribution is also why Exclude and Extract work.", c: `
type ToArray<T> = T extends any ? T[] : never;
type A = ToArray<string | number>;          // string[] | number[]

type ToArrayAll<T> = [T] extends [any] ? T[] : never;
type B = ToArrayAll<string | number>;       // (string | number)[]

const a: A = ["x"];                         // OK
// const bad: A = ["x", 1];
// Error: Type '(string | number)[]' is not assignable to type 'string[] | number[]'.
const b: B = ["x", 1];                      // OK
console.log(a, b);
` },
    { q: "Explain type space and value space. Why does 'const u = User' fail while 'const d = Direction' works?", a: "Identifiers live in two separate namespaces. An interface or type alias exists only in the type space, so it cannot be used as a value. A class or an enum declares both a value and a type. 'typeof x' in a type position moves from the value space to the type space; there is no operator for the other direction, because types are erased.", c: `
interface User { id: number }
enum Direction { Up, Down }

// const u = User;
// Error: 'User' only refers to a type, but is being used as a value here.
const d = Direction;                        // OK: enums are values too

const config = { retries: 3, url: "/api" };
type Config = typeof config;                // value -> type
type Key = keyof typeof config;             // "retries" | "url"
// type Bad = keyof config;
// Error: 'config' refers to a value, but is being used as a type here.
const k: Key = "url";
console.log(d, k);
` },
    { q: "Implement ReturnType and a recursive Awaited by hand.", a: "ReturnType is a conditional type that matches any function signature and captures the return position with infer. Awaited must unwrap repeatedly, because a promise can resolve to another promise; a conditional type can refer to itself in its branches. The built-in Awaited also handles any object with a then method, which the short version here skips.", c: `
type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never;
type MyAwaited<T> = T extends Promise<infer V> ? MyAwaited<V> : T;

async function load() { return { id: 1 }; }
type R = MyReturnType<typeof load>;         // Promise<{ id: number }>
type V = MyAwaited<R>;                      // { id: number }
type Deep = MyAwaited<Promise<Promise<string>>>;   // string

const v: V = { id: 1 };
const s: Deep = "done";
console.log(v, s);
` },
    { q: "What is 'keyof' of a union, and of a type with an index signature?", a: "'keyof (A | B)' is the keys common to both members, because only those are safe to read on a value that may be either. 'keyof (A & B)' is the union of all keys. For '{ [k: string]: number }' keyof is 'string | number', since JavaScript converts numeric keys to strings; and for 'Record<string, X>' you therefore cannot get a useful key list at all.", c: `
type A = { id: number; name: string };
type B = { id: number; age: number };
type Common = keyof (A | B);                // "id"
type All = keyof (A & B);                   // "id" | "name" | "age"
type Dict = keyof { [k: string]: number };  // string | number

const c: Common = "id";
// const n: Common = "name";
// Error: Type '"name"' is not assignable to type '"id"'.
const all: All = "age";
const dk: Dict = 5;                         // OK
console.log(c, all, dk);
` }
  ],
  tips: [
    "Derive types from runtime objects, not the other way around: 'const routes = {...} as const; type Route = keyof typeof routes' keeps the value and the type in one place.",
    "When a mapped or conditional type grows beyond five lines, give the intermediate pieces their own named aliases. Hovering a named alias in the editor shows the result and makes debugging possible.",
    "Use key remapping to filter: '{ [K in keyof T as T[K] extends Function ? never : K]: T[K] }' builds a data-only view of a class instance for serialisation.",
    "Measure before you optimise, but if the editor becomes slow, run 'tsc --extendedDiagnostics' and 'tsc --generateTrace' to find the expensive types; template literal unions and deep recursion are the usual causes."
  ]
});

EXTRA(20, "Modules, declaration files and tsconfig", {
  deep: [
    "Module resolution is the process of turning an import string into a file. 'moduleResolution: bundler' mimics what Vite, webpack and esbuild do: extensions may be omitted, 'index' files are found, and the 'exports' field of package.json is honoured. 'nodenext' mimics Node.js itself: relative imports in ES modules must carry the extension of the emitted file, so you write './user.js' in a .ts file, and whether a file is ESM or CommonJS depends on the nearest package.json 'type' field. For a package the compiler looks for 'types' or 'typings' in package.json, then an 'index.d.ts', then the 'exports' map with its 'types' condition, and finally falls back to 'node_modules/@types'. All '@types' packages found in 'typeRoots' are included automatically unless the 'types' array restricts them.",
    "A file without a top-level import or export is a script, not a module: everything it declares is global and visible to every other script in the project, which is a frequent cause of 'Cannot redeclare block-scoped variable' errors; adding 'export {}' makes it a module. Declaration files use the same split: a .d.ts with 'declare module 'x' {...}' describes a package, a .d.ts without imports can declare globals, and inside a module you need 'declare global {...}' to touch the global scope. Ambient declarations ('declare const', 'declare function') describe values that exist at runtime without producing code. 'skipLibCheck' turns off checking of all .d.ts files, including your own, and is widely used because conflicting @types versions in node_modules would otherwise break builds.",
    "'strict' is a bundle of flags and new ones can be added in later versions: noImplicitAny, strictNullChecks, strictFunctionTypes, strictBindCallApply, strictPropertyInitialization, noImplicitThis, alwaysStrict and useUnknownInCatchVariables are part of it, while noUncheckedIndexedAccess, exactOptionalPropertyTypes and noImplicitOverride are not. 'isolatedModules' and 'verbatimModuleSyntax' make the code safe for single-file transpilers by requiring 'import type' and forbidding re-exports of types without the keyword and the use of const enums. Project references ('composite', 'references') split a monorepo into separately checked units with incremental builds. Avoid 'paths' aliases unless your runtime or bundler also resolves them; tsc does not rewrite import paths in the output."
  ],
  iq: [
    { q: "What is the difference between 'import { User }' and 'import type { User }', and why does it matter for esbuild or Babel?", a: "A normal import may bring in a value or a type; the compiler decides per name and drops imports that are only used as types. A single-file transpiler cannot know whether 'User' is a type, so it must either keep the import (and then the runtime fails because the module has no such export) or guess. 'import type' states the fact explicitly and is always erased. With 'verbatimModuleSyntax' the compiler requires the keyword for every type-only import and keeps every other import exactly as written.", c: `
// models.ts
export interface User { id: number }
export const GUEST = { id: 0 };

// app.ts  (with verbatimModuleSyntax: true)
// import { User, GUEST } from "./models.js";
// Error: 'User' is a type and must be imported using a type-only import
//        when 'verbatimModuleSyntax' is enabled.
// import { type User, GUEST } from "./models.js";   // OK: inline type modifier
// import type { User } from "./models.js";          // OK: whole import erased
` },
    { q: "A library you installed has no types and every import of it is an error. What are your options, in order of preference?", a: "First look for '@types/<name>' on npm; the DefinitelyTyped project publishes types for most popular JavaScript packages. If none exists, write a declaration file in your project: a minimal 'declare module 'name';' turns the import into any, and a fuller version describes the functions you actually use. Writing the types for the parts you call is better than a blanket any, and you can contribute them back to DefinitelyTyped.", c: `
// src/types/legacy-charts.d.ts
declare module "legacy-charts" {
  export interface ChartOptions { width: number; height: number; title?: string }
  export function draw(el: HTMLElement, data: number[], options?: ChartOptions): void;
}

// shortcut when you do not care: everything from the module becomes any
// declare module "legacy-charts";
` },
    { q: "Why does the compiler say a variable is already declared, when it only appears once in this file?", a: "The file has no import or export, so it is a global script and shares its scope with every other script file in the program, including .d.ts files and the DOM lib. A 'const name' or 'const status' at the top level collides with the global declarations of the browser lib or with the same name in another script file. Adding any import or an empty 'export {}' makes the file a module with its own scope.", c: `
// utils.ts (no import or export in this file)
const name = "app";
// Error: Cannot redeclare block-scoped variable 'name'.
// (the DOM lib declares a global 'name' on window)

// export {};     // uncomment this line: the file becomes a module and the error disappears
console.log(name);
` },
    { q: "Which checks does 'strict' turn on, and which popular strictness options are not included?", a: "strict enables noImplicitAny, strictNullChecks, strictFunctionTypes, strictBindCallApply, strictPropertyInitialization, noImplicitThis, alwaysStrict and useUnknownInCatchVariables, and newer versions may add flags to the bundle. Not included are noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitOverride, noImplicitReturns, noUnusedLocals and noFallthroughCasesInSwitch; these must be set by hand. An interviewer often follows up with what each one catches, so know at least the first four." }
  ],
  tips: [
    "Start a new tsconfig from the official tsconfig/bases on GitHub for your runtime (node, vite, react) instead of copying one from an old project.",
    "In an ESM Node.js project use 'module: nodenext' and write './file.js' extensions in imports from day one; retrofitting hundreds of import paths later is painful.",
    "Put hand-written .d.ts files in 'src/types' and make sure that folder is inside 'include'. A declaration file that is not part of the program is silently ignored.",
    "Enable 'isolatedModules' (or 'verbatimModuleSyntax') even if you only use tsc today; it keeps the code compatible with esbuild, Vite, Jest with swc and Node.js type stripping."
  ]
});

EXTRA(20, "Typing real-world data", {
  deep: [
    "The compiler proves properties about your program only up to the trust boundary. Everything that enters at runtime, HTTP bodies, query strings, environment variables, localStorage, message events, database rows from a driver without a generated client, arrives as any or unknown and the type you attach is a promise you make, not a fact the compiler verified. 'response.json()' is declared as 'Promise<any>', so 'const u: User = await res.json()' compiles for every shape of JSON, including an HTML error page. A type predicate 'x is User' is likewise trusted blindly: if its body is wrong, the compiler happily narrows to a wrong type. Assertion functions ('asserts x is User') behave the same but throw instead of returning false.",
    "A schema library builds the validator and the type from one definition. Zod schemas are runtime objects; 'z.infer' reads the output type from the schema with a conditional type, and 'z.input' gives the type before transforms and defaults, which can differ. 'parse' throws a ZodError with an 'issues' array that names the path of each problem, 'safeParse' returns a discriminated union '{ success: true, data } | { success: false, error }' that fits naturally into the narrowing you already know. Object schemas strip unknown keys by default, which is also a security feature against mass assignment; 'strict()' rejects them and 'passthrough()' keeps them. Validation costs CPU, so validate once at the boundary and pass typed values inwards, not at every function.",
    "Errors and promises are the second weak point. There is no 'throws' clause: a function signature says nothing about what it may throw, and a Promise's rejection type is always untyped, which is why catch variables are unknown under strict. The standard remedies are a 'Result<T, E>' union returned instead of thrown for expected failures, and instanceof checks for unexpected ones. 'Promise<T>' cannot nest, 'Promise<Promise<T>>' is flattened at runtime and Awaited mirrors that. Remember that fetch resolves on 4xx and 5xx, that 'Promise.all' gives a tuple type from a tuple argument, and that an un-awaited promise inside try does not get caught; the typescript-eslint rule 'no-floating-promises' finds those. Do not validate data you generated yourself in the same process; schemas belong at the edges, not between your own modules."
  ],
  iq: [
    { q: "This code compiles. Is the type of 'user' guaranteed at runtime? What is the correct approach?", a: "No. 'res.json()' returns 'Promise<any>', and any is assignable to User, so the annotation checks nothing. If the server sends a different shape, the error appears later at a property access. Treat the result as unknown and validate it with a type guard or a schema; only after that step does the User type mean something.", c: `
interface User { id: number; name: string }

async function bad(): Promise<User> {
  const res = await fetch("/api/user/1");
  const user: User = await res.json();      // compiles: json() returns any
  return user;                              // may be { error: "not found" } at runtime
}

function isUser(x: unknown): x is User {
  return typeof x === "object" && x !== null
    && typeof (x as { id?: unknown }).id === "number"
    && typeof (x as { name?: unknown }).name === "string";
}

async function good(): Promise<User> {
  const res = await fetch("/api/user/1");
  const data: unknown = await res.json();
  if (!isUser(data)) throw new Error("Unexpected response shape");
  return data;                              // narrowed by the guard
}
console.log(bad, good);
` },
    { q: "Why is the catch variable 'unknown' and not 'Error'? How do you handle it?", a: "JavaScript can throw any value: strings, numbers, plain objects, undefined. Before TypeScript 4.4 the catch variable was any, which hid this; with 'useUnknownInCatchVariables' (part of strict) it is unknown. Narrow it with 'instanceof Error' before reading message or stack, and provide a fallback such as 'String(err)'. For errors you expect, return a Result union instead of throwing, so the failure has a real type.", c: `
try {
  JSON.parse("{bad json");
} catch (err) {
  // console.log(err.message);
  // Error: 'err' is of type 'unknown'.
  if (err instanceof Error) {
    console.log(err.message);               // OK
  } else {
    console.log(String(err));
  }
}
` },
    { q: "A type guard can lie. Show how, and explain what the compiler checks about it.", a: "The compiler checks only that the predicate type is a subtype of the parameter type and that the function returns a boolean. It never looks at whether the boolean logic really tests the properties. A guard that returns true for everything narrows anything to User and the program fails later. Keep guards tiny and obvious, or let a schema library generate them.", c: `
interface User { id: number; name: string }

function isUser(x: unknown): x is User {
  return true;                              // compiles; it is a lie
}

const data: unknown = "hello";
if (isUser(data)) {
  console.log(data.name.toUpperCase());     // TypeError at runtime: cannot read 'toUpperCase' of undefined
}
` },
    { q: "With Zod, where do the TypeScript types come from and what is the difference between parse and safeParse?", a: "The schema is the only definition; 'z.infer<typeof schema>' derives the output type, so the type can never drift from the validation. 'parse' returns the typed data or throws a ZodError whose issues list the path and message of every problem. 'safeParse' never throws; it returns a discriminated union with 'success', so you narrow it with an if, which is better inside request handlers where a throw would need a try block anyway.", c: `
import { z } from "zod";

const OrderSchema = z.object({
  id: z.string().uuid(),
  items: z.array(z.object({ sku: z.string(), qty: z.number().int().positive() })).min(1),
  note: z.string().optional(),
});
type Order = z.infer<typeof OrderSchema>;
// { id: string; items: { sku: string; qty: number }[]; note?: string | undefined }

const result = OrderSchema.safeParse({ id: "x", items: [] });
if (!result.success) {
  console.log(result.error.issues.map((i) => i.path.join(".") + ": " + i.message));
  // prints one line per problem, for example "id: Invalid UUID" (exact wording depends on the Zod version)
} else {
  const order: Order = result.data;
  console.log(order.items.length);
}
` }
  ],
  tips: [
    "Create one 'api' module that owns all fetch calls, validates every response with a schema, and exports typed functions. The rest of the app never touches raw JSON.",
    "Validate environment variables at startup with a schema ('z.object({ PORT: z.coerce.number() })') and export the parsed object; a missing variable then fails at boot with a clear message, not at 3 a.m. in a request.",
    "Model expected failures as a 'Result<T, E>' union returned from the function, and keep throw for programmer errors. Callers are then forced by the type checker to handle the failure branch.",
    "Turn on the typescript-eslint rule 'no-floating-promises'. A forgotten await is the most common async bug and the type checker alone does not report it."
  ]
});
