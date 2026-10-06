EXTRA(6, "Processes vs threads", {
  deep: [
    "For the operating system, a process is a container: it has its own memory space, its own open files and its own process ID. A thread is a path of execution inside that container. All threads of a process see the same global variables and objects, but each thread has its own call stack. The OS scheduler switches between threads whenever it wants (this is called preemptive), so a thread can be paused at any point in its code.",
    "Shared memory is the main difference in daily work. Threads can pass data by simply using the same object, which is easy but opens the door to race conditions. Processes share nothing by default: data must be sent through a pipe or queue, which means it is pickled, copied and unpickled. If a child process changes a global variable, the parent does not see the change, because the child has its own copy.",
    "Cost and failure behaviour are also different. Starting a thread is very cheap. Starting a Python process means starting a new interpreter and importing your modules again, which takes much longer and uses tens of megabytes. On the other side, a hard crash (for example a segmentation fault in a C library) kills the whole process with all its threads, while other processes continue. An unhandled Python exception in a thread ends only that thread; the program goes on.",
    "How a new process is started matters. 'fork' copies the parent process and is fast, but it is unsafe when the parent already has threads. 'spawn' starts a fresh interpreter and imports your main module again; it is the default on Windows and macOS. 'forkserver' is the default on Linux since Python 3.14. In CPython the usual rule is: threads (or asyncio) for waiting on I/O, processes for heavy computing, because of the GIL."
  ],
  iq: [
    { q: "A thread and a child process both run a function that adds 1 to a global counter. What does the parent see?", a: "The thread shares the parent's memory, so its change is visible. The child process works on its own copy of the variable, so the parent's value does not change. To get data back from a process you must use a Queue, a Pipe, shared memory or a return value from a pool.", c: `
import multiprocessing, threading

counter = 0

def work():
    global counter
    counter += 1

if __name__ == "__main__":
    t = threading.Thread(target=work); t.start(); t.join()
    print(counter)      # 1   (the thread changed our variable)
    p = multiprocessing.Process(target=work); p.start(); p.join()
    print(counter)      # 1   (the process changed only its own copy)
` },
    { q: "A thread raises an exception that nobody catches. Does the program stop?", a: "No. Only that thread ends. Python prints the traceback to stderr through threading.excepthook, and the main thread continues. This is dangerous because a worker can die silently while the program looks healthy; use futures or catch and report errors inside the thread.", c: `
import threading

def bad(): raise ValueError("boom")

t = threading.Thread(target=bad)
t.start(); t.join()            # a traceback is printed to stderr
print("main still alive")      # main still alive
` },
    { q: "Why does multiprocessing code need the line if __name__ == '__main__': ?", a: "With the spawn and forkserver start methods, each child starts a new interpreter and imports your main module again. Without the guard, the import would run the code that creates processes again, and Python stops this with a RuntimeError. With the guard, the start code runs only in the original process." },
    { q: "What is the difference between a daemon thread and a normal thread?", a: "The program waits for all normal threads to finish before it exits. Daemon threads do not keep the program alive: when the main thread and all normal threads are done, daemon threads are stopped abruptly, without running finally blocks. So never use a daemon thread for work that must finish cleanly, such as writing a file." }
  ],
  tips: [
    "Use ThreadPoolExecutor and ProcessPoolExecutor instead of creating Thread and Process objects by hand. You get return values, exceptions and clean shutdown for free.",
    "Do not share state between processes if you can avoid it. Send small messages (IDs, file paths) through queues and let each worker load its own data.",
    "Web servers already use this model: gunicorn or uvicorn start several worker processes, and each one handles many requests with threads or asyncio. Scale by adding workers, not by adding your own processes inside a request.",
    "Never fork a process after you have started threads. If your code must behave the same on Linux, macOS and Windows, call multiprocessing.set_start_method('spawn') once at startup."
  ]
});

EXTRA(6, "GIL", {
  deep: [
    "The GIL protects the inside of the interpreter, not your program. CPython counts references to every object, and those counters, the memory allocator and the internal structure of dicts and lists would be corrupted if two threads changed them at the same moment. The GIL makes sure only one thread touches them at a time. It gives no protection to your own multi-step logic.",
    "A running thread is asked to give up the GIL after a short time, 5 milliseconds by default (sys.getswitchinterval()). The switch can happen between any two bytecode instructions. A line like counter += 1 is several instructions (read, add, store), so another thread can run in the middle and one update is lost. This is why you still need locks in threaded Python code.",
    "The GIL is released whenever a thread waits: reading a socket or file, time.sleep(), waiting for a lock. C extensions can also release it during long work that does not touch Python objects; NumPy, zlib and hashlib do this for large data. So threads do help for I/O, and they can even help for number-heavy code when the time is spent inside such C libraries.",
    "The GIL belongs to CPython, not to the Python language. PEP 703 added a free-threaded build without the GIL: experimental in Python 3.13 and officially supported in 3.14, but still a separate, optional build and not the default. It is somewhat slower for single-threaded code, and C extensions must support it. Another path is sub-interpreters, each with its own GIL (3.12), which Python 3.14 exposes through the concurrent.interpreters module and InterpreterPoolExecutor."
  ],
  iq: [
    { q: "The GIL allows only one thread at a time. Does that make counter += 1 thread-safe?", a: "No. The GIL can pass to another thread between the read and the write of counter. Both threads can read the same old value and both write old value + 1, so one increment is lost. The code below replays that order of steps in a single thread to show the result.", c: `
counter = 0
a = counter        # thread A reads 0
b = counter        # the switch happens here: thread B also reads 0
counter = a + 1    # A writes 1
counter = b + 1    # B writes 1
print(counter)     # 1, not 2: one update is lost
` },
    { q: "How often can Python switch between threads, and can you see the setting?", a: "A thread that holds the GIL is asked to release it after the switch interval, which is 0.005 seconds by default. You can read it with sys.getswitchinterval() and change it with sys.setswitchinterval(). Changing it does not remove race conditions; it only changes how often they appear.", c: `
import sys
print(sys.getswitchinterval())     # 0.005
` },
    { q: "If the GIL blocks parallel execution, why do threads make downloading 100 files faster?", a: "A thread that waits for the network releases the GIL. While one thread waits for bytes to arrive, other threads can run and start their own requests. Almost all the time is waiting, not Python code, so the downloads overlap." },
    { q: "How can a Python program use all CPU cores?", a: "Use several processes (multiprocessing or ProcessPoolExecutor), because each process has its own interpreter and its own GIL. Or move the heavy work into C extensions that release the GIL, such as NumPy. Newer options are sub-interpreters and the free-threaded build of Python 3.13 and 3.14, where threads really run in parallel." }
  ],
  tips: [
    "Profile before you blame the GIL. If the time is spent in I/O or inside NumPy or pandas, threads already work well and processes will only add overhead.",
    "For CPU-heavy pure Python code use ProcessPoolExecutor, and keep the data sent to each task small.",
    "Do not write code that depends on 'the GIL makes this safe'. Protect shared data with a Lock. This also keeps your code correct on the free-threaded build.",
    "Before moving a service to free-threaded Python, check that all your C extension packages support it. You can check at runtime with sys._is_gil_enabled() (3.13+)."
  ]
});

EXTRA(6, "CPU-bound vs I/O-bound", {
  deep: [
    "Do not guess which kind of task you have; measure it. If one CPU core is at 100 percent while the task runs, it is CPU-bound. If the CPU is almost idle but the task still takes a long time, it is waiting on I/O. In code you can compare time.perf_counter() (real time) with time.process_time() (CPU time used): a big difference means waiting. Profilers such as cProfile and py-spy show exactly where the time goes.",
    "The difference matters because of what a thread does while it waits. During I/O the thread is asleep inside the operating system and has released the GIL, so one hundred waiting threads cost almost nothing and other threads can run. CPU work in pure Python needs the GIL for every instruction, so extra threads only take turns and add switching cost.",
    "Real programs are usually mixed: download a file (I/O), then parse or resize it (CPU). Split the two parts. A common design is asyncio or threads for the I/O part and a process pool for the CPU part, connected with loop.run_in_executor(). One important rule: CPU-heavy code inside an 'async def' function blocks the event loop exactly like a blocking call does, because it never reaches an await.",
    "Both sides have limits. More processes than CPU cores does not help CPU work. Each task sent to a process must be pickled and copied, so for many tiny tasks the overhead is bigger than the gain. I/O concurrency is limited by the other side: database connection limits, API rate limits, open sockets. There is also a third case: code that spends its time inside C libraries that release the GIL (NumPy, compression, hashing) can use threads even though it looks CPU-bound."
  ],
  iq: [
    { q: "A script is slow. How do you decide between threads, asyncio and multiprocessing?", a: "First measure where the time goes. If it is waiting (network, disk, database), use asyncio when you have async libraries and many connections, or threads when the libraries are blocking. If it is computing in Python, use processes. If both, use an I/O model for the waiting part and a process pool for the computing part." },
    { q: "How can you show in code that a task is waiting and not computing?", a: "Compare wall-clock time with CPU time. time.perf_counter() counts real time including waiting. time.process_time() counts only the time the CPU worked for this process. For a waiting task the CPU time stays near zero.", c: `
import time

w, c = time.perf_counter(), time.process_time()
time.sleep(0.5)                              # stands in for a network wait
wall = time.perf_counter() - w
cpu = time.process_time() - c
print(wall >= 0.4, cpu < 0.2)                # True True
` },
    { q: "A CPU-heavy function is called inside a coroutine, with another coroutine running in gather. What is the order of execution?", a: "The heavy function has no await, so the event loop cannot switch away from it. The other coroutine cannot even start until the heavy one is completely finished. In a server this means every other request is frozen for that time.", c: `
import asyncio

order = []

async def cpu_heavy():
    order.append("cpu start")
    sum(i * i for i in range(200_000))    # no await: nothing else can run
    order.append("cpu end")

async def quick():
    order.append("quick")

async def main():
    await asyncio.gather(cpu_heavy(), quick())
    print(order)       # ['cpu start', 'cpu end', 'quick']

asyncio.run(main())
` },
    { q: "Is it a good idea to use 64 processes for CPU-bound work on an 8-core machine?", a: "No. Only 8 can run at one moment, so the other 56 just wait, use memory, and force the OS to switch between them. For CPU-bound work use about one process per core. For I/O-bound work the number of threads or tasks can be much higher than the number of cores, because they mostly wait." }
  ],
  tips: [
    "Use py-spy (py-spy top or py-spy dump on a running process) or cProfile to see where time is spent before you add any concurrency.",
    "Size pools by the type of work: about os.cpu_count() workers for CPU work; for I/O work choose the number the other side can accept (database pool size, API rate limit).",
    "In an async web app, send CPU-heavy work to a process pool with run_in_executor, or to a background job system such as Celery, RQ or arq. Never compute for seconds inside a request coroutine.",
    "Before adding parallelism, try a better algorithm or a vectorised NumPy or pandas operation. A 50x gain from that is common; parallelism gives at most the number of cores."
  ]
});

EXTRA(6, "threading", {
  deep: [
    "Python threads are real operating system threads. The OS decides when each one runs and can pause a thread at any point. A new thread starts only when you call start(); calling run() directly just executes the function in the current thread, like a normal call. A Thread object can be started only once. join() waits for the thread to finish, and join(timeout) always returns None, so you must check is_alive() to know if the thread really ended.",
    "A Thread has no return value, and an exception inside it does not reach the code that started it. The traceback is printed by threading.excepthook and the thread simply ends. To get results or errors back you need a queue, a shared variable with a lock, or better, a ThreadPoolExecutor, whose futures carry both the result and the exception.",
    "You cannot kill a thread from outside. A thread stops when its function returns. The standard pattern is cooperative: share a threading.Event, let the worker check it regularly in its loop, and set it when you want the worker to stop. Blocking calls inside the thread need timeouts, or the thread will never get to the check. Daemon threads are stopped abruptly at program exit, in the middle of whatever they are doing.",
    "The module gives you tools for coordination: Lock and RLock, Event, Condition, Semaphore, Barrier and Timer, plus threading.local() for data that each thread should have separately, such as a database connection. Threads are not free: each one reserves memory for its stack, and thousands of threads put heavy load on the scheduler. For tens of thousands of connections asyncio is a better fit, and for CPU-heavy Python code threads do not help on the normal build."
  ],
  iq: [
    { q: "What is the difference between t.start() and t.run()?", a: "start() creates a new OS thread and that thread calls run(). Calling run() yourself does not create a thread; the target function runs in the current thread and blocks it. This is a common silent bug: the code works, but nothing is concurrent.", c: `
import threading

def who(): print(threading.current_thread().name)

t = threading.Thread(target=who, name="worker")
t.run()        # MainThread   (no new thread was created)

t = threading.Thread(target=who, name="worker")
t.start()      # worker
t.join()
` },
    { q: "Four threads each do counter += 1 100,000 times. Is the result always 400,000?", a: "Not without a lock. counter += 1 is read, add, store, and a thread switch between those steps loses an update, so the total can be lower and it changes from run to run and between Python versions. With a lock around the update the result is always correct.", c: `
import threading

counter = 0
lock = threading.Lock()

def add():
    global counter
    for _ in range(100_000):
        with lock:
            counter += 1

threads = [threading.Thread(target=add) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()
print(counter)     # 400000 (always, because of the lock)
` },
    { q: "Threads are created in a loop with a lambda as target. What do they see?", a: "A lambda does not copy the loop variable; it reads it when it runs. Here all threads start after the loop has finished, so all of them see the last value. Pass the value with args=(i,) so each thread gets its own copy.", c: `
import threading

out = []
threads = [threading.Thread(target=lambda: out.append(i)) for i in range(3)]
for t in threads: t.start()
for t in threads: t.join()
print(out)     # [2, 2, 2]   fix: Thread(target=out.append, args=(i,))
` },
    { q: "How do you stop a running thread, and how do you get its return value?", a: "There is no kill method. The thread must end by itself, so you give it a threading.Event to check and set that event when it should stop. A Thread also has no return value; use ThreadPoolExecutor.submit(), which returns a Future with result(), or put results on a queue.Queue." }
  ],
  tips: [
    "Prefer ThreadPoolExecutor to raw threads. It limits the number of threads, returns results, and re-raises worker exceptions when you call result().",
    "Give every blocking call in a thread a timeout (for example requests.get(url, timeout=10)). A thread stuck in a call without a timeout can never be stopped.",
    "Many client objects are not thread-safe. Use one database connection or HTTP session per thread (threading.local helps), or a client that is documented as thread-safe.",
    "Name your threads (name= or thread_name_prefix=) and put %(threadName)s in the logging format. It makes concurrent logs readable."
  ]
});

EXTRA(6, "multiprocessing", {
  deep: [
    "When you call pool.map(func, items), nothing is shared. The parent pickles a reference to the function and each argument, writes the bytes into a pipe, and a worker process reads and unpickles them. The worker runs the function and sends the pickled result back the same way. So the function must be importable by name (defined at module top level), and all arguments and results must be picklable. Large arguments are copied for every task, which can cost more than the work itself.",
    "The start method decides what a new process contains. With 'spawn' the child is a fresh interpreter that imports your main module again; every line at top level runs again, which is why the __main__ guard is required. With 'fork' the child is a copy of the parent's memory; it starts fast, but it also copies locks in whatever state they were, which can deadlock a program that uses threads. The defaults are spawn on Windows and macOS, and forkserver on Linux since Python 3.14 (before that, fork).",
    "Each process has its own globals, so changing a global in a worker does nothing in the parent. To share state you have several tools: Queue and Pipe for messages, Value and Array for simple shared numbers, shared_memory (3.8) for large buffers such as NumPy arrays, and Manager for shared dicts and lists (convenient but slow, because every access is a message to another process). For per-worker setup, such as opening a database connection or loading a model, use the pool's initializer function.",
    "Multiprocessing is the wrong tool for small, fast tasks, for I/O-bound work, and when memory is tight, because every worker holds its own copy of the data and of the interpreter. Workers can also die: if the OS kills a worker for using too much memory, the old multiprocessing.Pool can hang, while ProcessPoolExecutor raises BrokenProcessPool. Use chunksize to send many small items in one message, and maxtasksperchild to restart workers that leak memory."
  ],
  iq: [
    { q: "Why does pool.map(lambda x: x * 2, data) fail?", a: "The function must be sent to the worker process, and pickle sends functions by their module and name only. A lambda has no importable name, so pickling fails. Define a normal function at module level instead.", c: `
from multiprocessing import Pool

if __name__ == "__main__":
    with Pool(2) as pool:
        try:
            pool.map(lambda x: x * 2, [1, 2, 3])
        except Exception as e:
            print(type(e).__name__)     # PicklingError
` },
    { q: "Three processes append to a global list. What does the parent print?", a: "An empty list. Each child process has its own copy of the list and appends to that copy. The parent's list is never touched. Return the values through a Pool, or send them back with a multiprocessing.Queue.", c: `
from multiprocessing import Process

results = []

def work(n): results.append(n * n)

if __name__ == "__main__":
    ps = [Process(target=work, args=(n,)) for n in range(3)]
    for p in ps: p.start()
    for p in ps: p.join()
    print(results)      # []   each child filled its own copy
` },
    { q: "You moved a loop to a process pool and it became slower. What are the likely reasons?", a: "The tasks are too small, so the time to pickle, send and unpickle arguments and results is bigger than the work. Or the arguments are large and are copied for every task. Or starting the processes and importing modules costs more than the whole job. Use bigger tasks, a chunksize, and pass paths or IDs instead of big objects." },
    { q: "Why is the __main__ guard (if __name__ == '__main__':) needed, and on which systems?", a: "With the spawn and forkserver start methods the child imports the main module again. Unguarded code that starts processes would then run again inside the child. The guard is needed on Windows and macOS (spawn), and since Python 3.14 also on Linux (forkserver), so always write it." }
  ],
  tips: [
    "For new code use concurrent.futures.ProcessPoolExecutor. Its API is simpler and it reports a dead worker with BrokenProcessPool instead of hanging.",
    "Load heavy resources once per worker with initializer= (model files, database connections) and keep them in a module-level variable. Do not send them with every task.",
    "Pass small arguments: file paths, IDs or index ranges. Let the worker read its own data. For large arrays use multiprocessing.shared_memory or a memory-mapped file.",
    "When you have thousands of small items, set chunksize (for example 100) in map(). In containers, set the worker count from the CPU limit of the container, not from the number of cores of the host machine."
  ]
});

EXTRA(6, "concurrent.futures", {
  deep: [
    "A ThreadPoolExecutor has a queue of work items and a set of worker threads. submit() wraps your function call in a Future, puts it on the queue and returns immediately. Threads are created only when needed, up to max_workers; the default is min(32, CPU count + 4). ProcessPoolExecutor has the same interface, but the call and its result are pickled and sent to worker processes.",
    "A Future moves through states: pending, running, then finished with a result or an exception (or cancelled). cancel() works only while the task is still waiting in the queue; a running task cannot be stopped. result(timeout=...) raises TimeoutError if the result is not ready in time, but the task keeps running in the background. An exception in the task is stored in the Future and raised again only when you call result(); if you never call it, the error is silent.",
    "There are three ways to collect results. executor.map() returns results in the order of the inputs and raises the first exception when your loop reaches that item. as_completed() gives futures in the order they finish, which is best for showing progress and handling each error. wait() lets you stop waiting at the first finished task or the first exception.",
    "Leaving the 'with' block calls shutdown(wait=True), which blocks until every submitted task is done; from Python 3.9 you can call shutdown(cancel_futures=True) to drop tasks that have not started. The internal queue has no size limit, so submitting millions of tasks at once uses a lot of memory. One classic deadlock: a task submits another task to the same pool and waits for it, while all workers are busy doing the same."
  ],
  iq: [
    { q: "A submitted task raises an exception. When do you see it?", a: "Only when you call future.result() or future.exception(). The executor catches the exception and stores it in the Future. If you never look at the Future, the error is lost without any message.", c: `
from concurrent.futures import ThreadPoolExecutor

def bad(): raise ValueError("boom")

with ThreadPoolExecutor() as pool:
    f = pool.submit(bad)

print("no error shown yet")             # no error shown yet
print(type(f.exception()).__name__)     # ValueError
` },
    { q: "Tasks finish in a different order than they were submitted. In what order does executor.map() return results?", a: "In the order of the inputs, always. map waits for the first result even if later ones are already finished. Use as_completed() if you want results as soon as each one is ready.", c: `
from concurrent.futures import ThreadPoolExecutor
import time

def slow(n):
    time.sleep(n / 10)
    return n

with ThreadPoolExecutor() as pool:
    print(list(pool.map(slow, [3, 1, 2])))    # [3, 1, 2]
` },
    { q: "Does future.result(timeout=5) stop the task after 5 seconds?", a: "No. It only stops waiting and raises TimeoutError in the caller. The task continues to run in its worker thread and still occupies it. The 'with' block will also still wait for it at exit. The timeout must be inside the task itself, for example a timeout on the network call." },
    { q: "How can a thread pool deadlock without any explicit lock?", a: "When a task submits a new task to the same pool and waits for its result. If all workers are busy with such waiting tasks, no worker is free to run the inner tasks, so everybody waits forever. Avoid waiting on futures from inside the same pool; use a second pool or restructure the work." }
  ],
  tips: [
    "Always collect results: loop over as_completed(futures) and call result() inside try/except. Keep a dict {future: input} so you can log which input failed.",
    "Set max_workers on purpose for I/O work, matching what the remote system accepts. The default can be too high for a small API or database.",
    "Put timeouts inside the task function (HTTP timeout, database statement timeout). A Future timeout does not free the worker.",
    "Do not submit an unbounded stream of work at once. Feed the pool in batches, or use the buffersize argument of map() in Python 3.14, so memory use stays flat."
  ]
});

EXTRA(6, "asyncio", {
  deep: [
    "asyncio uses cooperative multitasking. Only one coroutine runs at any moment, in one thread, and it keeps running until it reaches an await that really has to wait. Only then can the event loop run something else. This has a good side: code between two awaits can never be interrupted by another task, so many race conditions of threads do not exist. And tasks are very cheap, a few kilobytes each, so tens of thousands are fine.",
    "The bad side is the same rule: if a coroutine does not reach an await, nobody else runs. One blocking call such as time.sleep() or requests.get(), or one heavy calculation, freezes every connection in the program. Under the surface the loop asks the operating system which sockets are ready (epoll on Linux, kqueue on macOS, IOCP on Windows) and resumes the tasks that were waiting for them.",
    "Because of this, the whole call chain must be async. You need async libraries for HTTP (httpx, aiohttp), databases (asyncpg, SQLAlchemy async) and files; normal blocking libraries must be moved to a thread with asyncio.to_thread(). An async function can only be awaited from another async function, so async tends to spread through a codebase.",
    "asyncio.run(main()) creates a new event loop, runs main to the end, cancels tasks that are still pending, and closes the loop. It cannot be called when a loop is already running in that thread; this is why it fails inside Jupyter, where you just write 'await main()'. asyncio does not make CPU work faster and does not use more cores. For a program with a handful of connections and blocking libraries, a thread pool is simpler and just as good."
  ],
  iq: [
    { q: "Two coroutines are awaited one after the other, then with gather. What is the difference?", a: "'await a(); await b()' is sequential: b does not start until a is finished, so the times add up. gather() wraps both in tasks, so both start, and while one waits the other runs. Writing await on every line does not make code concurrent by itself.", c: `
import asyncio

log = []

async def job(name):
    log.append(name + " start")
    await asyncio.sleep(0.01)
    log.append(name + " end")

async def main():
    await job("a"); await job("b")              # one after another
    print(log)   # ['a start', 'a end', 'b start', 'b end']
    log.clear()
    await asyncio.gather(job("a"), job("b"))    # together
    print(log)   # ['a start', 'b start', 'a end', 'b end']

asyncio.run(main())
` },
    { q: "What happens if you call asyncio.run() inside a coroutine that is already running?", a: "It raises RuntimeError, because asyncio.run() wants to create and own a new event loop, and a thread can run only one loop at a time. Inside async code you simply await the coroutine. asyncio.run() should be called once, at the top of the program.", c: `
import asyncio

async def inner(): return 1

async def main():
    coro = inner()
    try:
        asyncio.run(coro)
    except RuntimeError:
        print("RuntimeError")     # RuntimeError
    print(await coro)             # 1

asyncio.run(main())
` },
    { q: "Is asyncio parallel?", a: "No. It is concurrent but not parallel. Many tasks are in progress at the same time, but only one executes at any instant, in one thread on one core. The speed-up comes from not sitting idle while waiting for I/O. For parallel CPU work you still need processes or the free-threaded build." },
    { q: "When would you choose threads over asyncio for I/O-bound work?", a: "When the libraries you need are blocking and have no async version, when the number of parallel operations is small (tens, not thousands), or when you are adding concurrency to an existing sync codebase. asyncio is the better choice for very many connections and when the whole stack, including drivers, is async." }
  ],
  tips: [
    "Have one entry point: asyncio.run(main()). Do not create or fetch event loops by hand in application code.",
    "Turn on debug mode in development (asyncio.run(main(), debug=True) or PYTHONASYNCIODEBUG=1). It reports coroutines that were never awaited and callbacks that block the loop for more than 100 ms.",
    "Put a timeout on every network await, for example 'async with asyncio.timeout(10):' (3.11+). Without it, one dead server can hold a task forever.",
    "Limit concurrency with a Semaphore or a worker pool; do not start 100,000 requests at once. On Linux servers, uvloop is a common drop-in replacement for the default loop that is faster."
  ]
});

EXTRA(6, "Event loop", {
  deep: [
    "The loop is a simple cycle that repeats. In each round it works out how long it can sleep until the next timer, asks the operating system which sockets are ready (waiting at most that long), moves timers that are due into the 'ready' queue, and then runs every callback in the ready queue, one after another. A task is driven by such callbacks: each one runs the coroutine from its last await to its next one.",
    "There are three basic ways to schedule work. loop.call_soon(fn) puts a callback at the end of the ready queue (first in, first out). loop.call_later(delay, fn) sets a timer. I/O readiness wakes tasks waiting on sockets. From a different thread you must use loop.call_soon_threadsafe() or asyncio.run_coroutine_threadsafe(); the other loop methods are not thread-safe.",
    "Nothing can interrupt a running callback. If one step of a coroutine takes 200 ms, every timer and every other connection is late by 200 ms. This delay is called loop lag. 'await asyncio.sleep(0)' is the standard way to give other tasks one turn inside a long loop. Debug mode logs every callback that takes more than 0.1 seconds, which is the fastest way to find blocking code.",
    "Each thread can run at most one loop. Inside a coroutine use asyncio.get_running_loop(); the older get_event_loop() has confusing behaviour and should be avoided in new code. On Windows the default loop is the proactor loop (since 3.8), on Unix it is selector based. The loop keeps only weak references to tasks, so a task with no other reference can be garbage collected before it finishes."
  ],
  iq: [
    { q: "One coroutine calls time.sleep(0.2). Another coroutine is started at the same time. In what order do things happen?", a: "time.sleep blocks the thread, and the event loop lives in that thread, so nothing else can run. The second coroutine starts only after the blocking one has finished. With 'await asyncio.sleep(0.2)' the second one would run during the wait.", c: `
import asyncio, time

order = []

async def blocker():
    order.append("blocker start")
    time.sleep(0.2)                 # blocks the whole loop
    order.append("blocker end")

async def other():
    order.append("other")

async def main():
    await asyncio.gather(blocker(), other())
    print(order)    # ['blocker start', 'blocker end', 'other']

asyncio.run(main())
` },
    { q: "When does a callback scheduled with call_soon run?", a: "Not immediately. It is put in the ready queue and runs only when the current coroutine gives control back to the loop at an await that suspends. 'await asyncio.sleep(0)' gives the loop exactly one turn.", c: `
import asyncio

async def main():
    loop = asyncio.get_running_loop()
    loop.call_soon(print, "callback")
    print("before await")
    await asyncio.sleep(0)
    print("after await")

asyncio.run(main())
# before await
# callback
# after await
` },
    { q: "You must call a blocking library from async code. What are the options?", a: "Run it in a thread with 'await asyncio.to_thread(func, args)' or loop.run_in_executor(None, func, args); the loop stays free while the thread waits. For CPU-heavy work pass a ProcessPoolExecutor to run_in_executor. The best long-term fix is an async version of the library." },
    { q: "A background thread wants to schedule work on the event loop. How?", a: "Use loop.call_soon_threadsafe(callback) for a plain function, or asyncio.run_coroutine_threadsafe(coro, loop) for a coroutine; the second returns a concurrent.futures.Future the thread can wait on. Calling other loop methods or setting an asyncio Future directly from another thread is not safe and may not even wake the loop." }
  ],
  tips: [
    "Run with debug mode in development and tests. The 'Executing ... took 0.250 seconds' warnings point directly at blocking code.",
    "In async code never call time.sleep, requests, or a sync database driver. Use asyncio.sleep, httpx or aiohttp, and async drivers, or wrap the call in asyncio.to_thread.",
    "In production, measure loop lag: a small task that sleeps 1 second and records how late it wakes up. Rising lag means something is blocking the loop.",
    "Inside long CPU loops that must stay in the loop thread, add 'await asyncio.sleep(0)' every few hundred iterations so other tasks can run."
  ]
});

EXTRA(6, "Coroutines", {
  deep: [
    "A coroutine object is close to a generator inside. It has a frame that keeps its local variables and the position where it stopped. The event loop does not run it directly; a Task calls coro.send(None) to run it until the next point where it must wait. At that point a Future travels up to the Task, the Task asks the Future to wake it when it is done, and control returns to the loop.",
    "'await something()' on another coroutine is not a switch to the event loop. It works like a normal function call that has the ability to pause: the inner coroutine runs immediately, in the same task. The loop gets control only if somewhere down the chain a real wait happens (a sleep, a socket, a future that is not done). A chain of awaits that never waits runs from start to end without letting any other task run.",
    "A coroutine object can be awaited only once. A second await raises RuntimeError. If a coroutine object is created but never awaited or scheduled, its code never runs; Python prints 'RuntimeWarning: coroutine ... was never awaited' when the object is garbage collected. This is the most common asyncio bug, because the program continues without any exception.",
    "Several things can be awaited: coroutine objects, Tasks, Futures, and any object with an __await__ method. Do not confuse the coroutine function (the 'async def' itself) with the coroutine object it returns; inspect.iscoroutinefunction() and inspect.iscoroutine() test for each. Do not mark a function async if it never awaits anything: it adds cost and forces all callers to be async."
  ],
  iq: [
    { q: "What does a call to an async function return if you forget await?", a: "A coroutine object. The function body has not run at all. If you use the object as if it were the result, you get wrong behaviour (for example it is always truthy in an if). You must await it to run it and get the value.", c: `
import asyncio

async def get_price(): return 100

async def main():
    price = get_price()              # forgot await
    print(type(price).__name__)      # coroutine
    print(await price)               # 100

asyncio.run(main())
` },
    { q: "Can the same coroutine object be awaited twice?", a: "No. A coroutine object represents one single run. After it has finished, awaiting it again raises RuntimeError. Call the async function again to get a new coroutine, or wrap the first one in a Task, which can be awaited many times and keeps its result.", c: `
import asyncio

async def one(): return 1

async def main():
    c = one()
    print(await c)              # 1
    try:
        await c
    except RuntimeError:
        print("cannot reuse")   # cannot reuse

asyncio.run(main())
` },
    { q: "Does every await give other tasks a chance to run?", a: "No. Awaiting a coroutine just runs it inline. The loop only gets control when something really suspends. Here a() awaits a coroutine that never waits, so a() finishes completely before b() gets its first turn.", c: `
import asyncio

order = []

async def no_wait(): order.append("inner")       # never suspends

async def a():
    await no_wait()
    order.append("a done")

async def b(): order.append("b")

async def main():
    await asyncio.gather(a(), b())
    print(order)     # ['inner', 'a done', 'b']

asyncio.run(main())
` },
    { q: "What is the difference between a coroutine and a Task?", a: "A coroutine object is only a paused piece of work; it does nothing until someone awaits it, and then it runs inside the caller's task. A Task wraps a coroutine and is scheduled on the event loop by itself, so it runs concurrently with the code that created it. You need tasks (create_task, gather, TaskGroup) to get concurrency." }
  ],
  tips: [
    "Make the 'never awaited' warning fail your tests: in pytest set filterwarnings = error::RuntimeWarning. This catches forgotten awaits early.",
    "Type checkers find forgotten awaits too. mypy and pyright report an unused coroutine, and the result type Coroutine[...] instead of the value makes the mistake visible.",
    "Keep functions sync unless they really await something. A sync helper can be called from both sync and async code; an async one cannot.",
    "When an API should accept both sync and async callbacks, call the callback, then 'if inspect.isawaitable(result): result = await result'."
  ]
});

EXTRA(6, "Tasks", {
  deep: [
    "asyncio.create_task(coro) wraps the coroutine in a Task and asks the loop to run its first step soon. It does not run anything at that moment: the new task starts only when the current coroutine reaches an await that suspends. From then on the loop runs the task step by step, in between other tasks. A Task is also a Future, so you can await it, ask if it is done(), and read result() or exception().",
    "The event loop keeps only a weak reference to each task. If you call create_task() and do not keep the returned object anywhere, the garbage collector may remove the task in the middle of its work. Also, if a task fails and nobody ever awaits it, the exception is not raised anywhere; you only get a log line 'Task exception was never retrieved' when the task object is destroyed.",
    "task.cancel() does not stop a task immediately. It requests that asyncio.CancelledError is raised inside the coroutine at its next await. The coroutine can run cleanup code in 'finally' and should then let the error continue. CancelledError inherits from BaseException (since 3.8), so a normal 'except Exception' does not swallow it. Catching it and not re-raising breaks timeouts and shutdown.",
    "gather() and TaskGroup handle errors differently. With gather, the first exception is raised in the caller, but the other tasks are not cancelled and keep running in the background. With return_exceptions=True gather waits for all and returns exceptions as values in the result list. A TaskGroup (3.11) cancels all other tasks when one fails, waits until they have really stopped, and then raises an ExceptionGroup, which you handle with 'except*'. No task can outlive the 'async with' block."
  ],
  iq: [
    { q: "Does create_task() start running the coroutine immediately?", a: "No. It only schedules it. The current coroutine continues until it reaches an await that suspends; only then does the loop run the new task. If the current coroutine never awaits, the task never gets a turn.", c: `
import asyncio

async def child(): print("child runs")

async def main():
    task = asyncio.create_task(child())
    print("after create_task")
    await asyncio.sleep(0)
    print("after first await")
    await task

asyncio.run(main())
# after create_task
# child runs
# after first await
` },
    { q: "One coroutine in asyncio.gather() raises. What happens to the others?", a: "gather raises the exception to the caller at once, but it does not cancel the other tasks. They keep running in the background and can still change state or call external systems. Use a TaskGroup if a failure should stop the rest.", c: `
import asyncio

done = []

async def ok():
    await asyncio.sleep(0.05)
    done.append("ok finished")

async def fail():
    raise ValueError("boom")

async def main():
    try:
        await asyncio.gather(ok(), fail())
    except ValueError:
        print("caught")           # caught
    await asyncio.sleep(0.1)
    print(done)                   # ['ok finished']  it was NOT cancelled

asyncio.run(main())
` },
    { q: "The same situation with a TaskGroup: what is different?", a: "When one task fails, the TaskGroup cancels the remaining tasks and waits for them to finish their cleanup. Then it raises an ExceptionGroup that contains the error, which you catch with 'except*'. After the block, no task from the group is still running.", c: `
import asyncio

done = []

async def ok():
    try:
        await asyncio.sleep(0.05)
        done.append("ok finished")
    except asyncio.CancelledError:
        done.append("ok cancelled")
        raise

async def fail():
    raise ValueError("boom")

async def main():
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(ok())
            tg.create_task(fail())
    except* ValueError:
        print("caught group")     # caught group
    print(done)                   # ['ok cancelled']

asyncio.run(main())
` },
    { q: "A 'fire and forget' task created with create_task() sometimes never finishes. Why?", a: "The loop holds only a weak reference to the task. If your code keeps no reference, the garbage collector can destroy the task while it is still waiting. Keep the task in a set and remove it in a done callback, or create it inside a TaskGroup." }
  ],
  tips: [
    "For background tasks keep a module-level set: tasks.add(t); t.add_done_callback(tasks.discard). This keeps the task alive and cleans up when it ends.",
    "On Python 3.11+ prefer 'async with asyncio.TaskGroup()' to gather for related work. Errors are not lost and no task is left running.",
    "If you catch asyncio.CancelledError to clean up, always re-raise it. Use 'finally' for cleanup when you can; then there is nothing to forget.",
    "Give tasks names (create_task(coro, name='sync-user-42')). The names appear in debug output and in 'Task exception was never retrieved' logs."
  ]
});

EXTRA(6, "Futures", {
  deep: [
    "Python has two Future classes with similar names and different rules. concurrent.futures.Future belongs to thread and process pools: it is thread-safe, and result() blocks the calling thread until the value is ready. asyncio.Future belongs to an event loop: it is not thread-safe, you wait for it with await, and calling result() before it is done raises InvalidStateError. asyncio.wrap_future() and loop.run_in_executor() convert the first kind into the second.",
    "Inside, a Future is simple: a state, a slot for a result or an exception, and a list of callbacks. Someone calls set_result() or set_exception() exactly once; a second call raises InvalidStateError. Then the callbacks run. When a coroutine awaits a Future that is not done, its Task adds a callback 'wake me up' to that Future and pauses. This is the basic mechanism under everything in asyncio.",
    "Callbacks behave differently in the two worlds. For an asyncio Future, done callbacks are scheduled on the loop with call_soon, so they run a little later, in the loop thread. For a concurrent.futures Future, the callback runs in the thread that completed the future, or immediately in the calling thread if the future is already done. Code in such callbacks must be short and thread-safe.",
    "In application code you rarely create a Future yourself; you get them from submit(), run_in_executor() or create_task(). Libraries create them with loop.create_future() to connect callback-style code to await. One comparison that interviewers like: a JavaScript Promise starts its work as soon as it is created, but a Python coroutine does nothing until it is awaited or wrapped in a Task."
  ],
  iq: [
    { q: "How do you create and complete an asyncio Future by hand, and can you set its result twice?", a: "Create it with loop.create_future(), and some other code calls set_result(). Awaiting it pauses until then. A Future can be completed only once; the second set_result raises InvalidStateError.", c: `
import asyncio

async def main():
    loop = asyncio.get_running_loop()
    fut = loop.create_future()
    print(fut.done())                       # False
    loop.call_soon(fut.set_result, 42)
    print(await fut)                        # 42
    try:
        fut.set_result(1)
    except asyncio.InvalidStateError:
        print("already done")               # already done

asyncio.run(main())
` },
    { q: "A function submitted to an executor raises ZeroDivisionError. Where does the exception appear?", a: "Not at submit() and not at the end of the 'with' block. It is stored inside the Future and raised when you call result(). You can also read it without raising by calling exception().", c: `
from concurrent.futures import ThreadPoolExecutor

def div(a, b): return a / b

with ThreadPoolExecutor() as pool:
    f = pool.submit(div, 1, 0)

try:
    f.result()
except ZeroDivisionError:
    print("raised at result()")     # raised at result()
` },
    { q: "What is the difference between concurrent.futures.Future and asyncio.Future?", a: "The first is for threads and processes: it is thread-safe and result() blocks until done, with an optional timeout. The second is for the event loop: you await it, it is not thread-safe, and result() never blocks; it raises InvalidStateError if the value is not ready. You cannot await a concurrent Future directly; wrap it with asyncio.wrap_future()." },
    { q: "What is the relation between a coroutine, a Future and a Task?", a: "A coroutine is the code that can pause. A Future is an empty box for a result that will come later. A Task is a Future that also owns a coroutine and runs it on the event loop; when the coroutine returns, the Task puts the return value into itself. So every Task is a Future, but a plain Future has no code to run." }
  ],
  tips: [
    "Do not create Futures by hand in application code. Use create_task, TaskGroup, to_thread or an executor, and let them create the Future.",
    "Attach future.add_done_callback(...) to log failures of background jobs whose result nobody reads. Otherwise their exceptions are never seen.",
    "From a normal thread, run a coroutine on the loop with asyncio.run_coroutine_threadsafe(coro, loop).result(timeout=...). It returns a thread-safe Future.",
    "Always pass a timeout to result() on a concurrent Future in service code, so a stuck worker cannot block the caller forever."
  ]
});

EXTRA(6, "async / await", {
  deep: [
    "The word 'async' changes what a function is. Calling a normal function runs it. Calling an 'async def' function only builds a coroutine object. 'await' can be used only inside an 'async def' function (the asyncio REPL and notebooks are special cases); in a normal function it is a SyntaxError. The value after await must be awaitable: a coroutine, a Task, a Future, or an object with __await__.",
    "'async with' is a context manager whose enter and exit steps can wait, through __aenter__ and __aexit__. It is used for things like opening a connection and committing or rolling back a transaction. 'async for' loops over an async iterator, where getting each next item may need to wait, for example rows streaming from a database. An 'async def' function that contains 'yield' is an async generator and must be consumed with 'async for', not with a normal 'for'.",
    "The two worlds mix only in fixed ways. Sync code starts async code with asyncio.run(), normally once at the top of the program. Async code calls blocking sync code through asyncio.to_thread(). A sync function cannot await, so once a low-level function becomes async, its callers must become async too. This is why people say 'async all the way'.",
    "async does not make a single operation faster: one request takes the same time as before. The gain appears only when many operations wait at the same time. Also remember that every await is a point where other tasks may run and change shared state. 'Check, then await, then act' is a race condition even in single-threaded async code. Code with no await between the check and the action is safe."
  ],
  iq: [
    { q: "Two withdrawals of 100 run at the same time on a balance of 100, in one thread. Can the balance go negative?", a: "Yes. Each coroutine checks the balance, then awaits. During that await the other coroutine runs and also passes the check. Both then subtract. There are no threads here; the await between the check and the update is enough to create a race. Use an asyncio.Lock or remove the await from between check and update.", c: `
import asyncio

balance = 100

async def withdraw(amount):
    global balance
    if balance >= amount:           # check
        await asyncio.sleep(0)      # another task runs here
        balance -= amount           # act

async def main():
    await asyncio.gather(withdraw(100), withdraw(100))
    print(balance)     # -100

asyncio.run(main())
` },
    { q: "Can you loop over an async generator with a normal for loop?", a: "No. An async generator has __aiter__ and __anext__, not __iter__, so a normal for loop raises TypeError. Use 'async for', or an async comprehension, inside an async function.", c: `
import asyncio

async def ticker(n):
    for i in range(n):
        await asyncio.sleep(0)
        yield i

async def main():
    print([x async for x in ticker(3)])     # [0, 1, 2]
    try:
        for x in ticker(3): pass
    except TypeError:
        print("TypeError")                  # TypeError

asyncio.run(main())
` },
    { q: "An endpoint does 'for url in urls: data.append(await fetch(url))'. It is async but slow. Why?", a: "Each await waits for one fetch to finish before the loop starts the next one, so the calls run one after another. async syntax alone does not create concurrency. Start all the calls first with asyncio.gather(*(fetch(u) for u in urls)) or a TaskGroup, then collect the results." },
    { q: "Can you use await inside a normal def function or a lambda?", a: "No, it is a SyntaxError. await is allowed only directly inside an 'async def' function. From sync code, the way to run a coroutine is asyncio.run(coro) at the top level, or run_coroutine_threadsafe when a loop already runs in another thread." }
  ],
  tips: [
    "When several awaits do not depend on each other, start them together with gather or a TaskGroup. An await inside a for loop is a sign of hidden sequential work.",
    "Open clients, connections and transactions with 'async with', so they are closed even when the task is cancelled or fails.",
    "In FastAPI, a plain 'def' endpoint runs in a thread pool and an 'async def' endpoint runs on the event loop. If your endpoint calls a blocking library, declare it with 'def', or it will block all other requests.",
    "Turn on the ASYNC rules in ruff (from flake8-async). They report blocking calls such as time.sleep or open() inside async functions."
  ]
});

EXTRA(6, "Semaphore", {
  deep: [
    "A semaphore holds a counter. acquire() lowers it by one; if it is already zero, the caller waits. release() raises it by one and wakes one waiter. 'async with sem:' (or 'with sem:' for threads) does both steps and guarantees the release even when the code inside fails. Semaphore(1) behaves much like a lock, with one difference: a semaphore has no owner, so any task may release it, even a task that never acquired it.",
    "That freedom hides bugs. If your code calls release() one time too many, a normal Semaphore silently raises its limit, and from then on more tasks get in than you planned. BoundedSemaphore remembers the starting value and raises ValueError when released above it. Unless you really need the unbalanced behaviour, BoundedSemaphore is the safer default.",
    "There are three different semaphores: threading.Semaphore for threads, asyncio.Semaphore for coroutines (not thread-safe, and acquire must be awaited), and multiprocessing.Semaphore for processes. Using the threading one in async code blocks the event loop while it waits. Pick the one that matches your concurrency model.",
    "A semaphore limits how many operations are in progress, not how many start per second. Semaphore(10) with fast requests can still send hundreds of requests per second. For a real rate limit you need a token-bucket limiter (for example the aiolimiter package). Also note that with gather and a semaphore, all the coroutines are still created at once and wait in memory; for millions of items use a queue with a fixed number of workers."
  ],
  iq: [
    { q: "Ten jobs share Semaphore(3). How many are inside the protected block at the same time?", a: "Never more than three. The first three acquire it, the others wait at 'async with'. Each time a job leaves the block, one waiting job enters. The code records the highest number seen.", c: `
import asyncio

running = 0
peak = 0

async def job(sem):
    global running, peak
    async with sem:
        running += 1
        peak = max(peak, running)
        await asyncio.sleep(0.01)
        running -= 1

async def main():
    sem = asyncio.Semaphore(3)
    await asyncio.gather(*(job(sem) for _ in range(10)))
    print(peak)     # 3

asyncio.run(main())
` },
    { q: "What is the difference between Semaphore and BoundedSemaphore?", a: "A plain Semaphore lets you call release() more times than acquire(); the counter just grows, so the limit becomes larger without any error. BoundedSemaphore raises ValueError when the counter would go above its starting value. This turns a silent bug into a visible one.", c: `
import threading

s = threading.Semaphore(1)
s.release(); s.release()         # no error: the limit is now 3

b = threading.BoundedSemaphore(1)
try:
    b.release()
except ValueError:
    print("ValueError")          # ValueError
` },
    { q: "Is Semaphore(1) the same as a Lock?", a: "Almost, but not exactly. Both let one holder in. A Lock is meant to be released by the one that acquired it (asyncio.Lock raises an error if you release it when it is not locked), while a semaphore is only a counter with no idea of ownership, and extra releases raise the count. Use a Lock for mutual exclusion and a semaphore for 'at most N'." },
    { q: "Does Semaphore(10) guarantee at most 10 requests per second to an API?", a: "No. It guarantees at most 10 requests in progress at the same moment. If each request takes 50 ms, that is about 200 requests per second. To respect a per-second limit you need a rate limiter that hands out permits over time, often combined with a semaphore." }
  ],
  tips: [
    "Put the semaphore inside the function or client class that does the limited work, so no caller can forget it or go around it.",
    "Use BoundedSemaphore by default. An accidental extra release() then fails loudly in tests instead of quietly raising your limit in production.",
    "For HTTP, first use the client's own limits: httpx.Limits(max_connections=...) or aiohttp.TCPConnector(limit=...). Add your own semaphore only for limits the client does not cover.",
    "Create an asyncio semaphore inside your running program (for example in main or on a client object), not as a global at import time. A global one becomes tied to the first event loop that uses it and fails in tests that start a new loop."
  ]
});

EXTRA(6, "Locks", {
  deep: [
    "A Lock has two states, locked and unlocked. acquire() on a locked lock waits until it is released. 'with lock:' acquires it and guarantees the release, even if the code inside raises. A plain threading.Lock has no owner: if the same thread tries to acquire it a second time, it waits for itself forever. RLock (re-entrant lock) remembers its owner and a count, so the same thread can enter again; this is needed when one locked method calls another locked method of the same object.",
    "You need a lock for every operation on shared data that has more than one step: read-modify-write such as counter += 1, and check-then-act such as 'if key not in cache: cache[key] = compute()'. Some single operations on built-in types, like list.append, happen to be atomic in CPython, but that is an implementation detail and should not be the base of your design.",
    "Deadlock happens when thread A holds lock 1 and waits for lock 2, while thread B holds lock 2 and waits for lock 1. Neither can continue. The standard cures: always take multiple locks in the same fixed order, hold as few locks as possible, use acquire(timeout=...) so a stuck thread can give up, and never call unknown code (callbacks, plugins) while holding a lock.",
    "asyncio.Lock is for coroutines. In async code you need it only when the protected section contains an await; without an await no other task can run anyway. Never use threading.Lock to wait in async code, because it blocks the event loop. Most important for real systems: a lock in your program protects only one process. With several web workers or servers, the cinema-seat problem must be solved in the database (a transaction with SELECT ... FOR UPDATE, or a unique constraint) or with a distributed lock."
  ],
  iq: [
    { q: "A thread holds a Lock and tries to acquire the same lock again. What happens? And with an RLock?", a: "With a plain Lock the thread waits for a release that can never come, because it is the holder itself: a deadlock with only one thread. An RLock allows the same thread to acquire it again and counts the entries. The example uses a timeout so it does not hang.", c: `
import threading

lock = threading.Lock()
rlock = threading.RLock()

with lock:
    print(lock.acquire(timeout=0.1))     # False  (without the timeout: stuck forever)

with rlock:
    print(rlock.acquire(timeout=0.1))    # True   (same thread may enter again)
    rlock.release()
` },
    { q: "asyncio runs in one thread. Why would you ever need asyncio.Lock?", a: "Because other tasks can run at every await. If a critical section contains an await between reading and writing shared state, another task can change the state in that gap. asyncio.Lock makes the other tasks wait until the whole section is done. This fixes the double-withdraw race.", c: `
import asyncio

balance = 100

async def withdraw(amount, lock):
    global balance
    async with lock:
        if balance >= amount:
            await asyncio.sleep(0)
            balance -= amount

async def main():
    lock = asyncio.Lock()
    await asyncio.gather(withdraw(100, lock), withdraw(100, lock))
    print(balance)     # 0

asyncio.run(main())
` },
    { q: "What is a deadlock and how do you prevent it?", a: "A deadlock is when two or more threads each hold a lock and wait for a lock that another one holds, so none can ever continue. Prevent it by always acquiring locks in the same global order, by holding only one lock at a time when possible, and by using timeouts on acquire so the program can detect and recover." },
    { q: "Your app runs with 4 gunicorn workers. Does a threading.Lock around 'check seat, then book seat' prevent double booking?", a: "No. Each worker is a separate process with its own copy of the lock, so two requests in different workers both pass. The protection must be in the shared place, the database: a transaction with SELECT ... FOR UPDATE, an atomic UPDATE with a WHERE condition, or a unique constraint. A Redis-based distributed lock is another option." }
  ],
  tips: [
    "Always use 'with lock:' (or 'async with'). Manual acquire() and release() calls are easy to unbalance when an exception happens.",
    "Keep the lock next to the data it protects, inside one class, and touch the data only through methods that take the lock. Do not hand the raw data out.",
    "Hold a lock for the shortest possible time and never do network or disk I/O while holding it. Compute outside, lock only to update.",
    "If you need two locks, define one fixed order for the whole codebase and document it. Many designs can avoid locks completely by sending work to one owner thread through a queue."
  ]
});

EXTRA(6, "Queues", {
  deep: [
    "queue.Queue, for threads, is a deque guarded by a lock and condition variables. get() on an empty queue puts the thread to sleep until an item arrives; put() on a full queue sleeps until there is room. The same module has LifoQueue (a stack), PriorityQueue (smallest item first) and SimpleQueue. asyncio.Queue has the same idea with 'await' and is not thread-safe. multiprocessing.Queue pickles each item and sends it through a pipe.",
    "The default maxsize=0 means no limit. If producers are faster than consumers, the queue grows until the process runs out of memory. A bounded queue (maxsize=1000, for example) creates backpressure: when it is full, put() makes the producer wait, so the whole pipeline slows down to the speed of the slowest part instead of crashing.",
    "join() and task_done() work as a pair. The queue counts unfinished items: put() adds one and task_done() removes one, and join() waits until the count is zero. If a worker gets an item and then fails before calling task_done(), the count never reaches zero and join() waits forever. So call task_done() in a 'finally' block. Calling it more times than there were items raises ValueError.",
    "Workers that loop forever need a way to stop. The classic way is a sentinel: put one special value such as None per worker, and each worker exits when it sees it. In asyncio you can also cancel the worker tasks after join(). Python 3.13 added Queue.shutdown() for this. Finally, an in-process queue lives in memory: jobs are lost when the process restarts, and other servers cannot see them. For jobs that must not be lost, use a broker such as Redis, RabbitMQ, Kafka or SQS, usually through Celery, RQ or arq."
  ],
  iq: [
    { q: "What happens when a bounded queue is full, or an empty queue is read without waiting?", a: "A normal put() on a full queue blocks until space is free, and a normal get() on an empty queue blocks until an item arrives. The _nowait versions (or block=False) raise queue.Full and queue.Empty instead. Items come out in FIFO order.", c: `
import queue

q = queue.Queue(maxsize=2)
q.put(1); q.put(2)
print(q.full())               # True
try:
    q.put_nowait(3)
except queue.Full:
    print("Full")             # Full
print(q.get(), q.get())       # 1 2
try:
    q.get_nowait()
except queue.Empty:
    print("Empty")            # Empty
` },
    { q: "queue.join() never returns. What is the usual reason?", a: "task_done() was not called once for every item taken with get(). Typically a worker raised an exception between get() and task_done(), or the worker thread died. Put task_done() in a finally block. The opposite mistake, too many task_done() calls, raises ValueError.", c: `
import queue

q = queue.Queue()
q.put("job")
q.get()
q.task_done()
q.join()                      # returns at once: nothing is unfinished
try:
    q.task_done()
except ValueError:
    print("ValueError")       # ValueError
` },
    { q: "Two jobs with the same priority are put on a PriorityQueue as (priority, dict). Why does it crash?", a: "The queue compares the tuples to keep them sorted. When the priorities are equal, Python compares the second elements, and two dicts cannot be compared with '<', so it raises TypeError. Add a unique counter in the middle: (priority, counter, job). The counter also keeps equal priorities in arrival order.", c: `
import queue
from itertools import count

q = queue.PriorityQueue()
q.put((1, {"job": "a"}))
try:
    q.put((1, {"job": "b"}))
except TypeError:
    print("TypeError")        # TypeError

q2 = queue.PriorityQueue()
order = count()
q2.put((1, next(order), {"job": "a"}))
q2.put((1, next(order), {"job": "b"}))
print(q2.get()[2])            # {'job': 'a'}
` },
    { q: "Why use queue.Queue between threads and not a plain list?", a: "A list has no way to wait: a consumer would have to check again and again in a loop, wasting CPU, and compound steps like 'check if empty, then pop' are race conditions. Queue.get() sleeps until an item is available, put() can block when the queue is full, and all the locking is inside the class." }
  ],
  tips: [
    "Always set maxsize on queues in a service. An unbounded queue hides an overload problem until the process dies from memory use.",
    "In the worker loop use try/finally so task_done() is called even when processing fails, and log the error inside the loop so one bad job does not kill the worker.",
    "For shutdown, send one sentinel per worker, or on Python 3.13+ call queue.shutdown(). Do not rely on daemon threads being killed at exit.",
    "Do not make decisions with qsize() or empty() in threaded code; the answer can be old by the time you use it. For work that must survive a restart, use Redis, RabbitMQ or SQS, not an in-memory queue."
  ]
});

EXTRA(6, "Async database calls", {
  deep: [
    "A database connection can run only one query at a time. If two tasks use the same connection at the same moment, the driver raises an error (asyncpg says 'another operation is in progress'). So concurrent tasks each need their own connection. Opening a connection is slow (network handshake, login, and in PostgreSQL a new server process), so applications keep a pool of open connections and lend one to each task for a short time.",
    "The pool size is the real limit of your database concurrency. With 2,000 requests in flight and a pool of 20, only 20 queries run at once and the other requests wait at pool.acquire(). The database has a limit too (PostgreSQL allows 100 connections by default), and every worker process of your app has its own pool. Workers multiplied by pool size must stay below the database limit, or you need a pooler such as PgBouncer in front.",
    "A transaction lives on one connection, so all its statements must use the same connection, normally inside 'async with conn.transaction():'. Keep that block short. If you await a slow external API while you hold a connection or an open transaction, the connection is blocked for others and rows may stay locked. A few such requests can empty the whole pool; this is the most common cause of 'the service hangs under load'.",
    "With SQLAlchemy's async mode there are extra rules. An AsyncSession must not be shared between concurrent tasks; use one session per request or per task. Lazy loading of relationships does hidden I/O and fails in async code, so load related rows explicitly with selectinload() or joinedload(). And remember what async cannot do: it does not make a slow query faster, and a sync driver such as psycopg2 called inside 'async def' still blocks the whole event loop."
  ],
  iq: [
    { q: "Two queries are sent with gather() on the same connection. What happens?", a: "It fails. One connection speaks a strict request-and-reply protocol and can handle only one query at a time. Real drivers raise an error such as asyncpg's 'another operation is in progress'. Each concurrent query needs its own connection from the pool. The small class below imitates this behaviour.", c: `
import asyncio

class Conn:                      # imitates one real database connection
    busy = False
    async def fetch(self, sql):
        if self.busy:
            raise RuntimeError("another operation is in progress")
        self.busy = True
        await asyncio.sleep(0.01)
        self.busy = False
        return sql

async def main():
    conn = Conn()
    try:
        await asyncio.gather(conn.fetch("q1"), conn.fetch("q2"))
    except RuntimeError as e:
        print(e)       # another operation is in progress

asyncio.run(main())
` },
    { q: "Why must you pass values as query parameters and not build the SQL with an f-string?", a: "With an f-string the user's text becomes part of the SQL code, so a crafted value can change the meaning of the query. This is SQL injection. With parameters ($1 in asyncpg, :name in SQLAlchemy) the value is sent separately from the SQL text and is never executed as code.", c: `
name = "x' OR '1'='1"
sql = f"SELECT * FROM users WHERE name = '{name}'"
print(sql)
# SELECT * FROM users WHERE name = 'x' OR '1'='1'
# This returns every user. Safe form:
# await conn.fetch("SELECT * FROM users WHERE name = $1", name)
` },
    { q: "A FastAPI endpoint is 'async def' but uses psycopg2 or the sync SQLAlchemy session. What happens under load?", a: "Each query blocks the event loop thread until the database answers. While it waits, no other request in that process can make progress, so the server handles requests one at a time and latency grows quickly. Use an async driver, or declare the endpoint with plain 'def' so FastAPI runs it in a thread pool." },
    { q: "The service handles 2,000 concurrent requests. Does it run 2,000 queries at the same time?", a: "No. The connection pool decides. With a pool of 20, at most 20 queries run at once and the other tasks wait for a free connection. This is good: it protects the database. The work is to choose the pool size, set an acquire timeout, and keep each connection borrowed for as short a time as possible." }
  ],
  tips: [
    "Create the pool once at application startup (FastAPI lifespan) and close it at shutdown. Never create a pool or a connection per request.",
    "Check the sum: worker processes x pool max size must be lower than the database connection limit, with room left for migrations and admin tools.",
    "Set timeouts at every level: a pool acquire timeout, a statement or command timeout, and a transaction that never stays open across an HTTP call to another service.",
    "With SQLAlchemy async use one AsyncSession per request, load relationships with selectinload(), and set expire_on_commit=False so objects stay usable after commit."
  ]
});

EXTRA(6, "Async API calls", {
  deep: [
    "An AsyncClient (httpx) or ClientSession (aiohttp) owns a pool of open connections. Reusing a connection skips the TCP and TLS handshakes, which often cost more time than the request itself. So create one client for the whole application and close it at shutdown. Creating a new client for every request throws this advantage away and can exhaust sockets under load.",
    "Know the defaults of your client. httpx has a 5 second timeout and a limit of 100 connections; aiohttp has a total timeout of 5 minutes and also 100 connections. An HTTP error status such as 404 or 500 is not an exception: the await returns a normal response, and you must check it or call raise_for_status(). Exceptions are raised for network problems and timeouts.",
    "gather() needs care with many calls. If one request raises, gather raises that exception in your code at once, the results of the other calls are lost to you, and those calls keep running. With return_exceptions=True you get a list with results and exception objects mixed, and you handle each one. A TaskGroup is the choice when one failure should cancel the rest.",
    "Be a polite client. Starting 10,000 requests at once will hit connection limits, get HTTP 429 answers or get your IP blocked; limit concurrency with a semaphore or client limits. Retry only errors that can go away (timeouts, 429, 502, 503), with growing delays plus some randomness, and only for requests that are safe to repeat. Finally, parsing a very large JSON response is CPU work and blocks the event loop while it runs."
  ],
  iq: [
    { q: "Three API calls run in gather() and one fails. How do you still get the other two results?", a: "Pass return_exceptions=True. gather then waits for all calls and returns a list in input order, where a failed call is represented by its exception object. Without the flag, the first exception is raised and you do not receive the other results.", c: `
import asyncio

async def call(n):
    await asyncio.sleep(0.01)
    if n == 2: raise ConnectionError("api 2 down")
    return n

async def main():
    results = await asyncio.gather(*(call(n) for n in (1, 2, 3)), return_exceptions=True)
    print(results)     # [1, ConnectionError('api 2 down'), 3]

asyncio.run(main())
` },
    { q: "How do you stop waiting for a slow API, and what happens to the call?", a: "Wrap it in asyncio.wait_for(coro, timeout) or 'async with asyncio.timeout(...)'. When the time is over, the inner task is cancelled (CancelledError is raised inside it at its await) and the caller gets TimeoutError. Unlike a thread, the work really stops.", c: `
import asyncio

async def slow_api():
    try:
        await asyncio.sleep(10)
        return "data"
    except asyncio.CancelledError:
        print("call was cancelled")
        raise

async def main():
    try:
        await asyncio.wait_for(slow_api(), timeout=0.1)
    except TimeoutError:
        print("timed out")

asyncio.run(main())
# call was cancelled
# timed out
` },
    { q: "What is wrong with calling requests.get() inside an async function?", a: "requests is a blocking library. The call holds the event loop thread until the response arrives, so all other tasks in the process stop for that time. Use an async client such as httpx.AsyncClient or aiohttp, or as a quick fix run the call with asyncio.to_thread()." },
    { q: "The server answers with status 500. Does 'await client.get(url)' raise an exception?", a: "No. The request itself worked, so you get a normal response object with status_code 500. If you do not check it, your code continues with an error page as if it were data. Call response.raise_for_status() or test the status code before using the body." }
  ],
  tips: [
    "Create one AsyncClient at startup (FastAPI lifespan), share it, and close it at shutdown. Do not write 'async with httpx.AsyncClient()' inside every request handler.",
    "Set timeouts explicitly, for example httpx.Timeout(10.0, connect=3.0), and add an overall deadline with asyncio.timeout around a group of calls.",
    "Use a retry library such as tenacity with exponential backoff and jitter. Retry only timeouts, 429 and 5xx, respect the Retry-After header, and do not retry non-idempotent POST calls blindly.",
    "In tests, do not call real APIs. Use httpx.MockTransport or the respx package to return fixed responses, including errors and timeouts."
  ]
});
