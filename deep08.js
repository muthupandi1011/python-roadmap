EXTRA(8, "Docker", {
  deep: [
    "A container is not a small virtual machine. It is a normal Linux process that the kernel isolates with namespaces (its own view of processes, network and files) and limits with cgroups (CPU and memory). All containers share the host's kernel, which is why they start in a moment and use little memory. A virtual machine, in contrast, runs a full guest operating system. The shared kernel also means isolation is weaker than with a VM.",
    "An image is a stack of read-only layers. Each instruction in the Dockerfile that changes files creates a layer, and Docker caches each layer. If an instruction and its inputs have not changed, the cached layer is reused; once one layer changes, all layers after it are rebuilt. This is why you copy requirements.txt and install packages before you copy the source code: code changes often, dependencies rarely, so the slow install step stays cached.",
    "A running container adds a thin writable layer on top of the image. Everything written there is lost when the container is removed, so data that must survive belongs in a volume or an external service. The first process in the container has process ID 1 and receives the stop signal. If the Dockerfile starts the app through a shell (the string form of CMD), the shell is PID 1 and may not pass the signal on, so the app is killed hard after the timeout.",
    "Common mistakes are large images, running as root, and secrets baked into the image. Anything copied or set with ENV or ARG stays in the image layers and can be read by anyone who has the image, even if a later layer deletes the file. Docker also does not make an app scalable or reliable by itself; it only packages it. For local development of a small script, a virtual environment may be all you need."
  ],
  iq: [
    { q: "What is the difference between a container and a virtual machine?", a: "A VM virtualises hardware and runs its own kernel and full operating system, so it is heavier but strongly isolated. A container shares the host kernel and isolates only the process, so it is small and starts fast. The trade-off is isolation: a kernel bug can affect all containers on the host, which is why untrusted workloads are often run in VMs or sandboxed runtimes." },
    { q: "Why is the order of instructions in a Dockerfile important?", a: "Because of the layer cache. When a layer changes, every later layer is rebuilt. If you copy all source code before installing dependencies, any code change reinstalls every package. Copy only the dependency file first, install, and then copy the code; most builds then take seconds." },
    { q: "How do you make a Python image smaller and safer?", a: "Use a slim base image, a multi-stage build so build tools do not end up in the final image, a .dockerignore file so the build does not send .git and local files, and a non-root user. Smaller images download faster and contain fewer packages that can have security holes.", c: `
FROM python:3.13-slim AS build
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.13-slim
RUN useradd --create-home app
WORKDIR /app
COPY --from=build /install /usr/local
COPY . .
USER app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
` },
    { q: "Your container takes 10 seconds to stop and requests are cut off. What is the likely cause?", a: "The app does not receive SIGTERM. With the shell form of CMD the shell is PID 1 and the app is its child, so the signal may not reach the app; Docker waits for its stop timeout and then sends SIGKILL. Use the exec form (the JSON list) so the app itself is PID 1, or use a small init process.", c: `
# shell form: /bin/sh is PID 1, the app may never see SIGTERM
CMD uvicorn main:app --host 0.0.0.0

# exec form: the app is PID 1 and receives SIGTERM
CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]
` }
  ],
  tips: [
    "Pin the base image to a specific version tag and pin your Python dependencies with a lock file. 'latest' gives you a different image next month.",
    "Add a .dockerignore with .git, .venv, __pycache__, .env and test data. It makes builds faster and keeps secrets out of the image.",
    "Be careful with Alpine images for Python. Many packages have no ready wheels for it and must be compiled, which makes builds slow and sometimes larger than slim.",
    "Scan images in CI (for example with Trivy or Docker Scout) and rebuild regularly so base image security fixes reach production."
  ]
});

EXTRA(8, "CI/CD", {
  deep: [
    "A pipeline is a list of stages that each must pass: install, lint and type check, unit tests, build an artifact (usually a Docker image), integration tests, deploy to staging, deploy to production. The key idea of CI is that everyone merges small changes often and every change is checked by a machine, so problems are found in minutes while the change is still small. A slow or flaky pipeline loses this value, because people stop trusting it.",
    "Continuous Delivery means every change that passes is ready to release, and a human presses the button. Continuous Deployment means the release also happens automatically. A core rule for both is 'build once, deploy many': the exact image that was tested in staging is the one that goes to production, with only configuration changed. Rebuilding for each environment means you ship something that was never tested.",
    "How you release matters as much as how you build. A rolling deployment replaces instances a few at a time. Blue-green runs the new version beside the old one and switches traffic in one step, which makes rollback instant but needs double capacity. A canary sends a small share of traffic to the new version and watches error rates before going further. In all of them old and new code run at the same time for a while.",
    "That overlap is why database changes are the hard part of deployment. A migration that renames or removes a column breaks the old code that is still running. The safe method is expand and contract: first add the new thing in a way old code can ignore, deploy code that works with both, move the data, and remove the old thing in a later release. CI/CD is also not a replacement for monitoring: automatic deploys need automatic checks and a fast rollback."
  ],
  iq: [
    { q: "What is the difference between continuous delivery and continuous deployment?", a: "In continuous delivery every passing change produces a releasable artifact, but a person decides when to release it. In continuous deployment there is no manual step: passing the pipeline means going to production. Deployment needs strong automated tests, monitoring and rollback, because no human looks at each change before users get it." },
    { q: "How do you rename a database column with zero downtime?", a: "Not in one step, because old and new code run together during the deploy. Use expand and contract over several releases. Each step is safe to roll back, and at every moment both running versions work with the schema.", c: `
# Release 1: add new column 'full_name' (nullable). Old code ignores it.
# Release 2: code writes to BOTH 'name' and 'full_name', reads 'name'.
# Backfill:  copy old rows from 'name' to 'full_name' in small batches.
# Release 3: code reads and writes only 'full_name'.
# Release 4: drop column 'name'.
` },
    { q: "Compare rolling, blue-green and canary deployments.", a: "Rolling replaces instances gradually; it needs little extra capacity but rollback is slow and two versions serve traffic together. Blue-green keeps two full environments and switches traffic at once; rollback is instant but cost is double during the switch. Canary sends a small percentage of real traffic to the new version first, so a bad release hurts few users; it needs good metrics to decide automatically." },
    { q: "A test fails sometimes and passes on re-run. What do you do?", a: "Treat it as a real problem, not noise. A flaky test trains the team to ignore red builds, and then real failures are missed. Find the cause, usually timing, test order, shared state or a real network call; move the test to quarantine while you fix it so it does not block others, and track it. Re-running until green hides race conditions that may also exist in production.", c: `
# .github/workflows/ci.yml (part)
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-python@v5
    with:
      python-version: "3.13"
      cache: pip                 # reuse downloaded packages between runs
  - run: pip install -r requirements.txt
  - run: ruff check .
  - run: pytest -x --maxfail=1
` }
  ],
  tips: [
    "Keep the main pipeline fast (aim for a few minutes). Cache dependencies, run tests in parallel, and move slow end-to-end tests to a later stage.",
    "Tag images with the git commit SHA, not only 'latest'. You can then see exactly what runs in production and roll back to a known image.",
    "Store secrets in the CI system's secret store and give the deploy job short-lived cloud credentials (for example OIDC) in place of long-lived keys.",
    "Use feature flags to merge unfinished work turned off. Deploying code and releasing a feature become two separate decisions."
  ]
});

EXTRA(8, "AWS/Azure", {
  deep: [
    "A cloud is organised in regions (a geographic area) and availability zones (separate data centres inside a region). One zone can fail; a whole region rarely does. Reliable systems therefore run in at least two zones behind a load balancer, with the database replicated to another zone. Running in several regions is much harder because of data replication and is needed only for strict uptime or legal reasons.",
    "Security follows the shared responsibility model. The provider secures the buildings, hardware and the managed service itself. You are responsible for what you configure: who has access, which ports are open, whether a bucket is public, whether data is encrypted. Most cloud incidents are configuration mistakes by the customer, such as leaked access keys or a storage bucket open to the world.",
    "Access is controlled by identity and access management (IAM). The best practice is that code does not hold long-lived keys at all. A server, container or function is given a role, and the SDK automatically receives short-lived credentials for that role. Each role should allow only the exact actions on the exact resources it needs. Network rules (security groups, private subnets) are the second layer.",
    "Managed services trade money and some control for less operational work: backups, patching and failover of a managed database are done for you. Serverless functions scale to zero and need no servers, but have cold starts, a maximum run time and are awkward for long connections. Cloud is not automatically cheaper; data transfer out of the cloud, idle resources and forgotten test environments are the usual surprises on the bill."
  ],
  iq: [
    { q: "How should an application on a cloud server get credentials to read from object storage?", a: "Through a role attached to the server, container or function, not through access keys in code or config. The SDK fetches temporary credentials for the role and renews them automatically. Nothing long-lived can leak into git, and permissions are changed in one place.", c: `
import boto3

# no keys in code: boto3 finds the role's temporary credentials by itself
s3 = boto3.client("s3")
s3.download_file("my-company-invoices", "2026/10/invoice-1042.pdf", "invoice.pdf")
` },
    { q: "Users upload large files. Should they go through your API server?", a: "Usually no. Sending big files through the API uses its memory, bandwidth and worker time. Better: the API checks the user and returns a presigned URL that is valid for a short time, and the browser uploads straight to object storage. The API then stores only the object key.", c: `
import boto3

s3 = boto3.client("s3")
url = s3.generate_presigned_url(
    "put_object",
    Params={"Bucket": "user-uploads", "Key": "user-42/photo.jpg"},
    ExpiresIn=300)                      # valid for 5 minutes
# the client sends:  PUT <url>  with the file as body
` },
    { q: "What is a cold start in serverless functions and how do you reduce it?", a: "When no warm instance exists, the platform must create one, load the runtime and import your code before it handles the request. That adds delay to the first request. Reduce it with smaller packages, fewer and lazy imports, creating clients outside the handler so they are reused, and paid options that keep instances warm. For steady, latency-sensitive traffic, containers may fit better." },
    { q: "What does 'least privilege' look like in an IAM policy?", a: "The policy names specific actions and specific resources, not wildcards. A service that reads and writes invoices in one bucket gets only those two actions on that bucket. If its credentials leak, the attacker cannot delete other buckets or start servers.", c: `
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": "arn:aws:s3:::my-company-invoices/*"
  }]
}
` }
  ],
  tips: [
    "Define infrastructure as code (Terraform, Pulumi, CloudFormation, Bicep). Changes are reviewed in pull requests and an environment can be rebuilt.",
    "Set a budget alert and tag every resource with owner and environment on day one. Finding out who owns an expensive resource later is slow.",
    "Keep databases and internal services in private subnets with no public IP. Only the load balancer should be reachable from the internet.",
    "For local tests of cloud code use an emulator or a mocking library (for example LocalStack or moto for AWS) so tests do not need real accounts."
  ]
});

EXTRA(8, "Load balancing", {
  deep: [
    "Load balancers work at two levels. A layer 4 balancer forwards TCP connections using only IP addresses and ports; it is very fast but cannot see URLs or headers. A layer 7 balancer understands HTTP, so it can route by path or host, terminate TLS, add headers and retry failed requests. Most web applications use layer 7 in front of the app servers.",
    "The algorithm decides which server gets the next request. Round robin gives each server a turn and works when requests cost about the same. Least connections sends the request to the server with the fewest active ones, which is better when some requests are slow. Hashing on client IP or on a key sends the same client to the same server; consistent hashing does this while moving only a few keys when a server is added or removed.",
    "Health checks keep traffic away from broken servers. An active check calls an endpoint such as /health at intervals; a passive check watches real requests and removes a server after repeated failures. The health endpoint should say if this instance can do its job, but it should not fail because a shared dependency is down. If every instance checks the database and the database has a short problem, all instances are removed at once and the outage gets worse.",
    "A load balancer works best with stateless servers, where any server can handle any request because sessions live in a shared store. Sticky sessions tie a user to one server; they make deploys and scaling harder, and the session is lost if that server dies. The balancer itself must not be a single point of failure, so it runs redundantly, and cloud balancers do this for you."
  ],
  iq: [
    { q: "What is the difference between layer 4 and layer 7 load balancing?", a: "Layer 4 forwards connections based on IP and port without looking inside; it is simple, fast and works for any TCP protocol. Layer 7 reads the HTTP request, so it can route /api and /images to different services, terminate TLS, and balance single requests, not whole connections. Layer 7 costs more CPU but gives far more control." },
    { q: "When is round robin a bad choice?", a: "When requests have very different costs or connections live long. Round robin counts requests, not work, so one server can get several slow reports while another gets only quick calls. With WebSockets, new servers stay empty because existing connections do not move. Least connections handles both cases better." },
    { q: "Users sometimes get 502 errors under normal load, with no errors in the app log. What is a classic cause?", a: "A keep-alive timeout mismatch. The balancer keeps idle connections to the app for reuse. If the app closes an idle connection first, the balancer may send the next request on a connection that is already closed and returns a 502. Set the app server's keep-alive timeout longer than the balancer's idle timeout.", c: `
# the app must keep idle connections LONGER than the load balancer does
# load balancer idle timeout: 60 seconds
uvicorn main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 75
` },
    { q: "How do you take a server out of rotation without dropping requests?", a: "Use connection draining. The balancer stops sending new requests to the server but lets the running ones finish for a set time. The server signals this by failing its readiness check or by being deregistered before it shuts down. Without draining, every deploy cuts some requests.", c: `
upstream shop_api {
    least_conn;
    server 10.0.0.11:8000 max_fails=3 fail_timeout=30s;
    server 10.0.0.12:8000 max_fails=3 fail_timeout=30s;
    server 10.0.0.13:8000 backup;        # used only when the others are down
}
` }
  ],
  tips: [
    "Keep app servers stateless: sessions in Redis or a signed cookie, uploads in object storage. Then you never need sticky sessions.",
    "Have two endpoints: a liveness check that only says 'the process is running' and a readiness check that says 'I can take traffic'. Use the readiness one for the balancer.",
    "Behind a balancer the client IP is in the X-Forwarded-For header. Configure your framework to trust that header only from your own proxy addresses.",
    "Test failure for real: stop one instance during a load test and watch the error rate. This shows if health check intervals and timeouts are tuned well."
  ]
});

EXTRA(8, "API Gateway", {
  deep: [
    "A gateway is a layer 7 reverse proxy with extra features built around APIs. For each request it terminates TLS, matches a route, runs a chain of plugins or policies (authentication, rate limit, request size limit, header changes), forwards the request to the right service and logs the result. The services behind it can then be simpler and live on a private network.",
    "The difference from a load balancer is the focus. A load balancer spreads traffic over copies of one service. A gateway routes between different services and applies API policies. In practice they are often used together: gateway first, then a load balancer or service discovery for each service. Some products do both jobs.",
    "A gateway does not remove the need for security inside the services. It can check that a token is valid, but only the service knows if this user may see this order. If services trust anything that comes from the internal network, one compromised service or a routing mistake exposes everything. So the gateway does the coarse checks and each service still does its own authorization.",
    "The risks are concentration and creep. Everything passes through the gateway, so it must be highly available, and a wrong configuration breaks all APIs at once. Teams are also tempted to put business logic into gateway plugins, which becomes a hidden, hard-to-test part of the system. For a single service or a small monolith, a plain reverse proxy is enough; a gateway earns its place when many services share the same cross-cutting rules."
  ],
  iq: [
    { q: "What is the difference between an API gateway and a load balancer?", a: "A load balancer distributes requests across identical instances of one service to share load and survive failures. An API gateway is the single entry point to many different services and adds API features: routing by path, authentication, rate limits, transformations and analytics. They solve different problems and are often placed one after the other." },
    { q: "If the gateway validates the JWT, do the services still need to check anything?", a: "Yes. The gateway proves who the caller is; it does not know the business rules. The service must still check that this user may access this specific resource. Services should also not blindly trust identity headers, because anything that can reach the service directly could fake them.", c: `
from fastapi import Depends, FastAPI, HTTPException

app = FastAPI()

@app.get("/orders/{order_id}")
async def get_order(order_id: int, user = Depends(get_current_user)):
    order = await load_order(order_id)
    if order is None or order.user_id != user.id:    # ownership check in the service
        raise HTTPException(status_code=404)
    return order
` },
    { q: "What is the Backend for Frontend (BFF) pattern?", a: "Each kind of client (web, mobile, partner API) gets its own small gateway-like backend that is shaped for that client. The mobile BFF can combine several service calls into one response and return less data to save bandwidth. The trade-off is more components to run, and the risk of duplicated logic between the BFFs." },
    { q: "What are the downsides of an API gateway?", a: "It adds a network hop and some latency, it is a single place where a failure or a bad config affects every API, and it can turn into a place where business logic hides. It also couples teams: every new route needs a gateway change. You limit these with redundancy, configuration in version control, automated tests for routes and keeping the gateway free of business rules." }
  ],
  tips: [
    "Keep gateway configuration in git and deploy it through the same pipeline as code. A hand-edited gateway is the fastest way to a full outage.",
    "Set a timeout and a maximum request body size per route at the gateway. Without them a slow or huge request ties up resources through the whole chain.",
    "Create the request ID at the gateway and pass it to every service in a header. All logs and traces then share one ID.",
    "Version public APIs in the path or a header from the start (for example /v1/). The gateway can then route old and new versions to different services during a migration."
  ]
});

EXTRA(8, "Microservices", {
  deep: [
    "Microservices move complexity from inside the code to the network. A function call inside a monolith is fast and either works or raises an error. A call to another service can be slow, fail, time out, or succeed while the answer is lost. Every such call needs a timeout, a retry policy and a decision about what to do when the other side is down.",
    "The hardest part is data. Each service owns its database, so one business action that touches several services cannot use one database transaction. The standard answer is the saga: a sequence of local transactions, each followed by a message, with compensating actions that undo earlier steps when a later one fails (for example, refund the payment if shipping cannot be booked). The system is then eventually consistent, and the user interface and the business must accept in-between states such as 'payment pending'.",
    "Availability multiplies along a chain of synchronous calls. If a request needs five services and each is up 99.9% of the time, the request works only about 99.5% of the time. This is why services prefer asynchronous messages where possible, cache data from other services, and degrade gracefully. A set of services that must all be deployed together and all be up at once is called a distributed monolith: it has the costs of both styles.",
    "The real benefit is organisational: separate teams can build, deploy and scale their parts independently. A small team gets little of that benefit and all of the cost, including more infrastructure, harder debugging and harder testing. The usual advice is to start with a well-structured monolith with clear modules and split out a service only when there is a clear reason, such as very different scaling needs or a team boundary."
  ],
  iq: [
    { q: "The order service must save an order and publish an 'order created' event. How do you make sure both happen or neither?", a: "You cannot make a database write and a broker publish atomic directly; a crash between them loses one. Use the transactional outbox: write the event into an outbox table in the same database transaction as the order. A separate relay reads that table and publishes to the broker, retrying until it succeeds. Consumers must handle duplicates because the relay delivers at least once.", c: `
BEGIN;
INSERT INTO orders (id, user_id, total) VALUES (1042, 42, 499);
INSERT INTO outbox (topic, payload)
VALUES ('order.created', '{"order_id": 1042}');
COMMIT;
-- a relay process reads new outbox rows, publishes them, then marks them sent
` },
    { q: "Payment succeeded but creating the shipment failed. How do you handle it without a distributed transaction?", a: "With a saga. Each step is a local transaction and each step has a compensating action. When shipment creation fails for good, the saga runs the compensation for the payment, which is a refund, and marks the order as cancelled. Compensations must be idempotent and retried until they succeed, and the order needs explicit states so everyone can see where it is." },
    { q: "Why should two services not share one database?", a: "A shared database is a hidden coupling. One team's schema change can break the other service, both must be deployed in step, and nobody can change the data model freely. It also allows one service to skip another's business rules by writing to its tables. Each service should own its data and expose it only through its API or events." },
    { q: "Why is retrying the POST to the payment service dangerous, and how do you make it safe?", a: "If the first request reached the payment service but the response was lost, a retry charges the customer twice. Send an idempotency key: a unique ID created once per business action and sent with every attempt. The payment service stores the key with the result and returns the stored result for a repeated key without charging again.", c: `
import uuid, httpx

key = str(uuid.uuid4())          # created once per order, saved with the order

for attempt in range(3):
    try:
        resp = httpx.post("http://payment-service/charge",
                          json={"user_id": 42, "amount": 499},
                          headers={"Idempotency-Key": key},
                          timeout=5)
        break
    except httpx.TransportError:
        continue                 # same key on every attempt
` }
  ],
  tips: [
    "Start with a modular monolith: clear modules, no cross-module database access. If you later need a service, the cut line already exists.",
    "Give every outgoing call a timeout, and decide the fallback behaviour in code (cached value, default, or clear error). Do not leave it to chance.",
    "Use contract tests between services so that a provider cannot change an API field that a consumer depends on without a failing build.",
    "Invest in tracing and a shared request ID before the second service goes live. Debugging across services without them is extremely slow."
  ]
});

EXTRA(8, "Message queues", {
  deep: [
    "A message is not removed when it is delivered; it is removed when the consumer acknowledges it. The consumer receives the message, does the work and then sends an ack. If the consumer dies before the ack, the broker gives the message to another consumer. This gives at-least-once delivery: no message is lost, but a message can be processed more than once.",
    "There are three delivery guarantees. At-most-once acks before the work, so a crash loses the message. At-least-once acks after the work, so a crash causes a duplicate. Exactly-once delivery is not possible in general over an unreliable network, because the broker cannot know if a missing ack means 'not processed' or 'processed but the ack was lost'. What systems really do is at-least-once delivery plus idempotent processing, which gives the effect of exactly once.",
    "Durability needs several settings together. The queue must be durable, the message must be marked persistent, and the publisher should wait for the broker's confirmation before it treats the message as sent. If any of the three is missing, messages can vanish on a broker restart or a network break. More safety costs speed, so choose per message type.",
    "A message that always fails is called a poison message. If it is put back on the queue each time, it loops forever and blocks other work. The standard solution is a retry limit and a dead letter queue where failed messages are parked for inspection. Queues are also not always the answer: if the caller needs the result at once, a queue only adds delay and complexity, and strict global ordering becomes hard as soon as you have more than one consumer."
  ],
  iq: [
    { q: "Explain at-most-once, at-least-once and exactly-once delivery.", a: "At-most-once: ack first, then work; nothing is duplicated but a crash loses the message. At-least-once: work first, then ack; nothing is lost but duplicates happen. Exactly-once delivery cannot be guaranteed by the transport alone, so in practice you use at-least-once and make the consumer idempotent, for example by recording processed message IDs." },
    { q: "How do you make a consumer idempotent?", a: "Give every message a unique ID. In the same database transaction as the business change, insert the ID into a 'processed' table with a unique constraint. If the insert finds the ID already there, skip the work. Because the check and the work commit together, a duplicate can never apply the change twice.", c: `
BEGIN;
INSERT INTO processed_messages (message_id) VALUES ('m-1042')
ON CONFLICT DO NOTHING;
-- if 0 rows were inserted: this is a duplicate, skip the work
UPDATE accounts SET balance = balance - 499 WHERE id = 42;
COMMIT;
` },
    { q: "When exactly should the consumer acknowledge a message?", a: "After the work is done and saved, not on receipt. With automatic ack the broker removes the message as soon as it is delivered, and a crash in the middle loses it. With manual ack after success, a crash leads to redelivery. Reject messages that can never succeed without requeue, so they go to the dead letter queue.", c: `
def handle(ch, method, properties, body):
    try:
        process(body)
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception:
        # requeue=False sends it to the dead letter queue (if one is configured)
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

channel.basic_qos(prefetch_count=10)       # at most 10 unacked messages per consumer
channel.basic_consume(queue="orders", on_message_callback=handle)
channel.start_consuming()
` },
    { q: "Messages for the same order must be processed in order, but you want many consumers. What do you do?", a: "Total ordering and parallel consumers conflict: two consumers can finish in a different order than they started. The usual answer is ordering per key. Route all messages with the same key (the order ID) to the same queue or partition, read by one consumer at a time, and process different keys in parallel. Also make handlers tolerant, for example ignore an event whose version is older than the stored one." }
  ],
  tips: [
    "Configure a dead letter queue and an alert on it for every queue. Without it, failed messages either loop forever or vanish silently.",
    "Put a unique message ID, a type, a schema version and a timestamp in every message. You need all four sooner than you think.",
    "Keep messages small: send IDs and key facts, and let the consumer load details. Large payloads slow the broker and go stale.",
    "Monitor queue depth and the age of the oldest message, and set a prefetch limit so one slow consumer does not hold many messages."
  ]
});

EXTRA(8, "Kafka/RabbitMQ", {
  deep: [
    "A Kafka topic is split into partitions, and each partition is an append-only log on disk. Every record gets a position number called an offset. The producer chooses the partition, normally by hashing the record key, so all records with the same key land in the same partition. Order is guaranteed only inside one partition, never across the whole topic.",
    "Consumers read by pulling records and remembering their offset. A consumer group is a set of consumers that share the work: Kafka assigns each partition to exactly one consumer in the group. So the number of partitions is the upper limit of parallelism; extra consumers stay idle. Different groups read the same topic independently, each with its own offsets, which is how analytics and billing can both read every event. When a consumer joins or leaves, the partitions are reassigned, which is called a rebalance.",
    "Reading does not delete anything. Records stay until the retention time or size limit is reached, so a new consumer can read history and a fixed consumer can replay. Durability comes from replication: each partition has a leader and followers on other brokers. With acks=all the producer waits until the in-sync replicas have the record, which trades some speed for safety.",
    "RabbitMQ works differently. Producers send to an exchange, and bindings route messages to queues by rules (direct, topic pattern, fanout). The broker pushes messages to consumers, tracks an ack for each one and deletes it afterwards. It is strong at flexible routing, per-message retry and dead-lettering, and classic job queues. Choose Kafka for high-volume event streams, replay and many independent readers; choose RabbitMQ for task distribution with complex routing. For a small project Kafka is often more than is needed."
  ],
  iq: [
    { q: "How does Kafka guarantee ordering, and what does that mean for your key design?", a: "Only records in the same partition are ordered. Records with the same key go to the same partition, so choose as key the entity whose events must stay in order, such as the order ID or user ID. Without a key, records are spread across partitions and no order is guaranteed. A badly chosen key with few values creates hot partitions.", c: `
from kafka import KafkaProducer

producer = KafkaProducer(bootstrap_servers="localhost:9092", acks="all")

# same key -> same partition -> events for order 1042 stay in order
producer.send("orders", key=b"order-1042", value=b'{"event": "created"}')
producer.send("orders", key=b"order-1042", value=b'{"event": "paid"}')
producer.flush()
` },
    { q: "A topic has 4 partitions and the consumer group has 6 consumers. What happens?", a: "Four consumers get one partition each and two get nothing, because a partition is read by only one consumer of a group. They are only spares in case another one fails. To scale consumption further you need more partitions. Adding partitions later changes which partition a key maps to, so plan the count early." },
    { q: "When should a consumer commit its offset, and what goes wrong otherwise?", a: "Commit after the record has been processed. If offsets are committed before or automatically in the background, a crash can skip records that were fetched but not finished. Committing after processing means a crash causes re-reading of some records, so processing must be idempotent. This is the at-least-once trade-off.", c: `
from kafka import KafkaConsumer

consumer = KafkaConsumer("orders", bootstrap_servers="localhost:9092",
                         group_id="billing", enable_auto_commit=False)
for message in consumer:
    handle(message.value)
    consumer.commit()            # only after the work is done
` },
    { q: "When would you choose RabbitMQ over Kafka?", a: "When you need a work queue more than an event log: each message is a task for one worker, with per-message ack, retries, delays, priorities and routing rules. RabbitMQ is simpler to run at small scale and consumers need no offset handling. Choose Kafka when you need very high throughput, several independent consumers of the same events, or the ability to replay old data." }
  ],
  tips: [
    "Watch consumer lag (the distance between the newest offset and the group's committed offset). It is the most important Kafka health signal.",
    "Decide the partition count with growth in mind, and pick the key carefully. Both are hard to change once data and consumers exist.",
    "Use a schema with versions for events (Avro, Protobuf or JSON Schema with a registry). Producers and consumers are deployed at different times and must stay compatible.",
    "Keep the work per record short, or the consumer may miss its poll deadline, be removed from the group and cause repeated rebalances."
  ]
});

EXTRA(8, "Observability", {
  deep: [
    "Monitoring answers questions you thought of in advance: is CPU high, is the error rate above a limit. Observability is about questions you did not predict: why are only users of one mobile version in one country slow since the last deploy. To answer those you need rich data that can be sliced by many fields, and a way to connect the different signals.",
    "The three signals have different strengths and costs. Metrics are cheap numbers, good for dashboards and alerts, but they lose the detail of single requests. Logs have full detail but are expensive to store and search. Traces show the path and timing of one request through the services. They become much more powerful together: every log line and every span carries the same trace ID, so you go from an alert to a slow trace to the exact log lines of that request.",
    "Good alerting is built on what users feel, not on every internal number. A service level indicator (SLI) is a measurement such as 'share of requests answered correctly in under 300 ms'. A service level objective (SLO) is the target, such as 99.9% over 30 days. The gap to 100% is the error budget: how much failure is acceptable. Alerts fire when the budget is being used up too fast, which gives far fewer false alarms than alerts on CPU.",
    "Observability has real costs: storage, network and the performance overhead of instrumentation. High-cardinality fields such as user ID are very useful in logs and traces but can break a metrics system. Teams control cost with sampling, retention limits and by dropping low-value data. Tools alone are not enough; a dashboard nobody looks at and an alert with no clear action do not help anyone."
  ],
  iq: [
    { q: "What is the difference between monitoring and observability?", a: "Monitoring checks known failure signs with predefined dashboards and alerts. Observability is the ability to explain new, unknown problems from the system's outputs without shipping new code. Monitoring tells you that something is wrong; observability helps you find why. You need both, and monitoring is built on the same data." },
    { q: "What are SLI, SLO and error budget?", a: "An SLI is a measured number that reflects user experience, such as the success rate of requests. An SLO is the target for that number over a period. The error budget is what the SLO allows to fail. If the budget is nearly used up, the team slows down risky releases and works on reliability; if there is plenty left, it can ship faster.", c: `
# SLO: 99.9% of requests succeed over 30 days
# requests in 30 days:      10,000,000
# allowed failures (0.1%):      10,000   <- the error budget
# failures so far:               7,500   -> 75% of the budget is used
` },
    { q: "You get an alert for high latency. How do you go from the alert to the cause?", a: "Start with metrics to see the scope: which endpoint, which region, since when, and does it match a deploy. Then open traces of slow requests to see which service or query takes the time. Then read the logs of those exact requests using the trace ID. This path works only if the three signals share IDs and labels." },
    { q: "Should you alert on high CPU usage?", a: "Usually not as a page. High CPU is a cause, not a symptom, and it is often harmless; a batch job can use 95% CPU while users are fine. Page people for symptoms users feel: error rate, latency, failed checkouts. Keep cause metrics such as CPU on dashboards for diagnosis and for low-priority warnings." }
  ],
  tips: [
    "Adopt OpenTelemetry for instrumentation. It is vendor-neutral, so you can change the backend later without touching application code.",
    "Use the same field names everywhere (service, env, version, trace_id, request_id). Consistent names are what make signals joinable.",
    "Show deploys as markers on dashboards. Most incidents start with a change, and the marker makes that visible in one look.",
    "Write a short runbook for every alert that can wake someone: what it means, where to look and the first steps. Delete alerts that never lead to action."
  ]
});

EXTRA(8, "Logging", {
  deep: [
    "Python's logging has four parts. A logger is what your code calls; loggers form a tree by dotted name and a record travels up to the root logger. Handlers decide where records go, formatters decide how they look, and filters can drop or change records. The standard pattern is that every module creates logging.getLogger(__name__) and the application configures handlers once at startup. Libraries should never configure logging themselves.",
    "Levels are a contract with the people who read the logs. DEBUG is for developer detail and is normally off in production. INFO records normal business events. WARNING means something unexpected that the system handled. ERROR means an operation failed. If everything is logged as ERROR, the level stops meaning anything and real problems are lost in noise.",
    "Structured logs are written as key-value data, usually JSON, so a log system can filter on fields such as order_id. Context such as the request ID should be added automatically, not passed by hand to every call. contextvars are the right tool: a middleware sets the value at the start of the request, and a filter copies it to every record. Context variables work correctly with both threads and asyncio tasks.",
    "Logging has costs and risks. Writing a log line is I/O; in a hot loop or with a slow handler it can slow the service down, and log storage is often a large part of the monitoring bill. Logs also leak: passwords, tokens, card numbers and personal data end up in them through 'log the whole request' shortcuts. Logs are not the right tool for counting things (use metrics) or for audit trails that must never be lost (use a database table)."
  ],
  iq: [
    { q: "How do you add a request ID to every log line without passing it to every function?", a: "Store it in a context variable in a middleware and attach a logging filter that copies it onto each record. Every log call during that request then has the ID, including calls in libraries. contextvars keep the value separate for each thread and each asyncio task, which a plain global variable would not.", c: `
import contextvars, logging

request_id = contextvars.ContextVar("request_id", default="-")

class RequestIdFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id.get()
        return True

handler = logging.StreamHandler()
handler.addFilter(RequestIdFilter())
handler.setFormatter(logging.Formatter(
    "%(asctime)s %(levelname)s %(request_id)s %(name)s %(message)s"))
logging.basicConfig(level=logging.INFO, handlers=[handler])

request_id.set("abc123")                 # done by a middleware per request
logging.getLogger("api").info("order created")
` },
    { q: "What is the difference between log.info(f'user {user_id}') and log.info('user %s', user_id)?", a: "The f-string is always built, even when the level is disabled. With the percent style, logging formats the message only if the record is really written, so disabled debug lines cost almost nothing. The constant message template also lets error trackers group the same event together. For most lines the speed difference is small, but in hot paths it matters.", c: `
import logging
log = logging.getLogger(__name__)

order_id = 1042
log.debug("loaded order %s", order_id)       # formatted only if DEBUG is on

try:
    1 / 0
except ZeroDivisionError:
    log.exception("payment failed order_id=%s", order_id)   # adds the traceback
` },
    { q: "Why should a containerised service write logs to stdout and not to a file?", a: "A container's file system is temporary and each container would need its own rotation and shipping. With stdout, the platform collects the stream from every container in the same way and sends it to the central system. The application stays simple and does not need to know where logs are stored." },
    { q: "Can logging slow down or even block an application?", a: "Yes. Handlers run in the calling thread, so a slow destination (a network handler, a slow disk) delays the request, and in asyncio it blocks the event loop. The usual fix is a QueueHandler that only puts the record in a queue, with a QueueListener writing in a background thread. Reducing volume, for example by sampling repeated messages, helps as well." }
  ],
  tips: [
    "Use a maintained JSON formatter (python-json-logger or structlog) and not a hand-written one. They handle exceptions, extra fields and odd types correctly.",
    "Configure logging once at startup with dictConfig and make the level an environment variable, so you can turn on DEBUG for one service without a code change.",
    "Never log full request bodies or headers. Build a deny-list filter for fields such as password, token, authorization and card number.",
    "Use log.exception inside except blocks so the traceback is kept, and log an error once at the place where it is handled, not at every level it passes through."
  ]
});

EXTRA(8, "Metrics", {
  deep: [
    "There are four basic metric types. A counter only goes up (requests served, errors) and resets to zero on restart. A gauge goes up and down (memory in use, queue length). A histogram counts observations into buckets (how many requests took up to 0.1 s, up to 0.5 s, and so on). A summary calculates percentiles inside the application. You almost never look at a raw counter; you look at its rate of change, which also handles the reset on restart.",
    "Averages hide problems. If 99 requests take 100 ms and one takes 10 seconds, the average looks fine while one user in a hundred suffers. That is why latency is reported as percentiles: p50 is the typical user, p99 shows the slow tail. Percentiles cannot be averaged across servers; the average of ten p99 values is not the p99 of the whole system. Histograms solve this, because bucket counts from all servers can be added and the percentile calculated afterwards.",
    "Every unique combination of label values creates a separate time series stored in memory. Labels with a few values (method, status, endpoint template) are fine. A label with unbounded values, such as user ID, email or the raw URL with IDs inside, creates millions of series and can bring down the metrics system. This is called a cardinality explosion and is the most common Prometheus mistake.",
    "Prometheus pulls metrics: it calls each target's /metrics endpoint at intervals. This makes it easy to see when a target is down. Short-lived batch jobs may end before they are scraped, so they push to a gateway. Metrics tell you that something is wrong and how much, but not why for one specific request; for that you need traces and logs."
  ],
  iq: [
    { q: "Why do we use p99 latency and not the average?", a: "The average mixes fast and slow requests, so a small group of very slow requests disappears in it. p99 is the time under which 99% of requests finish, so it shows the bad experience directly. In a system where one page load makes many backend calls, most users hit at least one slow call, so the tail matters more than it seems." },
    { q: "You have the p99 latency of each of 10 servers. How do you get the p99 of the whole service?", a: "You cannot calculate it from the ten percentile values; averaging them gives a wrong number. You need the underlying distribution. With histograms you add the bucket counts of all servers and then compute the quantile from the combined buckets. The result is an estimate whose accuracy depends on the bucket limits.", c: `
# p99 latency over the last 5 minutes, across all servers
histogram_quantile(0.99,
  sum by (le) (rate(http_request_duration_seconds_bucket[5m])))

# error rate: share of requests with a 5xx status
sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))
` },
    { q: "What is label cardinality and why is 'user_id' as a label a mistake?", a: "Cardinality is the number of different label value combinations, and each one is its own time series. A user_id label creates a series per user, per endpoint, per status, which grows without limit and uses huge memory. Put per-user detail in logs and traces. In metrics, label by route template such as '/users/{id}', never by the real path." },
    { q: "Counter or gauge: which one for 'number of requests' and for 'requests in progress'?", a: "Total requests is a counter, because it only increases and you query its rate. Requests in progress is a gauge, because it goes up and down. Using a gauge for a total loses data between scrapes, and using a counter for a current value makes no sense. A good check: if a restart resetting the value to zero is acceptable and you care about speed of change, it is a counter.", c: `
from prometheus_client import Counter, Gauge

REQUESTS = Counter("http_requests_total", "Total requests", ["path", "status"])
IN_PROGRESS = Gauge("http_requests_in_progress", "Requests being handled")

@IN_PROGRESS.track_inprogress()
def handle():
    REQUESTS.labels("/checkout", "200").inc()
` }
  ],
  tips: [
    "Instrument every service with the same three things first: request rate, error rate and duration (the RED method). They answer most questions.",
    "Choose histogram buckets around your latency target. If the goal is 300 ms, you need bucket limits near 300 ms or the percentile estimate is too rough.",
    "With several worker processes (Gunicorn, Uvicorn workers), each process has its own counters. Use the Prometheus client's multiprocess mode or scrape each process.",
    "Follow naming rules: base units in the name (seconds, bytes) and the suffix _total for counters. Consistent names make dashboards reusable across services."
  ]
});

EXTRA(8, "Tracing", {
  deep: [
    "A trace is a tree of spans. Each span has a trace ID shared by the whole request, its own span ID, the ID of its parent span, a name, start and end time, and attributes. The first span is the root. When code inside a span starts another one, the new span becomes its child. Putting all spans with the same trace ID together gives the timeline of the request.",
    "The key mechanism is context propagation. When a service calls another, it adds the trace ID and current span ID to the outgoing request, normally in the W3C 'traceparent' HTTP header. The receiving service reads the header and makes its spans children of the caller's span. If one service in the chain does not pass the header on, the trace breaks into separate pieces. The same must be done for messages in queues, where the context travels in the message headers.",
    "Recording every request is too expensive at high traffic, so traces are sampled. Head sampling decides at the start of the request, for example keep 5%; it is cheap but may miss the rare errors. Tail sampling decides after the trace is complete, so it can keep all errors and all slow traces, but it needs a collector that holds spans in memory for a while. Many teams combine both.",
    "Auto-instrumentation libraries create spans for web frameworks, HTTP clients and database drivers without code changes; you add manual spans only for important business steps. Spans are sent in batches in the background so the request is not delayed. Tracing does not replace metrics: sampled traces cannot give exact counts or rates. It is also of limited use in a single process, where a profiler tells you more."
  ],
  iq: [
    { q: "How does a trace continue from one service to the next?", a: "The caller injects the trace context into the request headers and the callee extracts it. The standard header is 'traceparent', which holds a version, the trace ID, the parent span ID and flags such as 'sampled'. Instrumentation libraries do this automatically for common HTTP clients and servers; you must do it yourself for custom protocols.", c: `
# traceparent: version - trace id - parent span id - flags
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
` },
    { q: "How do you keep a trace connected across a message queue?", a: "The producer injects the context into the message headers when it publishes. The consumer extracts it and starts its span with that context as parent or link. Without this, the consumer's work appears as a new, unrelated trace and you cannot see the delay between publish and processing.", c: `
from opentelemetry import trace
from opentelemetry.propagate import inject, extract

tracer = trace.get_tracer("shop")

# producer
headers = {}
inject(headers)                       # adds 'traceparent' to the dict
publish("orders", body, headers=headers)

# consumer
ctx = extract(received_headers)
with tracer.start_as_current_span("process-order", context=ctx):
    handle(body)
` },
    { q: "What is the difference between head sampling and tail sampling?", a: "Head sampling decides when the trace starts and passes the decision downstream, so it is simple and cheap, but it chooses blindly and drops most errors together with the normal traffic. Tail sampling waits for the full trace and can keep the interesting ones: errors, slow requests, specific customers. Its cost is a collector that must buffer all spans for a short time." },
    { q: "A trace shows a 2 second gap in a span with no child spans. What does that mean and what do you do?", a: "Time is spent in code that is not instrumented: CPU work, a library call without instrumentation, waiting for a lock or for a free connection from the pool. Add manual spans around the suspected parts, or add attributes and events. If it is CPU work, a profiler is the better tool for the next step." }
  ],
  tips: [
    "Start with auto-instrumentation for your framework, HTTP client and database driver. It gives most of the value with almost no code.",
    "Put the trace ID in every log line and return it in a response header. Support can then give you an ID that opens the exact trace.",
    "Add business attributes to spans (order ID, tenant, plan) but never secrets or personal data. Traces are stored and widely readable inside the company.",
    "Send spans to an OpenTelemetry Collector and not directly to a vendor. Sampling, filtering and changing the backend then need no application deploy."
  ]
});

EXTRA(8, "Retry", {
  deep: [
    "A retry only makes sense for failures that may go away: a connection error, a timeout, a 503, a 429. Errors such as 400, 401, 404 or a validation error will fail the same way every time, so retrying them only adds load. The first design step is therefore a list of which errors are retryable for each call.",
    "Backoff and jitter protect the server. If a thousand clients fail at the same moment and all retry after exactly one second, they hit the recovering server together again and again. Exponential backoff spreads retries over time, and jitter makes each client wait a random amount so the retries do not arrive in waves. A common form is 'full jitter': wait a random time between zero and the current backoff limit.",
    "Retries multiply across layers. If the client retries 3 times, the gateway 3 times and the service 3 times, one user action can become 27 calls to the database at the worst possible moment. This is a retry storm and it turns a small problem into an outage. Retry at one layer only, usually the one closest to the failure, limit total retries with a budget, and combine retries with a circuit breaker.",
    "The second big risk is repeating something that already happened. A timeout does not tell you if the server did the work. GET, PUT and DELETE are meant to be idempotent, so repeating them is safe. A POST that creates or charges is not, unless the API supports an idempotency key. Also respect the user's time: a request that the user is waiting for should have a total deadline, not five retries of ten seconds each."
  ],
  iq: [
    { q: "Why is it dangerous to retry a POST request?", a: "POST is not idempotent by default. If the request reached the server and the response was lost, the retry performs the action a second time: two orders, two charges. Make it safe with an idempotency key that the server stores with the result, or first check with a GET if the action was done. Without one of these, do not auto-retry." },
    { q: "Why add jitter to exponential backoff?", a: "Backoff without jitter keeps clients in step: all that failed together retry together, in bigger and bigger waves, called the thundering herd. Random jitter spreads them out so the server sees a smooth load and can recover. It costs nothing and is one of the most effective reliability settings.", c: `
from tenacity import (retry, retry_if_exception_type,
                      stop_after_attempt, wait_random_exponential)

@retry(stop=stop_after_attempt(4),
       wait=wait_random_exponential(multiplier=0.5, max=10),   # backoff + jitter
       retry=retry_if_exception_type(ConnectionError),
       reraise=True)
def send_sms(number, text):
    ...
` },
    { q: "What is a retry storm and how do you prevent it?", a: "It is when retries add so much load to an already struggling service that it cannot recover. It gets worse when several layers each retry, because the attempts multiply. Prevent it by retrying in one layer only, using backoff with jitter, capping attempts, using a retry budget (for example retries may be at most a small share of all requests) and opening a circuit breaker when failures continue." },
    { q: "Which HTTP responses should a client retry?", a: "Retry connection errors, timeouts and statuses that signal a temporary state: 429, 502, 503 and 504, and honour the Retry-After header when present. Do not retry other 4xx statuses, because the request itself is wrong. A plain 500 is a judgement call: it may be a bug that will repeat, so retry it only for idempotent operations and only a few times.", c: `
import httpx

RETRYABLE = {429, 502, 503, 504}

def should_retry(response: httpx.Response) -> bool:
    return response.status_code in RETRYABLE
` }
  ],
  tips: [
    "Use a library (tenacity, or the retry support of your HTTP client) and do not hand-write loops. Libraries get backoff, jitter and exception filtering right.",
    "Log every retry with the attempt number and reason, and count retries as a metric. A rising retry rate is an early warning before errors reach users.",
    "Set a total deadline for the whole operation in addition to the attempt limit. Three attempts with a 30 second timeout each is a 90 second wait for the user.",
    "In tests, patch the wait time to zero and check three cases: success after failures, giving up after the maximum, and no retry for non-retryable errors."
  ]
});

EXTRA(8, "Timeout", {
  deep: [
    "A network call has several phases and each can hang. The connect timeout limits how long you wait to open the connection; it can be short, because a healthy server accepts quickly. The read timeout limits the wait for data from the server. The write timeout covers sending data, and the pool timeout covers waiting for a free connection from the client's pool. Note that a read timeout is usually the maximum gap between pieces of data, not a limit on the whole response, so a slow drip of bytes can last much longer.",
    "Missing timeouts cause cascading failures. When a dependency becomes slow, every request that calls it waits and holds a worker thread, a database connection and memory. New requests keep arriving, all workers end up waiting, and the service stops answering even for endpoints that never use the slow dependency. A timeout turns a slow failure into a fast one, which the system can handle.",
    "In a chain of services the timeouts must fit together. If the user-facing limit is 3 seconds, an inner call with a 10 second timeout is useless: the caller gave up long ago and the inner work is wasted. Inner timeouts should be shorter than outer ones. A stronger form is deadline propagation: the first service sets a deadline, passes it along, and each service uses only the time that is left.",
    "A timeout on the client does not stop the work on the server. The server may still finish the write after you gave up, so a timeout means 'unknown result', not 'failed'. That is why timeouts and retries need idempotency. In asyncio a timeout cancels the awaiting task, which works for async code; blocking code running in a thread cannot be cancelled this way and keeps running in the background."
  ],
  iq: [
    { q: "What is the difference between connect timeout and read timeout, and how do you set them?", a: "Connect timeout is for establishing the connection; if it takes more than a couple of seconds the server is unreachable, so keep it short. Read timeout is for waiting for the response data and depends on how long the endpoint normally takes. Setting them separately lets you fail fast on dead hosts while still allowing a slow but working endpoint.", c: `
import httpx

timeout = httpx.Timeout(10.0, connect=2.0)     # 2s to connect, 10s for the other phases
client = httpx.Client(timeout=timeout)
resp = client.get("https://api.example.com/report")
` },
    { q: "Your request to create an order timed out. Was the order created?", a: "You do not know. The server may not have received it, may still be working on it, or may have finished while the response was lost. Treat a timeout as an unknown result. Either the operation must be idempotent so you can repeat it safely, or you must check the state before trying again." },
    { q: "How do you choose a timeout value?", a: "Start from data: look at the normal latency of the call, for example its p99, and set the timeout somewhat above it, so healthy requests pass and stuck ones are cut. Then check it against the caller's own limit; it must be lower. A value that is too low causes false failures and extra retries, and a value that is too high lets slow calls pile up." },
    { q: "Besides HTTP calls, where else do you need timeouts in a backend?", a: "Everywhere something can wait: database queries (statement timeout), getting a connection from the pool, acquiring locks, Redis calls, message consumers, background tasks and the web server itself. A commonly forgotten one is the database, where one bad query without a statement timeout can hold locks and connections for minutes.", c: `
-- PostgreSQL: cancel any statement that runs longer than 5 seconds
SET statement_timeout = '5s';

-- and do not let forgotten open transactions sit for ever
SET idle_in_transaction_session_timeout = '30s';
` }
  ],
  tips: [
    "Create HTTP clients in one place with explicit timeouts and forbid direct calls without them in code review. With the requests library, a missing timeout means waiting for ever.",
    "Use asyncio.timeout (or asyncio.wait_for) around groups of awaits that belong to one user action, to enforce a total limit for the action.",
    "Count timeouts as their own metric per dependency. A rising timeout rate points straight at the dependency that is in trouble.",
    "Test timeouts with a fake server that sleeps. Check that the caller gives up in time, frees its resources and returns a useful error or fallback."
  ]
});

EXTRA(8, "Circuit breaker", {
  deep: [
    "A breaker has three states. Closed is normal: calls pass and the breaker counts failures. When failures cross a threshold it becomes open: calls fail at once without touching the dependency. After a wait time it becomes half-open and lets a small number of test calls through. If they succeed it closes again; if they fail it opens again and the wait starts over.",
    "It protects in two directions. The caller is protected because it no longer spends threads, connections and seconds of timeout on calls that will fail anyway. The dependency is protected because the stream of requests stops and it gets room to recover. A timeout alone does not give this: with a 5 second timeout, every request still waits 5 seconds before it fails.",
    "The details decide if a breaker helps or hurts. Counting consecutive failures is simple but weak under mixed traffic; production breakers usually look at the failure rate over a time window with a minimum number of calls. Only failures that say the dependency is unhealthy should count: timeouts, connection errors and 5xx. A 404 or a validation error is a correct answer and must not open the breaker. Each dependency needs its own breaker, or a broken recommendations service would also block payments.",
    "An open breaker needs a plan for what to return: a cached value, a default, an empty list, or a clear error. Without a fallback the breaker only makes errors faster, which still helps but is not the full benefit. A breaker is not a retry and does not fix anything; it limits damage. For a single call to a rarely used dependency it may be unnecessary complexity."
  ],
  iq: [
    { q: "Explain the three states of a circuit breaker.", a: "Closed: calls go through and failures are counted. Open: after too many failures, calls are rejected at once for a set time. Half-open: after that time a few trial calls are allowed; success closes the breaker, failure opens it again. The half-open state is what lets the system recover by itself without a human." },
    { q: "How is a circuit breaker different from a retry, and how do they work together?", a: "A retry assumes the failure is short and tries again; a breaker assumes the failure will continue and stops trying. Together: retry a few times for short glitches, and count the final failures in the breaker. When the breaker is open, there must be no retries, or they would keep hitting the failing service.", c: `
import pybreaker                      # pip install pybreaker

breaker = pybreaker.CircuitBreaker(fail_max=5, reset_timeout=30)

@breaker
def get_recommendations(user_id):
    return call_recommendation_service(user_id)

try:
    items = get_recommendations(42)
except pybreaker.CircuitBreakerError:
    items = []                        # fallback: page loads without recommendations
` },
    { q: "Each of your 20 app instances has its own breaker in memory. Is that a problem?", a: "Usually it is acceptable and even useful. Each instance finds the problem by itself after a few failed calls, and an instance with a local network problem does not open the breaker for everyone. The cost is that the dependency receives some extra failing calls while every instance learns. A shared breaker state in Redis is possible but adds a new dependency to your resilience code." },
    { q: "Should a 404 response from the dependency count as a failure for the breaker?", a: "No. A 404 or other 4xx means the dependency is working and answered correctly about this request. Counting them would let one client with bad input open the breaker for all users. Count only signs of an unhealthy dependency: timeouts, connection errors and 5xx responses." }
  ],
  tips: [
    "Use a tested library (for example pybreaker) or the breaker in your service mesh or gateway. Hand-written breakers usually miss thread safety and the half-open rules.",
    "Export the breaker state as a metric and alert when a breaker opens. An open breaker with a silent fallback can hide a real outage for days.",
    "Design the fallback together with the product owner: showing no recommendations is fine, but showing a wrong price from an old cache may not be.",
    "Test all transitions with a fake dependency: failures open it, calls fail fast while open, a success in half-open closes it, a failure reopens it."
  ]
});

EXTRA(8, "Failover", {
  deep: [
    "Failover has three steps and each can go wrong: detect that the primary is dead, promote a standby, and redirect clients to it. Detection uses heartbeats and timeouts. A short timeout reacts fast but may trigger on a short network glitch; a long one is safer but means longer downtime. There is no perfect value, because from the outside a slow node and a dead node look the same.",
    "The most dangerous failure is split brain. The network between two nodes breaks, each thinks the other is dead, and both accept writes as primary. The data then diverges and cannot be merged cleanly. Systems prevent this with a quorum: a node may be primary only if a majority of an odd number of voters agrees. They also use fencing, which forcibly cuts the old primary off so it cannot write any more.",
    "Replication mode decides how much data a failover can lose. With asynchronous replication the primary confirms a write before the replica has it, so the last moments of writes can be lost when the primary dies. With synchronous replication the write is confirmed only after a replica has it; nothing is lost, but every write is slower and depends on the replica being reachable. Two numbers describe the goal: RPO, how much data you may lose, and RTO, how long you may be down.",
    "Clients are part of failover. Open connections to the old primary break, so the application needs reconnect logic, retries for safe operations and short DNS caching if the switch is done through DNS. A failover that was never tested usually does not work when it is needed. Simple code-level fallback to a second endpoint, as in the example, is fine for read-only data but is not enough for a database, where exactly one writer must exist."
  ],
  iq: [
    { q: "What is split brain and how is it prevented?", a: "It is when two nodes both believe they are the primary and both accept writes, usually after a network partition. The data becomes inconsistent. It is prevented by requiring a majority vote (quorum) to become or stay primary, so the smaller side of a partition steps down, and by fencing the old primary so it cannot continue to write." },
    { q: "What are RPO and RTO?", a: "RPO, recovery point objective, is the maximum amount of data, measured in time, that the business accepts to lose, for example 'at most 5 seconds of writes'. RTO, recovery time objective, is the maximum time the service may be unavailable. They drive the design: an RPO of zero needs synchronous replication, and a short RTO needs automatic failover and not a manual restore from backup." },
    { q: "Can a failover with asynchronous replication lose data that the user already saw as saved?", a: "Yes. The primary confirmed the write to the client, but crashed before the replica received it. After the replica is promoted, that write does not exist. If this is not acceptable, use synchronous replication for the critical data and accept slower writes. When the old primary comes back it must be resynchronised, not simply reconnected, because it holds writes the new primary never had." },
    { q: "The database failed over but the application still shows errors for minutes. Why?", a: "The application is still using connections or addresses of the old primary. Pooled connections are dead, DNS answers may be cached, and some drivers do not look up the address again. Use pool health checks, short DNS caching, connection timeouts and a driver setting that finds the writable node.", c: `
import psycopg

# list both hosts; connect to whichever one accepts writes
conn = psycopg.connect(
    "postgresql://user:pass@db1.internal,db2.internal/shop"
    "?target_session_attrs=read-write&connect_timeout=3")
` }
  ],
  tips: [
    "Practise failover on a schedule in staging and then in production during a quiet time. An untested standby is a hope, not a plan.",
    "Use a proven tool or managed service for database failover (for example Patroni, or the multi-zone option of a managed database). Do not script promotion by hand.",
    "Monitor replication lag and alert on it. A replica that is far behind turns a failover into data loss.",
    "Backups are still needed. Replication copies mistakes too: a wrong DELETE reaches the replica a moment later."
  ]
});

EXTRA(8, "Graceful shutdown", {
  deep: [
    "A graceful shutdown has a clear order. First, stop receiving new work: fail the readiness check or close the listening socket. Second, finish what is in progress, within a time limit. Third, release resources: flush logs and metrics, close database and broker connections. Last, exit. Uvicorn and Gunicorn do the first two steps for HTTP requests when they receive SIGTERM, and your lifespan shutdown code does the third.",
    "In Kubernetes there is a race that surprises people. When a pod is being deleted, two things happen at the same time: the pod receives SIGTERM, and the pod is removed from the list of service endpoints. Removing it from every proxy and load balancer takes a moment. If the app stops accepting connections at once, requests that are still routed to it fail. The common fix is a short preStop sleep, so the app keeps serving for a few seconds while the routing catches up.",
    "The grace period is a hard limit. Kubernetes waits terminationGracePeriodSeconds in total, including the preStop hook, and then sends SIGKILL, which cannot be caught. So the app's own shutdown timeout must be shorter than the platform's. Requests that take longer than the grace period will be cut whatever you do, which is one more reason to move long work into background jobs.",
    "Graceful shutdown is not only for HTTP. A queue worker should stop fetching new messages, finish the current one and ack it; a message that is not acked will be delivered again, so even a hard kill is safe if tasks are idempotent. WebSocket and SSE connections never finish by themselves, so the server must close them and clients must reconnect. And graceful shutdown does not replace crash safety: processes also die without warning, so data must be safe even without a clean exit."
  ],
  iq: [
    { q: "What happens to in-flight requests when you deploy a new version?", a: "With a correct setup, nothing is visible to users: the old instance gets SIGTERM, stops taking new requests, finishes the running ones within the grace period and exits, while new instances already serve traffic. Without it, the process is killed and those users get connection errors or 502s. Requests longer than the grace period are cut in both cases." },
    { q: "In Kubernetes, why do some requests fail during a rolling update even though the app handles SIGTERM?", a: "Because removing the pod from the load balancing and sending SIGTERM happen in parallel. For a short time traffic is still sent to a pod that has already stopped listening. Add a preStop hook that waits a few seconds before the app starts shutting down, and make the grace period long enough for the wait plus the longest request.", c: `
spec:
  terminationGracePeriodSeconds: 60
  containers:
    - name: api
      lifecycle:
        preStop:
          exec:
            command: ["sleep", "10"]     # keep serving while routing updates
` },
    { q: "How does a background worker shut down gracefully?", a: "It catches SIGTERM and sets a flag. The main loop checks the flag before taking the next job, so the current job finishes and is acknowledged, and then the process exits. The handler itself should do almost nothing; doing real work inside a signal handler is unsafe.", c: `
import signal

stopping = False

def handle_sigterm(signum, frame):
    global stopping
    stopping = True                  # only set a flag

signal.signal(signal.SIGTERM, handle_sigterm)

while not stopping:
    job = fetch_next_job(timeout=1)  # short wait so the flag is checked often
    if job:
        process(job)
        ack(job)
print("worker stopped cleanly")
` },
    { q: "What is the difference between SIGTERM and SIGKILL?", a: "SIGTERM is a polite request; the process can catch it and clean up. SIGKILL cannot be caught or ignored; the kernel ends the process at once, so nothing is flushed or closed. Platforms send SIGTERM first and SIGKILL after the grace period. Design for both: handle SIGTERM well, and make sure a SIGKILL never corrupts data." }
  ],
  tips: [
    "Use the exec form of CMD in the Dockerfile so your app is PID 1 and really receives SIGTERM. A shell wrapper often swallows the signal.",
    "Set the server's graceful timeout lower than the platform's grace period, and the platform's higher than your longest normal request.",
    "Fail the readiness probe as the first step of shutdown, and keep liveness and readiness as separate endpoints.",
    "Test it: run a load test, do a rolling deploy in the middle, and check that the error count stays at zero."
  ]
});

EXTRA(8, "Security", {
  deep: [
    "Most real breaches of web APIs are not clever cryptography attacks. The top risk in recent OWASP Top 10 lists is broken access control: the user is logged in, but the code does not check that the requested object belongs to them. Changing /orders/1042 to /orders/1043 and seeing another customer's order is the classic case, often called IDOR. The fix is boring and must be done on every endpoint: check ownership or role on the server for each object.",
    "Injection is the second big family. It happens when data is mixed into a command: SQL built with string formatting, shell commands built from user input, templates rendered from user text. The cure is always the same idea: keep code and data apart. Use parameterised queries, pass arguments as a list without a shell, and escape output in HTML. Related Python traps are pickle and yaml.load on untrusted data, which can run code while loading.",
    "Browsers add their own classes of attack. XSS is when an attacker's script runs in your page, usually because user content was put into HTML without escaping. CSRF is when another site makes the user's browser send a request with the user's cookies. SSRF is on the server side: your server fetches a URL given by the user and can be made to call internal addresses, such as the cloud metadata service that hands out credentials.",
    "Security is layers, not one wall. Validate input, but also limit what the database user may do, keep services in private networks, encrypt traffic, rotate secrets, log security events and keep dependencies patched. Any single layer will fail one day. Security also has a cost in time and usability, so focus on the real risks of your system, and never invent your own cryptography or authentication protocol."
  ],
  iq: [
    { q: "What is an IDOR vulnerability and how do you prevent it?", a: "Insecure direct object reference: the API takes an object ID from the client and returns the object without checking that this user may access it. Prevent it by including the owner in the query or checking it after loading, on every endpoint. Random IDs such as UUIDs make guessing harder but are not access control.", c: `
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import select

app = FastAPI()

@app.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: int, user = Depends(get_current_user), db = Depends(get_db)):
    stmt = select(Invoice).where(Invoice.id == invoice_id,
                                 Invoice.owner_id == user.id)   # owner is part of the query
    invoice = db.scalars(stmt).first()
    if invoice is None:
        raise HTTPException(status_code=404)
    return invoice
` },
    { q: "Does using an ORM mean you are safe from SQL injection?", a: "Mostly, but not completely. Normal ORM queries use bound parameters and are safe. The danger returns when you build raw SQL with f-strings or string joining, or when you put user input into parts that cannot be parameters, such as column names or ORDER BY. For those, check the value against a fixed allow-list.", c: `
from sqlalchemy import text

# VULNERABLE: user input becomes part of the SQL text
# session.execute(text(f"SELECT * FROM users WHERE email = '{email}'"))

# SAFE: bound parameter
session.execute(text("SELECT * FROM users WHERE email = :email"), {"email": email})

# column names cannot be parameters: use an allow-list
ALLOWED_SORT = {"created_at", "email"}
sort = sort if sort in ALLOWED_SORT else "created_at"
` },
    { q: "What is SSRF and why is it serious in the cloud?", a: "Server-side request forgery: the server fetches a URL chosen by the user, for example for a webhook or an image preview. The attacker gives an internal address, and the server calls it from inside the network. In the cloud the metadata endpoint can return the server's credentials. Defend with an allow-list of hosts, by resolving the name and blocking private and link-local addresses, by not following redirects blindly, and with network egress rules." },
    { q: "What is the difference between XSS and CSRF?", a: "In XSS the attacker's JavaScript runs inside your site in the victim's browser, so it can read the page and act as the user; the defence is output escaping and a content security policy. In CSRF the attacker's site makes the browser send a request to your site with the user's cookies, without reading the answer; the defence is SameSite cookies and CSRF tokens. XSS is the worse one, because a script running inside your site can also get around CSRF protection." }
  ],
  tips: [
    "Run a dependency audit (pip-audit or a similar scanner) and a secret scanner in CI, and turn on automated dependency update pull requests.",
    "Write a test for every protected endpoint that calls it as a different user and expects 403 or 404. These tests catch the most common real vulnerability.",
    "Give the application's database user only the rights it needs. It should not be the owner or a superuser, so an injection cannot drop tables.",
    "Use safe loaders and formats for untrusted data: yaml.safe_load, JSON in place of pickle, and subprocess with an argument list and no shell=True."
  ]
});

EXTRA(8, "Secrets management", {
  deep: [
    "A secret has a life cycle: it is created, stored, delivered to the application, used, rotated and finally revoked. Putting it in an environment variable only solves delivery. Environment variables are better than source code, but they are visible to anyone who can inspect the process or the container, they are copied to child processes, and they are easy to dump into logs or error reports by accident.",
    "A secrets manager stores secrets encrypted, controls who may read each one through access policies, and keeps an audit log of every read. The application proves its identity with its platform role, not with another password, and fetches the secret at start or at run time. This solves the 'secret zero' problem: there is no first password that must be stored somewhere to unlock the others.",
    "Rotation limits the damage of a leak that nobody noticed. For rotation without downtime, two versions must be valid at the same time for a while: create the new secret, deploy it to all consumers, and only then disable the old one. Some systems go further with dynamic secrets: the manager creates a database user with a short lifetime for each application instance, so there is no long-lived password at all.",
    "Common misunderstandings cause most leaks. Deleting a secret in a new commit does not remove it from git history; a leaked secret must be revoked and replaced. Base64 is an encoding, not encryption, so a Kubernetes Secret is not protected unless encryption at rest and access rules are configured. A secret passed as a Docker build argument or ENV stays readable in the image. And a secret sent to the browser or put into a mobile app is no longer a secret."
  ],
  iq: [
    { q: "A developer pushed an API key to GitHub and removed it in the next commit. What do you do?", a: "Treat the key as stolen. Revoke or rotate it at once, because it remains in the git history and may already be copied; automated scanners find such keys very quickly. Then check the provider's logs for misuse during the exposed time. Cleaning the history is optional tidying and does not make the old key safe. Add secret scanning with push protection so it cannot happen again." },
    { q: "How do you rotate a database password without downtime?", a: "Never change the one password in place, because running instances would fail at once. Use two valid credentials for an overlap period: create a second user or password, roll it out to all instances, confirm nobody uses the old one, then remove the old one. Applications should read secrets in a way that allows reload or a rolling restart.", c: `
# 1. create new credentials (both old and new work)
# 2. store the new value in the secrets manager
# 3. rolling restart, or apps re-read the secret
# 4. check that no connections use the old user
# 5. disable the old credentials
` },
    { q: "Are environment variables a safe place for secrets?", a: "They are an acceptable baseline and far better than code, but they have weaknesses: they can be read through process inspection and container tools, they are passed to subprocesses, and debug pages or crash reports often print the whole environment. For sensitive systems, fetch secrets from a manager at run time or mount them as files with strict permissions, and never log the configuration object.", c: `
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")
    stripe_api_key: SecretStr

settings = Settings()
print(settings.stripe_api_key)                     # prints ********** not the value
key = settings.stripe_api_key.get_secret_value()   # explicit access only where needed
` },
    { q: "How do you use a private package token during a Docker build without leaving it in the image?", a: "Do not use ARG or ENV for it, because both are stored in the image metadata or layers. Use a build secret mount: the secret is available as a file only while that one RUN instruction executes and is not written to any layer.", c: `
# Dockerfile
RUN --mount=type=secret,id=pip_conf,target=/etc/pip.conf pip install --no-cache-dir -r requirements.txt

# build command
# docker build --secret id=pip_conf,src=pip.conf -t shop-api .
` }
  ],
  tips: [
    "Install a pre-commit secret scanner (for example gitleaks) and enable secret scanning on the repository host. Catching a secret before the push is far cheaper than rotating it.",
    "Use a different secret for every environment and every service. A leak in a test system must not open production.",
    "Commit a .env.example file with variable names and fake values, and keep the real .env out of git and out of the Docker build context.",
    "Fail at startup when a required secret is missing. A clear crash at deploy time is better than an error on the first payment at night."
  ]
});

EXTRA(8, "Performance optimization", {
  deep: [
    "Performance work starts with a clear goal and a measurement, because intuition about slow code is usually wrong. Decide what you optimise: latency for one request, throughput of the whole service, memory or cost. Then find out if the time is spent on CPU or on waiting. A request that takes 2 seconds but uses 20 ms of CPU is waiting for I/O, and no faster Python code will help it.",
    "Profilers come in two kinds. A deterministic profiler such as cProfile records every function call; it gives exact call counts but slows the program a lot. A sampling profiler such as py-spy looks at the call stack many times per second from outside the process; it has low overhead and can attach to a running production process without a restart. For memory, tracemalloc shows which lines allocate the most.",
    "The size of the possible win is limited by the share of time the part takes. If a function takes 5% of the request time, making it infinitely fast saves 5%. So always fix the biggest block first and then measure again, because the bottleneck moves. In web backends the biggest block is nearly always the database: too many queries, missing indexes, or loading far more rows and columns than needed.",
    "In CPython the global interpreter lock lets only one thread run Python bytecode at a time. Threads and asyncio therefore help with I/O waiting but not with CPU-bound work, which needs multiple processes, native libraries such as NumPy that do the work in C, or the optional free-threaded build of newer Python versions. Every optimisation has a cost in code clarity, so stop when the goal is reached. A cache or a clever trick added without a measured need is just a new place for bugs."
  ],
  iq: [
    { q: "An endpoint is slow in production but fast on your laptop. How do you investigate?", a: "Do not guess; measure where it is slow. Check traces and database metrics for that endpoint first, because production has more data, real concurrency and network hops. Compare query counts and query plans with production-size data. If the time is inside the Python process, attach a sampling profiler to the live process.", c: `
# live view of where a running process spends its time
py-spy top --pid 12345

# record a flame graph for 30 seconds
py-spy record --pid 12345 --duration 30 -o profile.svg
` },
    { q: "Your endpoint calls three independent external APIs one after another, 300 ms each. How do you speed it up?", a: "The calls do not depend on each other, so run them concurrently. With asyncio.gather the total time is about the slowest call, not the sum, so roughly 300 ms and not 900 ms. This works because the time is spent waiting on the network, during which the event loop can run the other calls. Keep a timeout on each call.", c: `
import asyncio, httpx

async def load_dashboard(user_id: int):
    async with httpx.AsyncClient(timeout=2) as client:
        profile, orders, offers = await asyncio.gather(
            client.get(f"http://users/profile/{user_id}"),
            client.get(f"http://orders/recent/{user_id}"),
            client.get(f"http://offers/for/{user_id}"),
        )
    return profile.json(), orders.json(), offers.json()
` },
    { q: "Will using threads make a CPU-heavy Python function faster?", a: "In standard CPython, no. The global interpreter lock allows one thread at a time to run Python code, so CPU-bound threads take turns and gain nothing. Use processes (multiprocessing, ProcessPoolExecutor, more workers) or move the heavy part to native code such as NumPy, which releases the lock. Threads are still the right tool for blocking I/O." },
    { q: "What did Knuth mean by 'premature optimization is the root of all evil'? Does it mean never think about performance?", a: "No. He meant that tuning small details before you know where the time goes wastes effort and makes code harder to maintain, because most of the code is not critical. In the same passage he says the critical few percent must not be ignored. Good design choices up front, such as the right data structure, indexes and avoiding N+1 queries, are not premature; they are just good engineering." }
  ],
  tips: [
    "Log or count the number of SQL queries per request in development and fail a test when an endpoint goes above an expected number.",
    "Load test with realistic data volume and concurrency (for example with Locust or k6) before a launch. Problems appear at 100 users that never appear at one.",
    "Look at p95 and p99 before and after a change, not only the mean, and run benchmarks several times. One run on a busy laptop proves nothing.",
    "Try the cheap wins in order: remove unneeded work, fix queries and indexes, batch calls, run I/O concurrently, then cache. Rewriting in another language is the last option."
  ]
});
