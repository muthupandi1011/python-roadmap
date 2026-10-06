ROADMAP.push({
n: 24, track: "Enterprise engineering",
title: "MNC-Level Customization and Centralization",
blurb: "How large companies build one shared way of doing each cross-cutting thing, so that 50 services and 200 developers behave the same.",
topics: [
X("Why centralise: cross-cutting concerns and the internal 'core' library",
["In a small team one service has one logging format, one error shape and one way to read settings. At a large company there are 50 services written by 200 developers over five years. If every team invents its own request ID header, its own retry logic and its own error JSON, nothing fits together. An on-call engineer cannot read logs across services, the frontend needs a different error parser per API, and a security fix must be applied 50 times. These shared needs are called cross-cutting concerns: logging, errors, config, auth, HTTP clients, metrics, tracing, caching and health checks.",
 "The standard answer is an internal 'core' package, often named after the company, for example acme-core. It is a normal Python package published to a private index (Artifactory, Nexus, AWS CodeArtifact, GitHub Packages). It contains the building blocks that every service needs and that have nothing to do with any one business domain. It ships with sensible defaults and a few extension points, so a team customises by passing settings or subclassing, not by copying the code. Business logic never goes into core: no Order model, no pricing rule, no customer-specific field.",
 "Centralisation has a price. One package is a single point of failure: a bad release can break 50 deployments at once. So the core package is versioned with semantic versioning, every change has a changelog entry, breaking changes are announced with a deprecation period, and the platform team upgrades two or three friendly services first before asking everyone to move. Adoption is made easy: a one-line create_app() helper, a service template that already uses core, and a bot (Renovate or Dependabot) that opens upgrade pull requests. Teams are not forced on day one; they are pulled in because the shared way is the easiest way."],
["Cross-cutting concern = something every service needs that is not business logic: logging, errors, config, auth, HTTP, metrics, tracing, caching, health.",
 "A core package contains defaults plus extension points. Teams configure or subclass; they do not fork.",
 "Business logic and domain models never live in core. If only one team needs it, it is not core.",
 "Core is published to a private package index and pinned with a version range, for example acme-core>=3.2,<4.",
 "Semantic versioning, a changelog and a deprecation window are the contract between the platform team and the product teams.",
 "Use optional extras (acme-core[fastapi], acme-core[django]) so a Celery worker does not install FastAPI.",
 "Roll out to a few canary services first. A bad core release is a company-wide incident."],
"A payments company had 40 Python services and three different request ID headers. After a two-hour incident where logs from four services could not be joined, the platform team created acme-core with one RequestContextMiddleware and one JSON log format. Six months later 38 of the 40 services used it, and the average incident investigation time dropped from hours to minutes.",
`
# Layout of the shared package (one repo, published to the internal index)
# acme-core/
#   pyproject.toml
#   src/acme_core/logging.py        JSON logging + request context
#   src/acme_core/errors.py         error hierarchy + handlers
#   src/acme_core/settings.py       BaseSettings with company defaults
#   src/acme_core/http.py           httpx client with retries and tracing
#   src/acme_core/fastapi/app.py    create_app() that wires everything
#   CHANGELOG.md

# pyproject.toml (the part that matters)
[project]
name = "acme-core"
version = "3.2.0"
requires-python = ">=3.11"
dependencies = ["pydantic>=2.5,<3", "pydantic-settings>=2,<3", "httpx>=0.27,<1"]

[project.optional-dependencies]
fastapi = ["fastapi>=0.110", "opentelemetry-instrumentation-fastapi"]
django = ["django>=4.2", "djangorestframework>=3.15"]
celery = ["celery>=5.3"]

# src/acme_core/fastapi/app.py
from fastapi import FastAPI
from acme_core.errors import install_error_handlers
from acme_core.logging import configure_logging, RequestContextMiddleware
from acme_core.settings import CoreSettings

def create_app(name: str, settings: CoreSettings, **kwargs) -> FastAPI:
    configure_logging(service=name, level=settings.log_level)
    app = FastAPI(title=name, version=settings.release, **kwargs)
    app.add_middleware(RequestContextMiddleware)
    install_error_handlers(app)

    @app.get("/healthz", include_in_schema=False)
    def healthz():
        return {"status": "ok", "service": name}

    return app

# ---- a product team's service: orders/main.py (the whole file) ----
from acme_core.fastapi.app import create_app
from orders.settings import settings      # subclass of CoreSettings
from orders.api import router

app = create_app("orders", settings)
app.include_router(router, prefix="/v1")
`,
"The term cross-cutting concern comes from aspect-oriented programming work at Xerox PARC in the late 1990s (AspectJ, 2001). Shared company libraries became common with Java frameworks such as Spring, and Netflix made the idea of a platform team that ships shared building blocks widely known in the 2010s.",
[["Packaging Python projects (official guide)", "https://packaging.python.org/en/latest/tutorials/packaging-projects/"],
 ["Hosting your own package index", "https://packaging.python.org/en/latest/guides/hosting-your-own-index/"],
 ["Semantic Versioning 2.0.0", "https://semver.org/"]]),

X("Custom middleware in FastAPI and ASGI",
["Middleware is code that runs around every request. At scale, every service needs the same middleware: read or create a request ID, measure time, refuse bodies that are too large, add security headers. When each team writes its own version, one service returns X-Request-ID, another returns X-Correlation-Id, and a third forgets it on error responses. Load balancers and log pipelines then cannot follow one request through the system.",
 "FastAPI runs on Starlette, and Starlette runs on the ASGI protocol. An ASGI application is simply an async callable that receives scope (the request metadata), receive (a function that gives request body chunks) and send (a function that takes response messages). A pure ASGI middleware is a class with that same signature that wraps another app. The core package ships one RequestContextMiddleware written this way, because it is the fastest and the most correct form. FastAPI also offers BaseHTTPMiddleware with a simple dispatch(request, call_next) method; it is easier to read, but it runs the inner app in a separate task, converts every response into a streaming response and has known limits with context variables and background tasks, so core avoids it.",
 "Order matters. In Starlette, each call to app.add_middleware() inserts the new middleware at the outside of the stack, so the last one added runs first. The core create_app() therefore adds middleware in one fixed order: request context outermost, then security headers, then body limits, then anything a team adds. Teams customise through constructor arguments such as max_body, not by rewriting the class. When the platform team changes the header name or the timing format, it ships one minor release and every service gets it on the next deploy."],
["ASGI app = async callable(scope, receive, send). A pure ASGI middleware has the same shape and stores the inner app.",
 "scope['headers'] is a list of (bytes, bytes) pairs with lower-case names. Decode before use and encode before sending.",
 "add_middleware() puts the newest middleware on the outside, so add the one that must run first last.",
 "BaseHTTPMiddleware is convenient but runs the app in another task and wraps the response in a stream; prefer pure ASGI in shared code.",
 "Limit body size by counting bytes in a wrapped receive(), not by reading the whole body into memory.",
 "Middleware must ignore non-HTTP scopes (lifespan, websocket) or pass them straight through.",
 "Set and reset contextvars with a token in a try/finally so one request cannot leak its ID into the next."],
"An e-commerce company found that 30 percent of its requests had no request ID in the logs because several teams used BaseHTTPMiddleware and set the ID after call_next on error paths. The platform team replaced all of them with one pure ASGI middleware in acme-core that sets the header on every http.response.start message, and the gap went to zero.",
`
# acme_core/fastapi/middleware.py
import time
import uuid
from contextvars import ContextVar
from starlette.exceptions import HTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

class RequestContextMiddleware:
    """Pure ASGI middleware: X-Request-ID, Server-Timing and a body size limit."""

    def __init__(self, app: ASGIApp, max_body: int = 1_000_000) -> None:
        self.app = app
        self.max_body = max_body

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope["headers"])
        rid = headers.get(b"x-request-id", b"").decode() or uuid.uuid4().hex
        declared = int(headers.get(b"content-length", b"0") or 0)
        if declared > self.max_body:
            await self._reject(send, rid)          # fast path, body never read
            return

        token = request_id_var.set(rid)
        start = time.perf_counter()
        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_body:      # raised inside the router, so handled as 413
                    raise HTTPException(status_code=413, detail="Request body too large")
            return message

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                ms = (time.perf_counter() - start) * 1000
                extra = [(b"x-request-id", rid.encode()), (b"server-timing", f"app;dur={ms:.1f}".encode())]
                message["headers"] = list(message.get("headers", [])) + extra
            await send(message)

        try:
            await self.app(scope, limited_receive, send_with_headers)
        finally:
            request_id_var.reset(token)

    async def _reject(self, send: Send, rid: str) -> None:
        body = b'{"title":"Payload Too Large","status":413}'
        await send({"type": "http.response.start", "status": 413,
                    "headers": [(b"content-type", b"application/problem+json"),
                                (b"content-length", str(len(body)).encode()),
                                (b"x-request-id", rid.encode())]})
        await send({"type": "http.response.body", "body": body})

# ---- a team's service ----
from fastapi import FastAPI
app = FastAPI()
app.add_middleware(RequestContextMiddleware, max_body=5_000_000)   # upload service needs 5 MB
`,
"ASGI (Asynchronous Server Gateway Interface) was designed by Andrew Godwin for Django Channels and published as a specification in 2016 as the async successor of WSGI (PEP 3333, 2010). Starlette, written by Tom Christie in 2018, made pure ASGI middleware a common pattern, and FastAPI has been built on it since its first release in December 2018.",
[["FastAPI: advanced middleware", "https://fastapi.tiangolo.com/advanced/middleware/"],
 ["Starlette: middleware (pure ASGI and BaseHTTPMiddleware)", "https://starlette.dev/middleware/"],
 ["ASGI specification", "https://asgi.readthedocs.io/en/latest/specs/main.html"]]),

X("Custom middleware and DRF customisation in Django",
["Django projects at a large company have the same problem as FastAPI projects, plus one more: Django REST Framework has many pluggable classes (authentication, permission, throttle, pagination, renderer, parser, exception handler) and every project picks its own. One API returns a bare list, another returns {results: [...]}, a third returns {data: [...], meta: {...}}. Error bodies differ even more. Frontend and mobile teams then write a special case for every backend.",
 "Django middleware is a callable that takes get_response and returns a callable that takes a request. The order in the MIDDLEWARE setting is the order for the request path, and the response goes back through the same list in reverse. The core package ships a RequestContextMiddleware for Django that does the same job as the FastAPI one: request ID, timing, one access log line. For DRF, core ships one class for each pluggable point: StandardPagination with a fixed envelope, HasScope permission that reads scopes from the token, a throttle with company default rates, and an exception handler that produces the standard error shape. These are activated in one place, the REST_FRAMEWORK dictionary in settings, so a team adopts all of them by copying five lines.",
 "Customisation stays local. A view that needs a different page size sets page_size on the view; a view that needs a special permission combines HasScope with another class using the & and | operators that DRF supports. The exception handler calls DRF's default handler first and only reshapes the result, so DRF's own behaviour for Http404, PermissionDenied and ValidationError is kept. When core changes the envelope, the version bump is a major one, and the platform team ships a migration note for frontend teams at the same time."],
["Django MIDDLEWARE runs top to bottom on the way in and bottom to top on the way out. __init__ runs once at startup, __call__ once per request.",
 "DRF looks for permission_classes, throttle_classes, pagination_class and renderer_classes on the view first, then in REST_FRAMEWORK defaults.",
 "The EXCEPTION_HANDLER setting is a dotted path to a function(exc, context). Call DRF's default handler inside it and reshape the result.",
 "Permission classes can be combined: permission_classes = [IsAuthenticated & (HasScope | IsAdminUser)].",
 "The DRF exception handler only sees exceptions raised inside the view. Exceptions in Django middleware go to Django's own error handling.",
 "Keep the shared settings in one acme_core.django.settings module and import them: from acme_core.django.settings import REST_FRAMEWORK.",
 "A custom renderer is the right place for an envelope that must apply to every response, including non-paginated ones."],
"A bank's internal portal talked to nine Django APIs. Each had a different pagination style, so the React team had nine pagination adapters. The platform team published acme-core with StandardPagination and a shared exception handler, made it the default in the service template, and gave teams two quarters to move. The React team deleted eight adapters.",
`
# acme_core/django/middleware.py
import logging, time, uuid
from acme_core.context import request_id_var

log = logging.getLogger("acme.request")

class RequestContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response            # called once at startup

    def __call__(self, request):
        rid = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        token = request_id_var.set(rid)
        start = time.perf_counter()
        try:
            response = self.get_response(request)
        finally:
            request_id_var.reset(token)
        response["X-Request-ID"] = rid
        log.info("request", extra={"path": request.path, "status": response.status_code,
                                   "ms": round((time.perf_counter() - start) * 1000, 1)})
        return response

# acme_core/drf/pagination.py
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class StandardPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 500

    def get_paginated_response(self, data):
        return Response({"data": data, "meta": {"page": self.page.number,
                         "page_size": self.get_page_size(self.request),
                         "total": self.page.paginator.count}})

# acme_core/drf/permissions.py
from rest_framework.permissions import BasePermission

class HasScope(BasePermission):
    def has_permission(self, request, view):
        needed = getattr(view, "required_scope", None)
        scopes = getattr(request.auth, "scopes", None) or []
        return needed is None or needed in scopes

# acme_core/drf/exceptions.py
from rest_framework.views import exception_handler

def problem_exception_handler(exc, context):
    response = exception_handler(exc, context)      # DRF handles APIException, Http404, PermissionDenied
    if response is None:
        return None                                 # unknown error: let Django return 500
    response.data = {"type": "about:blank", "title": exc.__class__.__name__,
                     "status": response.status_code, "detail": response.data}
    return response

# ---- a team's settings.py ----
MIDDLEWARE = ["acme_core.django.middleware.RequestContextMiddleware",
              "django.middleware.security.SecurityMiddleware",
              "django.contrib.sessions.middleware.SessionMiddleware",
              "django.middleware.common.CommonMiddleware",
              "django.contrib.auth.middleware.AuthenticationMiddleware"]
REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "acme_core.drf.pagination.StandardPagination",
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated", "acme_core.drf.permissions.HasScope"],
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.UserRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {"user": "1000/hour"},
    "EXCEPTION_HANDLER": "acme_core.drf.exceptions.problem_exception_handler",
}
`,
"Django's current middleware style (a callable wrapping get_response) arrived in Django 1.10 in 2016 and replaced the older process_request and process_response class style. Django REST Framework was created by Tom Christie in 2011 and its pluggable permission, throttle and pagination classes have been part of its design since version 2 in 2012.",
[["Django: writing your own middleware", "https://docs.djangoproject.com/en/5.2/topics/http/middleware/#writing-your-own-middleware"],
 ["DRF: permissions", "https://www.django-rest-framework.org/api-guide/permissions/"],
 ["DRF: exceptions and custom exception handling", "https://www.django-rest-framework.org/api-guide/exceptions/"]]),

X("Centralised exception handling and a standard error response",
["Every service has errors: a missing order, a duplicate email, a bad request body, a crashed database call. When each team handles them alone, one API returns {error: 'not found'}, another returns {message: ..., code: 42}, a third leaks a full SQL statement in a 500 page. Clients cannot write one error handler, support staff cannot search for a stable error code, and security reviewers find stack traces in production responses.",
 "The central design has three parts. First, a small exception hierarchy in the core package: AppError at the top, with NotFound, Conflict, Forbidden and DomainRuleViolation below it, each carrying an HTTP status, a stable machine-readable code and a human title. Domain code raises these and never imports anything from FastAPI or Django. Second, one response format for every error, following RFC 9457 Problem Details: a JSON body with type, title, status, detail and instance, plus company extensions such as request_id and a list of field errors. The content type is application/problem+json. Third, a function install_error_handlers(app) that registers handlers for AppError, request validation errors, plain HTTPException and finally Exception, so that an unexpected crash is logged with its traceback but answered with a generic 500 body that hides every internal detail.",
 "Teams customise by adding subclasses of AppError in their own service for their own domain rules, with their own codes. They do not add new handlers. The error codes are documented in one place and the type URL points to that page, so a mobile developer can look up what payment.card_declined means. Changes to the body format are a major version of core, because every client depends on it; new optional fields are a minor version."],
["One exception hierarchy in core; domain code raises AppError subclasses and knows nothing about HTTP.",
 "One body shape for all errors (RFC 9457 Problem Details): type, title, status, detail, instance plus request_id and errors[].",
 "Stable machine-readable codes such as order.not_found; messages can change, codes cannot.",
 "Validation errors map to 422 with a list of field errors; business rule violations also map to 422 or 409, never to 500.",
 "The last handler catches Exception, logs the traceback with the request ID and returns a generic body. Internals never leak.",
 "FastAPI finds the handler by walking the exception class MRO, so one AppError handler covers every subclass.",
 "Return the same shape from Django, DRF, FastAPI and even from the API gateway, so clients have one error parser."],
"A travel company's mobile app had a 2,000-line error parsing module because each of 12 backend services spoke a different error dialect. After the platform team shipped install_error_handlers() in acme-core and gateways were configured to emit the same problem+json shape for 401 and 429, the app replaced the module with 40 lines and started showing the request_id on its error screen, which cut support ticket handling time by half.",
`
# acme_core/errors.py
import logging
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("acme.errors")

class AppError(Exception):
    status, title, code = 500, "Internal Server Error", "internal"
    def __init__(self, detail: str | None = None, **extra):
        self.detail, self.extra = detail, extra
        super().__init__(detail or self.title)

class NotFound(AppError):            status, title, code = 404, "Not Found", "not_found"
class Conflict(AppError):            status, title, code = 409, "Conflict", "conflict"
class Forbidden(AppError):           status, title, code = 403, "Forbidden", "forbidden"
class DomainRuleViolation(AppError): status, title, code = 422, "Unprocessable Content", "domain_rule"

def problem(request: Request, status: int, title: str, detail=None, code="internal", **extra) -> JSONResponse:
    body = {"type": f"https://errors.acme.com/{code}", "title": title, "status": status,
            "detail": detail, "instance": request.url.path,
            "request_id": request.headers.get("x-request-id"), **extra}
    return JSONResponse(body, status_code=status, media_type="application/problem+json")

def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def on_app_error(request: Request, exc: AppError):
        return problem(request, exc.status, exc.title, exc.detail, exc.code, **exc.extra)

    @app.exception_handler(RequestValidationError)
    async def on_validation(request: Request, exc: RequestValidationError):
        errors = [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
        return problem(request, 422, "Validation Failed", code="validation", errors=errors)

    @app.exception_handler(StarletteHTTPException)
    async def on_http(request: Request, exc: StarletteHTTPException):
        return problem(request, exc.status_code, str(exc.detail), code="http")

    @app.exception_handler(Exception)
    async def on_unexpected(request: Request, exc: Exception):
        log.exception("unhandled error")           # full traceback goes to the logs only
        return problem(request, 500, "Internal Server Error")   # nothing about the cause leaks

# ---- a team's service: orders/service.py ----
from acme_core.errors import NotFound, DomainRuleViolation

class OrderAlreadyShipped(DomainRuleViolation):
    code = "order.already_shipped"

def cancel(order_id: int, repo) -> None:
    order = repo.get(order_id)
    if order is None:
        raise NotFound(f"order {order_id} does not exist")
    if order.shipped_at is not None:
        raise OrderAlreadyShipped("shipped orders cannot be cancelled", order_id=order_id)
    repo.cancel(order)
`,
"Problem Details for HTTP APIs was first published as RFC 7807 in March 2016 by Mark Nottingham and Erik Wilde, and was updated and replaced by RFC 9457 in July 2023. Structured exception hierarchies as a way to separate domain errors from transport errors are much older and are described in Domain-Driven Design (Eric Evans, 2003).",
[["RFC 9457: Problem Details for HTTP APIs", "https://www.rfc-editor.org/rfc/rfc9457.html"],
 ["FastAPI: handling errors and custom exception handlers", "https://fastapi.tiangolo.com/tutorial/handling-errors/"],
 ["DRF: custom exception handling", "https://www.django-rest-framework.org/api-guide/exceptions/"]]),

X("Centralised logging and request context",
["Logs are the first tool during an incident. At scale they are useless unless they are machine-readable and joinable. If one service writes plain text lines, another writes JSON with a field named reqId and a third writes JSON with request_id, the log platform (Elasticsearch, Loki, Datadog, Splunk) cannot build one timeline for one user action. Developers also forget to add the request ID to every log call, so half the lines in a trace are orphans.",
 "The core package owns logging setup completely. configure_logging(service, level) installs one JSON formatter on the root logger, writing to stdout so that Docker and Kubernetes collect it. The formatter adds fixed fields: timestamp, level, logger name, service, release, request_id, user_id, trace_id and span_id. The request-scoped values come from contextvars, which are set once per request by the shared middleware and read by a logging filter on every record. Developers do not pass the request ID around; they just call log.info('order created', extra={'order_id': 918}) and the shared fields appear automatically. Because contextvars are copied into every asyncio task and every asyncio.to_thread call, the values follow the request through await points.",
 "Correlation across services works because every outgoing call carries the same request ID and the W3C traceparent header, and every Celery task receives the request ID in its headers and restores the contextvar before running. The log pipeline then groups by request_id or trace_id. The platform team controls the reserved field names and the format; teams are free to add any extra fields they like. Field name changes are a breaking change for dashboards, so they are rare and announced."],
["Log JSON to stdout; the platform collects it. Never write log files inside a container.",
 "Reserved fields come from core: ts, level, logger, service, release, request_id, user_id, trace_id, span_id, msg.",
 "Use contextvars, not thread locals, for request context. They work with asyncio tasks and with asyncio.to_thread.",
 "A logging.Filter on the handler copies the contextvars into every record, so no developer has to remember.",
 "Pass extra={...} for structured fields. Do not format values into the message string; you cannot search inside a string.",
 "Propagate request_id and traceparent to every outgoing HTTP call and every Celery task.",
 "Silence noisy loggers (uvicorn.access, httpx) centrally and keep one access log line per request from your own middleware."],
"During a Black Friday incident an online retailer could not tell which of 14 services was slow because each logged differently. After moving to the shared JSON format with trace_id in every line, an engineer typed one trace ID into the log tool and saw the whole path of the request in order, with timings, and found a 4-second call to a currency service in under five minutes.",
`
# acme_core/logging.py
import json, logging, sys
from contextvars import ContextVar
from datetime import datetime, timezone
from opentelemetry import trace

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")
user_id_var: ContextVar[str] = ContextVar("user_id", default="-")

class ContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        record.user_id = user_id_var.get()
        ctx = trace.get_current_span().get_span_context()
        record.trace_id = format(ctx.trace_id, "032x") if ctx.is_valid else "-"
        record.span_id = format(ctx.span_id, "016x") if ctx.is_valid else "-"
        return True

class JsonFormatter(logging.Formatter):
    STANDARD = set(vars(logging.LogRecord("", 0, "", 0, "", (), None))) | {"message", "asctime"}
    OURS = {"request_id", "user_id", "trace_id", "span_id"}

    def __init__(self, service: str, release: str) -> None:
        super().__init__()
        self.service, self.release = service, release

    def format(self, record: logging.LogRecord) -> str:
        payload = {"ts": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
                   "level": record.levelname, "logger": record.name, "msg": record.getMessage(),
                   "service": self.service, "release": self.release}
        payload.update({k: getattr(record, k) for k in self.OURS})
        payload.update({k: v for k, v in record.__dict__.items() if k not in self.STANDARD | self.OURS})
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)

def configure_logging(service: str, release: str = "0.0.0", level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter(service, release))
    handler.addFilter(ContextFilter())
    root = logging.getLogger()
    root.handlers[:] = [handler]          # idempotent: safe to call twice
    root.setLevel(level)
    for noisy in ("uvicorn.access", "httpx", "httpcore"):
        logging.getLogger(noisy).setLevel("WARNING")

# ---- a team's code ----
log = logging.getLogger(__name__)
log.info("order created", extra={"order_id": 918, "amount": "12.50", "currency": "EUR"})
# {"ts": "2026-10-06T09:14:02.118+00:00", "level": "INFO", "logger": "orders.service", "msg": "order created",
#  "service": "orders", "release": "2.4.1", "request_id": "7f3c9a...", "user_id": "u_42",
#  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736", "span_id": "00f067aa0ba902b7", "order_id": 918, ...}
`,
"Python's logging module was added in Python 2.3 (2003, PEP 282) and was modelled on Java's log4j. contextvars (PEP 567) arrived in Python 3.7 in 2018 to give asyncio code a safe replacement for thread-local storage. The W3C Trace Context standard became a Recommendation in February 2020.",
[["Python: contextvars", "https://docs.python.org/3/library/contextvars.html"],
 ["Python logging cookbook (filters, context, JSON)", "https://docs.python.org/3/howto/logging-cookbook.html"],
 ["OpenTelemetry logs specification (correlation with traces)", "https://opentelemetry.io/docs/specs/otel/logs/"]]),

X("Centralised configuration and feature flags",
["Configuration is where small differences cause big outages. One service reads DATABASE_URL, another reads DB_URL, a third has the production password in a settings.py file. Some teams use .env files in production; some have no idea which value won when the same key was set in two places. Feature flags are even worse when done by hand: an if statement that reads os.environ at import time cannot be changed without a restart, and there is no way to turn a broken feature off for everyone in ten seconds.",
 "The central design starts with a CoreSettings class built on pydantic-settings. It defines the fields every service has (env, release, log_level, database_url, redis_url, otel endpoint) with validated types and SecretStr for secrets. Each service subclasses it and adds its own fields. Values come from a fixed layering that pydantic-settings implements: constructor arguments win over environment variables, which win over .env files, which win over a secrets directory, which win over defaults. In production there are no .env files; the orchestrator injects environment variables from a secret manager (Vault, AWS Secrets Manager, Kubernetes Secrets). Settings are built once at startup and passed in through a dependency, so a test can construct Settings(database_url=...) directly.",
 "Feature flags are a separate, runtime concept. The core package provides a Flags client that reads rules from a store that can change without a deploy (Redis, LaunchDarkly, Unleash or an OpenFeature provider). A rule has an on switch (the kill switch), an allow list for internal users, and a percentage for gradual rollout. The percentage is applied by hashing the flag name with the subject (user or tenant), so the same user always gets the same answer and the rollout can go 1, 10, 50, 100 percent without flapping. Flags are temporary: each one has an owner and a removal date, and a CI check warns when a flag is older than 90 days."],
["One CoreSettings base class with typed, validated fields and SecretStr for passwords; services subclass it.",
 "Precedence in pydantic-settings: init arguments, then environment variables, then .env files, then secrets directory, then defaults.",
 "No .env files in production. Secrets come from a secret manager into environment variables or mounted files.",
 "Fail fast: a missing required setting must crash at startup with a clear message, not at the first request.",
 "Flags are evaluated at request time from a store that can change without a deploy, with a local cache of a few seconds.",
 "Percentage rollout uses a stable hash of flag name plus subject; a kill switch is a separate boolean that wins over everything.",
 "Every flag has an owner and an expiry. Old flags are deleted; dead code paths are removed."],
"A fintech company rolled a new risk model out to 5 percent of users on Monday, 25 percent on Tuesday and saw a spike in false declines on Wednesday at 50 percent. The on-call engineer set the kill switch in the flag store and all 60 instances of the service switched back to the old model within the 10-second cache window, with no deploy and no rollback.",
`
# acme_core/settings.py
from typing import Literal
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class CoreSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", ".env.local"), extra="ignore",
                                      env_nested_delimiter="__", secrets_dir="/run/secrets")
    env: Literal["local", "dev", "staging", "prod"] = "local"
    release: str = "0.0.0"
    log_level: str = "INFO"
    database_url: SecretStr                      # required: startup fails if missing
    redis_url: str = "redis://localhost:6379/0"
    otel_endpoint: str | None = None

    @property
    def is_prod(self) -> bool:
        return self.env == "prod"

# acme_core/flags.py
import hashlib, json, time

class Flags:
    """Rules live in Redis as JSON: {"on": true, "percent": 10, "allow": ["u_1", "tenant_acme"]}"""
    def __init__(self, redis, ttl: float = 10.0) -> None:
        self.redis, self.ttl, self._cache = redis, ttl, {}

    def _rule(self, name: str) -> dict | None:
        hit = self._cache.get(name)
        if hit and hit[0] > time.monotonic():
            return hit[1]
        raw = self.redis.get("flags:" + name)
        rule = json.loads(raw) if raw else None
        self._cache[name] = (time.monotonic() + self.ttl, rule)
        return rule

    def enabled(self, name: str, subject: str = "", default: bool = False) -> bool:
        rule = self._rule(name)
        if rule is None:
            return default
        if not rule.get("on", True):
            return False                                   # kill switch wins
        if subject in rule.get("allow", []):
            return True
        bucket = int(hashlib.sha256(f"{name}:{subject}".encode()).hexdigest()[:8], 16) % 100
        return bucket < rule.get("percent", 0)

# ---- a team's service ----
class Settings(CoreSettings):
    payment_provider_url: str
    max_cart_items: int = Field(50, ge=1, le=500)

settings = Settings()        # reads env vars, .env, /run/secrets; raises ValidationError if incomplete

def checkout(cart, user, flags: Flags):
    if flags.enabled("new-checkout", subject=user.tenant_id):
        return new_checkout(cart)
    return legacy_checkout(cart)
`,
"The rule that configuration must come from the environment was written down in the Twelve-Factor App (Heroku, 2011). Pydantic's BaseSettings has existed since Pydantic 1 and was moved into the separate pydantic-settings package with Pydantic 2 in 2023. Feature flags as a release tool were popularised by Flickr's 2009 blog post on continuous deployment and by Martin Fowler's 2017 article on feature toggles.",
[["pydantic-settings documentation", "https://docs.pydantic.dev/latest/concepts/pydantic_settings/"],
 ["The Twelve-Factor App: config", "https://12factor.net/config"],
 ["OpenFeature: evaluation API", "https://openfeature.dev/docs/reference/concepts/evaluation-api/"]]),

X("Reusable decorators and context managers",
["Retrying a flaky call, giving up after a timeout, caching a result, wrapping work in a database transaction, writing an audit record, limiting the rate of a function: every service needs these, and every team writes them slightly wrong. A hand-written retry without backoff turns a small outage into a self-made denial of service. A retry that wraps a non-idempotent write charges a customer twice. A cache with no key convention collides with another team's keys in the same Redis.",
 "The core package ships these as decorators and context managers with safe defaults: retry(times, on, base) with exponential backoff and jitter, timeout(seconds), cached(ttl, key), transactional(), audit(action) and rate_limited(key, per_second). Each one works on both sync and async functions by checking inspect.iscoroutinefunction and returning the matching wrapper, and each uses functools.wraps so that the name, docstring, type hints and signature of the original function survive. That last point matters: FastAPI builds its dependency injection from inspect.signature, and a decorator without wraps breaks every decorated endpoint.",
 "Stacking order is part of the standard and is documented with examples. Decorators apply from the bottom up, so the one written closest to the function runs innermost. The company rule is: timed or traced outermost, then retry, then timeout, then transactional, so that each attempt gets its own timeout and its own transaction. Teams customise through arguments (which exceptions to retry, how many times) and never copy the implementation. A change in the backoff formula or in the metrics emitted by retry is one release of core and reaches every service."],
["Decorators apply bottom-up and run top-down: the decorator nearest the def is the innermost at call time.",
 "Always use functools.wraps. It copies __name__, __doc__, __module__ and sets __wrapped__, which inspect.signature follows.",
 "A sync wrapper around an async function returns a coroutine without awaiting it, so its try/except never fires. Detect coroutine functions and provide an async wrapper.",
 "Retry only on exceptions you know are safe (timeouts, connection errors, 503) and only around idempotent work.",
 "Exponential backoff with jitter; a fixed delay makes all clients retry at the same moment.",
 "Company stacking rule: traced, then retry, then timeout, then transactional. Each attempt gets a fresh timeout and a fresh transaction.",
 "Context managers via contextlib.contextmanager: the exception arrives at the yield; re-raise it unless you really mean to swallow it."],
"A logistics company had six implementations of retry across its Python services, two of them without any delay between attempts. When a partner API went down for 90 seconds, those two services sent 400,000 requests and got the company's IP blocked for a day. The platform team shipped acme_core.decorators.retry with jitter and a maximum of three attempts, and added a lint rule that flags any local function named retry.",
`
# acme_core/decorators.py
import asyncio, functools, inspect, logging, random, time
from contextlib import contextmanager

log = logging.getLogger("acme.decorators")

def retry(times: int = 3, on: tuple[type[BaseException], ...] = (TimeoutError, ConnectionError), base: float = 0.2):
    """Retry on the given exceptions with exponential backoff and jitter. Sync and async."""
    def decorator(fn):
        def delay_for(attempt: int) -> float:
            return min(base * 2 ** attempt, 5.0) + random.uniform(0, base)

        if inspect.iscoroutinefunction(fn):
            @functools.wraps(fn)
            async def async_wrapper(*args, **kwargs):
                for attempt in range(1, times + 1):
                    try:
                        return await fn(*args, **kwargs)
                    except on as exc:
                        if attempt == times:
                            raise
                        log.warning("retry", extra={"fn": fn.__qualname__, "attempt": attempt, "error": repr(exc)})
                        await asyncio.sleep(delay_for(attempt))
            return async_wrapper

        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return fn(*args, **kwargs)
                except on as exc:
                    if attempt == times:
                        raise
                    log.warning("retry", extra={"fn": fn.__qualname__, "attempt": attempt, "error": repr(exc)})
                    time.sleep(delay_for(attempt))
        return wrapper
    return decorator

@contextmanager
def audit(action: str, actor: str, **fields):
    """Writes one audit log line whether the block succeeds or fails."""
    start = time.perf_counter()
    try:
        yield
        log.info("audit", extra={"action": action, "actor": actor, "ok": True, **fields,
                                 "ms": round((time.perf_counter() - start) * 1000, 1)})
    except Exception as exc:
        log.info("audit", extra={"action": action, "actor": actor, "ok": False, "error": repr(exc), **fields})
        raise

# ---- a team's service (timed and timeout also come from acme_core.decorators) ----
import httpx
from acme_core.decorators import retry, timed, timeout, audit

@timed("payments.charge")                                  # outermost: measures all attempts together
@retry(times=3, on=(httpx.TransportError, TimeoutError))   # retries the whole attempt below
@timeout(seconds=2.0)                                      # innermost: each attempt gets 2 seconds
async def charge(client: httpx.AsyncClient, card_token: str, amount_cents: int) -> str:
    r = await client.post("/charges", json={"card": card_token, "amount": amount_cents})
    r.raise_for_status()
    return r.json()["charge_id"]

def refund(order, actor):
    with audit("order.refund", actor=actor, order_id=order.id):
        payments.refund(order)
`,
"Decorator syntax was added to Python in version 2.4 (2004, PEP 318) and the with statement with context managers in Python 2.5 (2006, PEP 343). functools.wraps appeared in Python 2.5 and the __wrapped__ attribute that inspect.signature follows was added in Python 3.2. Exponential backoff with jitter was described in detail by AWS in 2015.",
[["Python: functools (wraps, lru_cache)", "https://docs.python.org/3/library/functools.html"],
 ["Python: contextlib", "https://docs.python.org/3/library/contextlib.html"],
 ["Tenacity: a general retrying library", "https://tenacity.readthedocs.io/en/latest/"]]),
]});
