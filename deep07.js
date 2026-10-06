EXTRA(7, "FastAPI", {
  deep: [
    "FastAPI is a thin layer on top of two libraries. Starlette does the web work: routing, middleware, requests and responses. Pydantic does the data work: it reads your type hints, validates the input and converts it. An ASGI server such as Uvicorn sits in front, reads bytes from the socket and calls your app with three things: scope (request details), receive and send.",
    "The most important thing to understand is how endpoints run. An 'async def' endpoint runs directly on the event loop, which is one single thread. If you call blocking code there (time.sleep, the requests library, a sync database driver), the whole server stops answering until that call ends. A plain 'def' endpoint is different: FastAPI runs it in a thread pool, so blocking code is safe there, but the pool has a limited number of threads.",
    "For each request FastAPI first resolves the dependencies, then validates path, query, header and body values, then calls your function, then validates and serialises the return value with the response model. Validation errors become a 422 response before your code even runs. The response model also works as a filter: fields that are not in it are removed, which protects you from leaking columns such as password_hash.",
    "A common misconception is that FastAPI is fast because of async alone. Async helps only when the work is waiting on I/O. CPU-heavy work (image processing, big pandas jobs, ML inference) blocks the event loop the same way, so it must go to a process pool or a job queue. FastAPI is also not the best choice when you need a full admin panel, server-rendered pages and built-in user management; Django gives those out of the box."
  ],
  iq: [
    { q: "Why is a sync database call inside an async endpoint a problem?", a: "An async endpoint runs on the event loop thread. A sync call does not give control back while it waits, so no other request can make progress during that time. One slow query can freeze every user on that worker. Fix it by using an async driver with await, or by writing the endpoint as a plain def so it runs in the thread pool.", c: `
import asyncio, time
from fastapi import FastAPI

app = FastAPI()

@app.get("/bad")
async def bad():
    time.sleep(2)             # blocks the event loop: every request waits
    return {"ok": True}

@app.get("/good-async")
async def good_async():
    await asyncio.sleep(2)    # gives control back while waiting
    return {"ok": True}

@app.get("/good-sync")
def good_sync():
    time.sleep(2)             # plain def: runs in a thread pool
    return {"ok": True}
` },
    { q: "When should you write 'def' and when 'async def' for an endpoint?", a: "Use 'async def' only when everything slow inside it is awaited with async libraries. Use plain 'def' when you call blocking libraries, because FastAPI moves it to a thread. The worst choice is 'async def' with blocking calls inside. Remember the thread pool is limited, so many slow sync endpoints can also fill it and make requests queue." },
    { q: "What is the difference between a 422 and a 400 in FastAPI, and where does the 422 come from?", a: "A 422 is created automatically by FastAPI when the request does not match the declared types, for example a string where an int is needed. Your function is never called in that case. A 400 is something you raise yourself for a business rule, such as 'quantity is more than stock'. Knowing this helps you debug: a 422 means the client sent the wrong shape of data." },
    { q: "You run Uvicorn with 4 workers and keep a counter in a global Python variable. Why is the number wrong?", a: "Each worker is a separate process with its own memory, so there are 4 different counters. A request can land on any worker. Shared state must live outside the process, in Redis or a database. The same is true for in-memory caches and for lists of WebSocket clients.", c: `
# each worker process has its own copy of this variable
counter = 0

# shared state belongs in an external store
import redis
r = redis.Redis()
r.incr("counter")
` }
  ],
  tips: [
    "Create shared clients (database engine, httpx.AsyncClient, Redis) once in the lifespan function and reuse them. Creating a new client on every request wastes connections and time.",
    "Always set response_model (or a return type) on endpoints that return database objects, so private fields are filtered out and the docs are correct.",
    "Split the app with APIRouter per feature (users, orders, payments) and keep business logic in service functions, not inside the endpoint. Then you can test the logic without HTTP.",
    "Test with TestClient or httpx.AsyncClient and app.dependency_overrides to replace the database and the current user. This is faster and more reliable than mocking internal functions."
  ]
});

EXTRA(7, "Django", {
  deep: [
    "A Django request follows a fixed path. The server calls the WSGI or ASGI handler, the request passes down through the middleware list, the URL resolver finds the view, the view talks to the ORM and returns a response, and the response travels back up through the middleware. Knowing this path tells you where to put code: cross-cutting things in middleware, data rules in models, request logic in views.",
    "The ORM is the part interviewers ask about most. A QuerySet is lazy: building it does not touch the database. The SQL runs only when you loop over it, slice it, call list() or len() on it, or evaluate it in some other way. This lets you chain filters cheaply, but it also hides when queries happen, which leads to the N+1 problem: one query for a list and then one more query for each row when you touch a related object.",
    "Migrations are Python files that describe each schema change. Django compares your models with the migration history and writes the next step. In production the danger is not the tool but the change itself: adding a NOT NULL column or renaming a column while old code is still running can break live requests. Safe changes are done in steps, for example add a nullable column first, deploy, fill it, and only then make it required.",
    "Django is a good choice when you need a full product fast: admin, auth, forms and ORM working together. It is a weaker fit for a tiny microservice or a service that is mostly long-lived async connections. Modern Django supports async views and has async ORM methods, but many third-party packages are still sync, so check each one before you build an async design on it."
  ],
  iq: [
    { q: "What is the N+1 query problem and how do you fix it in Django?", a: "You load N objects with one query and then touch a related object on each one, which runs N more queries. Use select_related for ForeignKey and OneToOne: it makes one query with a JOIN. Use prefetch_related for ManyToMany and reverse ForeignKey: it makes one extra query and joins the results in Python.", c: `
# N+1: one query for books, then one more for each book
for book in Book.objects.all():
    print(book.author.name)

# one query with a JOIN
for book in Book.objects.select_related("author"):
    print(book.author.name)

# two queries in total (Book.author has related_name="books")
for author in Author.objects.prefetch_related("books"):
    print([b.title for b in author.books.all()])
` },
    { q: "Two requests both read stock = 5 and both save stock = 4. How do you stop this lost update?", a: "The read-change-save in Python is not atomic. Let the database do the maths with an F expression, so the UPDATE uses the current value in the row. If you need to check a rule first, lock the row with select_for_update inside transaction.atomic.", c: `
from django.db.models import F

# the database does: SET stock = stock - 1
Product.objects.filter(id=7, stock__gt=0).update(stock=F("stock") - 1)
` },
    { q: "When exactly does a QuerySet hit the database?", a: "Only when it is evaluated: iteration, list(), len(), bool(), slicing with a step, or printing it. Filters and order_by only build the query. After evaluation the result is cached on that QuerySet object, so looping twice over the same object does not query twice. Using count() or exists() is cheaper than loading all rows when you need only a number or a yes/no." },
    { q: "Why can calling a Celery task inside a Django view fail with 'object does not exist'?", a: "If the view runs inside a transaction, the worker may start before the transaction commits, so the new row is not visible yet. Send the task with transaction.on_commit so it is queued only after the commit succeeds. This also avoids running a task for data that was rolled back." }
  ],
  tips: [
    "Install django-debug-toolbar in development and look at the SQL panel on every new page. It shows duplicate queries at once.",
    "Add a test with assertNumQueries for your important list views. It fails the build when someone adds an N+1 by accident.",
    "Keep settings in environment variables (django-environ or similar) and run 'python manage.py check --deploy' before going live. It warns about DEBUG, cookies and HTTPS settings.",
    "Use a custom user model from the first day (AUTH_USER_MODEL). Changing the user model after the first migration is painful."
  ]
});

EXTRA(7, "Django REST Framework", {
  deep: [
    "A DRF request goes through clear steps inside the view. First the authentication classes try to identify the user. Then the permission classes decide if the request may continue. Then throttles check the rate. Only after that does your handler run. The serializer works in two directions: it validates incoming data and turns it into Python objects, and it turns model objects into plain data for JSON.",
    "A ModelViewSet plus a router gives you list, retrieve, create, update and delete with very little code. This is powerful but hides a lot. The same queryset is used for all actions, so if you forget to filter it by the current user, every user can read every row. Override get_queryset to scope the data, and use different serializers for read and write when the shapes are different.",
    "Performance problems in DRF nearly always come from serializers. A nested serializer or a SerializerMethodField that touches a related object runs a query for each row. The fix belongs in the view: add select_related and prefetch_related to the queryset. Serialising thousands of objects is also slow in pure Python, so always paginate list endpoints.",
    "DRF is the natural choice when the project is already Django and wants to reuse models, permissions and the admin. It is not the best choice for a high-concurrency async service, because its views are built around the sync request cycle. Do not put heavy business logic in serializers; they become hard to test and hard to reuse outside HTTP."
  ],
  iq: [
    { q: "You wrote has_object_permission but users can still see other users' objects in the list endpoint. Why?", a: "has_object_permission is called only when the view calls get_object, which happens for retrieve, update and delete. The list action never calls it. For lists you must filter the data yourself in get_queryset. Use both: the queryset filter for lists and the object permission as a second check.", c: `
from rest_framework import permissions, viewsets

class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.owner_id == request.user.id

class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):                 # protects the list action
        return Note.objects.filter(owner=self.request.user)
` },
    { q: "What is the difference between authentication and permission classes in DRF, and which status codes do they give?", a: "Authentication classes only answer 'who is this'; they set request.user and do not block anything by themselves. Permission classes answer 'may this user do this'. A request with no valid credentials normally gets 401, and a known user without rights gets 403. Mixing them up leads to bugs such as an endpoint that is open because no permission class was set." },
    { q: "How do you set the owner of a new object without letting the client send it?", a: "Do not accept the owner field from the request body, or mark it read-only. Set it on the server in perform_create from request.user. If the client could send the owner id, any user could create objects in the name of another user.", c: `
class NoteViewSet(viewsets.ModelViewSet):
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
` },
    { q: "PUT vs PATCH in DRF: what is the practical difference?", a: "PUT replaces the whole object, so all required fields must be sent. PATCH is a partial update; DRF calls the serializer with partial=True and validates only the fields that were sent. Clients often want PATCH. A trap with PATCH is validation that compares two fields: one of them may be missing from the request, so read the missing value from the existing instance." }
  ],
  tips: [
    "Set DEFAULT_PERMISSION_CLASSES to IsAuthenticated in settings and open single endpoints on purpose. A forgotten permission class then fails closed, not open.",
    "Set a default pagination class and a maximum page size globally. An endpoint that returns a whole table will work in development and fail in production.",
    "Use explicit 'fields' lists in serializers, never '__all__'. A new model column should not appear in the API by accident.",
    "Generate an OpenAPI schema with drf-spectacular and check it in CI. Frontend and mobile teams can build against it and breaking changes become visible."
  ]
});

EXTRA(7, "Middleware", {
  deep: [
    "Middleware is built like the layers of an onion. Each layer wraps the next one. A request goes in through every layer, reaches the endpoint, and the response comes back out through the same layers in reverse order. This means order matters. A layer on the outside sees everything, including errors and responses made by the inner layers.",
    "In ASGI, an app is a callable that takes scope, receive and send. A middleware is just another ASGI app that holds the inner app and calls it. It can change the scope before the call, wrap 'receive' to look at the body, or wrap 'send' to change the response. The body arrives and leaves as a stream of messages, so a middleware that reads the full body must buffer it, which costs memory and breaks streaming.",
    "FastAPI's @app.middleware decorator uses Starlette's BaseHTTPMiddleware. It is easy to write but adds overhead on every request and has known limits, for example with context variables set inside the endpoint and with streaming responses. For hot paths or libraries, many teams write a pure ASGI middleware instead. In Django the MIDDLEWARE list runs top to bottom for the request and bottom to top for the response.",
    "Middleware is the wrong place for logic that belongs to only some routes or that needs route details. Use dependencies or decorators for that. Keep middleware small and fast, because it runs on every request, including health checks. Slow work here, such as a database query per request, multiplies across the whole service."
  ],
  iq: [
    { q: "In FastAPI you add middleware A and then middleware B. In which order do they run?", a: "The last one added is the outermost layer. So the request goes through B first, then A, then the endpoint, and the response goes back through A and then B. This surprises people because it is the reverse of the order in the code. It matters for things like CORS, which must be outside so that it can add headers to error responses too.", c: `
app.add_middleware(A)
app.add_middleware(B)

# request:   B -> A -> endpoint
# response:  endpoint -> A -> B
` },
    { q: "Why can reading the request body in a middleware be a problem?", a: "The body is a stream that can be read only once. If the middleware consumes it, the endpoint may get nothing unless the framework caches it. Reading it also loads the whole upload into memory, which is dangerous for large files. Log sizes and headers instead, or read the body only for small, known content types." },
    { q: "How would you write a middleware that adds a header without using BaseHTTPMiddleware?", a: "Write a pure ASGI class. It checks that the scope type is http, wraps the 'send' function, and adds the header when the 'http.response.start' message passes through. This has less overhead and works well with streaming responses.", c: `
class RequestIdMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_header(message):
            if message["type"] == "http.response.start":
                message["headers"] = list(message.get("headers", []))
                message["headers"].append((b"x-request-id", b"abc123"))
            await send(message)

        await self.app(scope, receive, send_with_header)

app.add_middleware(RequestIdMiddleware)
` },
    { q: "Should authentication be done in middleware or in a dependency?", a: "Middleware fits when every route needs the same check and you want to reject early. A dependency fits when routes differ: some are public, some need roles. Dependencies are also visible in the OpenAPI docs and are easy to override in tests. Many projects use middleware only to parse the token and a dependency to enforce the rule." }
  ],
  tips: [
    "Generate or read a request ID in the outermost middleware, store it in a contextvar, add it to every log line and return it in a response header. It makes support tickets easy to trace.",
    "Put CORS middleware outermost. If it is inside, error responses miss the CORS headers and the browser shows a confusing CORS error instead of the real one.",
    "Skip heavy middleware work for health check paths. Load balancers call them every few seconds and fill logs and metrics with noise.",
    "Test a middleware with a tiny app that has one route. Check the header, the status and the behaviour when the endpoint raises an exception."
  ]
});

EXTRA(7, "Authentication", {
  deep: [
    "A password hash function for logins is slow on purpose. bcrypt and argon2 have a cost setting that makes one check take a noticeable fraction of a second. This is nothing for one login but makes guessing billions of passwords very expensive for an attacker who stole the table. Fast hashes such as SHA-256 or MD5 are wrong for passwords for exactly this reason. The salt is a random value stored with each hash, so two users with the same password get different hashes and precomputed tables are useless.",
    "After login the server must remember the user. With sessions, the server stores the session data and gives the browser a random session ID in a cookie. With tokens, the data is inside a signed token and the server stores nothing. Sessions are easy to revoke and work well for browser apps. Tokens are easier across many services and for mobile apps, but are harder to revoke.",
    "Cookies need three flags. HttpOnly stops JavaScript from reading the cookie, which limits damage from XSS. Secure sends it only over HTTPS. SameSite limits when the browser sends it on cross-site requests, which reduces CSRF. Because cookies are sent automatically, cookie-based auth still needs CSRF protection for state-changing requests.",
    "Common mistakes are not about the hash function. They are: different error messages for 'unknown email' and 'wrong password' (this tells attackers which emails exist), no rate limit on login, reset tokens that never expire, and checking that the user is logged in but not that they own the object. Do not build your own crypto or your own session system when the framework has one."
  ],
  iq: [
    { q: "Why is SHA-256 a bad choice for storing passwords, even with a salt?", a: "SHA-256 is designed to be fast, so an attacker with a GPU can test a huge number of guesses per second. A salt stops precomputed tables but does not slow down guessing of one password. Password hashes such as argon2 and bcrypt are slow and tunable, and argon2 also needs a lot of memory, which makes GPU attacks expensive." },
    { q: "What is the difference between 401 and 403?", a: "401 means 'I do not know who you are': the credentials are missing or invalid, and the client should log in. 403 means 'I know who you are, but you may not do this'. Returning the wrong one confuses clients: a frontend that sees 401 will usually send the user to the login page, which is wrong for a permission problem." },
    { q: "How do you upgrade old password hashes to a stronger setting without asking users to reset?", a: "You cannot re-hash without the plain password, and you only have it at login. So at each successful login, check if the stored hash uses old parameters and, if so, hash the password again with the new settings and save it. Users who log in are upgraded over time.", c: `
from argon2 import PasswordHasher          # pip install argon2-cffi
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher()
stored = ph.hash("my-secret-password")

try:
    ph.verify(stored, "my-secret-password")
    if ph.check_needs_rehash(stored):
        stored = ph.hash("my-secret-password")   # save the new hash
except VerifyMismatchError:
    print("wrong password")
` },
    { q: "Why should you compare tokens with hmac.compare_digest and not with == ?", a: "A normal string comparison stops at the first different character, so the time it takes leaks how many leading characters were correct. With many tries an attacker can guess a secret piece by piece. compare_digest takes the same time wherever the difference is. Use it for API keys, reset tokens and webhook signatures.", c: `
import hmac

def is_valid(sent_key: str, real_key: str) -> bool:
    return hmac.compare_digest(sent_key.encode(), real_key.encode())
` }
  ],
  tips: [
    "Return the same message and take about the same time for 'unknown user' and 'wrong password'. Do the same on the 'forgot password' page.",
    "Rate limit login by account and by IP, and add a growing delay or lock after repeated failures. This is the cheapest protection against password guessing.",
    "bcrypt uses only the first 72 bytes of a password. Prefer argon2 for new projects, or be aware of this limit when you allow long passphrases.",
    "Write tests for the negative cases: expired session, user A requesting user B's data, a disabled account. These are the bugs that become security incidents."
  ]
});

EXTRA(7, "JWT", {
  deep: [
    "A JWT is three base64url strings joined by dots: header, payload and signature. To sign with HS256, the server computes an HMAC-SHA256 over the text 'header.payload' with a secret key. To verify, it computes the same HMAC again and compares it with the signature in the token. If one character of the payload changes, the signature no longer matches. With RS256 the token is signed with a private key and verified with a public key, so other services can verify tokens without being able to create them.",
    "Verification is more than the signature. The server must also check the expiry (exp), and should check the issuer (iss) and audience (aud) so a token made for one service is not accepted by another. The algorithm must be fixed by the server, never taken from the token header. Old attacks worked by setting the algorithm to 'none', or by switching RS256 to HS256 so that the public key was used as the HMAC secret.",
    "The main trade-off is revocation. Because the server stores nothing, it cannot easily cancel a token; it stays valid until it expires. The usual design is a short-lived access token (minutes) plus a long-lived refresh token that is stored on the server and can be revoked. When the access token expires, the client uses the refresh token to get a new one.",
    "A JWT is not encrypted and not a session replacement for every case. Anyone can decode the payload, so it must not contain private data. For a normal website with one backend, a server-side session with a cookie is simpler and safer. JWTs are most useful when several services must verify the user without calling a central store on each request."
  ],
  iq: [
    { q: "How would you revoke a JWT before it expires?", a: "A pure JWT cannot be revoked, so you add a small piece of server state. Common options: keep access tokens very short and revoke only the refresh token; store revoked token IDs (the jti claim) in Redis until they expire; or keep a token version on the user and reject tokens with an older version. Each option adds a lookup, so you trade some of the stateless benefit for control.", c: `
import time, redis

r = redis.Redis()

def revoke(claims):
    ttl = int(claims["exp"] - time.time())
    if ttl > 0:
        r.set("revoked:" + claims["jti"], 1, ex=ttl)   # keep only until expiry

def is_revoked(claims):
    return r.exists("revoked:" + claims["jti"]) == 1
` },
    { q: "Why must you pass the algorithms list to jwt.decode?", a: "The token header says which algorithm was used, and the header is written by whoever made the token. If the server trusts it, an attacker can choose a weak or wrong algorithm. Fixing the list on the server means a token with any other algorithm is rejected. Also check audience and issuer so tokens from another system are not accepted.", c: `
import jwt

claims = jwt.decode(
    token,
    PUBLIC_KEY,
    algorithms=["RS256"],              # fixed by the server
    audience="shop-api",
    issuer="https://auth.shop.com",
    options={"require": ["exp", "sub"]},
)
` },
    { q: "HS256 or RS256: which one and why?", a: "HS256 uses one shared secret, so every service that can verify a token can also create one. That is fine for a single backend. RS256 (or ES256) uses a key pair: only the auth service has the private key, and other services verify with the public key. Use the key pair when more than one service or team verifies tokens." },
    { q: "Where should a browser app store the token: localStorage or a cookie?", a: "JavaScript can read localStorage, so any XSS bug lets an attacker steal the token and use it elsewhere. An HttpOnly cookie cannot be read by JavaScript, but the browser sends it automatically, so you need CSRF protection (SameSite and a CSRF token). Most security guides prefer the HttpOnly, Secure, SameSite cookie for browser apps. Neither option makes XSS harmless." }
  ],
  tips: [
    "Keep access tokens short (for example 5 to 15 minutes) and rotate refresh tokens: each use gives a new refresh token and cancels the old one, so a stolen one is noticed.",
    "Use a long random secret for HS256 (at least 32 random bytes) loaded from the environment. A short or guessable secret can be found by brute force offline.",
    "Put only IDs and a few stable claims in the payload. Roles and permissions that change often become stale inside a token until it expires.",
    "Publish public keys at a JWKS URL and include a key ID (kid) in the header. Then you can rotate signing keys without downtime."
  ]
});

EXTRA(7, "OAuth", {
  deep: [
    "OAuth has four roles: the user (resource owner), your app (client), the authorization server (for example Google's login) and the resource server (the API that holds the data). The user logs in only at the authorization server. Your app receives an access token that says what it may do, described by scopes such as 'read email'. OAuth alone is about access, not identity; OpenID Connect adds an ID token that says who the user is.",
    "The Authorization Code flow has two channels. The front channel is the browser redirect, which is visible and can be attacked, so only a short-lived, single-use code travels there. The back channel is a direct server-to-server call where the code is exchanged for tokens with the client secret. Tokens therefore never appear in the browser URL. The 'state' parameter is a random value your app sends and checks on return, to make sure the callback belongs to a login this browser really started.",
    "Mobile and single-page apps cannot keep a client secret, so they use PKCE. The app creates a random 'code verifier', sends its SHA-256 hash (the 'code challenge') in the first step, and sends the original verifier when exchanging the code. An attacker who steals the code cannot use it without the verifier. Current guidance is to use PKCE for all clients. The older implicit flow and the password grant are no longer recommended.",
    "Other flows exist for other cases. Client Credentials is for service-to-service calls with no user. Device flow is for TVs and CLIs with no browser. A common misconception is that an access token proves login: it only proves access, and using it as an identity proof has caused real vulnerabilities. For login, validate the ID token (signature, issuer, audience, expiry, nonce)."
  ],
  iq: [
    { q: "What is the 'state' parameter for, and what happens without it?", a: "It protects the callback from CSRF. Your app creates a random value, stores it in the user's session and sends it in the redirect; on the callback it must match. Without it an attacker can make a victim's browser finish a login with the attacker's code, so the victim's session is linked to the attacker's account." },
    { q: "How does PKCE work and what attack does it stop?", a: "The client creates a random verifier and sends only its hash in the authorization request. When it exchanges the code, it sends the verifier, and the server hashes it and compares. An app that intercepts the code (for example a malicious app on the same phone) does not know the verifier, so the code is useless to it.", c: `
import base64, hashlib, secrets

verifier = secrets.token_urlsafe(64)                 # keep this private
digest = hashlib.sha256(verifier.encode()).digest()
challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()

# step 1: send code_challenge=<challenge>&code_challenge_method=S256
# step 2: send code_verifier=<verifier> when exchanging the code
` },
    { q: "What is the difference between an access token, a refresh token and an ID token?", a: "The access token is sent to the API to get data and is short-lived. The refresh token is sent only to the authorization server to get a new access token and must be stored very safely. The ID token (OpenID Connect) is a JWT for your app that describes the user; it is not meant to be sent to APIs. Mixing these up is a classic design error." },
    { q: "Why is the implicit flow no longer recommended?", a: "It returns the access token directly in the browser URL fragment. There the token can leak through browser history, logs, or scripts on the page, and there is no way to bind it to the client. Authorization Code with PKCE gives single-page apps the same result without putting tokens in the URL." }
  ],
  tips: [
    "Use a maintained library (for example Authlib) and the provider's discovery document. Do not hand-write the redirects and token checks.",
    "Register exact redirect URIs with the provider. Wildcards and open redirects are the most common way codes get stolen.",
    "Ask for the smallest set of scopes you need. Users approve more often, and a leaked token can do less damage.",
    "Store refresh tokens encrypted on the server and handle the 'user revoked access' case: the refresh call fails, and your app must ask the user to connect again."
  ]
});

EXTRA(7, "Dependency injection", {
  deep: [
    "When a request arrives, FastAPI looks at the endpoint's parameters and builds a tree of dependencies. A dependency can itself depend on others, for example get_current_user needs get_db and the token header. FastAPI calls them in the right order and passes the results down. Within one request each dependency runs only once by default; if two parts of the tree ask for get_db, they receive the same session.",
    "A dependency can use 'yield' in place of 'return'. The code before the yield is setup, the yielded value is injected, and the code after the yield is cleanup. This is the standard way to open a database session per request and be sure it is closed even when the endpoint raises an error. It is the same idea as a context manager.",
    "The real value of DI is in tests and in swapping parts. Because the endpoint does not create its own database session or HTTP client, a test can replace them with app.dependency_overrides. No patching of import paths is needed. The same mechanism lets you use a fake payment client in staging or a different storage backend per environment.",
    "DI is not free. Deep dependency trees make it hard to see what runs on a request, and each dependency adds a little overhead. Do not hide business logic in dependencies; they are for providing things (session, user, settings) and for checks (permissions). Outside the web layer, plain constructor arguments are usually enough and no framework is needed."
  ],
  iq: [
    { q: "How do you make sure a database session is always closed, even if the endpoint raises an exception?", a: "Use a dependency with yield and put the close in a finally block. FastAPI runs the cleanup code after the endpoint finishes, in both the success and the error case. This gives one session per request with guaranteed cleanup.", c: `
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/users/{user_id}")
def read_user(user_id: int, db = Depends(get_db)):
    return db.get(User, user_id)
` },
    { q: "How do you replace a dependency in tests?", a: "Put a replacement function into app.dependency_overrides with the original function as the key. FastAPI then calls the replacement everywhere the original is used. Clear the overrides after the test so tests do not affect each other.", c: `
from fastapi.testclient import TestClient

def fake_user():
    return {"id": 1, "name": "Test"}

app.dependency_overrides[get_current_user] = fake_user
client = TestClient(app)
assert client.get("/me").json()["name"] == "Test"
app.dependency_overrides.clear()
` },
    { q: "If the same dependency is used three times in one request, how many times does it run?", a: "Once. FastAPI caches the result for the duration of that request, so all three places get the same value. This is why every part of a request shares one database session. You can turn it off with Depends(dep, use_cache=False) when you really need a fresh value each time." },
    { q: "What is the difference between dependency injection and a global variable or singleton?", a: "A global is fetched by the code that uses it, so the code is tied to that one object and is hard to test. With injection the object is given from outside, so the caller decides which one to use. Lifetimes are also explicit: per request for a session, per application for an engine. Globals hide those lifetimes and often cause shared-state bugs." }
  ],
  tips: [
    "Use Annotated type aliases, for example CurrentUser = Annotated[User, Depends(get_current_user)], so endpoints stay short and consistent.",
    "Build permission checks as small dependencies (require_admin, require_owner) and attach them to a whole router with dependencies=[...]. New routes are then protected by default.",
    "Create expensive objects (engine, HTTP client) once at startup and let dependencies only hand them out. A dependency that builds a client per request is a hidden performance bug.",
    "Remember that 'def' dependencies run in the thread pool and 'async def' ones on the event loop. A blocking call inside an async dependency blocks the server just like in an endpoint."
  ]
});

EXTRA(7, "Background jobs", {
  deep: [
    "There are two very different kinds of background work. In-process tasks, like FastAPI's BackgroundTasks, run in the same server process right after the response is sent. A job queue stores the job in an external broker and a separate worker process runs it. The first kind is simple but the job lives only in memory: if the server restarts or crashes, the job is gone and nobody knows.",
    "In-process tasks also share resources with your API. A CPU-heavy task makes the same process slow for other requests, and there are no retries, no scheduling and no way to see what failed. Use them only for small things where losing one is acceptable, for example writing an analytics event. Use a real queue when the job matters, takes long, or must be retried.",
    "With a queue, a job can run more than once: the worker may crash after doing the work but before reporting success, and the broker will deliver it again. So jobs must be idempotent, meaning running them twice gives the same result as once. Typical methods are checking a status column before acting, using a unique key so a second insert fails, or sending an idempotency key to the external service.",
    "The API side changes too. For long jobs the endpoint should return 202 Accepted with a job ID, and the client checks a status endpoint or receives a webhook later. Do not keep the HTTP request open for a five-minute job; proxies and clients will time out. Also do not move everything to the background: if the user needs the result now and it is fast, do it in the request."
  ],
  iq: [
    { q: "What happens to FastAPI BackgroundTasks jobs if the server is redeployed?", a: "Jobs that have not finished are lost, because they exist only in the memory of the old process. There is no retry and no record. That is why they suit only small, non-critical work. For anything important use a durable queue such as Celery, RQ, Dramatiq or Arq, where the job is stored in a broker until a worker confirms it." },
    { q: "The API saves an order and queues a job, but the worker says the order does not exist. Why?", a: "The job was queued before the database transaction committed, so the worker read the database too early. Queue the job only after the commit. A stronger design is the outbox pattern: write the job as a row in the same transaction and let a separate process send it to the broker, so the order and the job are saved together or not at all." },
    { q: "How do you design a long-running task for a client that needs the result?", a: "Return 202 Accepted at once with a job ID and a status URL. The worker updates the job status in a database or cache. The client polls the status URL, or you push the result with a webhook, SSE or WebSocket. This keeps HTTP requests short and survives timeouts and page reloads.", c: `
import uuid
from fastapi import FastAPI

app = FastAPI()

@app.post("/reports", status_code=202)
async def create_report():
    job_id = str(uuid.uuid4())
    generate_report.delay(job_id)                 # queue task (Celery style)
    return {"job_id": job_id, "status_url": f"/reports/{job_id}"}
` },
    { q: "Why should you pass an ID to a job and not the whole object?", a: "The job may run seconds or hours later, and the object may have changed by then; the worker should load fresh data. Large or complex objects are also slow and risky to serialise, and they put private data inside the broker. Pass small, simple values such as IDs and let the worker read the rest." }
  ],
  tips: [
    "Make every job safe to run twice. Check 'already done' at the start, for example a sent_at timestamp, before sending an email or charging a card.",
    "Give every job a time limit and a maximum number of retries, and send jobs that still fail to a dead letter queue or a 'failed' table that someone looks at.",
    "Monitor queue length and the age of the oldest job. A growing queue is the first sign that workers are too few or stuck.",
    "In tests, run jobs inline (eager mode or calling the function directly) for logic, and keep a small number of tests that use a real broker."
  ]
});

EXTRA(7, "Celery", {
  deep: [
    "Celery has three parts: the client that sends a task message, the broker that stores it, and the workers that run it. A result backend is optional and stores return values. A task message contains only the task name and its arguments, usually as JSON. The worker must have the same code, finds the function by name and calls it.",
    "Acknowledgement decides what happens when a worker dies. By default Celery acks a message just before the task runs, so if the worker is killed in the middle, the task is lost (at-most-once). With acks_late=True the ack is sent after the task finishes, so a killed task is delivered again (at-least-once), which requires the task to be idempotent. Workers also prefetch several messages in advance; with long tasks this can leave tasks waiting inside one busy worker while others are idle, so set the prefetch multiplier to 1 for long tasks.",
    "Retries are explicit. A task can call self.retry, or you can list exceptions in autoretry_for with retry_backoff and retry_jitter so that waiting time grows and is spread out. With Redis as broker there is a visibility timeout: a task that is not acked within that time is given to another worker. A task with a long countdown or a very long run time can therefore run twice.",
    "Celery is powerful but has many settings and moving parts. For a small project, a simpler queue (RQ, Dramatiq, Arq) or even a database-backed queue can be enough. Celery is also not a workflow engine with durable state for multi-day processes. Periodic tasks need a separate 'beat' process, and there must be exactly one beat running or tasks are scheduled twice."
  ],
  iq: [
    { q: "What does acks_late do and when would you use it?", a: "It moves the acknowledgement from before the task to after it. If the worker crashes during the task, the broker gives the task to another worker, so it is not lost. The price is that a task can run twice, so use it only with idempotent tasks. It is usually combined with a low prefetch setting.", c: `
app.conf.task_acks_late = True
app.conf.worker_prefetch_multiplier = 1
app.conf.task_reject_on_worker_lost = True

@app.task(bind=True, autoretry_for=(ConnectionError,),
          retry_backoff=True, retry_jitter=True, max_retries=5)
def charge(self, order_id):
    ...
` },
    { q: "A task with countdown of two hours runs twice with a Redis broker. Why?", a: "Redis has no native delayed delivery, so the worker holds the message unacked until its time comes. If that is longer than the visibility timeout, Redis thinks the worker died and delivers the message again. Fix it by raising the visibility timeout above your longest delay, or by storing the due time in a database and using a periodic task to send due work." },
    { q: "How do you stop a task from running forever?", a: "Set a soft and a hard time limit. The soft limit raises an exception inside the task so it can clean up; the hard limit kills the process that runs the task. Also set timeouts on every network call inside the task. Without limits, a few stuck tasks can occupy all worker processes and stop the whole queue.", c: `
app.conf.task_soft_time_limit = 270     # raises SoftTimeLimitExceeded
app.conf.task_time_limit = 300          # the process is killed
` },
    { q: "Why is the result backend often turned off, and when do you need it?", a: "Storing a result for every task costs writes and memory, and most tasks (send email, resize image) have no result anyone reads. Unread results pile up until they expire. Turn it on only for tasks whose return value is used, or write the outcome to your own database table, which is easier to query." }
  ],
  tips: [
    "Use separate queues for fast and slow tasks (for example 'emails' and 'reports') with their own workers. Otherwise one slow report blocks hundreds of quick emails.",
    "In Django, queue tasks with transaction.on_commit so the worker never runs before the data is committed.",
    "Run Flower or export Celery metrics, and alert on queue length and failure rate. Silent task failures are the most common Celery problem.",
    "Pass only JSON-friendly arguments (IDs, strings, numbers) and keep the JSON serializer. Do not accept pickle from a broker that others can reach."
  ]
});

EXTRA(7, "Redis", {
  deep: [
    "Redis runs commands on a single thread. Each command runs completely before the next one starts, so every single command is atomic and there are no locks inside. It is fast because all data is in memory and because one thread with an event loop avoids context switches. Newer versions can use extra threads for network I/O, but command execution is still one at a time.",
    "The single thread is also the main risk. One slow command blocks every client. KEYS on a big database, a huge LRANGE, or a long Lua script can freeze Redis for seconds. Use SCAN to walk keys in small steps, keep values small, and delete big keys with UNLINK, which frees memory in the background.",
    "Memory is limited, so you must decide what happens when it is full. With the default policy (noeviction) writes start to fail. For a cache you set maxmemory and a policy such as allkeys-lru, which removes keys that were not used recently. Expired keys are not removed at the exact second: Redis deletes them when they are accessed and also samples some keys in the background.",
    "Redis is not durable like a relational database unless you configure it. RDB makes snapshots at intervals, so a crash loses the latest changes. AOF logs every write and loses less, depending on the fsync setting. Replication is asynchronous, so a failover can lose the last writes. Use Redis for caches, counters, sessions and queues; do not make it the only store for data you cannot rebuild."
  ],
  iq: [
    { q: "If Redis is single-threaded, how can it be so fast, and what is the downside?", a: "All work is in memory, the data structures are efficient, and one thread means no locking and no context switching; an event loop handles many connections. The downside is that any slow command blocks all other clients, and one instance uses one CPU core for commands. You scale with replicas for reads and with Redis Cluster, which splits keys over several nodes." },
    { q: "Why should you never run KEYS in production, and what do you use instead?", a: "KEYS checks every key in one command, and during that time Redis serves nobody else. On millions of keys that can be seconds. SCAN returns a small batch and a cursor each time, so other commands run in between. SCAN may return a key twice, so the code must tolerate duplicates.", c: `
import redis

r = redis.Redis(decode_responses=True)
for key in r.scan_iter(match="session:*", count=500):
    r.unlink(key)                 # non-blocking delete
` },
    { q: "How do you build a simple distributed lock with Redis, and what can go wrong?", a: "Use SET with NX (only if it does not exist) and an expiry, with a random token as value. Release it only if the value is still your token, using a small Lua script so check and delete are atomic. The risk: if your work takes longer than the expiry, the lock is released and a second worker enters. So the lock is fine for efficiency, but for strict correctness also protect the data itself, for example with a version check in the database.", c: `
import uuid, redis

r = redis.Redis()
token = str(uuid.uuid4())

if r.set("lock:report", token, nx=True, ex=30):
    try:
        print("doing the work")
    finally:
        r.eval(
            "if redis.call('get', KEYS[1]) == ARGV[1] then "
            "return redis.call('del', KEYS[1]) else return 0 end",
            1, "lock:report", token)
` },
    { q: "What is the difference between RDB and AOF persistence?", a: "RDB writes a compact snapshot of all data at intervals; restart is fast, but changes since the last snapshot are lost. AOF appends each write command to a file; with fsync every second you lose at most about one second, but the file is bigger and restart is slower. Many setups enable both. For a pure cache you can disable persistence completely." }
  ],
  tips: [
    "Set maxmemory and an eviction policy on every cache instance. Use a separate instance (or at least different settings) for data that must not be evicted, such as a job queue.",
    "Always give cache and session keys a TTL, and use clear key names with a prefix and version, for example 'v2:product:42'.",
    "Use a pipeline to send many commands in one round trip. The network trip, not Redis, is usually the slow part.",
    "Use one connection pool per process and set socket timeouts. A Redis problem should make your app degrade (cache miss), not hang."
  ]
});

EXTRA(7, "PostgreSQL", {
  deep: [
    "PostgreSQL uses MVCC, multi-version concurrency control. An UPDATE does not change a row in place; it writes a new version of the row and marks the old one as ended. Each transaction sees only the row versions that were committed when its snapshot was taken. Because of this, readers do not block writers and writers do not block readers.",
    "Old row versions stay in the table until VACUUM removes them. Autovacuum does this in the background. If a transaction stays open for a long time, vacuum cannot remove versions that this transaction might still need, and tables and indexes grow ('bloat') and get slower. So long-running or idle open transactions are a real production problem, not just bad style.",
    "Durability comes from the write-ahead log (WAL). A change is first written to the log and flushed to disk, and only later written to the table files. After a crash the server replays the log. The same log is sent to replicas for replication. Queries are planned using table statistics, and EXPLAIN ANALYZE shows the plan that was chosen and the real time of each step.",
    "Each connection is a separate server process, which uses memory and makes thousands of direct connections a bad idea; that is why poolers exist. Indexes speed up reads but slow down writes and take space, so index what your queries really filter and sort on. PostgreSQL is a good default database, but it is not the right tool for a pure cache, for very high write volumes of simple events without care, or for heavy analytics on huge tables, where a column store fits better."
  ],
  iq: [
    { q: "What is MVCC and what problem does it create?", a: "Each change creates a new row version and each transaction reads from a consistent snapshot, so reads and writes do not block each other. The cost is dead row versions that must be cleaned by VACUUM. If cleaning cannot keep up, or a long transaction holds it back, the table bloats and queries slow down." },
    { q: "A query is slow. How do you find out why?", a: "Run EXPLAIN ANALYZE and read the plan. Look for a sequential scan on a big table, a large difference between estimated and actual rows, or a sort that spills to disk. Then add or fix an index, rewrite the query, or refresh statistics with ANALYZE. Do not add indexes by guessing; check the plan before and after.", c: `
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;
-- Seq Scan on orders ...        reads the whole table

CREATE INDEX CONCURRENTLY idx_orders_user_created
    ON orders (user_id, created_at DESC);
-- Index Scan using idx_orders_user_created ...
` },
    { q: "Why is CREATE INDEX dangerous on a large live table, and what do you do?", a: "A normal CREATE INDEX blocks writes to the table until it finishes, which can be minutes. CREATE INDEX CONCURRENTLY builds the index without blocking writes; it is slower and cannot run inside a transaction block. If it fails, it leaves an invalid index that you must drop and build again." },
    { q: "You have an index on (user_id, created_at). Will a query that filters only on created_at use it?", a: "Usually not efficiently. A B-tree index is sorted by the first column and then by the second, like a phone book sorted by family name and then first name. Searching only by the second column cannot use that order. Put the column used with equality first, then the range or sort column, or create a separate index for the other query." }
  ],
  tips: [
    "Enable pg_stat_statements and look at the queries with the highest total time. Fixing the top three usually gives most of the benefit.",
    "Set statement_timeout and idle_in_transaction_session_timeout for the application role, so one bad query or a forgotten open transaction cannot hurt the whole database.",
    "Use timestamptz for times, and bigint or UUID for primary keys in tables that can grow large. Changing these later is expensive.",
    "Run schema changes with a migration tool, test them on a copy with production-size data, and set a lock_timeout so a migration fails fast when it cannot get its lock."
  ]
});

EXTRA(7, "SQLAlchemy", {
  deep: [
    "SQLAlchemy has two layers. Core is a SQL builder: tables, columns and expressions that become SQL text with bound parameters. The ORM sits on top and maps rows to Python objects. You can mix them, and for reports or bulk work Core is often the better tool because it avoids creating an object for every row.",
    "The Session is a unit of work. It tracks objects you load, add or change, and sends the needed SQL at flush time. A flush sends SQL inside the current transaction; a commit makes it permanent. The session also has an identity map: inside one session, a given primary key is always the same Python object. A session is not thread-safe and should not be shared between concurrent requests or tasks.",
    "By default a relationship is lazy: the related rows are loaded with a new query the first time you touch the attribute. In a loop this becomes N+1 queries. You choose a loading strategy in the query: selectinload runs one extra query with an IN list and is good for collections; joinedload uses a JOIN and is good for many-to-one. With the async session, lazy loading on attribute access does not work and raises an error, so you must load eagerly.",
    "After a commit, the session by default marks all loaded objects as expired, and the next attribute access reloads them. That surprises people who return objects after closing the session. An ORM is also the wrong tool for huge bulk inserts or updates one object at a time; use bulk statements. And an ORM does not remove the need to understand SQL: you still need to read the generated queries."
  ],
  iq: [
    { q: "What is the difference between flush and commit?", a: "Flush sends the pending INSERT, UPDATE and DELETE statements to the database but keeps the transaction open, so the changes can still be rolled back and other transactions do not see them. Commit ends the transaction and makes the changes permanent; it flushes first. You flush when you need a generated primary key before the transaction is finished." },
    { q: "How do you fix N+1 queries in SQLAlchemy?", a: "Tell the query to load the relationship in advance. selectinload loads all children for all parents in one extra query. joinedload gets parent and related row in one JOIN, which is best for many-to-one. Setting lazy='raise' on a relationship makes accidental lazy loads fail loudly in tests.", c: `
from sqlalchemy import select
from sqlalchemy.orm import selectinload

stmt = select(User).options(selectinload(User.orders))
users = session.scalars(stmt).all()      # 2 queries in total, not N+1
for user in users:
    print(user.email, len(user.orders))
` },
    { q: "Why do you get DetachedInstanceError or a MissingGreenlet error when reading an attribute?", a: "The object tried to load data lazily but could not. In the sync case the session was already closed or the object was expired after commit. In the async case, lazy loading needs I/O at a place where no await is possible. Load what you need before leaving the session, use eager loading, or set expire_on_commit=False for the session.", c: `
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/shop")
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
` },
    { q: "What should the scope of a Session be in a web application?", a: "One session per request: open it at the start, commit or roll back at the end, and always close it. A global session shared by all requests mixes transactions of different users and breaks under concurrency. In background jobs, use one session per job. The engine, in contrast, is created once for the whole application." }
  ],
  tips: [
    "Turn on echo=True (or SQL logging) while developing a new endpoint and read the queries it runs. Surprises show up immediately.",
    "Manage the schema with Alembic migrations and review autogenerated migrations by hand. Autogenerate misses some changes, such as renames, which it sees as drop plus add.",
    "For bulk writes use session.execute(insert(Model), list_of_dicts) and not thousands of session.add calls.",
    "Test against the same database engine as production, for example PostgreSQL in a container. SQLite behaves differently for types, constraints and locking."
  ]
});

EXTRA(7, "Transactions", {
  deep: [
    "The 'I' in ACID, isolation, is the part with real choices. The SQL standard defines levels by the problems they allow. Read Committed (the PostgreSQL default) lets each statement see data committed before that statement started, so two reads in one transaction can return different values. Repeatable Read gives the whole transaction one snapshot. Serializable behaves as if transactions ran one after another, and aborts a transaction when that cannot be guaranteed.",
    "The classic bug at the default level is the lost update. Two transactions read the same balance, both calculate a new value in the application, and both write; the second write overwrites the first. There are three standard fixes: do the calculation in the UPDATE statement itself, lock the row with SELECT ... FOR UPDATE before reading, or use optimistic locking with a version column and retry when the version has changed.",
    "Locks bring deadlocks. Transaction A locks row 1 and wants row 2, while B locks row 2 and wants row 1. The database detects this and aborts one of them with an error. You reduce deadlocks by always locking rows in the same order, for example by ascending ID, and by keeping transactions short. Higher isolation levels and deadlocks both mean the application must be ready to retry a transaction.",
    "A transaction should be short and contain only database work. Do not call an external API or wait for user input while a transaction is open: locks are held, a pool connection is busy and vacuum is blocked. A database transaction also cannot roll back things outside the database, such as an email that was sent or a card that was charged. Those need other patterns, such as the outbox pattern or compensating actions."
  ],
  iq: [
    { q: "Two requests withdraw from the same account at the same time and the balance goes negative. How do you prevent it?", a: "The check and the update must be protected together. Lock the row with SELECT FOR UPDATE so the second transaction waits until the first commits and then sees the new balance. Or use one atomic statement: UPDATE ... SET balance = balance - 500 WHERE id = 1 AND balance >= 500, and check that one row was changed.", c: `
from sqlalchemy import select
from sqlalchemy.orm import Session

with Session(engine) as session, session.begin():
    account = session.execute(
        select(Account).where(Account.id == 1).with_for_update()
    ).scalar_one()                       # other writers wait here
    if account.balance < 500:
        raise ValueError("not enough money")
    account.balance -= 500
# commit happens here; the lock is released
` },
    { q: "What is optimistic locking and when is it better than SELECT FOR UPDATE?", a: "You do not lock. Each row has a version number; the UPDATE includes the version you read and increases it. If no row was updated, someone else changed it first and you retry or show a conflict. It is better when conflicts are rare or when a user edits a form for a long time, because no lock is held. With many conflicts, pessimistic locking wastes less work.", c: `
UPDATE products
SET stock = stock - 1, version = version + 1
WHERE id = 7 AND version = 3;
-- 0 rows updated means another transaction changed the row: reload and retry
` },
    { q: "What is the difference between a non-repeatable read and a phantom read?", a: "A non-repeatable read is when you read the same row twice in one transaction and get different values because another transaction changed it and committed. A phantom read is when you run the same query twice and the set of rows is different, because another transaction inserted or deleted matching rows. Repeatable Read prevents the first; the standard requires Serializable to prevent the second, though PostgreSQL's Repeatable Read also prevents phantoms." },
    { q: "Why is it a bad idea to call a payment API inside a database transaction?", a: "The call can take seconds, and during that time the transaction holds row locks and a pooled connection, so other requests wait and the pool can run out. Also, if the transaction rolls back after the payment succeeded, the database and the payment provider disagree. Save a 'pending' state and commit, call the API outside the transaction, then record the result in a second transaction." }
  ],
  tips: [
    "Use a context manager for every transaction (session.begin() or transaction.atomic) so commit and rollback cannot be forgotten.",
    "Add database constraints (UNIQUE, CHECK, foreign keys) for rules that must never break. Application checks alone lose against concurrent requests.",
    "Write a retry wrapper for serialization failures and deadlocks, with a small number of attempts, and make sure the retried code has no side effects outside the database.",
    "Test concurrency for real: start two threads or two sessions in a test and make them hit the same row. A single-user test never shows a race condition."
  ]
});

EXTRA(7, "Connection pooling", {
  deep: [
    "A new PostgreSQL connection needs a TCP handshake, often TLS, authentication and a new server process. A pool pays this cost once. When code asks for a connection, the pool hands out a free one; when the code is done, the connection goes back, after the pool resets its state with a rollback. If all are in use, the caller waits up to the pool timeout and then gets an error.",
    "Pool exhaustion is the typical failure. It happens when connections are held too long or not returned: a session that is never closed, a slow query, or a slow external call made while holding a connection. Then every request waits for a connection, latency jumps for the whole service, and the errors mention the pool, not the real cause. The fix is nearly always to shorten how long a connection is held, not to increase the pool size.",
    "Sizing needs simple maths. Each process has its own pool, so the total possible connections are processes multiplied by (pool_size + max_overflow), summed over all services and background workers. This must stay below the database's max_connections with some left for admin tools. A bigger pool is not faster: the database has limited CPU and disk, and too many active connections make it slower.",
    "When many app instances exist, an external pooler such as PgBouncer sits between the apps and the database and shares a small number of real connections. In transaction mode a client gets a server connection only for the length of one transaction. That breaks features tied to a session, such as session-level SET, advisory locks and LISTEN. Serverless functions are a special case: each instance can open its own connection, so they nearly always need an external pooler."
  ],
  iq: [
    { q: "The app starts throwing pool timeout errors under load. What do you check?", a: "First find what holds connections: slow queries, sessions not closed on error paths, and external HTTP calls made inside a transaction. Check how long connections are checked out and how many are in use. Increasing pool size is the last step, and only if the database has capacity. A larger pool with a leak just fails a little later." },
    { q: "You have 8 Gunicorn workers with pool_size=10 and max_overflow=5, and 4 app servers. How many connections can the database see?", a: "Each worker process has its own pool, so it is 8 x (10 + 5) = 120 per server and 480 in total. That is far above a typical max_connections setting, so new connections will be refused under load. Reduce the per-process pool or put PgBouncer in front.", c: `
# connections = servers x workers x (pool_size + max_overflow)
#             = 4 x 8 x (10 + 5) = 480

engine = create_engine(
    "postgresql+psycopg://user:pass@localhost/shop",
    pool_size=3,
    max_overflow=2,       # 4 x 8 x 5 = 160 worst case
    pool_timeout=5,       # fail fast, do not queue for 30 seconds
)
` },
    { q: "What do pool_pre_ping and pool_recycle solve?", a: "Connections can die while they sit idle in the pool: the database restarted, or a firewall or load balancer closed an idle connection. pool_pre_ping runs a tiny check before handing out a connection and replaces a dead one. pool_recycle closes connections older than a given age, so they are renewed before some network device cuts them. Without these you see random 'connection closed' errors after quiet periods." },
    { q: "Why can PgBouncer in transaction mode break an application?", a: "Two transactions from the same client may run on different server connections. Anything that depends on session state is lost between them: SET commands, temporary tables, advisory locks, LISTEN/NOTIFY, and in some setups prepared statements. You must avoid those features, configure the driver for it, or use session mode for the clients that need them." }
  ],
  tips: [
    "Use a short pool_timeout (a few seconds) in web services. Failing fast with a clear error is better than every request hanging for 30 seconds.",
    "Always release the connection before slow non-database work: load the data, close or commit, then call the external API.",
    "Export pool metrics (connections in use, waiting requests, checkout time) and alert when usage stays near the maximum.",
    "When you already use PgBouncer in transaction mode, consider disabling the application-side pool (NullPool in SQLAlchemy) to avoid two pools fighting each other."
  ]
});

EXTRA(7, "Caching", {
  deep: [
    "The most common pattern is cache-aside: the application checks the cache, on a miss reads the database and writes the result to the cache. Other patterns are write-through (every write updates the cache and the database together) and write-behind (write to the cache first and to the database later, which is fast but can lose data). Cache-aside is simple and safe, because a broken cache only means slower reads.",
    "Invalidation is the hard part. A TTL alone means users can see old data for up to that time. Deleting the key when the data changes is fresher, but must be done on every write path. The usual rule is: update the database first, then delete the cache key, and still keep a TTL as a safety net. Deleting is safer than writing the new value, because two concurrent writers could store their values in the wrong order.",
    "A cache stampede happens when a popular key expires and many requests miss at the same moment; all of them run the same expensive query and can overload the database. Fixes: let only one request rebuild the value while the others wait or get the old value, add random jitter to TTLs so keys do not expire together, or refresh hot keys before they expire. A related problem is cache penetration: requests for IDs that do not exist always miss, so cache the 'not found' result for a short time.",
    "Caching is not free. It adds a second copy of the truth, new failure modes and bugs that are hard to reproduce. Do not cache before you have measured that the query is slow and called often. Do not cache data that must be exactly correct at the moment of use, such as an account balance used for a payment decision. And remember HTTP caching (Cache-Control, ETag) and CDNs: the fastest request is one that never reaches your server."
  ],
  iq: [
    { q: "What is a cache stampede and how do you prevent it?", a: "When a hot key expires, many requests miss together and all rebuild the same value, which can take the database down. Prevent it with a short lock so only one caller rebuilds, with stale-while-revalidate (serve the old value while one caller refreshes), and with random TTL jitter so many keys do not expire at the same second.", c: `
import json, random, time, redis

r = redis.Redis(decode_responses=True)

def get_product(pid):
    key = f"product:{pid}"
    for _ in range(50):
        cached = r.get(key)
        if cached:
            return json.loads(cached)
        if r.set(key + ":lock", 1, nx=True, ex=10):    # one caller rebuilds
            try:
                product = load_from_db(pid)
                r.set(key, json.dumps(product), ex=300 + random.randint(0, 60))
                return product
            finally:
                r.delete(key + ":lock")
        time.sleep(0.1)                                # others wait, re-check
    return load_from_db(pid)
` },
    { q: "On a write, should you update the cache or delete the key? And in which order with the database?", a: "Write the database first, then delete the key. If you write the new value into the cache, two concurrent updates can finish in different orders in the database and in the cache, and the cache keeps the older value. Deleting lets the next reader load the true value. If you delete before the database write, a reader can put the old value back in between." },
    { q: "Even with 'update database, then delete key', stale data is still possible. How?", a: "A reader can miss the cache and read the old row, then a writer updates the row and deletes the key, and then the reader stores its old value. The window is small but real. That is why you always keep a TTL as a backstop. For data that must be right, read from the database, or put a version in the cached value and reject older ones." },
    { q: "When would you use an in-process cache and when Redis?", a: "An in-process cache (a dict or lru_cache) has no network cost and is the fastest, but each process has its own copy, so data can differ between servers and is lost on restart. Redis is shared by all servers and survives app restarts, at the cost of a network round trip. Small, rarely changing data such as config or country lists fits in-process; user-facing data that must be consistent across servers fits Redis." }
  ],
  tips: [
    "Wrap cache calls so that a Redis error or timeout becomes a cache miss. The cache must never be a reason for a 500 error.",
    "Put a version in the key name (for example 'v3:product:42'). When the data format changes, bump the version and the old entries are ignored.",
    "Measure the hit rate. A cache with a low hit rate adds cost and complexity for nothing; fix the key design or remove it.",
    "Be careful with per-user data: the key must include the user or tenant ID. A missing ID in a cache key shows one user's data to another."
  ]
});

EXTRA(7, "Rate limiting", {
  deep: [
    "The fixed window counter is the simplest algorithm: count requests per client per minute and reset at the start of each minute. Its weakness is the window edge. A client can send the full limit in the last second of one window and again in the first second of the next, so twice the limit passes in two seconds. A sliding window fixes this by looking at the last 60 seconds from now, either with a log of timestamps (exact, more memory) or with a weighted mix of the current and previous window (approximate, cheap).",
    "The token bucket is the most used algorithm. A bucket holds up to B tokens and is refilled at r tokens per second. Each request takes one token; with no token the request is rejected. This allows a burst of up to B requests and then a steady rate of r. You only need to store two numbers per client, the token count and the last update time, and compute: tokens = min(B, tokens + elapsed x r). The leaky bucket is similar but releases requests at a constant rate, which smooths traffic.",
    "With several app servers the counters must be shared, usually in Redis, and the read-change-write must be atomic. Otherwise two servers read the same count and both allow the request. Use single atomic commands, a MULTI/EXEC transaction or a Lua script. Also decide what happens when Redis is down: 'fail open' keeps the service working but unprotected, 'fail closed' protects but blocks all users.",
    "Choosing the key is as important as the algorithm. Limiting by IP punishes many users behind one office or mobile network address, and the client IP can be faked if you trust the X-Forwarded-For header blindly. Prefer API key or user ID when the user is known, and IP only for anonymous endpoints such as login. Rate limiting does not stop a large distributed attack; that needs protection at the network edge."
  ],
  iq: [
    { q: "What is the weakness of the fixed window algorithm?", a: "Bursts at the window boundary. With a limit of 100 per minute, a client can send 100 requests at 12:00:59 and 100 more at 12:01:00, so 200 requests in two seconds are allowed. A sliding window or a token bucket limits the rate over any period, not only inside fixed clock windows." },
    { q: "Explain the token bucket and write it.", a: "The bucket has a capacity and a refill rate. On each request you first add the tokens earned since the last request, up to the capacity, then take one token if there is one. Capacity controls the burst size, the refill rate controls the long-term rate. No background timer is needed, because the refill is calculated from the elapsed time.", c: `
import time

class TokenBucket:
    def __init__(self, capacity, refill_per_sec):
        self.capacity, self.rate = capacity, refill_per_sec
        self.tokens, self.updated = capacity, time.monotonic()

    def allow(self):
        now = time.monotonic()
        earned = (now - self.updated) * self.rate
        self.tokens = min(self.capacity, self.tokens + earned)
        self.updated = now
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False

bucket = TokenBucket(capacity=10, refill_per_sec=2)   # burst 10, then 2 per second
` },
    { q: "INCR followed by EXPIRE in two separate calls has a bug. What is it?", a: "If the process crashes or the connection drops after INCR and before EXPIRE, the key has no expiry and the counter never resets, so that client is blocked forever. The two steps must be atomic. Send them in one MULTI/EXEC transaction or one Lua script, or create the key with its expiry using SET with NX before the INCR.", c: `
import redis

r = redis.Redis()

def allow(client_id, limit=5, window=60):
    key = f"rate:{client_id}"
    pipe = r.pipeline()                    # MULTI/EXEC: runs as one unit
    pipe.set(key, 0, ex=window, nx=True)   # create with expiry if missing
    pipe.incr(key)
    _, count = pipe.execute()
    return count <= limit
` },
    { q: "What should the server send when a client is limited, and what should a good client do?", a: "Send status 429 with a Retry-After header that tells the client how long to wait. A good client waits that long, or uses exponential backoff with jitter, and does not retry at once. Clear limit headers and documentation reduce support questions and stop clients from hammering the API in a tight loop." }
  ],
  tips: [
    "Put coarse limits at the edge (API gateway, Nginx, CDN) and fine, business-level limits in the app, for example 'five password resets per account per hour'.",
    "Use stricter limits on expensive and sensitive endpoints (login, search, export, anything that sends SMS or email) than on cheap reads.",
    "Behind a proxy, take the client IP from the header that your own trusted proxy sets, and never from a header the client can send freely.",
    "Start a new limit in 'log only' mode, look at who would be blocked, then turn on enforcement. This avoids blocking good customers on day one."
  ]
});

EXTRA(7, "Pagination", {
  deep: [
    "OFFSET looks cheap but is not. To return rows 100,001 to 100,020 the database must find and step over the first 100,000 rows and throw them away. The cost grows with the page number, so deep pages become slow even with a good index. A total count for 'page 3 of 250' is another hidden cost, because counting matching rows on a big table is also slow.",
    "Offset pages are also unstable when data changes. If a new row is inserted at the top while a user is on page 1, every row moves down by one, and the last row of page 1 appears again as the first row of page 2. If a row is deleted, one row is skipped. For a feed that changes all the time, users see duplicates and miss items.",
    "Keyset (cursor) pagination remembers the last row seen and asks for rows after it: WHERE (created_at, id) < (last values) ORDER BY created_at DESC, id DESC LIMIT n. With an index on those columns the database jumps straight to the position, so page 1 and page 10,000 cost the same. New rows at the top do not shift what comes next. The sort key must be unique, which is why the ID is added as a tiebreaker when sorting by a timestamp.",
    "The price of keyset pagination is flexibility. You cannot jump to page 57, only go next (and previous, with more work), and every allowed sort order needs a matching index. So the choice depends on the screen: an admin table with page numbers on a small data set is fine with offset; infinite scroll, public APIs and exports of large tables should use a cursor. Whichever you use, always have a stable ORDER BY, or the database may return rows in a different order on each call."
  ],
  iq: [
    { q: "A user scrolls a feed with offset pagination while new posts arrive. What goes wrong?", a: "Each new post at the top pushes all rows down by one position. The next page starts at an offset that now points one row earlier, so the user sees a post they already saw. With deletes the opposite happens and a post is skipped. A cursor based on the last seen row is not affected, because it is tied to a value, not to a position." },
    { q: "Write a keyset query for 'newest first'. Why is the ID in it?", a: "Many rows can have the same timestamp. If the cursor used only the timestamp, rows with the same value could be skipped or repeated at the page border. Adding the unique ID makes the order total and the cursor exact. The row comparison also lets the database use a two-column index.", c: `
-- index: CREATE INDEX idx_posts_feed ON posts (created_at DESC, id DESC);

SELECT id, created_at, title
FROM posts
WHERE (created_at, id) < ('2026-10-01 10:00:00', 5120)   -- last row of the previous page
ORDER BY created_at DESC, id DESC
LIMIT 21;     -- ask for limit + 1 to know if a next page exists
` },
    { q: "Why is OFFSET 1000000 slow even with an index?", a: "The index gives the order, but the database still has to walk through one million entries to reach the start position, and it discards all of them. Work is proportional to offset plus limit. A keyset condition lets the index seek directly to the start, so the work is proportional only to the limit." },
    { q: "How do you design the cursor that the API returns to clients?", a: "Encode the sort values of the last row (for example created_at and id) into one opaque string, such as base64 of a small JSON, and return it as next_cursor. Clients must treat it as a black box and just send it back. That lets you change the internals later. Validate it on the server, because clients can send anything.", c: `
import base64, json

def encode_cursor(created_at: str, row_id: int) -> str:
    raw = json.dumps({"c": created_at, "i": row_id}).encode()
    return base64.urlsafe_b64encode(raw).decode()

def decode_cursor(cursor: str) -> dict:
    return json.loads(base64.urlsafe_b64decode(cursor.encode()))
` }
  ],
  tips: [
    "Always enforce a maximum page size on the server. A client that sends limit=1000000 should get your maximum, not an out-of-memory crash.",
    "Fetch limit + 1 rows to learn if there is a next page. It avoids a separate COUNT query.",
    "Skip the exact total when the table is large. Show 'more results' or an estimate; an exact count on every page request is often the slowest part.",
    "Return next_cursor as null on the last page and document that. Clients need a clear, simple stop condition."
  ]
});

EXTRA(7, "Streaming", {
  deep: [
    "In a normal response the server knows the full body, sends a Content-Length header and then the bytes. In a streaming response the length is unknown, so HTTP/1.1 uses chunked transfer encoding: each piece is sent with its size, and a zero-size chunk ends the body. In ASGI your generator yields pieces and the server sends each one as a separate body message. Memory use stays flat because only one piece exists at a time.",
    "The status code and headers are sent before the first piece. This has an important effect: if an error happens in the middle, you cannot change the status to 500 any more, because 200 has already gone out. The client just sees the stream stop. Streaming protocols therefore send errors as part of the data, for example an SSE event of type 'error', and clients must handle a stream that ends early.",
    "Everything between your app and the user can break streaming by buffering. Reverse proxies such as Nginx buffer responses by default, compression middleware collects data before it sends, and some corporate proxies wait for the full body. The user then sees nothing for a long time and then everything at once. You must turn buffering off for streaming routes and set long read timeouts.",
    "Server-Sent Events is a small text format on top of a streamed HTTP response. It is one-way, server to client, the browser reconnects automatically, and it can send the last event ID so the server can continue from there. It is the simple choice for notifications and AI token streams. Use WebSockets when the client must also send frequent messages. Streaming is the wrong tool for small responses: it adds complexity and you lose easy caching and simple error handling."
  ],
  iq: [
    { q: "An exception is raised after half the stream was sent. What does the client receive?", a: "It already received status 200 and the headers, so the status cannot be changed. The connection is closed and the client sees an incomplete body. The design must cover this: send an explicit error event or a final 'done' marker in the data, so the client can tell a complete stream from a broken one." },
    { q: "Streaming works locally but in production the client gets everything at the end. Why?", a: "Something in between is buffering. The usual cause is the reverse proxy; compression middleware can do the same. Disable proxy buffering for that route and check each layer: gateway, load balancer, CDN.", c: `
location /chat {
    proxy_pass http://app;
    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_read_timeout 3600s;
}
` },
    { q: "SSE or WebSocket for streaming chatbot answers?", a: "SSE is usually enough. The data flows one way, it is plain HTTP so it passes proxies and existing auth easily, and the browser reconnects by itself. WebSocket is worth its extra complexity only when the client also sends many messages on the same connection, such as in a game or a shared editor. One limit of the browser EventSource API is that it cannot set custom headers, so many apps read the stream with fetch." },
    { q: "How does the server notice that the client closed the page, and why does it matter?", a: "When the connection closes, the ASGI server cancels the response or reports a disconnect, and the generator should stop. If it does not, the server keeps doing work, such as paying for AI tokens, for a user who has left. Check for disconnect in long loops and put cleanup in a finally block.", c: `
import asyncio
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.get("/events")
async def events(request: Request):
    async def gen():
        try:
            while not await request.is_disconnected():
                yield "data: ping" + chr(10) + chr(10)
                await asyncio.sleep(1)
        finally:
            print("client gone: stop upstream work here")
    return StreamingResponse(gen(), media_type="text/event-stream")
` }
  ],
  tips: [
    "Send a comment line or heartbeat event every 15 to 30 seconds on SSE. Idle connections are cut by proxies and load balancers.",
    "Do not hold a database connection for the whole length of a long stream. Load what you need, release the connection, then stream.",
    "For big file downloads, yield reasonably large chunks (tens of kilobytes), not single lines. Very small chunks waste CPU and network.",
    "Test streaming with 'curl -N' against the real production path, not only against localhost. That is where buffering problems appear."
  ]
});

EXTRA(7, "WebSockets", {
  deep: [
    "A WebSocket starts as a normal HTTP request with an 'Upgrade: websocket' header. The server answers with status 101 and from then on the same TCP connection carries WebSocket frames in both directions. Frames can be text, binary, or control frames such as ping, pong and close. Because the start is HTTP, cookies and headers are available during the handshake, which is the natural moment to authenticate.",
    "A WebSocket server is stateful: each open connection lives in the memory of one process. With several servers, user A may be connected to server 1 and user B to server 2. A message from A must reach B's server, so you need a shared channel between servers, typically Redis pub/sub or a message broker. Each server subscribes and forwards messages to its own connected clients. The in-memory client list from simple tutorials works only with one process.",
    "Long-lived connections change operations. Every deploy closes all connections, and thousands of clients reconnect in the same second unless they use backoff with random jitter. Load balancers and proxies close idle connections, so both sides need ping/pong heartbeats. A slow client is also a risk: if you await a send to each client in a loop, one slow receiver delays everyone, so use a queue per client or send with a timeout.",
    "Security differs from normal HTTP. The browser's same-origin policy and CORS do not protect WebSocket handshakes, so the server must check the Origin header itself, or any website could open a socket using the user's cookies. WebSockets are also not always the right tool: for one-way updates SSE is simpler, and for rare updates plain polling is fine. Use WebSockets when both sides send often and low delay matters."
  ],
  iq: [
    { q: "You scale the chat server from one instance to three and users stop seeing each other's messages. Why, and how do you fix it?", a: "Each instance keeps its own list of connected clients in memory, so a broadcast reaches only the clients on the same instance. Add a shared pub/sub layer: every instance publishes incoming messages to a Redis channel and every instance listens to that channel and forwards to its local clients.", c: `
import redis.asyncio as redis

r = redis.Redis()
clients = set()

async def publish(message: str):
    await r.publish("chat", message)

async def listener():                       # one task per server process
    pubsub = r.pubsub()
    await pubsub.subscribe("chat")
    async for msg in pubsub.listen():
        if msg["type"] == "message":
            text = msg["data"].decode()
            for ws in list(clients):
                await ws.send_text(text)
` },
    { q: "How do you authenticate a WebSocket connection from a browser?", a: "The browser WebSocket API cannot set an Authorization header. Options are: a session cookie, which is sent with the handshake (then you must check the Origin header); a short-lived, single-use ticket in the query string; or sending the token as the first message after connecting. Avoid long-lived tokens in the URL, because URLs are written to logs.", c: `
from fastapi import FastAPI, WebSocket

app = FastAPI()

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket, ticket: str = ""):
    if not is_valid_ticket(ticket):
        await ws.close(code=1008)        # policy violation
        return
    await ws.accept()
` },
    { q: "What happens to WebSocket connections during a deploy, and how do you reduce the impact?", a: "The old processes stop, so every connection on them is closed. Clients must reconnect automatically with exponential backoff and jitter, or all of them hit the new servers in the same second. On the server side, send a close frame during graceful shutdown and replace instances gradually. After reconnect the client should ask for missed messages, using the ID of the last message it saw." },
    { q: "Why are heartbeats (ping/pong) needed if TCP already keeps the connection?", a: "A connection can be dead without either side being told, for example when a phone loses signal or a NAT device drops the mapping. Without traffic nobody notices, and the server keeps dead connections in memory. Proxies also close connections that look idle. Regular pings detect dead peers and keep the path open." }
  ],
  tips: [
    "Define a small message format from the start, for example JSON with 'type', 'id' and 'data'. Adding new message types later is then easy.",
    "Give each message an ID and let clients send 'last seen ID' on reconnect. Without this, messages sent during a short disconnect are lost.",
    "Limit message size and message rate per connection, and close connections that break the limits. One client must not be able to flood the server.",
    "Track the number of open connections per instance as a metric and load test with many idle connections. Memory and file-descriptor limits are reached long before CPU."
  ]
});
