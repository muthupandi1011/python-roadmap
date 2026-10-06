EXTRA(24, "Why centralise: cross-cutting concerns and the internal 'core' library", {
  deep: [
    "A core package is imported by every service, so its import-time behaviour matters more than in a normal library. Nothing in core should connect to a database, read a file or start a thread when it is imported. Everything is wired by an explicit call such as configure_logging() or create_app(), so a unit test can import a module without network access. Core also must not pin exact versions of big frameworks; it declares ranges (fastapi>=0.110) and lets each service pin exact versions in its own lock file. If core pins fastapi==0.111.0 and a service needs 0.115, pip cannot resolve and the team is blocked.",
    "The hard part is the diamond problem. Service A depends on acme-core 3 and on acme-billing-sdk, and acme-billing-sdk depends on acme-core 2. Only one version of a package can be installed in one Python environment, so the resolver fails. The rule that avoids this is that internal SDKs depend on core with a wide range (acme-core>=2,<4) and never on an exact version, and that core removes a public function only after it has emitted a DeprecationWarning for at least two minor releases. Private modules (an underscore prefix) are free to change at any time, which is why the public surface of core is kept small on purpose.",
    "Do not centralise too early or too much. If only two teams need something, a shared snippet or a documented pattern is cheaper than a library with a release process. If a module in core gets business meaning (for example a Customer class), it will be changed by many teams and will become the slowest-moving code in the company. And do not put every convenience into one monolithic package: a service that only needs the HTTP client should not pull in Django. Split by extras first, and into separate packages (acme-core, acme-core-django, acme-core-celery) only when the release cycles really differ."
  ],
  iq: [
    { q: "A platform team wants to put retry logic into a shared library. Another engineer suggests a sidecar or service mesh instead. How do you decide?", a: "A library runs inside the process, so it can see application state, exceptions and types, and it works with no infrastructure change; but every service must upgrade to get a fix. A sidecar or mesh (Envoy, Istio) handles retries, timeouts and mTLS outside the process for every language at once, and is updated centrally; but it cannot know that a specific exception is safe to retry and it adds a network hop. Most large companies use both: the mesh for transport-level concerns and the library for anything that needs application knowledge." },
    { q: "How do you remove a function from a core library used by 50 services without breaking anyone?", a: "First ship a minor release that keeps the function but emits a DeprecationWarning pointing to the replacement, and make CI in the service template treat that warning as an error only on new code. Then search the company (a code search tool or a GitHub org-wide grep) for remaining callers and open pull requests for them. Remove the function only in the next major release, and keep the old major on a maintenance branch for security fixes for a defined time.", c: `
import warnings

def get_client(*args, **kwargs):
    warnings.warn("get_client() is deprecated; use acme_core.http.client() instead",
                  DeprecationWarning, stacklevel=2)
    return client(*args, **kwargs)
` },
    { q: "Service A needs acme-core 3 and an internal SDK that still requires acme-core<3. What are the options?", a: "Python can install only one version of a package per environment, so the install fails. Short term the team pins the SDK version that already works with core 3, or vendors the few SDK calls it needs. The real fix is a policy: internal SDKs must declare a wide core range and must be tested in CI against the oldest and newest supported core majors. This is the reason core should keep its public API small and stable." },
    { q: "What belongs in the core package and what does not? Give examples both ways.", a: "In: logging setup, request context, the error base classes and handlers, settings base class, HTTP client factory, auth dependency, metrics and tracing setup, health endpoints, Celery base task. Out: ORM models for business entities, pricing or tax logic, anything that needs a company database, feature code that only one team uses, and anything that changes weekly. A simple test is: would a brand new service in a different business unit want this unchanged? If not, it is not core." }
  ],
  tips: [
    "Publish core with optional extras and keep the base install tiny. A Celery worker installs acme-core[celery] and never sees FastAPI; a lambda function installs plain acme-core.",
    "Keep a CODEOWNERS file and a small review group for core, and a public CHANGELOG.md with Added, Changed, Deprecated and Removed sections for each version. Teams read the changelog before they upgrade, so write it for them.",
    "Run a nightly job that installs the main branch of core into three or four real services and runs their test suites. It finds breaking changes before a release, not after.",
    "Set up Renovate or Dependabot in every service repo to open an upgrade pull request when a new core version is published. The adoption curve is then measured in days, not quarters."
  ]
});

EXTRA(24, "Custom middleware in FastAPI and ASGI", {
  deep: [
    "When the first request arrives, Starlette calls build_middleware_stack() once and caches the result. The stack is, from outside to inside: ServerErrorMiddleware, then the user middleware in the order of app.user_middleware, then ExceptionMiddleware, then the Router. Because add_middleware() inserts at index 0 of user_middleware, the last one added becomes the outermost. Two consequences follow. First, calling add_middleware() after the first request raises RuntimeError, because the stack is already built. Second, the handlers you register with @app.exception_handler(HTTPException) live in ExceptionMiddleware, which is inside all user middleware. An HTTPException raised directly inside your own middleware is not seen by those handlers; it goes up to ServerErrorMiddleware and becomes a 500. Only the handler for Exception or 500 lives in ServerErrorMiddleware. That is why the body-size fast path in the example sends a response itself instead of raising.",
    "The scope dictionary is shared by every layer, so middleware can put values in it (scope['state'] is the official place, visible as request.state) and later layers can read them. Headers in scope are lower-case byte pairs; a wrong case or a str value is a silent bug. The response is a sequence of messages: one http.response.start with status and headers, then one or more http.response.body with more_body=True for streaming. Headers can only be changed on the start message, and once it has been sent the status code is final. A middleware that wants to measure full response time must therefore look at the last body message, not the start message. Request bodies arrive in chunks through receive(); the http.request message has more_body=True until the last chunk, which is why counting bytes in a wrapped receive works for uploads without buffering them.",
    "BaseHTTPMiddleware exists because the pure form is verbose. It runs call_next in a separate task group, which has side effects: a contextvar set by the endpoint is not visible after call_next returns, the response you get back is always a StreamingResponse whose body you cannot read without consuming it, and exceptions from background tasks surface in surprising places. These issues have been reduced over Starlette versions but not removed, so shared code uses pure ASGI. When should you not centralise? Behaviour that depends on the route, such as a per-endpoint rate limit or a permission check, belongs in a FastAPI dependency, not in middleware, because middleware runs before routing and knows nothing about the matched path operation."
  ],
  iq: [
    { q: "In FastAPI you add middleware A, then B, then C with app.add_middleware(). In which order do they run for a request?", a: "C, then B, then A on the way in, and A, B, C on the way out. add_middleware() inserts at the front of the list, so the last added is the outermost. If you need a fixed order across services, add them in one function in the core package and never let teams add middleware before calling it. app.middleware('http') decorators follow the same rule because they call add_middleware internally.", c: `
app.add_middleware(A)
app.add_middleware(B)
app.add_middleware(C)
# request:  ServerErrorMiddleware -> C -> B -> A -> ExceptionMiddleware -> router
` },
    { q: "Your middleware raises HTTPException(401) when a header is missing, but the client receives a 500. Why?", a: "The HTTPException handler lives in ExceptionMiddleware, which is inside the user middleware stack. An exception raised in your middleware never reaches it; it travels outward to ServerErrorMiddleware, which only knows how to produce a 500. The fix is to build and send the 401 response yourself in the middleware, or to move the check into a dependency where FastAPI's handlers apply." },
    { q: "Why is setting a contextvar inside BaseHTTPMiddleware.dispatch, after call_next, often useless?", a: "call_next runs the inner application in a separate task. Context variables are copied into a new task when it starts, so values set before call_next are visible downstream, but values set downstream are not visible to dispatch afterwards, and values set after call_next cannot affect the endpoint that already ran. For request-scoped context, set the variable before calling the inner app, in pure ASGI middleware, and reset it in a finally block." },
    { q: "How do you refuse a 2 GB upload without reading it into memory?", a: "Check the Content-Length header first and reject immediately with a 413 if it is above the limit; this costs nothing. Clients can omit or lie about Content-Length with chunked encoding, so also wrap receive() and count the bytes of every http.request message, stopping as soon as the total passes the limit. Never call request.body() in middleware to check the size, because that reads the whole thing." }
  ],
  tips: [
    "Put the request ID into scope['state'] as well as a contextvar. Route code reads it as request.state.request_id and log formatters read the contextvar; both stay in sync.",
    "Use the exact header name X-Request-ID across the whole company and configure the load balancer or ingress to generate it when missing. Then even the first log line of the first service has the same ID the client saw.",
    "Test pure ASGI middleware without a server: wrap a tiny async app that records what it received, and call the middleware with a hand-made scope dictionary. It runs in microseconds and needs no HTTP client.",
    "Keep middleware free of awaits on external systems (database, Redis). One slow call there delays every request in the service, including health checks. Do that work lazily in a dependency only for the routes that need it."
  ]
});

EXTRA(24, "Custom middleware and DRF customisation in Django", {
  deep: [
    "Django builds the middleware chain once at startup in BaseHandler.load_middleware(). It walks the MIDDLEWARE list in reverse, so the last entry wraps the view directly and the first entry is the outermost. Each middleware factory is called with the next get_response, which is why __init__ runs once and __call__ runs per request. Besides __call__, a middleware may define process_view (runs after URL resolution, before the view), process_exception (runs when the view raises) and process_template_response. Django also checks the sync_capable and async_capable attributes: under ASGI, a sync-only middleware forces a thread switch for every request, which costs performance and can break the use of contextvars across the boundary. Shared middleware should set both flags and be written to work in both modes.",
    "DRF plugs into Django at the view. APIView.dispatch() wraps the Django request in a rest_framework Request, then calls initial(), which runs in this order: content negotiation, version detection, perform_authentication, check_permissions, check_throttles. Every pluggable class is looked up through a method such as get_permissions(), which reads self.permission_classes, which defaults to api_settings.DEFAULT_PERMISSION_CLASSES. The api_settings object reads the REST_FRAMEWORK dictionary lazily and imports dotted paths on first access, so a wrong path fails on the first request, not at startup. When the view raises, handle_exception() first converts NotAuthenticated into a 401 or 403 depending on whether the first authenticator defines a WWW-Authenticate header, then calls the function named by EXCEPTION_HANDLER. If that function returns None, DRF re-raises and Django produces a 500 through its own handler500 path.",
    "There are limits to what the REST_FRAMEWORK dictionary can centralise. It cannot change the shape of a successful non-paginated response; that requires a custom renderer or a custom Response class. Permission objects are combined with the & and | operators because BasePermission defines __and__ and __or__ returning OperandHolder objects; has_object_permission is only called if you call self.check_object_permissions() or use get_object(), so a list view never triggers it. Throttles depend on the cache backend; with the default local memory cache every worker process has its own counter, so a limit of 1000 per hour really means 1000 per worker. The shared throttle must point at Redis. Finally, do not force one pagination style on views that stream exports or return single aggregates; allow pagination_class = None where it is honest."
  ],
  iq: [
    { q: "Why does the DRF EXCEPTION_HANDLER not catch an exception raised in a Django middleware?", a: "DRF's handler is called from APIView.handle_exception(), which only wraps the view method. Middleware runs outside the view in Django's own handler chain, so an exception there goes to Django's process_exception hooks and finally to the 500 handler. To get the same error JSON for both, the core package provides a Django middleware that catches exceptions and renders the same problem-details body that the DRF handler renders." },
    { q: "A view sets permission_classes = [IsAuthenticated, HasScope] and a user with the right scope but no login gets a 403, not a 401. Why?", a: "DRF decides between 401 and 403 by asking the first authentication class whether it has an authenticate_header(). Session authentication has none, so DRF returns 403 for unauthenticated requests. Token or JWT authentication returns a WWW-Authenticate value, and then DRF returns 401. The order of DEFAULT_AUTHENTICATION_CLASSES therefore changes status codes, which is a good reason to fix that order in core." },
    { q: "How do you make one error response format for all nine Django APIs in the company without editing each view?", a: "Three pieces in the shared package: an EXCEPTION_HANDLER function that reshapes DRF exceptions, a Django middleware with process_exception for errors outside the view, and custom handler404 and handler500 views for URLs that never reach DRF. All three render the same JSON shape from one function. Teams add five lines to settings; they do not touch views.", c: `
# acme_core/django/handlers.py
from django.http import JsonResponse

def problem(status, title, detail=None, **extra):
    body = {"type": "about:blank", "title": title, "status": status, "detail": detail, **extra}
    return JsonResponse(body, status=status, content_type="application/problem+json")

def handler404(request, exception=None):
    return problem(404, "Not Found", request.path)

def handler500(request):
    return problem(500, "Internal Server Error")
` },
    { q: "Why can a UserRateThrottle of 100/min allow far more than 100 requests in production?", a: "Throttle counters are stored with the Django cache framework. If the cache is the default LocMemCache, each gunicorn worker and each server has its own memory, so the limit applies per process. With 8 workers on 4 servers, the real limit is up to 3200 per minute. Point the throttle at a shared Redis cache (the throttle class has a cache attribute) and the limit becomes global." }
  ],
  tips: [
    "Ship the shared REST_FRAMEWORK dictionary from core and let projects extend it: REST_FRAMEWORK = {**CORE_REST_FRAMEWORK, 'DEFAULT_THROTTLE_RATES': {'user': '5000/hour'}}. One import keeps 40 projects in sync.",
    "Give every shared DRF class a name that says what it does, such as StandardPagination or HasScope, and set required_scope on views as a plain class attribute. Reviewers can then see the access rule without opening another file.",
    "Add a Django system check (django.core.checks) in core that fails startup when the project is missing RequestContextMiddleware or uses LocMemCache with throttling. Checks run in manage.py and in CI, so the mistake never reaches production.",
    "Pin the DRF versioning scheme company-wide (for example URLPathVersioning with /v1/). Mixed schemes across services make API gateways and generated clients much harder to configure."
  ]
});

EXTRA(24, "Centralised exception handling and a standard error response", {
  deep: [
    "FastAPI stores exception handlers in two places. Handlers for Exception or for status 500 go to ServerErrorMiddleware, the outermost layer. Every other handler goes to ExceptionMiddleware, which sits just outside the router. When an exception escapes a route, ExceptionMiddleware walks type(exc).__mro__ and uses the first class that has a handler, so a handler registered for AppError also handles NotFound unless NotFound has its own, and a handler for Exception never runs here. ServerErrorMiddleware is different in one important way: after it sends the 500 response built by your handler, it re-raises the exception so the server (uvicorn) logs it and so TestClient surfaces it in tests. That is why your tests see the exception even though the client received a clean body, and why TestClient(app, raise_server_exceptions=False) exists.",
    "Validation is a special case. A bad request body raises RequestValidationError, which FastAPI maps to 422 with a list of errors from Pydantic; a route that returns data that does not match response_model raises ResponseValidationError, which is a server bug and should stay a 500. If a route calls a Pydantic model by hand and a ValidationError escapes, it is not a RequestValidationError and will become a 500 unless you add a handler. Database errors need care too: an IntegrityError on a unique index is often a 409, but mapping every IntegrityError to 409 hides foreign key failures that are really bugs. The safe pattern is to catch IntegrityError in the repository, inspect the constraint name, and raise Conflict only for the constraints you expect.",
    "The error body is a contract, so hide internals on purpose. Never put str(exc) of an unexpected exception into detail; it can contain SQL, file paths or secrets. Do include the request_id, because that is what support sends to engineering. Think also about where the body cannot help: once http.response.start has been sent, a crash in a streaming body cannot change the status code, so streaming endpoints must validate before they start sending. And do not centralise too far: the HTTP status attached to AppError is a convenience for web services, but a Celery worker or a gRPC server using the same exceptions needs its own mapping table. Keep the mapping at the edge and keep domain exceptions free of transport details when the same core is used by non-HTTP workloads."
  ],
  iq: [
    { q: "You register @app.exception_handler(Exception) that returns a nice 500 JSON. In tests, the exception still propagates. Why, and is it a bug?", a: "Handlers for Exception live in ServerErrorMiddleware, which sends your response and then re-raises so the server logs the traceback. It is by design. In tests either assert on the exception, or create TestClient(app, raise_server_exceptions=False) to receive the 500 body instead. In production the client sees the body and uvicorn logs the error.", c: `
from fastapi.testclient import TestClient
client = TestClient(app, raise_server_exceptions=False)
r = client.get("/boom")
assert r.status_code == 500 and r.json()["title"] == "Internal Server Error"
` },
    { q: "Why do we keep the exception hierarchy free of FastAPI imports if it carries HTTP status codes anyway?", a: "The status is data, not a dependency. Domain code can raise NotFound in a Celery task, in a CLI or in a test without FastAPI installed, and each edge decides what to do with the status. If the hierarchy imported HTTPException, every module that raises a domain error would import a web framework, and the same package could not be used from a worker that installs acme-core[celery] only." },
    { q: "How do you decide between 400, 409 and 422 for business rule failures, and why does consistency matter more than the exact choice?", a: "A common rule: 400 for malformed syntax, 422 for a well-formed request that fails validation or a business invariant, 409 when the request conflicts with current state such as a duplicate or a version mismatch. The exact choice is debated, but clients at a large company write one error handler, so what matters is that all services pick the same rule and document it. Put the rule in core and the API style guide, and enforce it with a Spectral lint on the OpenAPI document." },
    { q: "A junior engineer wraps the whole service in try/except Exception and returns {error: str(e)}. What is wrong with that?", a: "Three things. It leaks internals (SQL, hostnames, stack strings) to any caller, which is a security finding. It turns every bug into a 200 or 400 that monitoring does not count as an error, so the alert never fires. And it swallows the traceback unless it also logs with exc_info. The central handler does the opposite: generic body for the client, full traceback plus request_id in the logs, and a 5xx status that dashboards can count." }
  ],
  tips: [
    "Give every AppError subclass a code in dotted form (order.already_shipped, payment.card_declined) and generate the error catalogue page from the classes with a small script, so the type URL always points at real documentation.",
    "Add the request_id to the body and to a response header on all errors, including the ones produced by your API gateway and load balancer. Configure the gateway to return problem+json for its own 401, 429 and 503 so clients see one shape.",
    "Write one shared pytest fixture that asserts every error response has the problem+json content type and the required fields. Run it against all routes in the OpenAPI document; it catches a forgotten handler in a new service on day one.",
    "In Django, point handler404 and handler500 in urls.py to the core views that emit the same problem+json body, otherwise a wrong URL returns HTML while every other error returns JSON."
  ]
});

EXTRA(24, "Centralised logging and request context", {
  deep: [
    "A log call builds a LogRecord, then the record passes through the filters of the logger, then propagates up the logger tree to each handler, where the handler's own filters run before the formatter. Two details matter for shared code. First, filters attached to a logger do not run for records that come from child loggers through propagation; only handler filters see every record. That is why the ContextFilter is attached to the handler. Second, extra={...} keys become attributes of the record, and a key that collides with a built-in attribute such as name, msg or args raises KeyError, so the shared formatter publishes a list of reserved names and the CI lint flags collisions.",
    "contextvars behave like thread-locals that also understand asyncio. Each asyncio task gets a copy of the context at creation time, so a value set before create_task is visible in the task but a value set inside the task is not visible to the parent. asyncio.to_thread and anyio to_thread.run_sync copy the context into the worker thread; a plain ThreadPoolExecutor.submit does not, so a log line from such a thread will show request_id as the default. Process boundaries copy nothing: a Celery task runs in another process, so the request ID must travel in the message headers, and a task_prerun signal handler restores the contextvar. With OpenTelemetry, trace_id and span_id come from the current span, which is also stored in a contextvar, so the same rules apply.",
    "Failure modes are practical. Calling configure_logging twice adds a second handler and doubles every line unless the function replaces root.handlers, as the example does; this happens with gunicorn preload and with test runners. json.dumps on a Decimal, UUID or datetime raises TypeError and silently drops the line unless default=str is set. Logging the full request body or user email breaks privacy law; the shared formatter can mask known keys such as password and card_number, but teams must still think. Finally, do not centralise log content, only its shape. The platform fixes the reserved field names and the transport; what a team logs and at what level is their decision, because they are the ones who will read it at 3 am."
  ],
  iq: [
    { q: "Why can a log line from inside loop.run_in_executor show request_id as '-' when the same request's other lines have the right ID?", a: "run_in_executor submits the function to a ThreadPoolExecutor without copying the current context, so contextvars inside the worker thread have their default values. asyncio.to_thread (Python 3.9+) copies the context before running, so the values are present. In shared code, prefer asyncio.to_thread or pass contextvars.copy_context().run explicitly.", c: `
import asyncio, contextvars

# loses the request id
await loop.run_in_executor(None, heavy_work)
# keeps the request id
await asyncio.to_thread(heavy_work)
# explicit alternative
ctx = contextvars.copy_context()
await loop.run_in_executor(None, ctx.run, heavy_work)
` },
    { q: "How does a request ID reach a Celery task started by a FastAPI request, and how do logs inside the task get it?", a: "The producer side puts the current request ID into the task headers, for example with apply_async(headers={'request_id': rid}) or through a before_task_publish signal in the core package. On the worker side a task_prerun signal handler reads task.request.headers and sets the contextvar; task_postrun resets it. Because both halves live in core, teams get correlation without touching their task code." },
    { q: "Why attach the context filter to the handler rather than to the logger returned by getLogger('acme')?", a: "Logger filters only apply to records created on that exact logger. Records created on acme.orders propagate to the parent's handlers, but the parent's logger-level filters are skipped. A filter on the root handler runs for every record from every logger, including third-party libraries, which is what you want for request_id." },
    { q: "Your JSON logs are 3 KB per line and the log bill tripled. What do you change centrally?", a: "Drop exc fields for expected exceptions, log the access line once (disable uvicorn.access, keep your middleware line), sample DEBUG in production or disable it, and set reserved field names short but readable. Also move high-volume numeric data to metrics; a counter costs nothing per event, a log line costs storage and indexing. All of these are one change in core, which is the point of owning the setup." }
  ],
  tips: [
    "Set user_id_var in the auth dependency, not in middleware, because the middleware runs before the token is verified. Reset it in the same dependency with a yield so it never leaks into the next request on the same worker.",
    "Add a tiny log.bind style helper in core that returns a LoggerAdapter with fixed extra fields, so a job that loops over 1,000 tenants can write log.info once per tenant without repeating extra={'tenant': ...} on every line.",
    "In local development switch the formatter to a coloured plain-text one with the same fields when sys.stdout.isatty() is true. Developers keep using the same API and the JSON format stays untouched in containers.",
    "Keep an integration test that boots the app, calls one endpoint and parses every stdout line as JSON. It fails the build when someone adds a print() or a library writes plain text to stdout."
  ]
});

EXTRA(24, "Centralised configuration and feature flags", {
  deep: [
    "pydantic-settings builds a value for each field by asking a list of sources in order and taking the first that has it: init kwargs, environment variables, dotenv files, a secrets directory (one file per field), and finally field defaults. The order can be changed by overriding settings_customise_sources(), which is how a company adds a Vault, AWS Parameter Store or Kubernetes ConfigMap source without every team writing glue code. Names are matched case-insensitively by default, an env_prefix can namespace them, and env_nested_delimiter='__' turns DATABASE__POOL_SIZE into settings.database.pool_size on a nested model. SecretStr hides the value in repr and in logs, and you must call get_secret_value() to use it, which makes an accidental log of settings harmless.",
    "The settings object should be built once. In FastAPI the common pattern is a get_settings() function wrapped in functools.lru_cache and used as a dependency, so tests override it with app.dependency_overrides or build Settings(_env_file=None, database_url=...) by hand. Building settings at import time of a module makes it impossible to import that module in a test without the whole production environment. Fail fast is a feature: a required field with no value raises ValidationError at startup, the pod never becomes ready, and the deploy rolls back automatically instead of failing on the first request at night.",
    "Feature flags have their own failure modes. Reading the flag store on every request adds a network call to the hot path; a local cache with a short TTL keeps it cheap but means a kill switch takes up to TTL seconds. If the store is down, decide in advance: new features should fail closed (off) while a kill switch should be remembered from the last good read. Percentage rollout must hash a stable subject; hashing the request ID gives a new answer every request and a user sees two different checkouts. And flags are debt: every flag doubles the test matrix of the code around it, so they should be short-lived release tools, not a permanent configuration system. Long-lived per-tenant behaviour belongs in the tenant settings table, not in a flag."
  ],
  iq: [
    { q: "DATABASE_URL is set in the environment and also in .env with a different value. Which one does pydantic-settings use, and why is that the right order?", a: "The environment variable wins, because environment sources are consulted before dotenv files. This is intentional: .env is a developer convenience that is committed or shared, while the environment is what the orchestrator controls. Production should not ship a .env at all, so a stray file can never override a real secret." },
    { q: "How would you add HashiCorp Vault as a settings source for every service without changing each service?", a: "In the CoreSettings base class override settings_customise_sources() and return the standard sources plus a custom PydanticBaseSettingsSource that reads from Vault. Put it after environment variables so an explicit env var still wins for debugging. Every subclass inherits the behaviour, and a service that cannot reach Vault gets a clear startup error from the source rather than a None value later.", c: `
from pydantic_settings import BaseSettings, PydanticBaseSettingsSource

class VaultSource(PydanticBaseSettingsSource):
    def get_field_value(self, field, field_name):
        value = vault_client.read(f"secret/{self.config.get('env_prefix', '')}{field_name}")
        return value, field_name, False
    def __call__(self):
        return {name: self.get_field_value(f, name)[0] for name, f in self.settings_cls.model_fields.items()
                if self.get_field_value(f, name)[0] is not None}

class CoreSettings(BaseSettings):
    @classmethod
    def settings_customise_sources(cls, settings_cls, init_settings, env_settings, dotenv_settings, file_secret_settings):
        return (init_settings, env_settings, VaultSource(settings_cls), dotenv_settings, file_secret_settings)
` },
    { q: "Why do we hash the subject for percentage rollout instead of calling random.random() < percent?", a: "A random draw gives a different answer each time, so one user sees the new feature on one request and the old one on the next, which breaks multi-step flows and makes bug reports impossible to reproduce. Hashing flag name plus user or tenant ID gives a stable bucket from 0 to 99, so raising the percentage only adds users and never removes anyone who already had it." },
    { q: "What is the difference between a feature flag and configuration, and what goes wrong when teams mix them?", a: "A flag is a temporary switch that controls the release of a code path and is removed once the path is permanent. Configuration is long-lived input such as timeouts, URLs and limits. When teams use flags as configuration, the flag store fills with hundreds of permanent switches nobody dares to delete, the code keeps both branches forever, and the test matrix explodes. When they use config for release, they need a deploy to turn a feature off, which is too slow during an incident." }
  ],
  tips: [
    "Expose a /config endpoint behind admin auth that returns settings.model_dump() with SecretStr fields shown as asterisks. During an incident it answers in one second which value a pod really has.",
    "Add a startup check in core that refuses to run with env=prod when debug is true, when the database URL points at localhost, or when a .env file exists in the working directory. These three mistakes have caused real outages.",
    "Name flags with a prefix and a ticket: checkout.new-flow.PAY-1234. The ticket gives the owner and the removal date, and a weekly job lists flags whose ticket is closed.",
    "Emit a metric per flag evaluation (flag name, result). When a flag has evaluated to the same value for every request for 30 days, it is dead and can be removed together with the old branch."
  ]
});

EXTRA(24, "Reusable decorators and context managers", {
  deep: [
    "functools.wraps does more than copy the name. It copies __module__, __name__, __qualname__, __doc__ and __annotations__, updates __dict__, and sets wrapper.__wrapped__ to the original. inspect.signature follows __wrapped__ by default, which is why FastAPI still sees the real parameters of a decorated path operation and can inject dependencies. If a decorator adds or removes parameters, it must also set wrapper.__signature__ explicitly, otherwise FastAPI will try to validate parameters that no longer exist. Decorators also run at import time, once per function definition, so anything expensive in the decorator factory (opening a Redis connection, reading a file) runs when the module is imported, including in tests that only import it.",
    "Async changes the rules. A coroutine function returns a coroutine object immediately; nothing runs until it is awaited. A sync wrapper that calls fn(*args) and wraps it in try/except catches nothing, measures nothing and returns the coroutine unchanged. The shared implementation checks inspect.iscoroutinefunction(fn) and returns an async wrapper that awaits inside the try. Timeouts in async code use asyncio.timeout() or asyncio.wait_for(), which cancel the task; in sync code a timeout can only be enforced by the called library (socket timeouts) or by running in another thread, so the shared timeout() decorator documents that difference instead of pretending. Stacking is composition of wrappers: retry outside timeout means each attempt gets a fresh timeout; timeout outside retry means the total budget covers all attempts. Retry outside transactional means a failed attempt is rolled back and retried as a whole; the other order retries inside a broken transaction, which PostgreSQL rejects.",
    "A contextlib.contextmanager generator runs until yield on enter, and on exit the exception is thrown into the generator at the yield. If the generator catches it and returns normally, the exception is suppressed, which is almost never what a shared audit or transaction helper wants; always re-raise. A generator that yields twice raises RuntimeError. For nested resources, contextlib.ExitStack and AsyncExitStack unwind in reverse order even when one exit fails. When should you not centralise with a decorator? When the behaviour depends on business state (retry only if the order is still open) or when the stack gets so deep that nobody can predict the order; a plain service method with explicit calls is then clearer. And never put a cache decorator on a method whose first argument is self without a key function; the key then includes the object identity and the cache never hits."
  ],
  iq: [
    { q: "A FastAPI endpoint decorated with a home-made @log_calls starts returning 422 for every request. What happened?", a: "The decorator did not use functools.wraps, so the wrapper's signature is (*args, **kwargs). FastAPI builds the request model from inspect.signature and now sees no parameters, or sees args and kwargs as query parameters, so it rejects real inputs. Adding @functools.wraps(fn) restores __wrapped__ and the original signature.", c: `
import functools

def log_calls(fn):
    @functools.wraps(fn)          # without this line FastAPI loses the parameters
    async def wrapper(*args, **kwargs):
        return await fn(*args, **kwargs)
    return wrapper
` },
    { q: "Explain what happens with @retry(3) @timeout(2) async def f() versus @timeout(2) @retry(3) async def f().", a: "In the first case retry is outermost and timeout wraps each call, so the function may run three times with two seconds each, up to six seconds plus backoff. In the second case timeout wraps the whole retry loop, so all attempts share one two-second budget and the second attempt usually gets cut off. The company standard puts retry outside timeout so every attempt is a fair attempt." },
    { q: "Why is a retry decorator around a function that does session.commit() dangerous, and how do you make it safe?", a: "If the commit reached the database but the acknowledgement was lost, the retry writes the row twice. Retries are safe only around idempotent work. Make the operation idempotent first: a unique key on a natural identifier or an idempotency key column, so the second attempt fails on the constraint and is treated as success. Also put retry outside the transaction so the whole unit is retried, not a statement inside a transaction that PostgreSQL has already marked as failed." },
    { q: "How does a contextmanager-based transactional() helper receive the exception, and what is the bug in a helper that catches Exception and only logs it?", a: "On exit, contextlib throws the exception into the generator at the yield point, so the code after yield in an except block runs. A helper that catches and does not re-raise suppresses the exception: the caller believes the block succeeded, the response is 200, and the data was rolled back. Shared helpers must roll back and then re-raise.", c: `
@contextmanager
def transactional(session):
    try:
        yield session
        session.commit()
    except BaseException:
        session.rollback()
        raise                # never swallow
` }
  ],
  tips: [
    "Give every shared decorator a parameter to disable it from settings, for example retry(enabled=settings.retries_enabled). In load tests you can then measure the raw dependency without changing code.",
    "Have each decorator emit a metric with the function name as a label (retry attempts, timeouts hit, cache hits). A dashboard of retries per function finds the flaky dependency before it becomes an incident.",
    "Prefer small, single-purpose decorators and a documented stacking order over one big @resilient() that does everything. A reviewer can read three lines of decorators; nobody can read ten keyword arguments.",
    "When wrapping a method, use key functions that ignore self: cached(key=lambda self, user_id: f'user:{user_id}'). Test it by calling the method on two different instances and asserting a single backend call."
  ]
});
