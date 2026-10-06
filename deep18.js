EXTRA(18, "How to approach a system design", {
  deep: [
    "Estimates are only useful when they change a decision. Always work out the peak, not only the average: traffic at the busiest hour is often 2 to 5 times the daily average, and a system is sized for the peak. Then turn the numbers into machines. If one application server handles about 500 requests per second, 7,000 at peak needs 14 servers plus spare ones for failures and deploys. The same sum works for storage, memory and network.",
    "Latency must be discussed as percentiles, not averages. p99 = 800 ms means that 1 request in 100 is slower than 800 ms. This matters more than it seems because of fan-out. If one page needs answers from 100 backend calls and each call is slow 1 percent of the time, then 63 percent of pages hit at least one slow call (1 - 0.99 to the power 100). So in large systems the rare slow case of one component becomes the normal case for the user.",
    "A common misconception is that the interviewer wants the biggest architecture. They want to see that each box in the drawing answers a requirement or a number. A design with one database, one cache and a clear reason for both is stronger than twelve boxes with no reasons. Say what you would NOT build yet, and at which number you would add it."
  ],
  iq: [
    { q: "How do you estimate capacity for a new system?", a: "Start from users and what they do, not from servers. Daily active users times actions per user gives requests per day; divide by 86,400 for the average per second and multiply by a peak factor. Size of one record times records per day gives storage. Then compare with what one machine can do. Round hard: the goal is to know if you need 2 servers or 200, not the exact number.", c: `
# 10 million daily active users, each makes 20 requests a day
#   average  = 10,000,000 * 20 / 86,400     = about 2,300 requests per second
#   peak     = average * 3                  = about 7,000 requests per second
#   servers  = 7,000 / 500 per server       = 14, plus spare = about 20
#
# 2 million new posts a day, about 1 KB each
#   storage  = 2 GB a day = about 730 GB a year, times 3 copies = about 2.2 TB a year
` },
    { q: "Why do we look at p99 latency and not the average?", a: "An average hides the bad cases. If 99 requests take 10 ms and one takes 5 seconds, the average is 60 ms and looks fine, but one user in a hundred waits 5 seconds. Heavy users make many requests, so they meet the slow case often. Also, when one request calls many services, the slow cases of each service add up." },
    { q: "The interviewer says only 'design Twitter'. What are your first five minutes?", a: "Ask questions and write the answers down. Which features are in scope: post, follow, home timeline, search? How many daily users, and how many posts and reads per second? What is more important, a fresh timeline or a fast one? Then say the read-to-write ratio and what it means for the design. Only after that draw the first box." },
    { q: "How do you find the bottleneck and the single points of failure in your own design?", a: "Follow one request through the drawing and ask two questions at every box. 'What if this is 10 times slower?' shows the bottlenecks, usually the database or a synchronous call to another service. 'What if this is gone?' shows the single points of failure. Anything with only one copy (one load balancer, one primary database, one cache node) needs a second copy or a plan for running without it." }
  ],
  tips: [
    "Use the first five minutes for requirements and numbers and write them in a corner of the board. Point back to them when you choose a component.",
    "Draw the data flow of the two main actions (one write, one read) as numbered arrows. It shows that you understand the system, and it finds missing parts.",
    "Say the simple version first: 'One server and one PostgreSQL would handle this up to about X. Now let us see what breaks first.' Then grow the design step by step.",
    "Remember a few sizes: 1 million seconds is about 11.5 days, a UUID is 16 bytes, 1 billion rows of 1 KB each is 1 TB. They make estimates fast."
  ]
});

EXTRA(18, "Scalability: vertical, horizontal and stateless services", {
  deep: [
    "A load balancer works at one of two levels. A layer 4 balancer sees only IP addresses and ports; it forwards TCP connections and is very fast. A layer 7 balancer understands HTTP, so it can route by URL path or header, end TLS, and retry a failed request on another server. It finds dead servers with health checks: it calls a small endpoint every few seconds and stops sending traffic to a server that fails. The balancer itself must not be a single point of failure, so it runs as a pair or as a managed service.",
    "Stateless servers move the limit to the shared resources behind them. Twenty servers with a pool of 50 database connections each open 1,000 connections, and the database slows down long before that. So scaling out needs a connection pooler and often a cache. Auto-scaling also reacts late: a new server needs one or more minutes to start, so a sudden spike arrives before the new capacity. Keep spare capacity, or scale on an early signal such as queue length.",
    "When load is higher than capacity, the system needs back-pressure: a way to say 'slow down' instead of accepting everything. Queues with no limit only hide the problem until memory runs out, and by then every request in the queue has already timed out for its user. It is better to limit queue size and reject extra requests fast with HTTP 429 or 503 (load shedding). A server that answers 90 percent of requests quickly is healthier than one that answers 100 percent after 30 seconds."
  ],
  iq: [
    { q: "How would you design rate limiting across many servers?", a: "A counter in each server's memory does not work: with 10 servers a user gets 10 times the limit. Keep the counters in a shared, fast store such as Redis, and use an atomic operation like INCR so two servers cannot both read the old value. A fixed window counter is the simplest; a token bucket or sliding window is smoother at the window edges. Decide what happens if Redis is down: most systems let requests pass (fail open), so a limiter failure is not an outage.", c: `
import time, redis

r = redis.Redis()

def allow(user_id: str, limit: int = 100, window: int = 60) -> bool:
    bucket = int(time.time()) // window              # the current minute
    key = f"rate:{user_id}:{bucket}"
    count = r.incr(key)                              # atomic across all servers
    if count == 1:
        r.expire(key, window * 2)                    # old buckets clean themselves up
    return count <= limit                            # False -> answer 429 Too Many Requests
` },
    { q: "Your application runs on one server. You add a second one. What breaks?", a: "Everything that lived in the memory or on the disk of one server. Login sessions in memory log users out at random. Uploaded files on local disk are on one server only. An in-memory cache gives different answers on each server. Scheduled jobs now run twice. WebSocket messages reach only the users connected to the same server. Each one needs a shared place: a session store, object storage, a shared cache, a job lock, and a message broker." },
    { q: "Is the load balancer not a single point of failure itself?", a: "It would be if there were only one. In practice you run two: an active one and a standby that takes over the same virtual IP address when health checks fail. Cloud load balancers are already a fleet of machines in several zones behind one name. Across regions, DNS or anycast routing sends users to a healthy region." },
    { q: "With stateless JWT tokens, how do you log a user out or block a stolen token?", a: "A JWT is valid until it expires, and the server keeps no list of them, so you cannot simply delete it. The usual design is a short-lived access token (about 5 to 15 minutes) plus a long-lived refresh token that is stored on the server and can be revoked. For an instant block you add a small deny list of token IDs in Redis that lives until those tokens expire. This brings back a little state; that is the price of revocation." }
  ],
  tips: [
    "Check that the service is really stateless: run two copies locally behind a simple proxy and use the whole application. Problems with sessions, uploads and caches appear in minutes.",
    "Give every server a health endpoint that the load balancer calls, and on shutdown first fail the health check, then finish the running requests, then exit. This makes deploys invisible to users.",
    "Set a maximum for the auto-scaler and an alert when it is reached. Without a limit, a bug or an attack scales your bill, and all the new servers can still overload the database.",
    "Use a lock or a 'leader only' rule for scheduled jobs before you add the second server. Jobs that run twice send two emails and charge two times."
  ]
});

EXTRA(18, "Caching strategies", {
  deep: [
    "Cache-aside with 'update the database, then delete the key' still has a race. Reader R misses the cache and reads the old value from the database. Before R writes it into the cache, writer W updates the database and deletes the key. Then R stores its old value. The cache now holds stale data until the TTL ends. The window is small, but at high traffic it happens. This is why every key needs a TTL even when you invalidate on write: the TTL is the safety net.",
    "Why delete the key and not write the new value? If two writers update the same row, their database writes and cache writes can happen in a different order, and the cache keeps the older value for a long time. Delete is safe to do twice and in any order. A second problem is that the database write and the cache delete are two separate systems: if the delete fails, the cache stays stale. Stronger designs retry the delete from a queue, or read the database change log (change data capture) and invalidate from there.",
    "Redis runs commands on a single thread, so each command is atomic, but one slow command blocks all clients. When memory is full, the maxmemory-policy setting decides what happens; allkeys-lru removes keys that were not used recently, and it picks them from a small random sample, not with a perfect LRU list. Expired keys are removed when someone touches them and by a background task that samples keys, so expired data can use memory for a while. Two key shapes cause trouble: a hot key that gets a large share of all traffic, and a big key whose value is many megabytes."
  ],
  iq: [
    { q: "How do you keep the cache and the database consistent?", a: "You cannot make them perfectly consistent without a distributed transaction, so the goal is a short and limited stale time. The database is the source of truth. On write: update the database first, then delete the cache key. Put a TTL on every key so that any mistake heals itself. For data that must never be stale, such as a balance at payment time, read from the database and do not use the cache.", c: `
# the race that remains in cache-aside
#
#   reader R                           writer W
#   GET key           -> miss
#   read DB           -> old value
#                                      UPDATE DB  -> new value
#                                      DEL key
#   SET key = old value                           <- stale until the TTL ends
#
# ways to reduce it: short TTL, delete again after a short delay,
# or invalidate from the database change log
` },
    { q: "One cache key is extremely hot (a celebrity profile, a flash-sale product). How do you handle it?", a: "A hot key overloads the one cache node that owns it, and when it expires all requests hit the database at once. Keep a copy in a small in-process cache on each application server for a few seconds, so most reads never reach Redis. You can also store several copies of the key with different suffixes on different nodes and read a random one. Protect the rebuild with a lock, or refresh the key in the background before it expires." },
    { q: "Explain cache penetration, cache breakdown (stampede) and cache avalanche.", a: "Penetration: requests for keys that do not exist anywhere, so every request misses the cache and hits the database; fix it by caching the 'not found' result or by checking a Bloom filter of valid IDs first. Breakdown or stampede: one popular key expires and many requests rebuild it at the same time; fix it with a lock or early refresh. Avalanche: many keys expire together, or the cache goes down, and the database gets all the traffic; fix it with random TTLs, a cache cluster with replicas, and rate limits in front of the database." },
    { q: "On a write, why do most teams delete the cache entry and not update it?", a: "Updating has an ordering problem: two writers can update the database in one order and the cache in the other, and the cache keeps the wrong value. Delete does not have this problem. Delete is also cheaper when the cached value is built from several queries, because you rebuild it only if someone reads it. The cost is one extra cache miss after each write." }
  ],
  tips: [
    "Never run the KEYS command on a production Redis. It walks every key on the single thread and blocks all clients. Use SCAN, which works in small steps.",
    "Put a version in the key name, for example product:v2:1042. When the format of the cached value changes, new code simply uses new keys and no old data is misread during the deploy.",
    "Set maxmemory and maxmemory-policy explicitly. With the default policy (noeviction) a full Redis returns errors on writes.",
    "Put hit ratio, evicted keys and memory use on a dashboard. A falling hit ratio after a deploy usually means a key name changed or a TTL is too short."
  ]
});

EXTRA(18, "Choosing a database: SQL and NoSQL", {
  deep: [
    "Behind the SQL and NoSQL labels there are two main storage engines. A B-tree engine (PostgreSQL, MySQL) keeps data in sorted pages and changes them in place; reads are fast and predictable, and each write touches a few random pages. An LSM-tree engine (Cassandra, HBase, RocksDB) collects writes in a sorted memory table and in an append-only log, then flushes them to disk as immutable sorted files. Background compaction merges those files. Writes are sequential and very fast. A read may have to look in several files, so each file has a Bloom filter to skip it quickly.",
    "Distributed NoSQL stores are fast because they refuse to do expensive things. A query must include the partition key, so that it goes to one node. There are no joins, so you store data already joined, one table per query. A secondary index is either local to each partition or a second copy of the data that is updated asynchronously. If a new feature needs a new kind of query, you often need a new table and a backfill, where in SQL you would only add an index.",
    "Some common statements are out of date. 'NoSQL has no schema' is wrong: the schema moves from the database into every application that reads the data. 'NoSQL has no transactions' is also old: MongoDB has had multi-document transactions since version 4.0 and DynamoDB added transactions in 2018, though with limits and extra cost. And 'SQL does not scale' ignores that one well-tuned PostgreSQL server handles thousands of transactions per second, which is more than most products ever need."
  ],
  iq: [
    { q: "SQL or NoSQL: for (a) payments, (b) chat messages, (c) a product catalogue. Why?", a: "(a) Payments: SQL. You need ACID transactions, constraints and flexible queries for audits, and the volume is modest. (b) Chat messages: a wide-column store such as Cassandra. The volume is huge and append-only, and the main query is always 'messages of one conversation, newest first', which fits a partition key. (c) Product catalogue: start with SQL plus a JSONB column for variable attributes, and add a search engine for text search. Always give the reason from the access pattern, not from the product name." },
    { q: "Why is an LSM-tree faster for writes than a B-tree? What do you pay for it?", a: "An LSM write is an append to a log and an insert into a memory table, with no random disk access. A B-tree write must find and change the right page. The price is paid later and on reads: compaction uses disk and CPU in the background and can cause latency spikes, a read may check several files, and deletes are stored as markers (tombstones) that slow reads until compaction removes them.", c: `
# LSM-tree write path                      read path
#
#   write -> append to log (durability)    1. memtable
#         -> insert into memtable          2. newest SSTable   (Bloom filter: skip if key not here)
#   memtable full -> flush to an SSTable   3. older SSTables ...
#   background: compaction merges SSTables and drops old versions and tombstones
` },
    { q: "In a document database, when do you embed data in the document and when do you reference it?", a: "Embed when the data is read together with the parent, belongs to it, and stays small: the lines of an order, the addresses of a user. Reference when the data is shared by many parents, changes on its own, or can grow without limit: the product itself, or the comments on a popular post. Embedding a list with no upper limit is the classic mistake, because the document grows until it hits the size limit and every update rewrites it." },
    { q: "How do you move a live system from one database to another with zero downtime?", a: "In steps, each of which can be undone. First write to both databases (dual write, or stream changes from the old one). Copy the old data in the background. Compare the two stores until they agree, and send some reads to the new store in shadow mode to check the results. Then switch reads, then stop writing to the old one. Keep the old database for a while as a way back." }
  ],
  tips: [
    "Before choosing a NoSQL store, write the list of queries with their frequency. If you cannot write that list yet, the product is still changing and SQL is the safer choice.",
    "PostgreSQL with JSONB covers many 'we need a document store' cases. Try it first if the team already runs PostgreSQL; a second database means a second backup, monitoring and on-call skill.",
    "Treat the search engine as a copy, never as the source of truth. Fill it from the main database through a queue or the change log, and keep a job that can rebuild the whole index.",
    "In Cassandra and DynamoDB, check the size of the biggest partition, not the average. One very large partition (one huge customer) causes timeouts that averages never show."
  ]
});

EXTRA(18, "Replication, sharding and consistent hashing", {
  deep: [
    "Promoting a follower when the leader dies needs agreement, or two nodes may both act as leader. Consensus algorithms such as Raft and Paxos solve this with majorities. In Raft, time is cut into numbered terms. A node that hears nothing from the leader starts an election for the next term, and it wins if a majority votes for it. A write is committed only when a majority of nodes have stored it. Two majorities always share at least one node, so two leaders can never both commit in the same term.",
    "The quorum arithmetic is simple. A majority of N nodes is N / 2 rounded down, plus 1. A cluster of 3 survives 1 failure, and a cluster of 5 survives 2. A cluster of 4 also survives only 1, so even sizes add cost and no safety; this is why you see 3 or 5 nodes. In leaderless stores W + R > N guarantees only that a read contacts at least one node with the latest acknowledged write. It does not give full strong consistency: two writes at the same time still need a rule to pick a winner, and 'last write wins' by clock time silently drops one of them when clocks differ.",
    "Hashing spreads keys evenly, but it cannot spread one key. If one customer or one celebrity produces 30 percent of the traffic, the shard that holds that key is hot, and more shards do not help. The fixes work on the key: add a suffix (a 'salt') so the key becomes several sub-keys on different shards, give the very big tenants their own shard, or put a cache in front. To make growth less painful, many systems hash into a fixed large number of logical shards, for example 1,024, and keep a small table that maps logical shards to physical servers. Growing then means moving some logical shards, not hashing every key again."
  ],
  iq: [
    { q: "How do you handle a hot key, the 'celebrity problem'?", a: "First notice that adding shards does not help, because one key always lives on one shard. For reads, cache the celebrity's data hard, in several layers. For writes and fan-out, treat celebrities differently: do not copy their post to millions of follower timelines; let followers pull it at read time and merge it in. For storage, split the key with a suffix, such as user_id plus a bucket number, so the data is spread over several partitions, and read all buckets when needed." },
    { q: "What is split brain and how do you prevent it?", a: "Split brain is when a network problem cuts the cluster in two and each side chooses its own leader. Both accept writes, the data splits, and the two versions cannot be merged automatically. Prevent it by requiring a majority to elect a leader: only one side can have more than half of the nodes. Also give each leader a number that grows (a term or fencing token), and make storage reject writes that carry an old number, so a stale leader that wakes up cannot do damage." },
    { q: "N = 5 replicas. Which W and R give consistent reads, and how many failures can you survive?", a: "You need W + R > 5 so that every read set overlaps every write set. W = 3, R = 3 is the balanced choice: reads and writes both keep working with 2 nodes down. W = 5, R = 1 makes reads very fast, but one dead node stops all writes. W = 1, R = 1 is the fastest and most available, but a read can miss the latest write.", c: `
# N = 5
#
#   W  R   W + R > N ?   writes survive   reads survive
#   3  3   yes           2 nodes down     2 nodes down     balanced
#   5  1   yes           0 nodes down     4 nodes down     read-optimised
#   1  5   yes           4 nodes down     0 nodes down     write-optimised
#   1  1   no            4 nodes down     4 nodes down     fast, may be stale
#
# majority of N = N // 2 + 1      3 nodes -> 2,   5 nodes -> 3,   4 nodes -> 3 (no gain over 3)
` },
    { q: "How do you add a shard to a live system without downtime?", a: "Choose which keys move, using consistent hashing or by reassigning logical shards. Copy those keys to the new shard in the background while the old shard still serves them. During the copy, send new writes for those keys to both places, or replay a change stream. When the two copies match, switch the routing table for those keys, then delete the old copies. The routing table must change in one atomic step, and every client must see the same version of it." }
  ],
  tips: [
    "Run consensus clusters (etcd, ZooKeeper) with 3 or 5 nodes, spread over 3 availability zones. With only two zones, losing the larger zone loses the majority.",
    "Put the shard key into every table and every query from the first day, even while there is one database. Adding it later means touching every query.",
    "Measure skew, not only total load: the request rate and data size of the top 10 keys. A dashboard of averages never shows a hot partition.",
    "In an interview, when you say 'we shard by user_id', add at once which query becomes hard (for example 'all orders of one product') and how you serve it, such as a second table keyed by product or a search index."
  ]
});

EXTRA(18, "CAP theorem and consistency models", {
  deep: [
    "The words in CAP have narrow meanings. Consistency means linearizability: once a write has finished, every later read, on any node, returns it. Availability means that every node that has not crashed must answer every request with a real result. That is much stricter than '99.9 percent uptime'. A system that answers from the majority side and rejects requests on the minority side is 'not available' for CAP, though most users never notice. So CP systems are usually highly available in practice.",
    "Linearizable and serializable are often mixed up. Serializable is about transactions on many objects: the result is the same as some one-after-another order. Linearizable is about single operations and real time: a read never goes back in time. A database can have one without the other. Between strong and eventual consistency there are useful middle levels. Read-your-writes: you see your own changes. Monotonic reads: you never see data go backwards. Causal consistency: you never see an answer before its question.",
    "Time is the hidden difficulty. Clocks on different machines differ by milliseconds or more, so you cannot order events by wall-clock time, and 'last write wins' can drop the write that really came later. Systems use logical clocks (counters that grow with each event) or version vectors to order events without trusting the clock. Google Spanner goes the other way: it uses GPS and atomic clocks to know the maximum clock error, and waits out that small uncertainty before it confirms a commit."
  ],
  iq: [
    { q: "People say 'pick two of three: C, A, P'. Why is that misleading?", a: "You cannot choose to give up partition tolerance, because network failures happen whether you allow them or not. A 'CA' system would be one whose network never fails, which means a single machine. The real choice appears only during a partition: answer with data that may be stale (A), or refuse (C). When the network is healthy you can have both, and then the trade-off is between consistency and latency, as PACELC says." },
    { q: "A bank sounds like it must choose consistency. But an ATM still gives cash when it is offline. Explain.", a: "This is Eric Brewer's own example. The ATM chooses availability, with a limit: it allows withdrawals up to a small amount while it is disconnected and records them. When the connection returns, the records are sent and the accounts are corrected, sometimes with an overdraft. The bank accepts a small, limited risk in exchange for staying open. The lesson is that the choice is a business decision made for each operation, not one rule for the whole system." },
    { q: "A user refreshes a page and sees a comment, refreshes again and it is gone, then it is back. What is the cause and the fix?", a: "The reads go to different replicas, and one of them is further behind. This breaks monotonic reads: the user saw time go backwards. The fix is to make one user read from one replica, for example by hashing the user ID to choose the replica, or to remember the newest version the user has seen and only read from replicas that have reached it.", c: `
# monotonic reads: one user always reads from the same replica
def replica_for(user_id: int, replicas: list):
    return replicas[user_id % len(replicas)]

# stronger: remember what the user has already seen
def read(user_id, session):
    for replica in replicas:
        if replica.applied_version() >= session.last_seen_version:
            return replica.fetch(user_id)
    return primary.fetch(user_id)              # no replica is fresh enough
` },
    { q: "What is the difference between linearizable and serializable?", a: "Serializable is an isolation guarantee for transactions: running them together gives the same result as running them one by one in SOME order, and that order does not have to match real time. Linearizable is a guarantee for single reads and writes on replicated data: each operation seems to happen at one instant, in real-time order. A system with both is called strict serializable; Spanner is an example." }
  ],
  tips: [
    "In a design interview, state the consistency need for each kind of data: 'the balance and the stock must be strong; the like count and the feed can be eventual'. One sentence like this shows you understand CAP better than reciting the theorem.",
    "Do not use the client's or the server's wall clock to decide which write wins. Use a version number that the database increases, and reject a write that carries an old version.",
    "Make eventual consistency visible in the UI where it matters. After a save, show the user's own change from local state and do not read it again from a replica.",
    "Test what your database really does when the network breaks: block the network between nodes in a test environment and look at the data afterwards. Product pages and real behaviour often differ; the Jepsen reports show many examples."
  ]
});

EXTRA(18, "Message queues and event-driven architecture", {
  deep: [
    "A Kafka topic is split into partitions, and each partition is an append-only file. A message gets a position number called an offset. Consumers do not remove messages; a consumer group only stores the offset it has reached in each partition. Inside a group each partition is read by exactly one consumer, so the number of partitions is the upper limit of parallel consumers. Order is guaranteed only inside one partition. The producer chooses the partition by hashing the message key, so all events with the same key (the same order ID) stay in order.",
    "Delivery guarantees come from the order of two steps: doing the work and recording that it is done. If the consumer commits the offset first and then crashes, the message is lost: at-most-once. If it does the work first and crashes before the commit, the message comes again: at-least-once. There is no third order, so 'exactly-once delivery' over a network does not exist. What systems really offer is exactly-once effect: at-least-once delivery plus idempotent processing. Classic queues work the same way: SQS hides a message for a visibility timeout and shows it again if it was not deleted, and RabbitMQ sends it again if no acknowledgement arrives.",
    "A queue is also where overload becomes visible. If producers are faster than consumers for a long time, the queue only grows, and a queue with no limit turns a speed problem into a memory or disk problem. Back-pressure means giving the queue a limit and deciding what happens at the limit: block the producer, reject new work, or drop old messages. One bad message that always fails (a poison message) can block a whole partition if it is retried forever, which is why retries need a limit and a dead-letter queue."
  ],
  iq: [
    { q: "What happens if a consumer crashes in the middle of processing a message?", a: "The broker never received the acknowledgement (or the offset commit), so after a timeout or a rebalance it gives the same message to another consumer. So the work may be done twice, partly or fully. The consumer must therefore be idempotent: it records the message ID in the same database transaction as its changes, and skips IDs it has already seen. Never acknowledge before the work is saved, or a crash will lose the message." },
    { q: "Is exactly-once delivery possible?", a: "Not as delivery. The sender cannot know if a missing acknowledgement means 'not received' or 'received but the reply was lost', so it must either send again (maybe twice) or not (maybe zero times). What you can build is exactly-once processing: deliver at least once and make the effect idempotent with a unique message ID. Kafka's 'exactly-once' feature does this for flows that read from Kafka and write back to Kafka; it does not cover an email or a payment sent to an outside system." },
    { q: "Events for one order must be processed in order (created, paid, shipped). How do you guarantee that with many consumers?", a: "Use the order ID as the message key. All events of one order then go to the same partition, and one partition is read by one consumer at a time, in order. Events of different orders still run in parallel on other partitions. The trade-off: a very active key makes a hot partition, and a retry must not let a later event of the same key pass an earlier one." },
    { q: "The service saves an order in the database and then publishes an event. What can go wrong, and what is the fix?", a: "This is the dual-write problem. If the service crashes between the two steps, the order exists but no event was sent; with the opposite order you get an event for an order that does not exist. A database transaction cannot include the broker. The outbox pattern writes the event into an outbox table in the same transaction as the order. A separate relay reads that table and publishes; it may publish twice, so consumers remove duplicates by event ID.", c: `
BEGIN;
INSERT INTO orders (customer_id, status) VALUES (7, 'pending');
INSERT INTO outbox (event_type, payload)
VALUES ('order.placed', '{"order_id": 1042, "customer_id": 7}');
COMMIT;                                   -- both rows or neither

-- the relay process: take a batch, publish it, mark it as sent
SELECT id, event_type, payload
FROM outbox
WHERE sent_at IS NULL
ORDER BY id
LIMIT 100
FOR UPDATE SKIP LOCKED;
` }
  ],
  tips: [
    "Alert on consumer lag and on the age of the oldest message, not only on queue length. A queue of 1,000 messages is fine if they are 2 seconds old and a problem if they are 2 hours old.",
    "Put an event_id, an event type, a schema version and the time of the event in every message. You will need all four for removing duplicates, routing, upgrades and debugging.",
    "Set the visibility timeout (or the acknowledgement timeout) longer than the slowest normal processing time. If it is shorter, slow messages are delivered again while the first consumer is still working.",
    "Put an alert on the dead-letter queue and build a tool to send its messages back. A dead-letter queue that nobody looks at is only a slower way to lose data."
  ]
});

EXTRA(18, "API design: REST, gRPC and GraphQL", {
  deep: [
    "An idempotency key must be implemented with care. The server stores the key with a hash of the request and, later, the response. The store needs a unique constraint on the key, because two copies of the same request can arrive at the same millisecond; a 'check, then insert' in application code lets both pass. The first request inserts the key with the status 'in progress'; a duplicate that arrives during the work gets a 409 or waits. If the same key comes with a different request body, return an error, because it is a client bug.",
    "Pagination with page numbers uses OFFSET in the database and has two faults: deep pages are slow, and rows move between pages when new data arrives, so users see repeats or miss items. Cursor pagination returns an opaque token that encodes the sort values of the last row; the next call continues from there with an index. Rate limits are part of the contract too. Return 429 with a Retry-After header, and choose the algorithm on purpose: a token bucket allows short bursts, while a fixed window lets a client send twice the limit across the edge of two windows.",
    "Compatibility rules decide how long an API can live. Adding an optional field or a new endpoint is safe. Removing a field, renaming it, changing its type or making an optional input required breaks clients. In protobuf the field numbers are the contract: never reuse a number. gRPC is fast mainly because HTTP/2 sends many calls over one connection and the binary messages are small. GraphQL moves the N+1 problem to the server: a list of 50 orders, each asking for its customer, causes 50 lookups unless the server batches them."
  ],
  iq: [
    { q: "Which HTTP methods are idempotent? Is PATCH? Is DELETE?", a: "GET, PUT and DELETE are idempotent: doing them twice leaves the same state as doing them once. PUT replaces the whole resource, so repeating it changes nothing. A second DELETE may return 404, but the state on the server is the same, and that is what idempotent means. POST is not idempotent. PATCH is not guaranteed to be: 'set status to paid' is idempotent, but 'add 1 to quantity' is not." },
    { q: "Two identical payment requests with the same Idempotency-Key arrive at the same moment on two servers. How do you make sure the card is charged once?", a: "Let the database decide who is first. Each server tries to insert the key into a table with a unique constraint. Exactly one insert succeeds; that server does the charge and stores the response. The other one sees the conflict and returns the stored response, or 409 if the first is still working. A plain 'look in the cache, then charge' has a gap between the check and the write, and both requests can pass through it.", c: `
INSERT INTO idempotency_keys (key, request_hash, status)
VALUES ('a1b2-c3d4', 'hash-of-the-request-body', 'in_progress')
ON CONFLICT (key) DO NOTHING;

-- 1 row inserted: this request is first. Charge the card, then save the result:
UPDATE idempotency_keys
SET status = 'done', response = '{"payment_id": 981, "state": "paid"}'
WHERE key = 'a1b2-c3d4';

-- 0 rows inserted: a duplicate. Read the row and return its response (or 409 if in_progress)
` },
    { q: "An operation takes 5 minutes (a large export). How do you design the API?", a: "Do not keep the HTTP request open, because proxies and clients will time out. Accept the request, create a job, and return 202 Accepted with the URL of the job. The client polls that URL, or you call a webhook when the job is done. The job resource shows the state and, at the end, a link to the result.", c: `
# POST /v1/exports                 -> 202 Accepted
#                                     Location: /v1/exports/77
#                                     { "id": 77, "status": "queued" }
#
# GET  /v1/exports/77              -> 200 { "id": 77, "status": "running", "progress": 40 }
# GET  /v1/exports/77              -> 200 { "id": 77, "status": "done",
#                                           "result_url": "/v1/exports/77/file" }
` },
    { q: "You must change a response field from a string to an object. How do you do it without breaking clients?", a: "Do not change the old field. Add a new field with the new shape beside it, document the old one as deprecated, and watch the logs until clients stop using it. Remove the old field only in a new API version. Old mobile app versions stay in use for years, so the server must keep several versions alive at the same time." }
  ],
  tips: [
    "Return a request ID in a response header and write it in every log line. When a client reports an error, that ID finds the whole story in seconds.",
    "Set a default and a maximum for every limit parameter. One client asking for limit=1000000 should not be able to slow the database for everyone.",
    "Use the same field names and formats everywhere: one name for the same idea, timestamps in ISO 8601 UTC, money as an integer of the smallest unit or as a string, never as a float.",
    "Write the OpenAPI or proto file before the code and let the client developers review it. Changing a contract on paper is cheap; changing it after release is nearly impossible."
  ]
});

EXTRA(18, "Monolith, microservices and modular design", {
  deep: [
    "Inside a monolith, 'reserve stock and take payment' is one database transaction. Across services there are two choices. Two-phase commit asks every participant to prepare and then to commit; it gives atomicity, but all participants hold locks while they wait, and if the coordinator dies at the wrong moment they stay blocked. So it is rarely used between services. A saga uses a chain of local transactions with compensating actions. It can be run by one orchestrator that calls each step, or by choreography, where each service reacts to the events of the others.",
    "A saga is not a transaction. It has no isolation: other requests can see the half-finished state, such as stock reserved for an order that will be cancelled. Compensations are new actions, not an undo; a refund is a second money movement, and an email cannot be unsent. So step order matters: put the steps that can be undone first, and the step that cannot be undone last. Every step and every compensation must be idempotent, because they will be retried.",
    "Synchronous calls between services multiply failure and add latency. If a request passes through five services, each with 99.9 percent availability, the chain is at best about 99.5 percent, and the response time is the sum of all five. The usual answer is to copy data in place of calling: the order service keeps its own small copy of the customer names it needs, updated from events. This removes the runtime dependency at the price of eventual consistency. To split an existing monolith, the strangler fig pattern moves one feature at a time behind a routing layer while the rest stays in place."
  ],
  iq: [
    { q: "How would you split a large monolith into services?", a: "Not with a big rewrite. First draw clear module boundaries inside the monolith and stop modules from reading each other's tables. Then put a routing layer in front and extract one module that has a real reason to be separate, such as different scaling or a separate team. Move its data to its own database, send its traffic to the new service, and repeat. This is the strangler fig pattern; the system keeps working at every step." },
    { q: "An order touches the order, payment and inventory services. With no distributed transaction, how do you keep the data consistent?", a: "With a saga. Each service runs its own local transaction and publishes an event; the next service reacts to it. If a step fails, earlier steps are undone by compensating actions, such as releasing the stock or refunding the payment. Use the outbox pattern so that 'save my change' and 'publish my event' cannot be separated, and make every handler idempotent. The system is consistent in the end, not at every instant, so the order needs visible states such as 'pending'." },
    { q: "The order service needs the customer's name and address. Should it call the customer service on every request, or keep its own copy?", a: "A call is simple and always fresh, but then orders cannot be shown when the customer service is down or slow. A local copy, updated by 'customer changed' events, makes the order service independent and fast, but the copy can be a few seconds old. Use the copy for display data. And note that the delivery address on a placed order should be stored in the order anyway, because it is a historical fact." },
    { q: "What happens when a compensating action in a saga fails?", a: "It must be retried until it succeeds, which is why compensations must be idempotent and must not depend on anything that can be refused. The saga state is stored in a database, so that after a crash the orchestrator knows which steps remain. If retries keep failing, the saga goes to a 'needs manual action' state and raises an alert. You cannot roll back a rollback; in the end a person fixes it." }
  ],
  tips: [
    "Enforce module boundaries in the monolith with a tool, not with good intentions: an import-rule check in CI, and one database schema per module with no joins across schemas.",
    "Before extracting a service, count how many of its requests would need a call back into the monolith. If the answer is most of them, the boundary is in the wrong place.",
    "Give each saga an ID and pass it in every event and log line. Without it, finding why one order is stuck across five services takes hours.",
    "In an interview, do not start with microservices. Say 'I would start with a modular monolith and extract X when Y happens', and name the X and the Y."
  ]
});

EXTRA(18, "Reliability: availability, redundancy and handling failure", {
  deep: [
    "Retries are helpful one at a time and dangerous in total. If the web tier retries 3 times, the service behind it retries 3 times and its database client retries 3 times, one user request can become 27 database calls, just when the database is already struggling. This is a retry storm. The defences: retry at one layer only, add jitter so clients do not retry at the same instant, and use a retry budget, for example 'retries may be at most 10 percent of normal traffic'.",
    "A circuit breaker is a small state machine around a remote call. Closed: calls pass and failures are counted. When failures cross a limit it becomes open: calls fail at once without touching the remote service, which gives that service time to recover and frees your threads. After a wait it becomes half-open: a few test calls pass; if they succeed it closes, and if not it opens again. Timeouts need the same care. Each layer's timeout must be shorter than the timeout of its caller, or the lower layers keep working on requests that the user has already given up on.",
    "Health checks can cause outages too. A liveness check answers 'is this process broken, should it be restarted'. A readiness check answers 'should it get traffic now'. If the liveness check tests the database, a short database problem restarts every application server at once and turns a small incident into a full outage. And most outages are caused by changes, not hardware. Safe releases are therefore a reliability feature: release to a few users first (canary), watch the error rate, and keep a fast way back."
  ],
  iq: [
    { q: "How can retries make an outage worse?", a: "A slow service gets more load from retries exactly when it has the least capacity, so it cannot recover. Retries at several layers multiply. Clients that all failed at the same moment also retry at the same moment, which creates waves. Use exponential backoff with jitter, retry in only one layer, set a retry budget, and put a circuit breaker in front so that a failing service is left alone." },
    { q: "Explain how a circuit breaker works.", a: "It wraps calls to one dependency and watches the failure rate. While closed, calls go through. After too many failures it opens: calls fail immediately and the caller uses a fallback, so no threads are stuck waiting. After a cool-down it lets a few test calls through (half-open) and closes again only if they succeed. It protects both sides: the caller stays fast, and the broken service gets time to recover.", c: `
#               too many failures
#   [ CLOSED ] -------------------> [ OPEN ]            calls fail at once, use the fallback
#       ^                               |
#       |  test calls succeed           |  after a wait (for example 30 seconds)
#       |                               v
#       +------------------------- [ HALF-OPEN ]        let a few test calls through
#                                       |
#                                       +-- a test call fails --> back to OPEN
` },
    { q: "Two application servers are each 99 percent available, behind a load balancer that is 99.99 percent available. What is the availability of the system?", a: "The two servers are in parallel: the pair fails only when both fail, 0.01 times 0.01 = 0.0001, so the pair is 99.99 percent available. The load balancer is in series with the pair, so multiply: 0.9999 times 0.9999 is about 99.98 percent. This assumes that failures are independent. A bad deploy or a shared database breaks both servers together, which is why real numbers are lower.", c: `
# parallel (either server is enough):  1 - (0.01 * 0.01)  = 0.9999   -> 99.99 percent
# series   (balancer AND the pair):    0.9999 * 0.9999    = 0.9998   -> 99.98 percent
#
# 99.98 percent = about 1 hour 45 minutes of downtime per year
` },
    { q: "How do you deploy a new version, with a database schema change, with zero downtime?", a: "Use a rolling or blue-green deploy, so that old and new servers run together for some time. That means the database must work with both versions at once. Split the change: first a migration that only adds things (a new nullable column or a new table), then the new code, then a later migration that removes the old column after no running version uses it. Never rename or drop in the same release that changes the code." }
  ],
  tips: [
    "Set an explicit timeout on every HTTP client and database driver. Many libraries have no timeout or a very long one by default, and one slow dependency then freezes the whole service.",
    "Keep the liveness check trivial (the process can answer) and put dependency checks only in the readiness check. Otherwise a database problem restarts all your servers.",
    "Practise the failover and the restore on a schedule. Measure how long they really take and compare the result with your RTO and RPO.",
    "After each incident write a short, blameless review: what happened, how it was detected, what would have detected it sooner. Turn the last answer into an alert."
  ]
});

EXTRA(18, "Worked design: a URL shortener", {
  deep: [
    "ID generation is the heart of this design, and there are three standard ways to get unique numbers without one central counter. Range allocation: each server takes a block of, say, 100,000 IDs from a coordinator and uses them locally; if the server dies the rest of the block is lost, which does not matter. Snowflake IDs: a 64-bit number made of a timestamp, a machine ID and a counter per millisecond, generated with no coordination at all. Database sequences with a different start and the same step on each node are the third way.",
    "A counter gives short codes with no collisions, but the codes are sequential: whoever gets code 'abc12' can try 'abc13' and read other people's links. To avoid this, scramble the number before encoding it with a reversible function (for example, multiply by a large odd constant modulo the size of the code space), which keeps uniqueness and hides the order. The alternative is a random 7-character code and a UNIQUE constraint in the database. With 6 billion codes used out of 3.5 trillion, a new random code collides about once in 600 attempts, so a simple retry on conflict is enough.",
    "The read path decides the cost. A 301 redirect is cached by browsers, so repeat visitors never reach you: less load, but you lose click counts and you cannot change or disable the link for those users. A 302 comes back every time. Cache 'not found' results as well, or a scan of random codes will hit the database on every request. Expired links are easiest to handle lazily: check expires_at when the link is read, and let a background job delete old rows in small batches."
  ],
  iq: [
    { q: "How do you generate unique IDs across many servers without a central bottleneck?", a: "Use Snowflake-style IDs or range allocation. A Snowflake ID packs the current time in milliseconds, a machine number and a per-millisecond counter into 64 bits, so every server creates IDs alone, and they are roughly ordered by time. The risk is the clock: if a server's clock jumps backwards it could repeat an ID, so the generator must wait until the clock passes the last time it used. Range allocation has no clock problem, but it needs a coordinator to hand out the blocks.", c: `
# 64-bit Snowflake ID
#
#  | 1 bit   | 41 bits                         | 10 bits     | 12 bits   |
#  | unused  | milliseconds since a chosen day | machine id  | sequence  |
#
#   41 bits of milliseconds = about 69 years
#   10 bits                 = 1,024 machines
#   12 bits                 = 4,096 IDs per millisecond on each machine

def make_id(ms_since_epoch: int, machine_id: int, sequence: int) -> int:
    return (ms_since_epoch << 22) | (machine_id << 12) | sequence
` },
    { q: "The same long URL is submitted twice. Do you return the same short code?", a: "It is a product decision, so ask. Returning the same code saves storage, but it needs an index on the long URL (or on its hash) and a lookup on every create. It also mixes the click statistics of different users and makes per-user expiry impossible. Most real services create a new code each time for logged-in users. If deduplication is wanted, store a hash of the URL in an indexed column and look it up before inserting." },
    { q: "A short link goes viral and gets 100,000 requests per second. What happens in your design?", a: "It is a hot key and a read, so the cache carries it. The stateless API servers scale out behind the load balancer and all read the same Redis entry. Add a small in-process cache of a few seconds on each server, so that most requests do not even reach Redis, and protect the entry from a stampede when it expires. Click counting goes to a queue, so the write side cannot slow the redirect. If you can give up exact counts, a CDN can serve the redirect at the edge." },
    { q: "Two users ask for the same custom alias at the same moment. How do you prevent both from getting it?", a: "Do not check first and insert second, because both checks can pass before either insert. Make the code column the primary key and just insert. The database lets exactly one of them succeed; the other one gets a conflict, and you return 'alias already taken'. One atomic statement replaces the check and the lock.", c: `
INSERT INTO links (code, long_url, owner_id)
VALUES ('my-sale', 'https://example.com/a/very/long/path', 7)
ON CONFLICT (code) DO NOTHING
RETURNING code;

-- one row returned: the alias is yours
-- no row returned:  someone else has it, answer 409 Conflict
` }
  ],
  tips: [
    "In the interview, do the arithmetic for the code length out loud: 62 to the power 7 is about 3.5 trillion, we need 6 billion, so 7 characters are enough and leave room for random codes.",
    "Leave look-alike characters such as 0 and O, or 1 and l, out of the alphabet if people will type the codes by hand. The space becomes smaller, and so does the number of support tickets.",
    "Check the long URL when the link is created: allow only http and https, set a maximum length, and reject links to your own short domain so nobody can build a redirect loop.",
    "Keep the redirect path free of everything that is not needed: no login, no synchronous analytics, no database when the cache has the answer. Measure its p99 latency separately from the rest of the API."
  ]
});

EXTRA(18, "Worked design: a chat application", {
  deep: [
    "Group messages can be delivered in two ways. Fan-out on write: when a message is sent, the server writes a copy, or a pointer, into the inbox of every member. Reading is then one cheap query per user, but a message to a group of 10,000 causes 10,000 writes. Fan-out on read: the message is stored once in the conversation, and each member's device pulls new messages from the conversations it belongs to. Writing is cheap and reading costs more. Real systems mix the two: fan-out on write for small groups and one-to-one chats, fan-out on read for huge channels.",
    "Order cannot come from the clocks of phones, because they are wrong and users can change them. The server gives each message a sequence number that only grows inside its conversation. To do that without a global lock, all messages of one conversation are sent to the same partition or the same owner process, so there is one writer per conversation. The client remembers the last sequence number it has. After a reconnect it asks for 'everything after number N', which fills gaps. Because delivery is at-least-once, the client also drops any message ID that it already has.",
    "The connection layer has its own problems. One server can hold hundreds of thousands of idle WebSocket connections, because each one needs only a little memory, but when that server dies or is deployed, all its clients reconnect at the same moment. Without random backoff on the client, this reconnect storm overloads the other servers and can take them down one by one. Presence is another hidden cost: telling every contact about every online and offline change is a fan-out problem of its own, so systems send presence only for the chats that are open on the screen, or collect updates and send them in batches."
  ],
  iq: [
    { q: "How do you guarantee the order of messages in a conversation?", a: "Give each message a server-side sequence number per conversation and let clients sort by it. To produce the numbers safely, send all writes of one conversation through one place: one partition of a log, keyed by conversation ID, or one row counter updated in a transaction. Never sort by the phone's timestamp. Order across different conversations is not needed, and that is what lets the system scale." },
    { q: "The registry says Bala is on server 2, but server 2 has just crashed. What happens to the message?", a: "Nothing is lost, because the message was saved in the message store before any delivery was tried. The publish to server 2 goes nowhere, and no acknowledgement comes back from Bala's device. When Bala's app reconnects to another server, it sends its last sequence number and receives everything after it. The registry entry has an expiry time and is refreshed by heartbeats, so the stale entry soon disappears. The rule: push delivery is only an optimisation; the store plus sync on reconnect is the guarantee." },
    { q: "How do you deliver a message to a group with 100,000 members?", a: "Not by writing 100,000 inbox rows and doing 100,000 lookups for each message. Store the message once in the channel's timeline. Push it only to the members who are connected and have the channel open; they can be found through a subscription per chat server, not per user. Everyone else gets a cheap unread counter or a batched notification and pulls the messages when they open the channel. This is fan-out on read for the big case." },
    { q: "You must deploy a new version of the chat servers, and each one holds 200,000 open connections. How?", a: "Drain the servers gradually. Take one server out of the load balancer so it gets no new connections. Then tell its clients to reconnect, in small groups over a few minutes, and stop it when it is empty. Clients must reconnect with exponential backoff and random jitter, so that 200,000 sockets do not arrive at the other servers in one second. Since messages are stored and synced by sequence number, a reconnect loses nothing.", c: `
import random

def reconnect_delay(attempt: int) -> float:
    base = min(30, 2 ** attempt)             # 1, 2, 4, 8 ... at most 30 seconds
    return random.uniform(0, base)           # full jitter: spread the clients out
` }
  ],
  tips: [
    "Let the client create the message ID (a UUID) before sending. A retry after a lost acknowledgement then carries the same ID, and the server can drop the duplicate with a unique constraint.",
    "Do not keep one conversation in one database partition that grows forever. Add a time bucket, such as the month, to the partition key, so that a very active group stays a set of small partitions.",
    "Send a heartbeat (ping) more often than the idle timeouts of the load balancers and mobile networks on the path, which are often between 30 and 60 seconds, or quiet connections will be closed without notice.",
    "In an interview, draw the path of a single message with numbered steps and say at which step it becomes durable. Everything after that step can fail and be retried."
  ]
});

EXTRA(18, "Low-level design: from requirements to classes", {
  deep: [
    "Most low-level designs fail on concurrency, not on class names. The typical bug is 'check, then act': code checks that a spot is free and then takes it, and another thread does the same between the two steps. A lock around both steps fixes it inside one process. But production runs several processes on several servers, and a threading.Lock protects only one of them. Then the shared resource needs protection where it lives: a UNIQUE constraint, a conditional UPDATE, or a row lock in the database.",
    "Objects with a status field need explicit rules for moving between states. A ticket goes from ACTIVE to PAID to CLOSED and never backwards. If any method can set any status, bugs such as 'paid two times' or 'left without paying' are certain. Put the allowed transitions in one place, and raise an error for the others. When the behaviour itself changes with the state, the State pattern gives each state its own class. It looks like Strategy in a class diagram, but the purpose is different: a Strategy is chosen from outside and usually stays; a State is replaced by the object itself as it moves on.",
    "Inheritance is the strongest link between two classes: a change in the parent can silently break every child, and a child must be usable everywhere the parent is (the Liskov principle). Composition is looser: the object holds a helper behind a small interface, and the helper can be replaced or faked in a test. Passing the helpers in through the constructor (dependency injection) is what makes a design testable: in a test you give the ParkingLot a fake clock and a fake pricing rule. A common misconception is that more patterns mean a better design. A pattern is a cost you pay to make one kind of change easy."
  ],
  iq: [
    { q: "Your ParkingLot uses a threading.Lock. The service now runs on three servers. Is it still safe?", a: "No. Each server has its own lock in its own memory, so two servers can give out the same spot. The state must live in a shared database, and the claim must be one atomic operation there. A conditional UPDATE that takes a free spot and returns it does this; SKIP LOCKED lets parallel requests take different spots without waiting for each other.", c: `
UPDATE spots
SET vehicle_plate = 'TN01AB1234'
WHERE id = (
    SELECT id FROM spots
    WHERE vehicle_plate IS NULL AND fits = 'CAR'
    ORDER BY id
    LIMIT 1
    FOR UPDATE SKIP LOCKED
)
RETURNING id;

-- one row returned: that spot is yours.   no row: the lot is full
` },
    { q: "Strategy and State have the same class diagram. What is the difference?", a: "The purpose, and who changes the object. A Strategy is an algorithm that can be swapped, chosen by the caller or by configuration: hourly pricing or weekend pricing. The strategies do not know each other. A State stands for the current stage of an object's life, and the object, or the state itself, switches to the next one: a ticket moves from Active to Paid. If you say 'which rule do we use', it is Strategy. If you say 'what can happen next', it is State." },
    { q: "What is wrong with the Singleton pattern, and what do you use in its place?", a: "A singleton is a global variable with a nicer name. Any code can reach it, so dependencies are hidden. Tests share its state and affect each other. And 'only one' is often false later: two parking lots, two database connections. Create the object once at program start and pass it to the classes that need it (dependency injection). You still have one instance, but nothing depends on it being global." },
    { q: "How do you find the nearest free spot quickly, not by scanning the whole list?", a: "The loop in the simple design is O(n) for every car. Keep the free spots of each vehicle type in a min-heap ordered by distance from the entrance (here the spot number). Taking the nearest spot and returning a spot are both O(log n). This is a normal follow-up question: first make the design correct, then improve the one operation that is slow.", c: `
import heapq

free_spots = {VehicleType.CAR: [4, 1, 9], VehicleType.BIKE: [2, 7]}
for heap in free_spots.values():
    heapq.heapify(heap)

def take_spot(vehicle_type):
    heap = free_spots[vehicle_type]
    if not heap:
        raise RuntimeError("No spot available")
    return heapq.heappop(heap)               # the nearest free spot, O(log n)

def release_spot(vehicle_type, spot_id):
    heapq.heappush(free_spots[vehicle_type], spot_id)

print(take_spot(VehicleType.CAR))            # 1
` }
  ],
  tips: [
    "In an LLD interview, write the two or three main use cases as method calls first, for example lot.park(vehicle) returns a ticket. The classes you need become clear from the calls.",
    "Use Decimal or whole numbers of the smallest unit (paise, cents) for money in code, for the same reason you use NUMERIC in SQL. A float fee will be off by a paisa some day.",
    "Pass the current time in as a parameter or through a clock object, and do not call datetime.now() deep inside the logic. Tests for 'parked for 3 hours' then need no sleeping.",
    "State out loud what you leave out, such as payments, reservations and several entrances, and say where they would connect. A small complete design is better than a large unfinished one."
  ]
});
