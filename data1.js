ROADMAP.push({
n: 1, track: "Python",
title: "Python Fundamentals",
blurb: "The building blocks: running code, storing values, making decisions, repeating work, and organising code into functions and modules.",
topics: [
T("Python installation & execution",
"Python is an interpreted language: you install the interpreter (CPython), then run a .py file with it or type code into the interactive prompt (REPL). The interpreter first compiles the whole file to bytecode, then its virtual machine executes that bytecode.",
"A data analyst installs Python, creates a virtual environment for the project so its libraries do not clash with other projects, and runs 'python report.py' every morning to build a sales report.",
`
# in a terminal
python --version           # check the install
python -m venv .venv       # create an isolated environment
python hello.py            # run a file

# hello.py
print("Hello, Python!")
`,
"Python 0.9.0 was published by Guido van Rossum in 1991. The venv module arrived in Python 3.3 (2012) and pip has been bundled with Python since 3.4 (2014)."),

T("Variables and dynamic typing",
"A variable is a name that points to an object. Python is dynamically typed: the type belongs to the object, not the name, so the same name can point to an int now and a string later. You never declare a type before assigning.",
"A shopping cart stores cart_total = 0 and later cart_total = 499.50. The name stays the same while the value (and even the type, int to float) changes as items are added.",
`
price = 100          # int
price = 99.5         # now a float, no error
name = "Asha"
print(type(price))   # <class 'float'>
`,
"Dynamic typing was a design choice from the first release, inherited from the ABC language Guido worked on in the 1980s. It keeps code short and readable; optional type hints were added much later, in 2015."),

T("Numbers, strings, booleans",
"The three most common basic types. Numbers are int (whole, unlimited size) and float (decimal). Strings (str) are text in quotes. Booleans (bool) are True or False.",
"A bank app keeps balance as a number, account_holder as a string and is_active as a boolean that decides whether withdrawals are allowed.",
`
balance = 2500              # int
rate = 7.25                 # float
holder = "Ravi Kumar"       # str
is_active = True            # bool
print(f"{holder} has {balance * rate / 100} interest")
`,
"The bool type with True and False was only added in Python 2.3 (2003); before that people used 1 and 0. In Python 3.0 (2008) all strings became Unicode, and the separate int and long types were merged into one int of unlimited size."),

T("None",
"None is a special single object that means 'no value' or 'nothing here yet'. A function that does not return anything returns None. Check for it with 'is None'.",
"Looking up a customer who does not exist returns None instead of crashing, so the caller can show 'customer not found'.",
`
def find_user(users, user_id):
    return users.get(user_id)     # None if missing

user = find_user({1: "Meena"}, 7)
if user is None:
    print("User not found")
`,
"None has been in Python since the start as its version of 'null'. Tony Hoare, who invented the null reference in 1965, later called it his 'billion-dollar mistake' because unchecked nulls cause so many bugs, which is why you should always check for None."),

T("Type conversion",
"Changing a value from one type to another using functions such as int(), float(), str(), bool() and list(). Python rarely converts automatically, so you do it explicitly.",
"Everything typed into a web form arrives as text. Before calculating a bill you convert '3' to the number 3 with int().",
`
qty = int("3")             # str -> int
price = float("49.99")     # str -> float
label = str(qty) + " items"
print(qty * price, label)
print(bool(""), bool("hi"))   # False True
`,
"Python has always preferred explicit conversion; the Zen of Python (1999) says 'Explicit is better than implicit'. This avoids surprises such as JavaScript's '3' + 4 giving '34'."),

T("Operators",
"Symbols that do work on values: arithmetic (+ - * / // % **), comparison (== != < >), logical (and, or, not), membership (in) and identity (is).",
"An e-commerce site uses arithmetic to compute discounts, comparison to check stock, and 'and' to confirm the user is logged in and the cart is not empty before checkout.",
`
total = 1200
print(total // 500)     # 2   floor division
print(total % 500)      # 200 remainder
print(2 ** 10)          # 1024 power
eligible = total > 1000 and "SAVE10" in ["SAVE10", "NEW50"]
print(eligible)         # True
`,
"The // floor-division operator came in Python 2.2 (2001). In Python 3.0, / was changed to always give a float (5 / 2 = 2.5). The walrus operator := was added in 3.8 (2019)."),

T("if / elif / else",
"Conditional statements run a block of code only when a condition is true. 'elif' checks further conditions and 'else' handles everything left over. Blocks are marked by indentation.",
"A ride-hailing app decides the fare: surge pricing if demand is high, a discount if the user has a coupon, otherwise the normal fare.",
`
marks = 72
if marks >= 90:
    grade = "A"
elif marks >= 60:
    grade = "B"
else:
    grade = "C"
print(grade)    # B
`,
"Using indentation instead of braces came from the ABC language. Python had no switch statement for 30 years; structural pattern matching (match / case) finally arrived in Python 3.10 (2021)."),

T("for and while",
"Loops repeat code. A 'for' loop walks through each item of a collection. A 'while' loop repeats as long as a condition stays true.",
"A 'for' loop sends a payslip email to every employee in a list. A 'while' loop keeps retrying a payment until it succeeds or three attempts are used.",
`
for name in ["Anu", "Bala", "Chitra"]:
    print("Sending payslip to", name)

attempts = 0
while attempts < 3:
    attempts += 1
    print("Trying payment, attempt", attempts)
`,
"Python's for loop was designed as a 'for each' loop from the beginning, unlike C's counter-based loop. Since Python 2.2 (2001) it works on anything that follows the iterator protocol."),

T("break, continue, pass",
"'break' exits a loop immediately. 'continue' skips to the next round of the loop. 'pass' does nothing; it is a placeholder where Python needs a statement.",
"When scanning orders: skip cancelled orders with continue, stop at the first fraud alert with break, and use pass for a function you plan to write later.",
`
for order in ["ok", "cancelled", "ok", "fraud", "ok"]:
    if order == "cancelled":
        continue          # skip this one
    if order == "fraud":
        break             # stop everything
    print("Processing", order)

def refund():
    pass                  # to be written later
`,
"break and continue were borrowed from C. pass exists because Python uses indentation: an empty block is not allowed, so you need a statement that does nothing."),

T("Functions",
"A function is a named, reusable block of code defined with 'def'. You write the logic once and call it wherever it is needed.",
"A calculate_gst() function is written once and used by the invoice page, the cart page and the monthly report, so a tax change is fixed in one place.",
`
def calculate_gst(amount, rate=18):
    """Return the GST for an amount."""
    return amount * rate / 100

print(calculate_gst(1000))       # 180.0
print(calculate_gst(1000, 5))    # 50.0
`,
"Functions were in the first release (1991). In Python functions are 'first-class objects': they can be stored in variables and passed around, an idea taken from functional languages like Lisp."),

T("Arguments and return values",
"Arguments are the values you pass into a function. They can be positional (matched by order) or keyword (matched by name), and can have defaults. 'return' sends a result back; a function can return several values as a tuple.",
"A send_sms(phone, message, retry=2) function: callers always give phone and message, and only pass retry when they want something other than the default.",
`
def min_max(numbers):
    return min(numbers), max(numbers)   # returns a tuple

low, high = min_max([4, 9, 1, 7])
print(low, high)                        # 1 9

def greet(name, greeting="Hello"):
    return f"{greeting}, {name}"
print(greet(greeting="Vanakkam", name="Devi"))
`,
"Keyword arguments have been in Python since 1.x. Keyword-only arguments came in 3.0 and positional-only arguments (the / marker) in 3.8."),

T("*args and **kwargs",
"*args collects any number of extra positional arguments into a tuple. **kwargs collects extra keyword arguments into a dictionary. They let a function accept a flexible number of inputs.",
"A logging helper accepts any number of values to print, and an API wrapper forwards whatever keyword options the caller gives to the underlying HTTP library.",
`
def total(*args):
    return sum(args)

def create_user(name, **kwargs):
    print(name, kwargs)

print(total(10, 20, 30))                      # 60
create_user("Kavi", city="Chennai", age=28)   # Kavi {'city': 'Chennai', 'age': 28}
`,
"The * and ** syntax was added in Python 1.x and replaced the older apply() function. The names 'args' and 'kwargs' are only a convention; the stars are what matter."),

T("Scope: local/global/nonlocal",
"Scope decides where a name is visible. Names created inside a function are local. Names at file level are global. 'global' lets a function rebind a global name, and 'nonlocal' lets a nested function rebind a name in the enclosing function. Python searches Local, Enclosing, Global, Built-in (LEGB).",
"A request counter in a small script is a global. A counter kept inside a factory function uses nonlocal so each counter has its own private count.",
`
visits = 0
def record_visit():
    global visits
    visits += 1

def make_counter():
    count = 0
    def increment():
        nonlocal count
        count += 1
        return count
    return increment

counter = make_counter()
print(counter(), counter())   # 1 2
`,
"Nested scopes arrived in Python 2.1 (2001). The nonlocal keyword was added in Python 3.0 (2008, PEP 3104) because before it, inner functions could read outer variables but not rebind them."),

T("Input/output",
"Input and output is how a program talks to the outside world: input() reads from the keyboard, print() writes to the screen, and open() reads and writes files.",
"A billing script reads the day's orders from a CSV file, prints a summary to the screen and writes the totals to a new file for the accounts team.",
`
name = input("Your name: ")
print(f"Welcome, {name}")

with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("First line")

with open("notes.txt", encoding="utf-8") as f:
    print(f.read())
`,
"print was a statement (print 'hi') until Python 3.0 made it a function. f-strings, the easiest way to format output, were added in Python 3.6 (2016)."),

T("Modules and imports",
"A module is simply a .py file. 'import' loads it so you can use its functions, classes and variables. Python ships with a large standard library of ready-made modules.",
"Instead of writing your own date maths, you import datetime. Your project splits code into billing.py, users.py and emails.py that import from each other.",
`
import math
from datetime import date
import random as rnd

print(math.sqrt(144))        # 12.0
print(date.today())
print(rnd.choice(["red", "green", "blue"]))
`,
"Modules were in Python from day one, inspired by Modula-3. The 'batteries included' philosophy of a rich standard library is a big reason Python became popular."),

T("Packages",
"A package is a folder of modules that can be imported as a unit, usually marked by an __init__.py file. Third-party packages are installed from the Python Package Index (PyPI) with pip.",
"A web project has an 'app' package with sub-packages for models, routes and services, and installs external packages such as requests and fastapi with pip.",
`
# project layout
# shop/
#     __init__.py
#     billing.py
#     users.py

from shop.billing import create_invoice

# install third-party packages in a terminal:
# pip install requests
`,
"Packages were added in Python 1.5 (1997). PyPI opened in 2003, pip was created by Ian Bicking in 2008, and namespace packages (no __init__.py needed) came in Python 3.3.")
]});

ROADMAP.push({
n: 2,
title: "Python Data Structures",
blurb: "The containers that hold your data and the tools to transform them. Picking the right one is half of writing good Python.",
topics: [
T("Lists",
"A list is an ordered, changeable collection written with square brackets. It can hold any mix of items, allows duplicates, and is the most used container in Python.",
"The items in a shopping cart: order matters, the user adds and removes items, and the same product can appear twice.",
`
cart = ["milk", "bread"]
cart.append("eggs")        # add to the end
cart.insert(0, "rice")     # add at a position
cart.remove("bread")
print(cart[0], cart[-1])   # rice eggs
print(cart[1:3], len(cart))
`,
"Lists were in the first Python release. Internally a list is a dynamic array, so reading by index is instant (O(1)) and append is fast, but inserting at the front is slow (O(n))."),

T("Tuples",
"A tuple is an ordered collection that cannot be changed after creation, usually written with parentheses (it is the comma that makes a tuple: (5,) is a tuple, (5) is just the number 5). Use it for a fixed group of related values.",
"GPS coordinates (latitude, longitude) or an RGB colour (255, 128, 0): the group belongs together and should not be edited by accident.",
`
location = (13.0827, 80.2707)
lat, lon = location           # unpacking
print(lat)

def get_user():
    return "Priya", 31        # returns a tuple
name, age = get_user()
`,
"Tuples come from mathematics and from the ABC language. Because they are immutable, tuples of hashable items are themselves hashable, which allows them to be dictionary keys. collections.namedtuple was added in Python 2.6."),

T("Sets",
"A set is an unordered collection of unique items, written with curly braces. It removes duplicates automatically and checks membership very fast.",
"Finding the unique visitors to a website from a log with millions of rows, or finding customers who bought both product A and product B.",
`
visitors = {"anu", "bala", "anu", "chitra"}
print(visitors)                     # duplicates removed
bought_a = {"anu", "bala"}
bought_b = {"bala", "chitra"}
print(bought_a & bought_b)          # {'bala'}  both
print(bought_a | bought_b)          # everyone
print("anu" in bought_a)            # True, O(1) on average
`,
"Sets first appeared as a 'sets' module in Python 2.3 (2003) and became the built-in set type in 2.4. The {1, 2, 3} literal syntax came with Python 2.7 and 3.0."),

T("Dictionaries",
"A dictionary (dict) stores key-value pairs. You look up a value by its key instead of by position, and lookups are extremely fast.",
"A user profile ({'name': ..., 'email': ...}), a product price list keyed by product ID, or the JSON body returned by an API.",
`
prices = {"apple": 120, "mango": 80}
prices["grape"] = 95                  # add / update
print(prices["apple"])                # 120
print(prices.get("kiwi", 0))          # 0, safe lookup
for fruit, price in prices.items():
    print(fruit, price)
`,
"Dicts are hash tables and have been central to Python since 1991; the language itself uses them for namespaces and objects. Since Python 3.7 (2018), dicts are guaranteed to keep insertion order."),

T("Strings",
"A string is an immutable sequence of Unicode characters. Strings support indexing, slicing and many methods such as split, join, replace, strip, upper and find.",
"Cleaning user input in a signup form: strip spaces from an email, lower-case it, and check that it contains '@'.",
`
email = "  Ravi.Kumar@Example.com "
clean = email.strip().lower()
print(clean)                        # ravi.kumar@example.com
user, domain = clean.split("@")
print(user.title(), domain)
print(", ".join(["a", "b", "c"]))   # a, b, c
`,
"Python 2 had separate byte strings and unicode strings, a constant source of bugs. Python 3.0 (2008) made every str Unicode. f-strings were added in 3.6."),

T("Mutable vs immutable",
"A mutable object can be changed in place (list, dict, set). An immutable object cannot be changed after creation (int, float, str, tuple, frozenset); any 'change' creates a new object.",
"A classic bug: using a list as a default argument, def add(item, items=[]). The same list is shared between calls, so old items leak into new carts. Use None as the default instead.",
`
a = [1, 2]
b = a
b.append(3)
print(a)          # [1, 2, 3]  same object changed

s = "hi"
t = s
t += "!"
print(s)          # hi  a new string was created

def add(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
`,
"Immutability of strings and tuples was a deliberate early design choice: it makes them safe to share, safe to use as dict keys, and lets the interpreter optimise them."),

T("Hashability",
"An object is hashable if it has a hash value that never changes during its life. Only hashable objects can be dictionary keys or set members. Immutable built-ins such as int, str and frozenset are hashable (a tuple only if everything inside it is hashable); lists, dicts and sets are not.",
"Caching results by (city, date): a tuple can be the cache key, but a list cannot, and trying gives 'TypeError: unhashable type'.",
`
cache = {}
cache[("Chennai", "2026-10-05")] = 31    # tuple key works
print(hash("python") == hash("python"))  # True

try:
    cache[["Chennai", "2026-10-05"]] = 31
except TypeError as e:
    print(e)        # unhashable type: 'list'
`,
"Hash tables were invented by Hans Peter Luhn at IBM in 1953. Python's dict has been built on hashing since the start; custom classes control it with __hash__ and __eq__."),

T("List/set/dict comprehensions",
"A comprehension builds a new list, set or dict from an existing iterable in one readable line, with an optional filter.",
"From a list of orders, build a list of just the amounts over 1000, or a dict mapping each product to its price after discount.",
`
orders = [450, 1200, 3000, 800]
big = [o for o in orders if o > 1000]          # [1200, 3000]
squares = {n: n * n for n in range(4)}         # {0: 0, 1: 1, 2: 4, 3: 9}
domains = {e.split("@")[1] for e in ["a@x.com", "b@x.com"]}
print(big, squares, domains)
`,
"List comprehensions were added in Python 2.0 (2000, PEP 202), borrowed from Haskell. Set and dict comprehensions followed in Python 2.7 and 3.0."),

T("Sorting",
"Ordering items. list.sort() sorts a list in place; sorted() returns a new sorted list from any iterable. The 'key' argument chooses what to sort by and 'reverse=True' flips the order.",
"A product page sorts items by price low to high, and a leaderboard sorts players by score, highest first.",
`
products = [("pen", 20), ("bag", 900), ("book", 350)]
by_price = sorted(products, key=lambda p: p[1])
print(by_price)
scores = [70, 95, 82]
scores.sort(reverse=True)
print(scores)               # [95, 82, 70]
`,
"Python's sorting algorithm, Timsort, was written by Tim Peters for Python 2.3 (2002). It is so good on real-world data that Java, Android and Swift adopted it. sorted() was added in 2.4."),

T("lambda",
"A lambda is a small anonymous function written in a single expression: lambda arguments: result. Use it when a short function is needed just once.",
"Passing a quick rule to sorted(), such as 'sort employees by salary', without defining a separate named function.",
`
employees = [{"name": "Anu", "salary": 50000},
             {"name": "Bala", "salary": 72000}]
top = max(employees, key=lambda e: e["salary"])
print(top["name"])          # Bala

double = lambda x: x * 2
print(double(21))           # 42
`,
"lambda was added in Python 1.0 (1994), contributed by a Lisp fan. The name comes from lambda calculus, created by Alonzo Church in the 1930s. Guido once wanted to remove it from Python 3 but kept it."),

T("map, filter, reduce",
"Three functional tools. map applies a function to every item. filter keeps the items where a function returns True. reduce combines all the items into one value.",
"Convert a list of prices from dollars to rupees (map), keep only those in stock (filter), and add up the total (reduce).",
`
from functools import reduce

usd = [10, 25, 40]
inr = list(map(lambda p: p * 83, usd))
big = list(filter(lambda p: p > 1000, inr))
total = reduce(lambda a, b: a + b, inr)
print(inr, big, total)
`,
"All three arrived with lambda in Python 1.0. In Python 3.0, reduce was moved into functools because Guido found loops clearer. The MapReduce idea behind Hadoop and Spark is named after map and reduce."),

T("zip, enumerate",
"zip pairs up items from several iterables, one from each. enumerate gives each item together with its index, so you never need a manual counter.",
"Pair a list of student names with a list of marks, and print a numbered ranking list starting from 1.",
`
names = ["Anu", "Bala", "Chitra"]
marks = [88, 92, 79]
for name, mark in zip(names, marks):
    print(name, mark)
for rank, name in enumerate(names, start=1):
    print(rank, name)
print(dict(zip(names, marks)))
`,
"zip was added in Python 2.0 (2000) and enumerate in Python 2.3 (2003). In Python 3 both are lazy, producing items only when asked."),

T("Stack and queue",
"A stack is last-in, first-out (LIFO), like a pile of plates. A queue is first-in, first-out (FIFO), like a line at a ticket counter. A list works well as a stack; use deque for a queue.",
"The undo button in an editor is a stack (the last action is undone first). Print jobs or customer support tickets wait in a queue (first come, first served).",
`
from collections import deque

undo = []                    # stack
undo.append("type A")
undo.append("type B")
print(undo.pop())            # type B

tickets = deque()            # queue
tickets.append("T1")
tickets.append("T2")
print(tickets.popleft())     # T1
`,
"The stack was described by Alan Turing in 1946 and patented by Bauer and Samelson in 1957. Queues come from queueing theory, started by Agner Erlang for telephone exchanges around 1909."),

T("deque",
"deque (double-ended queue, pronounced 'deck') from collections adds and removes items at both ends in O(1) time. It can also have a maximum length, dropping old items automatically.",
"Keeping only the last 5 pages a user visited ('recently viewed'), or a sliding window of the last 100 sensor readings.",
`
from collections import deque

recent = deque(maxlen=3)
for page in ["home", "cart", "pay", "done"]:
    recent.append(page)
print(recent)                # deque(['cart', 'pay', 'done'], maxlen=3)
recent.appendleft("start")
recent.rotate(1)
`,
"deque was added in Python 2.4 (2004) by Raymond Hettinger, because list.pop(0) is O(n). The maxlen option came in 2.6."),

T("heapq",
"heapq turns a normal list into a min-heap: a structure where the smallest item is always at index 0. Push and pop cost O(log n). It is Python's priority queue.",
"A hospital triage system always treats the most urgent patient next, and a task scheduler always runs the job with the earliest deadline.",
`
import heapq

patients = []
heapq.heappush(patients, (2, "fever"))
heapq.heappush(patients, (1, "heart attack"))
heapq.heappush(patients, (3, "sprain"))
print(heapq.heappop(patients))            # (1, 'heart attack')
print(heapq.nlargest(2, [5, 1, 9, 7]))    # [9, 7]
`,
"The binary heap was invented by J. W. J. Williams in 1964 for the heapsort algorithm. The heapq module was added in Python 2.3 (2003)."),

T("defaultdict",
"A defaultdict is a dict that creates a default value automatically when you access a missing key, so you avoid 'KeyError' and 'if key not in dict' checks.",
"Grouping orders by customer: each new customer automatically starts with an empty list that orders are appended to.",
`
from collections import defaultdict

orders = [("anu", "pen"), ("bala", "bag"), ("anu", "book")]
by_customer = defaultdict(list)
for customer, item in orders:
    by_customer[customer].append(item)
print(dict(by_customer))   # {'anu': ['pen', 'book'], 'bala': ['bag']}
`,
"defaultdict was added to collections in Python 2.5 (2006). It replaced the common but clumsy dict.setdefault() pattern."),

T("Counter",
"Counter is a dict subclass that counts how many times each item appears. It also gives the most common items directly.",
"Finding the top 3 best-selling products today, or the most frequent words in customer reviews.",
`
from collections import Counter

sold = ["pen", "bag", "pen", "book", "pen", "bag"]
counts = Counter(sold)
print(counts["pen"])               # 3
print(counts.most_common(2))       # [('pen', 3), ('bag', 2)]
print(Counter("mississippi"))
`,
"Counter was added in Python 2.7 and 3.1 (2009-2010) by Raymond Hettinger. It implements the mathematical idea of a multiset, or 'bag'.")
]});
