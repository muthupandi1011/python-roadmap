EXTRA(4, "Classes and objects", {
  deep: [
    "A class statement is executed code, not a declaration. Python runs the class body in a new namespace, collects the names in a dict, and then calls type(name, bases, namespace) to build the class object. So a class is itself an object, an instance of 'type'. You can store it in a variable, pass it to a function and create it at runtime.",
    "Reading obj.attr follows a fixed search. Python first looks on the class (and its parents) for a data descriptor such as a property. If there is none, it looks in the instance's own __dict__. Then it looks on the class and its parents for a normal attribute. Writing obj.attr = value is simpler: it stores into the instance __dict__, unless the class has a data descriptor for that name.",
    "This explains class attributes. A value defined in the class body lives once, on the class, and every instance reads it through the search. Assigning through an instance does not change the class value; it creates a new instance attribute that hides it. Mutating a shared mutable class attribute (appending to a list) does change it for everyone, which is a classic bug.",
    "A method is a plain function stored in the class. When you read it through an instance, the function's __get__ creates a 'bound method' object that remembers the instance. Calling obj.method(x) is the same as Class.method(obj, x). A new bound method object is created on each access, which is why 'obj.method is obj.method' is False."
  ],
  iq: [
    { q: "Two instances, one list defined in the class body. What does b see?", a: "b sees the name added through a. The list is a class attribute, so there is only one list and both instances read the same object. Create the list in __init__ with self.members = [] to give each instance its own.", c: `
class Team:
    members = []
    def add(self, name):
        self.members.append(name)

a = Team()
b = Team()
a.add("Anu")
print(b.members)   # ['Anu']
` },
    { q: "What does 'a.count += 1' do when count is a class attribute?", a: "It reads the class value 0, adds 1, and stores the result on the instance a. Now a has its own count that hides the class one. The class attribute and other instances are unchanged, and later changes to the class value are not seen by a.", c: `
class Counter:
    count = 0

a = Counter()
b = Counter()
a.count += 1
print(a.count, b.count, Counter.count)   # 1 0 0
Counter.count = 5
print(a.count, b.count)                  # 1 5
` },
    { q: "Is 'a.f is a.f' True?", a: "No. Each access to a method through an instance builds a new bound method object, so the two are different objects. They are equal with '==' because they wrap the same function and the same instance.", c: `
class A:
    def f(self):
        pass

a = A()
print(a.f is a.f)    # False
print(a.f == a.f)    # True
` },
    { q: "What is the type of a class?", a: "The type of a normal class is 'type'. A class is an object created by calling its metaclass, and the default metaclass is type. So type(5) is int, and type(int) is type." }
  ],
  tips: [
    "Create every instance attribute in __init__, even if the first value is None. Readers and tools then see the full shape of the object in one place.",
    "Give every class a __repr__ that shows the key fields. Logs and debugger output then say Order(id=7, total=450) instead of an address.",
    "Use class attributes only for constants and defaults that are immutable. Never put a list or dict in the class body unless sharing is really what you want.",
    "If a class has no state and only groups functions, use a module instead. If it has only data and no behaviour, use a dataclass."
  ]
});

EXTRA(4, "__init__", {
  deep: [
    "Writing User('a@x.com') calls the class, and that runs type.__call__. It first calls User.__new__, which allocates the empty object. If the result is an instance of the class, it then calls __init__ on it with the same arguments. __init__ must return None; returning anything else raises TypeError. So __new__ creates and __init__ fills in.",
    "You need __new__ only in special cases. Immutable types such as int, str and tuple get their value at creation time, so a subclass must set it in __new__; in __init__ it is too late. __new__ is also used for caching instances. For normal classes, write only __init__.",
    "With inheritance, a child class that defines __init__ replaces the parent's __init__ completely. Python does not call the parent version for you. If you forget super().__init__(...), the attributes that the parent sets are missing, and the error appears much later as AttributeError in some other method.",
    "Default argument values are created once, when the def line runs, not on each call. A default like items=[] is therefore shared by all instances that use it. Keep __init__ light: store values and validate them. Slow work such as network calls or reading files makes objects hard to create in tests; put it in a separate method or a classmethod factory."
  ],
  iq: [
    { q: "Two carts are created with the default list. What does b.items show?", a: "It shows ['pen']. The default list is created once when the function is defined, and both carts store a reference to that one list. Use items=None and create a new list inside __init__.", c: `
class Cart:
    def __init__(self, items=[]):
        self.items = items

a = Cart()
b = Cart()
a.items.append("pen")
print(b.items)   # ['pen']
` },
    { q: "The child class defines __init__ without calling super(). Does the object have the parent's attribute?", a: "No. The child's __init__ replaces the parent's, and the parent's is never run. The attribute id is never set. Call super().__init__() in the child to run the parent setup.", c: `
class Base:
    def __init__(self):
        self.id = 1

class Child(Base):
    def __init__(self):
        self.name = "c"

c = Child()
print(hasattr(c, "id"))   # False
` },
    { q: "Can __init__ return a value?", a: "No. __init__ must return None. If it returns anything else, Python raises TypeError when the object is created. The object itself is returned by the class call, not by __init__.", c: `
class A:
    def __init__(self):
        return 5

try:
    A()
except TypeError:
    print("TypeError")   # TypeError
` },
    { q: "Is __init__ the constructor? What is the difference from __new__?", a: "__new__ is the real constructor: it is called on the class and creates and returns the new object. __init__ is the initialiser: it receives the already created object as self and sets its attributes. If __new__ returns an object of another class, __init__ is not called at all." }
  ],
  tips: [
    "Validate arguments in __init__ and raise ValueError at once. It is much easier to debug a failed creation than a broken object used ten calls later.",
    "Offer other ways to build the object as classmethods: Config.from_env(), Order.from_json(data). __init__ stays simple and takes ready values.",
    "Do not do I/O in __init__ (no database queries, no HTTP calls). Tests can then create the object freely, and failures happen in a method you call on purpose.",
    "When a class has more than three or four parameters, make them keyword-only by putting '*' in the signature: def __init__(self, *, host, port, timeout)."
  ]
});

EXTRA(4, "Instance/class/static methods", {
  deep: [
    "All three kinds work through the descriptor protocol. A function stored in a class has a __get__ method. Read through an instance, it returns a bound method that will pass the instance as the first argument. Read through the class, it returns the plain function, so you must pass an instance yourself.",
    "classmethod wraps the function in an object whose __get__ binds the class instead of the instance. The class it binds is the one you used in the call, so in a subclass 'cls' is the subclass. This is why a factory written as 'return cls(...)' creates the right type for every subclass. Writing the class name there instead breaks inheritance.",
    "staticmethod wraps the function in an object whose __get__ returns the function unchanged. Nothing is bound, so the method cannot reach the instance or the class unless it names the class directly. It is only a way to keep a helper inside the class namespace. Often a module-level function is just as good and easier to import and test.",
    "All three can be called on an instance or on the class. Calling an instance method on the class without an instance raises TypeError because self is missing. Forgetting 'self' in the def line gives the opposite error: Python still passes the instance, and the function says it got one argument too many."
  ],
  iq: [
    { q: "A subclass calls a classmethod factory and a staticmethod factory. Which type does each create?", a: "The classmethod receives the subclass as cls, so cls() creates a VegPizza. The staticmethod receives nothing and uses the fixed name Pizza, so it creates a plain Pizza. Factories should be classmethods that use cls.", c: `
class Pizza:
    @classmethod
    def make(cls):
        return cls()
    @staticmethod
    def make_static():
        return Pizza()

class VegPizza(Pizza):
    pass

print(type(VegPizza.make()).__name__)          # VegPizza
print(type(VegPizza.make_static()).__name__)   # Pizza
` },
    { q: "What happens when you call an instance method on the class?", a: "Through the class you get the plain function, and nothing is passed as self. Without an argument it raises TypeError. If you pass an instance yourself, it works exactly like a normal method call.", c: `
class A:
    def hello(self):
        return "hi"

try:
    A.hello()
except TypeError:
    print("missing self")     # missing self
print(A.hello(A()))           # hi
` },
    { q: "A method is defined without self. What happens when you call it on an instance?", a: "It raises TypeError saying the function takes 0 positional arguments but 1 was given. Python always passes the instance as the first argument of a normal method. Add self, or mark the method as @staticmethod.", c: `
class A:
    def f():
        return 1

try:
    A().f()
except TypeError:
    print("TypeError")   # TypeError
` },
    { q: "Can you call a class method or a static method on an instance?", a: "Yes. obj.class_method() still receives the class of obj as cls, not the instance. obj.static_method() receives nothing extra. Calling them on the class is clearer, but both forms work." }
  ],
  tips: [
    "Write alternative constructors as classmethods and always build with cls(...), never with the class name. Subclasses then get a correct factory for free.",
    "Before you add a @staticmethod, ask if it should be a plain function in the module. Keep it in the class only if it clearly belongs to that class.",
    "Use @property for a cheap computed value and functools.cached_property for an expensive one that does not change. Both keep the call site as simple as an attribute.",
    "Be careful with class-level state that classmethods change. In a web server it is shared by all requests and threads, so treat it as global data."
  ]
});

EXTRA(4, "Encapsulation", {
  deep: [
    "Python has no private keyword. A single leading underscore, as in _balance, is only a signal to other developers: this is internal and may change. The interpreter does not block access. The one real effect is that 'from module import *' skips names that start with an underscore.",
    "Two leading underscores do something real. Inside a class body the compiler rewrites every name like __pin to _ClassName__pin. This is called name mangling. Its purpose is to stop a subclass from accidentally overwriting an attribute of the parent, not to provide security. The value is still reachable through the mangled name. Names that also end in two underscores, like __init__, are not mangled.",
    "The Python way to protect data is the property. A property is a descriptor stored on the class, so reading obj.balance runs your getter and assigning runs your setter, or raises AttributeError if there is no setter. Because the call site looks like a plain attribute, you can start with a public attribute and add a property later without changing any caller. That is why Python code does not need get_x() and set_x() methods everywhere.",
    "Mangling has traps. Assigning obj.__pin = 1 from outside the class is not mangled, so it creates a new, unrelated attribute. getattr(obj, '__pin') also fails. Do not use double underscores for everything; they make testing and subclassing harder. A single underscore is the normal choice."
  ],
  iq: [
    { q: "Is an attribute named __pin private?", a: "Not really. Python stores it under the mangled name _Account__pin, so the short name is not found from outside. Anyone can still read it with the mangled name. Mangling prevents name clashes in subclasses; it is not access control.", c: `
class Account:
    def __init__(self):
        self.__pin = 1234

a = Account()
print(hasattr(a, "__pin"))    # False
print(a._Account__pin)        # 1234
` },
    { q: "Code outside the class sets a.__pin = 9999. Does the PIN change?", a: "No. Mangling happens only for code written inside the class body. The outside assignment creates a new attribute really named __pin. The method still reads _Account__pin, which holds 1234.", c: `
class Account:
    def __init__(self):
        self.__pin = 1234
    def pin(self):
        return self.__pin

a = Account()
a.__pin = 9999
print(a.pin())    # 1234
print(a.__pin)    # 9999
` },
    { q: "Does a property without a setter make the value impossible to change?", a: "It blocks assignment through the property name with AttributeError. The underlying attribute _price is still a normal attribute and can be changed directly. Python protects against mistakes, not against someone who does it on purpose.", c: `
class Item:
    def __init__(self):
        self._price = 10
    @property
    def price(self):
        return self._price

i = Item()
try:
    i.price = 20
except AttributeError:
    print("read-only")   # read-only
i._price = 20
print(i.price)           # 20
` },
    { q: "What is the difference between _x, __x and __x__?", a: "_x is a convention for 'internal, do not rely on it'. __x is name-mangled to _ClassName__x to avoid clashes with subclasses. __x__ names are special methods and attributes reserved by Python, such as __init__; do not invent your own names in this style." }
  ],
  tips: [
    "Start with plain public attributes. When you later need validation or a computed value, change the attribute into a @property; callers do not change.",
    "Put validation in the property setter and call the setter from __init__ (self.price = price), so the same rule is used at creation and at every later change.",
    "Do not return an internal list or dict directly from a method or property. Return a copy or a tuple, or callers can change your internal state from outside.",
    "Define __all__ in a module to state its public API, and prefix helpers with one underscore. Use double underscores only when you design a base class for others to subclass."
  ]
});

EXTRA(4, "Abstraction", {
  deep: [
    "Abstraction is about the interface: what a piece of code offers, written so that callers do not need to know how it works. Encapsulation is a different idea. Encapsulation hides the data and keeps it valid; abstraction hides the complexity and the choice of implementation. A class can have one without the other.",
    "Python has no 'interface' keyword. You can express an abstraction in three ways. An informal agreement (duck typing): any object with a send() method will do. An abstract base class from the abc module, which subclasses must inherit from and which refuses to create incomplete objects. A typing.Protocol (Python 3.8+), which a type checker verifies by the shape of the class, with no inheritance needed.",
    "Abstractions exist at every level: a function hides steps, a class hides state, a module hides a whole subsystem. A good one lets you change the inside without touching any caller. But every abstraction leaks a little. An ORM hides SQL until one page runs 500 queries, and then you must understand what is under it.",
    "Do not add an abstraction before you need it. An interface with one implementation and no test fake adds files and indirection and gives nothing back. A wrong abstraction is more expensive than a little repeated code, because everyone must work around it. A common rule is to wait until you have the third similar case."
  ],
  iq: [
    { q: "What is the difference between abstraction and encapsulation?", a: "Abstraction hides how something is done and shows only a simple interface, so callers depend on 'what', not 'how'. Encapsulation keeps data and the methods that use it together and protects the data from invalid changes. Abstraction is a design decision about the interface; encapsulation is about protecting the state behind it." },
    { q: "A subclass implements only one of two abstract methods. Can you create it?", a: "No. The class is still abstract while any abstract method is missing. Python raises TypeError when you try to create an instance, and the message names the missing method.", c: `
from abc import ABC, abstractmethod

class Storage(ABC):
    @abstractmethod
    def save(self, data): ...
    @abstractmethod
    def load(self): ...

class Disk(Storage):
    def save(self, data):
        return "saved"

try:
    Disk()
except TypeError:
    print("Disk is still abstract")   # Disk is still abstract
` },
    { q: "How does a Protocol differ from an abstract base class?", a: "An ABC needs inheritance: a class is accepted only if it inherits from (or is registered with) the ABC. A Protocol is structural: any class that has the right methods matches, even one that never heard of the Protocol. With @runtime_checkable, isinstance checks only that the methods exist.", c: `
from typing import Protocol, runtime_checkable

@runtime_checkable
class Sender(Protocol):
    def send(self, msg): ...

class Sms:
    def send(self, msg):
        return "sms"

print(isinstance(Sms(), Sender))   # True
` },
    { q: "Does Python have interfaces like Java?", a: "There is no interface keyword. The same job is done by an abstract base class with only abstract methods, or by a typing.Protocol. In small code people often use plain duck typing and no formal interface at all." }
  ],
  tips: [
    "Put abstractions at the edges of the system: database, payment gateway, email, file storage, the clock. Tests can then pass a fake object and run without network or disk.",
    "Name the abstraction by what it does for the caller (Notifier, OrderRepository), not by the technology (SmtpClient, PostgresHelper).",
    "Keep interfaces small: two or three methods. A caller that needs only read() should not depend on an interface with ten methods.",
    "Translate errors at the boundary. Catch the vendor library's exceptions inside your wrapper and raise your own, so the rest of the code does not depend on the vendor."
  ]
});

EXTRA(4, "Inheritance", {
  deep: [
    "Inheritance copies nothing. A child class only stores a reference to its parents in __bases__. When you read an attribute, Python walks the classes listed in __mro__ and uses the first one whose __dict__ contains the name. So if you change a method on the parent class at runtime, every child sees the change at once.",
    "Because of this search, a call to self.method() inside a parent method starts the search again from the real class of the object. If the child overrides that method, the parent's code calls the child's version. This is powerful (it is the base of the Template Method pattern) and also dangerous: a parent can break when a child overrides a method the parent relies on.",
    "Inheriting from built-in types has a trap. dict, list and str are written in C, and their methods call each other directly in C, not through your overrides. If you override __setitem__ in a dict subclass, update() and the constructor will not use it. Inherit from collections.UserDict, UserList or UserString when you want to change behaviour; they are written so that overrides are respected.",
    "Use inheritance only for a true 'is-a' relation in which the child can be used everywhere the parent is used. Deep hierarchies are hard to follow, because the behaviour of one object is spread over many files. Two or three levels are normally the limit. For sharing a piece of behaviour, a small mixin or composition is usually better."
  ],
  iq: [
    { q: "A dict subclass overrides __setitem__ to make keys upper case. What does update() do?", a: "update() ignores the override. dict.update is C code that stores items directly and does not call your __setitem__. Only the d['a'] = 1 form goes through it. Inherit from collections.UserDict to make all paths use your method.", c: `
class Upper(dict):
    def __setitem__(self, key, value):
        super().__setitem__(key.upper(), value)

d = Upper()
d["a"] = 1
d.update({"b": 2})
print(d)   # {'A': 1, 'b': 2}
` },
    { q: "A parent method calls self.name(). The child overrides name(). Which one runs?", a: "The child's. self is a Child object, and every attribute lookup starts at the real class of the object. The parent's run() does not know or care which class defines name().", c: `
class Base:
    def run(self):
        return self.name()
    def name(self):
        return "base"

class Child(Base):
    def name(self):
        return "child"

print(Child().run())   # child
` },
    { q: "What is the difference between isinstance(d, Animal) and type(d) == Animal?", a: "isinstance is True for the class and all its subclasses, so a Dog is an Animal. type(d) == Animal is True only for the exact class. Use isinstance in normal code so subclasses keep working.", c: `
class Animal: pass
class Dog(Animal): pass

d = Dog()
print(isinstance(d, Animal))   # True
print(type(d) == Animal)       # False
` },
    { q: "What is a mixin?", a: "A mixin is a small class that adds one piece of behaviour and is not meant to be used alone. It normally has no __init__ and no state of its own. You list it before the main base class, for example class Report(JsonMixin, BaseReport), so its methods are found first." }
  ],
  tips: [
    "Mark overriding methods with @typing.override (Python 3.12+). The type checker then reports a typo in the method name or a method that was removed from the parent.",
    "When you customise a container, inherit from collections.UserDict or UserList, or wrap a dict by composition. Do not subclass dict or list directly.",
    "Name mixins with the suffix Mixin, keep them free of state, and put them to the left of the main base class.",
    "If a subclass must disable a parent method (for example by raising NotImplementedError), the relation is not 'is-a'. Use composition instead."
  ]
});

EXTRA(4, "Polymorphism", {
  deep: [
    "Python decides which method to run at the moment of the call. obj.send looks up 'send' on the type of obj right then; there is no compile step that fixes it. So any object with a fitting method works, and no shared parent class is required. This is duck typing, and it is the reason Python needs far fewer interfaces than Java.",
    "Operators and built-in functions are polymorphic in the same way. a + b calls __add__ on the type of a, len(x) calls __len__, and a for loop calls __iter__. One line of code like total = total + item works for numbers, strings, lists or your own Money class.",
    "Python has no method overloading by argument types or count. A second def with the same name simply replaces the first one, because a class body is a namespace and a name can hold one object. You get the same effect with default arguments, *args, or functools.singledispatch, which chooses an implementation by the type of the first argument.",
    "The weak side of duck typing is that errors come late, at the line that uses the missing method. Some wrong types even work by accident: a str is iterable, so a function that expects a list of words accepts one word and loops over its letters. Type hints with Protocol give you an early check without losing flexibility. A long chain of isinstance tests is a sign that a method on the objects is missing."
  ],
  iq: [
    { q: "A class defines add() twice with different numbers of parameters. Which calls work?", a: "Only the three-argument call. The second def replaces the first under the same name; Python does not keep both. Use default values or *args to accept different numbers of arguments.", c: `
class Calc:
    def add(self, a, b):
        return a + b
    def add(self, a, b, c):
        return a + b + c

c = Calc()
print(c.add(1, 2, 3))   # 6
try:
    c.add(1, 2)
except TypeError:
    print("first add is gone")   # first add is gone
` },
    { q: "How can one function behave differently by argument type without if/isinstance chains?", a: "With functools.singledispatch. You register one implementation per type, and Python picks by the type of the first argument, following inheritance. That is why True uses the int version: bool is a subclass of int.", c: `
from functools import singledispatch

@singledispatch
def show(x):
    return "object"

@show.register
def _(x: int):
    return "int"

print(show(5), show("a"), show(True))   # int object int
` },
    { q: "This function expects a list of words. What happens when it gets one string?", a: "No error. A string is iterable and gives single characters, so the function returns a list of letters. Duck typing accepts it silently. Check for str explicitly or add type hints so a checker finds it.", c: `
def shout(words):
    return [w.upper() for w in words]

print(shout(["hi", "yo"]))   # ['HI', 'YO']
print(shout("hi"))           # ['H', 'I']
` },
    { q: "What is the difference between overriding and overloading?", a: "Overriding means a subclass defines a method with the same name as the parent, and the subclass version is used; Python supports this fully. Overloading means several methods with the same name but different parameters in one class; Python does not support it, the last definition wins. typing.overload exists only to describe signatures for type checkers." }
  ],
  tips: [
    "Replace 'if kind == ...' or isinstance chains with a method on each class, or with a dict that maps a key to a function. Adding a new case then needs no change to old code.",
    "Keep the same method signature and return type in all implementations. Polymorphism breaks when one class needs an extra argument.",
    "Describe the expected methods with typing.Protocol and let mypy or pyright check callers. You keep duck typing and still find mistakes before running.",
    "In binary operator methods such as __add__ and __eq__, return NotImplemented for types you do not know. Python can then try the other object's method."
  ]
});

EXTRA(4, "Composition", {
  deep: [
    "In composition an object keeps references to other objects and passes work to them. This is called delegation. The outer class decides which methods to offer and calls the inner object inside them. Nothing from the inner object is exposed unless you write it, so the public interface stays small and under your control.",
    "The parts are usually given to __init__ from outside. This is dependency injection in its simplest form. The class does not know which concrete engine, mailer or repository it has; it only calls the methods it needs. Swapping a part, or passing a fake part in a test, then needs no change to the class.",
    "Textbooks separate composition from aggregation. In strict composition the whole creates and owns its parts, and the parts have no life without it. In aggregation the part comes from outside and may be shared and live longer. Python has no syntax for the difference; it is only about who creates the object and who else holds a reference. A shared part means shared state, which you must want.",
    "Inheritance gives the child the whole public interface of the parent and ties it to the parent's inner workings. Composition avoids both. Inheritance is still right for a real 'is-a' case, or when a framework requires it, as with exception classes or Django models. A quick test: if you want only some methods of the other class, or want to change the part at runtime, use composition."
  ],
  iq: [
    { q: "A wrapper forwards everything with __getattr__. Why does len() fail?", a: "__getattr__ is used for normal attribute access, so w.count works. Built-in operations like len() look up the special method on the class, not on the instance, and skip __getattr__. You must define __len__ (and other special methods) on the wrapper yourself.", c: `
class Wrapper:
    def __init__(self, inner):
        self._inner = inner
    def __getattr__(self, name):
        return getattr(self._inner, name)

w = Wrapper([1, 2, 3])
print(w.count(2))    # 1
try:
    len(w)
except TypeError:
    print("len is not forwarded")   # len is not forwarded
` },
    { q: "Two cars get the same engine object. What happens when one changes it?", a: "Both see the change, because both hold a reference to one object. Injecting a part does not copy it. Create a new part for each owner unless you really want it shared.", c: `
class Engine:
    def __init__(self):
        self.km = 0

shared = Engine()

class Car:
    def __init__(self, engine):
        self.engine = engine

a = Car(shared)
b = Car(shared)
a.engine.km = 500
print(b.engine.km)   # 500
` },
    { q: "Why is 'class Stack(list)' a poor design?", a: "A stack should offer only push, pop and peek. By inheriting from list it also gets insert, sort, indexing and more, so callers can break the stack rules. A Stack that holds a list inside (composition) exposes only the methods you choose." },
    { q: "What is the difference between composition and aggregation?", a: "In composition the outer object creates and owns the part, and the part ends with it, like an Order and its order lines. In aggregation the part is created outside and only referenced, so it can be shared and can live on, like a Team and its Players. In Python the code looks nearly the same; the difference is ownership." }
  ],
  tips: [
    "Pass dependencies into __init__ instead of creating them inside the class. In tests you pass a simple fake and need no patching.",
    "Forward explicitly the few methods you want to offer. A catch-all __getattr__ hides the interface from readers, editors and type checkers.",
    "Avoid long chains like order.customer.address.city in many places. Add a method on the nearer object, so a change inside does not break every caller.",
    "When subclasses multiply for every combination (PetrolAutoCar, ElectricAutoCar, ...), stop and move each varying part into its own object that you plug in."
  ]
});

EXTRA(4, "MRO", {
  deep: [
    "C3 builds the order with a merge. The MRO of a class is the class itself, followed by the merge of the MROs of its parents and the list of the parents. The merge repeatedly takes the first class of the first list that does not appear later in any other list. If that class is blocked, it tries the first class of the next list.",
    "For class D(B, C) with B(A) and C(A): the lists are [B, A, object], [C, A, object] and [B, C]. B is taken first. Next comes A, but A appears later in the second list, so it must wait. C is taken, then A, then object. The result is D, B, C, A, object. This is not a simple depth-first search: A comes after C, even though B's own parent is A.",
    "C3 guarantees three things: a class always comes before its parents, the parents keep the left-to-right order you wrote, and the order inside each parent's MRO is kept. If these rules cannot all hold, the class cannot be created and Python raises TypeError at the class statement.",
    "The MRO is calculated once, when the class is created, and stored in __mro__. It is used for every attribute lookup on the class, not only for methods, and super() walks along it. When you find yourself reasoning about a deep diamond to understand a bug, the design is too complex; flatten it or use composition."
  ],
  iq: [
    { q: "Why can class C(A, B) not be created when B is a subclass of A?", a: "The base list says A must come before B. But B is a child of A, so B must come before A. Both rules cannot hold, and Python raises TypeError about a consistent MRO. Writing the bases as (B, A) works.", c: `
class A: pass
class B(A): pass

try:
    class C(A, B): pass
except TypeError:
    print("no consistent MRO")   # no consistent MRO

class D(B, A): pass
print([k.__name__ for k in D.__mro__])   # ['D', 'B', 'A', 'object']
` },
    { q: "B does not define who(). B's parent A does, and so does C. What does D(B, C) use?", a: "It uses C's version. The MRO is D, B, C, A, so after B Python looks at C before A. A depth-first search would have gone from B to A and returned 'A', but C3 puts a shared parent after all its children.", c: `
class A:
    def who(self): return "A"
class B(A):
    pass
class C(A):
    def who(self): return "C"
class D(B, C):
    pass

print(D().who())   # C
` },
    { q: "Does the order of the base classes matter?", a: "Yes. Parents are searched from left to right, so the first parent that has the name wins. This applies to all attributes, not only methods. Changing the order of bases can change behaviour without any error.", c: `
class X:
    name = "X"
class Y:
    name = "Y"
class P(X, Y): pass
class Q(Y, X): pass
print(P.name, Q.name)   # X Y
` },
    { q: "What is the diamond problem and how does Python handle it?", a: "Two parents inherit from the same grandparent, so it is unclear which path wins and whether the grandparent is used twice. Python's C3 order lists each class exactly once and puts the grandparent after both parents. With super() in every class, each method in the diamond runs once." }
  ],
  tips: [
    "When multiple inheritance behaves strangely, print ClassName.__mro__ first. It answers 'which method runs' at once.",
    "Order the bases from most specific to most general: mixins on the left, the main base class on the right.",
    "Keep mixins independent of each other. If two mixins define the same method name, the result depends on their order, and that is a hidden bug.",
    "Avoid diamonds in your own class design. If two parents share state from a common base, replace one branch with composition."
  ]
});

EXTRA(4, "super()", {
  deep: [
    "super() does not mean 'my parent class'. It returns a proxy object that searches the MRO of the object's real class, starting just after the class in which the code is written. In single inheritance that is the parent. In multiple inheritance it can be a sibling class that the current class knows nothing about.",
    "The form without arguments works through help from the compiler. When a method uses the name super, the compiler adds a hidden variable __class__ that points to the class being defined. super() reads it, and takes the first argument of the method as the instance. This is why super() without arguments fails in a function that was defined outside a class and attached later.",
    "For multiple inheritance to work, every class in the chain must cooperate. Each __init__ takes the keyword arguments it needs, and passes the rest on with super().__init__(**kwargs). If one class in the chain forgets to call super(), all classes after it in the MRO are silently skipped.",
    "Calling the parent by name, Parent.__init__(self), ignores the MRO. In a diamond this runs the shared grandparent twice, or skips a sibling. Use super() everywhere or nowhere in one hierarchy; mixing the two styles gives the worst results. super() also works in class methods and for properties."
  ],
  iq: [
    { q: "In a diamond where every class calls super().__init__(), what is the output?", a: "D, B, C, A. super() follows the MRO of D, which is D, B, C, A. So super() inside B calls C, not A, although A is B's only parent. Each class runs exactly once.", c: `
class A:
    def __init__(self):
        print("A")
class B(A):
    def __init__(self):
        print("B")
        super().__init__()
class C(A):
    def __init__(self):
        print("C")
        super().__init__()
class D(B, C):
    def __init__(self):
        print("D")
        super().__init__()

D()
# D
# B
# C
# A
` },
    { q: "B does not call super().__init__(). What is printed for D(B, C)?", a: "Only B. The chain is D, B, C, A, and it stops at B because B does not pass the call on. C and A are never initialised, with no error message. One missing super() call breaks all classes after it.", c: `
class A:
    def __init__(self):
        print("A")
class B(A):
    def __init__(self):
        print("B")
class C(A):
    def __init__(self):
        print("C")
        super().__init__()
class D(B, C):
    def __init__(self):
        super().__init__()

D()
# B
` },
    { q: "What goes wrong when parents are called by name instead of with super()?", a: "Each class calls its own parent directly, so the shared base A is initialised twice. If A opens a connection or registers something, that happens twice too. super() follows the MRO and runs each class once.", c: `
class A:
    def __init__(self):
        print("A")
class B(A):
    def __init__(self):
        A.__init__(self)
class C(A):
    def __init__(self):
        A.__init__(self)
class D(B, C):
    def __init__(self):
        B.__init__(self)
        C.__init__(self)

D()
# A
# A
` },
    { q: "Does super() always call the parent class?", a: "No. It calls the next class in the MRO of the object's real class. For an object of a subclass with several parents, the next class can be a sibling. So a class cannot know for sure which method its own super() call will reach." }
  ],
  tips: [
    "Use the zero-argument form super(). The old super(ClassName, self) form breaks when the class is renamed.",
    "In classes designed for multiple inheritance, accept **kwargs in __init__ and pass them on: super().__init__(**kwargs). Callers then use keyword arguments only.",
    "A mixin must call super() in every method it overrides, even if you think nothing is above it. In another class's MRO there may be.",
    "Call super().__init__() at the start of __init__ unless you have a clear reason, so the parent's attributes exist before your code uses them."
  ]
});

EXTRA(4, "Magic/dunder methods", {
  deep: [
    "When Python runs a built-in operation, it looks up the special method on the type of the object, not on the object itself. len(x) is really type(x).__len__(x). So attaching __len__ to one instance has no effect on len(), and __getattr__ is not asked either. This rule keeps the lookup fast and consistent.",
    "A binary operator is a small negotiation. For a + b Python calls a.__add__(b). If that returns the special value NotImplemented, Python tries b.__radd__(a). If that also gives NotImplemented, you get TypeError. So for an unknown type your method must return NotImplemented, not raise an error, to give the other object a chance. NotImplemented is a value; NotImplementedError is an unrelated exception.",
    "__eq__ and __hash__ belong together. When a class defines __eq__ and no __hash__, Python sets __hash__ to None and the objects cannot be used in a set or as dict keys. If you define both, equal objects must have equal hashes, and the hash must never change while the object is in a set or dict. In practice, hash only fields that do not change.",
    "__repr__ is for developers and should be unambiguous; __str__ is for users. If only __repr__ exists, str() and print() use it. Containers always show their items with __repr__. Truth testing calls __bool__, and if that is missing, __len__, so an object with length 0 is false. Do not invent your own __name__ methods; that style is reserved for Python."
  ],
  iq: [
    { q: "The class has both __str__ and __repr__. Which one is used when the object is inside a list?", a: "__repr__. print(obj) uses __str__, but a list builds its text from the repr of each item. That is why a class with only __str__ still shows the default address text inside lists and in the debugger.", c: `
class Money:
    def __init__(self, n): self.n = n
    def __str__(self): return "Rs." + str(self.n)
    def __repr__(self): return "Money(" + str(self.n) + ")"

m = Money(5)
print(m)        # Rs.5
print([m])      # [Money(5)]
print(f"{m!r}") # Money(5)
` },
    { q: "After adding __eq__, why can the object no longer go into a set?", a: "Defining __eq__ without __hash__ sets __hash__ to None, so the class is unhashable. Python does this because the default hash is based on identity and would disagree with your new equality. Add a __hash__ that uses the same fields as __eq__.", c: `
class P:
    def __init__(self, x): self.x = x
    def __eq__(self, other): return self.x == other.x

print(P(1) == P(1))    # True
try:
    {P(1)}
except TypeError:
    print("unhashable")   # unhashable
` },
    { q: "__len__ is added to one instance. Does len() use it?", a: "No. len() looks for __len__ on the class, not in the instance's attributes. Calling a.__len__() directly works because that is a normal attribute access. Special methods must be defined on the class.", c: `
class A:
    pass

a = A()
a.__len__ = lambda: 5
print(a.__len__())    # 5
try:
    len(a)
except TypeError:
    print("len() ignores it")   # len() ignores it
` },
    { q: "A class defines __len__ but not __bool__. How is the object tested in an if statement?", a: "Python first looks for __bool__. If it is missing, it calls __len__ and treats length 0 as false. So an empty container object is false, which can surprise code that wrote 'if box:' and meant 'if box is not None'.", c: `
class Box:
    def __init__(self, items): self.items = items
    def __len__(self): return len(self.items)

print(bool(Box([])))     # False
print(bool(Box([1])))    # True
` }
  ],
  tips: [
    "Write __repr__ for every class that appears in logs. A good format looks like the call that creates the object: Money(150).",
    "If you write __eq__, either also write __hash__ over the same immutable fields, or accept that the objects are unhashable. A frozen dataclass does both for you.",
    "For ordering, write __eq__ and __lt__ and add @functools.total_ordering, or use @dataclass(order=True). Do not write all six comparison methods by hand.",
    "Overload operators only when the meaning is obvious, such as + for money or vectors. A surprising operator is worse than a clearly named method."
  ]
});

EXTRA(4, "Abstract base classes", {
  deep: [
    "ABC uses the metaclass ABCMeta. When a class is created, the metaclass collects the names of all methods marked with @abstractmethod that are still not overridden, and stores them in __abstractmethods__. When you try to create an instance, object.__new__ checks this set and raises TypeError if it is not empty. So the check happens at instantiation: not when the subclass is defined, and not when the method is called.",
    "The check is only by name. Python does not compare parameters or return types, so a subclass can 'implement' a method with a wrong signature and still pass. An abstract method may have a body, and a subclass can call it with super(), which is useful for shared default behaviour. To make an abstract property, put @property above @abstractmethod.",
    "An ABC can accept classes that do not inherit from it. SomeABC.register(Other) makes isinstance and issubclass return True for Other, with no check that the methods exist. Some ABCs in collections.abc go further and recognise any class that has the right method; for example, any class with __len__ counts as Sized.",
    "The ABCs in collections.abc also give you free methods. If you inherit from Mapping and write __getitem__, __iter__ and __len__, you get get, keys, items, values and 'in' automatically. Use an ABC when you own a family of classes and want a hard runtime guarantee. For classes you do not control, a typing.Protocol is the lighter choice. With only one implementation, you need neither."
  ],
  iq: [
    { q: "A subclass does not implement the abstract method. When does the error come?", a: "When you create an instance, not when the class is defined. Defining an incomplete subclass is allowed, because it may be an abstract step in a bigger hierarchy. The TypeError appears at Child().", c: `
from abc import ABC, abstractmethod

class Base(ABC):
    @abstractmethod
    def run(self): ...

class Child(Base):
    pass

print("class created fine")           # class created fine
try:
    Child()
except TypeError:
    print("error at instantiation")   # error at instantiation
` },
    { q: "Can an abstract method contain code?", a: "Yes. @abstractmethod only forces subclasses to override the method. The body in the base class can hold common logic, and the subclass can reach it with super().", c: `
from abc import ABC, abstractmethod

class Base(ABC):
    @abstractmethod
    def greet(self):
        return "hello"

class Child(Base):
    def greet(self):
        return super().greet() + " world"

print(Child().greet())   # hello world
` },
    { q: "What does @abstractmethod do in a class that does not inherit from ABC?", a: "Nothing. The check is done by the ABCMeta metaclass, and a normal class does not have it. The class can be instantiated even though the method is marked abstract. This is a common silent mistake.", c: `
from abc import abstractmethod

class Base:
    @abstractmethod
    def run(self): ...

Base()
print("no error")   # no error
` },
    { q: "What does register() do, and what is the risk?", a: "It declares a class as a 'virtual subclass', so isinstance returns True without inheritance. Python does not check that the class really has the abstract methods. You promise it yourself, and a wrong promise fails later with AttributeError.", c: `
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self): ...

class Blob:
    pass

Shape.register(Blob)
print(isinstance(Blob(), Shape))   # True
print(hasattr(Blob(), "area"))     # False
` }
  ],
  tips: [
    "Use an ABC as the contract for plugins and drivers (payment gateways, storage backends, exporters). A new implementation that misses a method fails at start-up, not in the middle of a request.",
    "To build your own dict-like or list-like class, inherit from collections.abc.Mapping, MutableMapping or Sequence. You write a few methods and get the rest for free.",
    "'raise NotImplementedError' in a base method is weaker than @abstractmethod: the error comes only when the method is called, maybe in production. Prefer the ABC.",
    "Write one shared set of tests for the contract and run it against every implementation. An ABC checks that methods exist, not that they behave correctly."
  ]
});

EXTRA(4, "SOLID principles", {
  deep: [
    "SOLID came from languages like Java and C++, and in Python the same ideas need less code. Single responsibility means a class has one reason to change, not that it has one method. Ask who would request a change: if the accountant, the database admin and the marketing team could each force an edit to the same class, it has three responsibilities.",
    "Open/closed means you can add a new case without editing code that already works. In Python this is often a dict that maps a name to a function or class, or a new subclass, instead of one more branch in a long if/elif. Liskov substitution means code written for the parent must still be correct when given a child: the child must accept the same inputs, return the same kind of result and not raise new surprising errors.",
    "Interface segregation says a caller should not depend on methods it does not use. Python does this with small Protocols or small ABCs. Dependency inversion says business code should depend on an abstraction and receive the concrete object from outside. In Python that is usually just a constructor argument, with a Protocol as its type hint.",
    "SOLID is a set of guidelines, not laws. Applied too early it produces many tiny classes, interfaces with one implementation and code that is hard to follow. Use the principles when you feel real pressure: a class that changes for many reasons, an if/elif that grows every sprint, or tests that cannot run without a database."
  ],
  iq: [
    { q: "Why is Square inheriting from Rectangle the classic Liskov violation?", a: "Code written for Rect expects that changing the width leaves the height alone. Square changes both, so the same function gives a result the caller did not expect. The subclass passes the type check but breaks the behaviour the parent promised.", c: `
class Rect:
    def __init__(self, w, h):
        self.w, self.h = w, h
    def set_width(self, w):
        self.w = w
    def area(self):
        return self.w * self.h

class Square(Rect):
    def set_width(self, w):
        self.w = self.h = w

def stretch(r):
    r.set_width(10)
    return r.area()

print(stretch(Rect(2, 5)))     # 50
print(stretch(Square(5, 5)))   # 100
` },
    { q: "How do you follow the open/closed principle in Python without a big if/elif?", a: "Keep a registry and let each new rule add itself. Adding a discount is then a new function with a decorator; the code that looks up and applies discounts is never edited. The same idea works with classes and subclasses.", c: `
DISCOUNTS = {}

def discount(name):
    def register(func):
        DISCOUNTS[name] = func
        return func
    return register

@discount("festival")
def festival(price):
    return price * 0.75

print(DISCOUNTS["festival"](1000))   # 750.0
` },
    { q: "Is dependency inversion the same as dependency injection?", a: "No. Dependency inversion is the principle: high-level code depends on an abstraction, not on a concrete low-level class. Dependency injection is a technique to reach it: the object receives its dependencies from outside, for example through __init__. You can inject a concrete class and still break the principle." },
    { q: "Does single responsibility mean a class should have only one method?", a: "No. It means the class should have one reason to change, that is, one area of the business it serves. A class can have many methods if they all belong to the same job. Splitting too far gives many tiny classes that are harder to understand than one clear class." }
  ],
  tips: [
    "Start with dependency inversion at I/O boundaries: pass the repository, mailer or HTTP client into the constructor. It gives the biggest gain, because tests become fast and simple.",
    "Describe a class in one sentence. If you need the word 'and' (calculates the invoice AND emails it), consider splitting it.",
    "A subclass method that raises NotImplementedError or ignores its arguments is a Liskov warning sign. The class is probably not a real subtype.",
    "When the same if/elif on a 'type' field appears in several places, replace it with a dict registry or polymorphic classes. One new type then means one new entry."
  ]
});

EXTRA(4, "Design patterns", {
  deep: [
    "The 23 classic patterns are grouped as creational (how objects are made), structural (how objects are combined) and behavioural (how objects talk to each other). Many were written to work around limits of C++ and Java in the 1990s. Python has first-class functions, classes as objects, generators and modules, so several patterns shrink to a few lines or are already part of the language.",
    "Some examples. Strategy is passing a function. Iterator is the for loop and generators. Command is a callable or functools.partial. Factory is a dict from a key to a class, or a classmethod. Observer is a list of callbacks. Singleton is a module: a module is executed once, stored in sys.modules, and every import gets the same object.",
    "The Decorator pattern and Python's @decorator are related but not the same. The pattern wraps an object in another object with the same interface to add behaviour at runtime. The @ syntax wraps a function or class once, at definition time. Knowing the difference is a common interview point.",
    "Patterns are a shared vocabulary, not a goal. Saying 'this is an adapter' explains a design in three words. Forcing a pattern where a function would do makes code longer and harder to read. Singletons need special care: they are global state, they make tests depend on each other, and a hand-written one is not thread-safe without a lock."
  ],
  iq: [
    { q: "This Singleton returns the same object, but the saved value is lost. Why?", a: "__new__ returns the existing instance, but Python still calls __init__ on it every time the class is called. __init__ resets values to an empty dict. Guard the setup so it runs once, or use a module-level object instead.", c: `
class Config:
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    def __init__(self):
        self.values = {}

a = Config()
a.values["debug"] = True
b = Config()
print(a is b)       # True
print(a.values)     # {}
` },
    { q: "How do you write a Factory in Python without a long if/elif?", a: "Classes are objects, so you can store them in a dict and call the one you look up. Adding a new type is one new dict entry. Turn the KeyError into a clear ValueError so the caller sees which kind was unknown.", c: `
class Upi:
    def pay(self): return "upi"
class Card:
    def pay(self): return "card"

GATEWAYS = {"upi": Upi, "card": Card}

def make_gateway(kind):
    try:
        return GATEWAYS[kind]()
    except KeyError:
        raise ValueError("unknown gateway: " + kind) from None

print(make_gateway("card").pay())   # card
` },
    { q: "What is the simplest correct Singleton in Python?", a: "A module. Create the object once at module level and import it where needed. Python runs a module only on the first import and caches it in sys.modules, so every importer gets the same object. It needs no special class and no locking code of your own." },
    { q: "What memory problem can the Observer pattern cause?", a: "The subject keeps a normal reference to each observer in its list. An observer that is no longer used anywhere else is still held by that list, so it is never freed and keeps getting events. Remove observers explicitly, or store them in a weakref.WeakSet." }
  ],
  tips: [
    "Wrap each third-party SDK (payment, SMS, cloud storage) in your own small Adapter class. A change of vendor then touches one file, and tests replace one object.",
    "Write strategies as plain functions and select them from a dict. Create strategy classes only when a strategy needs its own state or several methods.",
    "Avoid Singleton classes. Create shared objects (settings, connection pool) once at start-up and pass them to the code that needs them; tests can then pass their own.",
    "Use the pattern name in a class name or docstring only when it helps the reader (OrderRepository, PaymentAdapter). Do not add a pattern because it looks professional."
  ]
});
