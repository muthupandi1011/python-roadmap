ROADMAP.push({
n: 7,
title: "Backend Python",
blurb: "Building real web services: frameworks, authentication, databases, caching, background jobs and real-time communication.",
topics: [
T("FastAPI",
"A modern, fast Python web framework for building APIs. It uses type hints to validate requests, convert data and generate interactive documentation automatically, and it supports async natively.",
"The backend of a food-delivery app: endpoints such as GET /restaurants and POST /orders, with request bodies validated automatically and docs available at /docs.",
`
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Order(BaseModel):
    item: str
    quantity: int = 1

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/orders")
async def create_order(order: Order):
    return {"message": f"{order.quantity} x {order.item} ordered"}

# run:  uvicorn main:app --reload
`,
"Created by Sebastian Ramirez (tiangolo) in 2018, built on Starlette and Pydantic. It became one of the most popular Python frameworks within a few years and is the default choice for AI backends."),

T("Django",
"A 'batteries-included' web framework: ORM, admin panel, authentication, forms, templates and migrations all come in the box. It follows the Model-View-Template pattern.",
"A news site or an e-commerce store where you need user accounts, an admin panel for staff and a database-backed site quickly. Instagram was built on Django.",
`
# models.py
from django.db import models

class Article(models.Model):
    title = models.CharField(max_length=200)
    published = models.DateTimeField(auto_now_add=True)

# views.py
from django.shortcuts import render
from .models import Article

def latest(request):
    articles = Article.objects.order_by("-published")[:10]
    return render(request, "latest.html", {"articles": articles})
`,
"Written in 2003 by Adrian Holovaty and Simon Willison at the Lawrence Journal-World newspaper in Kansas, open-sourced in 2005, and named after jazz guitarist Django Reinhardt."),

T("Django REST Framework",
"DRF is a toolkit on top of Django for building REST APIs. Serializers convert models to and from JSON, viewsets provide CRUD endpoints, and it includes authentication, permissions and a browsable API.",
"Adding a mobile app to an existing Django website: DRF exposes the same models as JSON endpoints for the app.",
`
from rest_framework import serializers, viewsets
from .models import Article

class ArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ["id", "title", "published"]

class ArticleViewSet(viewsets.ModelViewSet):     # full CRUD
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
`,
"Created by Tom Christie in 2011. The REST architectural style it implements was defined by Roy Fielding in his 2000 PhD thesis."),

T("Middleware",
"Middleware is code that runs for every request before it reaches your endpoint and for every response on the way out. It handles cross-cutting concerns in one place.",
"Logging every request with its duration, adding CORS headers, checking authentication, and attaching a request ID for tracing.",
`
import time
from fastapi import FastAPI, Request

app = FastAPI()

@app.middleware("http")
async def add_timing(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time"] = f"{time.perf_counter() - start:.4f}"
    return response
`,
"The pattern in Python was standardised by WSGI (PEP 333, 2003). ASGI, its async successor used by FastAPI, was created by Andrew Godwin around 2016-2018."),

T("Authentication",
"Authentication proves who a user is (login). Authorization decides what they are allowed to do. Passwords must be stored as salted hashes (bcrypt or argon2), never as plain text.",
"A user logs in with email and password. The server checks the password hash and issues a session or token. Only admins may open /admin.",
`
from argon2 import PasswordHasher              # pip install argon2-cffi
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher()

hashed = ph.hash("my-secret-password")         # store this, not the password
print(hashed[:30], "...")
print(ph.verify(hashed, "my-secret-password")) # True
try:
    ph.verify(hashed, "wrong")
except VerifyMismatchError:
    print("wrong password")
`,
"Password hashing dates back to Unix crypt in the 1970s. bcrypt was created in 1999, and Argon2 won the Password Hashing Competition in 2015."),

T("JWT",
"A JSON Web Token is a signed, compact token with three parts: header, payload (claims such as user ID and expiry) and signature. The server can verify it without looking anything up in a database.",
"After login a mobile app receives a JWT and sends it in the Authorization header on every request. Any server in the cluster can verify it.",
`
import jwt                               # pip install pyjwt
from datetime import datetime, timedelta, timezone

SECRET = "use-a-long-random-secret-of-at-least-32-bytes"
token = jwt.encode(
    {"sub": "user-42", "exp": datetime.now(timezone.utc) + timedelta(minutes=30)},
    SECRET, algorithm="HS256")

claims = jwt.decode(token, SECRET, algorithms=["HS256"])
print(claims["sub"])                     # user-42
`,
"JWT was standardised as RFC 7519 in 2015. The payload is only encoded, not encrypted, so never put secrets in it."),

T("OAuth",
"OAuth 2.0 is a standard that lets a user grant an application limited access to their account on another service without sharing their password. OpenID Connect adds login (identity) on top.",
"'Sign in with Google': your app never sees the Google password. Google asks the user for consent and then gives your app a token.",
`
# Authorization Code flow, step by step
# 1. App redirects the user to Google:
#    https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=email
# 2. User logs in at Google and clicks Allow
# 3. Google redirects back:  /callback?code=abc123
# 4. Your server exchanges the code for tokens:
import httpx
tokens = httpx.post("https://oauth2.googleapis.com/token", data={
    "code": "abc123", "client_id": "...", "client_secret": "...",
    "redirect_uri": "https://myapp.com/callback",
    "grant_type": "authorization_code"}).json()
`,
"OAuth 1.0 was published in 2007, driven by Twitter and Google engineers. OAuth 2.0 became RFC 6749 in 2012, and OpenID Connect followed in 2014."),

T("Dependency injection",
"Instead of a function creating the things it needs (database session, current user, settings), they are handed to it from outside. This makes code easy to test and swap. FastAPI has it built in with Depends().",
"Every endpoint that needs the logged-in user declares user = Depends(get_current_user). In tests you replace it with a fake user.",
`
from fastapi import Depends, FastAPI, Header, HTTPException

app = FastAPI()

def get_current_user(authorization: str = Header()):
    if authorization != "Bearer valid-token":
        raise HTTPException(status_code=401, detail="Not logged in")
    return {"id": 42, "name": "Anu"}

@app.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user
`,
"The term was coined by Martin Fowler in 2004, building on the 'inversion of control' idea popularised by Java's Spring framework."),

T("Background jobs",
"Work that runs outside the request/response cycle so the user does not have to wait: sending emails, generating PDFs, resizing images, calling slow third-party services.",
"After signup the API responds immediately with 'account created', while the welcome email is sent in the background.",
`
from fastapi import BackgroundTasks, FastAPI

app = FastAPI()

def send_welcome_email(email: str):
    print("sending email to", email)      # slow work

@app.post("/signup")
async def signup(email: str, tasks: BackgroundTasks):
    tasks.add_task(send_welcome_email, email)
    return {"message": "account created"}  # returns at once
`,
"Batch and deferred processing is as old as mainframes. For anything that must survive a server restart, web apps moved to dedicated job queues such as Celery in the late 2000s."),

T("Celery",
"Celery is a distributed task queue. Your app sends tasks to a broker (Redis or RabbitMQ), and separate worker processes pick them up and run them, with retries and scheduling.",
"An e-commerce site queues 'generate invoice PDF' and 'send shipping SMS' tasks. Ten worker machines process them, and failed tasks retry automatically.",
`
from celery import Celery

app = Celery("shop", broker="redis://localhost:6379/0")

@app.task(bind=True, max_retries=3)
def send_invoice(self, order_id):
    try:
        print("emailing invoice for", order_id)
    except ConnectionError as exc:
        raise self.retry(exc=exc, countdown=60)

# in the web app:   send_invoice.delay(1042)
# start workers:    celery -A tasks worker
`,
"Created by Ask Solem in 2009, originally for Django. It became the standard Python task queue."),

T("Redis",
"Redis is an in-memory data store that keeps data in RAM, which makes it extremely fast. It offers strings, hashes, lists, sets, sorted sets and streams, with optional expiry on every key.",
"Caching product pages, storing login sessions, counting requests for rate limiting, keeping a live game leaderboard, and acting as the Celery broker.",
`
import redis                         # pip install redis

r = redis.Redis(decode_responses=True)
r.set("otp:9876543210", "482913", ex=300)     # expires in 5 minutes
print(r.get("otp:9876543210"))

r.incr("page:home:views")
r.zadd("leaderboard", {"anu": 950, "bala": 870})
print(r.zrange("leaderboard", 0, 2, desc=True, withscores=True))
`,
"Created by Salvatore Sanfilippo (antirez) in 2009 to speed up his own web analytics startup. The name means REmote DIctionary Server."),

T("PostgreSQL",
"A powerful open-source relational database. Data lives in tables with rows and columns, is queried with SQL, and is protected by ACID transactions. It also supports JSON, full-text search and extensions such as pgvector.",
"The main database for a banking or e-commerce system: users, orders and payments, with strict guarantees that money is never lost or duplicated.",
`
import psycopg                        # pip install "psycopg[binary]"

with psycopg.connect("postgresql://user:pass@localhost/shop") as conn:
    with conn.cursor() as cur:
        cur.execute("CREATE TABLE IF NOT EXISTS users (id serial PRIMARY KEY, email text UNIQUE)")
        cur.execute("INSERT INTO users (email) VALUES (%s)", ("anu@x.com",))   # parameterised
        cur.execute("SELECT id, email FROM users")
        print(cur.fetchall())
`,
"Began as the POSTGRES project at UC Berkeley in 1986, led by Michael Stonebraker (Turing Award 2014). It gained SQL and was renamed PostgreSQL in 1996."),

T("SQLAlchemy",
"The most widely used Python SQL toolkit and ORM (Object-Relational Mapper). You define tables as Python classes and query them with Python instead of hand-written SQL strings.",
"A FastAPI service defines User and Order classes. SQLAlchemy generates the SQL, and the same code works on PostgreSQL in production and SQLite in tests.",
`
from sqlalchemy import create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session

class Base(DeclarativeBase): pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True)

engine = create_engine("sqlite:///shop.db")
Base.metadata.create_all(engine)
with Session(engine) as session:
    session.add(User(email="anu@x.com"))
    session.commit()
    print(session.scalars(select(User)).all())
`,
"Created by Mike Bayer and first released in 2006. Version 2.0 (2023) brought a fully typed, modernised API."),

T("Transactions",
"A transaction groups several database operations so they either all succeed (commit) or all fail (rollback). Transactions are ACID: Atomic, Consistent, Isolated and Durable.",
"A bank transfer: subtract 500 from account A and add 500 to account B. If the second step fails, the first is undone, so money never disappears.",
`
from sqlalchemy import text
from sqlalchemy.orm import Session          # engine comes from create_engine(...)

with Session(engine) as session:
    try:
        session.execute(text("UPDATE accounts SET balance = balance - 500 WHERE id = 1"))
        session.execute(text("UPDATE accounts SET balance = balance + 500 WHERE id = 2"))
        session.commit()            # both or nothing
    except Exception:
        session.rollback()
        raise
`,
"Transaction theory was developed by Jim Gray at IBM in the 1970s (Turing Award 1998). The acronym ACID was coined by Haerder and Reuter in 1983."),

T("Connection pooling",
"Opening a database connection is slow. A pool keeps a set of open connections ready and lends them to requests, taking them back afterwards for reuse.",
"An API under heavy traffic reuses 20 pooled connections instead of opening a new one per request, cutting latency and keeping the database from being overwhelmed.",
`
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql+psycopg://user:pass@localhost/shop",
    pool_size=10,          # connections kept open
    max_overflow=5,        # extra allowed in bursts
    pool_timeout=30,       # seconds to wait for a free one
    pool_pre_ping=True,    # check a connection is alive before use
)
`,
"Pooling became standard practice with 1990s application servers. For PostgreSQL the external pooler PgBouncer (2007) is widely used."),

T("Caching",
"Storing the result of expensive work (a database query, an API call, a rendered page) so the next request gets it instantly. Each entry usually has a time-to-live (TTL) and must be invalidated when the data changes.",
"A product page is read 10,000 times a minute but changes once a day. Cache it in Redis for 5 minutes and the database is hit only once per 5 minutes.",
`
import json, redis
r = redis.Redis(decode_responses=True)

def get_product(product_id):
    key = f"product:{product_id}"
    cached = r.get(key)
    if cached:
        return json.loads(cached)             # cache hit
    product = {"id": product_id, "name": "pen"}   # slow DB query here
    r.set(key, json.dumps(product), ex=300)   # cache miss: store 5 min
    return product
`,
"CPU caches date from the 1960s. Memcached (2003, built for LiveJournal) made caching a standard web technique. A famous saying: 'There are only two hard things in computer science: cache invalidation and naming things.'"),

T("Rate limiting",
"Restricting how many requests a client can make in a time window, to protect the service from abuse and overload. Common algorithms are fixed window, sliding window and token bucket.",
"A login endpoint allows 5 attempts per minute per IP address to stop password guessing. A public API allows 1,000 calls per hour per API key.",
`
import redis
r = redis.Redis()

def allow(client_id, limit=5, window=60):
    key = f"rate:{client_id}"
    pipe = r.pipeline()                   # both commands run together (atomic)
    pipe.incr(key)
    pipe.expire(key, window, nx=True)     # start the window only once (Redis 7+)
    count, _ = pipe.execute()
    return count <= limit

if not allow("ip:203.0.113.7"):
    print("429 Too Many Requests")
`,
"The token bucket and leaky bucket algorithms come from 1980s telecom network traffic shaping. HTTP status 429 'Too Many Requests' was standardised in 2012."),

T("Pagination",
"Returning a large result set in small pages instead of all at once. Offset pagination uses page numbers and is simple; cursor (keyset) pagination uses 'items after this ID' and is faster and stable for big, changing data.",
"A shopping app loads 20 products at a time as you scroll. An admin table shows page 3 of 250.",
`
from fastapi import FastAPI, Query
app = FastAPI()
ITEMS = [{"id": i} for i in range(1, 1001)]

@app.get("/items")
async def list_items(limit: int = Query(20, le=100), offset: int = 0):
    return {"total": len(ITEMS), "items": ITEMS[offset:offset + limit]}

@app.get("/feed")                         # cursor style
async def feed(after_id: int = 0, limit: int = 20):
    page = [i for i in ITEMS if i["id"] > after_id][:limit]
    return {"items": page, "next_cursor": page[-1]["id"] if page else None}
`,
"SQL's LIMIT/OFFSET made offset pagination universal. Twitter and Facebook popularised cursor pagination around 2010 for infinite-scroll feeds."),

T("Streaming",
"Sending a response piece by piece as it is produced, instead of building the whole thing first. Used for large files, live updates and Server-Sent Events (SSE).",
"A chatbot shows the answer word by word as the AI model generates it, and a report endpoint streams a 2 GB CSV without holding it in memory.",
`
import asyncio
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

async def tokens():
    for word in "Your order will arrive tomorrow".split():
        yield f"data: {word}" + chr(10) + chr(10)      # SSE format
        await asyncio.sleep(0.2)

@app.get("/chat")
async def chat():
    return StreamingResponse(tokens(), media_type="text/event-stream")
`,
"HTTP/1.1 (1997) introduced chunked transfer encoding. Server-Sent Events were standardised with HTML5 around 2009-2011 and became famous again with ChatGPT's streaming answers in 2022."),

T("WebSockets",
"A WebSocket is a long-lived, two-way connection between browser and server. Either side can send a message at any time, unlike HTTP where the client must always ask first.",
"Live chat, multiplayer games, collaborative editing like Google Docs, and live stock-price tickers.",
`
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()
clients: list[WebSocket] = []

@app.websocket("/ws/chat")
async def chat(ws: WebSocket):
    await ws.accept()
    clients.append(ws)
    try:
        while True:
            message = await ws.receive_text()
            for client in clients:              # broadcast
                await client.send_text(message)
    except WebSocketDisconnect:
        clients.remove(ws)
`,
"The WebSocket protocol was standardised as RFC 6455 in 2011, replacing hacks like long polling.")
]});

ROADMAP.push({
n: 8,
title: "Production Python",
blurb: "Shipping and running software reliably: containers, cloud, messaging, observability, resilience patterns and security.",
topics: [
T("Docker",
"Docker packages an application with everything it needs (Python version, libraries, system tools) into an image. The image runs as an isolated container, identically on any machine.",
"It ends 'but it works on my machine': the same image runs on the developer's laptop, in testing and in production.",
`
# Dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# build and run
# docker build -t shop-api .
# docker run -p 8000:8000 shop-api
`,
"Released by Solomon Hykes at PyCon in March 2013. It built on Linux container features (cgroups and namespaces) and changed how software is shipped. Kubernetes followed from Google in 2014 to orchestrate containers."),

T("CI/CD",
"Continuous Integration automatically tests every code change as it is pushed. Continuous Delivery/Deployment automatically releases changes that pass. Together they form a pipeline from commit to production.",
"A developer pushes a fix. Within minutes the tests run, a Docker image is built and it is deployed to staging, with no manual steps.",
`
# .github/workflows/ci.yml
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.13" }
      - run: pip install -r requirements.txt
      - run: pytest
`,
"The term continuous integration was coined by Grady Booch in 1991 and promoted by Extreme Programming. Jenkins (as Hudson) appeared in 2005, and GitHub Actions launched in 2019."),

T("AWS/Azure",
"Cloud platforms that rent out computing on demand: virtual machines (EC2 / Azure VMs), object storage (S3 / Blob Storage), managed databases (RDS / Azure SQL), serverless functions (Lambda / Functions) and hundreds more services. You pay for what you use.",
"A startup launches without buying servers: the API runs in containers, files go to S3, the database is managed, and capacity grows automatically on sale day.",
`
import boto3                       # pip install boto3  (AWS SDK)

s3 = boto3.client("s3")
s3.upload_file("invoice.pdf", "my-company-invoices", "2026/10/invoice-1042.pdf")

url = s3.generate_presigned_url(
    "get_object",
    Params={"Bucket": "my-company-invoices", "Key": "2026/10/invoice-1042.pdf"},
    ExpiresIn=3600)                # link valid for 1 hour
print(url)
`,
"Amazon Web Services launched S3 and EC2 in 2006, creating the modern cloud industry. Microsoft Azure became generally available in 2010."),

T("Load balancing",
"A load balancer spreads incoming requests across several copies of your application, so no single server is overloaded, and it stops sending traffic to servers that fail health checks.",
"During a festival sale, traffic is shared across 20 API servers. When one crashes, users do not notice because the balancer routes around it.",
`
# nginx.conf
upstream shop_api {
    least_conn;                      # send to the least busy server
    server 10.0.0.11:8000;
    server 10.0.0.12:8000;
    server 10.0.0.13:8000;
}
server {
    listen 80;
    location / { proxy_pass http://shop_api; }
}
`,
"Load balancing grew with the 1990s web. Nginx was released by Igor Sysoev in 2004 to solve the 'C10k problem' of handling 10,000 connections at once."),

T("API Gateway",
"A single entry point in front of all your backend services. It handles routing, authentication, rate limiting, TLS and logging in one place, so individual services do not each have to.",
"A mobile app talks only to api.shop.com. The gateway sends /users to the user service and /orders to the order service, and rejects requests without a valid token.",
`
# gateway routing rules (conceptual)
routes:
  - path: /users/*
    service: http://user-service:8000
    auth: jwt
    rate_limit: 100/minute
  - path: /orders/*
    service: http://order-service:8000
    auth: jwt
  - path: /public/*
    service: http://catalog-service:8000
`,
"Gateways rose with microservices in the 2010s. Netflix open-sourced Zuul in 2013, and Kong and AWS API Gateway both appeared in 2015."),

T("Microservices",
"An architecture where an application is split into small, independent services, each owning one business capability and its own database, and communicating over APIs or messages. The opposite is a monolith, one large application.",
"An e-commerce platform has separate user, catalogue, order, payment and shipping services. The payment team can deploy without waiting for anyone else.",
`
# order-service calls two other services
import httpx

async def place_order(user_id: int, product_id: int):
    async with httpx.AsyncClient(timeout=5) as client:
        stock = await client.get(f"http://inventory-service/stock/{product_id}")
        if stock.json()["available"] < 1:
            return {"error": "out of stock"}
        pay = await client.post("http://payment-service/charge",
                                json={"user_id": user_id, "amount": 499})
    return {"order": "confirmed", "payment": pay.json()["id"]}
`,
"The term was popularised by Martin Fowler and James Lewis in 2014, describing what Netflix and Amazon had been doing. Many teams have since learned to start with a monolith and split only when needed."),

T("Message queues",
"A message queue lets services communicate asynchronously. The sender puts a message on the queue and moves on; the receiver processes it when ready. This decouples services and absorbs bursts of load.",
"When an order is placed, an 'order created' message is queued. Email, inventory and analytics each process it at their own pace, and nothing is lost if one of them is down for a while.",
`
import pika                         # pip install pika  (RabbitMQ client)

conn = pika.BlockingConnection(pika.ConnectionParameters("localhost"))
channel = conn.channel()
channel.queue_declare(queue="orders", durable=True)

channel.basic_publish(exchange="", routing_key="orders",
                      body='{"order_id": 1042, "event": "created"}',
                      properties=pika.BasicProperties(delivery_mode=2))   # persistent: survives a broker restart
print("message sent")
conn.close()
`,
"Message-oriented middleware dates from IBM MQSeries in 1993. The open AMQP standard appeared in 2003, originating at JPMorgan Chase."),

T("Kafka/RabbitMQ",
"RabbitMQ is a traditional message broker: it routes messages to queues and removes each one after it is consumed. Kafka is a distributed event log: events are stored in order and kept, so many consumers can read and re-read them at huge scale.",
"RabbitMQ: a job queue for sending emails. Kafka: streaming every click on a website to analytics, fraud detection and recommendations at the same time.",
`
from kafka import KafkaProducer, KafkaConsumer     # pip install kafka-python
import json

producer = KafkaProducer(bootstrap_servers="localhost:9092",
                         value_serializer=lambda v: json.dumps(v).encode())
producer.send("page-views", {"user": 42, "page": "/cart"})
producer.flush()

consumer = KafkaConsumer("page-views", bootstrap_servers="localhost:9092",
                         group_id="analytics", auto_offset_reset="earliest",
                         value_deserializer=lambda b: json.loads(b))
for message in consumer:
    print(message.value)
`,
"RabbitMQ was released in 2007, written in Erlang. Kafka was built at LinkedIn by Jay Kreps, Neha Narkhede and Jun Rao, open-sourced in 2011 and named after the writer Franz Kafka."),

T("Observability",
"The ability to understand what is happening inside a running system from the outside, using its outputs. It rests on three pillars: logs (what happened), metrics (how much, how often) and traces (where the time went).",
"Checkout is slow at 9 pm. Metrics show latency rising, traces point to the payment service, and logs reveal a timeout from one bank's API.",
`
# The three pillars for one request
# LOG     2026-10-05 21:02:11 ERROR payment timeout order_id=1042
# METRIC  http_request_duration_seconds{path="/checkout"} 4.2
# TRACE   checkout (4.2s)
#           |- cart-service      0.1s
#           |- payment-service   4.0s   <- the problem
#           |- email-service     0.1s
`,
"The word comes from control theory (Rudolf Kalman, 1960). It was adopted by software engineers at Twitter around 2013 and became an industry standard term by 2018."),

T("Logging",
"In production, logs are written as structured JSON to standard output, collected centrally (ELK, Loki, CloudWatch, Datadog) and searched across all servers. Each line carries context such as request ID and user ID, and never secrets.",
"With 50 containers you cannot open log files by hand. You search the central system for request_id=abc123 and see that request's whole journey.",
`
import json, logging, sys

class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({"time": self.formatTime(record), "level": record.levelname,
                           "message": record.getMessage(),
                           "request_id": getattr(record, "request_id", None)})

handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
log = logging.getLogger("api")
log.addHandler(handler); log.setLevel(logging.INFO)
log.info("order created", extra={"request_id": "abc123"})
`,
"Unix syslog dates from the 1980s. The ELK stack (Elasticsearch, Logstash, Kibana) made centralised log search mainstream in the early 2010s. Logging to stdout is rule 11 of the Twelve-Factor App (2011)."),

T("Metrics",
"Numbers measured over time that describe the health of a system: request rate, error rate, latency percentiles (p95, p99), CPU, memory and queue length. They power dashboards and alerts.",
"An alert wakes the on-call engineer when the error rate goes above 2% for 5 minutes. A dashboard shows p99 latency per endpoint.",
`
from prometheus_client import Counter, Histogram, start_http_server
import time, random

REQUESTS = Counter("http_requests_total", "Total requests", ["path", "status"])
LATENCY = Histogram("http_request_duration_seconds", "Request time", ["path"])

start_http_server(9100)               # Prometheus scrapes :9100/metrics
while True:
    with LATENCY.labels("/checkout").time():
        time.sleep(random.random() / 10)
    REQUESTS.labels("/checkout", "200").inc()
`,
"Prometheus was built at SoundCloud in 2012, inspired by Google's internal Borgmon. Grafana (2014) became the standard dashboard tool."),

T("Tracing",
"Distributed tracing follows one request as it travels across many services. Each step is a 'span' with timing, and all spans share one trace ID, giving a timeline of where time was spent.",
"A slow checkout touches 7 services. The trace shows 4 of the 4.2 seconds were spent waiting on the payment provider.",
`
from opentelemetry import trace       # pip install opentelemetry-sdk

# at startup, configure a TracerProvider and an exporter, or spans are discarded
tracer = trace.get_tracer("shop")

def checkout(order_id):
    with tracer.start_as_current_span("checkout") as span:
        span.set_attribute("order.id", order_id)
        with tracer.start_as_current_span("charge-card"):
            pass                      # call payment service
        with tracer.start_as_current_span("send-email"):
            pass
`,
"Google's 2010 Dapper paper started the field. Twitter's Zipkin (2012) and Uber's Jaeger (2015) followed, and OpenTelemetry (2019) unified the standards."),

T("Retry",
"Automatically trying a failed operation again, because many failures are temporary. Good retries use exponential backoff (wait 1s, 2s, 4s...) with random jitter, a maximum number of attempts, and only repeat operations that are safe to repeat (idempotent).",
"A call to an SMS provider fails with a network glitch. The second attempt a second later works, and the customer never notices.",
`
import random, time

def retry(func, attempts=4, base=0.5):
    for attempt in range(attempts):
        try:
            return func()
        except ConnectionError:
            if attempt == attempts - 1:
                raise
            delay = base * 2 ** attempt + random.uniform(0, 0.3)   # backoff + jitter
            print(f"failed, retrying in {delay:.1f}s")
            time.sleep(delay)

# the 'tenacity' library provides this as a decorator
`,
"Exponential backoff comes from the ALOHAnet (1971) and Ethernet (1970s) network protocols. Jitter was popularised for cloud systems by an AWS architecture article in 2015."),

T("Timeout",
"A limit on how long you will wait for an operation. Without one, a single slow dependency can hold your threads and connections forever and take your whole service down.",
"A weather widget's API hangs. With a 2-second timeout the page loads without the widget instead of not loading at all.",
`
import asyncio, httpx

resp = httpx.get("https://api.example.com/weather", timeout=2.0)

async def slow_query():
    await asyncio.sleep(10)

async def main():
    try:
        async with asyncio.timeout(3):        # Python 3.11+
            await slow_query()
    except TimeoutError:
        print("query took too long, giving up")

asyncio.run(main())
`,
"Timeouts are as old as networking; TCP (1974-1981) has retransmission timeouts built in. A classic production lesson: the requests library has no timeout by default."),

T("Circuit breaker",
"A circuit breaker watches calls to a dependency. After too many failures it 'opens' and fails immediately without calling, giving the dependency time to recover. After a pause it lets calls through again as a test (half-open) and closes fully if they succeed.",
"The recommendations service is down. Instead of every product page waiting 5 seconds for a timeout, the breaker opens and pages load at once without recommendations.",
`
import time

class CircuitBreaker:
    def __init__(self, max_failures=3, reset_after=30):
        self.max_failures, self.reset_after = max_failures, reset_after
        self.failures, self.opened_at = 0, None

    def call(self, func):
        if self.opened_at and time.time() - self.opened_at < self.reset_after:
            raise RuntimeError("circuit open: failing fast")
        try:
            result = func()
        except Exception:
            self.failures += 1
            if self.failures >= self.max_failures:
                self.opened_at = time.time()
            raise
        self.failures, self.opened_at = 0, None
        return result
`,
"Described by Michael Nygard in the 2007 book 'Release It!', named after electrical circuit breakers. Netflix's Hystrix library (2012) made it famous."),

T("Failover",
"Automatically switching to a standby system when the primary one fails. It needs redundancy (a replica database, a second server or region) and health checks to detect the failure.",
"The primary database server dies at 2 am. A replica is promoted to primary within seconds and the application reconnects, with no engineer involved.",
`
import httpx

ENDPOINTS = ["https://api-primary.example.com", "https://api-backup.example.com"]

def get_rates():
    last_error = None
    for base in ENDPOINTS:                    # try primary, then backup
        try:
            resp = httpx.get(f"{base}/rates", timeout=2)
            resp.raise_for_status()               # a 500 also counts as a failure
            return resp.json()
        except (httpx.HTTPError, ValueError) as e:
            last_error = e
    raise RuntimeError("all endpoints failed") from last_error
`,
"Failover comes from fault-tolerant computing; Tandem's NonStop computers (1976) ran banks and stock exchanges with it. Cloud providers offer it as multiple availability zones."),

T("Graceful shutdown",
"When a service is told to stop (SIGTERM), it stops accepting new work, finishes the requests in progress, closes connections cleanly and then exits, instead of dying in the middle of something.",
"During a deployment, old containers are replaced. Graceful shutdown lets a payment that is halfway through finish instead of being cut off.",
`
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("startup: open DB pool")
    yield
    print("shutdown: finish requests, close DB pool")   # runs on SIGTERM

app = FastAPI(lifespan=lifespan)

# Kubernetes sends SIGTERM, waits terminationGracePeriodSeconds (default 30),
# then sends SIGKILL
`,
"Unix signals such as SIGTERM date from the 1970s. Graceful shutdown became essential with rolling deployments on Docker and Kubernetes."),

T("Security",
"Protecting an application and its data. The essentials: validate all input, use parameterised SQL queries, hash passwords, use HTTPS, apply least privilege, keep dependencies updated, and never trust anything that comes from the client.",
"A login form built by joining strings into SQL lets an attacker type ' OR 1=1 -- and log in as anyone. A parameterised query makes that input harmless.",
`
import sqlite3
conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (email TEXT, role TEXT)")
email = "x' OR '1'='1"                       # attacker input

# VULNERABLE: never build SQL with string formatting
# conn.execute(f"SELECT * FROM users WHERE email = '{email}'")

# SAFE: the driver treats the value as data only
rows = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchall()
print(rows)       # []
`,
"SQL injection was first documented in 1998. OWASP was founded in 2001 and has published its Top 10 list of web security risks since 2003."),

T("Secrets management",
"Keeping passwords, API keys and tokens out of source code. They are supplied at runtime through environment variables or a secrets manager (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault), and rotated regularly.",
"A developer accidentally pushes an AWS key to a public GitHub repository, and bots find it within minutes. With a secrets manager the key is never in the code at all.",
`
from pydantic_settings import BaseSettings, SettingsConfigDict   # pip install pydantic-settings

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")   # .env is listed in .gitignore
    database_url: str
    stripe_api_key: str

settings = Settings()              # reads DATABASE_URL, STRIPE_API_KEY
print(settings.database_url[:12], "...")
`,
"Config in environment variables is rule 3 of Heroku's Twelve-Factor App (2011). HashiCorp Vault was released in 2015."),

T("Performance optimization",
"Making code faster or lighter. The rule is to measure first with a profiler, fix the biggest bottleneck, then measure again. Usual wins are a better algorithm or data structure, fewer database queries, caching, and doing I/O concurrently.",
"An API endpoint takes 3 seconds. Profiling shows 200 separate database queries (the N+1 problem). One joined query brings it down to 80 ms.",
`
import cProfile, pstats, timeit

def slow():
    items = list(range(5000))
    return [x for x in items if x in items]      # list lookup: O(n) each

def fast():
    items = set(range(5000))
    return [x for x in items if x in items]      # set lookup: O(1) each

cProfile.run("slow()", "out.prof")
pstats.Stats("out.prof").sort_stats("cumulative").print_stats(3)
print(timeit.timeit(fast, number=10))
`,
"Donald Knuth wrote in 1974: 'premature optimization is the root of all evil.' cProfile joined the standard library in Python 2.5, and Python 3.11 (2022) made the interpreter itself 10-60% faster.")
]});
