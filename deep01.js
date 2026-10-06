EXTRA(1, "Python installation & execution", {
  deep: [
    "CPython does not read your file one line at a time. It first parses the whole file and compiles it to bytecode, a list of simple instructions. Then a loop called the virtual machine runs those instructions one by one. This is why a syntax error on the last line stops the program before the first line runs.",
    "Bytecode for imported modules is saved in the __pycache__ folder as .pyc files, so the next start is faster. The script you run directly is compiled every time and gets no .pyc file. A .pyc file only saves compile time; it does not make the code itself run faster.",
    "A virtual environment is not a full copy of Python. It is a small folder with its own site-packages directory, a pyvenv.cfg file, and a link or copy of the interpreter. Activating it only changes the PATH variable, so 'python' and 'pip' point into that folder. You can also skip activation and call .venv/bin/python (or .venv/Scripts/python.exe on Windows) directly.",
    "CPython is the standard interpreter, but not the only one: PyPy has a JIT compiler and can be much faster for long loops. CPython itself is changing: 3.11 added a specialising interpreter that made code about 25 percent faster on average, 3.13 added an experimental JIT and an experimental build without the GIL, and in 3.14 the free-threaded build is officially supported but still optional."
  ],
  iq: [
    { q: "Is Python a compiled language or an interpreted language?", a: "Both steps happen. CPython compiles source code to bytecode, and then its virtual machine interprets that bytecode. It is called interpreted because the bytecode is not machine code and the compile step is automatic and hidden." },
    { q: "A file has print('start') on line 1 and a syntax error on line 2. What is printed?", a: "Nothing is printed. The whole file is compiled before any line runs, so the SyntaxError is raised first. A runtime error such as NameError is different: lines before it do run.", c: `
# bad.py
#   print("start")
#   x = = 1
#
# python bad.py
#   SyntaxError: invalid syntax     ("start" is NOT printed)
#
# but with a runtime error on line 2 instead:
#   print("start")
#   print(unknown_name)
# output: start, then NameError
` },
    { q: "What does the line if __name__ == '__main__': do, and why is it needed?", a: "Every module has a __name__ variable. It is '__main__' when the file is run directly, and the module name when the file is imported. The check lets a file work as both a script and an importable module, because the code under it does not run on import.", c: `
def main():
    print("running as a script")

if __name__ == "__main__":
    main()

# python tool.py      -> running as a script
# import tool         -> prints nothing
` },
    { q: "Why do people write 'python -m pip install' instead of just 'pip install'?", a: "The 'pip' command on your PATH may belong to a different Python than the 'python' command. Then the package is installed in one interpreter and the import fails in the other. 'python -m pip' always installs into the interpreter you are actually running." }
  ],
  tips: [
    "Create one virtual environment per project and never install project packages into the system Python. Add .venv and __pycache__ to .gitignore.",
    "Pin the Python version and package versions (requirements.txt with exact versions, or a lock file from uv, Poetry or pip-tools) so the server runs the same code as your laptop.",
    "On Windows use the 'py' launcher (py -3.13 -m venv .venv) to choose a Python version. On Linux and macOS use pyenv or uv to install several versions side by side.",
    "Run tools as modules (python -m pytest, python -m pip, python -m http.server). This guarantees the tool runs with the interpreter of the active environment."
  ]
});

EXTRA(1, "Variables and dynamic typing", {
  deep: [
    "In CPython every value is an object in memory with three things: a type, a reference count and the data. A variable is only an entry in a namespace (a dictionary of names) that holds a reference to an object. Assignment never copies data. 'b = a' just makes a second name for the same object.",
    "Because names only point to objects, two names can share one mutable object, and a change through one name is visible through the other. id(x) returns the identity of the object (its memory address in CPython). 'is' compares identity, while '==' compares value.",
    "When the reference count of an object drops to zero, CPython frees it immediately. Objects that point to each other in a cycle are found later by the cyclic garbage collector. This is why 'del x' removes the name, not necessarily the object.",
    "Dynamic typing does not mean weak typing. Python is strongly typed: '1' + 1 raises TypeError instead of guessing. Type hints do not change this. The interpreter ignores them at runtime; only tools such as mypy or pyright check them."
  ],
  iq: [
    { q: "What does this print, and what changes if you write b = b + [3] instead?", a: "It prints [1, 2, 3]. For a list, += changes the object in place, and a and b are the same object. With b = b + [3] a new list is created and only b points to it, so a stays [1, 2].", c: `
a = [1, 2]
b = a
b += [3]
print(a)        # [1, 2, 3]

a = [1, 2]
b = a
b = b + [3]
print(a)        # [1, 2]
` },
    { q: "Why can 'a is b' be True for small numbers and False for big numbers with the same value?", a: "CPython creates the integers from -5 to 256 once and reuses them, so every 100 is the same object. Bigger integers are normally created new each time. This is an implementation detail, so always compare numbers with ==.", c: `
a = int("100")
b = int("100")
print(a is b)      # True   cached small int

c = int("100000")
d = int("100000")
print(c is d)      # False  two separate objects
print(c == d)      # True
` },
    { q: "Is Python strongly typed or weakly typed? Is it statically typed or dynamically typed?", a: "Python is strongly and dynamically typed. Dynamic means types are checked at runtime and belong to objects, not names. Strong means Python does not silently convert unrelated types, so '1' + 1 is a TypeError." },
    { q: "Do type hints stop wrong types at runtime?", a: "No. Hints are stored in __annotations__ and are not enforced by the interpreter. You need a type checker (mypy, pyright) or a library such as pydantic to catch or validate wrong types.", c: `
def double(n: int) -> int:
    return n * 2

print(double("ab"))    # abab   no error at runtime
` }
  ],
  tips: [
    "Add type hints to function signatures and run mypy or pyright in CI. This finds many bugs that dynamic typing would otherwise show only in production.",
    "Do not reuse one name for different types (items as a list, then as a count). Use a new name. It makes the code easier to read and keeps type checkers happy.",
    "Use 'is' only for None, True, False and sentinel objects. Use == for numbers and strings; 'is' on them works by accident and breaks later.",
    "When a value seems to change 'by itself', print id() of the two names. If the ids are equal you are sharing one mutable object and need a copy."
  ]
});

EXTRA(1, "Numbers, strings, booleans", {
  deep: [
    "A Python int has no fixed size. CPython stores it as an array of 30-bit digits and grows the array when needed, so 2 ** 1000 is exact. The cost is speed and memory: a small int takes 28 bytes, not 4 or 8 as in C. Since Python 3.11, converting between str and int is limited to 4300 digits by default to prevent denial-of-service attacks.",
    "A float is a 64-bit IEEE 754 double, the same as in C and JavaScript. It stores numbers in binary, so most decimal fractions such as 0.1 cannot be stored exactly. It has about 15 to 17 significant digits. Use the decimal module for money and the fractions module for exact ratios.",
    "bool is a subclass of int. True equals 1 and False equals 0, so you can add booleans, and sum() over a list of conditions counts the True values. This also means True and 1 are the same dictionary key.",
    "A str is an immutable sequence of Unicode code points. CPython stores each string with 1, 2 or 4 bytes per character, depending on the widest character in it. Every string method returns a new string. The old one is never changed."
  ],
  iq: [
    { q: "What does 0.1 + 0.2 == 0.3 give and why?", a: "False. 0.1 and 0.2 cannot be stored exactly in binary, and the small errors add up to 0.30000000000000004. Compare floats with math.isclose, or use Decimal when exact decimal results matter.", c: `
import math
print(0.1 + 0.2)                      # 0.30000000000000004
print(0.1 + 0.2 == 0.3)               # False
print(math.isclose(0.1 + 0.2, 0.3))   # True
` },
    { q: "What do round(2.5) and round(3.5) return?", a: "2 and 4. Python 3 rounds halves to the nearest even number (banker's rounding) to avoid a bias in sums. Also round(2.675, 2) gives 2.67, because 2.675 is really stored as 2.67499999...", c: `
print(round(2.5), round(3.5))   # 2 4
print(round(0.5), round(1.5))   # 0 2
print(round(2.675, 2))          # 2.67
` },
    { q: "What does True + True print? Is isinstance(True, int) true?", a: "It prints 2, and isinstance(True, int) is True, because bool is a subclass of int. This is useful for counting, but it is a trap when a function must treat booleans and numbers differently: check for bool first.", c: `
print(True + True)               # 2
print(isinstance(True, int))     # True
marks = [45, 80, 91, 30]
print(sum(m >= 50 for m in marks))   # 2
` },
    { q: "Why is '10' < '9' True when 10 < 9 is False?", a: "Strings are compared character by character using the Unicode code of each character. '1' comes before '9', so the comparison ends at the first character. Convert to int before comparing or sorting numbers that arrive as text.", c: `
print("10" < "9")       # True
print(10 < 9)           # False
print("apple" < "Banana")   # False  uppercase letters come first
` }
  ],
  tips: [
    "Never store money in a float. Use Decimal created from a string (Decimal('19.99')), or store whole paise or cents as an int.",
    "Compare floats with math.isclose(a, b), or with a tolerance you choose. Never use == on the result of float arithmetic.",
    "Write big numbers with underscores (1_000_000) and format output with f-string specs such as f'{amount:,.2f}'. Both make numbers easier to read and review.",
    "Use str.casefold() for case-insensitive comparison of user text, and strip() input before you validate it."
  ]
});

EXTRA(1, "None", {
  deep: [
    "None is the only instance of the type NoneType. There is exactly one None object in the whole process, so 'x is None' is a simple pointer comparison. It is fast, and it cannot be changed by a class that defines its own __eq__ method. This is why style guides require 'is None' and not '== None'.",
    "None is falsy, but it is not the same as 0, an empty string or an empty list. All of those are falsy too. If 0 or an empty list is a valid value in your program, 'if not x' will treat it like None and cause a bug. Test 'x is None' when you mean 'no value'.",
    "Functions return None when they reach the end without a return statement. Methods that change an object in place, such as list.sort(), list.append() and dict.update(), return None on purpose, to remind you that no new object was made. In Python 3, None cannot be ordered: None < 1 raises TypeError.",
    "Sometimes None is itself a valid value, for example a cache that can store None. Then you cannot use None to mean 'missing'. Create a private sentinel object with object() and compare with 'is'."
  ],
  iq: [
    { q: "What does this print?", a: "It prints None. sort() sorts the list in place and returns None, so x is None and the sorted list is lost. Use sorted(...) to get a new list, or call sort() on its own line.", c: `
x = [3, 1, 2].sort()
print(x)                 # None

y = sorted([3, 1, 2])
print(y)                 # [1, 2, 3]
` },
    { q: "Why is 'x is None' preferred over 'x == None'?", a: "== calls the __eq__ method of the object, and a class can define __eq__ to return anything. 'is' checks identity and cannot be overridden. It is also slightly faster.", c: `
class Weird:
    def __eq__(self, other):
        return True

w = Weird()
print(w == None)     # True   wrong answer
print(w is None)     # False  correct
` },
    { q: "What is the bug in 'limit = limit or 10' when the default of limit is None?", a: "The 'or' test treats every falsy value like None. A caller who passes 0 gets 10 instead. Write 'if limit is None: limit = 10' so only a missing value is replaced.", c: `
def page(limit=None):
    limit = limit or 10
    return limit

print(page())      # 10
print(page(0))     # 10   bug: the caller asked for 0
` },
    { q: "How can a function tell 'argument not passed' from 'None was passed'?", a: "Use a unique sentinel object as the default instead of None. No caller can pass that exact object by accident, so an identity check is safe.", c: `
_MISSING = object()

def update(name, nickname=_MISSING):
    if nickname is _MISSING:
        return "nickname unchanged"
    return f"nickname set to {nickname}"

print(update("Anu"))          # nickname unchanged
print(update("Anu", None))    # nickname set to None
` }
  ],
  tips: [
    "Write the return type as 'User | None' and run a type checker. It forces every caller to handle the None case before using the value.",
    "Do not return None to signal an error such as 'database is down'. Raise an exception for errors; use None only for a normal 'nothing found' result.",
    "Use 'value if value is not None else default' when 0, False or an empty string are valid values. Use 'value or default' only when every falsy value should be replaced.",
    "Be consistent inside one function: if any path returns a value, end the other paths with an explicit 'return None'. A missing return is a common hidden bug."
  ]
});

EXTRA(1, "Type conversion", {
  deep: [
    "int(), float(), str() and bool() are not special syntax. They are the types themselves, and calling them asks the object to convert itself through a special method: __int__, __float__, __str__, or __bool__. Your own classes can define these methods to support conversion.",
    "The rules of each conversion are different. int(3.9) cuts toward zero and gives 3, and int(-3.9) gives -3. int('3.9') raises ValueError, because the text is not an integer. int() accepts spaces and underscores (' 42 ', '1_000') and a base (int('ff', 16) is 255).",
    "bool() follows truthiness rules: 0, 0.0, None, and empty containers and strings are False, and everything else is True. So bool('False') and bool('0') are True, because both are non-empty strings. For your own class, Python calls __bool__, and if it is missing, __len__.",
    "Python does a few conversions automatically. In arithmetic, int is widened to float (1 + 2.0 is 3.0) and bool acts as int. It never converts between str and numbers automatically. Converting a large int to float can lose precision, because a float holds only 53 bits of exact integer."
  ],
  iq: [
    { q: "What is bool('False')?", a: "True. bool() on a string only checks if the string is empty, not what it says. To parse text flags, compare the lower-cased text with a set of accepted words.", c: `
print(bool("False"))     # True
print(bool("0"))         # True
print(bool(""))          # False
print(bool(0), bool([]), bool([0]))   # False False True

flag = "False"
print(flag.strip().lower() in {"1", "true", "yes"})   # False
` },
    { q: "What is the difference between int(3.9), int('3.9') and round(3.9)?", a: "int(3.9) gives 3 because it cuts the fraction, it does not round. int('3.9') raises ValueError because the string is not a whole number; use int(float('3.9')). round(3.9) gives 4.", c: `
print(int(3.9), int(-3.9))     # 3 -3
print(round(3.9))              # 4
print(int(float("3.9")))       # 3
try:
    int("3.9")
except ValueError:
    print("ValueError")        # ValueError
` },
    { q: "What does int((0.1 + 0.7) * 10) return?", a: "7, not 8. 0.1 + 0.7 is stored as 0.7999999999999999, times 10 is 7.999999999999999, and int() cuts the fraction. Use round() before int(), or use Decimal.", c: `
print((0.1 + 0.7) * 10)          # 7.999999999999999
print(int((0.1 + 0.7) * 10))     # 7
print(round((0.1 + 0.7) * 10))   # 8
` },
    { q: "What do '5' * 2 and '5' + 2 give?", a: "'5' * 2 gives '55', because a string times an int repeats the string. '5' + 2 raises TypeError, because Python does not convert between str and int automatically. This bug is common with input() and form data." }
  ],
  tips: [
    "Convert and validate data once, at the edge of the program (form, API, file, environment variable). Inside the program all values should already have the correct type.",
    "Wrap conversion of outside data in try/except ValueError and return a clear error message. Never let int(user_text) crash a request.",
    "Environment variables are always strings. Parse flags with an explicit check such as value.lower() in {'1', 'true', 'yes'}, never with bool(value).",
    "For API and config data use pydantic or dataclasses with validation, so conversion rules are written once and not repeated in every function."
  ]
});

EXTRA(1, "Operators", {
  deep: [
    "Operators are short forms of method calls. a + b calls a.__add__(b). If that returns NotImplemented, Python tries b.__radd__(a), and if both fail you get TypeError. This is how your own classes, and libraries such as NumPy, give meaning to + or ==.",
    "'and' and 'or' do not return True or False. They return one of their operands, and they stop early (short circuit). 'a or b' gives a if a is truthy, otherwise b. 'a and b' gives a if a is falsy, otherwise b. The right side is not evaluated at all when the left side decides the result.",
    "Comparisons can be chained: a < b < c means (a < b) and (b < c), with b evaluated once. This also applies to 'in', 'is' and ==, which gives surprising results when they are mixed in one expression.",
    "Division has rules that differ from C and Java. // rounds down toward negative infinity, not toward zero, and the result of % has the sign of the divisor. ** binds tighter than a minus sign on its left, and is evaluated right to left. For mutable objects, += changes the object in place."
  ],
  iq: [
    { q: "What do -7 // 2 and -7 % 2 give?", a: "-4 and 1. Floor division rounds down to the next lower integer, so -3.5 becomes -4. The remainder takes the sign of the divisor, and the rule a == (a // b) * b + (a % b) always holds.", c: `
print(-7 // 2, -7 % 2)     # -4 1
print(7 // -2, 7 % -2)     # -4 -1
print(int(-7 / 2))         # -3   int() cuts toward zero
print(divmod(-7, 2))       # (-4, 1)
` },
    { q: "What do -2 ** 2 and 2 ** 3 ** 2 give?", a: "-4 and 512. ** has higher priority than the unary minus, so it is -(2 ** 2). ** is right-associative, so it is 2 ** (3 ** 2), which is 2 ** 9.", c: `
print(-2 ** 2)        # -4
print((-2) ** 2)      # 4
print(2 ** 3 ** 2)    # 512
` },
    { q: "What do these 'and' / 'or' expressions print?", a: "They print the operands, not booleans: 'or' returns the first truthy value or the last value, and 'and' returns the first falsy value or the last value.", c: `
print(0 or "default")     # default
print(5 and 0)            # 0
print([] or {})           # {}
print("a" and "b")        # b
` },
    { q: "What does False == False in [False] print?", a: "True. It is a chained comparison, so it means (False == False) and (False in [False]). It is not (False == False) in [False], which would be True in [False], that is False.", c: `
print(False == False in [False])      # True
print((False == False) in [False])    # False
print(1 < 3 < 2)                      # False  means 1 < 3 and 3 < 2
` }
  ],
  tips: [
    "Add parentheses whenever you mix 'and' with 'or', or arithmetic with comparison. Nobody should need the precedence table to read your code.",
    "Use == for values and 'is' only for None and sentinels. Use 'in' with a set or dict for membership tests on large data, because it is O(1) there and O(n) on a list.",
    "Use divmod(total, size) when you need both the quotient and the remainder, for example pages and leftover items, or minutes and seconds.",
    "In pandas and NumPy use & and | with parentheses around each condition, like (df.a > 1) & (df.b < 5). 'and' and 'or' do not work on arrays."
  ]
});

EXTRA(1, "if / elif / else", {
  deep: [
    "The condition of an if does not have to be a bool. Python tests its truth value: it calls __bool__ on the object, and if that is missing, __len__. So 'if items:' is True for a non-empty list. Conditions are checked from top to bottom and only the first true branch runs, so the order of elif branches matters.",
    "An if block does not create a new scope. A variable assigned inside the block still exists after it. If the branch did not run, the variable does not exist, and using it raises NameError. Give the variable a value before the if, or in every branch.",
    "match / case (3.10) is not a plain switch. It matches the structure of a value and can pull parts out of it. A bare name in a case is a capture pattern: it matches anything and assigns the value to that name. To compare with a constant, use a literal, or a dotted name such as Status.OK.",
    "Long if / elif chains that compare one value with many constants are slow to read and are checked one by one. A dictionary that maps the value to a result or a function is often clearer and does one O(1) lookup."
  ],
  iq: [
    { q: "What is wrong with this condition: if role == 'admin' or 'owner':", a: "It is always true. Python reads it as (role == 'admin') or ('owner'), and a non-empty string is truthy. Write role == 'admin' or role == 'owner', or better: role in ('admin', 'owner').", c: `
role = "guest"
if role == "admin" or "owner":
    print("access granted")       # access granted   (bug)

if role in ("admin", "owner"):
    print("never printed")
` },
    { q: "What does this elif chain print for marks = 95?", a: "It prints B. The first true condition wins and the rest are skipped, and 95 >= 60 is tested first. Put the most specific condition first.", c: `
marks = 95
if marks >= 60:
    grade = "B"
elif marks >= 90:
    grade = "A"
else:
    grade = "C"
print(grade)       # B
` },
    { q: "What does this match statement print?", a: "It prints 'not found', and NOT_FOUND becomes 200. A bare name in a case is a capture pattern that matches any value and assigns it. Use a literal (case 404:) or a dotted name such as HTTPStatus.NOT_FOUND.", c: `
NOT_FOUND = 404
status = 200
match status:
    case NOT_FOUND:
        print("not found")     # not found
print(NOT_FOUND)               # 200   the constant was overwritten
` },
    { q: "Does an if block create a new variable scope like in C or Java?", a: "No. Only functions, classes, modules and comprehensions create scopes. A name assigned inside an if is visible after it, but it exists only if that branch ran." }
  ],
  tips: [
    "Use guard clauses: check the error cases first and return early. The main logic then stays at one indentation level and is easier to read.",
    "Replace long elif chains on one value with a dict, for example handlers = {'pdf': export_pdf, 'csv': export_csv}, then handlers[kind](data).",
    "Write 'if items:' to test for an empty container, but 'if value is None:' when 0 or an empty string is a valid value. Never write 'if flag == True:'.",
    "Use any() and all() for many conditions, for example all(field in data for field in required). It is shorter and stops at the first failure."
  ]
});

EXTRA(1, "for and while", {
  deep: [
    "A for loop is built on the iterator protocol. Python calls iter() on the object to get an iterator, then calls next() on it again and again, and stops when next() raises StopIteration. Anything that supports this works in a for loop: lists, dicts, files, generators, ranges.",
    "The loop variable is a normal variable. It is assigned again at the start of every round, so changing it inside the body does not change the loop. It also stays alive after the loop with its last value. range() does not build a list: it is a small object that computes each number when asked, and 'x in range(...)' is O(1) for integers.",
    "A list iterator only remembers an index. If you remove items from the list while looping over it, the items after the removed one move left and the next one is skipped. Changing the size of a dict or set during iteration raises RuntimeError. Loop over a copy, or build a new collection.",
    "Loops in pure Python are slow compared to C, because every round runs many bytecode instructions. For large data, move the loop into built-in functions (sum, min, sorted, str.join), comprehensions, or NumPy. Both loop types can have an else block, which runs only if the loop ended without break."
  ],
  iq: [
    { q: "What does this print? The goal was to remove all even numbers.", a: "It prints [4, 8]. After 2 is removed, 4 moves to index 0, but the iterator moves on to index 1, so 4 is skipped. The same happens with 8. Build a new list with a comprehension instead.", c: `
nums = [2, 4, 6, 8]
for n in nums:
    if n % 2 == 0:
        nums.remove(n)
print(nums)                               # [4, 8]

nums = [2, 4, 6, 8]
nums = [n for n in nums if n % 2 != 0]
print(nums)                               # []
` },
    { q: "When does the else block of a loop run?", a: "It runs when the loop finishes normally, which means no break happened. It also runs if the loop body never ran. It is useful for search loops: the else is the 'not found' case.", c: `
for n in [1, 3, 5]:
    if n % 2 == 0:
        print("found even")
        break
else:
    print("no even number")      # no even number
` },
    { q: "What does this print?", a: "It prints 0 1 2 10. Assigning to i inside the body does not affect the loop, because the for statement assigns the next value at the start of each round. After the loop, i keeps the last value assigned, which is 10.", c: `
for i in range(3):
    print(i, end=" ")
    i = 10
print(i)            # 0 1 2 10
` },
    { q: "Is 'x in range(10 ** 12)' slow? Does range(10 ** 12) use a lot of memory?", a: "No to both. A range object stores only start, stop and step. Membership for an int is calculated with arithmetic in O(1), and numbers are produced one at a time when you loop." }
  ],
  tips: [
    "Loop over the items directly, with enumerate() when you need the index and zip() for two lists. Avoid 'for i in range(len(items))'.",
    "Never change a list, dict or set while looping over it. Loop over a copy (list(d.items())) or build a new collection with a comprehension.",
    "Every while loop in production needs a clear exit: a maximum number of attempts or a timeout. For retries add a sleep with growing delay (backoff).",
    "To read a large file, loop over the file object (for line in f). It reads one line at a time and does not load the whole file into memory."
  ]
});

EXTRA(1, "break, continue, pass", {
  deep: [
    "break and continue only affect the innermost loop that contains them. To leave two nested loops at once, there is no 'break 2' in Python. The usual solutions are to put the loops in a function and use return, or to use a flag variable.",
    "In a for loop, continue takes the next item. In a while loop, continue jumps back to the condition. If the code that moves the loop forward (such as i += 1) comes after the continue, it is skipped, and the loop never ends.",
    "If break or continue is inside a try block that has a finally, the finally block still runs before the loop exits or continues. A break also skips the else block of the loop. Since Python 3.14, using return, break or continue inside a finally block gives a SyntaxWarning, because it silently hides exceptions.",
    "pass is a statement that does nothing. It exists only because Python needs at least one statement in a block. The Ellipsis literal (...) is often used the same way in stubs. A docstring alone is also a valid body, so a function with a docstring does not need pass."
  ],
  iq: [
    { q: "What does this nested loop print?", a: "It prints 0 0, 1 0 and 2 0. break leaves only the inner loop. The outer loop continues with its next value.", c: `
for i in range(3):
    for j in range(3):
        if j == 1:
            break
        print(i, j)
# 0 0
# 1 0
# 2 0
` },
    { q: "What is wrong with this while loop?", a: "It never ends. When i is 2, continue jumps back to the condition before i += 1 runs, so i stays 2 forever. Increase the counter before the continue, or use a for loop.", c: `
i = 0
while i < 5:
    if i == 2:
        continue       # i += 1 is skipped: infinite loop
    i += 1
` },
    { q: "Does a finally block run when the loop is left with break?", a: "Yes. finally runs whenever the try block is left, for any reason: normal end, exception, return, break or continue. Here cleanup runs for i = 0 and for i = 1.", c: `
for i in range(3):
    try:
        if i == 1:
            break
    finally:
        print("cleanup", i)
# cleanup 0
# cleanup 1
` },
    { q: "What is the difference between pass and continue inside a loop?", a: "pass does nothing, and the rest of the loop body still runs. continue skips the rest of the body and starts the next round.", c: `
for n in [1, 2, 3]:
    if n == 2:
        pass
    print(n, end=" ")       # 1 2 3
print()
for n in [1, 2, 3]:
    if n == 2:
        continue
    print(n, end=" ")       # 1 3
` }
  ],
  tips: [
    "To leave nested loops, move them into a small function and use return. It is cleaner than flag variables.",
    "Never write 'except Exception: pass'. It hides real errors in production. At least log the exception, and catch only the error type you expect.",
    "For code that is not written yet, use 'raise NotImplementedError' instead of pass. A forgotten pass fails silently; the exception tells you at once.",
    "Replace 'flag plus break' search loops with any(), or with next((x for x in items if cond(x)), None). They stop at the first match too."
  ]
});

EXTRA(1, "Functions", {
  deep: [
    "def is a statement that runs. When Python reaches it, it creates a function object and binds it to the name. The function object holds the compiled code (__code__), the default values (__defaults__), the name and the docstring. Because the name is a normal variable, a second def with the same name simply replaces the first one. Python has no function overloading.",
    "Default values are evaluated once, at the moment the def statement runs, and are stored on the function object. They are not evaluated again on each call. This is the reason for the mutable default argument bug: every call shares the same list or dict.",
    "Each call creates a new frame with its own local variables. CPython stores locals in a fixed array, not a dictionary, so reading a local variable is faster than reading a global. When the function returns, the frame and its locals are released, unless a closure still needs them.",
    "Python does not optimise tail calls, and the default recursion limit is 1000 frames. Deep recursion raises RecursionError, so use a loop or an explicit stack for deep data. A function call is also relatively expensive in Python, so very small functions inside hot loops have a cost."
  ],
  iq: [
    { q: "What does this print?", a: "It prints [1] and then [1, 2]. The default list is created once when the function is defined, and every call without the argument uses that same list. Use None as the default and create the list inside the function.", c: `
def add(item, bucket=[]):
    bucket.append(item)
    return bucket

print(add(1))       # [1]
print(add(2))       # [1, 2]

def add_ok(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket

print(add_ok(1), add_ok(2))    # [1] [2]
` },
    { q: "What does show() return here?", a: "5. The default value n=x is evaluated when def runs, and at that moment x is 5. Changing x later does not change the stored default.", c: `
x = 5
def show(n=x):
    return n

x = 10
print(show())       # 5
` },
    { q: "Does Python support function overloading (two functions with the same name and different parameters)?", a: "No. The second def replaces the first, because a function name is just a variable. Use default arguments, *args, or functools.singledispatch instead.", c: `
def area(r):
    return 3.14 * r * r

def area(w, h):
    return w * h

try:
    area(2)
except TypeError:
    print("TypeError")      # TypeError  the first area is gone
print(area(2, 3))           # 6
` },
    { q: "What happens if a recursive function calls itself 5000 times deep?", a: "It raises RecursionError, because the default limit is 1000 frames. Python does not remove tail calls. Rewrite the function as a loop; raising the limit with sys.setrecursionlimit can crash the process." }
  ],
  tips: [
    "Keep a function to one job with a clear verb name. If you need the word 'and' to describe it, split it.",
    "Use functools.cache or lru_cache on pure functions that are slow and are called again with the same arguments. Do not use it on functions with side effects.",
    "When you write a decorator, add @functools.wraps(func) to the wrapper. Without it the function loses its name and docstring, which breaks logs and docs.",
    "Never use a mutable object ([] or {}) or a call such as datetime.now() as a default value. Use None and create the value inside the function."
  ]
});

EXTRA(1, "Arguments and return values", {
  deep: [
    "Python passes arguments by object reference, also called pass by assignment. The parameter becomes a new local name for the same object the caller passed. If the function mutates the object, the caller sees it. If the function assigns a new object to the parameter, only the local name changes and the caller sees nothing.",
    "A full signature has a fixed order: positional-only parameters, then /, then normal parameters, then *args, then keyword-only parameters, then **kwargs. A parameter with a default cannot be followed by a normal parameter without one. Python fills positional arguments first, then keywords, and raises TypeError for a missing, extra or repeated argument.",
    "A function always returns exactly one object. 'return a, b' builds one tuple, and 'x, y = f()' unpacks it. If return is used inside a try block that has a finally, the finally block runs before the value goes back to the caller.",
    "Returning a tuple is fine for two or three values. With more values, callers start to mix up the order. Then return a dataclass or NamedTuple, so each value has a name."
  ],
  iq: [
    { q: "Is Python pass by value or pass by reference? What does this print?", a: "Neither exactly; it is pass by object reference. It prints [1, 2, 3, 4]. The append changes the caller's list, but 'lst = [0]' only makes the local name point to a new list.", c: `
def change(lst):
    lst.append(4)      # mutates the caller's object
    lst = [0]          # rebinds the local name only

nums = [1, 2, 3]
change(nums)
print(nums)            # [1, 2, 3, 4]
` },
    { q: "What do / and * mean in a function signature?", a: "Parameters before / are positional-only and cannot be passed by name. Parameters after * are keyword-only and must be passed by name. Parameters in between can be passed both ways.", c: `
def f(a, /, b, *, c):
    return a + b + c

print(f(1, 2, c=3))       # 6
print(f(1, b=2, c=3))     # 6
try:
    f(1, 2, 3)
except TypeError:
    print("TypeError")    # TypeError  c must be passed by name
` },
    { q: "What does this function print and return?", a: "It prints 'finally runs' first and then 'try'. The return value is prepared, but the finally block always runs before the function really returns.", c: `
def f():
    try:
        return "try"
    finally:
        print("finally runs")

print(f())
# finally runs
# try
` },
    { q: "For def f(a, b=2), what happens with the call f(1, a=5)?", a: "It raises TypeError: f() got multiple values for argument 'a'. The positional 1 already filled a, and the keyword tries to fill it again. A keyword argument can never repeat a parameter that was filled by position." }
  ],
  tips: [
    "Make boolean and option parameters keyword-only by putting * before them: def export(data, *, compress=False). Calls like export(data, True) are unreadable.",
    "When a function returns more than three values, return a dataclass or NamedTuple instead of a plain tuple, so callers use names and not positions.",
    "Do not change the arguments you receive unless the function name says so. Build and return a new object; hidden mutation causes bugs far from their source.",
    "If a function needs more than about five parameters, group related ones into a config object or dataclass."
  ]
});

EXTRA(1, "*args and **kwargs", {
  deep: [
    "The stars have two opposite jobs. In a def they collect: *args packs extra positional arguments into a new tuple and **kwargs packs extra keyword arguments into a new dict. In a call they unpack: *iterable spreads items as positional arguments and **mapping spreads key-value pairs as keyword arguments.",
    "args is always a tuple and kwargs is always a new dict, even when the caller unpacked a list or a dict. So changing kwargs inside the function does not change the caller's dict. The keys used with ** must be strings, and passing the same keyword twice raises TypeError.",
    "Parameters written after *args are keyword-only. A single * without a name does the same without accepting extra positional values. Since Python 3.5 you can also unpack inside literals: [*a, *b] joins lists and {**a, **b} merges dicts, with the last value winning.",
    "The cost of *args and **kwargs is a hidden signature. Editors cannot show which options exist, and a wrong keyword name can be accepted silently and ignored. Use them for wrappers and decorators that forward arguments, not as a replacement for named parameters."
  ],
  iq: [
    { q: "What do these three calls print?", a: "The first two print (1, 2) {'x': 3}: unpacking with * and ** in the call gives the same result as writing the arguments by hand. The third prints ([1, 2],) {} because the list was passed as one positional argument.", c: `
def f(*args, **kwargs):
    print(args, kwargs)

f(1, 2, x=3)               # (1, 2) {'x': 3}
f(*[1, 2], **{"x": 3})     # (1, 2) {'x': 3}
f([1, 2])                  # ([1, 2],) {}
` },
    { q: "What happens when two dicts with the same key are merged with ** ?", a: "Inside a dict literal the last value wins. In a function call, a repeated keyword is an error: TypeError, got multiple values for keyword argument.", c: `
a = {"x": 1, "y": 2}
b = {"y": 9}
print({**a, **b})        # {'x': 1, 'y': 9}
print(a | b)             # {'x': 1, 'y': 9}   Python 3.9+

def f(**kwargs):
    return kwargs
try:
    f(**a, **b)
except TypeError:
    print("TypeError")   # TypeError  y was given twice
` },
    { q: "What does star unpacking in an assignment give?", a: "The starred name takes all the items that the other names do not take, and it is always a list, even if it is empty or the source is a tuple or string.", c: `
first, *middle, last = [1, 2, 3, 4, 5]
print(first, middle, last)     # 1 [2, 3, 4] 5

head, *rest = (1,)
print(head, rest)              # 1 []
` },
    { q: "Are the names 'args' and 'kwargs' required? What types are they?", a: "No, only the stars matter; *values and **options work the same. The first is always a tuple and the second is always a dict, and they are empty, not None, when nothing extra is passed." }
  ],
  tips: [
    "In decorators, write the wrapper as def wrapper(*args, **kwargs) and call func(*args, **kwargs), with @functools.wraps(func), so it works for any function.",
    "Do not use **kwargs for the public options of your own function. Name the parameters, so editors, type checkers and readers can see them.",
    "If you accept **kwargs and use only some keys, raise TypeError for unknown keys. Otherwise a typo such as timeoutt=5 is ignored silently.",
    "Use {**defaults, **overrides} or defaults | overrides to build settings: the right side wins, and neither input dict is changed."
  ]
});

EXTRA(1, "Scope: local/global/nonlocal", {
  deep: [
    "Scope is decided when the function is compiled, not when it runs. If a name is assigned anywhere inside a function, the compiler marks it as local for the whole function. Reading it before the assignment then raises UnboundLocalError, even when a global with the same name exists.",
    "Reading and rebinding are different things. A function can read a global, or call a method that mutates a global list, without any keyword. The global and nonlocal keywords are needed only when the function assigns to the name (=, +=, and similar).",
    "A closure does not copy the values of outer variables. It keeps a reference to the variable itself, in an object called a cell. The value is looked up when the inner function is called, not when it is created. This is called late binding, and it is the reason functions created in a loop all see the last value of the loop variable.",
    "Only modules, functions, classes and comprehensions create scopes. if, for, while, with and try blocks do not. A comprehension variable does not leak out, but a for loop variable does. A class body is a scope, but its names are not visible inside the methods; methods must use self.name or ClassName.name."
  ],
  iq: [
    { q: "Why does this code fail?", a: "It raises UnboundLocalError. 'count += 1' is an assignment, so the compiler treats count as a local variable in the whole function, and it has no value yet when it is read. Add 'global count', or better, pass the value in and return the new one.", c: `
count = 0

def bump():
    count += 1

try:
    bump()
except UnboundLocalError:
    print("UnboundLocalError")     # UnboundLocalError
` },
    { q: "What does this print, and how do you fix it?", a: "It prints [2, 2, 2]. All three lambdas refer to the same variable i, and they read it when called, after the loop ended with i = 2. Fix it by binding the current value as a default argument: lambda i=i: i.", c: `
funcs = []
for i in range(3):
    funcs.append(lambda: i)
print([f() for f in funcs])        # [2, 2, 2]

funcs = [lambda i=i: i for i in range(3)]
print([f() for f in funcs])        # [0, 1, 2]
` },
    { q: "Does a comprehension variable leak into the outer scope like a for loop variable?", a: "No. A comprehension has its own scope, so x outside is unchanged. A normal for loop does not have its own scope, so its variable overwrites the outer one and stays after the loop.", c: `
x = 10
squares = [x * x for x in range(3)]
print(x)          # 10

for x in range(3):
    pass
print(x)          # 2
` },
    { q: "Can a function change a global list without the global keyword?", a: "Yes, if it only mutates the list, for example with append. No name is rebound, so no keyword is needed. The global keyword is required only for assignment to the name.", c: `
items = []

def add(v):
    items.append(v)      # mutation, not assignment

add(1)
print(items)             # [1]
` }
  ],
  tips: [
    "Avoid mutable global state. Pass values as arguments and return results, or keep state in a class. Globals make tests depend on each other and break with threads.",
    "Module-level constants in UPPER_CASE (for example MAX_RETRIES = 3) are fine. The problem is globals that change while the program runs.",
    "When you create callbacks in a loop (GUI buttons, scheduled jobs), bind the current value with functools.partial or a default argument to avoid the late-binding bug.",
    "Do not name variables list, dict, id, type, input, sum or max. You shadow the built-in in that scope. Turn on the linter rule for it (flake8-builtins, or the A rules in Ruff)."
  ]
});

EXTRA(1, "Input/output", {
  deep: [
    "input() always returns a str, without the final newline. It never returns a number. print() converts each argument with str(), joins them with the sep value (a space by default), adds the end value (a newline by default) and writes to sys.stdout. You can send output elsewhere with the file argument.",
    "Output is buffered. When stdout is a terminal, text appears after each line. When output goes to a pipe or a file, as in Docker logs or cron jobs, Python collects it in a bigger buffer, so messages can appear late or be lost in a crash. Use print(..., flush=True), run python -u, or use the logging module.",
    "open() in text mode returns an object that decodes bytes to str using an encoding, and also translates line endings. If you give no encoding, Python uses the system default, which is often cp1252 on Windows and UTF-8 on Linux, so the same code can fail on another machine. Python 3.15 is planned to make UTF-8 the default (PEP 686). Until then, always pass encoding='utf-8'.",
    "The mode matters. 'w' deletes the old content at the moment the file is opened, 'a' adds to the end, 'x' fails if the file exists, and 'b' gives raw bytes with no decoding. A file object is an iterator with a position: after read() reaches the end, a second read() returns an empty string. The with statement closes the file and flushes the buffer even if an exception happens."
  ],
  iq: [
    { q: "A user types 5 at input(). What does the result times 2 print?", a: "It prints 55. input() returns the string '5', and a string times 2 repeats the string. Convert first with int().", c: `
age = "5"              # this is what input() returns when the user types 5
print(age * 2)         # 55
print(int(age) * 2)    # 10
` },
    { q: "What does the second read() return?", a: "An empty string. The file object keeps a position, and after the first read() it is at the end of the file. Call seek(0) to go back to the start, or keep the text in a variable.", c: `
import io
f = io.StringIO("line1")     # behaves like an open text file
print(repr(f.read()))        # 'line1'
print(repr(f.read()))        # ''
f.seek(0)
print(repr(f.read()))        # 'line1'
` },
    { q: "What does this print?", a: "It prints a-b!c on one line. sep is placed between the arguments, and end replaces the newline at the end, so the next print continues on the same line.", c: `
print("a", "b", sep="-", end="!")
print("c")
# a-b!c
` },
    { q: "What is the difference between f.read(), f.readlines() and 'for line in f'?", a: "read() loads the whole file as one string and readlines() loads it as a list of lines, so both need memory for the full file. Looping over the file reads one line at a time and works for files bigger than memory." }
  ],
  tips: [
    "Always pass encoding='utf-8' to open(). Leaving it out is the most common reason code works on Linux and fails on Windows.",
    "Use the logging module instead of print() in services. It gives levels, timestamps and a place to send logs, and you can turn debug output off without editing code.",
    "Use the csv and json modules to read and write those formats. Splitting on commas by hand breaks on quoted values. For csv files, open with newline=''.",
    "To replace an important file safely, write to a temporary file in the same folder and then call os.replace(temp, target). A crash will not leave a half-written file."
  ]
});

EXTRA(1, "Modules and imports", {
  deep: [
    "An import does several steps. Python first looks in the sys.modules cache. If the module is not there, it searches the folders in sys.path, creates a module object, runs the file from top to bottom inside that object, and stores it in sys.modules. Then it binds the name in your file.",
    "Because of the cache, the code of a module runs only once per process, no matter how many files import it. Every importer gets the same module object, so a module works like a singleton. Changing the file while the program runs has no effect until restart.",
    "'from config import debug' creates a new name in your module that points to the object config.debug had at that moment. If another part of the program later sets config.debug to a new value, your name still points to the old object. 'import config' followed by config.debug always reads the current value.",
    "The first entry of sys.path is the folder of the script you run. A file in your project named random.py, json.py or email.py therefore hides the standard library module of the same name. Circular imports fail for a related reason: the second import gets a module object that has not finished running, so some names are missing."
  ],
  iq: [
    { q: "If ten files import the same module, how many times does its top-level code run?", a: "Once. After the first import the module object is stored in sys.modules, and later imports just reuse it. That is why a print at the top of a module appears only one time.", c: `
import sys
import math
import math as m2

print(m2 is math)               # True   same module object
print("math" in sys.modules)    # True
` },
    { q: "What is the difference between 'import cfg' and 'from cfg import debug' when the value changes later?", a: "'from cfg import debug' copies the reference once, so a later assignment to cfg.debug is not seen through your name. 'import cfg' and reading cfg.debug looks up the current value each time.", c: `
import sys, types
cfg = types.ModuleType("cfg")     # a small module made in memory
cfg.debug = False
sys.modules["cfg"] = cfg

from cfg import debug
cfg.debug = True
print(debug, cfg.debug)           # False True
` },
    { q: "You saved a test file as random.py and now 'import random' fails with AttributeError. Why?", a: "Your file shadows the standard library module. The folder of the running script comes first in sys.path, so Python imports your random.py instead of the real one. Rename the file and delete its __pycache__ entry." },
    { q: "What is a circular import and how do you fix it?", a: "Module a imports b while b imports a. The second import gets a partly initialised module, so 'from a import x' fails with ImportError. Fix it by moving the shared code into a third module, or by importing inside the function that needs it." }
  ],
  tips: [
    "Do no heavy work at import time: no database connections, network calls or file reads at the top level of a module. Put them in functions, so imports stay fast and tests can import safely.",
    "Use absolute imports (from shop.billing import create_invoice) and let Ruff or isort order them: standard library, third-party, then your own code.",
    "Never use 'from module import *' in project code. It hides where names come from and can overwrite your own names without warning.",
    "Never name your files after standard library or popular packages (random.py, json.py, requests.py, test.py). The shadowing bug is hard to see."
  ]
});

EXTRA(1, "Packages", {
  deep: [
    "A package is a module that has a __path__ attribute, which tells Python where to look for its submodules. When you import shop.billing.tax, Python imports shop, then shop.billing, then the tax module, and it runs each __init__.py once on the way. So a slow or heavy __init__.py slows down every import below it.",
    "Importing a package does not import its submodules automatically. After 'import shop', the name shop.billing exists only if shop/__init__.py imports it, or some other code already imported shop.billing. Relative imports (from . import users) work only when the file is loaded as part of a package. They fail when you run the file directly as a script.",
    "Since Python 3.3 a folder without __init__.py can still be imported, as a namespace package. That feature is meant for splitting one package over several folders. For a normal project, keep the __init__.py file: a missing one causes confusing import errors, and tools such as pytest and mypy handle regular packages better.",
    "The name you install is not always the name you import. PyPI distributes 'distributions' (pip install pillow) which contain import packages (import PIL). pip downloads a wheel, a ready-to-install archive, into the site-packages folder of the active environment. Modern projects describe their metadata and dependencies in pyproject.toml."
  ],
  iq: [
    { q: "How can you tell in code whether an imported name is a package or a plain module?", a: "A package has a __path__ attribute; a plain module does not. json is a folder with __init__.py, so it is a package, while os is a single file os.py.", c: `
import json, os
print(hasattr(json, "__path__"))    # True   json is a package
print(hasattr(os, "__path__"))      # False  os is a single module
` },
    { q: "After 'import xml', can you use xml.dom directly?", a: "No. Importing a package runs only its __init__.py; submodules are not loaded unless that file imports them. You must import xml.dom explicitly. Some packages seem to work without this only because their __init__.py imports the submodules.", c: `
import xml
print(hasattr(xml, "dom"))     # False

import xml.dom
print(hasattr(xml, "dom"))     # True
` },
    { q: "Why do you get 'ImportError: attempted relative import with no known parent package'?", a: "You ran a file inside a package directly, like 'python shop/billing.py'. Then the file is the __main__ script and has no parent package, so 'from . import users' cannot be resolved. Run it as a module from the project root: python -m shop.billing." },
    { q: "Is __init__.py still required? What happens without it?", a: "It is not required since Python 3.3; the folder becomes a namespace package. But regular packages with __init__.py are still recommended, because they import faster, can hold package-level code, and are found correctly by test and packaging tools." }
  ],
  tips: [
    "Describe the project in pyproject.toml and install it in editable mode (pip install -e .) during development. Imports then work from any folder without changing sys.path.",
    "Keep __init__.py small. Use it only to expose the public names of the package; heavy imports there slow every start and cause circular imports.",
    "Lock exact versions of all dependencies, including indirect ones, with uv, Poetry or pip-tools, and keep development tools in a separate group from runtime dependencies.",
    "Run pip-audit (or a similar scanner) in CI to find dependencies with known security problems, and check the spelling of package names before installing; fake look-alike packages exist on PyPI."
  ]
});
