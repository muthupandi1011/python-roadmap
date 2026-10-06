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
]});
