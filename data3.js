ROADMAP.push({
n: 5,
title: "Advanced Python",
blurb: "The machinery behind frameworks: descriptors, metaclasses, advanced typing, serialization and the power tools of the standard library.",
topics: [
T("Decorator internals",
"@decorator above a function is just shorthand for func = decorator(func). A decorator with arguments is a function that returns a decorator (three levels deep). functools.wraps copies the original name and docstring onto the wrapper. Decorators can also be classes.",
"@retry(times=3) on an API call, or @app.get('/users') in FastAPI, which registers your function in a routing table.",
`
from functools import wraps

def retry(times):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    print(f"attempt {attempt} failed: {e}")
            raise RuntimeError("all retries failed")
        return wrapper
    return decorator

@retry(times=3)
def call_api(): raise ConnectionError("timeout")
`,
"Before Python 2.4 people wrote 'f = staticmethod(f)' after the function body. PEP 318 added the @ line; functools.wraps arrived in 2.5 to fix lost function names."),

T("Descriptor protocol",
"A descriptor is an object with __get__, __set__ or __delete__ that is stored on a class and controls what happens when that attribute is accessed. It is the mechanism behind property, methods, classmethod and staticmethod.",
"ORMs such as Django and SQLAlchemy use descriptors: 'name = Column(String)' on a model class becomes a validated, database-backed attribute on every instance.",
`
class Positive:
    def __set_name__(self, owner, name): self.name = "_" + name
    def __get__(self, obj, objtype=None): return getattr(obj, self.name)
    def __set__(self, obj, value):
        if value <= 0: raise ValueError("must be positive")
        setattr(obj, self.name, value)

class Product:
    price = Positive()
    def __init__(self, price): self.price = price

Product(100)
# Product(-5) -> ValueError
`,
"Descriptors arrived in Python 2.2 (2001) as part of Guido's unification of types and classes. __set_name__ was added in 3.6."),

T("property",
"property turns a method into something that is read like a plain attribute. With a setter, it lets you validate or compute values while keeping the simple obj.x syntax.",
"A Temperature class stores celsius but exposes .fahrenheit as a computed attribute, and rejects values below absolute zero when set.",
`
class Temperature:
    def __init__(self, celsius): self.celsius = celsius

    @property
    def celsius(self): return self._celsius

    @celsius.setter
    def celsius(self, value):
        if value < -273.15: raise ValueError("below absolute zero")
        self._celsius = value

    @property
    def fahrenheit(self): return self._celsius * 9 / 5 + 32

print(Temperature(37).fahrenheit)   # 98.6
`,
"property was added in Python 2.2 (2001) and is itself a descriptor. It is why Python code does not need Java-style getX() and setX() everywhere."),

T("__getattr__ vs __getattribute__",
"__getattribute__ runs on every attribute access. __getattr__ runs only as a fallback, when normal lookup fails. Override __getattr__ for dynamic attributes; touch __getattribute__ very rarely.",
"A config object lets you write settings.database_url, and __getattr__ looks the name up in environment variables. Proxy and mock objects work the same way.",
`
import os

class Settings:
    def __getattr__(self, name):          # only if not found normally
        value = os.environ.get(name.upper())
        if value is None:
            raise AttributeError(name)
        return value

os.environ["API_KEY"] = "secret"
print(Settings().api_key)                 # secret
`,
"__getattr__ existed in classic Python 1.x classes. __getattribute__ came with new-style classes in 2.2. Module-level __getattr__ was added in 3.7 (PEP 562)."),

T("__new__ vs __init__",
"__new__ creates and returns the new object; __init__ then fills it in. You normally only write __init__. Override __new__ to control creation itself: singletons, caching instances, or subclassing immutable types like str and tuple.",
"A single shared database connection manager (singleton): __new__ returns the same instance every time someone calls ConnectionManager().",
`
class ConnectionManager:
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

print(ConnectionManager() is ConnectionManager())   # True

class Upper(str):
    def __new__(cls, text): return super().__new__(cls, text.upper())
print(Upper("hello"))                               # HELLO
`,
"__new__ was introduced in Python 2.2 (2001) so that built-in immutable types could be subclassed."),

T("Metaclasses",
"A metaclass is the class of a class. Classes are objects too, created by 'type' by default. A custom metaclass can change or check a class at the moment it is defined.",
"Django models: writing 'class Order(models.Model)' triggers a metaclass that reads your fields and builds the database mapping. Plugin systems use the same trick to auto-register classes.",
`
registry = {}

class PluginMeta(type):
    def __new__(mcls, name, bases, namespace):
        cls = super().__new__(mcls, name, bases, namespace)
        if bases:
            registry[name.lower()] = cls     # auto-register
        return cls

class Plugin(metaclass=PluginMeta): pass
class CsvExport(Plugin): pass
class PdfExport(Plugin): pass
print(list(registry))        # ['csvexport', 'pdfexport']
`,
"Metaclasses come from Smalltalk-80. In Python they became practical in 2.2. Tim Peters said: 'Metaclasses are deeper magic than 99% of users should ever worry about.' __init_subclass__ (3.6) covers most needs more simply."),

T("Protocols",
"A Protocol describes the methods an object must have, for type checkers, without requiring inheritance. It is duck typing that tools can verify: 'structural subtyping'.",
"A function accepts 'anything with a .send(message) method'. Email, SMS and test fakes all qualify without sharing a base class.",
`
from typing import Protocol

class Sender(Protocol):
    def send(self, message: str) -> None: ...

class Sms:
    def send(self, message: str) -> None: print("SMS:", message)

def notify(channel: Sender) -> None:
    channel.send("Order shipped")

notify(Sms())       # type-checks: Sms has the right shape
`,
"Protocols were added in Python 3.8 (2019, PEP 544). The same idea is how interfaces work in Go and TypeScript."),

T("Generics",
"Generics let a class or function work with any type while keeping type information. A type variable T means 'some type, the same one everywhere it appears'.",
"A Repository[T] class can be a Repository[User] or a Repository[Order]; the type checker knows get() returns the correct type for each.",
`
class Repository[T]:                    # Python 3.12+ syntax
    def __init__(self) -> None:
        self.items: dict[int, T] = {}
    def add(self, id: int, item: T) -> None:
        self.items[id] = item
    def get(self, id: int) -> T | None:
        return self.items.get(id)

def first[T](values: list[T]) -> T:
    return values[0]

names = Repository[str]()
names.add(1, "Anu")
`,
"Generics arrived with TypeVar in Python 3.5 (PEP 484). Built-in generics like list[int] came in 3.9 (PEP 585) and the clean class Box[T] syntax in 3.12 (PEP 695)."),

T("Advanced typing",
"Typing tools beyond the basics: Optional and unions, Literal (specific allowed values), TypedDict (dicts with known keys), Callable, Annotated, Final, Self, ParamSpec and overloads.",
"An API handler declares status: Literal['active', 'blocked'], so passing 'deleted' is flagged by the editor before the code ever runs.",
`
from typing import Literal, TypedDict, Callable, Final

MAX_RETRIES: Final = 3

class UserRow(TypedDict):
    id: int
    email: str

def set_status(user: UserRow, status: Literal["active", "blocked"]) -> None: ...

Handler = Callable[[UserRow], bool]
def run(handler: Handler, user: UserRow) -> bool:
    return handler(user)
`,
"The typing module has grown with almost every release: Literal, TypedDict and Final in 3.8, Annotated in 3.9, ParamSpec in 3.10, Self in 3.11, and the 'type' alias statement in 3.12."),

T("Callable objects",
"Any object that can be called with parentheses: functions, methods, classes, lambdas, and instances of classes that define __call__. An instance with __call__ behaves like a function that keeps state.",
"A rate limiter object remembers how many calls were made, and is used like a function: limiter(user_id).",
`
class Counter:
    def __init__(self): self.count = 0
    def __call__(self, step=1):
        self.count += step
        return self.count

hits = Counter()
hits(); hits()
print(hits.count, callable(hits), callable(42))   # 2 True False
`,
"__call__ has existed since Python 1.x. The built-in callable() was removed in 3.0 and brought back in 3.2 because people missed it."),

T("Dynamic class creation",
"Classes can be created while the program runs by calling type(name, bases, attributes). The 'class' statement is really shorthand for this call.",
"Building model classes from a database schema or a JSON specification at startup, as some ORMs and API clients do.",
`
def describe(self): return f"{self.__class__.__name__}({self.__dict__})"

fields = {"name": "", "price": 0}
Product = type("Product", (object,), {**fields, "describe": describe})

p = Product()
p.name, p.price = "pen", 20
print(p.describe())

from dataclasses import make_dataclass
Point = make_dataclass("Point", [("x", int), ("y", int)])
print(Point(1, 2))
`,
"Three-argument type() became available with Python 2.2's class unification. collections.namedtuple (2.6) is a famous standard-library example of creating classes dynamically."),

T("Serialization",
"Converting in-memory objects into a format that can be stored or sent (bytes or text), and back again (deserialization). Common formats are JSON, pickle, CSV, MessagePack and Protocol Buffers.",
"Saving a user's session to Redis, sending an order over an API, or writing a trained ML model to disk.",
`
import json
from dataclasses import dataclass, asdict

@dataclass
class Order:
    id: int
    items: list[str]

text = json.dumps(asdict(Order(1, ["pen"])))     # object -> text
print(text)
restored = Order(**json.loads(text))             # text -> object
print(restored)
`,
"Serialization (also called 'marshalling') is as old as networking. XML dominated the late 1990s, JSON took over in the 2000s, and Google open-sourced Protocol Buffers in 2008."),

T("Pickle",
"pickle is Python's own binary serialization format. It can save almost any Python object, including custom classes. Never unpickle data you do not trust: loading a pickle can run arbitrary code.",
"Caching an expensive computed object to disk between runs, or how multiprocessing sends objects between processes.",
`
import pickle

model = {"weights": [0.2, 0.8], "version": 3}
with open("model.pkl", "wb") as f:
    pickle.dump(model, f)

with open("model.pkl", "rb") as f:
    loaded = pickle.load(f)      # only for files you created
print(loaded == model)           # True
`,
"pickle has been in Python since the mid-1990s. The faster cPickle merged into it in 3.0, and protocol 5 (Python 3.8) added efficient handling of large data buffers."),

T("JSON",
"JSON (JavaScript Object Notation) is a lightweight text format for data, made of objects, arrays, strings, numbers, booleans and null. Python's json module converts between JSON text and dicts/lists.",
"Almost every web API sends and receives JSON, for example the response from a weather or payment API.",
`
import json

response = '{"city": "Chennai", "temp": 31.5, "rain": false, "alerts": null}'
data = json.loads(response)               # str -> dict
print(data["city"], data["rain"])         # Chennai False
print(json.dumps(data, indent=2))         # dict -> pretty str

with open("weather.json", "w") as f:
    json.dump(data, f)
`,
"JSON was specified by Douglas Crockford in the early 2000s and standardised as ECMA-404 and RFC 8259. The json module joined Python's standard library in 2.6 (2008)."),

T("Itertools",
"A module of fast, memory-efficient building blocks for working with iterators: chain, islice, groupby, product, permutations, combinations, accumulate, count, cycle, batched and more.",
"Generating every size/colour combination for a product catalogue, or processing a huge stream in batches of 500 rows.",
`
from itertools import product, combinations, chain, accumulate, batched

print(list(product(["S", "M"], ["red", "blue"])))
print(list(combinations(["anu", "bala", "chitra"], 2)))
print(list(chain([1, 2], [3], [4, 5])))
print(list(accumulate([100, 200, 50])))        # running total
print(list(batched(range(7), 3)))              # Python 3.12+
`,
"itertools was added in Python 2.3 (2003) by Raymond Hettinger, inspired by Haskell, APL and SML. batched arrived in 3.12."),

T("Functools",
"Tools for working with functions: lru_cache / cache (remember results), partial (pre-fill arguments), reduce, wraps, singledispatch (choose a function by argument type) and cached_property.",
"@lru_cache on a function that calls a slow currency-rate API means repeated requests for the same currency return instantly.",
`
from functools import lru_cache, partial

@lru_cache(maxsize=128)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)
print(fib(80))                     # instant thanks to the cache

def power(base, exp): return base ** exp
square = partial(power, exp=2)
print(square(9))                   # 81
`,
"functools was added in Python 2.5 (2006). lru_cache came in 3.2, singledispatch in 3.4, cached_property in 3.8 and cache in 3.9."),

T("Collections",
"The collections module provides specialised containers beyond list, dict and set: deque, defaultdict, Counter, OrderedDict, namedtuple and ChainMap.",
"ChainMap layers configuration so command-line options override environment settings, which override defaults. namedtuple gives readable rows from a CSV file.",
`
from collections import namedtuple, ChainMap

Point = namedtuple("Point", "x y")
p = Point(3, 4)
print(p.x, p)                      # 3 Point(x=3, y=4)

defaults = {"theme": "light", "lang": "en"}
user = {"theme": "dark"}
config = ChainMap(user, defaults)
print(config["theme"], config["lang"])   # dark en
`,
"The module began in Python 2.4 with deque and grew steadily: defaultdict (2.5), namedtuple (2.6), Counter and OrderedDict (2.7), ChainMap (3.3)."),

T("Reflection/introspection",
"The ability of a program to examine and modify itself at runtime: check an object's type, list its attributes, and get or set attributes by name with type(), isinstance(), dir(), getattr(), setattr(), hasattr() and the inspect module.",
"A command-line tool maps the text command 'export' to the method handler.export using getattr. FastAPI inspects your function's signature to learn what parameters an endpoint needs.",
`
import inspect

class Handler:
    def export(self, fmt="csv"): return f"exporting {fmt}"

h = Handler()
command = "export"
if hasattr(h, command):
    print(getattr(h, command)("pdf"))

print(inspect.signature(Handler.export))      # (self, fmt='csv')
print([n for n in dir(h) if not n.startswith("_")])
`,
"Reflection was pioneered by Lisp and Smalltalk. Python has always been highly introspective; the inspect module was added in 2.1 (2001).")
]});

ROADMAP.push({
n: 6,
title: "Concurrency",
blurb: "Doing many things at once: threads, processes and asyncio, and how to pick the right one for the job.",
topics: [
T("Processes vs threads",
"A process is a running program with its own separate memory. A thread is a lighter unit of execution inside a process; threads share the same memory. Processes are isolated and heavier; threads are cheap but need care with shared data.",
"Your browser runs each tab as a separate process, so one crashed tab does not kill the others, while each tab uses several threads to download images and run scripts.",
`
import os, threading, multiprocessing

def show():
    print("pid", os.getpid(), "thread", threading.current_thread().name)

if __name__ == "__main__":
    threading.Thread(target=show).start()           # same pid
    multiprocessing.Process(target=show).start()    # new pid
`,
"Processes come from 1960s time-sharing systems such as Multics. Threads became mainstream in the 1990s with POSIX threads (1995) and multi-core CPUs in the 2000s."),

T("GIL",
"The Global Interpreter Lock is a lock in CPython that lets only one thread run Python bytecode at a time. Threads therefore do not speed up CPU-heavy Python code, but they still help with I/O, because the GIL is released while waiting.",
"A team adds 8 threads to an image-processing script written in pure Python and sees no speed-up: the GIL. (C libraries such as NumPy release the GIL during heavy work, so threads can help there.) Switching to multiprocessing uses all 8 cores.",
`
import threading, time

def count(n):
    while n: n -= 1

start = time.perf_counter()
threads = [threading.Thread(target=count, args=(10_000_000,)) for _ in range(2)]
for t in threads: t.start()
for t in threads: t.join()
print(f"2 threads: {time.perf_counter() - start:.2f}s")   # no faster than 1
`,
"The GIL was added in 1992 when threads were first supported, to keep reference counting simple and safe. After decades of debate, PEP 703 delivered an optional free-threaded build in Python 3.13 (2024), officially supported from 3.14."),

T("CPU-bound vs I/O-bound",
"A CPU-bound task spends its time computing (maths, image processing, parsing). An I/O-bound task spends its time waiting (network calls, disk, databases). Rule of thumb: multiprocessing for CPU-bound, threads or asyncio for I/O-bound.",
"Resizing 10,000 photos is CPU-bound: use processes. Downloading 10,000 photos is I/O-bound: use asyncio or threads.",
`
import time

def cpu_bound(n):               # busy computing
    return sum(i * i for i in range(n))

def io_bound():                 # mostly waiting
    time.sleep(1)               # stands in for a network call

# CPU-bound -> ProcessPoolExecutor
# I/O-bound -> ThreadPoolExecutor or asyncio
`,
"The distinction comes from operating-system scheduling research in the 1960s. It became the key design question for Python because of the GIL."),

T("threading",
"The threading module runs functions in separate threads inside one process. Create a Thread, start() it, and join() to wait for it to finish. Best for I/O-bound work.",
"A desktop app downloads a file in a background thread so the window does not freeze, or a script checks 50 URLs at once.",
`
import threading, time

def download(name):
    time.sleep(1)                    # pretend network wait
    print("downloaded", name)

threads = [threading.Thread(target=download, args=(f"file{i}",)) for i in range(5)]
for t in threads: t.start()
for t in threads: t.join()
print("all done in about 1 second, not 5")
`,
"Python got a low-level 'thread' module in 1992. The friendlier threading module, modelled on Java's threads, was added in Python 1.5.2 (1999)."),

T("multiprocessing",
"The multiprocessing module starts separate Python processes, each with its own interpreter and its own GIL, so CPU-heavy work really runs in parallel across cores.",
"A video platform encodes uploaded videos using all 16 cores of a server, with a pool of worker processes.",
`
from multiprocessing import Pool

def heavy(n):
    return sum(i * i for i in range(n))

if __name__ == "__main__":           # required: child processes re-import this file
    with Pool(processes=4) as pool:
        results = pool.map(heavy, [5_000_000] * 8)
    print(len(results), "jobs done on 4 cores")
`,
"multiprocessing started as the third-party 'pyprocessing' package by Richard Oudkerk and joined the standard library in Python 2.6 (2008, PEP 371)."),

T("concurrent.futures",
"A simple, high-level interface for running work in a pool of threads (ThreadPoolExecutor) or processes (ProcessPoolExecutor). submit() returns a Future, and map() runs a function over many inputs.",
"A price-comparison site calls 20 supplier APIs in parallel using a thread pool and shows results as they arrive.",
`
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

def fetch_price(shop):
    time.sleep(1)
    return shop, 100 + len(shop)

with ThreadPoolExecutor(max_workers=5) as pool:
    futures = [pool.submit(fetch_price, s) for s in ["amazon", "flipkart", "croma"]]
    for f in as_completed(futures):
        print(f.result())
`,
"Added in Python 3.2 (2011, PEP 3148) by Brian Quinlan, modelled on Java's java.util.concurrent."),

T("asyncio",
"asyncio is Python's library for writing concurrent code with async/await on a single thread. Tasks voluntarily give up control whenever they wait for I/O, so thousands of connections can be handled at once.",
"A chat server holding 50,000 open WebSocket connections, or a web scraper fetching 1,000 pages at the same time, all in one thread.",
`
import asyncio

async def fetch(name, delay):
    await asyncio.sleep(delay)           # non-blocking wait
    return f"{name} done"

async def main():
    results = await asyncio.gather(fetch("a", 1), fetch("b", 1), fetch("c", 1))
    print(results)                       # takes 1 second, not 3

asyncio.run(main())
`,
"asyncio (codename 'Tulip') was designed by Guido van Rossum and added in Python 3.4 (2014, PEP 3156), building on ideas from Twisted (2002) and Tornado. asyncio.run() came in 3.7."),

T("Event loop",
"The event loop is the engine of asyncio. It keeps a list of tasks, runs one until it hits an 'await' that has to wait, then switches to another that is ready. One blocking call (like time.sleep) freezes the whole loop.",
"Like a single waiter serving many tables: take an order, hand it to the kitchen, serve other tables while the food cooks. A waiter who stands at the kitchen door waiting blocks every table.",
`
import asyncio, time

async def good():
    await asyncio.sleep(1)          # loop is free to do other work

async def bad():
    time.sleep(1)                   # BLOCKS the whole loop

async def main():
    loop = asyncio.get_running_loop()
    # run blocking code in a thread so the loop stays free
    await loop.run_in_executor(None, time.sleep, 1)
    await asyncio.to_thread(time.sleep, 1)     # simpler, 3.9+

asyncio.run(main())
`,
"Event loops power GUI toolkits, Nginx (2004) and Node.js (2009). The faster uvloop (2016), built on libuv, is commonly used with FastAPI in production."),

T("Coroutines",
"A coroutine is a function defined with 'async def' that can pause at 'await' and resume later. Calling it does not run it; it returns a coroutine object that must be awaited or scheduled.",
"Each incoming HTTP request in FastAPI is handled by a coroutine that pauses while waiting for the database, letting other requests proceed.",
`
import asyncio

async def get_user(user_id):
    await asyncio.sleep(0.5)        # pretend database call
    return {"id": user_id, "name": "Anu"}

coro = get_user(1)                  # nothing has run yet
print(type(coro))                   # <class 'coroutine'>
print(asyncio.run(coro))            # now it runs
`,
"The term was coined by Melvin Conway in 1958. Python first built coroutines from generators (PEP 342 in 2.5), then gave them their own syntax in 3.5."),

T("Tasks",
"A Task wraps a coroutine and schedules it on the event loop, concurrently with other tasks; it starts running the next time the current code reaches an await. Create one with asyncio.create_task() or inside an asyncio.TaskGroup.",
"When an order is placed, start three tasks at once: charge the card, reserve the stock and send the confirmation email.",
`
import asyncio

async def step(name, delay):
    await asyncio.sleep(delay)
    return name

async def main():
    async with asyncio.TaskGroup() as tg:           # Python 3.11+
        pay = tg.create_task(step("payment", 1))
        stock = tg.create_task(step("stock", 1))
    print(pay.result(), stock.result())             # both done after 1s

asyncio.run(main())
`,
"create_task() arrived in Python 3.7. TaskGroup, with 'structured concurrency' inspired by the Trio library, was added in 3.11 (2022)."),

T("Futures",
"A Future is a placeholder for a result that is not ready yet. You can check if it is done, wait for it, or attach a callback. A Task is a Future that runs a coroutine.",
"Like a restaurant token: you get it immediately, keep doing other things, and exchange it for the food when it is ready.",
`
from concurrent.futures import ThreadPoolExecutor
import time

def slow_report():
    time.sleep(1)
    return "report ready"

with ThreadPoolExecutor() as pool:
    future = pool.submit(slow_report)
    print(future.done())          # False, still running
    print(future.result())        # waits, then 'report ready'
`,
"Futures and promises were proposed in 1976-77 by Daniel Friedman, David Wise, Peter Hibbard and Henry Baker. JavaScript's Promise is the same idea."),

T("async / await",
"'async def' declares a coroutine. 'await' pauses it until the awaited operation finishes, handing control back to the event loop meanwhile. Also: 'async for' and 'async with' for asynchronous iteration and context managers.",
"An API endpoint awaits a database query and an external API call. During both waits, the server handles other users' requests.",
`
import asyncio

async def get_orders(user_id):
    await asyncio.sleep(0.3)
    return ["order1", "order2"]

async def get_profile(user_id):
    await asyncio.sleep(0.3)
    return {"name": "Anu"}

async def dashboard(user_id):
    profile, orders = await asyncio.gather(get_profile(user_id), get_orders(user_id))
    return {**profile, "orders": orders}

print(asyncio.run(dashboard(1)))
`,
"The async/await syntax was added in Python 3.5 (2015, PEP 492) by Yury Selivanov, following C# 5.0 (2012). JavaScript got it in 2017."),

T("Semaphore",
"A semaphore is a counter that limits how many tasks may use a resource at the same time. It allows up to N holders; the rest wait their turn.",
"A scraper limits itself to 10 simultaneous requests to a website so it does not overload the site or get banned.",
`
import asyncio

async def fetch(i, sem):
    async with sem:                      # at most 3 inside at once
        print("fetching", i)
        await asyncio.sleep(1)

async def main():
    sem = asyncio.Semaphore(3)
    await asyncio.gather(*(fetch(i, sem) for i in range(9)))

asyncio.run(main())
`,
"The semaphore was invented by Dutch computer scientist Edsger Dijkstra in the early 1960s. It is named after railway signals."),

T("Locks",
"A lock (mutex) lets only one thread or task into a section of code at a time. It prevents race conditions, where two workers read and write shared data at the same moment and corrupt it.",
"Two people book the last cinema seat at the same instant. Without a lock both succeed; with a lock only the first one does.",
`
import threading

seats = 1
lock = threading.Lock()

def book(user):
    global seats
    with lock:                         # one thread at a time
        if seats > 0:
            seats -= 1
            print(user, "booked")
        else:
            print(user, "sold out")

for u in ["anu", "bala"]:
    threading.Thread(target=book, args=(u,)).start()
`,
"Mutual exclusion was first formulated by Dijkstra in 1965. Careless locking leads to deadlock, where two threads wait for each other forever."),

T("Queues",
"A thread-safe or async-safe queue passes work between producers (who add items) and consumers (who process them). It handles all the locking for you.",
"A web app puts 'send welcome email' jobs on a queue, and three worker tasks take jobs off and send them in the background.",
`
import asyncio

async def worker(name, queue):
    while True:
        job = await queue.get()
        print(name, "processing", job)
        await asyncio.sleep(0.5)
        queue.task_done()

async def main():
    queue = asyncio.Queue()
    for i in range(6): queue.put_nowait(f"email-{i}")
    workers = [asyncio.create_task(worker(f"w{n}", queue)) for n in range(3)]
    await queue.join()
    for w in workers: w.cancel()

asyncio.run(main())
`,
"The producer-consumer problem was described by Dijkstra in 1965. Python's queue module dates from the 1990s; asyncio.Queue came with asyncio in 3.4."),

T("Async database calls",
"Using an async database driver (asyncpg, aiomysql, motor, or SQLAlchemy's async mode) so a query does not block the event loop while waiting for the database.",
"A FastAPI service handling 2,000 requests per second: each request awaits its query, and one process serves them all instead of needing 2,000 threads.",
`
import asyncio
import asyncpg                     # pip install asyncpg

async def main():
    pool = await asyncpg.create_pool("postgresql://user:pass@localhost/shop")
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, name FROM users WHERE active = $1", True)
        for row in rows:
            print(row["id"], row["name"])
    await pool.close()

asyncio.run(main())
`,
"asyncpg was released in 2016 by the MagicStack team (authors of uvloop). SQLAlchemy added official asyncio support in version 1.4 (2021)."),

T("Async API calls",
"Making HTTP requests with an async client such as httpx or aiohttp so that many calls can be in flight at once without threads.",
"A travel site queries 15 airline APIs at the same time and returns combined results in the time of the slowest one, not the sum of all.",
`
import asyncio
import httpx                       # pip install httpx

async def main():
    urls = ["https://httpbin.org/delay/1"] * 5
    async with httpx.AsyncClient(timeout=10) as client:
        responses = await asyncio.gather(*(client.get(u) for u in urls))
    print([r.status_code for r in responses])    # about 1s total

asyncio.run(main())
`,
"aiohttp appeared in 2013-14 alongside asyncio. httpx, by Tom Christie (also the author of Django REST Framework), arrived in 2019 with both sync and async APIs.")
]});
