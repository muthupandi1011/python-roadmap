ROADMAP.push({
n: 20, track: "Frontend",
title: "TypeScript",
blurb: "JavaScript with a type checker: from basic types and narrowing to generics, utility types, tsconfig and safe typing of real API data.",
topics: [
X("What TypeScript is and how it runs",
["TypeScript is JavaScript with types added on top. You write the same code as before, but you can also say what kind of value each variable, parameter and return value holds. A program called the compiler (tsc) reads your code and reports mistakes before the code runs, for example calling a function with the wrong argument or reading a property that does not exist.",
 "Browsers and Node.js do not understand type syntax, so the types must be removed before the code runs. This is called type erasure. The compiler checks the types and then writes plain JavaScript files with all type annotations deleted. Types have no effect at runtime: they do not make the program faster or slower, and they do not check data that arrives while the program is running.",
 "A project is configured with a file named tsconfig.json. It tells the compiler which files to check, how strict to be, and which JavaScript version to produce. In daily work you rarely run tsc by hand to produce files. A bundler such as Vite or a runner such as tsx removes the types quickly, and you run 'tsc --noEmit' separately (in the editor and in CI) only to check the types."],
["TypeScript is a superset of JavaScript: every valid JavaScript file is also valid TypeScript syntax.",
 "tsc does two separate jobs: type checking and writing JavaScript (emit).",
 "Types are erased. Nothing from an interface or a type alias exists at runtime.",
 "'tsc --noEmit' checks types only. 'tsc --init' creates a tsconfig.json.",
 "Always turn on 'strict': true in a new project.",
 "File extensions: .ts for code, .tsx for code with JSX (React), .d.ts for type declarations only.",
 "Recent Node.js versions can run simple .ts files directly by stripping the types, but they do not check them."],
"A team moves a 40,000 line JavaScript shop frontend to TypeScript file by file, with 'allowJs' turned on so old and new files work together. In the first week the compiler finds 60 places where code reads 'order.customer.name' although customer can be null. These were the cause of the 'Cannot read properties of null' errors that users had reported for months.",
`
// hello.ts
interface User {
  id: number;
  name: string;
}

function greet(user: User): string {
  return \`Hello, \${user.name}\`;
}

console.log(greet({ id: 1, name: "Asha" }));
// greet({ id: 2 });
// Error: Argument of type '{ id: number; }' is not assignable to parameter of type 'User'.
//        Property 'name' is missing in type '{ id: number; }' but required in type 'User'.

// --- commands ---
// npm install --save-dev typescript
// npx tsc --init        create tsconfig.json
// npx tsc               check types and write hello.js
// npx tsc --noEmit      check types only
// node hello.js         run the output
// npx tsx hello.ts      run directly (strips types, does not check them)

// --- hello.js after compilation: the types are gone ---
// function greet(user) {
//   return \`Hello, \${user.name}\`;
// }
// console.log(greet({ id: 1, name: "Asha" }));
`,
"TypeScript was created at Microsoft by a team led by Anders Hejlsberg, who also designed C# and Turbo Pascal. It was announced in October 2012 and version 1.0 was released in April 2014. Node.js 22.6 (2024) added an experimental flag to run .ts files by stripping types, and Node.js 23.6 enabled this by default.",
[["TypeScript for the New Programmer", "https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html"],
 ["What is a tsconfig.json", "https://www.typescriptlang.org/docs/handbook/tsconfig-json.html"],
 ["Node.js: running TypeScript natively", "https://nodejs.org/api/typescript.html"]]),

X("Basic types and type inference",
["The basic types are string, number, boolean, bigint, symbol, null and undefined. You add a type after a colon: 'let age: number = 30'. There is only one number type for integers and decimals, the same as in JavaScript. Use the lowercase names (string, number); the capital names (String, Number) mean the wrapper objects and are almost never what you want.",
 "You do not have to write a type everywhere. When you write 'let age = 30', the compiler sees the value and decides the type is number. This is called type inference. The common rule is: write types for function parameters and for exported functions, and let the compiler infer local variables. An array is written 'string[]' or 'Array<string>'. A tuple is an array with a fixed length and a known type at each position, for example '[number, string]'.",
 "null and undefined need special care. With the option 'strictNullChecks' on (it is part of 'strict'), null and undefined are not allowed in a string or number variable unless you say so with a union: 'string | null'. The compiler then forces you to check for null before you use the value. This one option removes the most common JavaScript runtime error."],
["Write lowercase string, number, boolean. Never String, Number, Boolean.",
 "Inference: 'let x = 5' gives number. 'const x = 5' gives the literal type 5.",
 "Arrays: 'number[]'. Tuples: '[string, number]'. Read-only arrays: 'readonly number[]'.",
 "With strictNullChecks, 'string' does not include null or undefined. You must write 'string | null'.",
 "'?.' (optional chaining) and '??' (nullish coalescing) are the normal tools for values that can be null.",
 "An empty array literal needs a type: 'const ids: number[] = []'.",
 "Reading an array by index gives the element type, even when the index is out of range."],
"An order page reads 'user.address.city'. In the database the address is optional. After the team changed the type to 'address: Address | null', the compiler marked 14 places that read the address without a check. Each one was a possible crash for customers who had not filled in an address.",
`
let title = "Invoice";            // inferred: string
const status = "paid";            // inferred: the literal type "paid"
let total: number = 1200.5;
let done: boolean = false;

const tags: string[] = ["urgent", "eu"];
const scores: Array<number> = [90, 75];
const point: [number, number] = [10, 20];        // tuple
const row: [id: number, label: string] = [1, "Asha"];
const fixed: readonly number[] = [1, 2, 3];
// fixed.push(4);
// Error: Property 'push' does not exist on type 'readonly number[]'.

// total = "a lot";
// Error: Type 'string' is not assignable to type 'number'.

function findUser(id: number): string | undefined {
  const users = new Map([[1, "Asha"], [2, "Ravi"]]);
  return users.get(id);
}

const found = findUser(3);
// found.toUpperCase();
// Error: 'found' is possibly 'undefined'.

if (found !== undefined) {
  console.log(found.toUpperCase());      // here found is string
}
console.log(found?.toUpperCase() ?? "unknown user");
`,
"Type inference has been part of TypeScript since the first public version in 2012. Tuple types were added in TypeScript 1.3 (2014). The strictNullChecks option arrived in TypeScript 2.0 (September 2016); before that, null and undefined were allowed in every type.",
[["Everyday Types", "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html"],
 ["Type Inference", "https://www.typescriptlang.org/docs/handbook/type-inference.html"],
 ["TSConfig: strictNullChecks", "https://www.typescriptlang.org/tsconfig/strictNullChecks.html"]]),

X("Typing functions",
["A function has types in two places: the parameters and the return value. Parameter types must be written, because the compiler cannot guess them. The return type is usually inferred from the return statements, but it is good practice to write it on exported functions. Then a mistake inside the function is reported inside the function, not in a file far away that calls it.",
 "A parameter can be optional ('name?: string'), can have a default value ('limit = 10'), or can collect the remaining arguments into an array ('...ids: number[]'). An optional parameter has the type 'string | undefined' inside the function, so you must handle the missing case. A parameter with a default value does not need a type annotation, because the type is inferred from the default.",
 "A function that returns nothing has the return type void. A function type can be written as an arrow: '(a: number, b: number) => number'. When one function accepts different argument types and returns different results, you can write overloads: several signatures without a body, followed by one implementation. Callers see only the overload signatures, never the implementation signature."],
["Always type parameters. Write return types on exported functions.",
 "'x?: T' means the argument may be left out. Inside the function it is 'T | undefined'.",
 "Optional parameters must come after required ones.",
 "void means the caller should not use the return value. It is not the same as undefined.",
 "A function type: 'type Handler = (event: string) => void'.",
 "Overloads: the implementation signature is hidden from callers and must be compatible with all overloads.",
 "A function that never returns (always throws or loops forever) has the return type never."],
"A payments team had a function 'charge(amount, currency, retries)'. A developer called it as 'charge(currency, amount)' and the bug reached production, because in JavaScript nothing complained. With the types '(amount: number, currency: string)', the wrong call order is a compile error on the developer's own machine.",
`
function add(a: number, b: number): number {
  return a + b;
}

// optional, default and rest parameters
function formatPrice(amount: number, currency = "EUR", digits?: number): string {
  return amount.toFixed(digits ?? 2) + " " + currency;
}
function sum(...values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}

// a function type
type Comparator<T> = (a: T, b: T) => number;
const byLength: Comparator<string> = (a, b) => a.length - b.length;

// void: the caller should ignore the result
function logError(message: string): void {
  console.error(message);
}

// overloads: two public signatures, one hidden implementation
function getUser(id: number): { id: number };
function getUser(email: string): { email: string };
function getUser(key: number | string) {
  return typeof key === "number" ? { id: key } : { email: key };
}

console.log(add(2, 3), formatPrice(9.5), sum(1, 2, 3));
console.log(["ccc", "a", "bb"].sort(byLength));
const byId = getUser(7);              // type: { id: number }
const byEmail = getUser("a@b.com");   // type: { email: string }
logError("done");
`,
"Function type annotations, optional parameters and overloads were all in the first public release of TypeScript in 2012. The never type for functions that never return was added in TypeScript 2.0 (2016). Stricter checking of function parameter types (strictFunctionTypes) was added in TypeScript 2.6 (2017).",
[["Handbook: More on Functions", "https://www.typescriptlang.org/docs/handbook/2/functions.html"],
 ["TSConfig: strictFunctionTypes", "https://www.typescriptlang.org/tsconfig/strictFunctionTypes.html"],
 ["MDN: Functions", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions"]]),

X("Objects: interfaces and type aliases",
["Most data in a program is objects, so most types you write describe the shape of an object: which properties it has and the type of each one. There are two ways to name an object shape. An interface ('interface User { ... }') and a type alias ('type User = { ... }'). For plain objects they work almost the same, and you can use either one.",
 "A property can be optional with a question mark ('email?: string') and can be read-only ('readonly id: number'). An interface can extend another interface to add properties. A type alias does the same with an intersection, written with '&'. When you do not know the property names in advance, for example a dictionary of translations, you use an index signature: '{ [key: string]: string }'.",
 "TypeScript uses structural typing. This means the compiler compares shapes, not names. If an object has all the properties that a type requires, it is accepted, even if it was never declared as that type and even if it has extra properties. There is one extra check: when you write an object literal directly where a type is expected, unknown properties are reported as an error, because they are almost always typing mistakes."],
["interface and type both describe object shapes. Pick one style per project and stay consistent.",
 "Only a type alias can name a union, a tuple or a primitive. Only an interface can be declared twice and merged.",
 "'email?: string' means the property may be missing.",
 "readonly stops assignment to that property at compile time only, and only one level deep.",
 "'interface B extends A' and 'type B = A & { ... }' both combine shapes.",
 "Structural typing: same shape means compatible type. Names do not matter.",
 "Index signature: '{ [key: string]: number }' for objects used as dictionaries."],
"A dashboard receives a 'Product' object from three different API endpoints. The team writes one 'Product' interface and one 'ProductWithStock' that extends it. When the backend renames 'price' to 'unitPrice', they change one line in the interface and the compiler lists all 31 files that still use the old name.",
`
interface User {
  readonly id: number;
  name: string;
  email?: string;                 // optional
}

interface Admin extends User {
  permissions: string[];
}

type Timestamps = { createdAt: Date; updatedAt: Date };
type AdminRecord = Admin & Timestamps;        // intersection: all properties of both

interface Translations {
  [key: string]: string;          // index signature
}

const admin: AdminRecord = {
  id: 1,
  name: "Asha",
  permissions: ["users:write"],
  createdAt: new Date(),
  updatedAt: new Date(),
};
// admin.id = 2;
// Error: Cannot assign to 'id' because it is a read-only property.

const labels: Translations = { save: "Speichern", cancel: "Abbrechen" };

// structural typing: the shape matters, not the name
function printName(item: { name: string }) {
  console.log(item.name);
}
printName(admin);                             // OK: admin has a name
const city = { name: "Pune", population: 7000000 };
printName(city);                              // OK: extra properties are fine here
// printName({ name: "Pune", population: 7000000 });
// Error: Object literal may only specify known properties.
console.log(labels["save"], admin.email?.toLowerCase());
`,
"Interfaces and structural typing were in the first TypeScript release in 2012. Type aliases and union types were added in TypeScript 1.4 (January 2015), and intersection types in 1.6. The readonly modifier was added in TypeScript 2.0 (2016).",
[["Handbook: Object Types", "https://www.typescriptlang.org/docs/handbook/2/objects.html"],
 ["Type Compatibility (structural typing)", "https://www.typescriptlang.org/docs/handbook/type-compatibility.html"],
 ["Differences between type aliases and interfaces", "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces"]]),

X("Union types, literal types and narrowing",
["A union type says a value can be one of several types: 'string | number'. A literal type is a type with exactly one value, for example the string 'paid'. Together they are very useful: 'type Status = 'pending' | 'paid' | 'failed'' allows only these three strings. The editor completes them for you and the compiler catches spelling mistakes.",
 "When a value has a union type, you can only use what is common to all members. To do more, you must first check which member you have. After the check, the compiler knows the more exact type inside that branch. This is called narrowing. The checks are normal JavaScript: 'typeof x === 'string'' for primitives, 'instanceof' for classes, ''key' in obj' for objects, and comparison with null or with a literal value.",
 "The most important pattern is the discriminated union. Each member of the union is an object with one common property, usually named 'type' or 'kind', that holds a different literal value. A switch on that property narrows the whole object. If you add a default branch that assigns the value to a variable of type never, the compiler tells you when someone adds a new member and forgets to handle it."],
["Union: 'A | B' means one of them. You may only use what both have until you narrow.",
 "Literal types: ''GET' | 'POST'' is safer than string.",
 "Narrow with typeof, instanceof, in, equality checks and truthiness checks.",
 "Discriminated union: a shared literal property (kind, type, status) tells the members apart.",
 "Exhaustive check: in the default branch assign the value to never.",
 "typeof null is 'object', so a typeof check alone does not remove null.",
 "Model state as a union of valid states, not as one object with many optional fields."],
"A checkout screen had the state '{ loading: boolean, error?: string, data?: Order }'. It was possible to have loading true and an error at the same time, and the screen showed both a spinner and an error message. The team replaced it with a discriminated union of three states. The impossible combinations could no longer be written.",
`
type Status = "pending" | "paid" | "failed";

type RequestState =
  | { kind: "loading" }
  | { kind: "success"; data: string[] }
  | { kind: "error"; message: string; retryAfter?: number };

function assertNever(value: never): never {
  throw new Error("Unhandled case: " + JSON.stringify(value));
}

function render(state: RequestState): string {
  switch (state.kind) {
    case "loading":
      return "Loading...";
    case "success":
      return state.data.join(", ");       // data exists only here
    case "error":
      return "Failed: " + state.message;
    default:
      return assertNever(state);          // compile error if a case is missing
  }
}

function describe(value: string | number | Date | null): string {
  if (value === null) return "nothing";
  if (typeof value === "string") return value.toUpperCase();
  if (typeof value === "number") return value.toFixed(2);
  return value.toISOString();             // only Date is left
}

const current: Status = "paid";
console.log(render({ kind: "success", data: ["a", "b"] }), describe(42), current);
`,
"Union types and type guards with typeof and instanceof were added in TypeScript 1.4 (January 2015). String literal types came in 1.8. TypeScript 2.0 (September 2016) added control-flow based narrowing, discriminated unions and the never type.",
[["Handbook: Narrowing", "https://www.typescriptlang.org/docs/handbook/2/narrowing.html"],
 ["Union types", "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types"],
 ["MDN: typeof operator", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof"]]),

X("any, unknown, never and type assertions",
["Three special types cause many interview questions. 'any' turns the type checker off for a value: you can do anything with it and assign it to anything, and the compiler stays silent. 'unknown' also accepts every value, but you cannot do anything with it until you check what it is. 'never' is the type with no values at all. It describes code that cannot be reached, for example after a function that always throws.",
 "A type assertion, written 'value as Type', tells the compiler to treat a value as a different type. It does not convert or check anything at runtime. It only changes what the compiler believes. If you are wrong, the program fails later in a confusing place. The non-null assertion 'value!' is a short assertion that says 'this is not null or undefined', again without any runtime check.",
 "The 'satisfies' operator is the safe partner of 'as'. 'value satisfies Type' asks the compiler to check that the value fits the type, but it keeps the more exact type that was inferred from the value. Use a type annotation or satisfies when you create a value. Use 'as' only when you really know more than the compiler, and prefer a runtime check when the data comes from outside."],
["any: no checking at all, and it spreads to everything it touches.",
 "unknown: the safe version of any. You must narrow it before use.",
 "never: no value can have this type. Used for unreachable code and exhaustive checks.",
 "'as' changes the compile-time type only. It never changes the value.",
 "'x!' removes null and undefined from the type without checking.",
 "'satisfies' checks a value against a type and keeps the exact inferred type.",
 "Use 'noImplicitAny' (part of strict) and a lint rule against explicit any."],
"A support tool crashed with 'toFixed is not a function'. The code said 'const price = form.price as number', but the form value was the string '19.99'. The assertion had hidden the bug from the compiler. The fix was to remove 'as' and convert the value with Number() plus a check for NaN.",
`
// any: everything is allowed, nothing is checked
let loose: any = "hello";
loose.foo.bar();                  // compiles, crashes at runtime
const n: number = loose;          // compiles, n is really a string

// unknown: must be narrowed first
function size(input: unknown): number {
  // input.length;                // Error: 'input' is of type 'unknown'.
  if (typeof input === "string") return input.length;
  if (Array.isArray(input)) return input.length;
  return 0;
}

// never: a function that cannot return
function fail(message: string): never {
  throw new Error(message);
}

// assertions: you promise, the compiler believes you
const el = document.getElementById("email") as HTMLInputElement;
const first = [1, 2, 3].find((x) => x > 1)!;      // "trust me, not undefined"

// satisfies: checked against the type, exact keys and value types are kept
type Color = string | [number, number, number];
const palette = {
  primary: "#0055ff",
  danger: [255, 0, 0],
} satisfies Record<string, Color>;

palette.primary.toUpperCase();    // OK: still known to be a string
palette.danger[0].toFixed(0);     // OK: still known to be a tuple
// palette.warning;               // Error: Property 'warning' does not exist
console.log(size("abc"), el?.value, first, n, typeof fail);
`,
"The any type has existed since the first release in 2012. The never type was added in TypeScript 2.0 (2016), the non-null assertion operator '!' also in 2.0, and unknown in TypeScript 3.0 (July 2018). The satisfies operator was added in TypeScript 4.9 (November 2022).",
[["TypeScript 3.0 release notes: the unknown type", "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html"],
 ["TypeScript 4.9 release notes: the satisfies operator", "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html"],
 ["Handbook: type assertions", "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions"]]),

X("Generics",
["A generic is a type with a parameter. Think of a function 'first' that returns the first item of an array. Without generics you must choose: write it once for each type, or use any and lose the type. With a generic you write 'function first<T>(items: T[]): T'. T is a placeholder. When someone calls 'first([1, 2, 3])', the compiler sets T to number and knows the result is a number.",
 "Usually you do not write the type argument yourself; the compiler infers it from the arguments you pass. You can limit what T may be with a constraint: '<T extends { id: number }>' means T can be any type that has a numeric id. Inside the function you may then use 'item.id'. A type parameter can also have a default, as in '<T = string>'.",
 "Interfaces, type aliases and classes can be generic too. You already use generic types every day: 'Array<string>', 'Promise<User>', 'Map<string, number>'. A typical generic interface in a project is 'ApiResponse<T>', which describes the common envelope of every API answer and lets T describe the data inside it."],
["'<T>' declares a type parameter. It links the types of inputs and outputs.",
 "Type arguments are usually inferred from the call: 'first([1, 2])' gives T = number.",
 "Constraint: '<T extends HasId>' limits T and lets you use the properties of HasId.",
 "'<K extends keyof T>' means K must be one of the property names of T.",
 "Default: '<T = unknown>' is used when nothing can be inferred.",
 "Generics are erased at runtime. You cannot write 'new T()' or 'typeof T'.",
 "If a type parameter appears only once in a signature, you probably do not need it."],
"An admin panel had 12 list pages, and each one had its own copy of the paging code. The team wrote one generic 'Page<T>' type and one generic function 'fetchPage<T>(url)'. The list of users is now 'Page<User>' and the list of orders is 'Page<Order>', and each page gets full autocomplete for its own item type.",
`
function first<T>(items: T[]): T | undefined {
  return items[0];
}
const a = first([1, 2, 3]);             // T = number, a: number | undefined
const b = first(["x", "y"]);            // T = string

// constraint: T must have an id
function byId<T extends { id: number }>(items: T[], id: number): T | undefined {
  return items.find((item) => item.id === id);
}

// K must be a key of T; the return type follows the key
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

// generic interface with a default
interface ApiResponse<T = unknown> {
  data: T;
  error: string | null;
}
interface Page<T> {
  items: T[];
  total: number;
  next: string | null;
}

interface User { id: number; name: string; }
const users: User[] = [{ id: 1, name: "Asha" }, { id: 2, name: "Ravi" }];

const names = pluck(users, "name");     // string[]
// pluck(users, "age");
// Error: Argument of type '"age"' is not assignable to parameter of type 'keyof User'.
const response: ApiResponse<Page<User>> = {
  data: { items: users, total: 2, next: null },
  error: null,
};
console.log(a, b, byId(users, 2)?.name, names, response.data.total);
`,
"Generics were added in TypeScript 0.9 (2013), before the 1.0 release. Default types for type parameters came in TypeScript 2.3 (2017). TypeScript 5.0 (March 2023) added const type parameters, which make the compiler infer literal types for an argument.",
[["Handbook: Generics", "https://www.typescriptlang.org/docs/handbook/2/generics.html"],
 ["Generic functions", "https://www.typescriptlang.org/docs/handbook/2/functions.html#generic-functions"],
 ["TypeScript 5.0 release notes", "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html"]]),

X("Utility types",
["Utility types are generic types that come with TypeScript. Each one takes a type and gives back a changed version of it. They save you from writing almost the same type again and again. If you have a 'User' type and need 'a User where every field is optional' for an update form, you write 'Partial<User>' and you are done.",
 "The object helpers are the most used. Partial<T> makes all properties optional and Required<T> makes them all required. Readonly<T> makes them read-only. Pick<T, K> keeps only the listed properties and Omit<T, K> removes them. Record<K, V> builds an object type with keys K and values V. All of them work only on the first level of the object, not on nested objects.",
 "Other helpers work on unions and functions. Exclude<U, X> removes members from a union and Extract<U, X> keeps only the matching ones. NonNullable<T> removes null and undefined. ReturnType<F> gives the return type of a function type, Parameters<F> gives its parameters as a tuple, and Awaited<T> gives the type you get after awaiting a promise. They are very useful when a library gives you a function but does not export its types."],
["Partial, Required and Readonly change the modifiers of every property.",
 "Pick<T, 'a' | 'b'> keeps properties. Omit<T, 'a'> removes them.",
 "Record<K, V>: an object with keys of type K and values of type V.",
 "Exclude and Extract work on union members. Pick and Omit work on object properties.",
 "NonNullable<T> removes null and undefined from T.",
 "ReturnType<typeof fn> and Parameters<typeof fn> read types from an existing function.",
 "Awaited<T> unwraps promises, including nested ones."],
"A team kept four hand-written types: User, CreateUserBody, UpdateUserBody and PublicUser. When a 'phone' field was added, one of the four was forgotten and the update form silently dropped the phone number. They rewrote three of the types as Omit, Partial and Pick of User, so a new field now appears everywhere automatically.",
`
interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
}

type CreateUserBody = Omit<User, "id" | "passwordHash"> & { password: string };
type UpdateUserBody = Partial<Omit<User, "id">>;
type PublicUser = Pick<User, "id" | "name">;
type CompleteUser = Required<User>;                 // phone is now required
type FrozenUser = Readonly<User>;

type Role = "admin" | "editor" | "viewer";
const canDelete: Record<Role, boolean> = { admin: true, editor: false, viewer: false };

type Status = "draft" | "published" | "archived" | null;
type LiveStatus = Exclude<Status, "archived" | null>;   // "draft" | "published"
type Present = NonNullable<Status>;                     // no null
type OnlyDraft = Extract<Status, "draft">;              // "draft"

async function loadUser(id: number, withPosts: boolean) {
  return { id, name: "Asha", posts: withPosts ? ["Hello"] : [] };
}
type LoadResult = ReturnType<typeof loadUser>;          // Promise<{ id: number; ... }>
type LoadedUser = Awaited<LoadResult>;                  // { id: number; name: string; posts: string[] }
type LoadArgs = Parameters<typeof loadUser>;            // [id: number, withPosts: boolean]

const patch: UpdateUserBody = { phone: "+49 30 1234" };
const args: LoadArgs = [1, true];
loadUser(...args).then((u: LoadedUser) => console.log(u.posts, patch, canDelete.admin));
`,
"Partial, Readonly, Pick and Record were added in TypeScript 2.1 (December 2016) together with mapped types. Exclude, Extract, NonNullable and ReturnType came with conditional types in TypeScript 2.8 (2018). Omit was added in 3.5 (2019) and Awaited in 4.5 (2021).",
[["Utility Types reference", "https://www.typescriptlang.org/docs/handbook/utility-types.html"],
 ["Handbook: Mapped Types", "https://www.typescriptlang.org/docs/handbook/2/mapped-types.html"],
 ["TypeScript on GitHub", "https://github.com/microsoft/TypeScript"]]),

X("Enums, as const and literal unions",
["Often a value must be one of a small fixed set: a role, an order status, a direction. TypeScript gives you three ways to model this. The first is an enum: 'enum Role { Admin, Editor }'. An enum is unusual because it is not only a type. The compiler turns it into a real JavaScript object that exists at runtime. Members of a numeric enum get the values 0, 1, 2 unless you set them; members of a string enum must each get a string value.",
 "The second way is a union of literal types: 'type Role = 'admin' | 'editor''. It is only a type, so it produces no JavaScript at all. The values are plain strings, which is what APIs and databases send anyway. The third way is an object with 'as const'. The 'as const' assertion tells the compiler to keep the exact literal values and make everything read-only. From that object you can derive the union type, so you have both a runtime list of values and a type, written once.",
 "Many teams now prefer unions or 'as const' objects over enums. Enums add runtime code, numeric enums have surprising behaviour, a string enum does not accept the plain string with the same value, and enums cannot be handled by tools that only strip types. Enums are not wrong, and you will see them in many code bases, but you should be able to explain the trade-off."],
["An enum is both a type and a runtime object. A union type is only a type.",
 "Numeric enum members start at 0 and get a reverse mapping from number to name.",
 "String enums have no reverse mapping and do not accept plain string literals.",
 "'as const' gives literal types and makes the value deeply readonly at compile time.",
 "Pattern: 'const ROLES = [...] as const; type Role = (typeof ROLES)[number]'.",
 "'const enum' is inlined at compile time and has problems with one-file-at-a-time compilers.",
 "For API data, a union of string literals matches the JSON directly."],
"A project stored the numeric enum 'Status { Draft, Published }' in the database as 0 and 1. A developer added 'Review' in the middle of the list, so Published became 2 and every published article showed as 'in review'. After that incident the team moved to string literal unions, where the stored value is the readable word itself.",
`
// 1. enum: a type AND a runtime object
enum Direction { Up, Down }                 // Up = 0, Down = 1
enum LogLevel { Info = "INFO", Error = "ERROR" }

console.log(Direction.Up, Direction[0]);    // 0 "Up"  (reverse mapping)
console.log(LogLevel.Error);                // "ERROR"

// 2. union of literals: only a type, no runtime code
type Role = "admin" | "editor" | "viewer";
function can(role: Role): boolean {
  return role === "admin";
}

// 3. as const object: runtime values plus a derived type
const ORDER_STATUS = {
  Pending: "pending",
  Paid: "paid",
  Shipped: "shipped",
} as const;
type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
// "pending" | "paid" | "shipped"

const SIZES = ["s", "m", "l"] as const;     // readonly ["s", "m", "l"]
type Size = (typeof SIZES)[number];         // "s" | "m" | "l"

function isSize(value: string): value is Size {
  return (SIZES as readonly string[]).includes(value);
}

const status: OrderStatus = ORDER_STATUS.Paid;
// ORDER_STATUS.Paid = "x";
// Error: Cannot assign to 'Paid' because it is a read-only property.
console.log(can("editor"), status, isSize("xl"), Object.values(ORDER_STATUS));
`,
"Enums were part of the first TypeScript release in 2012, inspired by C#. String enums were added in TypeScript 2.4 (2017). Const assertions ('as const') were added in TypeScript 3.4 (March 2019). TypeScript 5.8 (2025) added the erasableSyntaxOnly option, which reports enums as errors for projects that run code by type stripping.",
[["Handbook: Enums", "https://www.typescriptlang.org/docs/handbook/enums.html"],
 ["TypeScript 3.4 release notes: const assertions", "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html"],
 ["Literal types", "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types"]]),

X("Classes",
["TypeScript classes are JavaScript classes with types and a few extra keywords. You declare the properties of the class with their types at the top of the class body, and the compiler checks that every property is given a value in the constructor. A class creates two things at once: a runtime value (the constructor function) and a type (the shape of its instances).",
 "Visibility keywords control who may use a member. 'public' is the default and means everyone. 'private' means only code inside the same class. 'protected' means the class and its subclasses. 'readonly' means the property can be set only in the declaration or in the constructor. A parameter property is a shortcut: writing 'constructor(private readonly db: Database)' declares the property and assigns it in one step.",
 "An abstract class is a base class that cannot be created with 'new'. It can contain finished methods and abstract methods that every subclass must write. A class can also promise to follow an interface with 'implements'; the compiler then checks that the class has everything the interface requires. Note that 'private' is checked only by the compiler. For real privacy at runtime, JavaScript has its own syntax: a property name that starts with '#'."],
["Declare properties with types in the class body. strictPropertyInitialization checks they are assigned.",
 "public (default), protected (class and subclasses), private (class only).",
 "TypeScript 'private' is compile-time only. '#name' is private at runtime too.",
 "readonly properties can only be assigned in the declaration or constructor.",
 "Parameter properties: 'constructor(private repo: Repo) {}' declares and assigns.",
 "abstract classes cannot be instantiated; subclasses must implement the abstract members.",
 "'implements' only checks the class. It does not add anything to it."],
"A backend built with NestJS has an 'OrderService' class. Its constructor is 'constructor(private readonly orders: OrderRepository, private readonly mailer: Mailer)'. The framework creates the dependencies and passes them in, and in tests the team passes simple fake objects with the same shape, which structural typing allows.",
`
interface Shape {
  area(): number;
}

abstract class BaseShape implements Shape {
  // parameter property: declares and assigns this.name
  constructor(public readonly name: string) {}

  abstract area(): number;                 // subclasses must implement

  describe(): string {
    return \`\${this.name} with area \${this.area().toFixed(2)}\`;
  }
}

class Circle extends BaseShape {
  #radius: number;                         // private at runtime
  private created = Date.now();            // private for the compiler only
  protected static count = 0;

  constructor(radius: number) {
    super("circle");
    this.#radius = radius;
    Circle.count++;
  }

  area(): number {
    return Math.PI * this.#radius ** 2;
  }

  get ageMs(): number {
    return Date.now() - this.created;
  }
}

const c = new Circle(2);
console.log(c.describe(), c.ageMs >= 0);
// c.name = "square";        // Error: Cannot assign to 'name' because it is a read-only property.
// c.created;                // Error: Property 'created' is private and only accessible within class 'Circle'.
// new BaseShape("x");       // Error: Cannot create an instance of an abstract class.
`,
"Classes with public and private members were in the first TypeScript release in 2012, three years before JavaScript got classes in ES2015. Protected was added in TypeScript 1.3 and abstract classes in 1.6. Support for JavaScript '#private' fields was added in TypeScript 3.8 (February 2020).",
[["Handbook: Classes", "https://www.typescriptlang.org/docs/handbook/2/classes.html"],
 ["MDN: Private elements", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements"],
 ["TSConfig: strictPropertyInitialization", "https://www.typescriptlang.org/tsconfig/strictPropertyInitialization.html"]]),

X("Advanced types: keyof, mapped and conditional types",
["TypeScript has a small language for building types from other types. The first tools are simple. 'keyof T' gives a union of the property names of T. 'typeof value' used in a type position gives the type of an existing variable. An indexed access type, 'T['name']', gives the type of one property. With these three you can describe one thing once and derive the rest.",
 "A mapped type is a loop over keys: '{ [K in keyof T]: ... }' creates a new object type with one property for each key of T. This is how Partial and Readonly are built. A conditional type is an if statement for types: 'T extends U ? X : Y'. Inside the condition, the keyword 'infer' lets you capture a part of the type into a new type variable, for example the element type of an array or the return type of a function.",
 "Template literal types build string types from other string types, in the same way template strings build strings. From a union of event names you can produce the union of handler names, such as 'onClick' and 'onFocus'. These tools are powerful and are used heavily inside libraries. In application code, use them when they remove real duplication, and keep them simple, because complex type code is hard to read and slows the compiler."],
["keyof T: union of the keys of T. T[K]: type of property K.",
 "typeof x in a type position reads the type of a value.",
 "Mapped type: '{ [K in keyof T]: NewType }' transforms every property.",
 "Modifiers in mapped types: '?' and 'readonly' can be added or removed with '-?' and '-readonly'.",
 "Conditional type: 'T extends U ? A : B'. It distributes over unions.",
 "'infer R' captures a part of a type inside a conditional type.",
 "Template literal types: 'on' followed by Capitalize<K> builds new string literal types."],
"A form library needs, for any data type, a matching type of validation errors and a matching type of change handlers. With a mapped type the team writes 'FormErrors<T>' and 'Handlers<T>' once. When a developer adds a 'phone' field to the form data, the compiler immediately asks for an 'onPhoneChange' handler.",
`
interface User {
  id: number;
  name: string;
  email: string;
}

type UserKey = keyof User;                    // "id" | "name" | "email"
type EmailType = User["email"];               // string

const defaults = { theme: "dark", pageSize: 20 };
type Settings = typeof defaults;              // { theme: string; pageSize: number }

// mapped types
type FormErrors<T> = { [K in keyof T]?: string };
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

// key remapping with a template literal type
type Handlers<T> = {
  [K in keyof T & string as \`on\${Capitalize<K>}Change\`]: (value: T[K]) => void;
};
// { onIdChange: (value: number) => void; onNameChange: ...; onEmailChange: ... }

// conditional types with infer
type ElementOf<T> = T extends readonly (infer E)[] ? E : never;
type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never;

type Item = ElementOf<string[]>;              // string
type Result = MyReturnType<() => Promise<User>>;   // Promise<User>

type Route = \`/\${"users" | "orders"}/\${number}\`;
const route: Route = "/users/42";             // OK
// const bad: Route = "/products/1";          // Error: not assignable to type Route

const errors: FormErrors<User> = { email: "Email is required" };
const handlers: Pick<Handlers<User>, "onNameChange"> = {
  onNameChange: (value) => console.log(value.trim()),
};
console.log(route, errors, handlers, defaults);
`,
"keyof, indexed access types and mapped types were added in TypeScript 2.1 (December 2016). Conditional types and the infer keyword came in TypeScript 2.8 (March 2018). Template literal types and key remapping with 'as' were added in TypeScript 4.1 (November 2020).",
[["Handbook: Mapped Types", "https://www.typescriptlang.org/docs/handbook/2/mapped-types.html"],
 ["Handbook: Conditional Types", "https://www.typescriptlang.org/docs/handbook/2/conditional-types.html"],
 ["Handbook: Template Literal Types", "https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html"]]),

X("Modules, declaration files and tsconfig",
["TypeScript uses the standard JavaScript module syntax: 'export' to share something from a file and 'import' to use it in another file. Types are exported and imported in the same way as values. When you import something only to use it as a type, write 'import type { User } from ...'. This makes it clear to every tool that the import can be removed completely from the output.",
 "A declaration file has the extension .d.ts. It contains only types, no running code. It describes the shape of JavaScript code so that the compiler can check your use of it. Many libraries ship their own .d.ts files. For libraries that do not, the community publishes the types in separate packages named '@types/...', for example '@types/node' or '@types/express'. tsc can also produce .d.ts files for your own code with the 'declaration' option.",
 "tsconfig.json controls all of this. 'include' selects the files. Inside 'compilerOptions', 'strict' turns on the important safety checks, 'target' sets the JavaScript version of the output, 'module' and 'moduleResolution' set how imports are written and found, and 'lib' lists which built-in APIs exist (for example the DOM). Options such as 'noEmit', 'outDir', 'skipLibCheck' and 'esModuleInterop' appear in almost every project."],
["Types are imported and exported like values. Use 'import type' for type-only imports.",
 "A file with a top-level import or export is a module. Without one it is a global script.",
 ".d.ts files contain types only and describe existing JavaScript.",
 "'npm install --save-dev @types/name' adds types for a library that has none.",
 "'strict': true is the most important line in tsconfig.json.",
 "target = which JavaScript syntax is produced. lib = which built-in APIs the checker knows.",
 "With a bundler: 'noEmit': true and 'moduleResolution': 'bundler'. For Node.js: 'module': 'nodenext'."],
"A team installed a small payment SDK that had no types, and every import of it was reported as an error. Installing '@types/...' was not possible because no such package existed. They wrote a 20 line 'payment-sdk.d.ts' file describing the three functions they used, and from then on wrong arguments to the SDK were caught by the compiler.",
`
// ---- src/models/user.ts ----
export interface User {
  id: number;
  name: string;
}
export const GUEST: User = { id: 0, name: "guest" };
export default function displayName(user: User): string {
  return user.name.trim();
}

// ---- src/app.ts ----
// import displayName, { GUEST } from "./models/user.js";
// import type { User } from "./models/user.js";      // removed from the output

// ---- src/types/payment-sdk.d.ts : types for an untyped library ----
declare module "payment-sdk" {
  export function charge(amountCents: number, currency: string): Promise<{ id: string }>;
}

// ---- tsconfig.json ----
// {
//   "compilerOptions": {
//     "target": "ES2022",
//     "module": "nodenext",
//     "strict": true,
//     "noUncheckedIndexedAccess": true,
//     "verbatimModuleSyntax": true,
//     "skipLibCheck": true,
//     "outDir": "dist",
//     "declaration": true,
//     "sourceMap": true
//   },
//   "include": ["src"]
// }
`,
"The first TypeScript versions had their own 'internal modules', later renamed namespaces; standard ES module syntax was supported from TypeScript 1.5 (2015). The @types packages on npm replaced older tools in TypeScript 2.0 (2016). The 'strict' option was added in 2.3 (2017) and 'import type' in 3.8 (2020).",
[["TSConfig reference", "https://www.typescriptlang.org/tsconfig/"],
 ["Handbook: Modules", "https://www.typescriptlang.org/docs/handbook/2/modules.html"],
 ["Declaration files: introduction", "https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html"]]),

X("Typing real-world data",
["Inside your program the compiler can prove that types are correct. At the edges it cannot. Data from an API, a form, localStorage, a URL or a file arrives at runtime, when the types no longer exist. 'JSON.parse' and 'response.json()' return any, so you can assign the result to any type you like and the compiler will not complain. The type you write there is only a hope, not a fact.",
 "The safe approach is to treat outside data as unknown and check it before use. For small cases you write a type guard: a function that returns 'value is User' and contains real runtime checks. For anything larger, use a validation library such as Zod. You describe the data once as a schema. The schema checks the data at runtime, and the TypeScript type is derived from the schema with 'z.infer', so the two can never disagree.",
 "Async code needs the same care. An async function always returns a Promise, so its return type is 'Promise<User>', and 'await' gives you the User. A rejected promise or a thrown error has no type: in a catch block the error is unknown, because JavaScript can throw anything. Check it with 'instanceof Error' before you read '.message'. Also remember that fetch does not throw on a 404 or 500 answer; you must check 'response.ok' yourself."],
["JSON.parse and response.json() return any. A type annotation there checks nothing.",
 "Validate at the edge once, then trust the types everywhere inside.",
 "Type guard: 'function isUser(v: unknown): v is User' with real checks inside.",
 "Zod: define a schema, validate with parse or safeParse, derive the type with z.infer.",
 "An async function returns Promise<T>; Awaited<T> gives the type after await.",
 "In 'catch (err)' the error is unknown. Narrow with 'instanceof Error'.",
 "fetch only rejects on network failure. Check response.ok for HTTP errors."],
"A mobile web app showed a blank page for some users. The API had started to send 'price' as the string '12.50' for one product category, and the code called 'price.toFixed(2)'. The types said number, so nobody expected it. After the team added Zod schemas at the API layer, such a change produces one clear validation error in the logs with the exact field name.",
`
import { z } from "zod";

// one schema = runtime validation + the static type
const UserSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  role: z.enum(["admin", "editor", "viewer"]),
  phone: z.string().optional(),
});
type User = z.infer<typeof UserSchema>;

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function fetchUser(id: number): Promise<Result<User>> {
  try {
    const response = await fetch(\`/api/users/\${id}\`);
    if (!response.ok) {
      return { ok: false, error: \`HTTP \${response.status}\` };
    }
    const json: unknown = await response.json();
    const parsed = UserSchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }
    return { ok: true, data: parsed.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

const result = await fetchUser(1);
if (result.ok) {
  console.log(result.data.name, result.data.role);
} else {
  console.error(result.error);
}
`,
"User-defined type guards ('value is Type') were added in TypeScript 1.6 (2015) and assertion functions in 3.7 (2019). Since TypeScript 4.4 (2021) the 'strict' option makes catch variables unknown instead of any. Zod was created by Colin McDonnell and first released in 2020.",
[["Zod documentation", "https://zod.dev/"],
 ["Handbook: type predicates", "https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates"],
 ["MDN: Using the Fetch API", "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch"]])
]});
