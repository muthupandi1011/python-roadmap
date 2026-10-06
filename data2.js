ROADMAP.push({
n: 3,
title: "Core Python",
blurb: "How Python really works underneath: references, memory, iterators, generators, decorators, context managers and error handling.",
topics: [
T("References and object identity",
"A variable does not contain a value; it holds a reference to an object in memory. Two names can refer to the same object. '==' asks 'are the values equal?' while 'is' asks 'is it the very same object?'. id() shows an object's identity.",
"Two parts of a program hold the same config dict. One changes a setting and the other sees the change, which is either convenient sharing or a hidden bug.",
`
a = [1, 2, 3]
b = a              # same object
c = [1, 2, 3]      # equal but different object
print(a == c)      # True
print(a is c)      # False
print(a is b)      # True
print(id(a) == id(b))
`,
"Python's model is called 'call by object reference' (or 'call by sharing'), a term coined by Barbara Liskov for the CLU language in 1974. In CPython, id() is the object's memory address."),

T("Shallow vs deep copy",
"A shallow copy creates a new outer container but shares the inner objects. A deep copy duplicates everything, all the way down, so the copy is fully independent.",
"Copying an order template that contains a list of items: with a shallow copy, adding an item to the copy also changes the template. A deep copy keeps the template safe.",
`
import copy

template = {"items": ["pen"]}
shallow = copy.copy(template)
deep = copy.deepcopy(template)
shallow["items"].append("bag")
print(template)     # {'items': ['pen', 'bag']}  affected!
deep["items"].append("book")
print(template)     # unchanged by the deep copy
`,
"The copy module has been in the standard library since Python 1.x. The shallow/deep distinction goes back to Lisp and Smalltalk in the 1970s."),

T("Python memory model",
"Every value is an object stored on a private heap managed by Python. Each object has an identity, a type, a value and a reference count. Names live in namespaces and point to objects. CPython reuses small objects such as small integers and short strings.",
"A service loading 10 million records runs out of memory. Understanding that every int is a full object (28 bytes) explains why, and leads to using arrays, NumPy or generators instead.",
`
import sys

x = 42
print(sys.getsizeof(x))             # 28 bytes for one int
print(sys.getsizeof([1, 2, 3]))     # the list object itself
a = 256
b = 256
print(a is b)                       # True: small ints are cached
`,
"CPython's small-object allocator, pymalloc, was written by Vladimir Marangozov and became the default in Python 2.3 (2003). Caching of the integers -5 to 256 is a long-standing CPython optimisation."),

T("Garbage collection",
"Automatic freeing of memory that is no longer used. CPython mainly uses reference counting: when the number of references to an object drops to zero, it is freed at once. A separate cycle collector finds groups of objects that only refer to each other.",
"A long-running web server would slowly eat all the RAM if memory were not reclaimed. Knowing how GC works helps you find leaks, such as a global cache that keeps growing.",
`
import gc
import sys

data = [1, 2, 3]
print(sys.getrefcount(data))    # reference count (exact number varies by Python version)
a = {}
b = {"other": a}
a["other"] = b                  # a cycle
del a, b
print(gc.collect())             # cycle collector frees them
`,
"Garbage collection was invented by John McCarthy for Lisp in 1959. Python used only reference counting until 2.0 (2000), when Neil Schemenauer's cycle collector was added."),

T("Iterators",
"An iterator is an object that hands out one item at a time. It has __next__() to return the next item (raising StopIteration at the end) and __iter__(). An 'iterable' is anything you can get an iterator from, like a list.",
"Reading a 20 GB log file line by line: the file object is an iterator, so only one line is in memory at a time.",
`
numbers = [10, 20, 30]
it = iter(numbers)
print(next(it))     # 10
print(next(it))     # 20

class Countdown:
    def __init__(self, n): self.n = n
    def __iter__(self): return self
    def __next__(self):
        if self.n <= 0: raise StopIteration
        self.n -= 1
        return self.n + 1
print(list(Countdown(3)))   # [3, 2, 1]
`,
"The iterator protocol was added in Python 2.2 (2001, PEP 234). Before that, for loops called __getitem__ with 0, 1, 2... until an IndexError."),

T("Generators",
"A generator is a function that produces a series of values lazily, one at a time, pausing between each. It is the easy way to write an iterator and uses almost no memory.",
"Streaming a million database rows to a CSV export without loading them all, or producing an endless series of unique order IDs.",
`
def read_orders(path):
    with open(path) as f:
        for line in f:
            yield line.strip()     # one line at a time

def order_ids(start=1000):
    while True:
        yield start
        start += 1
ids = order_ids()
print(next(ids), next(ids))        # 1000 1001
`,
"Generators arrived in Python 2.2 (2001, PEP 255), inspired by the Icon language. They later became the foundation that coroutines and asyncio were built on."),

T("yield",
"'yield' is the keyword that makes a function a generator. It hands a value to the caller and freezes the function, keeping all its local variables, until the next value is requested. 'yield from' delegates to another generator.",
"Paginating through an API: fetch page 1, yield its items, and fetch page 2 only if the caller keeps asking.",
`
def fetch_all(pages):
    for page in pages:
        print("fetching", page)
        yield from page_items(page)

def page_items(page):
    yield f"{page}-a"
    yield f"{page}-b"

for item in fetch_all(["p1", "p2"]):
    print(item)
`,
"yield came with generators in 2.2. Python 2.5 (PEP 342) made it an expression so values could be sent in, and Python 3.3 (PEP 380) added 'yield from'."),

T("Generator expressions",
"A generator expression looks like a list comprehension with round brackets. It computes items lazily instead of building the whole list in memory.",
"Summing the sizes of a million files: sum(size for size in sizes) never builds a million-item list.",
`
orders = [450, 1200, 3000, 800]
total = sum(o * 1.18 for o in orders)          # no list created
has_big = any(o > 2500 for o in orders)
print(total, has_big)

squares = (n * n for n in range(10**9))        # instant, lazy
print(next(squares), next(squares))            # 0 1
`,
"Generator expressions were added in Python 2.4 (2004, PEP 289) as the memory-friendly sibling of list comprehensions."),

T("Decorators",
"A decorator is a function that takes another function and returns an enhanced version of it. You apply it with @name above a function, adding behaviour without changing the function's own code.",
"Adding login checks (@login_required), timing (@timer), caching (@lru_cache) or retries to many functions with a single line each.",
`
import time
from functools import wraps

def timer(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {time.perf_counter() - start:.3f}s")
        return result
    return wrapper

@timer
def build_report():
    time.sleep(0.2)
build_report()
`,
"The @ syntax was added in Python 2.4 (2004, PEP 318) after a long debate over the symbol. Class decorators followed in Python 2.6."),

T("Closures",
"A closure is an inner function that remembers the variables of the outer function where it was created, even after the outer function has finished.",
"Creating customised functions: make_discount(10) and make_discount(25) return two functions, each remembering its own percentage.",
`
def make_discount(percent):
    def apply(price):
        return price - price * percent / 100   # remembers percent
    return apply

festival = make_discount(25)
member = make_discount(10)
print(festival(1000), member(1000))    # 750.0 900.0
`,
"Peter Landin introduced the idea and the name 'closure' in 1964, and the Scheme language (1975) made them a standard feature. Python added nested scopes as an option in 2.1 (2001, PEP 227) and made them the default in 2.2."),

T("Context managers",
"A context manager sets something up and guarantees it is cleaned up afterwards, even if an error happens. It defines __enter__ and __exit__, or is written with @contextmanager.",
"Opening a database transaction: commit if all goes well, roll back if anything fails, and always return the connection to the pool.",
`
from contextlib import contextmanager

@contextmanager
def transaction(db):
    print("BEGIN")
    try:
        yield db
        print("COMMIT")
    except Exception:
        print("ROLLBACK")
        raise

with transaction("db") as conn:
    print("insert order using", conn)
`,
"Context managers and the with statement came in Python 2.5 (2006, PEP 343). The idea is close to RAII in C++."),

T("with",
"The 'with' statement runs a block of code inside a context manager. It calls __enter__ at the start and always calls __exit__ at the end, replacing bulky try/finally code.",
"Opening a file with 'with' guarantees it is closed. The same goes for locks, network connections and temporary folders.",
`
with open("report.txt", "w", encoding="utf-8") as f:
    f.write("sales: 42")
# the file is closed here, even if write() failed

import threading
lock = threading.Lock()
with lock:               # acquired, then always released
    print("safe section")
`,
"'with' needed 'from __future__ import with_statement' in Python 2.5 and became a full keyword in 2.6 (2008). Parenthesised multi-line with statements arrived in 3.10."),

T("Exceptions",
"An exception is an error raised while the program runs. Wrap risky code in try, handle specific errors in except, run code on success in else, and always-run cleanup in finally. Raise your own with 'raise'.",
"A payment API call can time out. Catch the timeout, log it and show 'please try again' instead of crashing the whole checkout.",
`
def divide(a, b):
    try:
        result = a / b
    except ZeroDivisionError:
        print("Cannot divide by zero")
        return None
    else:
        return result
    finally:
        print("done")

divide(10, 0)
int_value = int("42") if "42".isdigit() else 0
`,
"Exception handling was pioneered in PL/I and CLU in the 1960s-70s. Python had it from the start, modelled on Modula-3. Exceptions became classes in Python 1.5, and exception groups (except*) arrived in 3.11."),

T("Custom exceptions",
"Your own exception classes, made by inheriting from Exception. They give errors meaningful names for your business domain and let callers catch exactly the failure they care about.",
"A banking app raises InsufficientFundsError and AccountLockedError so the UI can show a different message for each.",
`
class PaymentError(Exception):
    """Base error for the payments module."""

class InsufficientFundsError(PaymentError):
    def __init__(self, balance, amount):
        super().__init__(f"Need {amount}, have {balance}")
        self.shortfall = amount - balance

try:
    raise InsufficientFundsError(500, 800)
except PaymentError as e:
    print(e, e.shortfall)
`,
"String exceptions (raise 'oops') were allowed in early Python and removed completely in 2.6. Since Python 3.0 every exception must be a class derived from BaseException."),

T("Logging",
"The logging module records what a program is doing, with levels (DEBUG, INFO, WARNING, ERROR, CRITICAL), timestamps and destinations such as console or files. It replaces print() in real applications.",
"When a customer says 'my order failed at 3 pm', engineers search the logs for that order ID to see exactly what happened.",
`
import logging

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("orders")

log.info("Order %s created", 1042)
try:
    1 / 0
except ZeroDivisionError:
    log.exception("Order %s failed", 1042)   # includes the traceback
`,
"The logging module was added in Python 2.3 (2003, PEP 282), written by Vinay Sajip and modelled on Java's log4j."),

T("Type hints",
"Optional annotations that state the expected types of variables, arguments and return values. Python does not enforce them at runtime; tools like mypy, pyright and your editor use them to catch bugs early.",
"In a large codebase, hints let the editor autocomplete correctly and warn you before release that you passed a string where an int was expected. FastAPI and Pydantic use hints to validate data.",
`
def total_price(prices: list[float], tax: float = 0.18) -> float:
    return sum(prices) * (1 + tax)

def find(user_id: int) -> str | None:
    users: dict[int, str] = {1: "Anu"}
    return users.get(user_id)

print(total_price([100.0, 250.0]))
`,
"Function annotations appeared in Python 3.0, and type hints were standardised in 3.5 (2015, PEP 484), driven by Guido and the mypy project. list[int] works since 3.9 and X | Y since 3.10."),

T("Dataclasses",
"The @dataclass decorator writes the boring parts of a data-holding class for you: __init__, __repr__ and __eq__ are generated from the annotated fields.",
"Representing an Order, a Product or a config object with a few fields, without writing 20 lines of boilerplate for each.",
`
from dataclasses import dataclass, field

@dataclass
class Order:
    id: int
    customer: str
    items: list[str] = field(default_factory=list)
    paid: bool = False

o = Order(1, "Anu", ["pen"])
print(o)                           # Order(id=1, customer='Anu', ...)
print(o == Order(1, "Anu", ["pen"]))   # True
`,
"Dataclasses were added in Python 3.7 (2018, PEP 557) by Eric V. Smith, inspired by the third-party 'attrs' library. slots=True and kw_only came in 3.10."),

T("Enum",
"An Enum is a fixed set of named constants. Use it instead of loose strings or magic numbers when a value must be one of a few known options.",
"An order's status can only be PENDING, PAID, SHIPPED or CANCELLED. An Enum prevents typos like 'shiped' reaching the database.",
`
from enum import Enum

class Status(Enum):
    PENDING = "pending"
    PAID = "paid"
    SHIPPED = "shipped"

s = Status.PAID
print(s.name, s.value)           # PAID paid
print(Status("shipped"))         # Status.SHIPPED
print(s is Status.PAID)          # True
`,
"The enum module was added in Python 3.4 (2014, PEP 435) after years of people writing their own versions. StrEnum arrived in 3.11.")
]});

ROADMAP.push({
n: 4,
title: "Object-Oriented Programming",
blurb: "Modelling real things as objects that bundle data with behaviour, and the principles that keep large codebases maintainable.",
topics: [
T("Classes and objects",
"A class is a blueprint that describes data (attributes) and behaviour (methods). An object, or instance, is one concrete thing built from that blueprint.",
"BankAccount is the class. Anu's account and Bala's account are two objects, each with its own balance but the same deposit and withdraw behaviour.",
`
class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        self.balance += amount

anu = BankAccount("Anu", 1000)
anu.deposit(500)
print(anu.owner, anu.balance)     # Anu 1500
`,
"Object-oriented programming began with Simula 67 in Norway (1967) and was shaped by Smalltalk in the 1970s. Python had classes from its first release; in Python everything, even an int, is an object."),

T("__init__",
"__init__ is the initialiser method that runs automatically right after an object is created. It sets up the object's starting attributes. 'self' is the object being set up.",
"When a new user signs up, User('anu@x.com') runs __init__, which stores the email, sets created_at to now and marks the account as unverified.",
`
from datetime import datetime

class User:
    def __init__(self, email):
        self.email = email.lower()
        self.created_at = datetime.now()
        self.verified = False

u = User("Anu@Example.com")
print(u.email, u.verified)
`,
"__init__ dates from early Python. Strictly it is an initialiser, not a constructor: the object is actually created by __new__ first. The explicit 'self' was borrowed from Modula-3."),

T("Instance/class/static methods",
"An instance method takes 'self' and works on one object. A class method (@classmethod) takes 'cls' and works on the class itself, often as an alternative constructor. A static method (@staticmethod) takes neither; it is a plain function kept inside the class.",
"Pizza(size).price() is an instance method, Pizza.from_string('large-veg') is a class method that builds a pizza, and Pizza.is_valid('xl') is a static helper.",
`
class Pizza:
    sizes = {"small": 199, "large": 399}

    def __init__(self, size): self.size = size
    def price(self): return self.sizes[self.size]

    @classmethod
    def from_string(cls, text): return cls(text.split("-")[0])

    @staticmethod
    def is_valid(size): return size in Pizza.sizes

print(Pizza.from_string("large-veg").price(), Pizza.is_valid("xl"))
`,
"classmethod and staticmethod were introduced in Python 2.2 (2001) with new-style classes. The neat @ syntax for them came in 2.4."),

T("Encapsulation",
"Bundling data with the methods that work on it, and hiding internal details so the outside world uses a safe public interface. Python uses conventions: _name means 'internal', and __name triggers name mangling.",
"A bank account's balance cannot be set directly to any number. It can only change through deposit() and withdraw(), which enforce the rules.",
`
class Account:
    def __init__(self):
        self._balance = 0          # internal by convention

    def withdraw(self, amount):
        if amount > self._balance:
            raise ValueError("Insufficient funds")
        self._balance -= amount

    @property
    def balance(self):             # read-only view
        return self._balance
`,
"The idea comes from David Parnas's 1972 paper on information hiding. Python chose convention over enforcement, summed up by the saying 'we are all consenting adults here'."),

T("Abstraction",
"Showing only what something does and hiding how it does it. Users of a class work with a simple interface and do not need to know the complex details inside.",
"Calling payment.charge(500) works the same whether the money goes through UPI, a card or a wallet. The messy gateway details are hidden.",
`
class EmailService:
    def send(self, to, subject, body):
        self._connect()
        self._authenticate()
        self._deliver(to, subject, body)

    def _connect(self): print("connecting to SMTP")
    def _authenticate(self): print("logging in")
    def _deliver(self, to, s, b): print("sent to", to)

EmailService().send("a@x.com", "Hi", "Welcome")   # one simple call
`,
"Abstract data types were formalised by Barbara Liskov and Stephen Zilles in 1974. Abstraction is one of the 'four pillars' of OOP with encapsulation, inheritance and polymorphism."),

T("Inheritance",
"A child class takes over the attributes and methods of a parent class, and can add new ones or override existing ones. It models an 'is-a' relationship.",
"SavingsAccount and CurrentAccount both inherit from Account. They share deposit and withdraw, while SavingsAccount adds add_interest().",
`
class Employee:
    def __init__(self, name, salary):
        self.name, self.salary = name, salary
    def pay(self): return self.salary

class Manager(Employee):
    def __init__(self, name, salary, bonus):
        super().__init__(name, salary)
        self.bonus = bonus
    def pay(self): return self.salary + self.bonus   # override

print(Manager("Devi", 90000, 15000).pay())    # 105000
`,
"Inheritance was introduced by Simula 67. Python supported multiple inheritance from the start. Since Python 3.0 every class inherits from 'object'."),

T("Polymorphism",
"'Many forms': the same method call works on different types of objects, and each responds in its own way. Python uses duck typing: if an object has the method, it works, whatever its class.",
"A notification system loops over [EmailSender, SmsSender, PushSender] and calls .send(message) on each without checking the type.",
`
class Email:
    def send(self, msg): print("Email:", msg)
class Sms:
    def send(self, msg): print("SMS:", msg)
class Push:
    def send(self, msg): print("Push:", msg)

for channel in [Email(), Sms(), Push()]:
    channel.send("Your order has shipped")
`,
"The term was formalised by Christopher Strachey in 1967. 'Duck typing' (if it walks like a duck and quacks like a duck...) was popularised in the Python community by Alex Martelli around 2000."),

T("Composition",
"Building a class out of other objects ('has-a') instead of inheriting from them ('is-a'). It is usually more flexible than inheritance, because parts can be swapped.",
"A Car has an Engine and has a GPS. You can replace a petrol engine with an electric one without redesigning the whole class tree.",
`
class PetrolEngine:
    def start(self): return "vroom"
class ElectricEngine:
    def start(self): return "hum"

class Car:
    def __init__(self, engine):
        self.engine = engine          # has-a
    def start(self): return self.engine.start()

print(Car(ElectricEngine()).start())  # hum
`,
"'Favor object composition over class inheritance' is a famous rule from the 1994 'Gang of Four' book Design Patterns."),

T("MRO",
"Method Resolution Order is the order in which Python searches classes for a method when multiple inheritance is involved. It is calculated by the C3 linearisation algorithm and visible in ClassName.__mro__.",
"A class LoggedCachedService(LoggingMixin, CacheMixin, Service) calls save(). The MRO decides which class's save() runs first and which runs next.",
`
class A:
    def hello(self): return "A"
class B(A):
    def hello(self): return "B"
class C(A):
    def hello(self): return "C"
class D(B, C):
    pass

print(D().hello())                         # B
print([c.__name__ for c in D.__mro__])     # ['D', 'B', 'C', 'A', 'object']
`,
"The C3 algorithm was designed for the Dylan language in 1996. Python adopted it in 2.3 (2003) to fix inconsistencies in the earlier 'diamond problem' handling."),

T("super()",
"super() gives access to the next class in the MRO, usually the parent. It is used to call the parent's version of a method, most often __init__, so you extend behaviour instead of replacing it.",
"A PremiumUser first runs the normal User setup with super().__init__(), then adds its own premium fields.",
`
class User:
    def __init__(self, name):
        self.name = name
    def describe(self): return f"User {self.name}"

class PremiumUser(User):
    def __init__(self, name, plan):
        super().__init__(name)
        self.plan = plan
    def describe(self):
        return super().describe() + f" on {self.plan}"

print(PremiumUser("Anu", "gold").describe())
`,
"super was added in Python 2.2 (2001) and had to be written super(ClassName, self). The zero-argument super() came in Python 3.0 (PEP 3135)."),

T("Magic/dunder methods",
"Special methods with double underscores (dunder) such as __str__, __len__, __eq__ and __add__. Python calls them automatically for built-in operations, so your objects can work with print, len, ==, + and loops.",
"A Money class defines __add__ so that Money(100) + Money(50) works, and __str__ so that printing shows 'Rs.150'.",
`
class Money:
    def __init__(self, amount): self.amount = amount
    def __add__(self, other): return Money(self.amount + other.amount)
    def __eq__(self, other): return self.amount == other.amount
    def __lt__(self, other): return self.amount < other.amount
    def __repr__(self): return f"Money({self.amount})"
    def __str__(self): return f"Rs.{self.amount}"

total = Money(100) + Money(50)
print(total, repr(total), total == Money(150))
`,
"Special methods have been part of Python's 'data model' since the 1990s. This design is why libraries like NumPy and pandas feel like part of the language."),

T("Abstract base classes",
"An abstract base class (ABC) defines methods that subclasses must implement. It cannot be instantiated itself. It is a contract enforced by Python.",
"Every payment gateway class must implement charge() and refund(). If a developer forgets one, Python raises an error when the object is created, not later in production.",
`
from abc import ABC, abstractmethod

class PaymentGateway(ABC):
    @abstractmethod
    def charge(self, amount): ...

class Upi(PaymentGateway):
    def charge(self, amount): return f"UPI charged {amount}"

print(Upi().charge(500))
# PaymentGateway()  -> TypeError: Can't instantiate abstract class PaymentGateway ...
`,
"The abc module was added in Python 2.6 and 3.0 (2008, PEP 3119), with ready-made ABCs like Sequence and Mapping in collections.abc."),

T("SOLID principles",
"Five design rules for maintainable object-oriented code. S: a class has one responsibility. O: open for extension, closed for modification. L: subclasses must be usable in place of parents. I: prefer small interfaces. D: depend on abstractions, not concrete classes.",
"An Invoice class that calculates totals, saves to the database and sends emails breaks 'S'. Split it into Invoice, InvoiceRepository and InvoiceMailer, so a change to email does not risk breaking the maths.",
`
class Invoice:                       # S: only invoice maths
    def __init__(self, items): self.items = items
    def total(self): return sum(self.items)

class InvoiceRepository:             # S: only storage
    def save(self, invoice): print("saved", invoice.total())

class InvoiceService:                # D: depends on what it is given
    def __init__(self, repo): self.repo = repo
    def close(self, invoice): self.repo.save(invoice)

InvoiceService(InvoiceRepository()).close(Invoice([100, 250]))
`,
"The principles were collected by Robert C. Martin ('Uncle Bob') around 2000; the acronym SOLID was coined by Michael Feathers in 2004. The 'L' is Barbara Liskov's 1987 substitution principle."),

T("Design patterns",
"Named, proven solutions to common design problems. Well-known ones include Singleton (one shared instance), Factory (create objects without naming the exact class), Strategy (swap algorithms), Observer (notify subscribers) and Adapter (make interfaces fit).",
"A shipping calculator uses the Strategy pattern: the customer picks standard, express or same-day, and the matching pricing rule is plugged in without any if/else chain.",
`
def standard(weight): return 40 + 5 * weight      # strategies
def express(weight): return 100 + 12 * weight

class Shipment:
    def __init__(self, weight, strategy):
        self.weight, self.strategy = weight, strategy
    def cost(self): return self.strategy(self.weight)

print(Shipment(3, express).cost())     # 136

class Upi: pass
class Card: pass

def gateway_factory(kind):             # factory: caller never names the class
    return {"upi": Upi, "card": Card}[kind]()
`,
"The idea came from architect Christopher Alexander (1977) and reached software with the 1994 'Gang of Four' book describing 23 patterns. In Python many become simpler because functions and classes are first-class objects.")
]});
