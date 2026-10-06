EXTRA(5, "Decorator internals", {
  deep: [
    "A decorator runs once, at the moment the function is defined (usually when the module is imported). It does not run on every call. Python calls the decorator with the function and then binds the function name to whatever comes back. The result does not even have to be a function: it can be a class instance, or the same function unchanged (this is how registration decorators like @app.get work).",
    "The wrapper function is a closure. It keeps the original function in a hidden cell (wrapper.__closure__), so the original stays alive even though its name now points to the wrapper. functools.wraps copies __name__, __qualname__, __doc__, __module__ and __annotations__ to the wrapper, merges __dict__, and adds a __wrapped__ attribute that points to the original. inspect.signature follows __wrapped__, which is why tools like FastAPI and pytest still see the real parameters.",
    "When you stack decorators, they are applied from the bottom up: the one nearest to 'def' wraps first. At call time the order is reversed: the top wrapper runs first. A decorator with arguments, like @retry(times=3), is a normal function call first. Python calls retry(times=3), and the result of that call is the real decorator. This is why writing @retry without brackets breaks: the function itself is passed in as 'times'.",
    "Two edge cases cause real bugs. First, a normal (sync) wrapper around an 'async def' function only creates the coroutine and returns it, so a timing or try/except wrapper measures and catches nothing; you need an async wrapper that awaits. Second, a decorator written as a class with __call__ does not work on methods unless it also defines __get__, because the instance is not bound to 'self'. Do not use a decorator when a plain function call is clearer: decorators hide control flow from the reader."
  ],
  iq: [
    { q: "Two decorators are stacked on one function. In which order do they run?", a: "They are applied bottom-up, so the decorator closest to the function wraps it first. When you call the function, the outer (top) wrapper runs first and calls the inner one. Here italic wraps hi, then bold wraps the result.", c: `
def bold(f):
    def w(): return "<b>" + f() + "</b>"
    return w

def italic(f):
    def w(): return "<i>" + f() + "</i>"
    return w

@bold
@italic
def hi(): return "hi"

print(hi())   # <b><i>hi</i></b>
` },
    { q: "When does the code inside a decorator run: at definition time or at call time?", a: "The decorator body runs once at definition time, when Python executes the 'def' statement. Only the wrapper it returns runs at call time. This is why a slow decorator makes imports slow, and why registration decorators work without calling the function.", c: `
def register(f):
    print("registering", f.__name__)
    return f

@register
def job(): print("running")

print("before call")
job()
# registering job
# before call
# running
` },
    { q: "What is lost if you forget functools.wraps?", a: "The decorated function reports the name and docstring of the wrapper, not the original. Logs, error messages, documentation tools and frameworks that read the signature all see the wrong function. wraps fixes this and also adds __wrapped__, so you can reach the original function.", c: `
from functools import wraps

def plain(f):
    def wrapper(*a, **k): return f(*a, **k)
    return wrapper

def good(f):
    @wraps(f)
    def wrapper(*a, **k): return f(*a, **k)
    return wrapper

@plain
def one(): pass

@good
def two(): pass

print(one.__name__, two.__name__)   # wrapper two
` },
    { q: "You put a normal timing decorator on an 'async def' function and it always reports almost zero time. Why?", a: "Calling an async function does not run it. It only creates a coroutine object, which is very fast. The sync wrapper measures only that creation and returns the coroutine to the caller, who awaits it later. The wrapper must itself be 'async def' and must 'await func(...)' inside the timed block." }
  ],
  tips: [
    "Always use @functools.wraps(func) on the wrapper. Without it, logs, tracebacks and FastAPI/pytest signature inspection show the wrong function.",
    "Type your decorators with ParamSpec and TypeVar (or the 3.12 syntax def deco[**P, R]) so editors still know the real parameters of the decorated function.",
    "Keep decorator bodies cheap: they run at import time. Never open a network connection or read a big file in the decorator itself, only inside the wrapper.",
    "For retries in production use a tested library such as tenacity with exponential backoff and a retry limit. In unit tests you can call func.__wrapped__ to test the original function without the decorator."
  ]
});

EXTRA(5, "Descriptor protocol", {
  deep: [
    "To understand descriptors you must know the exact lookup order for obj.x. Python first searches the class and its parents (the MRO) for 'x'. If it finds a data descriptor there (an object with __set__ or __delete__), that descriptor wins and its __get__ is called. If not, Python looks in the instance dictionary obj.__dict__. If that fails too, it uses a non-data descriptor (only __get__) or a plain class attribute. If nothing is found, __getattr__ is called as the last step.",
    "This order explains many things. A plain function is a non-data descriptor: its __get__ returns a bound method, and this is how 'self' gets filled in. Because it is non-data, an instance attribute with the same name can hide a method. A property is a data descriptor, so an instance attribute can never hide it. functools.cached_property is deliberately non-data: it stores the result in the instance dict under the same name, so the next lookup finds the value directly and never calls the descriptor again.",
    "A descriptor object is created once, in the class body, and is shared by every instance of that class. So you must not store the per-instance value on the descriptor itself (self.value = ...), or all instances will share one value. Store it on the instance, usually in obj.__dict__ or under a private name. When the attribute is read on the class (Product.price), __get__ receives obj=None; the normal convention is to return the descriptor itself in that case.",
    "Descriptors only work when they are stored on a class. If you put a descriptor object in an instance attribute, Python returns the object itself and does not call __get__. Write your own descriptor only when the same attribute logic is needed on many attributes or many classes. For one attribute in one class, property is simpler, and for data validation a library such as pydantic or attrs is usually the better choice."
  ],
  iq: [
    { q: "What is the difference between a data descriptor and a non-data descriptor?", a: "A data descriptor defines __set__ or __delete__; a non-data descriptor defines only __get__. A data descriptor has priority over the instance dictionary, but the instance dictionary has priority over a non-data descriptor. That is why you can hide a method on one instance but you cannot hide a property.", c: `
class NonData:
    def __get__(self, obj, objtype=None): return "from descriptor"

class Data(NonData):
    def __set__(self, obj, value): pass

class A:
    x = NonData()
    y = Data()

a = A()
a.__dict__["x"] = "from instance"
a.__dict__["y"] = "from instance"
print(a.x)   # from instance
print(a.y)   # from descriptor
` },
    { q: "This descriptor stores the value on itself. What is the bug?", a: "There is only one descriptor object per class, not one per instance. Storing the value on the descriptor means all instances share it, so the last write wins for everybody. The value must be stored on the instance (obj), for example in obj.__dict__.", c: `
class Bad:
    def __get__(self, obj, objtype=None): return self.value
    def __set__(self, obj, value): self.value = value

class Product:
    price = Bad()

a, b = Product(), Product()
a.price = 10
b.price = 99
print(a.price)   # 99
` },
    { q: "How does a method receive 'self' automatically?", a: "Functions are non-data descriptors. When you read a.hello, Python finds the function on the class and calls its __get__(a, A), which returns a bound method object that remembers 'a'. Calling the bound method inserts 'a' as the first argument.", c: `
class A:
    def hello(self): return "hi"

a = A()
print(type(A.__dict__["hello"]).__name__)             # function
print(type(a.hello).__name__)                         # method
print(a.hello == A.__dict__["hello"].__get__(a, A))   # True
` },
    { q: "You assign a descriptor object to an instance attribute (self.price = Positive()). Why does it not validate anything?", a: "Python calls __get__ and __set__ only for descriptors found on the class (in the type), not for objects stored in the instance dictionary. On an instance the descriptor is just a normal value, so reading it returns the descriptor object itself. Descriptors must be class attributes." }
  ],
  tips: [
    "Use __set_name__ to learn the attribute name automatically instead of making the user repeat it as a string argument.",
    "In __get__, start with 'if obj is None: return self'. Tools like help(), Sphinx and dataclasses read attributes on the class and expect this.",
    "Store the value on the instance (obj.__dict__ or a private name), never on the descriptor. If the class uses __slots__, there is no __dict__, so use setattr with a slot name.",
    "Before writing a validation descriptor, check if pydantic, attrs or a dataclass with __post_init__ already solves the problem. A custom descriptor pays off only when it is reused on many fields."
  ]
});

EXTRA(5, "property", {
  deep: [
    "property is a ready-made data descriptor written in C. It always defines __set__, even when you give no setter; in that case __set__ raises AttributeError. Because it is a data descriptor, it has priority over the instance dictionary, so nothing stored on the instance can hide it. This is also why a property with no setter is a simple way to make a read-only attribute.",
    "@celsius.setter does not change the existing property. It creates a new property object that has the old getter plus the new setter, and binds it to the function name below it. This is why the setter function must have exactly the same name as the getter. If you use a different name, you end up with two different properties and the first one still has no setter.",
    "A property lives on the class, and its getter is a fixed function object. If a subclass overrides the getter method only, the property in the parent still calls the old function. The subclass must define the property again, or use @Parent.name.getter to make a new property. Another trap: if a getter raises AttributeError by accident and the class also has __getattr__, Python hides the real error and calls __getattr__ instead, which is very confusing to debug.",
    "Readers expect obj.x to be cheap and to have no side effects. Do not hide a database query, a network call or heavy maths behind a property; use a method so the cost is visible, or functools.cached_property if the value should be computed once. Also do not write empty getter and setter pairs 'for the future'. Start with a plain attribute; you can turn it into a property later without changing any code that uses it."
  ],
  iq: [
    { q: "In __init__, why do we write self.celsius = value and not self._celsius = value?", a: "Assigning to self.celsius goes through the property setter, so the validation also runs when the object is created. Assigning to self._celsius directly skips the setter, and an invalid object can be created. The setter then stores the real value in self._celsius.", c: `
class T:
    def __init__(self, c): self.c = c       # uses the setter

    @property
    def c(self): return self._c

    @c.setter
    def c(self, v):
        if v < 0: raise ValueError("negative")
        self._c = v

try:
    T(-1)
except ValueError as e:
    print("error:", e)   # error: negative
` },
    { q: "What happens when this property is read?", a: "It raises RecursionError. Inside the getter, self.name reads the same property again, which calls the getter again, without end. The getter must read a different, private attribute such as self._name.", c: `
class User:
    @property
    def name(self): return self.name    # bug: should be self._name

try:
    User().name
except RecursionError:
    print("RecursionError")   # RecursionError
` },
    { q: "Can you override a property by putting a value in the instance dictionary?", a: "No. A property is a data descriptor, and data descriptors are checked before the instance dictionary. Reading still calls the getter, and normal assignment calls the setter, or fails with AttributeError if there is no setter.", c: `
class A:
    @property
    def x(self): return 1

a = A()
a.__dict__["x"] = 2
print(a.x)    # 1
try:
    a.x = 5
except AttributeError:
    print("cannot set")   # cannot set
` },
    { q: "What is the difference between property and functools.cached_property?", a: "A property runs its getter on every access. cached_property runs the function once, then saves the result in the instance __dict__ under the same name, so later reads are plain attribute reads. It needs an instance __dict__ (so it does not work with __slots__ unless you add '__dict__'), and the only way to refresh the value is 'del obj.attr'." }
  ],
  tips: [
    "Start with a public attribute. Convert it to a property only when you really need validation or a computed value; callers do not have to change.",
    "Keep getters fast and free of side effects. If it does I/O or can fail often, make it a method with a verb name like load_profile().",
    "Use a property with no setter to give a read-only public view of a private attribute, for example 'id' or 'created_at'.",
    "Use cached_property for expensive values that do not change during the life of the object, and remember it is not refreshed when other attributes change."
  ]
});

EXTRA(5, "__getattr__ vs __getattribute__", {
  deep: [
    "Every obj.x starts in type(obj).__getattribute__. The default version, object.__getattribute__, does the whole normal lookup: data descriptors, the instance dictionary, then class attributes. Only if that raises AttributeError does Python call __getattr__, if the class has one. So __getattr__ never sees attributes that exist; it is only the 'not found' hook.",
    "The classic bug in __getattribute__ is infinite recursion. Any self.something inside it calls __getattribute__ again. You must go through the parent: super().__getattribute__(name) or object.__getattribute__(self, name). __getattr__ can also recurse: if it reads an attribute that does not exist yet (for example self._data before __init__ has set it), it calls itself forever. This really happens with copy and pickle, because they create the object without calling __init__.",
    "Special methods used by the language itself skip both hooks. len(obj), obj + 1, iter(obj) and 'with obj' look for __len__, __add__, __iter__ and __enter__ directly on the type, not on the instance. So a proxy that forwards everything through __getattr__ still does not support len() or iteration. You have to define those special methods explicitly on the proxy class.",
    "__getattr__ must raise AttributeError for names it does not know. hasattr() and getattr(obj, name, default) work by catching AttributeError; if you return None or raise KeyError, hasattr gives wrong answers and copy, pickle and mock libraries break. Remember also that dynamic attributes are invisible to editors and type checkers. If the list of names is known, plain attributes or properties are better."
  ],
  iq: [
    { q: "A class defines both __getattribute__ and __getattr__. Which one is called, and when?", a: "__getattribute__ is called for every access, existing or not. __getattr__ is called only after __getattribute__ raises AttributeError. Here x exists, so only __getattribute__ runs; y does not exist, so both run.", c: `
class A:
    def __init__(self): self.x = 1
    def __getattribute__(self, name):
        print("get", name)
        return super().__getattribute__(name)
    def __getattr__(self, name):
        return "fallback"

a = A()
print(a.x)
print(a.y)
# get x
# 1
# get y
# fallback
` },
    { q: "This proxy works in normal use but crashes with RecursionError when the object is copied or unpickled. Why?", a: "copy and pickle create the object without calling __init__, so _target does not exist yet. Then any attribute access calls __getattr__, which reads self._target, which is missing, which calls __getattr__ again, forever. The fix is to raise AttributeError for private names at the top of __getattr__.", c: `
class Proxy:
    def __init__(self, target): self._target = target
    def __getattr__(self, name): return getattr(self._target, name)

p = Proxy.__new__(Proxy)       # object without __init__, like copy/pickle
try:
    p.anything
except RecursionError:
    print("RecursionError")    # RecursionError
` },
    { q: "A proxy forwards everything with __getattr__. Why does len(proxy) still fail?", a: "Implicit special method calls are looked up on the type, not on the instance, and they do not go through __getattr__ or __getattribute__. Calling p.__len__() by name works because that is a normal attribute access, but len(p) does not. The proxy class must define __len__ itself.", c: `
class Proxy:
    def __init__(self, target): self._target = target
    def __getattr__(self, name): return getattr(self._target, name)

p = Proxy([1, 2, 3])
print(p.count(2))       # 1
print(p.__len__())      # 3
try:
    len(p)
except TypeError:
    print("TypeError")  # TypeError
` },
    { q: "What goes wrong if __getattr__ returns None for unknown names instead of raising AttributeError?", a: "hasattr(obj, anything) becomes True for every name, because hasattr only checks if an AttributeError was raised. Code that tests for optional methods (copy, pickle, template engines, mocks) then believes the object supports them and calls None. A typo in an attribute name also silently gives None instead of an error." }
  ],
  tips: [
    "Start __getattr__ with: if name.startswith('_'): raise AttributeError(name). This prevents the recursion problem with copy and pickle and keeps private names honest.",
    "Use a module-level __getattr__ (Python 3.7+) for lazy imports of heavy sub-modules and for deprecation warnings on old names.",
    "If the computed value is stable, save it with setattr(self, name, value) inside __getattr__. The next access finds it normally and __getattr__ is not called again.",
    "Avoid overriding __getattribute__ in application code: it runs on every attribute read and slows the whole class. When you add dynamic attributes, also define __dir__ so autocomplete and debugging tools can list them."
  ]
});

EXTRA(5, "__new__ vs __init__", {
  deep: [
    "When you write Cls(1, 2), Python really calls type.__call__(Cls, 1, 2). That function first calls Cls.__new__(Cls, 1, 2) to get an object. Then, only if the returned object is an instance of Cls, it calls obj.__init__(1, 2) with the same arguments. If __new__ returns something else, __init__ is skipped completely. Both methods receive the same arguments, so their signatures must be compatible.",
    "__new__ is a static method that receives the class as its first argument; Python handles this specially, so you do not write @staticmethod. It must return the new object, normally by calling super().__new__(cls). For immutable types such as str, int, tuple and frozenset the value is fixed at creation, so __init__ is too late to change it. That is the main real reason to override __new__.",
    "The singleton pattern with __new__ has a trap: __init__ still runs on every call, even when __new__ returns the old instance, so the state is silently reset each time. It is also not thread-safe without a lock. In Python a module is already a singleton, so a module-level object or a cached factory function is usually simpler and safer.",
    "Some tools create objects without calling __init__ at all. pickle and copy call cls.__new__ and then restore the attributes directly. So do not assume that __init__ has run for every live object of your class. In everyday code you almost never need __new__; a classmethod factory such as User.from_json(...) is clearer when you need other ways to build an object."
  ],
  iq: [
    { q: "This singleton returns the same object, but something is wrong. What does it print?", a: "__new__ returns the same instance each time, but Python still calls __init__ on it at every call. The second call overwrites the name. To avoid this, guard __init__ with a flag, or do not use __init__ for a singleton.", c: `
class Config:
    _inst = None
    def __new__(cls, *args):
        if cls._inst is None:
            cls._inst = super().__new__(cls)
        return cls._inst
    def __init__(self, name):
        self.name = name

a = Config("first")
b = Config("second")
print(a is b, a.name)    # True second
` },
    { q: "What happens if __new__ returns an object that is not an instance of the class?", a: "Python returns that object as the result of the call and does not call __init__. __init__ is only called when the object from __new__ is an instance of the class (or a subclass).", c: `
class A:
    def __new__(cls):
        return 42
    def __init__(self):
        print("init runs")

x = A()
print(x)      # 42   (and 'init runs' is never printed)
` },
    { q: "Why does this tuple subclass fail, even though __init__ accepts two arguments?", a: "The arguments go to __new__ first, and tuple.__new__ accepts only one iterable argument, so it raises TypeError before __init__ is reached. A tuple is immutable, so its content must be given in __new__. Override __new__ and call super().__new__(cls, (x, y)).", c: `
class Point(tuple):
    def __init__(self, x, y): pass

try:
    Point(1, 2)
except TypeError:
    print("TypeError")    # TypeError

class Point2(tuple):
    def __new__(cls, x, y): return super().__new__(cls, (x, y))

print(Point2(1, 2))       # (1, 2)
` },
    { q: "Who calls __new__ and __init__, and can this be changed?", a: "The __call__ method of the metaclass (normally type.__call__) calls __new__ and then __init__. A custom metaclass can override __call__ to change this, for example to return a cached instance without running __init__ again. This is the cleanest way to write a real singleton or an instance cache." }
  ],
  tips: [
    "For a shared object, prefer a module-level instance or a factory function decorated with functools.cache, for example get_settings(). It is simple and easy to replace in tests.",
    "If you must write a singleton with __new__, protect creation with a threading.Lock and make sure __init__ does not reset the state on later calls.",
    "Use classmethod factories (from_dict, from_env, from_file) for alternative ways to build an object. Leave __new__ for immutable types.",
    "For small immutable value objects use @dataclass(frozen=True) or typing.NamedTuple instead of subclassing tuple by hand. Remember that unpickling skips __init__, so rebuild connections and locks in __setstate__."
  ]
});

EXTRA(5, "Metaclasses", {
  deep: [
    "A 'class' statement runs in clear steps. First Python chooses the metaclass: the explicit metaclass= argument, or the most specific metaclass of the base classes. Then it calls metaclass.__prepare__(name, bases) to get an empty namespace dictionary and runs the class body inside it. Finally it calls metaclass(name, bases, namespace), which runs the metaclass __new__ and __init__ and returns the finished class object.",
    "Inside type.__new__ two more hooks run: __set_name__ is called on every descriptor in the namespace, and __init_subclass__ is called on the parent class. After the class exists, the metaclass __call__ method controls what happens when you create an instance with Cls(). Methods defined on a metaclass are available on the class itself (Cls.method()) but not on instances of the class.",
    "A class can have only one metaclass, and it must be compatible with the metaclasses of all its bases. If you inherit from two classes whose metaclasses are not related, Python raises 'TypeError: metaclass conflict'. This often happens when you mix abc.ABC (metaclass ABCMeta) with a framework base class that has its own metaclass. The fix is a new metaclass that inherits from both.",
    "Most jobs people use metaclasses for can be done with simpler tools. __init_subclass__ handles registering and checking subclasses. A class decorator can add or change attributes after creation. __set_name__ tells a descriptor its attribute name. Use a real metaclass only when you need to change class creation itself: a custom namespace with __prepare__, a custom __call__, or operators that work on the class object. Enum, ABC and ORM models are examples of that."
  ],
  iq: [
    { q: "What is the type of an instance, of a class, and of type itself?", a: "The type of an instance is its class. The type of a normal class is 'type', because type is the default metaclass. The type of type is type itself; it is its own metaclass.", c: `
class A: pass

print(type(A()) is A)       # True
print(type(A) is type)      # True
print(type(type) is type)   # True
print(isinstance(A, type))  # True
` },
    { q: "How can you auto-register all subclasses without writing a metaclass?", a: "Use __init_subclass__ on the base class. Python calls it automatically each time a subclass is defined, and it is not called for the base class itself. It is easier to read and it does not cause metaclass conflicts.", c: `
registry = {}

class Plugin:
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        registry[cls.__name__.lower()] = cls

class CsvExport(Plugin): pass
class PdfExport(Plugin): pass
print(list(registry))    # ['csvexport', 'pdfexport']
` },
    { q: "What is a metaclass conflict?", a: "It is the TypeError raised when a class inherits from bases whose metaclasses are not in one inheritance line. Python cannot decide which metaclass should build the new class. You solve it by creating a metaclass that inherits from both metaclasses and using it explicitly.", c: `
class MetaA(type): pass
class MetaB(type): pass
class A(metaclass=MetaA): pass
class B(metaclass=MetaB): pass

try:
    class C(A, B): pass
except TypeError:
    print("metaclass conflict")   # metaclass conflict

class MetaAB(MetaA, MetaB): pass
class C(A, B, metaclass=MetaAB): pass
print(type(C).__name__)           # MetaAB
` },
    { q: "In a metaclass, what is the difference between __new__, __init__ and __call__?", a: "The metaclass __new__ and __init__ run once per class, when the class is defined: __new__ builds the class object and __init__ configures it. The metaclass __call__ runs every time you create an instance of that class, and it is the code that calls the class's own __new__ and __init__. So use __new__ to change the class and __call__ to change instance creation." }
  ],
  tips: [
    "Try __init_subclass__ first, a class decorator second, and a metaclass only if both are not enough.",
    "If your metaclass must work with abstract base classes, inherit it from abc.ABCMeta. This avoids the metaclass conflict when users mix in ABC.",
    "Use class keyword arguments for configuration. Write class User(Model, table='users') and read the value in __init_subclass__(cls, table=None, **kwargs); no metaclass is needed for this.",
    "Keep metaclass code very small and document it well. Type checkers and editors do not understand most metaclass magic; typing.dataclass_transform (3.11) can help them for dataclass-like frameworks."
  ]
});

EXTRA(5, "Protocols", {
  deep: [
    "A Protocol is checked by static tools such as mypy and pyright, not by Python itself. The checker compares the names and signatures of the methods in the protocol with the methods of the object you pass. The class does not need to inherit from the protocol or even know that it exists. At runtime a Protocol class does nothing by default.",
    "If you add @runtime_checkable, you can use isinstance(obj, MyProtocol). But this runtime check is weak: it only tests that attributes with the right names exist. It does not check the parameters, the return types, or even that the attribute is a method. It is also slower than a normal isinstance check. Without @runtime_checkable, isinstance with a protocol raises TypeError.",
    "Compare this with an abstract base class (ABC). An ABC is nominal: a class must inherit from it (or be registered), and Python refuses to create an instance if an abstract method is missing. An ABC can also hold shared code. A Protocol is structural: it fits classes you do not own, such as third-party or standard-library classes, and it is defined by the code that uses the object, not by the code that implements it.",
    "Good protocols are small, often one or two methods. The standard library already has many: Iterable, Sized, Hashable and the Supports... types such as SupportsInt work the same way. A protocol can also declare attributes and properties, not only methods. Choose an ABC instead when you need shared implementation or a hard runtime guarantee that subclasses are complete."
  ],
  iq: [
    { q: "A class has a send method with the wrong parameters. Does isinstance with a runtime_checkable protocol return True or False?", a: "True. The runtime check only looks for an attribute named 'send'. It does not compare signatures or types. Only a static type checker would report that this class does not really match the protocol.", c: `
from typing import Protocol, runtime_checkable

@runtime_checkable
class Sender(Protocol):
    def send(self, message: str) -> None: ...

class Wrong:
    def send(self): return 1       # wrong signature

print(isinstance(Wrong(), Sender))   # True
` },
    { q: "What happens if you call isinstance with a Protocol that is not marked runtime_checkable?", a: "Python raises TypeError. Protocols are meant for static checking, and runtime checks must be switched on explicitly with the @runtime_checkable decorator.", c: `
from typing import Protocol

class Closer(Protocol):
    def close(self) -> None: ...

class File:
    def close(self) -> None: pass

try:
    isinstance(File(), Closer)
except TypeError:
    print("TypeError")    # TypeError
` },
    { q: "When do you choose a Protocol and when an ABC?", a: "Choose a Protocol when you only need to describe 'what shape I accept', especially for classes you cannot change or for test fakes. Choose an ABC when you own the class family, want to share code in the base class, or want Python to refuse incomplete subclasses at runtime. Protocol errors appear in the type checker; ABC errors appear when the object is created." },
    { q: "If you pass an object that does not match the Protocol, does the program fail at the function call?", a: "No. Python does not check type hints when the program runs. The call succeeds, and the program fails later with AttributeError at the line that uses the missing method. Only mypy or pyright report the mismatch, so a Protocol is useful only if a type checker runs in your project." }
  ],
  tips: [
    "Define the protocol next to the function that needs it (the consumer side), not next to the implementations. Each consumer asks only for the methods it really uses.",
    "Keep protocols small. One method like 'send' or 'read' is ideal; large protocols are hard to satisfy and hard to fake in tests.",
    "Use protocols to write simple fake objects for tests instead of patching. A small FakeSender class with a send method is clearer than a mock.",
    "Before writing your own, check collections.abc and typing: Iterable, Mapping, Sized and Callable cover many cases. And run mypy or pyright in CI, otherwise protocols are only comments."
  ]
});

EXTRA(5, "Generics", {
  deep: [
    "Generic type information exists only for type checkers. At runtime Repository[str]() creates a normal Repository object, and nothing stops you from adding an int. This is called type erasure. Python keeps a small alias object for Repository[str], but it does not check values against it. You also cannot use a parameterised type in isinstance: isinstance(x, list[int]) raises TypeError.",
    "A type variable can be limited in two ways. A bound (T: Animal in 3.12 syntax, or TypeVar('T', bound=Animal)) means 'Animal or any subclass', and the checker keeps the exact subclass. Constraints (T: (int, str)) mean 'exactly one of these types'. A type variable is useful only when it appears at least twice, for example in a parameter and in the return type, because its job is to link those places together.",
    "Variance is a common interview topic. list[Dog] is not accepted where list[Animal] is expected, even though Dog is an Animal. The reason is that the function could append a Cat to the list, and the caller would then have a Cat inside a list of dogs. list is 'invariant'. Read-only types such as Sequence[Dog] and Iterable[Dog] are 'covariant', so they are accepted as Sequence[Animal].",
    "There are two syntaxes. The old one works on all versions: T = TypeVar('T') and class Box(Generic[T]). The new one from Python 3.12 (PEP 695) is class Box[T] and def first[T](...); it needs no import and the checker works out the variance for you. Python 3.13 added default values for type parameters. Do not make a class generic if it is only ever used with one type; it just adds noise."
  ],
  iq: [
    { q: "Does Box[int]('text') raise an error at runtime?", a: "No. Type parameters are not enforced when the program runs. Box[int] is only information for the type checker, and the created object is a plain Box. Only mypy or pyright report the wrong argument.", c: `
from typing import Generic, TypeVar

T = TypeVar("T")

class Box(Generic[T]):
    def __init__(self, item: T): self.item = item

b = Box[int]("not an int")     # no error at runtime
print(b.item)                  # not an int
print(type(b).__name__)        # Box
` },
    { q: "Can you use list[int] with isinstance, or to convert values?", a: "No to both. isinstance with a parameterised generic raises TypeError, because Python would have to check every element. Calling list[int](...) works, but it just builds a normal list and does not convert or check the items.", c: `
try:
    isinstance([1, 2], list[int])
except TypeError:
    print("TypeError")       # TypeError

print(list[int]("ab"))       # ['a', 'b']
` },
    { q: "A function takes animals: list[Animal]. Why does the type checker reject a list[Dog]?", a: "Because list is mutable, so it is invariant. The function is allowed to append a Cat to a list[Animal], which would break the caller's list of dogs. If the function only reads, declare the parameter as Sequence[Animal] or Iterable[Animal]; these are covariant and accept list[Dog]." },
    { q: "What is the difference between a bound TypeVar and a constrained TypeVar?", a: "A bound sets an upper limit: T can be the bound type or any subclass, and the checker remembers the exact subclass. Constraints give a fixed list: T must be exactly one of the listed types, and a subclass is treated as the listed parent type. Use a bound in most cases; constraints are for cases like 'str or bytes, but never mixed'." }
  ],
  tips: [
    "Accept abstract types in parameters (Iterable[T], Sequence[T], Mapping[K, V]) and return concrete types (list[T], dict[K, V]). This makes functions easy to call and avoids variance errors.",
    "If the project requires Python 3.12 or newer, use the class Box[T] syntax. If you must support older versions, keep TypeVar and Generic.",
    "For methods that return 'the same class as self', use typing.Self (3.11) instead of a TypeVar.",
    "Bind a type variable to a Protocol when you need 'any type that has this method', for example T bound to a SupportsLessThan protocol for a sorting helper."
  ]
});

EXTRA(5, "Advanced typing", {
  deep: [
    "Type hints are stored on functions and classes in __annotations__, and Python itself ignores them at runtime. Nothing is checked or converted when a function is called. Static checkers (mypy, pyright) read the hints without running the code. Some libraries read them at runtime on purpose: dataclasses, pydantic and FastAPI use the hints to build classes, validate data and generate documentation. In Python 3.14 annotations are evaluated lazily (PEP 649), so forward references work without quotes.",
    "Several names are often misunderstood. Optional[int] means 'int or None' (the same as int | None); it does not make the argument optional, only a default value does that. Final and Literal are rules for the checker only; Python will still let you reassign or pass another value. A TypedDict is a normal dict at runtime with no validation. typing.cast() does nothing at runtime; it only tells the checker to trust you.",
    "The more advanced tools solve specific problems. Annotated[T, extra] attaches metadata that libraries can read, which is how FastAPI declares Query and Depends. ParamSpec lets a decorator keep the exact parameters of the function it wraps. @overload gives the checker several signatures for one real implementation. TypeGuard (3.10) and TypeIs (3.13) let your own function narrow a type like isinstance does. Protocol and Self cover structural types and fluent methods.",
    "Know the difference between Any and object. Any switches checking off: everything is allowed on it, and it spreads silently through your code. object is the safe 'unknown' type: you must narrow it with isinstance before you use it. Do not chase perfect types for every dynamic trick; when the types become harder to read than the code, simplify the code or accept a small, documented 'type: ignore'."
  ],
  iq: [
    { q: "Does Optional[int] on a parameter mean the caller can leave it out?", a: "No. Optional[int] only describes the allowed values: an int or None. The parameter is still required unless you give it a default value such as '= None'.", c: `
from typing import Optional

def f(x: Optional[int]): return x

try:
    f()
except TypeError:
    print("x is still required")    # x is still required

print(f(None))                      # None
` },
    { q: "Do Final and Literal stop wrong values at runtime?", a: "No. They are checked only by static type checkers. Python runs the code without any error, so a project without mypy or pyright gets no protection from them.", c: `
from typing import Final, Literal

MAX: Final = 3
MAX = 10                      # type checker error, but Python allows it

def set_mode(m: Literal["r", "w"]): return m

print(MAX, set_mode("zzz"))   # 10 zzz
` },
    { q: "Does a TypedDict validate its keys and value types when you create it?", a: "No. At runtime a TypedDict is just a plain dict, and calling the class is the same as calling dict(). Wrong types and extra keys are accepted. Use pydantic or manual checks when the data comes from outside.", c: `
from typing import TypedDict

class User(TypedDict):
    id: int

u = User(id="abc", extra=1)
print(type(u) is dict)    # True
print(u)                  # {'id': 'abc', 'extra': 1}
` },
    { q: "What is the difference between Any and object as a type hint?", a: "Any tells the checker to stop checking: you can call any method on it and assign it to anything. object means 'any value, but I know nothing about it', so the checker forces you to narrow it with isinstance before use. Use object (or a Protocol) for safe unknown values and keep Any for real escape cases." }
  ],
  tips: [
    "Run mypy or pyright in CI and in pre-commit. Type hints that no tool checks slowly become wrong and then mislead readers.",
    "Validate data at the borders of your program (HTTP requests, files, environment variables) with pydantic or similar. Type hints alone do not validate anything at runtime.",
    "Write 'int | None' instead of Optional[int] on Python 3.10+, and always handle the None case before using the value.",
    "When you must silence the checker, use a specific code such as '# type: ignore[arg-type]' and turn on warn_unused_ignores, so old ignores are found and removed."
  ]
});

EXTRA(5, "Callable objects", {
  deep: [
    "The call obj(args) is translated by Python into type(obj).__call__(obj, args). The lookup is done on the type, not on the instance. So adding a __call__ attribute to a single instance does not make it callable; the method must be defined on the class. This is the same rule that all special methods follow.",
    "A class is callable because its metaclass, type, defines __call__; that method creates the instance by calling __new__ and __init__. callable(x) only checks that the type of x has a __call__ method. A True result does not promise that your call will succeed with the arguments you pass.",
    "A callable instance, a closure and functools.partial can all carry state into a call. The differences matter in real projects. An instance has named attributes you can read, change and test, and it can have extra methods such as reset(). An instance of a module-level class can be pickled, so it works with multiprocessing; a lambda or a nested function cannot be pickled.",
    "Functions are objects too. They have attributes like __name__, __defaults__, __closure__ and their own __dict__, and a bound method is a small callable object that stores 'self' and the function. Do not add __call__ to a class that has several equally important methods, because the reader cannot guess what calling the object does. If there is no state to keep, a plain function is the right tool."
  ],
  iq: [
    { q: "You add __call__ to one instance. Is the instance callable now?", a: "No. Python looks for __call__ on the class of the object, not in the instance dictionary. callable() returns False and calling the object raises TypeError. Define __call__ in the class instead.", c: `
class A: pass

a = A()
a.__call__ = lambda: "hi"
print(callable(a))       # False
try:
    a()
except TypeError:
    print("TypeError")   # TypeError
` },
    { q: "Which of these are callable: a class, an instance, a bound method, a built-in function?", a: "A class is callable (calling it creates an instance). An instance is callable only if its class defines __call__. Bound methods and built-in functions are callable.", c: `
class A:
    def m(self): pass

print(callable(A), callable(A()), callable(A().m), callable(len))
# True False True True
` },
    { q: "Why would you use a class with __call__ instead of a closure when using multiprocessing?", a: "Arguments and functions sent to another process must be pickled. Pickle stores functions by their importable name, so lambdas and nested functions fail. An instance of a class defined at module level pickles fine, together with its state.", c: `
import pickle

class Adder:
    def __init__(self, n): self.n = n
    def __call__(self, x): return x + self.n

def make_adder(n):
    return lambda x: x + n

print(pickle.loads(pickle.dumps(Adder(2)))(5))   # 7
try:
    pickle.dumps(make_adder(2))
except Exception:
    print("cannot pickle a lambda")              # cannot pickle a lambda
` },
    { q: "What exactly happens when you call a class, for example User('anu')?", a: "Python calls type.__call__(User, 'anu'), because type is the class of User. That method calls User.__new__ to create the object and then User.__init__ to fill it, and returns the object. So creating an instance is just one more use of the __call__ protocol." }
  ],
  tips: [
    "Type a callback parameter as Callable[[int], str]. If the callback needs keyword arguments or attributes, describe it with a Protocol that has a __call__ method.",
    "Use functools.partial instead of a lambda when you create callbacks in a loop. A lambda reads the loop variable later (late binding); partial stores the value now.",
    "For work sent to a ProcessPoolExecutor, use module-level functions or instances of module-level classes, never lambdas or nested functions.",
    "Give callable objects a good __repr__ that shows their state. It makes logs and debugging of handler lists and pipelines much easier."
  ]
});

EXTRA(5, "Dynamic class creation", {
  deep: [
    "A 'class' statement does three things: it runs the class body as code and collects the names in a dictionary, it picks the metaclass, and it calls metaclass(name, bases, dict). Calling type(name, bases, dict) yourself does the last step directly. Functions in the dictionary become methods in the normal way, because functions are descriptors. There is no difference between a class made by a statement and one made by a call.",
    "Some details are easy to miss. The first argument is the class's own __name__; it has no link to the variable you assign the class to. If they are different, error messages are confusing and pickle fails, because pickle finds a class by module name plus class name. Also, type() does not call __prepare__. When base classes use a custom metaclass, types.new_class() is the function that follows the full class-statement protocol.",
    "Everything in the dictionary becomes a class attribute, shared by all instances. A mutable value such as a list in that dictionary is one shared list, the same trap as in a normal class body. If you want per-instance fields, generate an __init__ function, or use dataclasses.make_dataclass, which builds __init__, __repr__ and __eq__ for you.",
    "Dynamic classes have costs. Editors, type checkers and code search cannot see them, so autocomplete and refactoring do not work. A class object is heavy (it uses kilobytes of memory and is slow to create), so build classes once at startup and cache them, never per request. Often a plain dict, a dataclass or a ready helper (namedtuple, Enum('Color', ...), pydantic.create_model) is the better answer."
  ],
  iq: [
    { q: "What does type() do with one argument and with three arguments?", a: "With one argument it returns the type of an object. With three arguments (name, bases, namespace) it creates a new class. Note that the name inside the class comes from the first argument, not from the variable on the left.", c: `
A = type("B", (), {"x": 1})
print(A.__name__, A().x)     # B 1
print(type(A) is type)       # True
` },
    { q: "A class is created with type('Cart', (), {'items': []}). What is the trap?", a: "The list is a class attribute, so every instance shares the same list. Appending through one instance changes it for all. Per-instance data must be created in __init__.", c: `
Cart = type("Cart", (), {"items": []})
a, b = Cart(), Cart()
a.items.append("pen")
print(b.items)      # ['pen']
` },
    { q: "Why can an instance of a dynamically created class fail to pickle?", a: "Pickle saves only the module name and class name, then imports the class by that name when loading. If the class name ('Pt') is different from the variable name ('Point'), or the class is created inside a function, the lookup fails. Give the class the same name as the module-level variable.", c: `
import pickle

Point = type("Pt", (), {})
try:
    pickle.dumps(Point())
except pickle.PicklingError:
    print("PicklingError")    # PicklingError

Point = type("Point", (), {})
print(len(pickle.dumps(Point())) > 0)   # True
` },
    { q: "Can you add a method to a class after it has been created? Do existing instances get it?", a: "Yes. A class is a normal mutable object, so setattr(Cls, 'name', function) or Cls.name = function works at any time. Existing instances see the new method immediately, because method lookup goes to the class at the moment of the call. This is how monkey patching works, and it should be used with care." }
  ],
  tips: [
    "Use the same string for the class name and the variable name, and create the class at module level. This keeps pickling, logging and error messages working.",
    "Cache generated classes in a dict keyed by their specification, so the same class object is reused. Creating classes repeatedly is slow and leaks memory.",
    "Prefer the ready builders: dataclasses.make_dataclass, typing.NamedTuple or collections.namedtuple, the Enum functional API, and pydantic.create_model.",
    "When field names come from outside (JSON schema, database columns), check each one with str.isidentifier() and keyword.iskeyword() before using it, and never build classes with exec on untrusted text."
  ]
});

EXTRA(5, "Serialization", {
  deep: [
    "Choosing a format is a trade-off between a few questions. Is it text or binary? Can humans read it? Does it need a schema? Can other languages read it? Is it safe to load data from strangers? JSON is readable and universal but has few types. pickle handles almost any Python object but is Python-only and unsafe. MessagePack is like binary JSON, smaller and faster. Protocol Buffers and Avro need a schema and give small, typed, versioned messages.",
    "Serialized data usually lives longer than the code that wrote it. Old files, cache entries and queue messages are read by new code, and during a deploy new messages are read by old code. So formats must change carefully: add new fields with default values, never rename or reuse a field for a new meaning, and make readers ignore fields they do not know. This is called backward and forward compatibility.",
    "A round trip is often not exact. With JSON, a tuple comes back as a list, integer dictionary keys come back as strings, and datetime, Decimal, set and bytes cannot be written at all without a conversion you choose. JSON also cannot store an object that refers to itself; json.dumps raises ValueError for circular references. Always decide and document how dates, money and binary data are represented.",
    "Deserialization is a trust border. Data from a network, a file upload or a shared cache can be wrong or hostile, so validate its shape and limit its size before using it. Never use pickle for such data. Note also that dataclasses.asdict() makes a deep copy of everything, which is slow for large objects, and that it gives you dicts back, not objects: you need your own code or a library to rebuild nested objects."
  ],
  iq: [
    { q: "Is json.loads(json.dumps(data)) always equal to data?", a: "No. JSON has no tuple type and its object keys must be strings. Tuples become lists and integer keys become string keys, so the result is a different structure.", c: `
import json

data = {1: (1, 2), "ok": True}
back = json.loads(json.dumps(data))
print(back)            # {'1': [1, 2], 'ok': True}
print(back == data)    # False
` },
    { q: "How do you serialize a datetime to JSON?", a: "json.dumps raises TypeError because JSON has no date type. You pass a 'default' function that converts unknown objects, or convert the value yourself first. The reader must convert the string back; JSON will not do it.", c: `
import json
from datetime import datetime

d = {"at": datetime(2025, 1, 2, 3, 4, 5)}
try:
    json.dumps(d)
except TypeError:
    print("TypeError")                              # TypeError

print(json.dumps(d, default=lambda o: o.isoformat()))
# {"at": "2025-01-02T03:04:05"}
` },
    { q: "When would you choose JSON, pickle, or Protocol Buffers?", a: "JSON for public APIs, config and anything humans or other languages must read. pickle only for short-lived data that the same trusted Python program writes and reads, such as a local cache or multiprocessing. Protocol Buffers (or Avro) for high-volume internal services where size, speed and strict schemas with versioning matter." },
    { q: "You need to add a field to objects that are already stored in a cache or queue. How do you avoid breaking things?", a: "Make the new field optional with a default, so old data without the field still loads. Deploy readers that understand the new field before writers start sending it, and make readers ignore unknown fields. Do not rename or remove a field in the same step; do that later when no old data remains." }
  ],
  tips: [
    "Send datetimes as ISO 8601 strings in UTC (value.isoformat()) and money as strings or integer cents, never as float.",
    "Use pydantic models (model_validate_json and model_dump_json) at API and file borders. You get parsing, validation and nested objects in one step.",
    "When JSON speed matters, switch to orjson or msgspec; they are several times faster than the standard json module.",
    "Put a 'version' field in data you store for a long time (files, cache, queue messages), so new code can recognise and convert old shapes."
  ]
});

EXTRA(5, "Pickle", {
  deep: [
    "A pickle is not just data; it is a small program for a simple stack machine. pickle.load runs this program step by step to rebuild the objects. Classes and functions are saved 'by reference': only the module name and the qualified name are written, not the code. When loading, pickle imports that module and looks up the name. So the class must exist at the same import path in the loading program, and renaming or moving it breaks old pickles.",
    "For a normal instance, pickle saves a reference to the class plus the instance __dict__ (or whatever __getstate__ returns). On load it creates the object with cls.__new__, without calling __init__, and then restores the attributes or calls __setstate__. An object can also define __reduce__, which says 'to rebuild me, call this function with these arguments'. That is the security hole: the function can be os.system, so loading a pickle can run any command.",
    "Many things cannot be pickled: lambdas, nested functions and local classes (they have no importable name), open files, sockets, database connections, locks, threads and generators. If your object holds one of these, define __getstate__ to remove it from the saved state and __setstate__ to create it again after loading.",
    "There are several protocol versions. The default was protocol 4 from Python 3.8 and is protocol 5 from Python 3.14; older Python versions cannot read newer protocols. Pickle is a bad choice for long-term storage and for data shared between different programs or teams. Use JSON or a schema format for exchange, safetensors or similar for ML weights, and keep pickle for short-lived, trusted, same-code use such as multiprocessing and local caches."
  ],
  iq: [
    { q: "Why is it dangerous to unpickle data from an untrusted source?", a: "A pickle can tell the loader to call any importable function with any arguments, through __reduce__. An attacker can make it call os.system or similar, so code runs during pickle.loads, before you even look at the result. This harmless example calls print to show the idea.", c: `
import pickle

class Evil:
    def __reduce__(self):
        return (print, ("code ran during load!",))

data = pickle.dumps(Evil())
obj = pickle.loads(data)      # prints: code ran during load!
print(obj)                    # None
` },
    { q: "Is __init__ called when an object is unpickled?", a: "No. Pickle creates the object with __new__ and then puts the saved attributes back directly. Any work that __init__ does, such as opening a connection or validating values, does not happen on load.", c: `
import pickle

class User:
    def __init__(self, name):
        print("init called")
        self.name = name

u = User("anu")                          # init called
u2 = pickle.loads(pickle.dumps(u))       # prints nothing
print(u2.name)                           # anu
` },
    { q: "How do you pickle an object that contains a lock or an open connection?", a: "Define __getstate__ to return a copy of the state without the unpicklable attribute, and __setstate__ to restore the state and create a fresh lock or connection. Without this, pickle.dumps raises TypeError.", c: `
import pickle, threading

class Cache:
    def __init__(self):
        self.data = {"a": 1}
        self.lock = threading.Lock()
    def __getstate__(self):
        state = self.__dict__.copy()
        del state["lock"]
        return state
    def __setstate__(self, state):
        self.__dict__.update(state)
        self.lock = threading.Lock()

c = pickle.loads(pickle.dumps(Cache()))
print(c.data, c.lock.locked())     # {'a': 1} False
` },
    { q: "Why can a lambda not be pickled, when a normal function can?", a: "Pickle does not save the code of a function. It saves only the module and name, and the loader imports the function by that name. A lambda or nested function has no name that can be imported from the module, so pickling fails. Libraries such as cloudpickle solve this by saving the code itself." }
  ],
  tips: [
    "Never call pickle.load on data from users, the network, or a cache or bucket that other systems can write to. For PyTorch models use torch.load(..., weights_only=True) or the safetensors format.",
    "If multiprocessing fails with 'Can't pickle', move the function or class to module top level and remove lambdas from the arguments.",
    "Do not use pickle for data that must survive a code change. If you must, save a version number in __getstate__ and handle old versions in __setstate__.",
    "Use pickletools.dis(data) to inspect a suspicious pickle. It shows the instructions without running them."
  ]
});

EXTRA(5, "JSON", {
  deep: [
    "The json module maps types in a fixed way. dict becomes an object, list and tuple become an array, str becomes a string, int and float become a number, True and False become true and false, and None becomes null. Object keys must be strings: int, float, bool and None keys are converted to strings, and any other key type raises TypeError. Loading always gives back only dict, list, str, int, float, bool and None.",
    "There are several edge cases. By default Python writes NaN and Infinity, which are not valid JSON and are rejected by many other parsers; pass allow_nan=False to get an error instead. By default non-ASCII characters are escaped; pass ensure_ascii=False to keep readable text. Python integers have no size limit, but JavaScript loses precision above 2**53, so large IDs should be sent as strings. If a JSON object repeats a key, Python silently keeps the last value.",
    "You can extend both directions. For dumps, the 'default' argument is a function that is called for any object json cannot handle; it returns something json can handle. For loads, object_hook is called for every decoded object, and parse_float=Decimal keeps exact decimal numbers for money. The names are easy to mix up: dumps and loads work with strings, dump and load work with open files.",
    "JSON has no comments, no date type and no binary type (binary data is usually sent as base64 text). json.load reads the whole document into memory, so for very large data use JSON Lines (one JSON object per line) and process line by line. Loading JSON does not execute code, so it is far safer than pickle, but you should still limit the input size and validate the structure."
  ],
  iq: [
    { q: "What happens to dictionary keys that are not strings?", a: "int, float, bool and None keys are converted to strings, using the JSON spelling for true, false and null. After loading, the keys are strings, so data[2] no longer works; you need data['2']. Other key types such as tuples raise TypeError.", c: `
import json

print(json.dumps({2: "a", True: "b", None: "c"}))
# {"2": "a", "true": "b", "null": "c"}

try:
    json.dumps({(1, 2): "x"})
except TypeError:
    print("TypeError")     # TypeError
` },
    { q: "Does Python's json module always produce valid JSON?", a: "No. By default float('nan') and infinity are written as NaN and Infinity, which the JSON standard does not allow. Strict parsers in other languages reject them. Use allow_nan=False to make Python raise ValueError, and replace such values with null yourself.", c: `
import json

print(json.dumps({"x": float("nan")}))     # {"x": NaN}
try:
    json.dumps({"x": float("nan")}, allow_nan=False)
except ValueError:
    print("ValueError")                    # ValueError
` },
    { q: "Is str(my_dict) the same as json.dumps(my_dict)?", a: "No. str() gives the Python representation: single quotes, True, False and None. JSON needs double quotes and true, false and null. A JSON parser cannot read the output of str().", c: `
import json

d = {"ok": True, "v": None}
print(str(d))            # {'ok': True, 'v': None}
print(json.dumps(d))     # {"ok": true, "v": null}
` },
    { q: "What does json.loads do with duplicate keys, and how do you keep exact decimal numbers?", a: "With duplicate keys the last value wins, without any warning. Numbers with a decimal point become Python floats, which are not exact; pass parse_float=Decimal to get Decimal objects instead, which is important for money.", c: `
import json
from decimal import Decimal

print(json.loads('{"a": 1, "a": 2}'))                    # {'a': 2}
print(json.loads('{"p": 0.1}', parse_float=Decimal))     # {'p': Decimal('0.1')}
` }
  ],
  tips: [
    "Open JSON files with encoding='utf-8' explicitly, and use ensure_ascii=False when the text is not English. The default file encoding on Windows is often not UTF-8.",
    "Handle extra types in one place with a 'default' function (datetime to isoformat, Decimal to str, set to list) instead of converting by hand all over the code.",
    "For big exports and logs use JSON Lines: write one json.dumps(obj) per line. You can then read and write a line at a time with constant memory.",
    "Send 64-bit IDs as strings in APIs used by JavaScript clients, and use orjson when JSON encoding shows up in your profiler."
  ]
});

EXTRA(5, "Itertools", {
  deep: [
    "Almost everything in itertools returns an iterator, not a list. Items are produced one at a time, only when asked for, by code written in C. This is why the functions are fast and use constant memory even for huge or endless input. The price is that an iterator can be read only once: after one pass it is empty, and it has no len() and no indexing.",
    "groupby has two famous traps. It only groups items that are next to each other, like the Unix 'uniq' command, so you must sort the data by the same key first if you want one group per key. And each group is a view on the same underlying iterator: when you move on to the next group, the previous group is no longer valid. Convert a group to a list immediately if you need it later.",
    "Some functions keep hidden memory. tee() copies an iterator but must store every item that one copy has read and another has not, so it can use a lot of memory if one copy runs far ahead; you also must not use the original iterator after tee. cycle() stores a copy of all items. count(), cycle() and repeat() are endless, so always limit them with islice(), takewhile() or zip().",
    "The combinatoric functions grow very fast: permutations of 10 items is over 3.6 million results, and product() multiplies the sizes of its inputs. Never wrap them in list() without thinking about the size. Other useful members are chain.from_iterable (flatten one level), pairwise (3.10), zip_longest and batched (3.12). Do not force itertools everywhere; a simple for loop or comprehension is often easier to read."
  ],
  iq: [
    { q: "What does groupby return when the data is not sorted by the key?", a: "It starts a new group every time the key changes, so the same key can appear several times. groupby only looks at neighbouring items. Sort the data with the same key function first, or use a defaultdict(list) if you do not need the order.", c: `
from itertools import groupby

data = ["apple", "avocado", "banana", "apricot"]
print([(k, list(g)) for k, g in groupby(data, key=lambda w: w[0])])
# [('a', ['apple', 'avocado']), ('b', ['banana']), ('a', ['apricot'])]
` },
    { q: "You store the result of groupby in a list and read the groups later. Why are the groups empty?", a: "Each group object reads from the same shared iterator. list(groupby(...)) moves through all the groups, and moving to the next group throws away the previous one. You must read each group (for example with list(g)) inside the loop, before going to the next one.", c: `
from itertools import groupby

groups = list(groupby([1, 1, 2, 2]))
print([(k, list(g)) for k, g in groups])
# [(1, []), (2, [])]

print([(k, list(g)) for k, g in groupby([1, 1, 2, 2])])
# [(1, [1, 1]), (2, [2, 2])]
` },
    { q: "What does this print? (iterators are consumed)", a: "islice takes items from the iterator and they are gone. The second islice continues where the first stopped. After sum() reads the rest, the iterator is empty, so a second sum() gives 0.", c: `
from itertools import islice

it = iter(range(10))
print(list(islice(it, 3)))    # [0, 1, 2]
print(list(islice(it, 3)))    # [3, 4, 5]
print(sum(it), sum(it))       # 30 0
` },
    { q: "What is the difference between product, permutations and combinations?", a: "product gives every pairing of items from several inputs (like nested loops). permutations gives every ordering of r items from one input, so (a, b) and (b, a) are both included. combinations gives every selection of r items where order does not matter, so only (a, b) appears. None of them repeat the same position unless you use combinations_with_replacement or product with repeat." }
  ],
  tips: [
    "Process large inputs in fixed-size chunks with itertools.batched (3.12+) for bulk database inserts or API calls. On older versions use a loop with islice.",
    "Flatten a list of lists with chain.from_iterable(lists). It is lazy and much faster than sum(lists, []).",
    "Before groupby, sort with the same key function. If you only need to collect items per key and order does not matter, defaultdict(list) is simpler and needs no sort.",
    "Use islice(generator, n) to take a safe sample from a large or endless generator in tests and debugging. For windows, chunking and more, check the more-itertools package before writing your own."
  ]
});

EXTRA(5, "Functools", {
  deep: [
    "lru_cache stores results in a dictionary whose key is built from the call arguments, so every argument must be hashable. The key depends on how you call the function: f(1, 2), f(1, y=2) and f(x=1, y=2) can be stored as different entries. With the default typed=False, 1 and 1.0 share one entry because they are equal and have the same hash. maxsize=128 is the default; when the cache is full, the least recently used entry is removed. functools.cache is the same as lru_cache(maxsize=None), with no limit.",
    "The cache returns the same object every time, not a copy. If the cached value is a list or dict and a caller changes it, every later caller gets the changed value. Other traps: there is no time limit, so data from a database or API stays stale until you call cache_clear(); exceptions are not cached, so a failing call runs again each time; and on an 'async def' function lru_cache stores the coroutine object, which can be awaited only once.",
    "Using lru_cache on a method is a known memory leak. The cache lives on the function and uses 'self' as part of the key, so it keeps a strong reference to every instance and they are never freed while the cache holds them. The cache is also shared by all instances. For a value computed once per object, use cached_property, which stores the result on the instance itself.",
    "The rest of the module is smaller but useful. partial freezes some arguments and returns a new callable; the values are captured immediately, so it has no late-binding problem. singledispatch picks an implementation by the type of the first argument. total_ordering fills in missing comparison methods. reduce folds a sequence into one value, but sum(), min(), any() or a plain loop is usually clearer. Never cache functions that depend on time, random numbers or changing external state."
  ],
  iq: [
    { q: "A cached function returns a list. A caller appends to it. What does the next caller get?", a: "The changed list. lru_cache returns the same object each time, not a copy, so a change made by one caller is visible to all later callers. Return immutable values such as tuples from cached functions, or copy the result before changing it.", c: `
from functools import lru_cache

@lru_cache
def get_tags():
    return ["a"]

get_tags().append("b")
print(get_tags())      # ['a', 'b']
` },
    { q: "What happens when you call an lru_cache function with a list argument?", a: "It raises TypeError, because the arguments are used as a dictionary key and a list is not hashable. Pass a tuple or frozenset instead, or cache on a simpler key such as an ID.", c: `
from functools import lru_cache

@lru_cache
def total(items): return sum(items)

print(total((1, 2, 3)))       # 6
try:
    total([1, 2, 3])
except TypeError:
    print("TypeError")        # TypeError
` },
    { q: "Do f(1, 2), f(1, y=2), f(x=1, y=2) and f(1) share one cache entry?", a: "No. The cache key is built from the arguments exactly as they were passed, so different call styles create separate entries, even when the result is the same. But f(1.0, 2) does hit the entry of f(1, 2), because 1 == 1.0 and typed is False by default.", c: `
from functools import lru_cache

@lru_cache
def f(x, y=2): return x + y

f(1, 2); f(1, y=2); f(x=1, y=2); f(1)
info = f.cache_info()
print(info.misses, info.hits)     # 4 0
f(1.0, 2)
print(f.cache_info().hits)        # 1
` },
    { q: "Why is @lru_cache on an instance method a problem?", a: "The cache is stored on the function, which belongs to the class, and 'self' is part of each key. So the cache holds a strong reference to every instance that ever called the method, and those objects cannot be garbage collected. Use cached_property for per-instance values, or cache a module-level function that takes an ID." }
  ],
  tips: [
    "In a long-running server always set a maxsize. An unlimited cache (functools.cache) keyed by user input is a slow memory leak.",
    "lru_cache has no expiry time. For data that changes, use cachetools.TTLCache or an external cache such as Redis.",
    "The pattern '@functools.cache def get_settings(): return Settings()' is a clean way to create one shared object lazily. In tests call get_settings.cache_clear() between cases.",
    "Check a cache with func.cache_info() before trusting it. A very low hit count means the cache only costs memory and should be removed."
  ]
});

EXTRA(5, "Collections", {
  deep: [
    "deque is built as a linked list of fixed-size blocks, so adding and removing at both ends is O(1). A list is fast only at the right end; list.pop(0) and list.insert(0, x) must move every item and are O(n). The price is that reading an item in the middle of a deque is O(n). deque(maxlen=N) drops items from the opposite end automatically when it is full, and append and popleft are safe to use from several threads.",
    "defaultdict calls its factory only when a missing key is read with square brackets, d[key]. That read also stores the new value in the dict. So just checking 'if d[key]' adds the key, which can grow the dict and can cause 'dictionary changed size during iteration'. d.get(key) and 'key in d' do not create anything. Counter behaves differently: a missing key returns 0 and nothing is stored. Counter subtraction with '-' also removes results that are zero or negative.",
    "Normal dicts keep insertion order since Python 3.7, so OrderedDict is rarely needed. It still has two special features: move_to_end() and popitem(last=False), which make it handy for a small LRU cache, and its equality check compares order too. namedtuple creates a tuple subclass: instances are immutable, light, and compare equal to a plain tuple with the same values, even to a different namedtuple type. Use _replace() to get a changed copy and _asdict() to convert.",
    "ChainMap does not copy anything; it keeps a list of the original dicts and searches them in order on each lookup, so later changes in those dicts are visible. Writes and deletes always go to the first dict only. One more class from the module is worth knowing: if you want your own dict-like class, inherit from UserDict, because the built-in dict's own methods such as update() do not call an overridden __setitem__."
  ],
  iq: [
    { q: "Does reading a missing key from a defaultdict change the dictionary?", a: "Yes, when you read with square brackets. The factory is called and the result is stored under that key. get() and 'in' do not do this. So a simple check like 'if d[key]' quietly adds keys.", c: `
from collections import defaultdict

d = defaultdict(list)
if d["x"]: pass
print(d.get("y"), "y" in d)    # None False
print(dict(d))                 # {'x': []}
` },
    { q: "What does Counter return for a missing key, and what happens with negative results?", a: "A missing key returns 0 and is not added to the Counter. The '-' operator keeps only positive counts, so a result of zero or less disappears. Use the subtract() method if you need to keep negative numbers.", c: `
from collections import Counter

c = Counter("banana")
print(c.most_common(2))               # [('a', 3), ('n', 2)]
print(c["z"], "z" in c)               # 0 False
print(Counter(a=1) - Counter(a=5))    # Counter()
` },
    { q: "Dicts are ordered now. Is there still a difference between dict and OrderedDict?", a: "Yes. Two normal dicts with the same items are equal in any order, but two OrderedDicts are equal only if the order is the same too. OrderedDict also has move_to_end() and popitem(last=False) for reordering.", c: `
from collections import OrderedDict

a = {"x": 1, "y": 2}
b = {"y": 2, "x": 1}
print(a == b)                              # True
print(OrderedDict(a) == OrderedDict(b))    # False
` },
    { q: "Is a namedtuple equal to a normal tuple, or to another namedtuple type with the same values?", a: "Yes to both. A namedtuple is a real tuple, and tuple equality only compares the values in order. Field names and the class are ignored. A dataclass does not have this problem: instances of different classes are never equal.", c: `
from collections import namedtuple

P = namedtuple("P", "x y")
Q = namedtuple("Q", "a b")
print(P(1, 2) == (1, 2), P(1, 2) == Q(1, 2))    # True True
` }
  ],
  tips: [
    "Use deque(maxlen=N) to keep 'the last N items': recent log lines, a sliding window of response times, an undo history.",
    "After you finish building a defaultdict, convert it with dict(d) or set d.default_factory = None before you return it. Then a later typo in a key raises KeyError instead of adding a key.",
    "Counter(items).most_common(10) is the standard one-line answer for 'top N' questions in interviews and in log analysis.",
    "For new record types prefer typing.NamedTuple or @dataclass(slots=True): you get type hints and defaults. Use a queue from the queue module, not a deque, when threads must wait for items."
  ]
});

EXTRA(5, "Reflection/introspection", {
  deep: [
    "Introspection works because objects carry their own data. An instance keeps its attributes in obj.__dict__ (vars(obj) returns it), a class keeps its methods and class attributes in its own __dict__, and __mro__ lists the parent classes in lookup order. dir(obj) collects names from all of these, but it is a helper for humans: a class can change it with __dir__, and it may miss dynamic attributes.",
    "getattr(obj, name) does the full normal lookup, the same as obj.name, so it runs properties, descriptors and __getattr__. hasattr(obj, name) simply calls getattr and returns False if AttributeError is raised. This means hasattr can run slow property code, and any other exception from the property passes through. If you need to look without running anything, use inspect.getattr_static.",
    "For type checks, type(x) is C is true only for that exact class, while isinstance(x, C) also accepts subclasses and classes registered with an abstract base class. isinstance is almost always what you want. The inspect module goes deeper: signature() reads parameters and defaults (this is how FastAPI, pytest and click understand your functions), iscoroutinefunction() tells async from sync, and getsource() returns the source text when the file is available.",
    "Reflection has costs. Access by name is slower than direct access. Code like getattr(obj, prefix + name) cannot be followed by editors, type checkers or a text search, so refactoring becomes risky. It is also a security risk: if the name comes from a user, getattr can reach private methods and special attributes such as __class__. Use reflection at the edges of a program (plugins, command dispatch, serializers), not in the core logic."
  ],
  iq: [
    { q: "Can hasattr() raise an exception or have side effects?", a: "Yes. hasattr calls getattr, so a property getter really runs. hasattr only catches AttributeError; any other exception from the property comes out of hasattr. A slow property is also executed fully just to answer True.", c: `
class A:
    @property
    def x(self):
        print("property ran")
        raise ValueError("boom")

try:
    hasattr(A(), "x")
except ValueError:
    print("hasattr raised ValueError")
# property ran
# hasattr raised ValueError
` },
    { q: "What is the difference between type(x) is int and isinstance(x, int)?", a: "type(x) is int is true only when x is exactly an int. isinstance also accepts subclasses. bool is a subclass of int, so True passes isinstance but not the exact type check. This matters when you validate input: True is accepted as a number by isinstance.", c: `
print(type(True) is int, isinstance(True, int))    # False True
print(True + True)                                 # 2
` },
    { q: "What is the difference between vars(obj) and dir(obj)?", a: "vars(obj) returns the instance __dict__: only the attributes stored on that one object. dir(obj) returns a list of names from the instance, its class and all parent classes. A class attribute is in dir() but not in vars().", c: `
class A:
    kind = "a"
    def __init__(self): self.x = 1

a = A()
print(vars(a))                                  # {'x': 1}
print("kind" in vars(a), "kind" in dir(a))      # False True
` },
    { q: "A web handler runs getattr(service, request_action)() where the action name comes from the user. What is wrong?", a: "The user can call any method on the object, including private helpers like _delete_all, and can reach special attributes. Never pass user input directly to getattr. Use an explicit dictionary of allowed actions, or at least check the name against a fixed list." }
  ],
  tips: [
    "For command or event dispatch, use an explicit dict such as {'export': handler.export}, or a fixed prefix (getattr(self, 'cmd_' + name, None)). Never use the raw user string as the attribute name.",
    "Use inspect.signature(func).bind(*args, **kwargs) to check that arguments fit a function before calling it. It raises a clear TypeError and is very useful in plugin systems.",
    "To accept both sync and async callbacks, call the function and then check inspect.isawaitable(result); await it only if it is awaitable.",
    "Keep reflection out of hot loops. Look the attribute up once with getattr, store the result in a local variable, and call that inside the loop."
  ]
});
