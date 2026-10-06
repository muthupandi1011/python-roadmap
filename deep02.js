EXTRA(2, "Lists", {
  deep: [
    "A CPython list is an array of pointers to objects, not an array of the objects themselves. Each slot is 8 bytes on a 64-bit system and the items live elsewhere in memory. That is why one list can hold different types, and why copying a list copies only the pointers (a shallow copy).",
    "The list keeps some spare slots at the end. When they are full, it allocates a bigger array (about 12 percent bigger, plus a little) and moves the pointers. So append is O(1) on average, even though a single append is sometimes O(n). pop() from the end is O(1). insert(0, x), pop(0), remove(x) and 'x in list' are O(n), because items must be shifted or scanned.",
    "A slice such as a[1:4] creates a new list and copies the pointers, so it costs O(k) for k items. Multiplying a list repeats the same pointers: [[0] * 3] * 3 gives three references to one inner list, not three lists. Equality (==) compares item by item, while 'is' checks if two names are the same list.",
    "Do not use a list when you search it often (use a set or dict), when you add and remove at the front (use collections.deque), or for millions of numbers (use array or NumPy, which store raw values and not pointers)."
  ],
  iq: [
    { q: "What does this print?", a: "All three rows change. The outer * 3 copies the reference to the same inner list three times, so there is only one row object. Create each row separately with a comprehension.", c: `
grid = [[0] * 3] * 3
grid[0][0] = 1
print(grid)       # [[1, 0, 0], [1, 0, 0], [1, 0, 0]]

grid = [[0] * 3 for _ in range(3)]
grid[0][0] = 1
print(grid)       # [[1, 0, 0], [0, 0, 0], [0, 0, 0]]
` },
    { q: "After a shallow copy, which changes to the copy also change the original?", a: "Changes to the copy's own slots (append, assign an index) do not affect the original. Changes inside a shared inner object do, because copy() copies only the outer list. Use copy.deepcopy for a fully separate copy.", c: `
a = [[1, 2], [3]]
b = a.copy()          # same as a[:] or list(a)
b.append([4])
b[0].append(9)
print(a)              # [[1, 2, 9], [3]]
print(b)              # [[1, 2, 9], [3], [4]]
` },
    { q: "What is the difference between append, extend and += ?", a: "append adds its argument as one item, even if it is a list. extend and += add each item of an iterable. With a string, += adds each character, which is a common surprise.", c: `
a = [1]
a.append([2, 3])
print(a)            # [1, [2, 3]]

b = [1]
b.extend([2, 3])
print(b)            # [1, 2, 3]

c = [1]
c += "hi"
print(c)            # [1, 'h', 'i']
` },
    { q: "What is the time complexity of the common list operations?", a: "Index read and write: O(1). append and pop() at the end: O(1) on average. insert(0, x), pop(0), remove, index and 'in': O(n). Slicing k items: O(k). sort: O(n log n). The list is a dynamic array, so anything that shifts or scans items is linear." }
  ],
  tips: [
    "If you test 'x in items' inside a loop, convert items to a set first. This turns an O(n * m) job into O(n + m).",
    "Build strings with ''.join(parts) and lists with a comprehension, not with repeated + in a loop, which copies the whole thing each time.",
    "Use the bisect module to search or insert in a list you keep sorted. Search is O(log n) instead of O(n).",
    "When you pass a list to code that might change it, pass a copy (items.copy()), and use copy.deepcopy only when the list holds other mutable objects, because deepcopy is slow."
  ]
});

EXTRA(2, "Tuples", {
  deep: [
    "A tuple is stored as one fixed block: a small header followed by the pointers to its items. It has no spare space for growth, so it uses less memory than a list with the same items and is a little faster to create. CPython also builds a tuple of constants such as (1, 2, 3) once at compile time and reuses it.",
    "The comma creates a tuple, not the parentheses. '5,' is a tuple, (5) is just the number 5 in brackets, and a one-item tuple must be written (5,). The only exception is the empty tuple, written ().",
    "Immutability is shallow. You cannot add, remove or replace the items of a tuple, but if an item is a list, that list can still change. Such a tuple is not hashable, so it cannot be a dict key or set member. A tuple is hashable only if all of its items are hashable.",
    "Tuples compare item by item from the left, which makes them perfect sort keys such as (department, salary). Do not use a plain tuple for records with many fields, because code like row[7] is unreadable. Use NamedTuple or a dataclass there, and a list when the data must change."
  ],
  iq: [
    { q: "What happens here: an error, a changed list, or both?", a: "Both. += first extends the list in place, which works. Then it tries to store the result back into t[1], which fails with TypeError because a tuple does not support item assignment. The list is already changed when the error is raised.", c: `
t = (1, [2, 3])
try:
    t[1] += [4]
except TypeError:
    print("TypeError")      # TypeError
print(t)                    # (1, [2, 3, 4])
` },
    { q: "What are the types of (5), (5,) and () ?", a: "(5) is an int, because brackets alone only group an expression. (5,) is a tuple with one item, because the comma makes the tuple. () is the empty tuple.", c: `
a = (5)
b = (5,)
c = 5,
print(type(a).__name__, type(b).__name__, type(c).__name__)   # int tuple tuple
print(len(()))                                                # 0
` },
    { q: "A tuple is immutable. What does += do to it, and what does b print?", a: "It prints (1, 2). += on a tuple creates a new tuple and binds the name a to it. b still points to the old tuple. Compare this with a list, where += changes the shared object.", c: `
a = (1, 2)
b = a
a += (3,)
print(a)        # (1, 2, 3)
print(b)        # (1, 2)
` },
    { q: "Can every tuple be used as a dictionary key?", a: "No. A tuple is hashable only if every item inside it is hashable. (1, 'a') works as a key, but (1, [2]) raises TypeError: unhashable type: 'list'." }
  ],
  tips: [
    "Use typing.NamedTuple or a frozen dataclass for records. You get names (point.lat) instead of positions (point[0]) and keep immutability.",
    "Use a tuple as a composite dictionary key, for example cache[(user_id, date)], instead of joining values into a string.",
    "Store fixed groups of options as tuples (ALLOWED_ROLES = ('admin', 'staff')), so no code can append to them by accident.",
    "Sort by several fields with a tuple key: sorted(staff, key=lambda e: (e.dept, -e.salary)). Tuples compare field by field from the left."
  ]
});

EXTRA(2, "Sets", {
  deep: [
    "A set is a hash table that stores only keys. To add or find an item, Python calls hash() on it, uses the hash to choose a slot in an internal array, and uses == to confirm the match. When two items land on the same slot, it probes other slots. Lookup, add and remove are O(1) on average and O(n) in the rare worst case.",
    "Because the position depends on the hash, a set has no order you can rely on. The hash of a string is different in each run of the program (hash randomisation), so the print order of a set of strings can change between runs. Sets also cannot be indexed or sliced.",
    "Items must be hashable, so a set cannot contain lists, dicts or other sets; use frozenset for a set inside a set. Two values that are equal count as the same item, so 1, 1.0 and True take only one place. Note that {} creates an empty dict. The empty set is set().",
    "The operators (|, &, -, ^) need sets on both sides, while the methods (union, intersection, difference) accept any iterable. Intersection costs about the size of the smaller set. A set uses much more memory than a list of the same items, so do not use it when you just need to store and loop."
  ],
  iq: [
    { q: "What is the type of {} ?", a: "It is a dict, not a set. The braces were used for dicts first, so the empty set must be written set(). Braces with items and no colons, such as {1}, create a set.", c: `
print(type({}).__name__)        # dict
print(type(set()).__name__)     # set
print(type({1}).__name__)       # set
` },
    { q: "How many items are in {1, 1.0, True} ?", a: "One. The three values are equal (1 == 1.0 == True) and have the same hash, so the set treats them as the same item. The first one inserted is the one that is kept.", c: `
s = {1, 1.0, True}
print(len(s))      # 1
print(s)           # {1}
` },
    { q: "How do you remove duplicates from a list and keep the original order?", a: "list(set(items)) removes duplicates but loses the order. dict.fromkeys(items) keeps the first position of each item, because dicts keep insertion order, and then list() gives the keys back.", c: `
items = [3, 1, 3, 2, 1]
print(list(dict.fromkeys(items)))     # [3, 1, 2]
` },
    { q: "What is the difference between remove() and discard()? And why is 'x in a_set' faster than 'x in a_list'?", a: "remove raises KeyError if the item is missing; discard does nothing. Membership in a set is one hash calculation and a jump to the slot, O(1) on average, while a list must be compared item by item, O(n)." }
  ],
  tips: [
    "Before a loop that does many membership tests, convert the lookup list to a set once. It is the cheapest big speed-up in everyday Python.",
    "Use set difference to compare two collections: missing = expected_ids - actual_ids. It is one clear line instead of nested loops.",
    "Never depend on the order of a set. Sort it (sorted(s)) before you print it, write it to a file, or compare it in a test.",
    "Use frozenset for constant lookup sets at module level, and when you need a set as a dict key or as a member of another set."
  ]
});

EXTRA(2, "Dictionaries", {
  deep: [
    "A dict is a hash table. Since CPython 3.6 it has two parts: a small sparse index table, and a dense array of entries (hash, key, value) kept in insertion order. A lookup computes hash(key), finds a slot in the index, and then checks the stored key, first by identity and then with ==. This layout is why dicts keep insertion order and use less memory than before.",
    "Lookup, insert and delete are O(1) on average. When the table is about two thirds full, it is rebuilt with a bigger size, which is O(n) but happens rarely. Keys must be hashable, and equal keys are the same key: 1, 1.0 and True all point to one entry. Updating an existing key keeps its original position.",
    "keys(), values() and items() return views, not copies. A view shows the current content of the dict. Adding or removing keys while you loop over the dict raises RuntimeError. Loop over list(d) if you need to delete inside the loop.",
    "d[key] raises KeyError for a missing key, d.get(key) returns None or a default, and d.setdefault(key, value) inserts the value if the key is missing. A dict is the wrong tool for a record with a fixed set of fields: a dataclass gives names, types and editor support."
  ],
  iq: [
    { q: "What does this dict contain?", a: "One entry: {1: 'c'}. 1, True and 1.0 are equal and have the same hash, so they are the same key. The first key object (1) is kept, and each later assignment only replaces the value.", c: `
d = {1: "a", True: "b", 1.0: "c"}
print(d)          # {1: 'c'}
print(len(d))     # 1
` },
    { q: "What happens when you delete keys while looping over a dict?", a: "Python raises RuntimeError: dictionary changed size during iteration. Loop over a copy of the keys with list(d), or build a new dict with a comprehension.", c: `
d = {"a": 1, "b": 2}
try:
    for k in d:
        del d[k]
except RuntimeError:
    print("RuntimeError")      # RuntimeError

d = {"a": 1, "b": 2}
for k in list(d):
    del d[k]
print(d)                       # {}
` },
    { q: "What is the trap in dict.fromkeys(keys, []) ?", a: "All keys share the same list object, because the default value is created once and not copied. Appending through one key shows up under every key. Use a dict comprehension to create a new list per key.", c: `
d = dict.fromkeys(["a", "b"], [])
d["a"].append(1)
print(d)          # {'a': [1], 'b': [1]}

d = {k: [] for k in ["a", "b"]}
d["a"].append(1)
print(d)          # {'a': [1], 'b': []}
` },
    { q: "Dicts keep insertion order. Does order matter when two dicts are compared with == ?", a: "No. {'a': 1, 'b': 2} == {'b': 2, 'a': 1} is True; only the keys and values count. Order is guaranteed by the language since Python 3.7 (it was an implementation detail of CPython 3.6)." }
  ],
  tips: [
    "Use d.get(key, default) or 'if key in d' when a missing key is normal, and plain d[key] when a missing key is a bug that should raise an error at once.",
    "Loop with 'for key, value in d.items()'. Looping over keys and then reading d[key] does a second lookup for every item.",
    "When every record has the same known fields, use a dataclass or TypedDict instead of a free dict, so that a wrong field name is found by the type checker.",
    "Remember that JSON object keys are always strings. A dict with int keys comes back from json.dumps and json.loads with str keys, and lookups by int then fail."
  ]
});

EXTRA(2, "Strings", {
  deep: [
    "A str is immutable, so every method that seems to change it (upper, replace, strip) returns a new string. CPython stores a string with 1, 2 or 4 bytes per character, chosen by the widest character in it. Because of this fixed width, indexing s[i] is O(1). The hash of a string is computed once and cached, which makes strings fast dict keys.",
    "len() counts Unicode code points. It does not count bytes, and it does not count what a person sees as one character. Some emoji and some accented letters are made of several code points. To get bytes for a file or network, call s.encode('utf-8'); to get text back, call b.decode('utf-8').",
    "Since strings cannot change, s += part in a loop creates a new string each time, which can cost O(n squared) in total. CPython sometimes optimises this, but you should not depend on it. Collect the parts in a list and call ''.join(parts) once.",
    "CPython reuses (interns) some strings, for example names and short constants in the source code. So 'is' may return True for two equal strings, but a string built at runtime is usually a different object. Always compare strings with ==."
  ],
  iq: [
    { q: "What is the difference between split() and split(' ') ?", a: "split() with no argument splits on any run of whitespace and drops empty strings. split(' ') splits on every single space, so two spaces in a row produce an empty string in the result.", c: `
s = "a b  c"
print(s.split())         # ['a', 'b', 'c']
print(s.split(" "))      # ['a', 'b', '', 'c']
` },
    { q: "What does this print?", a: "It prints hello. upper() returns a new string and does not change s. You must assign the result: s = s.upper(). The same is true for replace, strip and every other string method.", c: `
s = "hello"
s.upper()
print(s)             # hello
s = s.upper()
print(s)             # HELLO
` },
    { q: "Two strings have the same text. Can 'is' be False?", a: "Yes. 'is' checks if both names point to the same object. A string built at runtime is a separate object from a constant with the same text, so == is True and 'is' is False.", c: `
a = "hello"
b = "".join(["hel", "lo"])
print(a == b)        # True
print(a is b)        # False
` },
    { q: "What does 'www.example.com'.strip('w.com') return?", a: "It returns 'example'. The argument of strip is a set of characters to remove from both ends, not a prefix or suffix. Python removes w, dot, c, o and m from each end until it meets another character. Use removeprefix and removesuffix (3.9+) for exact text.", c: `
url = "www.example.com"
print(url.strip("w.com"))              # example
print(url.removeprefix("www."))        # example.com
print(url.removesuffix(".com"))        # www.example
` }
  ],
  tips: [
    "Build long strings with ''.join(parts) and format values with f-strings. Avoid + in loops.",
    "Compare user text without case using casefold(), which is stronger than lower() for non-English letters, and strip() input first.",
    "Decode bytes to str as soon as data enters the program and encode only when it leaves. Always name the encoding; do not rely on the default.",
    "Never put user input into SQL, shell commands or HTML with f-strings. Use query parameters, argument lists and template escaping to prevent injection attacks."
  ]
});

EXTRA(2, "Mutable vs immutable", {
  deep: [
    "Mutability is a property of the object, not of the variable. Any name can be bound again to another object at any time. The real question is whether the object itself can change while it keeps the same identity. You can watch this with id(): after a list is changed in place its id is the same, but after s += '!' the name s has a new id.",
    "Augmented assignment shows the difference. For x += y, Python first tries the in-place method __iadd__. Lists have it, so the same object is extended. Strings, ints and tuples do not have it, so Python computes x + y, creates a new object and binds the name to it.",
    "Assignment and argument passing never copy. If you need an independent object, make a copy: list(a), a.copy() or copy.copy(a) give a shallow copy that still shares the inner objects, and copy.deepcopy(a) copies everything, which is slow for big structures.",
    "Immutability is shallow too: a tuple that holds a list can still change inside. Mutable objects in shared places are a main source of bugs: default arguments, class attributes, module-level variables. Immutable objects are safe to share between functions and threads, and can be used as dict keys."
  ],
  iq: [
    { q: "The common fix 'items = items or []' has a bug. What is it?", a: "An empty list is falsy, so when the caller passes an empty list, 'or' replaces it with a new list and the caller's list is never filled. Test for None exactly: if items is None: items = [].", c: `
def add(item, items=None):
    items = items or []
    items.append(item)
    return items

cart = []
add("pen", cart)
print(cart)          # []   the caller's list was ignored

def add_ok(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items

add_ok("pen", cart)
print(cart)          # ['pen']
` },
    { q: "What does this print?", a: "It prints ['pen']. items is a class attribute, so there is one list shared by all objects of the class. Create the list in __init__ with self.items = [] to give each object its own list.", c: `
class Cart:
    items = []            # one list shared by every Cart

a = Cart()
b = Cart()
a.items.append("pen")
print(b.items)            # ['pen']
` },
    { q: "A function does += on a string argument and on a list argument. What does the caller see?", a: "The caller's string is unchanged and the caller's list is changed. For the string, += creates a new object that only the local name points to. For the list, += changes the shared object in place.", c: `
def shout(s, lst):
    s += "!"
    lst += ["!"]

word = "hi"
items = ["hi"]
shout(word, items)
print(word, items)        # hi ['hi', '!']
` },
    { q: "Why did the designers of Python make strings immutable?", a: "Immutable strings can be used as dict keys, because their hash never changes. They can be shared safely between functions and threads without copying, and the interpreter can cache the hash and reuse equal strings. The cost is that building a string piece by piece needs join." }
  ],
  tips: [
    "For optional mutable parameters use 'items=None' and then 'if items is None: items = []'. Do not use 'items or []'.",
    "Create mutable attributes inside __init__ (self.items = []), never in the class body, unless you really want all objects to share them.",
    "Make value objects and settings immutable with @dataclass(frozen=True), tuples and frozenset. A wrong write then fails loudly instead of corrupting shared state.",
    "When a function returns internal state, such as a list kept in a cache, return a copy. Otherwise the caller can change your internal data by accident."
  ]
});

EXTRA(2, "Hashability", {
  deep: [
    "hash(obj) calls obj.__hash__() and returns an integer. Dicts and sets use this number to choose a slot, and then use == to confirm that the stored key is really the one wanted. So there is one rule that must always hold: if a == b, then hash(a) == hash(b). The reverse is not required; different objects may have the same hash (a collision).",
    "If a key could change after it was inserted, its hash would change and the dict would look in the wrong slot. The entry would be lost while still inside the table. This is why lists, dicts and sets define no hash. A tuple or frozenset is hashable only if every item inside it is hashable.",
    "Objects of your own classes are hashable by default: the hash comes from the identity, and == compares identity. If you define __eq__ and do not define __hash__, Python sets __hash__ to None and the objects become unhashable. A dataclass behaves the same way; use frozen=True to get a hash based on the fields.",
    "The hash of str and bytes changes in every run of the program. Python adds a random seed at startup to protect web servers from hash-flooding attacks. So never store the result of hash() in a file or database, and never send it to another process. Hashes of ints are stable, and hash(1) == hash(1.0) == hash(True) because the values are equal."
  ],
  iq: [
    { q: "This class defines __eq__. Why can its objects not be put in a set?", a: "When a class defines __eq__ without __hash__, Python sets __hash__ to None, because the default identity hash would break the rule that equal objects have equal hashes. Add a __hash__ that uses the same fields as __eq__, or use a frozen dataclass.", c: `
class Point:
    def __init__(self, x):
        self.x = x
    def __eq__(self, other):
        return self.x == other.x

try:
    {Point(1)}
except TypeError:
    print("TypeError")       # TypeError  unhashable type: 'Point'
` },
    { q: "Is hash('abc') the same every time you run the program? Is hash(1) equal to hash(1.0)?", a: "hash('abc') is different in each run, because string hashing uses a random seed per process. Inside one run it never changes. hash(1), hash(1.0) and hash(True) are equal, because equal values must have equal hashes.", c: `
print(hash(1) == hash(1.0) == hash(True))     # True
print(hash("abc") == hash("abc"))             # True   same process
# but the number printed by hash("abc") changes from run to run
` },
    { q: "Is a tuple always hashable?", a: "No. The hash of a tuple is computed from the hashes of its items, so one unhashable item makes the whole tuple unhashable.", c: `
print(hash((1, 2)) == hash((1, 2)))     # True
try:
    hash((1, [2]))
except TypeError:
    print("TypeError")                  # TypeError
` },
    { q: "What happens if an object is used as a dict key and then a field used in its __hash__ is changed?", a: "The entry is still stored in the slot of the old hash. A lookup now computes the new hash and searches another slot, so the key is not found, even though it is visible when you loop over the dict. Keys must not change in any way that affects their hash or equality." }
  ],
  tips: [
    "Use @dataclass(frozen=True) for objects that are dict keys or set members. It creates matching __eq__ and __hash__ methods for you.",
    "To make a cache key from unhashable data, convert it: list to tuple, set to frozenset, dict to tuple(sorted(d.items())).",
    "functools.lru_cache needs hashable arguments. Passing a list or dict raises TypeError, so pass tuples or design the function to take simple values.",
    "For a hash that must be stable between runs or machines (file checksums, cache keys in Redis, sharding), use hashlib, for example hashlib.sha256. Never use the built-in hash() for that."
  ]
});

EXTRA(2, "List/set/dict comprehensions", {
  deep: [
    "A comprehension is compiled into a loop with a special bytecode instruction that adds each result directly to the new container. A normal loop must look up and call the append method on every round. This is why a comprehension is usually faster than the same for loop, although the difference is modest.",
    "A comprehension has its own scope, so its loop variable does not leak into the surrounding code. Since Python 3.12 comprehensions are inlined into the enclosing function for speed (PEP 709), but the variable is still kept separate. Several for clauses run in the same order as nested loops, from left to right.",
    "There are two different places for a condition. An 'if' at the end is a filter that drops items. An 'if ... else ...' at the front is a conditional expression that chooses a value for every item and drops nothing. Round brackets do not make a 'tuple comprehension'; they make a generator expression, which is lazy and can be read only once.",
    "A list comprehension builds the whole list in memory. For large data that you only loop over or pass to sum(), any() or max(), use a generator expression. Do not use a comprehension only for side effects such as printing, and switch to a normal loop when the logic needs more than two clauses."
  ],
  iq: [
    { q: "What is the difference between these two comprehensions?", a: "The first has a conditional expression in front: every item gives a result, either x or 0. The second has a filter at the end: items that fail the test are dropped.", c: `
nums = [-1, 2, -3, 4]
print([x if x > 0 else 0 for x in nums])    # [0, 2, 0, 4]
print([x for x in nums if x > 0])           # [2, 4]
` },
    { q: "In which order do two for clauses run? How do you flatten a nested list?", a: "They run like nested loops written in the same order: the first for is the outer loop. To flatten, write the outer loop first: for row in matrix, then for n in row.", c: `
print([(x, y) for x in range(2) for y in range(2)])
# [(0, 0), (0, 1), (1, 0), (1, 1)]

matrix = [[1, 2], [3, 4]]
print([n for row in matrix for n in row])     # [1, 2, 3, 4]
` },
    { q: "What does this print?", a: "It prints 5 0. Round brackets create a generator, not a tuple. The first sum() consumes all its items, so the second sum() gets nothing and returns 0.", c: `
g = (x * x for x in range(3))
print(sum(g), sum(g))        # 5 0
print(type(g).__name__)      # generator
` },
    { q: "What happens in a dict comprehension when two items produce the same key?", a: "The later value replaces the earlier one without any error, so the result can have fewer entries than the input. Check for this when you build a lookup table by a field that may not be unique.", c: `
words = ["a", "b", "cc"]
print({len(w): w for w in words})      # {1: 'b', 2: 'cc'}
` }
  ],
  tips: [
    "Pass a generator expression straight to sum(), any(), all(), min() and max(), like sum(o.amount for o in orders). No temporary list is built.",
    "Build lookup tables with a dict comprehension, such as users_by_id = {u.id: u for u in users}, and then use O(1) lookups instead of searching the list again.",
    "Limit a comprehension to one loop and one condition, or two simple loops. If it does not fit on one or two lines, write a normal loop or move the logic to a function.",
    "Never write a comprehension only to call a function for its side effect, like [print(x) for x in items]. Use a for loop; the list of None values is wasted."
  ]
});

EXTRA(2, "Sorting", {
  deep: [
    "Timsort looks for parts of the data that are already in order, called runs, and then merges these runs. On data that is sorted or nearly sorted it needs only about n comparisons, so it is O(n). The worst case is O(n log n), and it uses up to O(n) extra memory. Since Python 3.11 the merge order follows the Powersort strategy, but the behaviour you see is the same.",
    "The sort is stable: items with equal keys keep their original order. This makes multi-level sorting easy. Either sort with a tuple key, or sort several times, starting with the least important key. With reverse=True the sort is still stable.",
    "The key function is called exactly once for each item, and the results are stored, so a slow key costs n calls, not n log n. Items are compared only with the < operator. In Python 3, comparing values of different types, such as int with str or None with int, raises TypeError.",
    "list.sort() changes the list and returns None; it exists only on lists. sorted() accepts any iterable and always returns a new list. Strings are sorted by Unicode code point, so all uppercase letters come before all lowercase letters, and digits in text are compared as characters."
  ],
  iq: [
    { q: "What does sorted() return for a string or a tuple?", a: "Always a new list, whatever the input type. sorted('bca') gives a list of characters, not a string. Join the result if you need a string again.", c: `
print(sorted("bca"))              # ['a', 'b', 'c']
print(sorted((3, 1, 2)))          # [1, 2, 3]
print("".join(sorted("bca")))     # abc
` },
    { q: "How do you sort by department A to Z, and inside each department by salary from high to low?", a: "Use a tuple key and negate the number: tuples compare from left to right. If the second field cannot be negated, such as a string, sort twice: first by the secondary key, then by the primary key. The sort is stable, so this works.", c: `
emps = [("it", 50), ("hr", 70), ("it", 90)]
print(sorted(emps, key=lambda e: (e[0], -e[1])))
# [('hr', 70), ('it', 90), ('it', 50)]
` },
    { q: "Why are these two results surprising?", a: "Strings are compared by character codes. Uppercase letters come before lowercase letters, and '10' comes before '9' because '1' is smaller than '9'. Pass key=str.lower or key=int to get the order people expect.", c: `
print(sorted(["apple", "Banana", "cherry"]))    # ['Banana', 'apple', 'cherry']
print(sorted(["apple", "Banana", "cherry"], key=str.lower))
# ['apple', 'Banana', 'cherry']

print(sorted(["10", "9", "2"]))                 # ['10', '2', '9']
print(sorted(["10", "9", "2"], key=int))        # ['2', '9', '10']
` },
    { q: "What algorithm does Python use for sorting, what is its complexity, and what happens with sorted([3, 'a', None]) ?", a: "Timsort, a stable mix of merge sort and insertion sort: O(n log n) in the worst case and O(n) for already sorted data. sorted([3, 'a', None]) raises TypeError, because Python 3 does not order values of different types." }
  ],
  tips: [
    "Use operator.itemgetter and operator.attrgetter as key functions: sorted(rows, key=itemgetter('price')). They are faster than a lambda and easy to read.",
    "Do not sort when you only need the smallest or largest item (use min or max, O(n)) or the top few items (use heapq.nlargest or nsmallest).",
    "For data that comes from a database, sort and limit in SQL (ORDER BY with LIMIT). Loading all rows to sort them in Python wastes memory and time.",
    "When values can be None, put them last with a key such as key=lambda r: (r.price is None, r.price or 0), instead of letting the sort raise TypeError."
  ]
});

EXTRA(2, "lambda", {
  deep: [
    "A lambda creates exactly the same kind of object as def: a function. The only differences are that its name is '<lambda>' and that its body must be one expression, whose value is returned automatically. There is no speed difference between a lambda and a def with the same body.",
    "Because the body is a single expression, a lambda cannot contain statements: no assignment with =, no return, no try, no loops, no type hints. It can use the conditional expression (a if cond else b), and it can have default arguments, *args and **kwargs.",
    "A lambda is a closure like any other function. It looks up outer variables when it is called, not when it is created. Lambdas created in a loop therefore all see the last value of the loop variable, unless you bind the value with a default argument.",
    "PEP 8 says not to assign a lambda to a name; use def, so that tracebacks show a real name. Lambdas also cannot be pickled by the standard pickle module, so they cannot be sent to worker processes with multiprocessing. Often a ready-made function is better: operator.itemgetter, str.lower, or functools.partial."
  ],
  iq: [
    { q: "What does this print, and how do you fix it?", a: "The first line prints [20, 20, 20]. Every lambda reads i when it is called, and by then the loop has finished with i = 2. Writing i=i as a default argument stores the current value in each function.", c: `
mults = [lambda x: x * i for i in range(3)]
print([m(10) for m in mults])       # [20, 20, 20]

fixed = [lambda x, i=i: x * i for i in range(3)]
print([m(10) for m in fixed])       # [0, 10, 20]
` },
    { q: "Can a lambda take default arguments or *args? Can it be called at once?", a: "Yes to all. A lambda accepts the same kinds of parameters as def, and you can call it immediately by putting it in brackets.", c: `
print((lambda x, y=2: x * y)(4))        # 8
print((lambda *a: sum(a))(1, 2, 3))     # 6
f = lambda: "no arguments"
print(f())                              # no arguments
print(f.__name__)                       # <lambda>
` },
    { q: "What can a def do that a lambda cannot?", a: "A def can hold many statements, loops, try/except, assignments, a docstring and type hints, and it has a real name in tracebacks. A lambda is limited to one expression. The function objects they create are otherwise the same type." },
    { q: "Why does multiprocessing fail when you pass it a lambda?", a: "Arguments sent to another process are pickled. pickle stores a function by its module and name and imports it again on the other side. A lambda has no importable name, so pickling fails. Use a function defined with def at module level." }
  ],
  tips: [
    "Use a lambda only for a short, one-time key or callback. If it is reused, longer than one line, or needs a comment, write a def.",
    "Prefer existing functions over lambdas: key=str.lower instead of key=lambda s: s.lower(), and operator.itemgetter('price') instead of lambda d: d['price'].",
    "Use functools.partial(send, channel='sms') to fix some arguments of a function. It shows a useful repr in logs and can be pickled when the function can.",
    "For defaultdict, pass the type itself (int, list, set) instead of lambda: 0 or lambda: []. It is faster, and the dict can still be pickled."
  ]
});

EXTRA(2, "map, filter, reduce", {
  deep: [
    "In Python 3, map and filter return lazy iterators. No function is called until something asks for the next item, and each item is computed only once. After you loop over the iterator one time it is empty. Wrap it in list() if you need the results more than once.",
    "map can take several iterables and passes one item from each to the function. It stops when the shortest one ends. filter(None, items) is a special form that removes all falsy items (0, empty string, None, empty containers).",
    "reduce(f, items) calls f(result_so_far, next_item) from left to right. Without a start value it uses the first item as the start, so an empty input raises TypeError. Always pass a start value as the third argument when the input can be empty.",
    "When you need a lambda, a comprehension is usually faster and easier to read than map or filter, because it avoids one function call per item. map is a good choice when the function already exists, as in map(int, parts). For reduce, Python often has a clearer built-in: sum, min, max, any, all, math.prod, ''.join, or itertools.accumulate."
  ],
  iq: [
    { q: "What does this print?", a: "It prints ['A', 'B'] and then an empty list. A map object is an iterator that can be consumed only once. The first list() takes all items, and nothing is left for the second.", c: `
m = map(str.upper, ["a", "b"])
print(list(m))       # ['A', 'B']
print(list(m))       # []
` },
    { q: "What does filter(None, items) do?", a: "With None as the function, filter keeps the items that are truthy. It removes 0, empty strings, None and empty containers. Be careful: it also removes a valid 0.", c: `
items = [0, 1, "", "a", None, [], [0]]
print(list(filter(None, items)))      # [1, 'a', [0]]
` },
    { q: "What happens when reduce is called on an empty list?", a: "Without a start value it raises TypeError, because there is no first item to start from. With a start value it returns that value.", c: `
from functools import reduce

try:
    reduce(lambda a, b: a + b, [])
except TypeError:
    print("TypeError")                       # TypeError
print(reduce(lambda a, b: a + b, [], 0))     # 0
` },
    { q: "What does map do with two lists of different length? And why does map(print, items) print nothing?", a: "map stops at the shortest input and silently ignores the extra items. map(print, items) prints nothing because map is lazy: the function is not called until the iterator is consumed, for example by list() or a for loop.", c: `
print(list(map(lambda a, b: a + b, [1, 2, 3], [10, 20])))    # [11, 22]

m = map(print, ["x", "y"])     # nothing is printed here
print("before")                # before
list(m)                        # now x and y are printed
` }
  ],
  tips: [
    "Use map when the function already exists, for example nums = list(map(int, line.split(','))). Use a comprehension when you would need a lambda.",
    "Replace reduce with a built-in when one exists: sum() for adding, math.prod() for multiplying, any() and all() for tests, ''.join() for strings.",
    "If you do use reduce, always pass the start value as the third argument, so that empty input does not crash production.",
    "Chain lazy steps (map, filter, generator expressions) to process large files row by row. Nothing is loaded into memory until the final loop pulls each item through."
  ]
});

EXTRA(2, "zip, enumerate", {
  deep: [
    "zip returns an iterator. On each step it calls next() on every input, in order, and yields the results as one tuple. It stops as soon as any input is finished, so extra items of longer inputs are dropped without any warning. Since Python 3.10, zip(a, b, strict=True) raises ValueError when the lengths differ. itertools.zip_longest fills the gaps instead.",
    "zip takes iterators, not only lists. When the inputs have different lengths, zip may already have taken one item from an earlier iterator before it finds that a later one is empty, and that item is lost. Passing the same iterator twice, zip(it, it), pulls two items per step and so groups the data in pairs.",
    "zip(*rows) is the reverse operation. The star spreads the rows as separate arguments, and zip then groups all first items, all second items, and so on. This turns rows into columns, or a list of pairs into two tuples.",
    "enumerate wraps any iterable and yields (count, item) pairs. The start argument only changes the first number of the counter; it does not skip items. Both zip and enumerate are lazy and can be consumed once, and they have no len()."
  ],
  iq: [
    { q: "What does zip do when the inputs have different lengths?", a: "It stops at the shortest input and drops the rest silently. Pass strict=True (Python 3.10+) to get a ValueError when the lengths are not equal.", c: `
print(list(zip([1, 2, 3], "ab")))       # [(1, 'a'), (2, 'b')]
try:
    list(zip([1, 2, 3], "ab", strict=True))
except ValueError:
    print("ValueError")                 # ValueError
` },
    { q: "How do you split a list of pairs back into two sequences?", a: "Call zip again with a star: zip(*pairs). The star passes each pair as a separate argument, and zip collects the first items together and the second items together. The results are tuples.", c: `
pairs = [(1, "a"), (2, "b"), (3, "c")]
nums, letters = zip(*pairs)
print(nums)        # (1, 2, 3)
print(letters)     # ('a', 'b', 'c')
` },
    { q: "Does enumerate(items, start=1) skip the first item?", a: "No. start only sets the first counter value. All items are still returned. To skip items, slice the list or use itertools.islice.", c: `
print(list(enumerate("ab", start=1)))     # [(1, 'a'), (2, 'b')]
` },
    { q: "What does zip(it, it) give when both arguments are the same iterator?", a: "It groups the items in pairs. zip takes one item for the first position and then the next item for the second position from the same iterator. A list would not behave this way, because zip would create two separate iterators for it.", c: `
it = iter([1, 2, 3, 4])
print(list(zip(it, it)))          # [(1, 2), (3, 4)]

nums = [1, 2, 3, 4]
print(list(zip(nums, nums)))      # [(1, 1), (2, 2), (3, 3), (4, 4)]
` }
  ],
  tips: [
    "Use zip(a, b, strict=True) in data pipelines where the two inputs must have the same length. A silent cut hides missing data.",
    "Turn a CSV row into a record with dict(zip(headers, row)), or simply use csv.DictReader, which does this for you.",
    "Use enumerate(file, start=1) to get line numbers for error messages such as 'bad value on line 42'.",
    "To compare each item with the next one, use itertools.pairwise(items) (3.10+) or zip(items, items[1:])."
  ]
});

EXTRA(2, "Stack and queue", {
  deep: [
    "A list is a good stack because append and pop work at the end of the array, where nothing has to move, so both are O(1). A list is a bad queue because pop(0) removes from the front and must shift every other item one place, which is O(n). A queue built on a list becomes slower as it grows.",
    "Python has several queue types for different jobs. collections.deque is the fast basic container. queue.Queue adds locks for threads: get() can wait until an item arrives, and maxsize makes put() wait when the queue is full. asyncio.Queue does the same for coroutines, and multiprocessing.Queue sends items between processes.",
    "Stacks and queues decide the order in which work is done. Function calls use a stack (the call stack), and so does depth-first search. Breadth-first search uses a queue, and that is why it finds the shortest path in an unweighted graph. A priority queue (heapq) returns the smallest item first.",
    "Calling pop() on an empty list or popleft() on an empty deque raises IndexError. Check with 'if stack:' first. An in-memory queue is lost when the process stops, so work that must survive a restart belongs in an external queue system."
  ],
  iq: [
    { q: "Why should you not use list.pop(0) to implement a queue?", a: "pop(0) is O(n), because all remaining items are shifted one place to the left. Removing n items this way costs O(n squared) in total. deque.popleft() is O(1)." },
    { q: "How do you build a queue using two stacks?", a: "Push new items on an inbox stack. To pop, take from an outbox stack; when the outbox is empty, move everything from the inbox to it, which reverses the order. Each item is moved at most once, so every operation is O(1) on average (amortised).", c: `
class Queue:
    def __init__(self):
        self.inbox, self.outbox = [], []
    def push(self, x):
        self.inbox.append(x)
    def pop(self):
        if not self.outbox:
            while self.inbox:
                self.outbox.append(self.inbox.pop())
        return self.outbox.pop()

q = Queue()
q.push(1)
q.push(2)
print(q.pop())             # 1
q.push(3)
print(q.pop(), q.pop())    # 2 3
` },
    { q: "How do you check that the brackets in a string are balanced?", a: "Use a stack. Push every opening bracket. For every closing bracket, pop and check that it matches. At the end the stack must be empty. It is O(n) time and O(n) space.", c: `
def balanced(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack

print(balanced("{[()]}"), balanced("(]"), balanced("(("))    # True False False
` },
    { q: "What is the difference between collections.deque and queue.Queue?", a: "deque is a plain fast container. queue.Queue is made for communication between threads: get() blocks until an item is available, put() blocks when maxsize is reached, and it has task_done() and join(). Use deque inside one thread and Queue between threads." }
  ],
  tips: [
    "Give queues between threads a size limit, queue.Queue(maxsize=1000). A producer that is faster than the consumer then waits instead of filling the memory.",
    "Jobs that must not be lost (emails, payments) belong in a durable queue such as RabbitMQ, Redis with Celery or RQ, or SQS, not in a Python list in memory.",
    "Replace deep recursion with a loop and your own stack list when the data can be deep (trees, folders, graphs). This avoids RecursionError.",
    "Always handle the empty case: test 'if stack:' before pop(), or catch IndexError, or queue.Empty when you use get_nowait()."
  ]
});

EXTRA(2, "deque", {
  deep: [
    "In CPython a deque is a doubly linked list of blocks, and each block holds 64 item pointers. Adding or removing at either end only touches the first or last block, so it is always O(1). Nothing is shifted and no big array is copied, unlike a list.",
    "The price is slower access in the middle. d[0] and d[-1] are O(1), but d[i] in the middle is O(n), because Python must walk through the blocks. insert and remove in the middle are O(n) too. A deque does not support slicing; use itertools.islice or convert it to a list.",
    "With maxlen set, the deque is a ring buffer. When it is full, an append drops one item from the left end, and an appendleft drops one from the right end. This happens silently, with no error. rotate(n) moves n items from the right end to the left; a negative n rotates the other way.",
    "The documentation states that append and pop operations at both ends of a deque are thread-safe. This makes a deque usable as a simple queue between threads, although queue.Queue is better when a thread must wait for items. Changing a deque while looping over it raises RuntimeError."
  ],
  iq: [
    { q: "What happens when you add to a deque that is full (maxlen reached)?", a: "No error is raised. The item at the opposite end is dropped. append removes from the left, and appendleft removes from the right.", c: `
from collections import deque

d = deque([1, 2, 3], maxlen=3)
d.append(4)
print(d)              # deque([2, 3, 4], maxlen=3)
d.appendleft(0)
print(d)              # deque([0, 2, 3], maxlen=3)
` },
    { q: "Can you slice a deque like a list?", a: "No. d[1:3] raises TypeError. Index access works, but it is O(n) in the middle. Use itertools.islice(d, 1, 3), or list(d)[1:3] when the deque is small.", c: `
from collections import deque
from itertools import islice

d = deque([10, 20, 30, 40])
try:
    d[1:3]
except TypeError:
    print("TypeError")               # TypeError
print(list(islice(d, 1, 3)))         # [20, 30]
print(d[0], d[-1])                   # 10 40
` },
    { q: "What does rotate do?", a: "rotate(n) with a positive n moves n items from the right end to the left end. A negative n moves items from the left end to the right end. It works in place and returns None.", c: `
from collections import deque

d = deque([1, 2, 3, 4, 5])
d.rotate(2)
print(d)           # deque([4, 5, 1, 2, 3])
d.rotate(-1)
print(d)           # deque([5, 1, 2, 3, 4])
` },
    { q: "Compare the complexity of list and deque.", a: "Add or remove at the right end: O(1) for both. Add or remove at the left end: O(n) for list, O(1) for deque. Read by index in the middle: O(1) for list, O(n) for deque. So use deque for queues and sliding windows, and list for random access." }
  ],
  tips: [
    "Use deque(maxlen=N) to keep the last N items: recent log lines, recent prices, undo history. Old items leave automatically, so memory use stays fixed.",
    "Read the last lines of a large file with deque(f, maxlen=10). It goes through the file once and keeps only ten lines in memory.",
    "Use a deque of timestamps for a simple rate limiter: append the new time, popleft the times older than the window, and check the length.",
    "Use deque for the queue in breadth-first search and other work lists. If your code often needs d[i] in the middle, a list is the better choice."
  ]
});

EXTRA(2, "heapq", {
  deep: [
    "A heap is a binary tree stored in a plain list. The children of the item at index i are at indexes 2*i + 1 and 2*i + 2. The only rule is that every parent is less than or equal to its children. So the smallest item is at index 0, but the rest of the list is not sorted.",
    "heappush adds the item at the end and moves it up, and heappop removes index 0 and repairs the tree. Both are O(log n). Reading heap[0] is O(1). heapify turns an existing list into a heap in O(n), which is faster than pushing the items one by one. Finding or removing some other item is O(n).",
    "heapq builds a min-heap. For a max-heap, the classic trick is to push negative numbers and negate them again when you pop. Python 3.14 added max-heap functions such as heapify_max, heappush_max and heappop_max. heapq.nlargest(k, data) keeps a heap of only k items, so it costs O(n log k).",
    "Heap entries are compared with <. Tuples are compared item by item, so when two priorities are equal, Python compares the next item of the tuple. If that item is a dict or an object without ordering, you get TypeError. A heap is also not stable: equal priorities do not come out in insertion order unless you add a counter."
  ],
  iq: [
    { q: "After heapify, is the list sorted?", a: "No. Only the heap rule holds: each parent is less than or equal to its children. The smallest item is at index 0. To get the items in order you must pop them one by one, or just use sorted().", c: `
import heapq

h = [5, 3, 8, 1]
heapq.heapify(h)
print(h)              # [1, 3, 8, 5]   a valid heap, not sorted
print(h[0])           # 1
` },
    { q: "heapq is a min-heap. How do you get the largest item first?", a: "Store the negative of each number and negate again when you pop. For records, use a tuple with the negative priority first. From Python 3.14 you can also use the functions that end in _max.", c: `
import heapq

nums = [3, 9, 5]
h = [-n for n in nums]
heapq.heapify(h)
print(-heapq.heappop(h))      # 9
print(-heapq.heappop(h))      # 5
` },
    { q: "Why can pushing (priority, task) tuples crash when two priorities are equal?", a: "When the first items are equal, tuple comparison goes on to the second items. If the tasks are dicts or objects without <, that comparison raises TypeError. Put a unique counter between the priority and the task, so the comparison never reaches the task.", c: `
import heapq
from itertools import count

h = []
heapq.heappush(h, (1, {"job": "a"}))
try:
    heapq.heappush(h, (1, {"job": "b"}))
except TypeError:
    print("TypeError")                # TypeError

h = []
counter = count()
heapq.heappush(h, (1, next(counter), {"job": "a"}))
heapq.heappush(h, (1, next(counter), {"job": "b"}))
print(heapq.heappop(h)[2])            # {'job': 'a'}
` },
    { q: "How do you find the 10 largest values among 10 million numbers efficiently?", a: "Keep a min-heap of size 10: for each number, push it and pop the smallest when the heap has more than 10 items. This is O(n log k) time and O(k) memory, and it is what heapq.nlargest does. Sorting everything is O(n log n) and needs all the data in memory." }
  ],
  tips: [
    "Store entries as (priority, counter, item) with itertools.count() as the counter. Equal priorities then come out in insertion order and the items are never compared.",
    "Choose by size: min() or max() for one item, heapq.nsmallest or nlargest for a few items, and sorted() when you need most of the data in order.",
    "Never change an item inside the heap list directly. If a priority must change, push a new entry and mark the old one as cancelled, then skip cancelled entries when you pop.",
    "Use heapq.merge to combine several sorted inputs, for example sorted log files, into one sorted stream without loading them all into memory."
  ]
});

EXTRA(2, "defaultdict", {
  deep: [
    "defaultdict is a subclass of dict that adds one hook. When d[key] does not find the key, dict calls a method named __missing__. In a defaultdict this method calls the factory function with no arguments, stores the result under the key, and returns it. Everything else works like a normal dict.",
    "The factory runs only for the d[key] form. d.get(key), 'key in d' and d.pop(key) do not call it and do not create anything. On the other hand, simply reading d[key] for a missing key inserts it. So a check written with square brackets silently makes the dict bigger.",
    "The argument must be something callable that takes no arguments, such as int, list, set or a lambda, or None. defaultdict(0) raises TypeError; write defaultdict(int), because int() returns 0. If the factory is None, the object behaves like a plain dict and raises KeyError.",
    "Compared with dict.setdefault(key, []), a defaultdict creates the default value only when it is needed, while setdefault builds a new empty list on every call, even if the key exists. Do not let a defaultdict leave your module by accident: other code that reads missing keys from it will add entries instead of getting an error."
  ],
  iq: [
    { q: "What is the length of the dict after these lines?", a: "It is 1. Reading d['a'] with square brackets created the key with the default value 0. get() and 'in' do not create keys, so 'b' and 'c' were not added.", c: `
from collections import defaultdict

d = defaultdict(int)
d["a"]                 # only a read, but it inserts the key
d.get("b")
"c" in d
print(len(d))          # 1
print(dict(d))         # {'a': 0}
` },
    { q: "What is wrong with defaultdict(0) ?", a: "The first argument must be a callable that produces the default, not the default value itself. defaultdict(0) raises TypeError. Use defaultdict(int), or defaultdict(lambda: 5) for another start value.", c: `
from collections import defaultdict

try:
    d = defaultdict(0)
except TypeError:
    print("TypeError")       # TypeError

d = defaultdict(lambda: 5)
print(d["x"])                # 5
` },
    { q: "How do you make a nested dict that creates all levels automatically?", a: "Use a factory function that returns a defaultdict of itself. Each missing key then creates another level. Be careful: with such a structure a typo in a key never raises an error.", c: `
from collections import defaultdict

def tree():
    return defaultdict(tree)

t = tree()
t["india"]["tn"]["chennai"] = 1
print(t["india"]["tn"]["chennai"])     # 1
print(len(t["japan"]))                 # 0   created just by reading
` },
    { q: "What is the difference between defaultdict(list) and dict.setdefault(key, []) ?", a: "Both give a list for a missing key. setdefault builds the empty list argument on every call, even when the key exists, and must be repeated at each place of use. defaultdict defines the default once and creates the value only when the key is really missing." }
  ],
  tips: [
    "Use defaultdict(list) to group items, defaultdict(set) to group without duplicates, and defaultdict(int) or Counter to count.",
    "Use d.get(key) or 'key in d' when you only want to check. Square brackets on a defaultdict insert the key and make the dict grow.",
    "Before you return or serialise the result, convert it with dict(d), or set d.default_factory = None. After that a missing key raises KeyError again.",
    "Avoid lambda factories when the object must be pickled, for example for multiprocessing or a cache. Use int, list, or a function defined with def."
  ]
});

EXTRA(2, "Counter", {
  deep: [
    "Counter is a dict subclass in which the keys are the items and the values are the counts. Counter(iterable) loops once over the data and adds 1 for each item, so building it is O(n). The items must be hashable, as with any dict key.",
    "Reading a missing key returns 0 and does not insert the key, which is different from defaultdict(int). Counts are ordinary integers. They can be zero or negative, and a key with count 0 stays in the Counter until you delete it.",
    "Counter has two kinds of arithmetic. The operators +, -, & and | return a new Counter and remove every result that is zero or negative. The methods update() and subtract() change the Counter in place and keep zero and negative counts. Also note that update() adds to the existing counts; it does not replace them, as dict.update() does.",
    "most_common(k) uses a heap for a small k, so it is O(n log k); without an argument it sorts everything. Items with equal counts are returned in the order they were first seen. total() (3.10+) returns the sum of all counts, and elements() repeats each item as many times as its count."
  ],
  iq: [
    { q: "What does a Counter return for a key that was never counted?", a: "It returns 0 instead of raising KeyError, and it does not add the key. So 'in' still returns False after the read.", c: `
from collections import Counter

c = Counter("aab")
print(c["z"])          # 0
print("z" in c)        # False
print(len(c))          # 2
` },
    { q: "What is the difference between c1 - c2 and c1.subtract(c2) ?", a: "The - operator returns a new Counter and drops results that are zero or negative. subtract() changes c1 in place and keeps zero and negative counts.", c: `
from collections import Counter

a = Counter("aab")           # a: 2, b: 1
b = Counter("abbb")          # a: 1, b: 3
print(a - b)                 # Counter({'a': 1})
a.subtract(b)
print(a)                     # Counter({'a': 1, 'b': -2})
` },
    { q: "How do you check that two words are anagrams?", a: "Compare their Counters: two words are anagrams when every letter appears the same number of times. This is O(n). Comparing sorted(a) == sorted(b) also works, but it is O(n log n).", c: `
from collections import Counter

print(Counter("listen") == Counter("silent"))     # True
print(Counter("aab") == Counter("abb"))           # False
` },
    { q: "How is Counter.update different from dict.update?", a: "dict.update replaces the value of an existing key. Counter.update adds the new counts to the old counts. It accepts an iterable of items or a mapping of counts.", c: `
from collections import Counter

c = Counter(a=1)
c.update(a=5)
print(c["a"])            # 6

d = dict(a=1)
d.update(a=5)
print(d["a"])            # 5
` }
  ],
  tips: [
    "Give Counter a generator to count large inputs without building a list: Counter(line.split()[0] for line in log_file).",
    "Use most_common(k) for 'top k' reports. Do not sort all the items by hand.",
    "Add the Counters from different files, days or workers with + or update() to merge partial results.",
    "When the data is in a database, or has millions of different keys, count there with GROUP BY and COUNT. Do not load all rows into a Counter."
  ]
});
