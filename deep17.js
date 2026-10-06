EXTRA(17, "The relational model: tables, keys and relationships", {
  deep: [
    "PostgreSQL stores a table as a 'heap': a file made of 8 kB pages. Each page holds row versions, called tuples, in no special order. Every tuple has a physical address called a TID (page number, slot number), which you can see in the hidden column ctid. A primary key does not sort the table. It only creates a unique B-tree index whose entries point to TIDs in the heap.",
    "This is different from MySQL InnoDB and SQL Server, where the table itself is stored inside the primary key index (a clustered index). There, a lookup by primary key finds the full row directly, and every other index stores the primary key value, not a physical address. This is why a long or random primary key hurts those databases more. In PostgreSQL every index is a secondary index, and a lookup always needs two steps: the index, then the heap.",
    "A foreign key is enforced by hidden system triggers. When you insert an order, the database looks up the customer through the primary key index and takes a weak lock (FOR KEY SHARE) on that customer row, so it cannot be deleted before you commit. When you delete a customer, the database must search orders for rows that point to it. If orders.customer_id has no index, that search reads the whole table for every deleted customer. A common misconception is that a foreign key creates this index for you. In PostgreSQL it does not."
  ],
  iq: [
    { q: "What is the difference between a PRIMARY KEY and a UNIQUE constraint?", a: "A table can have only one primary key, and its columns can never be NULL. A table can have many UNIQUE constraints, and a UNIQUE column can hold many NULLs, because NULL is 'unknown' and two unknown values are not counted as equal. Both are enforced by a unique B-tree index. Since PostgreSQL 15 you can write UNIQUE NULLS NOT DISTINCT to allow only one NULL.", c: `
CREATE TABLE t (
    id    BIGINT PRIMARY KEY,
    email TEXT UNIQUE
);

INSERT INTO t VALUES (1, NULL), (2, NULL);   -- allowed: two NULL emails
INSERT INTO t VALUES (NULL, 'a@x.com');      -- ERROR: primary key cannot be NULL
` },
    { q: "Can a foreign key column be NULL? Can it point to a column that is not the primary key?", a: "Yes to both. A NULL foreign key means 'no parent', and the database skips the check for that row. A foreign key can reference any column (or set of columns) that has a PRIMARY KEY or UNIQUE constraint, because the database needs a unique index to find exactly one parent row.", c: `
CREATE TABLE referrals (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    new_customer   BIGINT NOT NULL REFERENCES customers(id),
    referrer_email TEXT REFERENCES customers(email)   -- nullable, points to a UNIQUE column
);
` },
    { q: "How do you enforce a one-to-one relationship in the database?", a: "Put a foreign key on the child table and make that same column UNIQUE or the primary key. The foreign key says 'the parent must exist'. The uniqueness says 'at most one child per parent'. Without the unique part it is only one-to-many.", c: `
CREATE TABLE customer_profiles (
    customer_id BIGINT PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
    bio         TEXT,
    birthday    DATE
);
` },
    { q: "Deleting one customer takes 20 seconds. The customers table is small. Why?", a: "The delete must check every table that has a foreign key to customers. If orders.customer_id has no index, the check is a full scan of orders for each deleted row. The fix is an index on the foreign key column. EXPLAIN ANALYZE on the DELETE shows the time under 'Trigger for constraint'.", c: `
EXPLAIN ANALYZE DELETE FROM customers WHERE id = 42;
-- Trigger for constraint orders_customer_id_fkey: time=19850.112 calls=1

CREATE INDEX CONCURRENTLY idx_orders_customer ON orders (customer_id);
` }
  ],
  tips: [
    "Use BIGINT for primary keys from day one. INTEGER stops at about 2.1 billion, and changing the type later rewrites the whole table and every foreign key that points to it.",
    "If you need UUID keys, prefer time-ordered ones (UUID version 7). Random version 4 values insert all over the index, which causes more page splits and more cache misses on big tables.",
    "Add an index on every foreign key column in the same migration that creates the foreign key. You will need it for joins and for deletes on the parent.",
    "Do not expose sequential IDs in public URLs if the count is a business secret. Anyone can read /orders/10500 today and /orders/10900 tomorrow and know you had 400 orders."
  ]
});

EXTRA(17, "Data types and constraints", {
  deep: [
    "Inside a tuple, PostgreSQL stores a small header (23 bytes), then a NULL bitmap, then the column values. A NULL value takes no space in the data area; it is only one bit in the bitmap. Fixed-size types must start at aligned positions, so a BIGINT after a BOOLEAN wastes 7 bytes of padding. On very large tables, putting the 8-byte columns first and the small ones last can save real disk space.",
    "TEXT and VARCHAR(n) are stored in exactly the same way; the n is only a length check. There is no speed benefit from VARCHAR(50). Large values use a system called TOAST: when a row grows past about 2 kB, long values are compressed and, if still too large, moved to a separate side table. The main row keeps only a small pointer. This is why SELECT * on a table with big JSONB columns is slow: every row needs extra reads from the TOAST table.",
    "TIMESTAMPTZ does not store a time zone. It stores one number: microseconds in UTC. On input the value is converted to UTC, and on output it is shown in the session's time zone. NUMERIC is stored as a variable-length list of decimal digits, so it is exact but slower than BIGINT. Adding a constraint to a live table is the risky part: a normal ADD CONSTRAINT scans the whole table while holding a strong lock. The safe way is to add it as NOT VALID and validate it in a second step."
  ],
  iq: [
    { q: "What is the difference between CHAR(n), VARCHAR(n) and TEXT in PostgreSQL?", a: "CHAR(n) pads the value with spaces up to n characters, which wastes space and gives surprising comparisons. VARCHAR(n) stores the real length and rejects longer values. TEXT has no limit. All three use the same storage format, so there is no performance reason to pick VARCHAR; use TEXT, and add a CHECK if you need a maximum length.", c: `
SELECT 'ab'::char(5) = 'ab   '::char(5);      -- true: trailing spaces are ignored
SELECT length('ab'::char(5));                 -- 2, the padding is not counted
SELECT octet_length('ab'::char(5));           -- 5, but it is stored
` },
    { q: "What is the difference between TIMESTAMP and TIMESTAMPTZ? Which one should you use?", a: "TIMESTAMP stores a wall-clock reading with no idea of where it was taken, so '10:00' could be any of 24 different moments. TIMESTAMPTZ stores one exact moment in UTC and converts on display. Use TIMESTAMPTZ for anything that happened (created_at, paid_at). Both types take 8 bytes.", c: `
SET timezone = 'Asia/Kolkata';
SELECT '2026-10-06 10:00:00+00'::timestamptz;    -- 2026-10-06 15:30:00+05:30
SET timezone = 'UTC';
SELECT '2026-10-06 10:00:00+00'::timestamptz;    -- 2026-10-06 10:00:00+00  (same moment)
` },
    { q: "What does SELECT NULL = NULL return, and why does it matter?", a: "It returns NULL, not true. NULL means 'unknown', and nobody can say if two unknown values are equal. WHERE keeps a row only when the condition is true, so a NULL result removes the row. Use IS NULL, or IS NOT DISTINCT FROM when you want NULLs to compare as equal.", c: `
SELECT NULL = NULL;                        -- NULL
SELECT NULL IS NOT DISTINCT FROM NULL;     -- true
SELECT 1 <> NULL;                          -- NULL, so this row is also filtered out

-- customers whose phone is not '9999999999', including those with no phone
SELECT id FROM customers WHERE phone IS DISTINCT FROM '9999999999';
` },
    { q: "How do you add a foreign key or CHECK constraint to a table with 500 million rows without blocking the application?", a: "Do it in two steps. ADD CONSTRAINT ... NOT VALID takes a short lock and only checks new rows from now on. VALIDATE CONSTRAINT then checks the old rows with a weaker lock that still allows reads and writes. For NOT NULL, first add and validate a CHECK (col IS NOT NULL) constraint; then SET NOT NULL can use it and skip the full scan (PostgreSQL 12 and later).", c: `
ALTER TABLE orders
    ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'paid', 'cancelled')) NOT VALID;

ALTER TABLE orders VALIDATE CONSTRAINT orders_status_check;
` }
  ],
  tips: [
    "For a fixed list of values, TEXT with a CHECK constraint is easier to live with than an ENUM type. You can add a value to an ENUM, but you cannot remove one.",
    "Keep columns that you filter, join or sort on as real columns. Use JSONB only for attributes that truly vary from row to row.",
    "ADD COLUMN with a constant DEFAULT is instant since PostgreSQL 11. A volatile default such as gen_random_uuid() still rewrites the whole table, so add the column first and fill it in batches.",
    "Integer division cuts off the decimals: SELECT 5 / 2 gives 2. Write 5 / 2.0 or cast one side to numeric when you compute rates and percentages."
  ]
});

EXTRA(17, "Reading and changing data: SELECT, INSERT, UPDATE, DELETE", {
  deep: [
    "PostgreSQL never changes a row in place. Every tuple has two hidden fields: xmin, the ID of the transaction that created it, and xmax, the ID of the transaction that deleted it. A DELETE only sets xmax. An UPDATE sets xmax on the old tuple and writes a complete new tuple. Old transactions can still see the old version, which is how readers and writers avoid blocking each other (MVCC).",
    "The old versions are called dead tuples. A background process, autovacuum, later marks their space as free so new rows can reuse it. If a table is updated faster than it is vacuumed, or a long transaction stops vacuum from cleaning, the table grows and gets slower. This is called bloat. One optimisation helps a lot: if an UPDATE changes no indexed column and the page has free space, the new version goes on the same page and no index needs to change. This is a HOT update.",
    "Changes are made durable by the write-ahead log (WAL). Before a data page is changed in memory, a record of the change is appended to the WAL. At COMMIT only the WAL is flushed to disk, which is one fast sequential write. The data pages are written later by a checkpoint. After a crash the database replays the WAL from the last checkpoint. A misconception is that COMMIT writes the table files; it does not."
  ],
  iq: [
    { q: "What is the difference between DELETE, TRUNCATE and DROP?", a: "DELETE removes rows one by one, can have a WHERE, fires row triggers and leaves dead tuples for VACUUM. TRUNCATE removes all rows at once by giving the table new empty files; it is very fast, takes a strong lock and does not fire row triggers. DROP removes the table itself with its indexes and constraints. In PostgreSQL all three can be rolled back inside a transaction, which is not true in MySQL or Oracle for TRUNCATE and DROP.", c: `
DELETE FROM jobs WHERE status = 'done';      -- some rows, slow on big tables
TRUNCATE TABLE jobs RESTART IDENTITY;        -- all rows, fast, ID counter back to 1
DROP TABLE jobs;                             -- the table is gone

BEGIN;
TRUNCATE TABLE jobs;
ROLLBACK;                                    -- PostgreSQL: the rows are back
` },
    { q: "How do you find duplicate rows?", a: "Group by the columns that should be unique and keep the groups that have more than one row. HAVING is needed because the filter is on the count of the group, not on single rows. The example uses an import table that has no UNIQUE constraint on email.", c: `
SELECT email, COUNT(*) AS copies
FROM customers_import
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY copies DESC;
` },
    { q: "How do you delete duplicates and keep one row of each?", a: "Decide which row to keep, usually the lowest id, and delete every row that has a 'smaller twin'. In PostgreSQL a self join with DELETE ... USING is the shortest form. The ROW_NUMBER form is easier to change, for example to keep the newest row. After cleaning, add a UNIQUE constraint so the problem cannot return.", c: `
-- keep the row with the smallest id for each email
DELETE FROM customers_import a
USING customers_import b
WHERE a.email = b.email
  AND a.id > b.id;

-- same result with a window function
DELETE FROM customers_import
WHERE id IN (
    SELECT id
    FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn
          FROM customers_import) t
    WHERE rn > 1
);
` },
    { q: "You must update 50 million rows in a live table. How do you do it safely?", a: "Not in one statement. One huge UPDATE holds row locks for a long time, creates 50 million dead tuples at once, produces a large amount of WAL and makes replicas fall behind. Update in small batches, commit each batch, and repeat until no rows are left. Each batch is short, so other queries and vacuum can keep working.", c: `
-- run again and again until it reports UPDATE 0
UPDATE orders
SET status = 'archived'
WHERE id IN (
    SELECT id FROM orders
    WHERE status = 'cancelled'
      AND created_at < now() - interval '1 year'
    ORDER BY id
    LIMIT 5000
    FOR UPDATE SKIP LOCKED
);
` }
  ],
  tips: [
    "In psql, type BEGIN before any manual UPDATE or DELETE on production. Look at the row count it prints, then COMMIT or ROLLBACK.",
    "Load many rows with COPY or one multi-row INSERT, not thousands of single INSERT statements. Each separate statement pays a network round trip and, in autocommit mode, a WAL flush.",
    "ON CONFLICT needs a unique index or constraint on the conflict columns. Without one the statement fails; it does not guess.",
    "Watch dead tuples with: SELECT relname, n_live_tup, n_dead_tup, last_autovacuum FROM pg_stat_user_tables ORDER BY n_dead_tup DESC. A table with more dead rows than live rows needs attention."
  ]
});

EXTRA(17, "Joins", {
  deep: [
    "The database has three ways to execute a join. A nested loop takes each row of the outer side and looks for matches in the inner side. With an index on the inner side this is very fast for a few outer rows, but it is terrible for millions of outer rows. A hash join reads the smaller table once and builds a hash table in memory on the join key, then reads the bigger table once and probes the hash table. It only works for equality conditions.",
    "A merge join needs both inputs sorted on the join key. It then walks both lists together like closing a zip. It is a good choice when an index already gives the sorted order, or when the result must be sorted anyway. The hash table of a hash join must fit in work_mem; if it does not, PostgreSQL splits the work into batches on disk, and the join gets much slower. In EXPLAIN ANALYZE this shows as 'Batches' greater than 1.",
    "For inner joins, the order in which you write the tables does not matter. The planner tries different join orders and picks the cheapest. With many tables the number of orders explodes, so above join_collapse_limit (default 8) the planner keeps more of your written order, and from 12 tables it uses a genetic search. Also, EXISTS and NOT EXISTS are executed as special joins (semi join and anti join) that stop at the first match, so they never multiply rows."
  ],
  iq: [
    { q: "Find employees who earn more than their manager.", a: "Join the employees table to itself. One copy plays the employee and the other plays the manager, linked by manager_id. An inner join is correct here, because an employee with no manager has nobody to compare with.", c: `
SELECT e.name, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON m.id = e.manager_id
WHERE e.salary > m.salary;
` },
    { q: "Table A has the values 1, 1, 1, NULL. Table B has 1, 1, NULL. How many rows do INNER JOIN and LEFT JOIN return on A.x = B.x?", a: "INNER JOIN returns 6: each of the three 1s in A matches both 1s in B. The NULLs match nothing, because NULL = NULL is not true. LEFT JOIN returns 7: the same 6 rows plus the NULL row from A with NULLs on the right side. This question checks that you know joins multiply duplicates and that NULL never equals NULL.", c: `
WITH a(x) AS (VALUES (1), (1), (1), (NULL)),
     b(x) AS (VALUES (1), (1), (NULL))
SELECT
    (SELECT COUNT(*) FROM a JOIN b ON a.x = b.x)      AS inner_rows,   -- 6
    (SELECT COUNT(*) FROM a LEFT JOIN b ON a.x = b.x) AS left_rows;    -- 7
` },
    { q: "What is the difference between UNION and UNION ALL?", a: "UNION ALL simply puts the two results one after the other. UNION also removes duplicate rows, which needs a sort or a hash of the whole result. So UNION is slower and can change your numbers if duplicates were real data. Use UNION ALL by default, and UNION only when you really want distinct rows.", c: `
-- every customer id once, even if it has both kinds of orders
SELECT customer_id FROM orders WHERE status = 'paid'
UNION
SELECT customer_id FROM orders WHERE status = 'cancelled';

-- all rows from both queries, duplicates kept, no extra sort
SELECT id, 'order' AS kind, created_at FROM orders
UNION ALL
SELECT order_id, 'payment', paid_at FROM payments WHERE paid_at IS NOT NULL;
` },
    { q: "You join orders to order_items and to payments, then SUM both. The totals are too high. Why, and how do you fix it?", a: "Both child tables are one-to-many from orders, so the join produces every item paired with every payment. An order with 3 items and 2 payments becomes 6 rows, and each amount is counted several times. Aggregate each child table to one row per order first, then join the results.", c: `
SELECT o.id, i.items_total, p.paid_total
FROM orders o
LEFT JOIN (SELECT order_id, SUM(quantity * unit_price) AS items_total
           FROM order_items GROUP BY order_id) i ON i.order_id = o.id
LEFT JOIN (SELECT order_id, SUM(amount) AS paid_total
           FROM payments GROUP BY order_id) p ON p.order_id = o.id;
` }
  ],
  tips: [
    "After writing a join, compare COUNT(*) before and after it. If the count went up and you did not expect it, the join key is not unique on the other side.",
    "A slow hash join with 'Batches: 8' or more in EXPLAIN ANALYZE is spilling to disk. Raise work_mem for that session only (SET work_mem = '128MB'), not for the whole server.",
    "Make the join columns the same type. Joining a BIGINT column to a TEXT column forces a cast and usually stops the index from being used.",
    "For 'does a related row exist' use EXISTS, not JOIN plus DISTINCT. The join creates duplicates and then pays for a sort or hash to remove them."
  ]
});

EXTRA(17, "Aggregation: GROUP BY and HAVING", {
  deep: [
    "PostgreSQL can group in two ways. HashAggregate keeps one entry per group in a hash table in memory and updates it as rows arrive; the input does not need to be sorted. GroupAggregate needs the input sorted by the group columns and finishes a group each time the key changes; it uses little memory and can use an index for the order. If the hash table grows past work_mem, HashAggregate spills to disk (since PostgreSQL 13) and slows down.",
    "COUNT(*) on a big table is slow in PostgreSQL, and this surprises people who come from MySQL MyISAM. Because of MVCC, each transaction may see a different set of rows, so there is no single stored row count. The database must check which rows are visible to you. When an estimate is enough, read reltuples from pg_class, which costs nothing.",
    "Two NULL details cause wrong reports. SUM over zero rows returns NULL, not 0, while COUNT returns 0; wrap sums in COALESCE. AVG ignores NULLs, so the average of (10, NULL, 20) is 15, not 10. Also, when you group by a table's primary key, PostgreSQL lets you select the other columns of that table without listing them, because the key decides them."
  ],
  iq: [
    { q: "What is the difference between WHERE and HAVING? Can you use HAVING without GROUP BY?", a: "WHERE filters rows before grouping and cannot contain aggregates. HAVING filters groups after aggregation. A condition on a plain column belongs in WHERE: it removes rows early, so less data is grouped, and it can use an index. HAVING without GROUP BY is allowed; the whole table is then one group.", c: `
SELECT customer_id, COUNT(*) AS orders
FROM orders
WHERE status = 'paid'            -- row filter: runs first, can use an index
GROUP BY customer_id
HAVING COUNT(*) > 5;             -- group filter: runs after counting

-- one group for the whole table: returns a row only if there are over 1000 orders
SELECT COUNT(*) FROM orders HAVING COUNT(*) > 1000;
` },
    { q: "What is the difference between COUNT(*), COUNT(1), COUNT(col) and COUNT(DISTINCT col)?", a: "COUNT(*) and COUNT(1) both count rows and have the same speed. COUNT(col) counts only rows where col is not NULL. COUNT(DISTINCT col) counts different non-NULL values. The classic trap is a LEFT JOIN: COUNT(*) gives 1 for a customer with no orders, because the NULL row is still a row. COUNT(o.id) correctly gives 0.", c: `
SELECT COUNT(*)              AS all_rows,
       COUNT(phone)          AS rows_with_phone,
       COUNT(DISTINCT phone) AS different_phones
FROM customers;

SELECT c.id, COUNT(*) AS wrong, COUNT(o.id) AS correct
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id;
` },
    { q: "Find the second highest price (the classic 'second highest salary' question).", a: "The safe answer is 'the highest value that is lower than the highest value'. It handles ties, and it returns NULL when there is no second value. The DISTINCT with OFFSET form is shorter, but it returns no row at all when there is no second value. Say this difference in the interview.", c: `
SELECT MAX(price) AS second_highest
FROM products
WHERE price < (SELECT MAX(price) FROM products);

-- alternative
SELECT DISTINCT price
FROM products
ORDER BY price DESC
LIMIT 1 OFFSET 1;
` },
    { q: "Find customers who bought BOTH product 1 and product 2.", a: "WHERE product_id = 1 AND product_id = 2 never matches, because one row has only one product. Filter the rows to the two products, group by customer, and keep customers who have two different products in their group. DISTINCT is needed because a customer may buy the same product in several orders.", c: `
SELECT o.customer_id
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE oi.product_id IN (1, 2)
GROUP BY o.customer_id
HAVING COUNT(DISTINCT oi.product_id) = 2;
` }
  ],
  tips: [
    "For a fast row count on a dashboard use: SELECT reltuples::bigint FROM pg_class WHERE relname = 'orders'. It is an estimate that is refreshed by VACUUM and ANALYZE.",
    "Wrap SUM in COALESCE(SUM(x), 0) when the result goes to application code. A NULL total often breaks the arithmetic or the JSON on the other side.",
    "Reports grouped by day depend on the session time zone. Write date_trunc('day', created_at AT TIME ZONE 'Asia/Kolkata') so every tool gets the same days.",
    "A dashboard that groups the same big table every minute should read a summary table or a materialised view that is refreshed on a schedule, not the raw table."
  ]
});

EXTRA(17, "Subqueries and CTEs", {
  deep: [
    "The planner does not run a subquery the way you wrote it. When it can, it 'pulls up' the subquery and turns it into a join, so it can choose the join order and method freely. IN and EXISTS become a semi join, which stops at the first match for each outer row. NOT EXISTS becomes an anti join. So IN and EXISTS usually get the same plan in PostgreSQL, and the old advice that one is always faster is a myth.",
    "NOT IN is the exception. Because of its NULL rules, the planner cannot turn it into an anti join. It runs the subquery as a 'hashed SubPlan' if the result fits in work_mem, or checks it again for every outer row if it does not, which can take hours. That is a second reason to write NOT EXISTS, besides the wrong-result trap.",
    "Before PostgreSQL 12 every CTE was an 'optimisation fence': it was computed fully and stored, and outer filters were not pushed into it. Now a CTE is merged into the main query when it is not recursive, has no side effects and is used only once. A CTE that is used twice is still computed once and stored. You can force either choice with the keywords MATERIALIZED and NOT MATERIALIZED. A recursive CTE is really a loop: it runs the first part, then runs the second part again and again on the rows from the previous round, until a round returns nothing."
  ],
  iq: [
    { q: "This query should list employees who are not managers, but it returns zero rows. Why?", a: "The subquery returns manager_id values, and the top boss has manager_id NULL. 'x NOT IN (1, 2, NULL)' means 'x <> 1 AND x <> 2 AND x <> NULL'. The last part is unknown, so the whole condition is never true and every row is removed. NOT EXISTS compares row by row and does not have this problem.", c: `
-- returns nothing if any manager_id is NULL
SELECT name FROM employees
WHERE id NOT IN (SELECT manager_id FROM employees);

-- correct
SELECT e.name FROM employees e
WHERE NOT EXISTS (SELECT 1 FROM employees x WHERE x.manager_id = e.id);
` },
    { q: "Your recursive CTE never finishes. What happened and how do you stop it?", a: "The data has a cycle, for example A reports to B and B reports to A, so each round finds 'new' rows forever. Keep the path of visited ids in an array and refuse to visit an id twice. Using UNION instead of UNION ALL also stops simple cycles, because duplicate rows are dropped, but not when you carry a level counter. PostgreSQL 14 added a CYCLE clause that does the path tracking for you.", c: `
WITH RECURSIVE team AS (
    SELECT id, manager_id, ARRAY[id] AS path
    FROM employees
    WHERE id = 7
    UNION ALL
    SELECT e.id, e.manager_id, t.path || e.id
    FROM employees e
    JOIN team t ON e.manager_id = t.id
    WHERE e.id <> ALL (t.path)            -- do not visit the same person twice
)
SELECT id, path FROM team;
` },
    { q: "Get the 3 most recent orders for each customer without a window function.", a: "Use a LATERAL join. A LATERAL subquery can use columns of the tables before it, so it runs once per customer like a for-each loop. With an index on orders (customer_id, created_at DESC) each loop reads only 3 index entries. When there are many orders per customer this is much faster than ranking all orders with ROW_NUMBER.", c: `
SELECT c.name, o.id, o.created_at
FROM customers c
CROSS JOIN LATERAL (
    SELECT id, created_at
    FROM orders
    WHERE customer_id = c.id
    ORDER BY created_at DESC
    LIMIT 3
) o;
-- use LEFT JOIN LATERAL (...) o ON true to keep customers with no orders
` },
    { q: "Move old rows from one table to an archive table in a single statement.", a: "PostgreSQL lets a CTE contain DELETE, INSERT or UPDATE with RETURNING. The DELETE returns the removed rows and the outer INSERT writes them. It is one statement, so it is atomic: a row cannot be lost or copied twice, even without an explicit transaction.", c: `
WITH moved AS (
    DELETE FROM jobs
    WHERE status = 'done'
      AND created_at < now() - interval '90 days'
    RETURNING *
)
INSERT INTO jobs_archive
SELECT * FROM moved;
` }
  ],
  tips: [
    "Build a long query one CTE at a time. Run SELECT * FROM that_cte LIMIT 20 after each step and check the row count before you add the next one.",
    "If a query became slower after an upgrade to PostgreSQL 12 or later, try WITH x AS MATERIALIZED (...). Some old queries depended on the CTE being computed once.",
    "A scalar subquery in the SELECT list runs once for every output row. For a list of 10,000 rows, replace it with a join to a grouped subquery or with LEFT JOIN LATERAL.",
    "Add a safety limit to recursive CTEs on user data, for example WHERE level < 50. One bad row with a cycle should not be able to take the database down."
  ]
});

EXTRA(17, "Window functions", {
  deep: [
    "A window function is executed by a WindowAgg step. It needs its input sorted by the PARTITION BY columns and then the ORDER BY columns, so the plan usually has a Sort below it. If your query uses three different OVER clauses, it may need three sorts. Functions that share exactly the same window share one sort, and an index on (partition columns, order columns) can remove the sort completely.",
    "The most important hidden rule is the default frame. When OVER has an ORDER BY and no frame, the frame is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW. RANGE works on values, not positions, so 'current row' includes every row with the same ORDER BY value (its peers). A running total then jumps for all tied rows at once, and LAST_VALUE returns the current row, not the last row of the partition. ROWS counts physical rows and behaves the way most people expect.",
    "In the logical order of a query, window functions run after WHERE, GROUP BY and HAVING, and before DISTINCT, ORDER BY and LIMIT. So a window function can use an aggregate as its input, for example SUM(SUM(amount)) OVER (...). And it can never appear in WHERE. PostgreSQL has no QUALIFY clause as Snowflake and BigQuery do, so you always need a subquery or CTE to filter on a window result."
  ],
  iq: [
    { q: "What is the difference between ROW_NUMBER, RANK and DENSE_RANK?", a: "They differ only for ties. ROW_NUMBER always gives 1, 2, 3, 4 and breaks ties in a random way unless you add a tie-breaker column. RANK gives tied rows the same number and then skips numbers. DENSE_RANK gives tied rows the same number and does not skip. Use ROW_NUMBER for 'exactly N rows', and DENSE_RANK for 'the Nth highest value'.", c: `
SELECT name, price,
       ROW_NUMBER() OVER (ORDER BY price DESC) AS row_num,
       RANK()       OVER (ORDER BY price DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY price DESC) AS dense
FROM products;

-- price   row_num   rnk   dense
-- 900     1         1     1
-- 350     2         2     2
-- 350     3         2     2
-- 20      4         4     3
` },
    { q: "Find the second most expensive product in each category (the 'Nth highest per group' question).", a: "Rank inside each group and filter on the rank in an outer query. Use DENSE_RANK so that two products tied for first place do not hide the second price. With ROW_NUMBER you would get one of the tied top products as 'second', which is wrong.", c: `
WITH ranked AS (
    SELECT category, name, price,
           DENSE_RANK() OVER (PARTITION BY category ORDER BY price DESC) AS dr
    FROM products
)
SELECT category, name, price
FROM ranked
WHERE dr = 2;
` },
    { q: "Your running total shows the same value on several rows. Why?", a: "The ORDER BY column has ties, and the default frame is RANGE, which includes all rows with the same value. Every payment of one day then shows the total at the end of that day. Use a ROWS frame and add a unique column to the ORDER BY so the order is fully decided.", c: `
-- all rows of the same day show the same total
SELECT id, paid_at, amount,
       SUM(amount) OVER (ORDER BY paid_at::date) AS running
FROM payments;

-- true row-by-row running total
SELECT id, paid_at, amount,
       SUM(amount) OVER (ORDER BY paid_at, id
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running
FROM payments;
` },
    { q: "LAST_VALUE returns the current row's value, not the last one. Why?", a: "The default frame ends at the current row, so the 'last' row in the frame is the current row itself. FIRST_VALUE works by luck, because the frame starts at the first row. Give LAST_VALUE a frame that reaches the end of the partition, or use FIRST_VALUE with the opposite sort order.", c: `
SELECT customer_id, id, created_at,
       LAST_VALUE(id) OVER (PARTITION BY customer_id ORDER BY created_at) AS wrong,
       LAST_VALUE(id) OVER (PARTITION BY customer_id ORDER BY created_at
                            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS latest_order
FROM orders;
` }
  ],
  tips: [
    "Always add a unique tie-breaker to ROW_NUMBER, for example ORDER BY created_at DESC, id DESC. Without it, two runs of the same report can pick different rows.",
    "For 'latest row per group' PostgreSQL has a shorter form: SELECT DISTINCT ON (customer_id) * FROM orders ORDER BY customer_id, created_at DESC.",
    "When several functions use the same window, name it once: SELECT ... OVER w ... FROM t WINDOW w AS (PARTITION BY customer_id ORDER BY created_at). It is easier to read and guarantees one shared sort.",
    "LAG and LEAD return NULL at the edge of a partition. Give a default as the third argument, LAG(revenue, 1, 0), when the next step does arithmetic on the result."
  ]
});

EXTRA(17, "Indexes", {
  deep: [
    "A B-tree index is made of 8 kB pages on three kinds of levels. The root and the inner pages hold separator keys and pointers to child pages. The leaf pages hold the indexed values in sorted order, each with the TID (heap address) of its row, and every leaf is linked to its neighbours. A lookup walks from the root down to one leaf, which is 3 or 4 page reads even for hundreds of millions of rows. A range scan finds the first leaf and then follows the links sideways.",
    "After the index, the database must visit the heap page of each matching row, and those pages are in random places. For many rows this random reading costs more than reading the whole table in order. That is why the planner ignores an index when a condition matches a large share of the table, often more than about 5 to 10 percent. A bitmap scan is the middle way: it collects all matching TIDs first, sorts them by page, and then reads each heap page once in physical order.",
    "An index-only scan answers from the index and skips the heap. But an index entry does not say if its row is visible to your transaction; that information lives in the heap tuple. PostgreSQL solves this with the visibility map, which has one bit per heap page meaning 'every row on this page is visible to everyone'. If the bit is set, the heap visit is skipped. VACUUM sets these bits, so on a table with many recent changes an index-only scan still makes many heap fetches."
  ],
  iq: [
    { q: "There is an index on the column, but the query does not use it. Give the possible reasons.", a: "The main reasons are: a function or cast on the column; a type mismatch that makes the database cast the column; a LIKE pattern that starts with a wildcard; a condition that matches too many rows, so a sequential scan is cheaper; the column is not the first column of a composite index; or statistics are old. Check with EXPLAIN, and fix the query or the index, not the planner.", c: `
-- function on the column: needs an index on lower(email)
SELECT * FROM customers WHERE lower(email) = 'anu@example.com';

-- type mismatch: 42.0 is numeric, so customer_id is cast and the index is skipped
SELECT * FROM orders WHERE customer_id = 42.0;

-- leading wildcard: a B-tree cannot help
SELECT * FROM products WHERE name LIKE '%pen';

-- not selective: if 90 percent of orders are paid, a Seq Scan is faster
SELECT * FROM orders WHERE status = 'paid';
` },
    { q: "What is the difference between a clustered and a non-clustered index?", a: "A clustered index IS the table: the rows are stored inside the index in key order, so there can be only one. SQL Server and MySQL InnoDB work this way with the primary key. A non-clustered index is a separate structure that points to the rows. PostgreSQL has only non-clustered indexes over an unordered heap. Its CLUSTER command sorts the table once, but new rows do not keep that order.", c: `
-- PostgreSQL: one-time physical sort of the table by an index
-- takes an ACCESS EXCLUSIVE lock, so reads and writes wait
CLUSTER orders USING idx_orders_customer_date;
ANALYZE orders;
` },
    { q: "For WHERE status = 'paid' AND created_at >= '2026-10-01', which is better: an index on (status, created_at) or on (created_at, status)?", a: "(status, created_at). With the equality column first, all matching entries sit together in one continuous part of the index: go to 'paid', jump to the date, read forward. With created_at first, the scan must read every entry from that date on, for all statuses, and throw away the ones that are not 'paid'. Rule: equality columns first, then one range column.", c: `
CREATE INDEX idx_orders_status_date ON orders (status, created_at);

EXPLAIN SELECT id FROM orders
WHERE status = 'paid' AND created_at >= '2026-10-01';
-- Index Cond: ((status = 'paid') AND (created_at >= '2026-10-01'))
` },
    { q: "EXPLAIN shows an Index Only Scan, but it is still slow and shows many 'Heap Fetches'. Why?", a: "The visibility map bits are not set for the pages of those rows, so the database must visit the heap to check that each row is visible. This happens on tables with many recent inserts or updates that have not been vacuumed yet. Run VACUUM, and tune autovacuum to run more often on that table.", c: `
EXPLAIN (ANALYZE) SELECT customer_id, status FROM orders WHERE customer_id = 42;
-- Index Only Scan using idx_orders_cover on orders
--   Heap Fetches: 57          <- the heap was still read 57 times

VACUUM orders;                 -- sets the visibility map bits
-- run the EXPLAIN again:  Heap Fetches: 0
` }
  ],
  tips: [
    "If CREATE INDEX CONCURRENTLY fails or is cancelled, it leaves an INVALID index that still slows down writes. Find it with SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid, drop it and build it again.",
    "Before adding an index, check for one that already covers the need. An index on (customer_id, created_at) makes a separate index on (customer_id) unnecessary.",
    "Find tables that are scanned in full too often with: SELECT relname, seq_scan, seq_tup_read, idx_scan FROM pg_stat_user_tables ORDER BY seq_tup_read DESC LIMIT 10.",
    "Indexes bloat too. REINDEX INDEX CONCURRENTLY (PostgreSQL 12 and later) rebuilds one without blocking writes."
  ]
});

EXTRA(17, "Query plans and optimisation", {
  deep: [
    "The planner cannot look at your data while it plans, so it uses statistics. ANALYZE reads a random sample of the table (30,000 rows with default settings) and saves, for each column: the share of NULLs, the number of distinct values, a list of the most common values with their frequencies, and a histogram of the rest. You can read all of this in the pg_stats view. From these numbers the planner estimates how many rows each condition will return, and that estimate decides everything else.",
    "Costs in a plan are not milliseconds. They are abstract units where reading one page in sequence costs 1.0 (seq_page_cost) and reading one random page costs 4.0 (random_page_cost), plus small CPU costs per row. The planner assumes that conditions on different columns are independent and multiplies their selectivities. For related columns such as city and pincode this gives an estimate that is far too low, and the planner then picks a nested loop that runs thousands of times.",
    "Prepared statements add one more surprise. For the first five executions PostgreSQL makes a custom plan for the real parameter values. After that it may switch to a generic plan that ignores the values, if the generic plan looks no more expensive. For skewed data, where one customer has a million orders and most have ten, this generic plan can be very bad for some values. The setting plan_cache_mode controls this behaviour."
  ],
  iq: [
    { q: "In EXPLAIN, what does 'cost=0.43..8.45 rows=1 width=64' mean?", a: "The first number is the startup cost: the estimated cost before the first row can be returned. The second is the total cost to return all rows. Both are in planner units, not milliseconds. rows is the estimated number of rows and width is the average row size in bytes. Startup cost matters with LIMIT: a plan that starts fast can win even if its total cost is higher.", c: `
EXPLAIN SELECT * FROM orders WHERE id = 1042;
-- Index Scan using orders_pkey on orders  (cost=0.43..8.45 rows=1 width=64)
--   Index Cond: (id = 1042)

-- with ANALYZE, 'actual time' is per loop: multiply by loops for the real total
-- Index Scan ... (actual time=0.012..0.015 rows=3 loops=2000)   <- about 30 ms in total
` },
    { q: "A query was fast yesterday and is slow today. Nothing was deployed. What do you check?", a: "First compare the plan with EXPLAIN (ANALYZE, BUFFERS): did it change, and are estimated and actual rows far apart? Common causes are old statistics after a big data load, table bloat from dead tuples, a parameter value with very different selectivity, or a lock wait that only looks like slowness. The statistics views tell you when the table was last analysed and how many dead rows it has.", c: `
SELECT relname, n_live_tup, n_dead_tup, last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
WHERE relname = 'orders';

ANALYZE orders;      -- cheap and safe: refresh the statistics, then test again
` },
    { q: "The plan estimates rows=1 but the actual value is 50,000, and a nested loop runs very slowly. The statistics are fresh. What is wrong?", a: "Probably two filtered columns are related, and the planner multiplied their selectivities as if they were independent. Extended statistics tell the planner about the relation. After CREATE STATISTICS and ANALYZE, the row estimate becomes realistic and the planner picks a hash join instead. The example uses an addresses table with city and pincode columns.", c: `
-- WHERE city = 'Chennai' AND pincode = '600001'
-- the planner assumes: 1 percent x 0.1 percent = almost no rows

CREATE STATISTICS addresses_city_pincode (dependencies)
    ON city, pincode FROM addresses;
ANALYZE addresses;
` },
    { q: "Why is OFFSET 100000 slow, and how do you paginate correctly when the sort column is not unique?", a: "OFFSET does not jump. The database produces the first 100,000 rows and throws them away, so each page is slower than the one before. Keyset pagination remembers the last row of the previous page and continues after it using an index. If the sort column has ties, add the id as a second sort column and compare both together with a row comparison, or you will skip or repeat rows.", c: `
CREATE INDEX idx_orders_created_id ON orders (created_at DESC, id DESC);

-- next page after the row (created_at = '2026-10-01 10:00:00+00', id = 105000)
SELECT id, created_at, status
FROM orders
WHERE (created_at, id) < ('2026-10-01 10:00:00+00', 105000)
ORDER BY created_at DESC, id DESC
LIMIT 20;
` }
  ],
  tips: [
    "Always ask for EXPLAIN (ANALYZE, BUFFERS). The 'Buffers: shared hit=... read=...' line shows how many pages were touched, and that number does not change with server load the way timings do.",
    "Set log_min_duration_statement to something like 500ms in production so that slow queries are written to the log with their parameter values.",
    "On SSD storage set random_page_cost to about 1.1. The default of 4.0 was chosen for spinning disks and makes the planner avoid index scans too often.",
    "Use SET enable_seqscan = off only in your own session to test whether an index could be used at all. Never set it for the whole server."
  ]
});

EXTRA(17, "Normalisation and schema design", {
  deep: [
    "Normal forms are built on one idea: the functional dependency. 'A decides B' means that for one value of A there is always the same value of B. product_id decides product_name. pincode decides city. A table is well normalised when every such dependency starts from a key of that table. If a non-key column decides another column, the same fact is stored on many rows, and one day the copies will disagree.",
    "Denormalised data must be kept correct by something, and there are only three choices. The application updates both places in one transaction, which is simple but easy to forget in a second code path. A trigger does it, which never forgets but is invisible. Or the value is rebuilt from time to time, for example with a materialised view, which is safe but not fresh. There is also a hidden cost: a counter such as customers.order_count is updated by every new order of that customer, so busy customers get row lock waits and many dead tuples.",
    "A common misconception is that normalised schemas are slow because of joins. A join on an indexed key costs microseconds per row, and smaller rows mean that more of them fit in memory. The slow cases are specific: heavy aggregation over millions of rows on every page load, or reporting queries on the transactional database. Solve those with a summary table or a separate reporting database, and leave the core schema normalised."
  ],
  iq: [
    { q: "A table order_items(order_id, product_id, product_name, quantity, customer_city) has the primary key (order_id, product_id). Which normal forms does it break?", a: "product_name depends only on product_id, which is part of the key, so the table breaks 2NF. customer_city depends only on order_id, again part of the key, and really on the customer, which is another dependency through a non-key column. The fix is to keep product_name in products and the city with the customer or the delivery address. If you need the name as it was at purchase time, keep a copy, but be clear that it is a historical fact and not a duplicate.", c: `
-- wrong: facts about the product and the customer stored on every line
-- order_items(order_id, product_id, product_name, quantity, customer_city)

-- normalised
-- products(id, name, price)
-- customers(id, name, city)
-- orders(id, customer_id)
-- order_items(order_id, product_id, quantity, unit_price)
` },
    { q: "How do you rename a column with zero downtime?", a: "Never with a single ALTER TABLE ... RENAME, because during a rolling deploy the old code and the new code run at the same time and one of them will fail. Use expand and contract: add the new column, write to both, copy the old rows in batches, move the reads, and drop the old column in a later release. Each step works with both the previous and the next version of the code.", c: `
-- 1. expand: metadata-only change, very fast
ALTER TABLE customers ADD COLUMN full_name TEXT;

-- 2. deploy code that writes name AND full_name; copy old rows in batches
UPDATE customers SET full_name = name
WHERE id BETWEEN 1 AND 10000 AND full_name IS NULL;

-- 3. deploy code that reads full_name (it still writes both columns)
-- 4. deploy code that no longer uses name
ALTER TABLE customers ALTER COLUMN name DROP NOT NULL;

-- 5. contract: one release later
ALTER TABLE customers DROP COLUMN name;
` },
    { q: "Products in different categories have different attributes (size for shirts, RAM for laptops). How do you model this?", a: "There are three options. One wide table with many nullable columns works for a few attributes. An entity-attribute-value table (product_id, attribute, value) is fully flexible, but every query needs many self joins and nothing is typed. In PostgreSQL the usual answer is normal columns for the common fields plus one JSONB column for the variable ones, with a GIN index so you can still filter on it.", c: `
ALTER TABLE products ADD COLUMN attrs JSONB NOT NULL DEFAULT '{}';
CREATE INDEX idx_products_attrs ON products USING GIN (attrs);

UPDATE products SET attrs = '{"color": "red", "size": "M"}' WHERE id = 3;

SELECT name FROM products WHERE attrs @> '{"color": "red"}';   -- uses the GIN index
` },
    { q: "You store total_amount on the orders row for speed. How do you make sure it stays correct?", a: "Write the order lines and the total in the same transaction, and keep that logic in one function that every code path uses. Then do not trust it: run a scheduled query that recomputes the totals and reports rows that differ. A denormalised value without a check will go wrong some day, and you want to find it before finance does.", c: `
SELECT o.id, o.total_amount, t.total AS computed
FROM orders o
JOIN (SELECT order_id, SUM(quantity * unit_price) AS total
      FROM order_items
      GROUP BY order_id) t ON t.order_id = o.id
WHERE o.total_amount IS DISTINCT FROM t.total;
` }
  ],
  tips: [
    "Put created_at and updated_at on every table from the first migration. You will need them for debugging, for incremental exports and for answering 'when did this change'.",
    "Every migration must work with the code version before it and the version after it. If it cannot, split it into two releases.",
    "Soft delete with a deleted_at column needs two more things: a partial unique index (CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL) and the same filter in every query. A view that hides deleted rows prevents mistakes.",
    "In an interview, draw the tables with their primary keys and foreign keys first, and say which side of each relationship is 'many'. Only then talk about indexes."
  ]
});

EXTRA(17, "Transactions, ACID and isolation levels", {
  deep: [
    "MVCC works with snapshots. A snapshot is a short list that says which transactions were already committed at one moment. A tuple is visible to you if its xmin transaction is committed in your snapshot and its xmax is empty or not committed in your snapshot. In Read Committed, every statement takes a new snapshot. In Repeatable Read, the first statement takes a snapshot and the whole transaction keeps it. That single difference explains all the behaviour of the two levels.",
    "In Read Committed, when your UPDATE reaches a row that another transaction has changed but not committed, it waits. After the other commit, PostgreSQL reads the newest version of the row, checks your WHERE clause again and applies your change to that version. In Repeatable Read the same situation ends with the error 'could not serialize access due to concurrent update'. Serializable adds tracking of what each transaction read (predicate locks, which block nobody) and aborts a transaction when the pattern of reads and writes could not happen in any serial order.",
    "Durability comes from the write-ahead log: COMMIT returns only after the commit record is flushed to disk. With synchronous_commit = off the flush happens a few moments later, so a crash can lose the last few commits, but the data never becomes corrupt. Long transactions have a cost that is easy to miss: VACUUM cannot remove any row version that the oldest open snapshot might still need. One session left open for hours makes tables bloat across the whole database."
  ],
  iq: [
    { q: "What is a phantom read? Which isolation level prevents it?", a: "A phantom read is when the same query, run twice in one transaction, returns a different SET of rows, because another transaction inserted or deleted rows that match the condition. A non-repeatable read is about one existing row changing its value; a phantom is about rows appearing or disappearing. The SQL standard only promises no phantoms at Serializable, but PostgreSQL's Repeatable Read already prevents them because it uses one snapshot.", c: `
-- session A (READ COMMITTED)                              session B
BEGIN;
SELECT COUNT(*) FROM orders WHERE customer_id = 42;        -- 3
                                                           -- INSERT INTO orders (customer_id) VALUES (42);
                                                           -- COMMIT;
SELECT COUNT(*) FROM orders WHERE customer_id = 42;        -- 4   <- a phantom row
COMMIT;
` },
    { q: "Two sessions run UPDATE accounts SET balance = balance - 500 WHERE id = 1 at the same moment in Read Committed. Is one update lost?", a: "No. The first session locks the row. The second waits, and after the first commits it reads the new committed balance and subtracts from that value. The lost update only happens when the application reads the balance, computes the new value in its own code and writes a fixed number back. Keep the arithmetic inside the UPDATE and you are safe.", c: `
-- balance starts at 2000
-- session A                                   session B
-- BEGIN;                                      BEGIN;
-- UPDATE ... balance = balance - 500;         UPDATE ... balance = balance - 500;   (waits for A)
-- COMMIT;   -> 1500                           (wakes up, reads 1500 again)
--                                             COMMIT;   -> 1000   correct

-- the unsafe pattern: the new value was computed in the application
UPDATE accounts SET balance = 1500 WHERE id = 1;
` },
    { q: "What is write skew? Give an example that Repeatable Read does not prevent.", a: "Write skew is when two transactions read the same data, each makes a decision that is fine alone, and they write to DIFFERENT rows, so no row conflict is seen. Together they break a rule. Example: at least one doctor must be on call. Two doctors each check 'there are 2 on call, so I can leave' and both leave. Serializable detects this and aborts one transaction. The other fix is to lock the rows you read with FOR UPDATE.", c: `
-- both sessions run this at the same time, one for id = 1 and one for id = 2
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT COUNT(*) FROM doctors WHERE on_call;          -- both see 2
UPDATE doctors SET on_call = false WHERE id = 1;     -- the other session updates id = 2
COMMIT;                                              -- both succeed: nobody is on call

-- fix: BEGIN ISOLATION LEVEL SERIALIZABLE;  one session gets a serialization failure and retries
` },
    { q: "Optimistic or pessimistic locking: when do you use each?", a: "Pessimistic locking (SELECT ... FOR UPDATE) locks the row first, so others wait. Use it when conflicts are common and the work is short, such as stock or seat booking. Optimistic locking takes no lock: it adds a version column and the UPDATE succeeds only if the version is unchanged. Use it when conflicts are rare or when a person edits a form for minutes, because you must never hold a database lock while a user thinks." }
  ],
  tips: [
    "Set idle_in_transaction_session_timeout (for example '60s') so that a forgotten open transaction is ended and cannot block VACUUM and schema changes.",
    "Put a retry loop around transactions that can fail with SQLSTATE 40001 (serialization failure) or 40P01 (deadlock). Retry the whole transaction from BEGIN, not only the last statement.",
    "Do not call a payment API or send an email inside a transaction. Commit first, or write an outbox row in the same transaction and let a worker do the external call.",
    "Find old transactions with: SELECT pid, now() - xact_start AS age, state, left(query, 50) FROM pg_stat_activity WHERE xact_start IS NOT NULL ORDER BY xact_start."
  ]
});

EXTRA(17, "Locks and deadlocks", {
  deep: [
    "PostgreSQL has eight table lock modes, and what matters is which ones conflict. SELECT takes the weakest mode, ACCESS SHARE. INSERT, UPDATE and DELETE take ROW EXCLUSIVE. These do not conflict with each other, so normal work never blocks on the table level. Most ALTER TABLE forms, DROP, TRUNCATE and VACUUM FULL take ACCESS EXCLUSIVE, which conflicts with everything, including SELECT. A plain CREATE INDEX takes SHARE, which blocks writes but not reads. CREATE INDEX CONCURRENTLY takes a weaker mode that blocks neither.",
    "Lock requests wait in a queue in arrival order. This creates the classic outage: a long report holds ACCESS SHARE on orders; an ALTER TABLE asks for ACCESS EXCLUSIVE and waits; every new SELECT now queues behind the waiting ALTER. The ALTER itself would take a millisecond, but the site is down until the report ends. This is why lock_timeout matters.",
    "Row locks are not kept in a memory table. They are written into the row itself, in the xmax field. So locking a million rows needs no extra memory, and PostgreSQL never turns many row locks into a table lock (lock escalation), as SQL Server can do. There are four row lock strengths. A normal UPDATE that does not change a key column takes FOR NO KEY UPDATE, and a foreign key check takes FOR KEY SHARE. These two do not conflict, so inserting an order does not wait for an update of the customer's name."
  ],
  iq: [
    { q: "A simple ALTER TABLE ... ADD COLUMN took the whole site down for two minutes. Explain what happened and how to avoid it.", a: "The ALTER needed an ACCESS EXCLUSIVE lock and had to wait for a long-running query or an idle open transaction on that table. While it waited, all new queries on the table queued behind it. Set a short lock_timeout so the ALTER gives up quickly, and retry it in a loop. Check for long transactions before you start.", c: `
-- look for old transactions first
SELECT pid, now() - xact_start AS age, state, left(query, 50) AS query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY xact_start
LIMIT 5;

SET lock_timeout = '2s';
ALTER TABLE orders ADD COLUMN note TEXT;     -- fails fast if it cannot get the lock; try again
` },
    { q: "How does the database detect a deadlock, and which transaction does it cancel?", a: "PostgreSQL does not check on every lock wait, because the check costs time. When a session has waited for deadlock_timeout (1 second by default), it builds the graph of who waits for whom and looks for a cycle. If there is one, the session that ran the check is aborted with error 40P01, which is not always the youngest or the smallest transaction. The other transactions continue, and your application should retry the aborted one." },
    { q: "Two bulk UPDATE statements on the same rows deadlock, although each is a single statement. How?", a: "One UPDATE locks its rows one at a time, in the order in which its plan finds them. If two statements find the same rows in a different order, each can hold a row that the other needs. Lock the rows in a fixed order first with SELECT ... ORDER BY id FOR UPDATE, then update them.", c: `
-- session A: UPDATE products SET price = price * 1.1 WHERE id IN (1, 2, 3);
-- session B: UPDATE products SET price = price * 0.9 WHERE category = 'pens';
-- the two plans may reach rows 1, 2, 3 in different orders

BEGIN;
SELECT id FROM products WHERE id IN (1, 2, 3) ORDER BY id FOR UPDATE;
UPDATE products SET price = price * 1.1 WHERE id IN (1, 2, 3);
COMMIT;
` },
    { q: "A nightly job runs on three application servers. How do you make sure only one of them runs it?", a: "Use an advisory lock. It is a lock on a number that you choose, not on any table or row, and the database gives it to only one session at a time. pg_try_advisory_lock returns true or false at once and does not wait. A session-level advisory lock is released automatically when the connection closes, so a crashed job cannot leave the lock behind.", c: `
SELECT pg_try_advisory_lock(1001);     -- true: run the job.  false: another server has it, exit
-- ... do the nightly work ...
SELECT pg_advisory_unlock(1001);

-- with a transaction-mode connection pooler, use the transaction-level form
BEGIN;
SELECT pg_try_advisory_xact_lock(1001);
-- ... work ...
COMMIT;                                -- the lock is released here
` }
  ],
  tips: [
    "Put SET lock_timeout = '3s' at the top of every migration file, and make the migration tool retry. A failed migration is much cheaper than a blocked site.",
    "Turn on log_lock_waits. PostgreSQL then logs every lock wait longer than deadlock_timeout, with the blocking process, so you can find lock problems after they happened.",
    "Split dangerous migrations into steps: create indexes with CONCURRENTLY, add constraints as NOT VALID and validate later, and fill new columns in batches.",
    "To free a blocked system, first try SELECT pg_cancel_backend(pid), which cancels only the running query. Use pg_terminate_backend(pid) when the session is idle in a transaction and holds locks."
  ]
});

EXTRA(17, "Views, stored procedures and triggers", {
  deep: [
    "A view is stored as a rewrite rule, not as data or as a plan. When you query a view, PostgreSQL replaces the view name with its definition and plans the combined query as one. So a filter on a simple view is pushed down into the base tables and can use their indexes. The limit is views with GROUP BY, DISTINCT or window functions: a filter on a column that is not a grouping or partition column cannot be pushed inside, and the whole view is computed first.",
    "A view checks permissions as its owner, not as the person who queries it. This is what lets you give analysts a view without giving them the tables. Since PostgreSQL 15 the option security_invoker = true makes the view use the caller's permissions instead. A simple view on one table, with no aggregates, is automatically updatable: INSERT, UPDATE and DELETE on the view are passed to the table.",
    "A plain REFRESH MATERIALIZED VIEW takes an ACCESS EXCLUSIVE lock, so nobody can read the view while it is rebuilt. The CONCURRENTLY option builds the new result on the side and applies only the differences, which allows reads but needs a unique index and takes longer. For functions, the volatility label matters: an IMMUTABLE function always returns the same output for the same input, and only such functions can be used in an index. A PL/pgSQL function is a black box for the planner, while a simple SQL function can be merged into the calling query."
  ],
  iq: [
    { q: "Write a trigger that records every change of a product's price.", a: "Use an AFTER UPDATE row trigger, so it runs only when the update really succeeded. Limit it with UPDATE OF price and a WHEN condition, so the function is not called for updates that do not change the price. The audit insert runs in the same transaction as the update: if the update is rolled back, the audit row disappears too.", c: `
CREATE TABLE price_audit (
    product_id BIGINT NOT NULL,
    old_price  NUMERIC(10,2),
    new_price  NUMERIC(10,2),
    changed_by TEXT NOT NULL DEFAULT current_user,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE FUNCTION log_price_change() RETURNS trigger AS $$
BEGIN
    INSERT INTO price_audit (product_id, old_price, new_price)
    VALUES (OLD.id, OLD.price, NEW.price);
    RETURN NULL;              -- the return value of an AFTER row trigger is ignored
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_price_audit
AFTER UPDATE OF price ON products
FOR EACH ROW
WHEN (OLD.price IS DISTINCT FROM NEW.price)
EXECUTE FUNCTION log_price_change();
` },
    { q: "What is the difference between a function and a procedure in PostgreSQL?", a: "A function returns a value, is used inside a query, and always runs inside the transaction of the query that calls it. It cannot COMMIT. A procedure (PostgreSQL 11 and later) is started with CALL, returns no value, and can COMMIT or ROLLBACK inside its body. That makes procedures the right tool for long maintenance jobs that should commit in batches.", c: `
CREATE PROCEDURE purge_old_jobs() AS $$
DECLARE
    n BIGINT;
BEGIN
    LOOP
        DELETE FROM jobs
        WHERE id IN (SELECT id FROM jobs
                     WHERE status = 'done'
                       AND created_at < now() - interval '90 days'
                     LIMIT 5000);
        GET DIAGNOSTICS n = ROW_COUNT;
        EXIT WHEN n = 0;
        COMMIT;               -- allowed in a procedure, not in a function
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CALL purge_old_jobs();
` },
    { q: "Can you INSERT or UPDATE through a view? What does WITH CHECK OPTION do?", a: "Yes, when the view is simple: one table, no GROUP BY, no DISTINCT, no aggregates. The change is passed to the base table. Without WITH CHECK OPTION you can write a row that the view itself cannot show, so the row seems to vanish. WITH CHECK OPTION rejects any change that would make the row leave the view.", c: `
CREATE VIEW pending_orders AS
SELECT id, customer_id, status, created_at
FROM orders
WHERE status = 'pending'
WITH CHECK OPTION;

UPDATE pending_orders SET status = 'paid' WHERE id = 1042;
-- ERROR: new row violates check option for view pending_orders
` },
    { q: "When do you choose a materialised view, and what are its limits?", a: "Choose it when a query is expensive, is read often, and may be a few minutes old, such as dashboard totals. Its limits: it is never fresher than the last refresh; PostgreSQL always recomputes the whole query, not only the changed rows; and a plain refresh blocks readers. If the data must be exact at every moment, use a summary table that is updated in the same transaction as the source." }
  ],
  tips: [
    "Use CREATE OR REPLACE VIEW in migrations. Dropping a view also needs dropping every view that depends on it, and their grants are lost.",
    "Do not write SELECT * inside a view definition. The column list is fixed when the view is created, so a column added later to the table will not appear, and people will be confused.",
    "In a migration that changes many rows, think about what the triggers on that table will do. An audit trigger can turn a 2-minute backfill into an hour and fill the audit table with noise.",
    "Schedule materialised view refreshes outside peak hours and record the refresh time in a small table. Show that time on the dashboard so users know how old the numbers are."
  ]
});

EXTRA(17, "Scaling a database: replication, partitioning and sharding", {
  deep: [
    "PostgreSQL streaming replication sends the write-ahead log to the replica. The replica is always in recovery mode: it replays the same physical page changes that the primary made, so it is an exact byte copy and cannot have different tables or indexes. Logical replication is different. It decodes the WAL into row changes (insert this row, update that row) and applies them with SQL-like operations. So it can copy only some tables, and it works between different major versions, which makes it the main tool for upgrades with almost no downtime.",
    "How safe a commit is depends on synchronous_commit. With the default asynchronous replica, the primary confirms the commit after its own disk flush, and a crash of the primary can lose the last transactions that the replica had not received. With a synchronous replica the commit waits until the replica has written the WAL (or, with remote_apply, has replayed it). Failover is the hard part. If two nodes both think they are the primary, both accept writes and the data splits; this is called split brain. Tools such as Patroni avoid it by keeping a leader lock in a consensus store like etcd.",
    "Partitioning has rules that surprise people. A primary key or unique index on a partitioned table must contain the partition key, because each partition has its own index and nothing checks uniqueness across partitions. A query without the partition key in WHERE must look in every partition. And thousands of partitions make planning slower. Sharding has the same problems at a larger size: a query without the shard key goes to every shard, and a unique rule across shards must be enforced by your own code."
  ],
  iq: [
    { q: "A user saves their profile, the page reloads from a replica and shows the old data. Give several fixes.", a: "The simple fix: for a few seconds after a write, send that user's reads to the primary. The exact fix: after the write, remember the primary's WAL position, and read from a replica only if it has replayed up to that position. The strong fix: make the commit wait for the replica with synchronous_commit = remote_apply, which slows down every write. Most systems choose the first one.", c: `
-- on the primary, right after the write: remember this value in the user's session
SELECT pg_current_wal_lsn();                      -- for example 0/3000148

-- on the replica, before the read
SELECT pg_last_wal_replay_lsn() >= '0/3000148'::pg_lsn AS caught_up;
-- false: read from the primary this time
` },
    { q: "How do you choose a shard key? What goes wrong with a bad one?", a: "A good shard key has many different values, spreads the load evenly, and is present in almost every query, so that one request touches one shard. For a shop this is usually customer_id: all orders of one customer live together. A bad key such as country or created_at puts most of the traffic on one shard (a hot shard). A key that the queries do not include forces every query to ask all shards." },
    { q: "With several shards, each with its own sequence, how do you generate IDs that are unique everywhere?", a: "There are three common ways. Give each shard a sequence with a different start and the same step, which is simple but hard to change when you add shards. Generate time-ordered UUIDs (version 7) in the application, which needs no coordination. Or use Snowflake-style 64-bit IDs made of a timestamp, a machine number and a counter, which stay roughly sorted by time and fit in a BIGINT.", c: `
-- four shards, no overlap: each shard takes every fourth number
-- on shard 1
CREATE SEQUENCE order_id_seq START 1 INCREMENT 4;     -- 1, 5, 9, ...
-- on shard 2
CREATE SEQUENCE order_id_seq START 2 INCREMENT 4;     -- 2, 6, 10, ...
` },
    { q: "Why can you not add PRIMARY KEY (id) to a table partitioned by created_at?", a: "A unique index exists only inside each partition. PostgreSQL has no index that covers all partitions, so it cannot check that an id in the October partition is not also in November. If the key includes the partition column, two equal keys must fall into the same partition, and the local index can enforce the rule. The cost is that id alone is no longer guaranteed unique by the database.", c: `
ALTER TABLE events ADD PRIMARY KEY (id);
-- ERROR: unique constraint on partitioned table must include all partitioning columns

ALTER TABLE events ADD PRIMARY KEY (id, created_at);     -- works
` }
  ],
  tips: [
    "Create partitions for future months ahead of time with a scheduled job or the pg_partman extension, and add a DEFAULT partition. Without a matching partition an INSERT fails.",
    "Watch replication slots: SELECT slot_name, active, restart_lsn FROM pg_replication_slots. A slot whose consumer has stopped makes the primary keep WAL files until the disk is full.",
    "PgBouncer in transaction mode gives each transaction any free server connection. Session features such as SET, session-level advisory locks and LISTEN then do not work as expected, so check your application before switching.",
    "In an interview, say the cheap steps before sharding: fix queries and indexes, a bigger machine, a cache, read replicas, partitioning, and moving old data to an archive."
  ]
});
