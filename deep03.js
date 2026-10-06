EXTRA(3, "References and object identity", {
  deep: [
    "In CPython every object is a block of memory on the heap. The block starts with a reference count and a pointer to the object's type. A name is only an entry in a namespace (a dict, or a slot in the function's frame) that stores a pointer to the object. Assignment never copies the object. It only makes the name point to the object and adds one to the reference count.",
    "Function arguments work the same way. The parameter becomes a new local name for the same object the caller passed. If the function changes the object (append, update), the caller sees the change. If the function assigns a new object to the parameter name, the caller sees nothing, because only the local name moved. So Python is not 'pass by value' and not 'pass by reference' in the C++ meaning.",
    "'is' compares the two pointers and cannot be customised. '==' calls the __eq__ method, so a class can decide what equal means. id() is unique only while the object is alive; after an object is freed, a new object can get the same id. Use 'is' only for None, True, False and your own sentinel objects. Since Python 3.8, 'x is 5' gives a SyntaxWarning because it is almost always a bug.",
    "Augmented assignment is a common source of confusion. 'a += b' on a list calls __iadd__, which changes the list in place and then binds the name again to the same list. On an int, str or tuple there is no in-place change, so a new object is created and the name moves to it. This is why the same '+=' line shares changes for lists but not for numbers."
  ],
  iq: [
    { q: "A function appends to its list parameter and then assigns a new list to it. What does the caller see?", a: "The caller sees only the append. The parameter is a local name for the same list, so append changes the shared object. The assignment only moves the local name to a new list; the caller's name still points to the old one.", c: `
def change(lst):
    lst.append(4)
    lst = [0]
    lst.append(9)

nums = [1, 2, 3]
change(nums)
print(nums)   # [1, 2, 3, 4]
` },
    { q: "What is the difference between 'a += [3]' and 'a = a + [3]' when another name points to the same list?", a: "'a += [3]' changes the existing list in place, so the other name sees the new item. 'a = a + [3]' builds a new list and moves only the name a, so the other name keeps the old list.", c: `
a = [1, 2]
b = a
a += [3]
print(b)        # [1, 2, 3]
a = a + [4]
print(b)        # [1, 2, 3]
print(a)        # [1, 2, 3, 4]
` },
    { q: "A tuple holds a list. What happens with t[0] += [9]?", a: "It raises TypeError, but the list is changed anyway. Python first calls __iadd__ on the list, which succeeds in place. Then it tries to store the result back into t[0], and that step fails because a tuple cannot be assigned to.", c: `
t = ([1, 2], 3)
try:
    t[0] += [9]
except TypeError:
    print("error")     # error
print(t)               # ([1, 2, 9], 3)
` },
    { q: "x = 1000 and y = 1000. Is 'x is y' True or False?", a: "It depends, so you must never rely on it. CPython caches only the integers -5 to 256. For bigger numbers the result depends on how the code was compiled: two equal constants in one file are often merged into one object, but values made at runtime are separate objects. Always compare numbers and strings with '=='." }
  ],
  tips: [
    "Write 'if x is None' and 'if x is not None'. Do not write 'x == None', because a class can override __eq__ and give a wrong answer.",
    "When None is a valid value, create your own sentinel: _MISSING = object(), then test with 'value is _MISSING'. This is how you tell 'not given' from 'given as None'.",
    "Decide for each function: it changes its argument and returns None (like list.sort), or it returns a new object and leaves the argument alone (like sorted). Do not do both in one function.",
    "Never use a mutable default argument such as 'def f(items=[])'. Use 'items=None' and create the list inside the function, because the default object is created once and shared by all calls."
  ]
});

EXTRA(3, "Shallow vs deep copy", {
  deep: [
    "There are three different things: assignment, shallow copy and deep copy. Assignment (b = a) copies nothing; it gives a second name to the same object. A shallow copy makes a new outer container and fills it with the same pointers as the old one. You get a shallow copy from copy.copy(x), list(x), x[:], x.copy() and dict(x).",
    "A shallow copy is enough when the items inside are immutable (numbers, strings, tuples of numbers), because nobody can change them. The problem starts only when an inner object is mutable, like a list inside a list. Then both containers share that inner list, and a change through one is visible through the other. Replacing an item in the copy is safe; mutating an item is not.",
    "copy.deepcopy walks the whole object graph and copies each object it finds. It keeps a 'memo' dict keyed by id(), so an object that is referenced twice is copied only once, and a structure that points to itself does not cause an endless loop. Immutable simple objects such as int and str are not copied at all; the same object is reused because that is safe.",
    "deepcopy is slow because it is written in Python and makes many function calls for every object. It can also fail or do the wrong thing on objects that hold a lock, an open file, a socket or a database connection. A class can control copying with __copy__ and __deepcopy__(memo). Do not deep copy by habit; first ask if a shallow copy or a new object is enough."
  ],
  iq: [
    { q: "What is wrong with grid = [[0] * 3] * 3?", a: "The outer '* 3' repeats the pointer to one inner list three times. All three rows are the same object, so changing one cell changes every row. Build the rows with a comprehension so each row is a new list.", c: `
grid = [[0] * 3] * 3
grid[0][0] = 1
print(grid)    # [[1, 0, 0], [1, 0, 0], [1, 0, 0]]

good = [[0] * 3 for _ in range(3)]
good[0][0] = 1
print(good)    # [[1, 0, 0], [0, 0, 0], [0, 0, 0]]
` },
    { q: "After a shallow copy, which change is seen in the original: replacing an item or mutating an item?", a: "Only mutating. Replacing b[0] changes a slot in the new outer list, so the original is not touched. Appending to b[1] changes an inner list that both outer lists share.", c: `
import copy
a = [[1, 2], [3, 4]]
b = copy.copy(a)
b[0] = [9, 9]
b[1].append(5)
print(a)   # [[1, 2], [3, 4, 5]]
` },
    { q: "Can deepcopy copy a list that contains itself?", a: "Yes. deepcopy records every object it has already copied in a memo dict. When it meets the same list again it uses the copy it already made, so the new structure points to itself and not to the old one.", c: `
import copy
a = [1]
a.append(a)
b = copy.deepcopy(a)
print(b[1] is b)   # True
print(b[1] is a)   # False
` },
    { q: "Does copy.deepcopy always return a new object?", a: "No. For immutable objects with only immutable content, such as an int, a str or a tuple of numbers, it returns the same object, because sharing it is safe. A tuple that contains a list is copied, because the list inside must be new." }
  ],
  tips: [
    "For a default config or template that each request may change, use copy.deepcopy(DEFAULTS) once per request, or better, build the dict in a small function that returns a new one each time.",
    "Remember that {**base, 'key': value} and base | other are shallow merges. Nested dicts are still shared with the original.",
    "Do not call deepcopy inside a hot loop. Profile first; often you can copy only the one nested part you really change.",
    "Use immutable data (tuples, frozenset, @dataclass(frozen=True)) for values that are passed around a lot. Then you do not need copies, and dataclasses.replace() gives a changed copy when you need one."
  ]
});

EXTRA(3, "Python memory model", {
  deep: [
    "Every CPython object starts with a header: a reference count and a pointer to its type. That is 16 bytes on a 64-bit build before any data. An int adds a size field and the digits, which gives 28 bytes for a small number. A list does not store its items; it stores an array of 8-byte pointers to them. So sys.getsizeof(a_list) counts only the list itself, not the objects it points to.",
    "Small objects (up to 512 bytes) are served by CPython's own allocator, pymalloc. It asks the operating system for big blocks called arenas, splits them into pools, and each pool serves one object size. Larger objects go straight to the C allocator. When objects are freed, the memory first goes back to the pool for reuse. An arena returns to the operating system only when it is completely empty, so the process size often stays high after a big structure is deleted.",
    "Containers trade memory for speed. A list reserves extra slots when it grows, so append is fast on average. A dict is a hash table that keeps free space to stay fast. A normal instance keeps its attributes in its own __dict__; __slots__ removes that dict and stores the attributes in fixed positions, which saves a lot of memory when you have millions of objects.",
    "CPython reuses some immutable objects. The integers from -5 to 256 exist once, and strings that look like identifiers are often interned. This is an implementation detail for speed, not a language rule. It is safe only because these objects cannot change. Never write code that depends on two equal values being the same object."
  ],
  iq: [
    { q: "Do these two lists report the same size from sys.getsizeof?", a: "Yes. getsizeof measures only the list object: its header and three pointers. The three long strings are separate objects and are not counted. To measure the full size you must also add the items, for example with a tool such as pympler.", c: `
import sys
a = [0] * 3
b = ["x" * 1000] * 3
print(sys.getsizeof(a) == sys.getsizeof(b))   # True
` },
    { q: "What does __slots__ change?", a: "The class no longer creates a __dict__ for each instance. Attributes are stored in fixed slots, which uses less memory and makes access a little faster. The price is that you cannot add attributes that are not listed.", c: `
class B:
    __slots__ = ("x",)

b = B()
b.x = 1
try:
    b.y = 2
except AttributeError:
    print("y is not allowed")       # y is not allowed
print(hasattr(b, "__dict__"))       # False
` },
    { q: "You delete a list with ten million items, but the process still uses a lot of memory. Why?", a: "Freed memory goes back to Python's allocator, not always to the operating system. An arena can be returned only when every object in it is free, and a few live objects can keep many arenas in use. The memory is free for Python to reuse, so this is usually not a leak." },
    { q: "Why does a = 256; b = 256; a is b give True, and is that true for all integers?", a: "CPython creates the integers -5 to 256 once at start-up and reuses them, so both names point to the same object. For other integers there is no such promise; the result depends on how the code was compiled. It is a CPython detail, so compare numbers with '==', never with 'is'." }
  ],
  tips: [
    "To find where memory grows, use the built-in tracemalloc module: take two snapshots and compare them with snapshot.compare_to(). It shows the file and line that allocated the memory.",
    "For classes with a huge number of instances, use __slots__ or @dataclass(slots=True). This often cuts memory per object to less than half.",
    "Store big sets of numbers in array.array or a NumPy array, not in a list of Python ints. An array stores raw 8-byte values instead of pointers to 28-byte objects.",
    "Process large files and query results as a stream (iterate, do not call .read() or list() on everything). Peak memory then stays flat no matter how big the input is."
  ]
});

EXTRA(3, "Garbage collection", {
  deep: [
    "Reference counting does most of the work. Every time a name, a list slot or an attribute starts to point to an object, its count goes up by one; when the reference goes away, the count goes down. At zero the object is freed immediately, and the objects it pointed to lose one reference each, which can free a whole chain. This is why memory is released at a predictable moment in CPython.",
    "Reference counting cannot free a cycle: if a points to b and b points to a, both counts stay at one forever. The cycle collector solves this. It tracks only container objects (lists, dicts, instances, classes), because numbers and strings cannot form cycles. For a group of objects it removes the references that come from inside the group; any object whose count then reaches zero is reachable only from the group itself, so it is garbage.",
    "The collector is generational. New objects are checked often, and objects that survive are moved to an older generation that is checked less often, because most objects die young. The thresholds can be read with gc.get_threshold(). The exact design has changed between Python versions, so do not depend on the details.",
    "Most 'memory leaks' in Python are not collector failures. They are objects that are still referenced: a global dict used as a cache, a list of listeners that is never cleaned, a stored exception with its traceback. Also do not use __del__ for important cleanup. Its timing is not guaranteed, and other Python implementations such as PyPy do not free objects immediately. Use a with block or a close() method."
  ],
  iq: [
    { q: "Does 'del a' delete the object?", a: "No. del removes the name and lowers the reference count by one. The object is freed only when the count reaches zero. Here another name still points to the list, so it stays alive.", c: `
a = [1, 2, 3]
b = a
del a
print(b)    # [1, 2, 3]
` },
    { q: "Two objects point to each other and you delete both names. Are they freed at once?", a: "No. Each still has one reference from the other, so reference counting never reaches zero. They are freed later when the cycle collector runs. A weak reference lets us watch this without keeping the object alive.", c: `
import gc
import weakref

class Node:
    pass

gc.disable()
a = Node()
b = Node()
a.other = b
b.other = a
r = weakref.ref(a)
del a, b
print(r() is None)   # False: the cycle keeps both alive
gc.collect()
print(r() is None)   # True
gc.enable()
` },
    { q: "What is a weak reference and when do you need one?", a: "A weak reference points to an object without raising its reference count. When the last normal reference is gone the object is freed and the weak reference returns None. It is used for caches and observer lists, so that they do not keep objects alive.", c: `
import weakref

class Session:
    pass

s = Session()
r = weakref.ref(s)
print(r() is s)    # True
del s
print(r())         # None
` },
    { q: "Can you rely on __del__ to close a file or a connection?", a: "No. __del__ runs only when the object is freed, and that can be late if a cycle or a stored traceback holds a reference. It may not run at all when the interpreter exits. Use a context manager or an explicit close() for resources." }
  ],
  tips: [
    "Give every cache a limit: functools.lru_cache(maxsize=...) or a TTL cache. An unbounded dict cache in a long-running server is the most common Python memory leak.",
    "Use weakref.WeakValueDictionary or weakref.WeakSet for registries and observer lists, so that registering an object does not keep it alive forever.",
    "Do not call gc.collect() in normal code. If memory grows, find who holds the references with tracemalloc or the objgraph package.",
    "In pre-forking servers (Gunicorn, Celery prefork) you can call gc.freeze() after start-up and before fork. It keeps the collector from touching old objects, so worker processes share more memory."
  ]
});

EXTRA(3, "Iterators", {
  deep: [
    "A for loop is a small protocol. Python calls iter(obj), which calls obj.__iter__() and gets an iterator. Then it calls next() on the iterator again and again. When the iterator raises StopIteration, the loop catches it and ends quietly. If the object has no __iter__ but has __getitem__, iter() falls back to the old style and asks for index 0, 1, 2 until IndexError.",
    "Iterable and iterator are not the same. An iterable (list, dict, str, range) gives a new, fresh iterator every time you call iter() on it, so you can loop over it many times. An iterator returns itself from __iter__ and remembers its position, so it can be used only once. zip, map, filter, enumerate, open files and generators are all iterators.",
    "Because an iterator keeps a position, changing a container while you loop over it is dangerous. The list iterator stores only an index, so removing an item shifts the rest and the loop skips the next one without any error. A dict or set is stricter and raises RuntimeError if its size changes during iteration. Loop over a copy, or build a new container.",
    "iter() also has a two-argument form: iter(function, sentinel) calls the function until it returns the sentinel value. It is handy for reading a file in fixed-size blocks. Do not use an iterator when you need len(), indexing or a second pass; in that case make a list first. The itertools module has ready tools (islice, chain, groupby) that work on any iterator."
  ],
  iq: [
    { q: "Why is the second list() empty?", a: "zip returns an iterator, not a list. The first list() consumes all items, and an iterator does not go back to the start. Store the result in a list if you need it more than once.", c: `
pairs = zip([1, 2], ["a", "b"])
print(list(pairs))   # [(1, 'a'), (2, 'b')]
print(list(pairs))   # []
` },
    { q: "This loop should remove all even numbers. What is printed?", a: "It prints [4, 8]. The list iterator keeps an index. After 2 is removed, the items shift left, so index 1 is now 6 and the number 4 is skipped. Never remove from a list while looping over it; build a new list with a comprehension.", c: `
nums = [2, 4, 6, 8]
for n in nums:
    if n % 2 == 0:
        nums.remove(n)
print(nums)   # [4, 8]
` },
    { q: "What does the 'in' operator do to an iterator?", a: "It consumes items until it finds a match. The first test reads 1 and 2 and stops. The second test reads 3 and 4, finds nothing and reaches the end. After that the iterator is empty.", c: `
it = iter([1, 2, 3, 4])
print(2 in it)     # True
print(2 in it)     # False
print(list(it))    # []
` },
    { q: "Is a list an iterator?", a: "No, a list is an iterable. next([1, 2]) raises TypeError because a list has no __next__ method. iter(a_list) gives a separate iterator object, and calling iter() on that iterator returns the same iterator again." }
  ],
  tips: [
    "Use next(iterator, default) to get the first item safely. Without the default, an empty iterator raises StopIteration.",
    "Use itertools.islice(it, 10) to take the first N items of a lazy stream, and itertools.batched(it, 500) (Python 3.12+) to process data in chunks, for example for bulk database inserts.",
    "In your own container class, write __iter__ as a generator function (use yield inside it). Each loop then gets a fresh iterator and two loops do not disturb each other.",
    "Use zip(a, b, strict=True) (Python 3.10+) when both inputs must have the same length. Plain zip stops at the shorter one and hides missing data."
  ]
});

EXTRA(3, "Generators", {
  deep: [
    "Calling a generator function does not run any of its code. It returns a generator object that holds a frame: the local variables, the position of the next instruction and the small evaluation stack. A normal function's frame is thrown away at return. A generator's frame stays alive between calls, and each next() continues it from where it stopped until the next yield.",
    "A generator is in one of four states: created, running, suspended or closed (see inspect.getgeneratorstate). When the function body ends or hits 'return', Python raises StopIteration for you, and the return value is stored in the exception's value attribute. Since Python 3.7 (PEP 479), a StopIteration raised by your own code inside a generator is turned into RuntimeError, so that a bug cannot silently end a loop.",
    "Cleanup needs care. If the consumer stops early, the generator stays suspended in the middle of its code. Calling close() raises GeneratorExit at the paused yield, so 'finally' blocks and 'with' blocks inside the generator run. CPython calls close() when the generator is garbage collected, but the moment is not guaranteed. A file opened inside a generator stays open until the generator finishes or is closed.",
    "Do not use a generator when you need the data more than once, or need len(), indexing or sorting; use a list. For small data a list is also simpler and often faster. Remember that errors in a generator appear when it is consumed, not where it was created, which can make a traceback point to a surprising place."
  ],
  iq: [
    { q: "In which order are the lines printed?", a: "'created' comes first. Calling gen() only builds the generator object; the body does not start. The body runs up to the first yield only when next() is called.", c: `
def gen():
    print("start")
    yield 1

g = gen()
print("created")
print(next(g))
# created
# start
# 1
` },
    { q: "Why is the second sum 0?", a: "A generator can be consumed only once. The first sum() reads all values, and after that the generator is finished. The second sum() gets nothing, so the result is 0 and there is no error. This silent empty result is a common bug.", c: `
def nums():
    yield 1
    yield 2

g = nums()
print(sum(g))   # 3
print(sum(g))   # 0
` },
    { q: "What happens to a value given to 'return' inside a generator?", a: "It is not yielded, so a for loop or list() never sees it. Python puts it in the value attribute of the StopIteration exception. 'yield from' uses this to pass a result back to the outer generator.", c: `
def g():
    yield 1
    return 99

print(list(g()))    # [1]
gen = g()
next(gen)
try:
    next(gen)
except StopIteration as e:
    print(e.value)  # 99
` },
    { q: "What happens if code inside a generator raises StopIteration, for example by calling next() on an empty iterator?", a: "Since Python 3.7 it becomes RuntimeError: generator raised StopIteration. Before that, the outer loop simply ended early and the bug was hidden. Catch the StopIteration yourself or use next(it, default)." }
  ],
  tips: [
    "Build data pipelines as a chain of small generators (read lines, parse, filter, write). Each item flows through all steps one at a time, so memory stays small.",
    "If a function returns a generator, say so in its name or docstring, or return a list. Callers who loop twice get an empty second pass with no error.",
    "When a generator holds a resource (file, cursor) and may be stopped early, wrap its use in contextlib.closing(gen) so the cleanup code runs at a known time.",
    "Do not let a lazy generator escape the scope of its resource. A generator that reads from a database cursor fails if it is consumed after the connection was closed."
  ]
});

EXTRA(3, "yield", {
  deep: [
    "yield is an expression, not only a statement. In 'x = yield value' the generator gives 'value' out, pauses, and later x receives whatever the caller sends in. next(g) is the same as g.send(None). The first call must be next(g) or g.send(None), because the generator has not yet reached a yield that could receive a value; sending anything else raises TypeError.",
    "A generator has two more methods. g.throw(exc) raises an exception at the paused yield, so the generator can handle it or clean up. g.close() raises GeneratorExit there. If the generator catches GeneratorExit and yields again, Python raises RuntimeError, so do not swallow it.",
    "'yield from other' is more than a for loop with yield. It connects the caller directly to the inner generator: values, send(), throw() and close() all pass through. When the inner generator returns, its return value becomes the value of the 'yield from' expression. This two-way channel was the base for coroutines, and 'await' in async code is built on the same machinery.",
    "One yield anywhere in the body turns the whole function into a generator function, even if that line can never run. Then 'return value' no longer gives the value to the caller in the normal way. Using send() for complex two-way logic is hard to read; in new code use a class or async/await for that."
  ],
  iq: [
    { q: "This function returns 5 before the yield. What does calling it give?", a: "A generator, not 5. The compiler sees a yield in the body and makes the function a generator function. The 'return 5' only ends the generator, so iterating gives nothing.", c: `
def f():
    return 5
    yield

print(type(f()).__name__)   # generator
print(list(f()))            # []
` },
    { q: "How does send() work?", a: "send(value) resumes the generator and makes the paused yield expression evaluate to that value. The generator then runs to the next yield, and that yielded value is the result of send(). The first step must be next() to reach the first yield.", c: `
def echo():
    received = yield "ready"
    while True:
        received = yield received * 2

g = echo()
print(next(g))      # ready
print(g.send(5))    # 10
print(g.send(7))    # 14
` },
    { q: "What is the difference between 'yield items' and 'yield from items'?", a: "'yield items' gives the whole object as one value. 'yield from items' loops over it and gives each item separately. With a generator on the right side, yield from also forwards send, throw and the return value.", c: `
def a():
    yield [1, 2]

def b():
    yield from [1, 2]

print(list(a()))   # [[1, 2]]
print(list(b()))   # [1, 2]
` },
    { q: "A generator is paused inside try/finally and the caller stops using it. Does 'finally' run?", a: "Yes, when the generator is closed. close() raises GeneratorExit at the paused yield, so the finally block runs. If you do not call close(), CPython calls it when the generator is garbage collected, but the timing is not guaranteed.", c: `
def g():
    try:
        yield 1
        yield 2
    finally:
        print("cleanup")

gen = g()
print(next(gen))   # 1
gen.close()        # cleanup
` }
  ],
  tips: [
    "Use 'yield from' in recursive generators, for example walking a tree or nested folders: 'yield from walk(child)' keeps the code flat and clear.",
    "For paged APIs, write one generator that requests a page, yields its items and requests the next page only when needed. The caller gets a simple for loop and can stop early.",
    "In a function decorated with @contextmanager or a pytest fixture, yield exactly once and put the cleanup after the yield inside try/finally.",
    "Do not write new send()-based coroutines. Use async def and await; they are clearer and supported by all modern libraries."
  ]
});

EXTRA(3, "Generator expressions", {
  deep: [
    "A generator expression is compiled into a small hidden generator function, and the expression creates a generator object from it. One detail matters: the first (outermost) iterable is evaluated immediately, when the expression is created. Everything else, including the if condition, the output expression and any inner for, is evaluated later, when items are requested.",
    "This means names used inside the expression are looked up at consumption time. If you change such a variable between creating and consuming the generator, the generator sees the new value. The loop variable itself lives in the hidden function's scope, so it does not leak into the surrounding code.",
    "A generator expression is not always faster than a list comprehension. Per item it is a little slower, because the generator must be resumed each time. It wins on memory, and it wins on time when the consumer can stop early, as any(), all() and next() do. For str.join a list comprehension is slightly faster, because join needs a list anyway and builds one from the generator.",
    "The round brackets can be left out when the expression is the only argument of a call: sum(x for x in data). A generator expression has no len(), cannot be indexed and can be used only once. There is no 'tuple comprehension'; (x for x in data) is a generator, and you need tuple(...) around it to get a tuple."
  ],
  iq: [
    { q: "The list is replaced after the generator expression is created. What is printed?", a: "It prints [3]. The first iterable (the old list) is fixed when the expression is created, so the loop runs over 1, 2, 3. The condition 'n in nums' is evaluated later, and at that time nums is the new list [3].", c: `
nums = [1, 2, 3]
g = (n for n in nums if n in nums)
nums = [3]
print(list(g))   # [3]
` },
    { q: "After the 'in' test, why is the generator empty?", a: "'in' reads items from the generator until it finds the value. 9 is the last square, so the test consumes everything. A generator does not restart, so list() has nothing left.", c: `
squares = (n * n for n in range(4))
print(9 in squares)     # True
print(list(squares))    # []
` },
    { q: "How much memory does a generator expression use compared with a list comprehension?", a: "The list holds one pointer per item, so it grows with the data. The generator object has a small fixed size, because it stores only its frame and current position. That is true for any number of items.", c: `
import sys
lst = [n for n in range(100000)]
gen = (n for n in range(100000))
print(sys.getsizeof(lst) > 100000)   # True
print(sys.getsizeof(gen) < 500)      # True
` },
    { q: "Which is better for any(): a list comprehension or a generator expression?", a: "A generator expression. any() stops at the first true item, so the generator computes only the items that are needed. A list comprehension computes every item first, even if the first one is already true." }
  ],
  tips: [
    "Find the first match with next((x for x in items if x.ok), None). It stops at the first hit and needs no loop with break.",
    "Pass generator expressions straight into sum, min, max, any, all, set and dict without building a list first.",
    "Do not pass a generator expression to code that loops twice or calls len() on it. Give that code a list.",
    "When the data is reused or small, write a list comprehension. Use the generator form when data is large, is a stream, or the consumer may stop early."
  ]
});

EXTRA(3, "Decorators", {
  deep: [
    "'@deco' above 'def f' is only a short way to write f = deco(f). The decorator runs once, at the moment the function is defined, which normally means at import time. It does not run on each call; what runs on each call is the wrapper function that the decorator returned. With several decorators, the one nearest to the function is applied first, and the top one becomes the outer layer that runs first on a call.",
    "After decoration the name points to the wrapper, not to your function. Without help, the wrapper has its own __name__, __doc__ and signature, which breaks help(), logs and tools that inspect functions. functools.wraps copies these attributes to the wrapper and adds __wrapped__, which points to the original function.",
    "A decorator with arguments, such as @retry(times=3), has three levels. Python first calls retry(times=3); the result must be a normal decorator; that decorator receives the function and returns the wrapper. So '@retry' and '@retry()' are different things, and mixing them up is a common error.",
    "A decorator can also be a class with __call__, and a decorator can be applied to a class. When you decorate a method, the wrapper receives self as its first argument, so write wrappers with *args and **kwargs. A wrapper for an 'async def' function must itself be async and must await the call. Do not hide important business logic inside decorators; they make the flow harder to follow and add a small cost on every call."
  ],
  iq: [
    { q: "Two decorators are stacked. What is the order of the output?", a: "Decorators are applied bottom-up at definition time, so 'apply b' comes before 'apply a'. At call time the outer wrapper (from a) runs first, then the wrapper from b, then the function. Think of it as hello = a(b(hello)).", c: `
def a(f):
    print("apply a")
    def w():
        print("run a")
        f()
    return w

def b(f):
    print("apply b")
    def w():
        print("run b")
        f()
    return w

@a
@b
def hello():
    print("hello")

hello()
# apply b
# apply a
# run a
# run b
# hello
` },
    { q: "What is lost when a decorator does not use functools.wraps?", a: "The decorated name now points to the wrapper, so __name__ is 'wrapper' and the docstring is gone. Logs, debuggers, help() and frameworks that read function names then show wrong information. @wraps(f) on the wrapper fixes it.", c: `
def deco(f):
    def wrapper(*args, **kwargs):
        return f(*args, **kwargs)
    return wrapper

@deco
def pay():
    """Pay the bill."""

print(pay.__name__)   # wrapper
print(pay.__doc__)    # None
` },
    { q: "The decorated function returns None. Where is the bug?", a: "The wrapper calls the original function but does not return its result. A function without return gives None, so the caller loses the value. The wrapper must do 'return f(*args)'.", c: `
def log(f):
    def wrapper(*args):
        print("calling")
        f(*args)
    return wrapper

@log
def add(a, b):
    return a + b

print(add(2, 3))
# calling
# None
` },
    { q: "When does the code inside a decorator run: at import or at call?", a: "The decorator body runs once when the def statement is executed, which is at import time for module-level functions. Only the inner wrapper runs on each call. So slow work or side effects in the decorator body slow down every import of the module." }
  ],
  tips: [
    "Always put @functools.wraps(func) on the wrapper. It keeps names and docstrings correct, and tests can reach the original function through func.__wrapped__.",
    "Be careful with @lru_cache on methods: the cache holds a reference to self, so instances are never freed. Use functools.cached_property for per-object values, or cache a module-level function.",
    "For retries with backoff, use a tested library such as tenacity instead of writing your own decorator. Retry logic has many edge cases.",
    "Type your decorators with ParamSpec and TypeVar (Python 3.10+), so editors and type checkers still know the argument types of the decorated function."
  ]
});

EXTRA(3, "Closures", {
  deep: [
    "When the compiler sees that an inner function uses a variable of the outer function, it does not store that variable in the normal way. It puts it in a small box called a cell. The outer function and the inner function both use the same cell. The inner function keeps its cells in the __closure__ attribute, and that is what keeps the variable alive after the outer function has returned.",
    "A closure captures the variable, not the value it had at that moment. The value is read when the inner function runs. This is called late binding. It causes the famous loop bug: functions created in a loop all share one loop variable and all see its final value. The fix is to bind the value at creation time, with a default argument, functools.partial or a factory function.",
    "Reading an outer variable works without any keyword. Assigning to it does not: an assignment inside the inner function makes the name local to the inner function. Then a line like 'count += 1' fails with UnboundLocalError, because it reads the local name before it has a value. The 'nonlocal' statement tells Python to use the variable of the enclosing function.",
    "Closures are good for one small piece of state and one action. When you need several values or several operations, a class is clearer. Closures and lambdas also cannot be pickled by the standard pickle module, so they cannot be sent to worker processes with multiprocessing. A closure also keeps everything it captured alive, which can hold a large object in memory for a long time."
  ],
  iq: [
    { q: "Three lambdas are created in a loop. What do they return?", a: "All return 2. Each lambda refers to the variable i, not to its value at creation time. When the lambdas are called, the loop is finished and i is 2. A default argument 'i=i' copies the current value into each function.", c: `
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])     # [2, 2, 2]

fixed = [lambda i=i: i for i in range(3)]
print([f() for f in fixed])     # [0, 1, 2]
` },
    { q: "Why does this counter fail?", a: "'count += 1' is an assignment, so Python treats count as a local variable of inc. It then tries to read that local before it has a value and raises UnboundLocalError. Adding 'nonlocal count' at the top of inc fixes it.", c: `
def counter():
    count = 0
    def inc():
        count += 1
        return count
    return inc

c = counter()
try:
    c()
except UnboundLocalError:
    print("UnboundLocalError")   # UnboundLocalError
` },
    { q: "x is changed after the inner function is defined. Which value does the closure see?", a: "It sees 20. The closure holds the cell of the variable, not a copy of the value 10. Any later change to x in the outer function is visible to the inner function.", c: `
def outer():
    x = 10
    def inner():
        return x
    x = 20
    return inner

f = outer()
print(f())                              # 20
print(f.__closure__[0].cell_contents)   # 20
` },
    { q: "Is every nested function a closure?", a: "No. A nested function is a closure only if it uses a variable from the enclosing function. If it uses none, its __closure__ attribute is None and it is just a function defined in another function." }
  ],
  tips: [
    "For callbacks, prefer functools.partial(func, value) over a lambda in a loop. partial binds the value immediately, so there is no late-binding bug.",
    "Functions sent to multiprocessing or a process pool must be defined at module level. Closures and lambdas raise a pickling error there.",
    "When the state grows to more than one or two variables, or needs several operations, change the closure into a small class. It is easier to test and debug.",
    "Do not capture big objects in a long-lived callback. Capture only the small value you need (an id, a number), so the big object can be freed."
  ]
});

EXTRA(3, "Context managers", {
  deep: [
    "The protocol has two methods. __enter__ runs at the start, and its return value is what the 'as' name receives; this is often the manager itself but it can be any object. __exit__(exc_type, exc, tb) runs at the end. If the block ended normally, all three arguments are None. If an exception happened, they describe it.",
    "The return value of __exit__ matters. A true value tells Python that the exception was handled, and the program continues after the with block. A false value (or None) lets the exception continue. Returning True by accident hides errors, so return it only on purpose. If __enter__ itself raises, __exit__ is not called, because the setup never finished.",
    "@contextmanager turns a generator function into a context manager. The code before yield is the setup, the yielded value goes to 'as', and the code after yield is the cleanup. If the block raises, the exception is thrown into the generator at the yield line. So the cleanup must be in a 'finally' block, or it is skipped when there is an error. The function must yield exactly once.",
    "contextlib has more tools: ExitStack manages a number of managers that is known only at runtime, suppress() ignores chosen exceptions, closing() calls close() for you, and nullcontext() is a do-nothing manager for optional cases. Async code uses __aenter__ and __aexit__ with 'async with'. A with block does not create a new variable scope; names assigned inside it still exist after it."
  ],
  iq: [
    { q: "Why does the program continue after a division by zero?", a: "__exit__ returns True. That tells Python the exception is handled, so it is swallowed and the code after the with block runs. Return False or nothing if you only want to clean up.", c: `
class Quiet:
    def __enter__(self):
        return self
    def __exit__(self, exc_type, exc, tb):
        return True

with Quiet():
    1 / 0
print("still running")   # still running
` },
    { q: "Why is 'close' never printed?", a: "The exception from the with block is raised inside the generator at the yield line. Without try/finally the lines after yield are skipped. Put the yield in 'try' and the cleanup in 'finally'.", c: `
from contextlib import contextmanager

@contextmanager
def res():
    print("open")
    yield
    print("close")

try:
    with res():
        raise ValueError("boom")
except ValueError:
    print("error")
# open
# error
` },
    { q: "What does the name after 'as' refer to?", a: "It is the return value of __enter__, not the object written after 'with'. Many managers return self, but they do not have to. If __enter__ returns nothing, the name is None.", c: `
class Db:
    def __enter__(self):
        return "connection"
    def __exit__(self, *args):
        return False

with Db() as x:
    print(x)    # connection
` },
    { q: "If __enter__ raises an exception, is __exit__ called?", a: "No. __exit__ is called only if __enter__ finished successfully. So __enter__ must clean up its own partial work before it lets an exception out." }
  ],
  tips: [
    "In every @contextmanager function, write 'try: yield ... finally: cleanup'. Without finally the cleanup is skipped exactly when you need it most.",
    "Use contextlib.ExitStack when the number of resources is dynamic, for example opening a list of files. It closes all of them in reverse order, even if one fails.",
    "Know what a library's context manager really does. 'with sqlite3.connect(path) as conn' commits or rolls back the transaction but does NOT close the connection.",
    "Use contextlib.suppress(FileNotFoundError) instead of try/except/pass for an error you expect and want to ignore. It is shorter and shows the intent."
  ]
});

EXTRA(3, "with", {
  deep: [
    "The with statement is translated into roughly these steps: evaluate the expression to get the manager, call its __enter__, bind the result to the 'as' name, run the block, then call __exit__. If the block raised, __exit__ receives the exception, and the exception continues unless __exit__ returns a true value. Python looks up __enter__ and __exit__ on the type of the object, not on the instance.",
    "__exit__ runs on every way out of the block: normal end, exception, return, break and continue. That is the whole point. With a return inside the block, the return value is computed first, then __exit__ runs, then the function really returns.",
    "Several managers in one statement, 'with a() as x, b() as y:', behave exactly like nested with blocks. They are entered left to right and exited right to left. If the second one fails during setup, the first one is still exited properly. Since Python 3.10 you can put them in round brackets and write one per line.",
    "The 'as' name is a normal variable and still exists after the block; a file object is then closed but the name still points to it. Without 'with', CPython usually closes a file when its reference count reaches zero, but this is not guaranteed: an exception traceback can keep the file alive, and other Python implementations free objects later. An object without __enter__ and __exit__ cannot be used in with and raises TypeError."
  ],
  iq: [
    { q: "After the with block, does the variable f still exist?", a: "Yes. with does not create a scope, so f still points to the file object. The file is closed, so using it raises ValueError.", c: `
with open("demo.txt", "w") as f:
    f.write("hi")
print(f.closed)      # True
try:
    f.write("more")
except ValueError:
    print("file is closed")   # file is closed
` },
    { q: "There is a return inside the with block. Does __exit__ still run, and when?", a: "Yes. The return value is prepared, then __exit__ runs, and only then the function returns to the caller. So 'exit' is printed before the result.", c: `
class M:
    def __enter__(self):
        print("enter")
    def __exit__(self, *args):
        print("exit")

def f():
    with M():
        return "result"

print(f())
# enter
# exit
# result
` },
    { q: "With two managers in one with statement, in which order are they closed?", a: "In reverse order of opening, like a stack. The last one opened is closed first. This is important when the second resource depends on the first, such as a cursor on a connection.", c: `
from contextlib import contextmanager

@contextmanager
def tag(name):
    print("open", name)
    try:
        yield
    finally:
        print("close", name)

with tag("a"), tag("b"):
    print("body")
# open a
# open b
# body
# close b
# close a
` },
    { q: "Does a with statement catch exceptions?", a: "No, not by itself. It only guarantees that __exit__ runs; the exception then continues to the caller. It is swallowed only if __exit__ returns a true value, as contextlib.suppress does on purpose." }
  ],
  tips: [
    "Always pass encoding='utf-8' to open() for text files. Without it Python may use the system's default encoding, which differs between Windows and Linux.",
    "Use tempfile.TemporaryDirectory() and tempfile.NamedTemporaryFile() in a with block for scratch files. They are removed automatically, even when a test fails.",
    "To replace a file safely, write to a temporary file in the same folder inside a with block, then call os.replace(temp, target). Readers never see a half-written file.",
    "Use 'with lock:' and never separate lock.acquire() and lock.release() calls. A missed release after an exception blocks all other threads forever."
  ]
});

EXTRA(3, "Exceptions", {
  deep: [
    "When code raises, Python creates an exception object and attaches a traceback, which is a chain of the frames that were running. Then it leaves the current function and each calling function, one by one, until it finds a try block with a matching except. Matching uses isinstance and the except clauses are tested from top to bottom; the first match wins. Since Python 3.11 a try block costs almost nothing when no error happens, but raising and catching is still slow compared with a simple if.",
    "All exceptions inherit from BaseException. Normal errors inherit from Exception. KeyboardInterrupt, SystemExit and GeneratorExit inherit directly from BaseException, so 'except Exception' does not catch them. A bare 'except:' catches everything, including Ctrl+C, which is why it should not be used.",
    "'finally' runs on every path out of the try statement, also when there is a return, break or continue. If the finally block itself contains a return, that return wins: it replaces the earlier return value and silently discards any exception in flight. Python 3.14 gives a SyntaxWarning for return, break or continue inside finally (PEP 765) because it is nearly always a bug.",
    "Exceptions remember their history. If a new exception is raised while another is being handled, the old one is stored in __context__. 'raise NewError(...) from e' stores it in __cause__ and marks it as the direct cause, and 'from None' hides it. The name in 'except E as e' is deleted when the except block ends, to avoid a reference cycle with the traceback. The 'else' block runs only when try raised nothing, and its own errors are not caught by the except clauses above it."
  ],
  iq: [
    { q: "Both try and finally have a return. What does the function return?", a: "It returns 'finally'. The finally block always runs before the function really returns, and a return inside it replaces the first one. It would also hide an exception, so never return from finally.", c: `
def f():
    try:
        return "try"
    finally:
        return "finally"

print(f())   # finally
` },
    { q: "finally changes x after 'return x'. What is returned?", a: "It returns 1. The return value is computed before the finally block runs. Assigning a new value to the name x afterwards does not change the value that is already prepared for return.", c: `
def g():
    x = 1
    try:
        return x
    finally:
        x = 2

print(g())   # 1
` },
    { q: "Which except block runs?", a: "The first one. KeyError is a subclass of LookupError, and Python takes the first clause that matches. The KeyError clause below can never run. Always put the more specific exception first.", c: `
try:
    {}["key"]
except LookupError:
    print("lookup")      # lookup
except KeyError:
    print("key")
` },
    { q: "Can you use the name from 'except ... as e' after the except block?", a: "No. Python deletes the name at the end of the except block, so using it later raises NameError. If you need the exception afterwards, assign it to another variable inside the block.", c: `
try:
    1 / 0
except ZeroDivisionError as e:
    pass
try:
    print(e)
except NameError:
    print("e was deleted")   # e was deleted
` }
  ],
  tips: [
    "Catch the most specific exception you can handle, and let the rest go up. 'except Exception: pass' hides bugs and makes production problems very hard to find.",
    "To re-raise inside an except block, write a bare 'raise'. It keeps the original traceback.",
    "When you turn a low-level error into your own error, write 'raise OrderError(...) from e'. The log then shows both the business error and the real cause.",
    "Retry only errors that can go away (timeouts, connection resets), with a limit and a growing delay. Never retry errors like ValueError or a 400 response; they will fail again."
  ]
});

EXTRA(3, "Custom exceptions", {
  deep: [
    "An exception instance stores its constructor arguments in the 'args' attribute, and str(e) is built from args. This matters for pickling: to rebuild the exception, pickle calls the class again with args. If your __init__ takes (balance, amount) but passes only one message to super().__init__(), then args holds one item and the rebuild fails. This hits you in multiprocessing, Celery and other tools that send exceptions between processes.",
    "A good design is one base class per application or library, for example AppError, with specific errors below it. Callers can then catch everything from your package with one clause, or one specific problem. A custom error can also inherit from a built-in one, such as class ConfigKeyError(AppError, KeyError), so old code that catches KeyError keeps working.",
    "Put useful data on the exception as attributes: an error code, the order id, the HTTP status. Code that handles the error should read attributes and never parse the message text. Keep the hierarchy shallow; two levels are enough for most projects.",
    "Do not create a custom class when a built-in one says it exactly. A wrong argument value is ValueError, a wrong type is TypeError, a missing key is KeyError. Always inherit from Exception, not from BaseException, or 'except Exception' in servers and frameworks will not catch your error and the process may die."
  ],
  iq: [
    { q: "Does 'except AppError' catch a DbError?", a: "Yes, because DbError is a subclass of AppError and except uses isinstance. The object keeps its real type, so type(e) is still DbError. This is why a common base class is useful.", c: `
class AppError(Exception):
    pass

class DbError(AppError):
    pass

try:
    raise DbError("down")
except AppError as e:
    print(type(e).__name__, e)   # DbError down
` },
    { q: "This exception works in normal code but fails when it is pickled. Why?", a: "Pickle rebuilds the exception by calling the class with e.args. Here args is only the one message that was passed to super().__init__(), but __init__ needs two arguments, so the rebuild raises TypeError. Pass all arguments to super().__init__() and build the text in __str__, or define __reduce__.", c: `
import pickle

class FundsError(Exception):
    def __init__(self, balance, amount):
        super().__init__("Need " + str(amount))
        self.balance = balance

e = FundsError(500, 800)
print(e.args)                    # ('Need 800',)
try:
    pickle.loads(pickle.dumps(e))
except TypeError:
    print("cannot unpickle")     # cannot unpickle
` },
    { q: "What does 'raise ... from e' add?", a: "It stores the original exception in the __cause__ attribute of the new one. The traceback then shows both, joined by 'The above exception was the direct cause'. You keep the real reason while callers handle your own clean error type.", c: `
class ConfigError(Exception):
    pass

try:
    try:
        int("abc")
    except ValueError as e:
        raise ConfigError("bad port") from e
except ConfigError as err:
    print(type(err.__cause__).__name__)   # ValueError
` },
    { q: "Why should a custom exception inherit from Exception and not from BaseException?", a: "Code everywhere uses 'except Exception' to catch normal errors. BaseException is the parent of special signals such as KeyboardInterrupt and SystemExit that should pass through. An error that inherits directly from BaseException skips those handlers and can stop the whole program." }
  ],
  tips: [
    "Create one errors.py (or exceptions.py) module per package with a base class and the specific errors. Everyone then knows where to look and what to catch.",
    "End class names with 'Error' (PaymentDeclinedError). It is the convention in PEP 8 and makes except clauses easy to read.",
    "In a web app, convert exceptions to HTTP responses in one central place (FastAPI exception_handler, Flask errorhandler, Django middleware). Business code only raises domain errors.",
    "Keep two texts apart: a safe message for the user and full details for the log. Never send SQL, file paths or stack traces to the client."
  ]
});

EXTRA(3, "Logging", {
  deep: [
    "Loggers form a tree based on dotted names: 'shop.orders' is a child of 'shop', and everything is under the root logger. logging.getLogger(name) always returns the same object for the same name. When you log a message, the logger makes a record and gives it to its own handlers and then to the handlers of each parent up to the root. This upward travel is called propagation.",
    "There are two level checks. First the logger: if it has no level set, it uses the level of the nearest parent that has one, and the root default is WARNING. Then each handler has its own level. So you can send everything from DEBUG to a file and only ERROR to email. A Formatter controls the text, and a Filter can drop or change records.",
    "logging.basicConfig() sets up the root logger, but only if the root has no handlers yet. A second call does nothing unless you pass force=True (Python 3.8+). This is why 'my basicConfig is ignored' happens when a library or an earlier import already configured logging.",
    "Pass values as arguments: log.info('Order %s', order_id). The text is formatted only if the record is really emitted, and tools can group messages by the unchanged template. An f-string is always formatted, even when the level is off. Library code should only call getLogger(__name__) and log; adding handlers and choosing levels is the job of the application."
  ],
  iq: [
    { q: "No configuration was done. Why is info() silent but warning() printed?", a: "The effective level comes from the root logger, which is WARNING by default, so INFO is dropped. With no handlers at all, Python uses a 'last resort' handler that prints WARNING and above to stderr with only the message text.", c: `
import logging
log = logging.getLogger("app")
log.info("started")       # prints nothing
log.warning("careful")    # prints: careful
` },
    { q: "Why does every message appear twice?", a: "The record is handled by the handler on the 'app' logger and then propagates to the root logger, which has its own handler from basicConfig. Attach handlers only to the root, or set log.propagate = False. The same problem appears when addHandler is called again on every function call.", c: `
import logging
logging.basicConfig(format="%(message)s")
log = logging.getLogger("app")
log.addHandler(logging.StreamHandler())
log.warning("hello")
# hello
# hello
` },
    { q: "Do two getLogger calls with the same name give two loggers?", a: "No. The logging module keeps one logger per name and returns the same object each time. So every module can call getLogger with a name and share the configuration without passing logger objects around.", c: `
import logging
a = logging.getLogger("shop.orders")
b = logging.getLogger("shop.orders")
print(a is b)   # True
` },
    { q: "What is the difference between log.error() and log.exception()?", a: "log.exception() logs at ERROR level and also adds the current traceback. It should be called only inside an except block. log.error() writes just the message unless you pass exc_info=True." }
  ],
  tips: [
    "Start each module with logger = logging.getLogger(__name__). The dotted module name gives you the logger tree for free, and you can change the level of one package alone.",
    "Configure logging once, at the program's entry point, with logging.config.dictConfig. Never configure it at import time inside a library module.",
    "In containers, log to stdout and let the platform collect the lines. On a plain server use RotatingFileHandler or TimedRotatingFileHandler so the disk does not fill up.",
    "Add a request id or order id to every line (with a Filter, a LoggerAdapter or contextvars), and never log passwords, tokens or full card numbers."
  ]
});

EXTRA(3, "Type hints", {
  deep: [
    "Annotations are stored on the function, class or module in __annotations__. The interpreter does not use them to check anything; a call with the wrong type runs normally and fails only if the code itself fails. Python 3.14 evaluates annotations lazily (PEP 649), so a hint can name a class that is defined later in the file without putting it in quotes.",
    "A type checker such as mypy or pyright reads the source code without running it. Typing in Python is gradual: code without hints is treated as the special type Any, which is compatible with everything. So a half-typed project gets only half of the checks, and by default mypy does not check the body of a function that has no hints.",
    "Some names mislead people. Optional[int] means 'int or None'; it does not make an argument optional, only a default value does that. A Protocol describes the methods an object must have, with no inheritance needed, which is duck typing for the type checker. Python 3.12 added a short syntax for generics: def first[T](items: list[T]) -> T.",
    "Type hints do not make code faster and do not validate input from outside. Libraries like Pydantic and FastAPI validate at runtime because they read the annotations and add their own checks. For parameters, accept wide abstract types such as Sequence, Mapping or Iterable; for return values, be exact. Hints for a tiny throw-away script are often not worth the time."
  ],
  iq: [
    { q: "The function says x: int but receives a string. What happens?", a: "It runs and prints 'abab'. Python does not check hints at runtime, and 'ab' * 2 is valid. Only a type checker or a validation library would report the mistake.", c: `
def double(x: int) -> int:
    return x * 2

print(double("ab"))            # abab
print(double.__annotations__)  # {'x': <class 'int'>, 'return': <class 'int'>}
` },
    { q: "Does Optional[int] make the argument optional?", a: "No. Optional[int] only says the value may be an int or None. The caller must still pass it. An argument becomes optional only when it has a default value, such as x: int | None = None.", c: `
from typing import Optional

def f(x: Optional[int]):
    return x

try:
    f()
except TypeError:
    print("x is still required")   # x is still required
` },
    { q: "Can you use isinstance(x, list[int])?", a: "No, it raises TypeError. A parameterised type like list[int] exists for type checkers; at runtime a list does not know the type of its items. Use isinstance(x, list) and check the items yourself if you must.", c: `
x = [1, 2]
print(isinstance(x, list))       # True
try:
    isinstance(x, list[int])
except TypeError:
    print("TypeError")           # TypeError
` },
    { q: "What is the difference between Any and object as a type hint?", a: "Any switches checking off: any operation on the value is accepted. object means 'any value', but the checker allows only what every object supports, so you must narrow the type with isinstance before using it. Use object when you really accept anything, and avoid Any." }
  ],
  tips: [
    "Run mypy or pyright in CI so type errors block the merge. In an old project, turn on strict settings for new modules first and extend step by step.",
    "Replace dict[str, Any] for structured data with a dataclass, a TypedDict or a Pydantic model. The checker and the editor then know every field name.",
    "Use typing.Protocol to describe a dependency by the methods you call on it. Test fakes then fit without inheriting from anything.",
    "When you must silence the checker, use a narrow comment with the error code, such as '# type: ignore[arg-type]', and say why. A plain ignore hides future errors on that line."
  ]
});

EXTRA(3, "Dataclasses", {
  deep: [
    "@dataclass runs once, when the class is created. It reads the class annotations, builds the source code of __init__, __repr__ and __eq__ as text, compiles it and attaches the methods to the class. The result is a normal class with no extra cost per instance. Only names that have a type annotation become fields; a class attribute without annotation is ignored by the dataclass machinery.",
    "Fields are placed in __init__ in the order they are written, so a field without a default cannot follow a field with a default. With inheritance the parent's fields come first, which makes this rule hurt; kw_only=True (Python 3.10+) removes the problem. A mutable default such as a list is rejected with ValueError when the class is defined, and you must use field(default_factory=list).",
    "Equality compares the fields as a tuple, and only between objects of the same class. Because __eq__ is generated, __hash__ is set to None, so instances cannot be put in a set or used as dict keys. frozen=True blocks assignment to fields and gives back a hash made from the fields. Frozen is shallow: a list stored in a frozen dataclass can still be changed.",
    "__post_init__ runs at the end of the generated __init__ and is the place for validation and computed fields. A dataclass does not check or convert types at runtime: Order(id='abc') is accepted even if id is annotated as int. When you parse data from outside (JSON, forms, environment), use Pydantic or validate by hand. slots=True saves memory, but it builds a new class, which can surprise code that uses super() without arguments in old versions."
  ],
  iq: [
    { q: "y has a value but no annotation. Is it a field?", a: "No. Only annotated names become fields. y is a normal class attribute shared by all instances, so it is not in __init__ and not in the repr. Passing a second argument raises TypeError.", c: `
from dataclasses import dataclass

@dataclass
class P:
    x: int = 1
    y = 2

print(P())          # P(x=1)
try:
    P(1, 2)
except TypeError:
    print("y is not a field")   # y is not a field
` },
    { q: "Can a dataclass instance be put in a set?", a: "Not by default. The generated __eq__ makes the class unhashable, because a mutable object with value equality would break sets and dicts. With frozen=True the instance cannot change, so Python adds a hash based on the fields.", c: `
from dataclasses import dataclass

@dataclass
class A:
    x: int

@dataclass(frozen=True)
class B:
    x: int

try:
    {A(1)}
except TypeError:
    print("A is unhashable")    # A is unhashable
print(len({B(1), B(1)}))        # 1
` },
    { q: "Is a frozen dataclass fully immutable?", a: "No. frozen=True only stops assigning to the fields. A mutable object inside a field, such as a list, can still be changed. For real immutability use tuples and other immutable types as field values.", c: `
from dataclasses import dataclass, field

@dataclass(frozen=True)
class Cart:
    items: list = field(default_factory=list)

c = Cart()
c.items.append("pen")
print(c)     # Cart(items=['pen'])
` },
    { q: "Why is 'items: list = []' not allowed in a dataclass?", a: "The default would be one list object shared by every instance, the same bug as a mutable default argument. Dataclasses detect list, dict and set defaults and raise ValueError when the class is defined. Use field(default_factory=list), which makes a new list for each instance." }
  ],
  tips: [
    "For value objects such as Money or Coordinates, use @dataclass(frozen=True, slots=True). You get safe hashing, less memory and no accidental changes.",
    "Validate in __post_init__ and raise ValueError early. An invalid object should never exist.",
    "Make a changed copy with dataclasses.replace(obj, field=value) instead of mutating. Note that dataclasses.asdict() copies everything deeply and is slow for big objects.",
    "Use kw_only=True for classes with many fields. Calls become readable, and adding a field later cannot shift the position of other arguments."
  ]
});

EXTRA(3, "Enum", {
  deep: [
    "Enum classes are built by a special metaclass. When the class body is finished, the metaclass turns every plain class attribute into an instance of the class and stores them in a table. Each member is created exactly once, so comparing with 'is' is correct and fast. The class itself can be iterated in definition order, and you can look a member up by value with Status('paid') or by name with Status['PAID'].",
    "A member of a plain Enum is not equal to its value: Status.PAID == 'paid' is False. This surprises people who read values from JSON or a database. IntEnum and StrEnum members are real ints and strings, so they compare equal to raw values, but they also lose some safety because they mix with any int or str.",
    "If two names have the same value, the second one is not a new member; it is an alias for the first. Aliases do not appear when you iterate over the class. The @unique decorator turns duplicate values into an error. auto() fills in values when you do not care what they are, and Flag supports members that are combined with the | operator.",
    "An enum with members cannot be subclassed to add more members, and members cannot be reassigned. Enums can have methods and properties, which is a good place for small logic like 'is this status final?'. Do not use an Enum when the list of values changes at runtime or comes from a database table; an enum is for a set that is fixed in the code."
  ],
  iq: [
    { q: "Is an enum member equal to its value?", a: "Not for a plain Enum: the member is its own object and compares False with the raw value. With IntEnum (or StrEnum) the member is also an int (or str), so the comparison is True. Compare members with members, or use .value.", c: `
from enum import Enum, IntEnum

class Color(Enum):
    RED = 1

class Level(IntEnum):
    LOW = 1

print(Color.RED == 1)   # False
print(Level.LOW == 1)   # True
` },
    { q: "Two members have the same value. How many members does the enum have?", a: "Two, not three. ENABLED has the same value as ACTIVE, so it becomes an alias: another name for the same member. Aliases are skipped in iteration. Add @unique to forbid this.", c: `
from enum import Enum

class Status(Enum):
    ACTIVE = 1
    ENABLED = 1
    OFF = 2

print(Status.ENABLED)     # Status.ACTIVE
print(len(list(Status)))  # 2
` },
    { q: "What is the difference between Status('paid') and Status['PAID']?", a: "Round brackets look up by value and raise ValueError when nothing matches. Square brackets look up by name and raise KeyError. Both return the same single member object.", c: `
from enum import Enum

class Status(Enum):
    PAID = "paid"

print(Status("paid") is Status["PAID"])   # True
try:
    Status("PAID")
except ValueError:
    print("ValueError")                   # ValueError
` },
    { q: "Can json.dumps serialise an enum member?", a: "Not a plain Enum member; it raises TypeError because json does not know the type. Send member.value, or use StrEnum or IntEnum, whose members are real strings and ints and are written as such." }
  ],
  tips: [
    "For values that go to JSON, APIs or a database as text, use StrEnum (Python 3.11+). It serialises without extra code and still gives you named constants.",
    "Convert raw input to the enum at the edge of the system: Status(raw_value) raises ValueError for unknown values immediately, so bad data does not travel inside.",
    "Store the stable .value in the database, and never renumber the values of an IntEnum that is already stored. Old rows would silently change meaning.",
    "Put @unique on enums whose values must be different, and use auto() when the actual value is not important."
  ]
});
