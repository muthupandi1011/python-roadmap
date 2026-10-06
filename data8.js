ROADMAP.push({
n: 17, track: "DevOps, data and design",
title: "SQL in Depth",
blurb: "From tables and joins to window functions, indexes, query plans, transactions, locking and scaling. Examples use PostgreSQL syntax.",
topics: [
X("The relational model: tables, keys and relationships",
["A relational database stores data in tables. A table is like a spreadsheet with strict rules: every column has a name and a data type, and every row is one record of the same kind of thing: one customer, one order, one product. SQL (Structured Query Language) is the language used to define those tables and to ask questions of them.",
 "Rows are identified by keys. A primary key is a column (or set of columns) whose value is unique for every row and never empty; it is the row's identity. Usually it is an automatically generated number or a UUID. A foreign key is a column in one table that holds the primary key of a row in another table. That is how tables are linked: each row in 'orders' carries a customer_id that points to one row in 'customers'. The database enforces the link, refusing an order for a customer that does not exist. This guarantee is called referential integrity.",
 "Relationships come in three shapes. One-to-many is the most common: one customer has many orders, implemented with a foreign key on the 'many' side. Many-to-many, such as students and courses, needs a third 'junction' table holding pairs of foreign keys. One-to-one splits one thing across two tables, usually to keep rarely used or sensitive columns apart."],
["Table = entity type. Row = one record. Column = one attribute with a fixed data type.",
 "Primary key: unique, not null, identifies the row. Foreign key: points to a primary key in another table.",
 "One-to-many: foreign key on the 'many' table. Many-to-many: a junction table.",
 "A surrogate key is a generated ID; a natural key is real-world data such as an email. Prefer surrogate keys, with a UNIQUE constraint on the natural one.",
 "SQL is declarative: you say what result you want, and the database decides how to get it.",
 "SQL keywords are not case-sensitive; writing them in capitals is only a convention."],
"An online shop keeps customers, products, orders and order_items in four tables. One customer has many orders; an order and its products are many-to-many, so order_items is the junction table, holding the quantity and the price at the time of purchase.",
`
CREATE TABLE customers (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email      TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
    id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       TEXT NOT NULL,
    category   TEXT,
    price      NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    stock      INT NOT NULL DEFAULT 0,
    version    INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),   -- one-to-many
    status      TEXT NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (                                   -- many-to-many
    order_id   BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity   INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    PRIMARY KEY (order_id, product_id)
);
`,
"Edgar F. Codd of IBM proposed the relational model in his 1970 paper 'A Relational Model of Data for Large Shared Data Banks'. Donald Chamberlin and Raymond Boyce designed SQL (first called SEQUEL) at IBM in 1974. Oracle shipped the first commercial SQL database in 1979, and SQL became an ANSI standard in 1986.",
[["PostgreSQL: Data Definition", "https://www.postgresql.org/docs/current/ddl.html"],
 ["PostgreSQL: Constraints", "https://www.postgresql.org/docs/current/ddl-constraints.html"],
 ["PostgreSQL tutorial", "https://www.postgresql.org/docs/current/tutorial.html"]]),

X("Data types and constraints",
["Choosing the right data type for each column is the first line of defence for data quality, and it affects storage and speed. A column declared as a date cannot hold 'next Tuesday'; a column declared as an integer cannot hold 'abc'. Mistakes are rejected when the data arrives, instead of being discovered months later in a broken report.",
 "The main families are: whole numbers (INTEGER, BIGINT); exact decimals (NUMERIC or DECIMAL), which you must use for money; approximate decimals (REAL, DOUBLE PRECISION), which are for scientific values and must not be used for money because of rounding; text (TEXT, VARCHAR(n)); BOOLEAN; dates and times (DATE, TIMESTAMP, and TIMESTAMPTZ which records an exact moment regardless of time zone); UUID; and JSON (JSONB in PostgreSQL) for flexible, semi-structured data.",
 "Constraints are rules the database enforces on every insert and update, no matter which application or person makes the change. NOT NULL requires a value. UNIQUE forbids duplicates. PRIMARY KEY is both. FOREIGN KEY requires the referenced row to exist. CHECK enforces any condition you write, such as price >= 0. DEFAULT supplies a value when none is given. Rules kept in the database cannot be bypassed by a buggy script, which is why they belong there and not only in application code."],
["Money: NUMERIC(12,2), never FLOAT.",
 "Timestamps: store in UTC with TIMESTAMPTZ; convert to local time when displaying.",
 "NULL means 'unknown or absent'. It is not zero and not an empty string.",
 "NOT NULL by default; allow NULL only when 'unknown' is a real possibility.",
 "ON DELETE CASCADE / RESTRICT / SET NULL decide what happens to child rows when the parent is deleted.",
 "ALTER TABLE changes an existing table: add a column, add a constraint, change a type."],
"A payments table stored amounts as FLOAT. Adding 0.1 and 0.2 gave 0.30000000000000004, and after millions of transactions the daily totals were off by a few rupees, which finance could not reconcile. Changing the column to NUMERIC(12,2) fixed it.",
`
CREATE TABLE payments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id   BIGINT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    amount     NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency   CHAR(3) NOT NULL DEFAULT 'INR',
    method     TEXT NOT NULL CHECK (method IN ('upi', 'card', 'wallet')),
    paid_at    TIMESTAMPTZ,                       -- NULL until paid
    metadata   JSONB NOT NULL DEFAULT '{}',
    UNIQUE (order_id, method)
);

-- change a table later
ALTER TABLE customers ADD COLUMN phone TEXT;
ALTER TABLE customers ADD CONSTRAINT phone_format CHECK (phone ~ '^[0-9]{10}$');
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'new';

-- the float trap
SELECT 0.1::float8 + 0.2::float8;       -- 0.30000000000000004
SELECT 0.1::numeric + 0.2::numeric;     -- 0.3

-- JSON columns can still be queried
SELECT id FROM payments WHERE metadata ->> 'gateway' = 'razorpay';
`,
"Codd's original model already required integrity rules. CHECK and FOREIGN KEY constraints were formalised in the SQL-89 and SQL-92 standards. JSON columns are recent: PostgreSQL added JSON in 2012 and the faster binary JSONB in 2014; the SQL standard followed in 2016.",
[["PostgreSQL: Data Types", "https://www.postgresql.org/docs/current/datatype.html"],
 ["PostgreSQL: Constraints", "https://www.postgresql.org/docs/current/ddl-constraints.html"],
 ["PostgreSQL: JSON Types", "https://www.postgresql.org/docs/current/datatype-json.html"]]),

X("Reading and changing data: SELECT, INSERT, UPDATE, DELETE",
["Four statements handle all everyday work, often summarised as CRUD: INSERT creates rows, SELECT reads them, UPDATE changes them and DELETE removes them. SELECT is by far the one you will write most.",
 "A SELECT has clauses in a fixed written order: SELECT (which columns), FROM (which table), WHERE (which rows), GROUP BY, HAVING, ORDER BY (sorting) and LIMIT (how many). The database processes them in a different logical order: FROM first, then WHERE, then GROUP BY, HAVING, SELECT, ORDER BY and finally LIMIT. Knowing this explains otherwise puzzling rules, such as why you cannot use a column alias from SELECT inside WHERE: at the time WHERE runs, SELECT has not happened yet.",
 "WHERE conditions use =, <>, <, >, BETWEEN, IN (a list), LIKE (pattern matching with % as wildcard), combined with AND, OR and NOT. NULL needs special care. Because NULL means 'unknown', comparing anything with it gives unknown, not true or false, so 'WHERE phone = NULL' never matches. You must write IS NULL or IS NOT NULL. And the most dangerous mistake in SQL is an UPDATE or DELETE without a WHERE clause: it affects every row in the table."],
["Written order: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT.",
 "Logical order: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT.",
 "Avoid SELECT * in application code; name the columns you need.",
 "Test for missing values with IS NULL, never = NULL. COALESCE(x, 0) replaces NULL with a default.",
 "Before UPDATE or DELETE, run the same WHERE as a SELECT to see which rows it hits.",
 "Without ORDER BY, the order of rows is not guaranteed.",
 "RETURNING (PostgreSQL) gives back the rows an INSERT, UPDATE or DELETE affected."],
"An intern is asked to mark one order as cancelled and runs: UPDATE orders SET status = 'cancelled'; with no WHERE. Every order in the company is now cancelled. Running it inside a transaction, or checking the WHERE with a SELECT first, would have prevented a restore from backup.",
`
-- create
INSERT INTO customers (email, name) VALUES ('anu@example.com', 'Anu') RETURNING id;
INSERT INTO products (name, price) VALUES ('Pen', 20), ('Bag', 900), ('Book', 350);

-- read
SELECT id, name, price
FROM products
WHERE price BETWEEN 100 AND 1000
  AND name ILIKE 'b%'                 -- case-insensitive, starts with b
ORDER BY price DESC
LIMIT 10 OFFSET 0;

SELECT * FROM orders WHERE status IN ('pending', 'paid') AND created_at >= now() - interval '7 days';

-- NULL handling
SELECT name, COALESCE(phone, 'no phone') FROM customers WHERE phone IS NULL;

-- update: check first, then change
SELECT id FROM orders WHERE id = 1042;
UPDATE orders SET status = 'cancelled' WHERE id = 1042 RETURNING id, status;

-- delete
DELETE FROM orders WHERE status = 'cancelled' AND created_at < now() - interval '1 year';

-- insert or update in one statement (upsert)
INSERT INTO customers (email, name) VALUES ('anu@example.com', 'Anu K')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;
`,
"The SELECT-FROM-WHERE form comes from SEQUEL (1974), designed to read like English so that non-programmers could query data. Three-valued logic with NULL was Codd's idea and remains one of SQL's most debated features.",
[["PostgreSQL: Queries", "https://www.postgresql.org/docs/current/queries.html"],
 ["PostgreSQL: Data Manipulation", "https://www.postgresql.org/docs/current/dml.html"],
 ["PostgreSQL: SELECT reference", "https://www.postgresql.org/docs/current/sql-select.html"]]),

X("Joins",
["Because data is split across tables, most useful questions need rows from more than one. A join combines rows from two tables according to a condition, almost always 'the foreign key in this table equals the primary key in that one'.",
 "The type of join decides what happens to rows that have no match. INNER JOIN returns only rows that match in both tables: customers who have orders. LEFT JOIN returns every row from the left table, with NULLs in the right-hand columns where there is no match: all customers, including those with no orders. RIGHT JOIN is the mirror image and FULL OUTER JOIN keeps unmatched rows from both sides. CROSS JOIN pairs every row with every row and is rarely what you want. A self join joins a table to itself, for example employees to their managers.",
 "Two mistakes are very common. First, with a LEFT JOIN, a filter on the right table placed in WHERE discards the NULL rows and silently turns it into an inner join; put that filter in the ON clause instead. Second, joining a parent to two different child tables at once multiplies rows (an order with 3 items and 2 payments yields 6 rows), which inflates any SUM or COUNT."],
["INNER JOIN: only matching rows.",
 "LEFT JOIN: all left rows, NULLs where the right has no match.",
 "FULL OUTER JOIN: everything from both sides.",
 "Find rows with no match: LEFT JOIN ... WHERE right.id IS NULL (or NOT EXISTS).",
 "Use short table aliases (c, o) and qualify every column.",
 "Index foreign key columns; joins depend on them.",
 "Watch for row multiplication when joining several one-to-many tables."],
"Marketing wants a list of customers who signed up but never ordered, to send them a discount. A LEFT JOIN from customers to orders, keeping the rows where the order side is NULL, gives exactly that list.",
`
-- customers and their orders (only customers who have ordered)
SELECT c.name, o.id AS order_id, o.status
FROM customers c
INNER JOIN orders o ON o.customer_id = c.id;

-- every customer with a count of orders, including zero
SELECT c.name, COUNT(o.id) AS order_count
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name;

-- customers who have never ordered
SELECT c.id, c.email
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;

-- three tables: what did each order contain?
SELECT o.id, p.name, oi.quantity, oi.quantity * oi.unit_price AS line_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p     ON p.id = oi.product_id
WHERE o.id = 1042;

-- filter on the right table: put it in ON to keep it a LEFT JOIN
SELECT c.name, o.id
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid';

-- self join: employees and their managers
-- SELECT e.name, m.name AS manager FROM employees e LEFT JOIN employees m ON m.id = e.manager_id;
`,
"Join is one of the operations of Codd's relational algebra (1970). The explicit JOIN ... ON syntax was added in the SQL-92 standard; before that, tables were listed with commas and joined in the WHERE clause, which made accidental cross joins easy.",
[["PostgreSQL tutorial: Joins Between Tables", "https://www.postgresql.org/docs/current/tutorial-join.html"],
 ["PostgreSQL: Table Expressions (joined tables)", "https://www.postgresql.org/docs/current/queries-table-expressions.html"]]),

X("Aggregation: GROUP BY and HAVING",
["Aggregate functions take many rows and return a single value: COUNT (how many), SUM (total), AVG (average), MIN and MAX. Used alone they summarise the whole table. With GROUP BY they summarise per group: total sales per month, number of orders per customer, average price per category.",
 "GROUP BY collapses all rows that share the same values in the listed columns into one output row. This leads to the central rule: every column in the SELECT list must either be in the GROUP BY or be inside an aggregate function. Otherwise the database would not know which of the many rows' values to show.",
 "There are two places to filter, and they act at different moments. WHERE filters individual rows before grouping. HAVING filters groups after aggregation. 'Orders from 2026' is a WHERE condition; 'customers with more than 5 orders' is a HAVING condition. Finally, be precise with COUNT: COUNT(*) counts rows, COUNT(column) counts rows where that column is not NULL, and COUNT(DISTINCT column) counts different values."],
["COUNT(*), COUNT(col), COUNT(DISTINCT col), SUM, AVG, MIN, MAX.",
 "Every selected column must be grouped or aggregated.",
 "WHERE filters rows before grouping; HAVING filters groups after.",
 "Aggregates skip NULLs: AVG ignores rows where the value is NULL.",
 "FILTER (WHERE ...) or SUM(CASE WHEN ... THEN 1 ELSE 0 END) counts several conditions in one pass.",
 "date_trunc('month', ts) groups timestamps by month."],
"A sales manager asks: 'for each month this year, how many orders, how much revenue, and what was the average order value? And which customers spent more than 50,000?' Each is one GROUP BY query.",
`
-- overall totals
SELECT COUNT(*) AS orders, COUNT(DISTINCT customer_id) AS customers FROM orders;

-- revenue per month
SELECT date_trunc('month', o.created_at) AS month,
       COUNT(DISTINCT o.id)               AS orders,
       SUM(oi.quantity * oi.unit_price)   AS revenue,
       ROUND(SUM(oi.quantity * oi.unit_price) / COUNT(DISTINCT o.id), 2) AS avg_order_value
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.created_at >= DATE '2026-01-01'           -- row filter
GROUP BY 1
ORDER BY 1;

-- customers who spent more than 50,000
SELECT c.id, c.name, SUM(oi.quantity * oi.unit_price) AS spent
FROM customers c
JOIN orders o       ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY c.id, c.name
HAVING SUM(oi.quantity * oi.unit_price) > 50000   -- group filter
ORDER BY spent DESC;

-- several counts in one pass
SELECT COUNT(*)                                   AS total,
       COUNT(*) FILTER (WHERE status = 'paid')      AS paid,
       COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
FROM orders;
`,
"GROUP BY and the five basic aggregates were in the original SEQUEL design (1974). GROUPING SETS, ROLLUP and CUBE for subtotals were added in SQL:1999, and the FILTER clause in SQL:2003.",
[["PostgreSQL tutorial: Aggregate Functions", "https://www.postgresql.org/docs/current/tutorial-agg.html"],
 ["PostgreSQL: Aggregate Functions reference", "https://www.postgresql.org/docs/current/functions-aggregate.html"],
 ["PostgreSQL: GROUP BY and HAVING", "https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-GROUP"]]),

X("Subqueries and CTEs",
["A subquery is a query nested inside another. It lets you use the result of one question as input to the next. A scalar subquery returns a single value and can be used wherever a value is allowed, such as comparing each price with the overall average. A subquery after IN or EXISTS returns a set to test against. A subquery in the FROM clause acts as a temporary table. A correlated subquery refers to the outer query's current row and is logically evaluated once per outer row.",
 "A Common Table Expression (CTE) is a named subquery written at the top of the statement with the WITH keyword. It does the same job as a subquery in FROM but reads from top to bottom like a series of steps: first compute this, then, using it, compute that. For any non-trivial query, CTEs make the logic far easier to read, test and change.",
 "A recursive CTE refers to itself. It has a starting part and a part that repeats, joining back to the rows found so far, until no new rows appear. It is the standard way to query hierarchies stored in a table: an organisation chart, a category tree, a bill of materials, a chain of replies."],
["Scalar subquery: returns one value. IN / EXISTS subquery: returns a set to test.",
 "EXISTS stops at the first match and handles NULLs safely; NOT IN gives no rows at all if the list contains a NULL, so prefer NOT EXISTS.",
 "WITH name AS (SELECT ...) defines a CTE; you can define several, each using the earlier ones.",
 "WITH RECURSIVE walks trees and graphs.",
 "CTEs are for readability; since PostgreSQL 12 they are optimised like subqueries.",
 "A join is often faster than a correlated subquery, but check the query plan rather than assume."],
"A company stores employees with a manager_id column. The HR system needs 'everyone who reports to the head of engineering, at any level'. A recursive CTE starts from that person and repeatedly adds their direct reports until the whole tree is collected.",
`
-- scalar subquery: products priced above the average
SELECT name, price FROM products WHERE price > (SELECT AVG(price) FROM products);

-- EXISTS: customers with at least one paid order
SELECT c.name FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = 'paid');

-- CTEs: step by step
WITH order_totals AS (
    SELECT o.id, o.customer_id, SUM(oi.quantity * oi.unit_price) AS total
    FROM orders o JOIN order_items oi ON oi.order_id = o.id
    GROUP BY o.id, o.customer_id
),
customer_spend AS (
    SELECT customer_id, SUM(total) AS spent, COUNT(*) AS orders
    FROM order_totals
    GROUP BY customer_id
)
SELECT c.name, s.spent, s.orders
FROM customer_spend s JOIN customers c ON c.id = s.customer_id
WHERE s.spent > 10000
ORDER BY s.spent DESC;

-- recursive CTE: a whole reporting tree
WITH RECURSIVE team AS (
    SELECT id, name, manager_id, 1 AS level FROM employees WHERE id = 7      -- start
    UNION ALL
    SELECT e.id, e.name, e.manager_id, t.level + 1
    FROM employees e JOIN team t ON e.manager_id = t.id                      -- repeat
)
SELECT * FROM team ORDER BY level, name;
`,
"Nested subqueries are the 'structured' part of Structured Query Language and date from 1974. CTEs and recursive queries were added in the SQL:1999 standard; PostgreSQL has supported them since 8.4 (2009) and MySQL since 8.0 (2018).",
[["PostgreSQL: WITH Queries (CTEs)", "https://www.postgresql.org/docs/current/queries-with.html"],
 ["PostgreSQL: Subquery Expressions", "https://www.postgresql.org/docs/current/functions-subquery.html"]]),

X("Window functions",
["A window function performs a calculation across a set of rows related to the current row, without collapsing them. That is the key difference from GROUP BY: grouping gives you one row per group, while a window function keeps every row and adds a computed column beside it. This makes many reporting questions that were once very hard into one-liners.",
 "The OVER clause defines the 'window' of rows. PARTITION BY divides the rows into groups (like GROUP BY, but rows are kept). ORDER BY, inside OVER, puts the rows of each partition in order, which matters for rankings and running totals. Optionally a frame, such as ROWS BETWEEN 6 PRECEDING AND CURRENT ROW, narrows the window to a sliding range around the current row.",
 "There are three families of window functions. Ranking: ROW_NUMBER (1, 2, 3, 4), RANK (1, 2, 2, 4, gaps after ties) and DENSE_RANK (1, 2, 2, 3, no gaps). Offset: LAG and LEAD read a value from the previous or next row, perfect for 'change since last month'. Aggregates: SUM, AVG, COUNT and others used with OVER give running totals and moving averages."],
["function() OVER (PARTITION BY ... ORDER BY ...)",
 "ROW_NUMBER, RANK, DENSE_RANK, NTILE(n) for ranking.",
 "LAG(col) and LEAD(col) for the previous and next row's value.",
 "SUM(col) OVER (ORDER BY date) is a running total.",
 "'Top N per group': number the rows with ROW_NUMBER in a CTE, then filter WHERE rn <= N.",
 "Window functions run after WHERE and GROUP BY, so you cannot filter on them directly; wrap the query in a CTE.",
 "'Latest row per group' is the same pattern with ORDER BY date DESC and rn = 1."],
"A dashboard needs, per month: revenue, the change from the previous month, and the running total for the year. And product managers want the three best-selling products in every category. All of these are window functions.",
`
-- rank products by price within their category
SELECT category, name, price,
       ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn,
       RANK()       OVER (PARTITION BY category ORDER BY price DESC) AS rnk
FROM products;

-- top 3 products per category
WITH ranked AS (
    SELECT category, name, price,
           ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn
    FROM products
)
SELECT * FROM ranked WHERE rn <= 3;

-- monthly revenue, change from last month, running total
WITH monthly AS (
    SELECT date_trunc('month', paid_at) AS month, SUM(amount) AS revenue
    FROM payments WHERE paid_at IS NOT NULL
    GROUP BY 1
)
SELECT month,
       revenue,
       revenue - LAG(revenue) OVER (ORDER BY month) AS change,
       SUM(revenue) OVER (ORDER BY month)           AS running_total,
       ROUND(AVG(revenue) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg_3m
FROM monthly
ORDER BY month;

-- each customer's most recent order
WITH latest AS (
    SELECT o.*, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) AS rn
    FROM orders o
)
SELECT * FROM latest WHERE rn = 1;

-- each row's share of its group total
SELECT name, category, price, ROUND(100.0 * price / SUM(price) OVER (PARTITION BY category), 1) AS pct_of_category
FROM products;
`,
"Window functions (also called analytic functions) were introduced by Oracle in 1999 and added to the SQL:2003 standard. PostgreSQL gained them in 8.4 (2009), and MySQL only in 8.0 (2018). They are one of the most common topics in SQL interviews.",
[["PostgreSQL tutorial: Window Functions", "https://www.postgresql.org/docs/current/tutorial-window.html"],
 ["PostgreSQL: Window Functions reference", "https://www.postgresql.org/docs/current/functions-window.html"],
 ["PostgreSQL: Window Function Calls (syntax)", "https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS"]]),

X("Indexes",
["Without an index, the only way a database can find the rows matching your WHERE clause is to read every row in the table and check each one. This is a sequential (or full table) scan. On a thousand rows nobody notices; on fifty million rows a query takes minutes. An index is a separate data structure that lets the database jump straight to the rows it needs, like the index at the back of a book.",
 "The default index type is a B-tree, a balanced tree that keeps values in sorted order. Finding a value among a million rows takes about three or four steps down the tree. Because it is sorted, a B-tree supports equality (=), ranges (<, >, BETWEEN), sorting (ORDER BY) and prefix matching (LIKE 'abc%'; in PostgreSQL this needs the C collation or an index built with text_pattern_ops). It cannot help with a pattern that starts with a wildcard (LIKE '%abc').",
 "A composite index covers several columns, and their order matters. An index on (customer_id, created_at) is sorted by customer first, then by date within each customer. It serves queries that filter on customer_id, or on customer_id and created_at, but not on created_at alone. This is the 'leftmost prefix' rule. Indexes are not free: every INSERT, UPDATE and DELETE must also update every index on the table, and indexes take disk space. So you index the columns your real queries filter, join and sort on, and no more."],
["Primary keys and UNIQUE constraints get an index automatically. Foreign keys do not (in PostgreSQL); add one yourself.",
 "Index columns used in WHERE, JOIN ... ON and ORDER BY.",
 "Composite index order: equality columns first, then the range or sort column.",
 "A function on the column defeats the index: WHERE lower(email) = ... needs an index on lower(email).",
 "A covering index (INCLUDE) contains all the columns a query needs, so the table itself rarely has to be read.",
 "A partial index covers only some rows: ... WHERE status = 'pending'.",
 "Other types: GIN for JSONB, arrays and full-text search; GiST for geometry and ranges; BRIN for huge time-ordered tables.",
 "Too many indexes slow down writes; remove ones that are never used."],
"A page listing a customer's orders takes 4 seconds because the orders table has 30 million rows and no index on customer_id. After CREATE INDEX on (customer_id, created_at DESC) the same query takes 2 milliseconds, with no change to the application.",
`
-- basic index for lookups and joins
CREATE INDEX idx_orders_customer ON orders (customer_id);

-- composite: filter by customer, sorted by date
CREATE INDEX idx_orders_customer_date ON orders (customer_id, created_at DESC);
--   uses it:      WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 20
--   uses it:      WHERE customer_id = 42 AND created_at >= '2026-01-01'
--   not efficient: WHERE created_at >= '2026-01-01'         (not the leftmost column)

-- unique index doubles as a rule
CREATE UNIQUE INDEX idx_customers_email_lower ON customers (lower(email));
--   now this is fast:  WHERE lower(email) = 'anu@example.com'

-- partial index: small and fast for the common case
CREATE INDEX idx_orders_pending ON orders (created_at) WHERE status = 'pending';

-- covering index: answer the query from the index alone
CREATE INDEX idx_orders_cover ON orders (customer_id) INCLUDE (status, created_at);

-- JSONB and full-text search
CREATE INDEX idx_payments_meta ON payments USING GIN (metadata);

-- build without blocking writes on a live table
CREATE INDEX CONCURRENTLY idx_orders_status ON orders (status);

-- find indexes that are never used
SELECT relname, indexrelname, idx_scan FROM pg_stat_user_indexes ORDER BY idx_scan LIMIT 10;
`,
"The B-tree was invented by Rudolf Bayer and Edward McCreight at Boeing in 1970, and has been the main index structure in databases ever since. Nobody is sure what the B stands for: Boeing, balanced, Bayer or broad have all been suggested.",
[["PostgreSQL: Indexes", "https://www.postgresql.org/docs/current/indexes.html"],
 ["PostgreSQL: Index Types", "https://www.postgresql.org/docs/current/indexes-types.html"],
 ["Use The Index, Luke (free guide to SQL indexing)", "https://use-the-index-luke.com/"]]),

X("Query plans and optimisation",
["SQL says what you want, not how to get it. A part of the database called the query planner (or optimiser) decides the how: which index to use, in which order to join the tables, and by what method. It estimates the cost of many possible plans using statistics it keeps about your data, and picks the cheapest. When a query is slow, the first step is always to look at the plan it chose.",
 "EXPLAIN shows the plan without running the query. EXPLAIN ANALYZE runs it and shows the real row counts and time for each step. You read a plan from the innermost, most indented step outward. The main things to recognise are the scan types: Seq Scan reads the whole table; Index Scan uses an index and then fetches rows; Index Only Scan answers from the index alone; Bitmap Scan is in between. And the join methods: Nested Loop (good when one side is small), Hash Join (good for large unsorted sets) and Merge Join (good when both sides are sorted).",
 "A sequential scan is not always bad: for a small table, or when you really need most of the rows, it is the fastest choice. The warning signs are a Seq Scan on a big table that returns few rows (a missing index), a large gap between estimated and actual row counts (stale statistics, fixed with ANALYZE), and sorts or hashes that spill to disk."],
["EXPLAIN = the plan. EXPLAIN (ANALYZE, BUFFERS) = the plan plus real timings and I/O. It executes the query, so wrap changes in a transaction and roll back.",
 "Seq Scan on a big table with a selective filter usually means a missing index.",
 "Compare 'rows=' (estimate) with 'actual rows'; a big mismatch means bad statistics. Run ANALYZE table.",
 "Select only the columns you need and filter as early as possible.",
 "The N+1 problem: one query for a list, then one query per item. Replace it with a single join or an IN query.",
 "Deep OFFSET pagination is slow; use keyset pagination (WHERE id > last_seen ORDER BY id LIMIT n).",
 "Turn on slow-query logging or pg_stat_statements to find which queries actually cost the most."],
"A report page slows down week by week. pg_stat_statements shows one query consuming 70% of all database time. EXPLAIN ANALYZE reveals a sequential scan over 80 million rows because the WHERE clause wraps the column in a function. Rewriting the condition as a date range lets the existing index be used, and the query drops from 9 seconds to 30 milliseconds.",
`
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 20;

-- BEFORE the index:
-- Limit  (actual time=812.4..812.4 rows=20)
--   -> Sort  (actual time=812.4..812.4 rows=20)
--        -> Seq Scan on orders  (actual time=0.02..809.1 rows=57)
--             Filter: (customer_id = 42)
--             Rows Removed by Filter: 29999943        <- read 30 million rows for 57
-- Execution Time: 812.5 ms

-- AFTER: CREATE INDEX ON orders (customer_id, created_at DESC);
-- Limit  (actual time=0.03..0.05 rows=20)
--   -> Index Scan using orders_customer_id_created_at_idx on orders
--        Index Cond: (customer_id = 42)
-- Execution Time: 0.07 ms

-- a function on the column hides it from the index
SELECT * FROM orders WHERE date(created_at) = '2026-10-05';                           -- slow
SELECT * FROM orders WHERE created_at >= '2026-10-05' AND created_at < '2026-10-06';  -- fast

-- keyset pagination instead of a large OFFSET
SELECT * FROM orders WHERE id > 105000 ORDER BY id LIMIT 20;

-- refresh the planner's statistics
ANALYZE orders;

-- which queries cost the most? (needs the pg_stat_statements extension)
SELECT query, calls, round(total_exec_time) AS total_ms, round(mean_exec_time) AS mean_ms
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;
`,
"Cost-based query optimisation was invented by Patricia Selinger and her team for IBM's System R in 1979. Her paper is one of the most influential in database history, and every major database today uses a descendant of that design.",
[["PostgreSQL: Using EXPLAIN", "https://www.postgresql.org/docs/current/using-explain.html"],
 ["PostgreSQL: Performance Tips", "https://www.postgresql.org/docs/current/performance-tips.html"],
 ["PostgreSQL: pg_stat_statements", "https://www.postgresql.org/docs/current/pgstatstatements.html"]]),

X("Normalisation and schema design",
["Normalisation is the process of organising tables so that each fact is stored in exactly one place. When the same fact is stored in several places, the copies eventually disagree. If a customer's address is repeated on every one of their orders, changing it means updating many rows, and missing one leaves the database contradicting itself. These problems are called update, insert and delete anomalies.",
 "The rules are expressed as normal forms. First normal form (1NF): every column holds a single value, with no lists or repeating groups such as phone1, phone2, phone3. Second normal form (2NF): every non-key column depends on the whole primary key, not on just part of a composite key. Third normal form (3NF): non-key columns depend only on the key, not on other non-key columns; for example, city should not be stored beside pincode if the pincode determines the city. A common summary is that every non-key column must depend on 'the key, the whole key, and nothing but the key'. Designing to 3NF is the normal target for a transactional system.",
 "Denormalisation is deliberately breaking these rules to make reads faster: storing a calculated total on the order row, or copying a product name into the order line. It trades simpler, faster reads for more complicated writes and a risk of inconsistency. The sound approach is to normalise first, then denormalise specific places only when you have measured a real performance problem. Note that some copying is not denormalisation at all: the price on an order line is a historical fact, the price at that moment, and must not change when the product's price changes."],
["1NF: single values per column, no repeating groups.",
 "2NF: no dependence on part of a composite key.",
 "3NF: no dependence of one non-key column on another.",
 "Normalised design: no redundancy, easy and safe writes, more joins when reading.",
 "Denormalised design: fewer joins, faster reads, harder writes; used in reporting and data warehouses (star schema).",
 "Normalise by default; denormalise on evidence.",
 "Naming: pick a convention (snake_case, plural or singular table names) and keep to it."],
"An orders table has columns customer_name, customer_email and customer_address. A customer changes their email; 40 old orders still show the old one, and the support team does not know which is right. Moving customer details to a customers table and storing only customer_id on orders removes the problem.",
`
-- NOT normalised: repeated groups and repeated facts
-- orders(id, customer_name, customer_email, customer_city,
--        item1, qty1, item2, qty2, item3, qty3)

-- Normalised to 3NF
-- customers(id, name, email, pincode)
-- pincodes(pincode, city, state)                 city depends on pincode, not on the customer
-- products(id, name, price)
-- orders(id, customer_id, created_at)
-- order_items(order_id, product_id, quantity, unit_price)

-- unit_price on the line is a historical fact, not redundancy:
-- the product's price may change next week, the invoice must not.

-- deliberate denormalisation for a hot read path
ALTER TABLE orders ADD COLUMN total_amount NUMERIC(12,2);

UPDATE orders o
SET total_amount = t.total
FROM (SELECT order_id, SUM(quantity * unit_price) AS total FROM order_items GROUP BY order_id) t
WHERE t.order_id = o.id;

-- reporting: a star schema is denormalised on purpose
-- fact_sales(date_key, product_key, customer_key, quantity, amount)
-- dim_date(date_key, day, month, quarter, year)
-- dim_product(product_key, name, category, brand)
`,
"Codd defined first normal form in 1970 and second and third in 1971. Boyce-Codd normal form followed in 1974. The star schema for analytics was popularised by Ralph Kimball in the 1990s.",
[["PostgreSQL: Data Definition", "https://www.postgresql.org/docs/current/ddl.html"],
 ["Microsoft: Database normalization basics", "https://learn.microsoft.com/en-us/office/troubleshoot/access/database-normalization-description"]]),

X("Transactions, ACID and isolation levels",
["A transaction is a group of statements that the database treats as one unit of work. You start with BEGIN, do several things, and end with COMMIT to make them all permanent, or ROLLBACK to undo all of them. Transactions provide four guarantees known as ACID. Atomicity: all of it happens or none of it. Consistency: the data moves from one valid state to another, with every constraint still satisfied. Isolation: transactions running at the same time do not corrupt each other. Durability: once committed, the change survives a crash or power cut.",
 "Isolation is the subtle one, because full isolation is slow, so databases offer levels. Read Uncommitted allows 'dirty reads' of other transactions' unfinished changes (PostgreSQL never allows them and treats this level as Read Committed). Read Committed, the default in PostgreSQL, Oracle and SQL Server, shows only committed data, but two reads in one transaction may see different values (a non-repeatable read). Repeatable Read gives the transaction a fixed snapshot of the data from its start. Serializable guarantees the result is the same as if the transactions had run one after another, and will cancel a transaction that would break that.",
 "Most modern databases implement this with MVCC (multi-version concurrency control): an update creates a new version of the row instead of overwriting it, so readers continue to see the old version and never block writers. The classic bug that isolation does not prevent by itself is the lost update: two transactions read the same balance, each subtracts from it and writes it back, and one update overwrites the other. The fixes are an atomic UPDATE (SET balance = balance - 500), a row lock with SELECT ... FOR UPDATE, or optimistic locking with a version column."],
["BEGIN ... COMMIT / ROLLBACK. Without BEGIN, each statement is its own transaction (autocommit).",
 "ACID: Atomicity, Consistency, Isolation, Durability.",
 "Levels, weakest to strongest: Read Uncommitted, Read Committed, Repeatable Read, Serializable.",
 "Anomalies: dirty read, non-repeatable read, phantom read, lost update, write skew.",
 "Keep transactions short; never wait for a user or call an external API inside one.",
 "SELECT ... FOR UPDATE locks the selected rows until the transaction ends.",
 "Higher isolation levels can fail with a serialization error; the application must retry."],
"Two people try to buy the last concert ticket at the same instant. Both transactions read 'stock = 1', both decide it is available, both write 'stock = 0', and two tickets are sold for one seat. Using UPDATE ... SET stock = stock - 1 WHERE stock > 0 and checking that one row was changed makes only one of them succeed.",
`
-- money transfer: both updates or neither
BEGIN;
UPDATE accounts SET balance = balance - 500 WHERE id = 1;
UPDATE accounts SET balance = balance + 500 WHERE id = 2;
COMMIT;                       -- or ROLLBACK; to undo both

-- lost update: WRONG (read, compute in the app, write back)
--   SELECT stock FROM products WHERE id = 7;      -> 1
--   UPDATE products SET stock = 0 WHERE id = 7;   two sessions both do this

-- fix 1: an atomic conditional update
UPDATE products SET stock = stock - 1 WHERE id = 7 AND stock > 0;
-- check the affected row count: 0 means sold out

-- fix 2: lock the row first
BEGIN;
SELECT stock FROM products WHERE id = 7 FOR UPDATE;    -- others wait here
UPDATE products SET stock = stock - 1 WHERE id = 7;
COMMIT;

-- fix 3: optimistic locking with a version column
UPDATE products SET stock = 0, version = version + 1 WHERE id = 7 AND version = 12;
-- 0 rows updated means someone else changed it: reload and retry

-- choose an isolation level for one transaction
BEGIN ISOLATION LEVEL SERIALIZABLE;
-- ... statements ...
COMMIT;

-- savepoint: undo part of a transaction
BEGIN;
INSERT INTO orders (customer_id) VALUES (1);
SAVEPOINT before_items;
-- something fails here
ROLLBACK TO before_items;
COMMIT;
`,
"Jim Gray defined the transaction concept at IBM in the 1970s and won the Turing Award for it in 1998. The term ACID was coined by Theo Haerder and Andreas Reuter in 1983. The four isolation levels come from the SQL-92 standard. MVCC was described by David Reed in 1978.",
[["PostgreSQL tutorial: Transactions", "https://www.postgresql.org/docs/current/tutorial-transactions.html"],
 ["PostgreSQL: Transaction Isolation", "https://www.postgresql.org/docs/current/transaction-iso.html"],
 ["PostgreSQL: Concurrency Control (MVCC)", "https://www.postgresql.org/docs/current/mvcc.html"]]),

X("Locks and deadlocks",
["To keep concurrent changes safe, the database uses locks. Most locking is automatic: when a transaction updates a row, it takes a lock on that row, and any other transaction that wants to change the same row waits until the first one commits or rolls back. With MVCC, plain SELECTs do not wait for writers and writers do not wait for readers, so most of the time locks are invisible.",
 "Locks exist at different levels. Row-level locks affect single rows and are taken by UPDATE, DELETE and SELECT ... FOR UPDATE. Table-level locks affect the whole table; the strongest of them is taken by many ALTER TABLE operations and blocks all reads and writes while it is held. This is why a schema change on a busy table can freeze an application: the ALTER waits for a long-running query to finish, and meanwhile every new query queues up behind the waiting ALTER.",
 "A deadlock happens when two transactions each hold a lock the other needs. Transaction A locks row 1 and asks for row 2; transaction B has locked row 2 and asks for row 1. Neither can ever proceed. The database detects the cycle and cancels one of them with a deadlock error, and the application is expected to retry it. Deadlocks are prevented by always locking rows in the same order, and made rarer by keeping transactions short."],
["Writers block other writers on the same row; readers are not blocked (MVCC).",
 "Locks are held until the transaction ends, so long transactions cause long waits.",
 "Deadlock: a cycle of waiting. The database kills one transaction; retry it.",
 "Prevent deadlocks by acquiring locks in a consistent order, such as ascending ID.",
 "FOR UPDATE SKIP LOCKED lets several workers each take a different row: a simple, safe job queue.",
 "FOR UPDATE NOWAIT fails at once instead of waiting.",
 "Set lock_timeout before schema changes so a blocked ALTER gives up instead of freezing the application.",
 "pg_stat_activity and pg_locks show who is waiting for whom."],
"A transfer from account 1 to 2 and a transfer from 2 to 1 run at the same moment. Each locks its source account, then waits for the other's. The database reports a deadlock and aborts one. The fix is in the code: always lock the account with the smaller ID first, whichever direction the money is going.",
`
-- deadlock
-- session A                                     session B
-- BEGIN;                                        BEGIN;
-- UPDATE accounts SET ... WHERE id = 1;         UPDATE accounts SET ... WHERE id = 2;
-- UPDATE accounts SET ... WHERE id = 2;  waits  UPDATE accounts SET ... WHERE id = 1;  waits
-- ERROR: deadlock detected  (one session is aborted)

-- prevention: lock in a fixed order
BEGIN;
SELECT id FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE;
UPDATE accounts SET balance = balance - 500 WHERE id = 2;
UPDATE accounts SET balance = balance + 500 WHERE id = 1;
COMMIT;

-- a job queue: each worker claims a different pending job
BEGIN;
SELECT id, payload FROM jobs
WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;
-- ... do the work ...
UPDATE jobs SET status = 'done' WHERE id = 501;
COMMIT;

-- safe schema change on a live table
SET lock_timeout = '3s';
ALTER TABLE orders ADD COLUMN note TEXT;

-- who is blocked, and by whom?
SELECT pid, state, wait_event_type, pg_blocking_pids(pid) AS blocked_by, left(query, 60) AS query
FROM pg_stat_activity
WHERE wait_event_type = 'Lock';
`,
"Two-phase locking, the theory behind database locks, was published by Eswaran, Gray, Lorie and Traiger at IBM in 1976. The deadlock problem itself was analysed earlier by Edsger Dijkstra in the 1960s with his 'dining philosophers'. SKIP LOCKED reached PostgreSQL in 9.5 (2016).",
[["PostgreSQL: Explicit Locking", "https://www.postgresql.org/docs/current/explicit-locking.html"],
 ["PostgreSQL: Viewing Locks", "https://www.postgresql.org/docs/current/monitoring-locks.html"],
 ["PostgreSQL: SELECT ... FOR UPDATE", "https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE"]]),

X("Views, stored procedures and triggers",
["A view is a saved query that you can use like a table. It stores no data; each time you select from it, the underlying query runs. Views are used to simplify (hide a five-table join behind one name), to give a stable interface while the tables underneath change, and for security (expose only some columns or rows to certain users). A materialised view does store its result on disk, so reading it is fast, but the data is as old as the last REFRESH. It suits expensive reports that do not need to be up to the second.",
 "Functions and stored procedures are code that lives and runs inside the database, written in SQL or a procedural language such as PL/pgSQL (PostgreSQL) or T-SQL (SQL Server). They can cut network round trips and keep a multi-step operation atomic. A trigger is a function that the database calls automatically when rows are inserted, updated or deleted, typically to keep an audit log, maintain an updated_at column or enforce a rule that a constraint cannot express.",
 "These tools are powerful and easy to overuse. Logic inside the database is harder to version-control, test and debug than application code, and triggers in particular act invisibly: a simple UPDATE can set off a chain of effects that nobody reading the application code would expect. A reasonable balance is to keep business logic in the application and use the database for integrity and for data-heavy operations."],
["View: a named query, always current, no storage.",
 "Materialised view: stored result, fast to read, must be refreshed.",
 "Function: returns a value and can be used inside queries. Procedure: called with CALL, can manage transactions.",
 "Trigger: runs automatically BEFORE or AFTER INSERT, UPDATE or DELETE.",
 "Good uses of triggers: audit trails, updated_at timestamps.",
 "Give users access to views instead of base tables to restrict what they see.",
 "Keep database code in migration files under version control like everything else."],
"Analysts need customer spending totals, but must not see email addresses or phone numbers. A view exposes customer ID, name, order count and total spent; the analysts are granted access to the view only. Separately, an audit trigger records who changed any product price and when.",
`
-- view: hide a join and sensitive columns
CREATE VIEW customer_summary AS
SELECT c.id, c.name, COUNT(o.id) AS orders, COALESCE(SUM(o.total_amount), 0) AS spent
FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name;

SELECT * FROM customer_summary WHERE spent > 10000;
GRANT SELECT ON customer_summary TO analyst_role;

-- materialised view: an expensive report, refreshed on a schedule
CREATE MATERIALIZED VIEW daily_sales AS
SELECT date_trunc('day', paid_at) AS day, SUM(amount) AS revenue
FROM payments WHERE paid_at IS NOT NULL GROUP BY 1;

CREATE UNIQUE INDEX ON daily_sales (day);
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales;

-- function
CREATE FUNCTION order_total(p_order_id BIGINT) RETURNS NUMERIC AS $$
    SELECT COALESCE(SUM(quantity * unit_price), 0) FROM order_items WHERE order_id = p_order_id;
$$ LANGUAGE sql STABLE;

SELECT id, order_total(id) FROM orders LIMIT 5;

-- trigger: keep updated_at current
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
`,
"Views were part of Codd's relational model and of IBM's System R in the 1970s. Stored procedures were popularised by Sybase in the late 1980s and standardised in SQL:1999 (SQL/PSM). Oracle's PL/SQL appeared in 1988 (with stored procedures and triggers from 1992) and PostgreSQL's PL/pgSQL in 1998.",
[["PostgreSQL: CREATE VIEW", "https://www.postgresql.org/docs/current/sql-createview.html"],
 ["PostgreSQL: Materialized Views", "https://www.postgresql.org/docs/current/rules-materializedviews.html"],
 ["PostgreSQL: PL/pgSQL", "https://www.postgresql.org/docs/current/plpgsql.html"]]),

X("Scaling a database: replication, partitioning and sharding",
["A single database server can go a long way, especially with good indexes and queries. When it is no longer enough, there is a standard order in which to scale, from easy to hard. The first step is simply a bigger machine with more memory, CPU and faster disks. This is vertical scaling, and it is far simpler than anything that follows.",
 "Replication copies the data continuously from a primary server to one or more replicas. All writes go to the primary; reads can be spread across the replicas, which helps because most applications read far more than they write. Replicas also provide high availability: if the primary fails, a replica is promoted. With asynchronous replication, the usual choice, a replica can be a moment behind the primary. This replication lag means a user who has just saved something may not see it if their next read goes to a replica; a common fix is to read your own recent writes from the primary.",
 "Partitioning splits one very large table into smaller pieces inside the same database, most often by date. Queries that filter on the partition key touch only the relevant partitions, and old data can be removed by dropping a whole partition instantly. Sharding goes further and spreads data across several independent database servers, chosen by a shard key such as customer ID. It scales writes almost without limit, but queries and transactions that cross shards become hard, and changing the number of shards is painful. Treat sharding as a last resort, after caching, read replicas and partitioning."],
["Order of scaling: optimise queries and indexes, scale up, add caching, add read replicas, partition, and only then shard.",
 "Replication: one primary for writes, replicas for reads and failover.",
 "Replication lag: replicas may be slightly behind; plan for 'read your own writes'.",
 "Partitioning: one database, table split by range, list or hash.",
 "Sharding: many databases; the choice of shard key is critical and hard to change.",
 "Connection pooling (PgBouncer) is needed long before sharding.",
 "Take backups, and regularly test restoring from them; an untested backup is not a backup."],
"An events table grows by 50 million rows a month and queries for 'last 7 days' get slower. Partitioning by month means those queries read only the newest partition, and each month the partition older than two years is dropped in milliseconds instead of running a DELETE for hours.",
`
-- partition a large table by month
CREATE TABLE events (
    id         BIGINT GENERATED ALWAYS AS IDENTITY,
    user_id    BIGINT NOT NULL,
    type       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2026_10 PARTITION OF events FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE events_2026_11 PARTITION OF events FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

-- only the October partition is scanned (partition pruning)
EXPLAIN SELECT COUNT(*) FROM events WHERE created_at >= '2026-10-05' AND created_at < '2026-10-06';

-- removing old data is instant
DROP TABLE events_2024_10;

-- replication: how far behind is this replica?
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;

-- application routing with read replicas (concept)
--   writes                    -> primary
--   reads                     -> replica
--   reads right after a write -> primary

-- sharding (concept): which server holds this customer?
--   shard = hash(customer_id) % 4
--   customer 1042 -> shard 2 -> db-shard-2.internal
`,
"Database replication dates from the 1980s. Sharding became famous through large websites in the 2000s; the word is said to come from the 1997 online game Ultima Online. Google's Bigtable (2006) and Spanner (2012) papers showed how to distribute data automatically. PostgreSQL added built-in declarative partitioning in version 10 (2017).",
[["PostgreSQL: Table Partitioning", "https://www.postgresql.org/docs/current/ddl-partitioning.html"],
 ["PostgreSQL: High Availability, Load Balancing and Replication", "https://www.postgresql.org/docs/current/high-availability.html"],
 ["PostgreSQL: Backup and Restore", "https://www.postgresql.org/docs/current/backup.html"]])
]});

ROADMAP.push({
n: 18, track: "DevOps, data and design",
title: "System Design in Depth",
blurb: "How large systems are put together: the method, the building blocks, the trade-offs, two worked designs and a low-level design.",
topics: [
X("How to approach a system design",
["System design is deciding what components a system needs, how they connect and how data flows between them, so that it meets its requirements at the expected scale. There is never one correct answer. Every choice is a trade-off: speed against consistency, simplicity against flexibility, cost against reliability. The skill is in making those trade-offs explicit and choosing with reasons.",
 "A dependable method has five steps. First, clarify the requirements. Functional requirements are what the system does (shorten a URL, send a message). Non-functional requirements are how well it does it: how many users, how fast, how available, how consistent. Second, estimate the scale with rough arithmetic: requests per second, storage per year, read-to-write ratio. These numbers decide which problems are real. Third, define the API and the data model. Fourth, draw the high-level design: clients, load balancer, services, databases, caches, queues. Fifth, go deep on the hardest parts, identify bottlenecks and single points of failure, and discuss the trade-offs.",
 "Start with the simplest design that works, then evolve it as the numbers demand. A system for a thousand users does not need what a system for a hundred million needs, and designing for imaginary scale is one of the most common and expensive mistakes."],
["Functional requirements: features. Non-functional: scale, latency, availability, consistency, durability, cost.",
 "Useful numbers: one day is about 86,400 seconds (round to 100,000). 1 million requests per day is about 12 per second.",
 "Latency scale: memory access about 100 nanoseconds; SSD read about 100 microseconds; a network round trip within a data centre about 0.5 ms; across continents about 150 ms.",
 "Ask about the read-to-write ratio; it decides whether you optimise for reads (cache, replicas) or writes (queues, sharding).",
 "Find the single points of failure: any component whose loss stops everything.",
 "State assumptions and trade-offs out loud; in an interview that is what is being assessed."],
"Asked to 'design Instagram', a strong engineer does not start drawing. They first ask: which features? How many daily users? Is it read-heavy? They estimate 500 million photo views a day against 5 million uploads, a ratio of 100 to 1, and from that conclude the design must centre on fast reads: a CDN, caches and read replicas.",
`
# Back-of-envelope estimate for a URL shortener
#
# Assumptions
#   100 million new links per month
#   read : write = 100 : 1
#
# Writes   100,000,000 / (30 * 86,400)   = about 40 per second
# Reads    40 * 100                      = about 4,000 per second
#
# Storage  each record about 500 bytes
#          100M * 12 months * 5 years    = 6 billion records
#          6 billion * 500 bytes         = about 3 TB
#
# Cache    20% of links get 80% of traffic
#          4,000 * 86,400 = 345M reads per day
#          cache 20% of them * 500 bytes = about 35 GB of memory
#
# Conclusion: read-heavy, modest writes, storage fits a small cluster,
#             a cache will absorb most of the read traffic.
`,
"Large-scale system design grew out of the web companies of the 2000s. Google's papers on the Google File System (2003), MapReduce (2004) and Bigtable (2006), and Amazon's Dynamo paper (2007), shared how they built systems that no single machine could run, and shaped the field.",
[["AWS Well-Architected Framework", "https://aws.amazon.com/architecture/well-architected/"],
 ["Azure Architecture Center", "https://learn.microsoft.com/en-us/azure/architecture/"],
 ["Google Cloud Architecture Framework", "https://cloud.google.com/architecture/framework"]]),

X("Scalability: vertical, horizontal and stateless services",
["Scalability is the ability of a system to handle more load by adding resources. There are two directions. Vertical scaling (scaling up) means a bigger machine: more CPU, more memory. It is simple, since nothing in the software changes, but it has a ceiling, the price rises steeply, and the single machine remains a single point of failure. Horizontal scaling (scaling out) means more machines sharing the work behind a load balancer. It has no practical ceiling and survives the loss of a machine, but the software has to be designed for it.",
 "The design requirement for horizontal scaling is statelessness. A stateless service keeps nothing in its own memory or on its own disk that matters between requests. Any request can go to any server, servers can be added or removed at will, and a crashed server loses nothing. State, meaning sessions, uploaded files and data, is moved out to shared stores: a database, a cache such as Redis, object storage.",
 "With stateless services behind a load balancer, auto-scaling becomes possible: the platform adds servers when load rises and removes them when it falls, so you pay for what you use. The application tier is usually the easy part to scale this way. The database is the hard part, because it is all state; that is why caching, replication and sharding get so much attention."],
["Scale up = bigger machine: simple, limited, single point of failure.",
 "Scale out = more machines: unlimited, resilient, needs stateless design.",
 "Stateless: no local sessions or files; keep state in a database, cache or object store.",
 "Use tokens (JWT) or a shared session store so any server can handle any user.",
 "Auto-scaling adds and removes instances based on a metric such as CPU or queue length.",
 "Scale the bottleneck, not everything; measure to find it.",
 "Latency is the time for one request; throughput is requests handled per second. They are different goals."],
"A shopping site keeps login sessions in each web server's memory. When a second server is added, users are logged out at random because their next request reaches the other server. Moving sessions to Redis makes the servers stateless, and the site can then run on 2 or 20 servers.",
`
#  Before: stateful, one server              After: stateless, horizontal
#
#  users                                     users
#    |                                         |
#  [ web server ]                         [ load balancer ]
#   sessions in memory                     /      |      \\
#   uploads on local disk               [web]   [web]   [web]     <- identical, disposable
#    |                                     \\      |      /
#  [ database ]                    +--------+-----+------+--------+
#                                  |              |               |
#                              [ Redis ]     [ database ]   [ object storage ]
#                              sessions,      durable data    uploaded files
#                              cache

# Kubernetes auto-scaling: between 3 and 20 copies, target 70% CPU
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: shop-api
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: shop-api }
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
`,
"Through the 1990s the answer to growth was a bigger, more expensive server. Google showed in the early 2000s that thousands of cheap machines could do better if the software expected failures. The 'shared-nothing' architecture this relies on was described by Michael Stonebraker in 1986.",
[["The Twelve-Factor App: Processes (stateless)", "https://12factor.net/processes"],
 ["Kubernetes: Horizontal Pod Autoscaling", "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/"],
 ["Azure: Autoscaling guidance", "https://learn.microsoft.com/en-us/azure/architecture/best-practices/auto-scaling"]]),

X("Caching strategies",
["A cache keeps a copy of data in a fast place, usually memory, so that it does not have to be fetched or computed again. Reading from memory takes microseconds; a database query takes milliseconds or more. Since most systems read much more than they write, and a small share of the data receives most of the requests, caching is usually the single most effective performance improvement.",
 "Caches exist at every layer: the browser, a CDN, the reverse proxy, an application-level cache such as Redis or Memcached, and inside the database itself. For the application cache there are standard patterns. Cache-aside (lazy loading) is the most common: the application looks in the cache; on a miss it reads the database, stores the result in the cache and returns it. Write-through writes to the cache and the database together, keeping the cache fresh at the cost of slower writes. Write-behind writes to the cache first and to the database later, which is fast but risks losing data.",
 "The hard part is keeping the cache correct. Every entry needs a time-to-live (TTL) so that stale data eventually disappears, and when data changes the entry must be invalidated or updated. When memory fills up, an eviction policy decides what to remove; LRU (least recently used) is the usual one. There are also failure modes to plan for: a cache stampede, when a popular entry expires and thousands of requests hit the database at once; and cache penetration, when requests for keys that do not exist bypass the cache every time."],
["Cache what is read often, changes rarely and is expensive to produce.",
 "Cache-aside: read cache, on miss read the database and fill the cache; on write, delete the cache entry.",
 "Always set a TTL; add random jitter so entries do not all expire at the same moment.",
 "Eviction policies: LRU, LFU (least frequently used), FIFO.",
 "Hit ratio = hits / (hits + misses); monitor it.",
 "Stampede protection: a lock so only one request rebuilds the entry, or refresh before expiry.",
 "Cache 'not found' results briefly to stop repeated misses.",
 "A cache is a copy; the system must still work, more slowly, when it is empty."],
"The home page of a news site runs 12 database queries and is requested 5,000 times a second. Cached for 30 seconds, the database sees the queries twice a minute instead of 60,000 times a second, and the page is at most 30 seconds old, which is acceptable for a home page.",
`
import json, random, redis

r = redis.Redis(decode_responses=True)

# cache-aside read
def get_product(product_id: int) -> dict | None:
    key = f"product:{product_id}"
    cached = r.get(key)
    if cached is not None:
        return json.loads(cached) or None          # hit ("null" = known missing)

    product = db_fetch_product(product_id)         # miss: go to the database
    ttl = 300 + random.randint(0, 60)              # jitter avoids mass expiry
    if product is None:
        r.set(key, "null", ex=30)                  # cache 'not found' briefly
    else:
        r.set(key, json.dumps(product), ex=ttl)
    return product

# on write: update the database, then invalidate the cache
def update_price(product_id: int, price: float) -> None:
    db_update_price(product_id, price)
    r.delete(f"product:{product_id}")

# stampede protection: only one caller rebuilds an expensive entry
def get_report() -> str:
    data = r.get("report")
    if data:
        return data
    if r.set("report:lock", "1", nx=True, ex=30):  # got the lock
        try:
            data = build_expensive_report()
            r.set("report", data, ex=600)
        finally:
            r.delete("report:lock")                # release even if the build fails
        return data
    return "Report is being prepared, try again in a moment"
`,
"The CPU cache was introduced with the IBM System/360 Model 85 in 1968. Memcached, written by Brad Fitzpatrick for LiveJournal in 2003, brought distributed caching to web applications and was scaled up massively by Facebook. Redis followed in 2009.",
[["Redis documentation", "https://redis.io/docs/latest/"],
 ["Azure: Cache-Aside pattern", "https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside"],
 ["AWS: Caching best practices", "https://aws.amazon.com/caching/best-practices/"]]),

X("Choosing a database: SQL and NoSQL",
["Choosing where to keep data is the decision that is hardest to change later, so it deserves care. The two broad families are relational (SQL) databases and the varied group called NoSQL. Neither is better in general; they fit different shapes of data and different access patterns.",
 "Relational databases such as PostgreSQL and MySQL store structured data in tables with a fixed schema, support joins and arbitrary queries, and give ACID transactions. They are the right default for most business systems, where data is related (customers, orders, payments) and correctness matters. Their traditional weakness is scaling writes across many machines.",
 "NoSQL databases give up some of that generality for scale or flexibility, and come in four main kinds. Key-value stores (Redis, DynamoDB) look up a value by its key, extremely fast and simple. Document stores (MongoDB, Firestore) keep JSON-like documents with flexible structure. Wide-column stores (Cassandra, HBase, Bigtable) handle enormous write volumes and time-series data across many machines. Graph databases (Neo4j) store nodes and relationships and answer questions like 'friends of friends'. There are also specialised stores: search engines (Elasticsearch), time-series databases, and vector databases for AI. Many NoSQL systems are designed around a few known queries, so you model the data for those queries rather than normalising it. Large systems commonly use several databases, each for what it does best; this is called polyglot persistence."],
["Start with a relational database unless you have a specific reason not to.",
 "SQL: fixed schema, joins, ACID transactions, flexible querying.",
 "Key-value: simplest and fastest; sessions, caches, shopping carts.",
 "Document: flexible, nested data; product catalogues, content, user profiles.",
 "Wide-column: huge write volume; event logs, sensor data, messaging history.",
 "Graph: relationship-heavy; social networks, recommendations, fraud rings.",
 "Search engine: full-text search and filtering; usually a secondary copy of the main data.",
 "Decide from the access patterns: what are the main queries, and how often does each run?"],
"An e-commerce company uses PostgreSQL for orders and payments, where transactions are essential; Redis for sessions and carts; Elasticsearch for product search with typo tolerance; and Cassandra for the click-stream of billions of events. Each store was chosen for one job.",
`
# The same 'order' in different models

# Relational (PostgreSQL): normalised, joined when read
#   orders(id, customer_id, status)       order_items(order_id, product_id, qty)
#   SELECT ... FROM orders JOIN order_items ...

# Document (MongoDB): one self-contained document
order = {
    "_id": 1042,
    "customer": {"id": 7, "name": "Anu"},
    "items": [{"product": "Pen", "qty": 2, "price": 20},
              {"product": "Bag", "qty": 1, "price": 900}],
    "status": "paid",
}
# db.orders.find({"customer.id": 7, "status": "paid"})

# Key-value (Redis / DynamoDB): fetch by key only
#   GET  cart:user:7          -> '{"items": [...]}'
#   key design matters: "order#1042", "customer#7#orders"

# Wide-column (Cassandra): designed around one query
#   CREATE TABLE orders_by_customer (
#       customer_id bigint, created_at timestamp, order_id bigint, total decimal,
#       PRIMARY KEY (customer_id, created_at)
#   ) WITH CLUSTERING ORDER BY (created_at DESC);
#   -- fast:  WHERE customer_id = 7       (everything else needs another table)

# Graph (Neo4j): relationships are first-class
#   MATCH (me:User {id: 7})-[:FRIEND]->()-[:FRIEND]->(fof) RETURN DISTINCT fof
`,
"The term NoSQL was popularised in 2009 for a San Francisco meetup about new non-relational databases, many inspired by Google's Bigtable (2006) and Amazon's Dynamo (2007) papers. It is now usually read as 'not only SQL'. Later 'NewSQL' systems such as Google Spanner (2012) and CockroachDB combined SQL with horizontal scaling.",
[["Amazon Dynamo paper (2007)", "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf"],
 ["MongoDB documentation", "https://www.mongodb.com/docs/"],
 ["Azure: Understand data store models", "https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/data-store-overview"]]),

X("Replication, sharding and consistent hashing",
["Once data no longer fits comfortably on one machine, or one machine failing is unacceptable, data has to be spread across several. Two techniques do this, and they solve different problems. Replication keeps copies of the same data on several machines, for availability and for read capacity. Partitioning, called sharding when it spans servers, splits the data so each machine holds a different part, for write capacity and storage.",
 "In leader-follower replication, one node accepts writes and streams them to followers that serve reads. If the leader fails, a follower is promoted. Replication may be synchronous (the write waits for a follower to confirm, so nothing is lost but writes are slower) or asynchronous (fast, but a follower can be behind, and a few recent writes can be lost if the leader dies). Leaderless systems such as Cassandra and Dynamo let any node accept writes and use quorums: with N copies, a write must reach W nodes and a read must ask R nodes, and if W + R > N a read always overlaps with the latest write.",
 "For sharding you need a rule that maps each key to a shard. The obvious rule, hash(key) modulo the number of servers, has a serious flaw: when you add or remove a server, almost every key maps to a different one, and nearly all the data must move. Consistent hashing fixes this. Servers and keys are both placed on an imaginary ring by their hash, and each key belongs to the next server clockwise. Adding or removing a server then moves only the keys in its neighbourhood, about 1/N of the total. Each server is given many positions on the ring (virtual nodes) to keep the load even."],
["Replication = same data, many copies: availability and read scaling.",
 "Sharding = different data on each node: write scaling and capacity.",
 "Sync replication: no data loss, slower. Async: fast, replicas may lag.",
 "Quorum rule: W + R > N gives consistent reads in leaderless systems.",
 "Shard key choice is critical: it should spread load evenly and match the main queries.",
 "A 'hot' shard gets a disproportionate share of traffic, for example one celebrity's data.",
 "Consistent hashing moves only about 1/N of keys when a node is added or removed.",
 "Cross-shard joins and transactions are expensive; design so most operations stay within one shard."],
"A cache cluster of 4 servers uses hash(key) % 4. A fifth server is added before a sale, and suddenly 80% of keys point to the wrong server, the cache is effectively empty and the database is overwhelmed. With consistent hashing only about 20% of keys would have moved.",
`
import bisect, hashlib

class ConsistentHashRing:
    def __init__(self, nodes, vnodes=100):
        self.ring = {}                     # position on the ring -> node
        self.positions = []
        for node in nodes:
            for i in range(vnodes):        # virtual nodes even out the load
                pos = self._hash(f"{node}#{i}")
                self.ring[pos] = node
                bisect.insort(self.positions, pos)

    def _hash(self, key):
        return int(hashlib.md5(key.encode()).hexdigest(), 16)

    def node_for(self, key):
        pos = self._hash(key)
        i = bisect.bisect(self.positions, pos) % len(self.positions)   # next clockwise
        return self.ring[self.positions[i]]

keys = [f"user:{i}" for i in range(10000)]

four = ConsistentHashRing(["s1", "s2", "s3", "s4"])
five = ConsistentHashRing(["s1", "s2", "s3", "s4", "s5"])
moved = sum(four.node_for(k) != five.node_for(k) for k in keys)
print(f"consistent hashing: {moved / len(keys):.0%} of keys moved")      # about 20%

naive = sum(hash(k) % 4 != hash(k) % 5 for k in keys)
print(f"modulo hashing:     {naive / len(keys):.0%} of keys moved")      # about 80%
`,
"Consistent hashing was invented in 1997 by David Karger and colleagues at MIT, to distribute web caching; it became the basis of Akamai. Amazon's 2007 Dynamo paper brought it, together with quorums and virtual nodes, into mainstream database design.",
[["Amazon Dynamo paper", "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf"],
 ["Azure: Sharding pattern", "https://learn.microsoft.com/en-us/azure/architecture/patterns/sharding"],
 ["Apache Cassandra: architecture", "https://cassandra.apache.org/doc/latest/cassandra/architecture/overview.html"]]),

X("CAP theorem and consistency models",
["In a distributed system, data is copied across machines connected by a network, and networks fail. The CAP theorem states what is possible when they do. It names three properties. Consistency: every read sees the most recent write, as if there were a single copy. Availability: every request gets a non-error response. Partition tolerance: the system keeps working when the network between nodes is broken.",
 "The theorem says that during a network partition you cannot have both consistency and availability. Imagine two database nodes that cannot reach each other, and a write arrives at one. Either the system refuses requests it cannot guarantee to be correct, which keeps consistency and gives up availability (CP), or it accepts them and lets the two sides temporarily disagree, which keeps availability and gives up consistency (AP). Since partitions do happen, partition tolerance is not optional; the real choice is between C and A at the moment of failure. Banks and inventory systems tend to choose consistency. Social feeds, shopping carts and DNS tend to choose availability.",
 "Consistency is a spectrum, not a switch. Strong consistency (linearizability) means everyone sees a write as soon as it completes. Eventual consistency means that if no new writes arrive, all copies will converge, but for a short time different readers may see different values. In between are useful guarantees such as read-your-writes (you always see your own changes). The PACELC extension adds that even without a partition there is a trade-off between latency and consistency, because keeping copies in step takes time."],
["C: all nodes see the same data. A: every request is answered. P: survives network breaks.",
 "During a partition, choose CP (reject some requests) or AP (accept and reconcile later).",
 "CP examples: ZooKeeper, etcd, most SQL databases with synchronous replication.",
 "AP examples: Cassandra, DynamoDB (default settings), DNS.",
 "Strong consistency: simple to reason about, slower, less available.",
 "Eventual consistency: fast and available; the application must tolerate stale reads and resolve conflicts.",
 "Different data in one system can make different choices: the account balance strong, the 'likes' counter eventual.",
 "CAP's 'C' is not the same as the 'C' in ACID."],
"A user 'likes' a photo and the counter shows 1,204 on their phone but 1,203 on a friend's phone for a few seconds. Nobody is harmed, and the service stayed fast and available worldwide. The same looseness on a bank balance would be unacceptable, so the bank's ledger uses a strongly consistent store and accepts that it may refuse transactions during a failure.",
`
#  Two replicas lose contact (a network partition)
#
#      client A                         client B
#         |  write x = 5                   |  read x ?
#      [ node 1 ]  ----- X broken X -----  [ node 2 ]   (still has x = 4)
#
#  CP choice: node 2 answers 'unavailable' rather than risk returning old data
#             -> consistent, not available
#  AP choice: node 2 answers x = 4, and the nodes reconcile when the link returns
#             -> available, temporarily inconsistent

# Tunable consistency in Cassandra (N = 3 replicas)
#   CONSISTENCY ONE;      fastest, may read stale data          (AP)
#   CONSISTENCY QUORUM;   2 of 3 must answer: W + R > N         (consistent)
#   CONSISTENCY ALL;      all 3 must answer, fails if one is down

# Read-your-writes in application code
def get_profile(user_id, session):
    if session.wrote_recently(seconds=5):
        return primary_db.fetch(user_id)      # guaranteed to include my change
    return replica_db.fetch(user_id)          # may be slightly behind
`,
"Eric Brewer presented CAP as a conjecture in 2000, and Seth Gilbert and Nancy Lynch of MIT proved it in 2002. Werner Vogels of Amazon popularised 'eventual consistency' in 2008. Daniel Abadi proposed PACELC in 2010, and Brewer himself revisited CAP in 2012 to correct common misreadings.",
[["Eric Brewer: CAP Twelve Years Later", "https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/"],
 ["Jepsen: Consistency Models", "https://jepsen.io/consistency"],
 ["Werner Vogels: Eventually Consistent", "https://www.allthingsdistributed.com/2008/12/eventually_consistent.html"]]),

X("Message queues and event-driven architecture",
["When one service calls another directly and waits for the answer, the two are tightly coupled: if the second is slow, the first is slow; if the second is down, the first fails. A message queue puts a buffer between them. The producer writes a message describing the work or the event and carries on at once. The consumer reads messages when it is ready. The two no longer need to be running, or fast, at the same moment.",
 "This asynchronous style gives several benefits. Decoupling: the producer does not know or care who consumes. Load levelling: a burst of 10,000 requests becomes a queue that workers drain at a steady rate, instead of overwhelming the database. Resilience: if a consumer is down, messages wait and nothing is lost. Scalability: you add more consumers to go faster. There are two main models. In a queue (RabbitMQ, Amazon SQS) each message is delivered to one consumer and removed, which suits distributing tasks. In publish-subscribe or a log (Kafka, Google Pub/Sub) an event is kept and delivered to every interested subscriber, which suits broadcasting facts such as 'order placed' to many services.",
 "The price is complexity. Most systems guarantee at-least-once delivery, meaning a message can occasionally arrive twice, so consumers must be idempotent: processing the same message twice must have the same effect as once. Messages can arrive out of order. Messages that keep failing should go to a dead-letter queue for inspection. And the system as a whole becomes eventually consistent, since the effects of an action are no longer all visible at the instant it returns."],
["Synchronous call: simple, immediate answer, tight coupling. Asynchronous message: decoupled, resilient, eventually consistent.",
 "Queue: one consumer per message (work distribution). Pub/sub: every subscriber gets a copy (event broadcast).",
 "At-least-once delivery is the norm; make consumers idempotent.",
 "Dead-letter queue: where repeatedly failing messages go.",
 "Queue length is a key metric; a growing queue means consumers cannot keep up.",
 "Outbox pattern: write the event to a table in the same database transaction as the data change, and publish it afterwards, so neither can happen without the other.",
 "Use messaging where an immediate answer is not required: emails, notifications, reports, analytics, integrations."],
"Placing an order used to call the payment, inventory, email and analytics services one after another, taking 3 seconds and failing whenever the email service was down. Now the order service saves the order, publishes an 'order placed' event and replies in 100 milliseconds. Each of the other services reacts to the event independently.",
`
#  Synchronous chain                      Event-driven
#
#  order -> payment -> stock -> email     order service --publishes--> [ order.placed ]
#  (slow; any failure breaks the order)                                   |    |    |
#                                                                 payment  stock  email
#                                                                 (each consumes independently)

# Producer: publish an event
import json, uuid
event = {"event_id": str(uuid.uuid4()), "type": "order.placed",
         "order_id": 1042, "customer_id": 7, "total": 940}
producer.send("orders", json.dumps(event).encode())

# Consumer: idempotent handling of at-least-once delivery
def handle(message):
    event = json.loads(message.value)
    if db.already_processed(event["event_id"]):        # seen before: skip
        return
    db.mark_processed(event["event_id"])               # unique key, committed first
    send_confirmation_email(event["order_id"])         # an email cannot be rolled back, so it goes last

# Retry, then dead-letter
def consume(message, attempt=1):
    try:
        handle(message)
    except Exception:
        if attempt >= 5:
            producer.send("orders.dead-letter", message.value)   # park it for a human
        else:
            schedule_retry(message, delay=2 ** attempt)
`,
"Message-oriented middleware began with IBM MQSeries in 1993. The AMQP standard (2003) led to RabbitMQ (2007). LinkedIn's Kafka (2011) introduced the durable log model, and Jay Kreps's 2013 essay 'The Log' explained why it suits data integration.",
[["Apache Kafka documentation", "https://kafka.apache.org/documentation/"],
 ["RabbitMQ tutorials", "https://www.rabbitmq.com/tutorials"],
 ["Azure: Event-driven architecture style", "https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven"]]),

X("API design: REST, gRPC and GraphQL",
["An API (Application Programming Interface) is the contract between a service and its callers. Once others depend on it, it is very hard to change, so it deserves careful design. A good API is consistent, predictable and difficult to misuse.",
 "REST is the most widely used style for public and web APIs. Everything is modelled as a resource with a URL, such as /orders/1042. The HTTP methods express the action: GET reads, POST creates, PUT replaces, PATCH partially updates, DELETE removes. Status codes report the outcome, and data is usually JSON. gRPC, from Google, is common between internal services. You define the service and its messages in a .proto file, and tools generate client and server code. It uses compact binary encoding over HTTP/2, so it is fast and strongly typed, and supports streaming, but browsers cannot call it directly. GraphQL, from Facebook, exposes one endpoint where the client specifies exactly which fields it wants, which avoids fetching too much or making many round trips and suits complex user interfaces, at the cost of harder caching and the need to guard against expensive queries.",
 "Whatever the style, the same concerns apply. Paginate lists. Version the API so old clients keep working. Return errors in one consistent format. Authenticate every request and apply rate limits. Make operations idempotent where possible, so that a client can safely retry after a timeout without, for example, charging a card twice."],
["REST: nouns in URLs (/orders), verbs from HTTP methods, correct status codes.",
 "Use plural nouns and nesting for relationships: /customers/7/orders.",
 "POST is not idempotent; accept an Idempotency-Key header for operations such as payments.",
 "Paginate (limit and cursor), filter and sort through query parameters.",
 "Version from day one: /v1/orders or a version header.",
 "One error format everywhere, with a machine-readable code and a human-readable message.",
 "gRPC: internal, fast, typed, streaming. GraphQL: flexible queries for front ends.",
 "Document with OpenAPI (REST) so documentation and client code can be generated."],
"A mobile app sends 'pay 500', the network drops, and the app does not know whether it worked, so it retries. Without idempotency the customer is charged twice. With an Idempotency-Key, the server recognises the repeat and returns the original result without charging again.",
`
# REST resource design
# GET    /v1/orders?status=paid&limit=20&cursor=abc     list (paginated)
# POST   /v1/orders                                     create  -> 201 Created + Location header
# GET    /v1/orders/1042                                read    -> 200, or 404
# PATCH  /v1/orders/1042                                update part
# DELETE /v1/orders/1042                                remove  -> 204 No Content
# GET    /v1/customers/7/orders                         a customer's orders

# consistent error body
# 422 Unprocessable Entity
# { "error": { "code": "invalid_quantity", "message": "Quantity must be at least 1", "field": "items[0].quantity" } }

# idempotent POST in FastAPI
from fastapi import FastAPI, Header

app = FastAPI()

@app.post("/v1/payments", status_code=201)
async def create_payment(body: PaymentRequest, idempotency_key: str = Header()):
    claimed = await store.set_if_absent(idempotency_key, "in-progress", ttl=86400)   # atomic, like Redis SET NX
    if not claimed:
        return await store.get(idempotency_key)  # same request again: same answer, no new charge
    result = await charge(body)
    await store.set(idempotency_key, result, ttl=86400)
    return result

# gRPC contract (orders.proto)
# service OrderService {
#   rpc GetOrder (GetOrderRequest) returns (Order);
#   rpc WatchOrder (GetOrderRequest) returns (stream OrderStatus);
# }

# GraphQL query: the client picks the fields
# query { order(id: 1042) { status  items { name quantity }  customer { name } } }
`,
"Roy Fielding defined REST in his 2000 doctoral thesis, as a description of the architecture of the web itself. Facebook built GraphQL in 2012 and released it in 2015. Google open-sourced gRPC in 2015, based on its internal system Stubby. The OpenAPI specification grew out of Swagger (2011).",
[["Microsoft: Web API design best practices", "https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design"],
 ["gRPC documentation", "https://grpc.io/docs/"],
 ["GraphQL: Learn", "https://graphql.org/learn/"],
 ["Stripe: Idempotent requests", "https://docs.stripe.com/api/idempotent_requests"]]),

X("Monolith, microservices and modular design",
["A monolith is an application built and deployed as a single unit: one codebase, one deployment, usually one database. Microservices split the application into many small services, each owning one business capability and its own data, deployed independently and communicating over the network. This is one of the most consequential architectural choices, and the industry's view of it has matured considerably.",
 "A monolith is simple. A function call is fast and reliable, a transaction can cover everything, there is one thing to deploy and one place to look when debugging. For a small team it is the most productive choice. Its problems appear with size: many teams changing one codebase get in each other's way, every release redeploys everything, and one faulty module can bring the whole application down.",
 "Microservices address those problems. Teams deploy on their own schedule, each service scales separately and can use the technology that suits it, and a failure can be contained. But they turn a program into a distributed system, and that is a heavy price: network calls that fail or time out, no transactions across services, eventual consistency, much more operational machinery (service discovery, tracing, many pipelines), and harder testing. Microservices solve an organisational problem, many teams needing independence, more than a technical one. The widely recommended path is to begin with a well-structured 'modular monolith' with clear internal boundaries, and to extract a service only when there is a concrete reason, such as a part needing very different scaling or a team needing autonomy."],
["Monolith: simple, fast to build, one deployment; harder with many teams.",
 "Microservices: independent deployment and scaling; distributed-system complexity.",
 "Each microservice owns its data. A shared database between services recreates a monolith with extra failure modes.",
 "Service boundaries should follow business capabilities (bounded contexts), not technical layers.",
 "Cross-service consistency uses sagas: a sequence of local transactions with compensating actions to undo.",
 "Needed around microservices: API gateway, service discovery, tracing, centralised logging, per-service CI/CD.",
 "Modular monolith: one deployment with strict module boundaries; often the best of both.",
 "'Distributed monolith' is the failure case: services that must all be deployed together."],
"A five-person startup splits its product into 12 microservices because large companies do. Most of their time goes into deployment pipelines and debugging calls between services instead of building features. They merge back into one modular application, and later extract only the video-processing part, which really does need to scale separately.",
`
#  Monolith                           Microservices
#
#  +--------------------------+       [ API gateway ]
#  |  one application         |        /      |       \\
#  |  users | orders | pay    |    [users] [orders] [payments]     each deployable alone
#  +------------+-------------+       |       |         |
#               |                   [db]    [db]      [db]         each owns its data
#        [ one database ]              \\      |        /
#                                     [ message broker ]           events between services

# Modular monolith: one deployment, enforced boundaries
# shop/
#   users/      api.py  service.py  models.py     <- other modules may import only users.api
#   orders/     api.py  service.py  models.py
#   payments/   api.py  service.py  models.py

# Saga: a business transaction across services, with compensation
def place_order_saga(order):
    reservation = inventory.reserve(order.items)
    try:
        payment = payments.charge(order.customer_id, order.total)
    except PaymentFailed:
        inventory.release(reservation)            # compensate the earlier step
        raise
    try:
        shipping.schedule(order)
    except ShippingFailed:
        payments.refund(payment)                  # compensate
        inventory.release(reservation)
        raise
`,
"Amazon moved from a monolith to services around 2002, and Netflix did so from 2009. James Lewis and Martin Fowler defined the term microservices in 2014. A counter-movement followed: in 2023 Amazon Prime Video reported cutting costs by 90% by moving one system back to a monolith, renewing interest in the modular monolith.",
[["Martin Fowler: Microservices", "https://martinfowler.com/articles/microservices.html"],
 ["Martin Fowler: MonolithFirst", "https://martinfowler.com/bliki/MonolithFirst.html"],
 ["microservices.io pattern catalogue", "https://microservices.io/patterns/"]]),

X("Reliability: availability, redundancy and handling failure",
["At scale, failure is normal. With thousands of machines, some disk, server or network link is broken at any given moment. Reliable systems are not built from components that never fail; they are built so that the system continues to work when components do. The first design question is always: what happens when this part dies?",
 "Availability is the share of time the system is working, expressed in 'nines'. 99.9% (three nines) allows about 8.8 hours of downtime a year; 99.99% allows about 53 minutes; 99.999% about 5 minutes. Each extra nine costs far more than the last. Three terms define the target: an SLI (service level indicator) is what you measure, such as the fraction of requests that succeed; an SLO (objective) is the internal goal, such as 99.9%; an SLA (agreement) is the promise to customers, with penalties. Dependencies multiply: a service that needs three others, each 99.9% available, can be at best about 99.7% available.",
 "The basic tool is redundancy: no single point of failure. Run several instances behind a load balancer, across separate availability zones, with a replicated database. Then make calls between services defensive. Set a timeout on every call. Retry transient failures with exponential backoff and jitter, but only idempotent operations. Use a circuit breaker to stop calling a service that is failing. Isolate resources with bulkheads so one slow dependency cannot use up everything. And degrade gracefully: if recommendations are down, show the page without them."],
["Availability = uptime / total time. 99.9% is about 8.8 hours a year; 99.99% about 53 minutes.",
 "SLI = the measurement. SLO = the target. SLA = the contract. Error budget = 100% minus the SLO.",
 "Eliminate single points of failure with redundancy across zones.",
 "Timeouts on every network call; retries with backoff and jitter; circuit breakers.",
 "Graceful degradation: lose a feature, not the whole service.",
 "Health checks and automatic failover remove the need for a human to react at 3 am.",
 "RTO: how quickly you must recover. RPO: how much data you can afford to lose.",
 "Test failure on purpose (chaos engineering); an untested failover usually does not work."],
"An online shop's product page calls a reviews service. The reviews service becomes slow; with no timeout, every web server thread ends up waiting on it and the entire site stops responding. One slow, non-essential feature took down checkout. A 300-millisecond timeout, a circuit breaker and a fallback of 'reviews unavailable' would have kept the site selling.",
`
# Availability arithmetic
#   99%     -> 3.65 days of downtime per year
#   99.9%   -> 8.8 hours
#   99.99%  -> 53 minutes
#   99.999% -> 5 minutes
#
#   in series  (A needs B and C):   0.999 * 0.999 * 0.999 = 99.7%
#   in parallel (two copies):       1 - (0.001 * 0.001)   = 99.9999%

# Defensive call: timeout + retry with backoff + fallback
import random, time, httpx

def get_reviews(product_id: int) -> list:
    for attempt in range(3):
        try:
            r = httpx.get(f"http://reviews/products/{product_id}", timeout=0.3)
            if r.status_code < 500:                       # 4xx will not get better: do not retry
                return r.json() if r.status_code == 200 else []
        except httpx.TransportError:                      # timeouts and connection errors
            pass
        if attempt < 2:
            time.sleep(0.1 * 2 ** attempt + random.uniform(0, 0.05))
    return []                               # graceful degradation: page still renders

# Redundant layout across availability zones
#
#                 [ load balancer ]
#                 /               \\
#        zone A  /                 \\  zone B
#     [app] [app]                 [app] [app]
#     [db primary] --replicates--> [db standby]     automatic failover
`,
"Jim Gray's 1985 paper 'Why Do Computers Stop and What Can Be Done About It?' founded the study of availability. Netflix introduced Chaos Monkey in 2011, deliberately killing its own servers in production. Google's 2016 book 'Site Reliability Engineering' spread SLOs and error budgets.",
[["Google SRE Book (free online)", "https://sre.google/sre-book/table-of-contents/"],
 ["Google SRE: Service Level Objectives", "https://sre.google/sre-book/service-level-objectives/"],
 ["AWS Builders' Library: Timeouts, retries and backoff with jitter", "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/"],
 ["Azure: Cloud design patterns", "https://learn.microsoft.com/en-us/azure/architecture/patterns/"]]),

X("Worked design: a URL shortener",
["A URL shortener such as bit.ly turns a long web address into a short one and redirects anyone who visits the short one. It is the classic first system design exercise because it is small enough to finish and still touches the main ideas: estimating scale, generating IDs, choosing storage, caching and scaling a read-heavy workload.",
 "Requirements. Functional: given a long URL, return a short one; given a short one, redirect to the original; optionally custom aliases, expiry and click counts. Non-functional: redirects must be very fast and highly available, since a broken link is a broken promise, and short codes must not be guessable in sequence. Scale, from the earlier estimate: about 40 writes and 4,000 reads per second, 6 billion links over five years. It is overwhelmingly read-heavy.",
 "The central question is how to create the short code. With 62 characters (a-z, A-Z, 0-9), seven characters give 62 to the power 7, about 3.5 trillion combinations, which is plenty. Option one: hash the long URL and take the first seven characters; it is simple but two URLs can collide and must be checked. Option two: give every link a unique number from a counter and write that number in base 62. No collisions are possible, and it is the usual choice; to avoid one central counter, each server takes a range of IDs at a time. To keep codes unguessable, the number is scrambled with a reversible function before encoding, or random codes are used with a uniqueness check. Storage is one simple lookup by key, so a key-value store or a sharded SQL table both work. Since 20% of links take 80% of the traffic, a Redis cache in front of the database absorbs most reads. The redirect uses HTTP 302 if you want to count every click, or 301 if you would rather let browsers cache it and reduce load."],
["API: POST /v1/links {long_url} -> {short_url};  GET /{code} -> redirect.",
 "7 characters of base 62 = about 3.5 trillion codes.",
 "ID generation: counter + base-62 encoding (no collisions) beats hashing (collisions).",
 "Data: code (primary key), long_url, created_at, expires_at, owner.",
 "Read path: cache first, then database; the cache serves most requests.",
 "301 = permanent, cached by browsers, fewer requests. 302 = temporary, every click reaches you, enabling analytics.",
 "Click analytics go to a queue and are aggregated asynchronously, never on the redirect path.",
 "Protect creation with rate limits and block malicious destinations."],
"A marketing team puts a short link in a television advert. For two minutes traffic is 50 times normal. Because redirects are served from the cache by stateless servers behind a load balancer that auto-scales, the spike is absorbed; click counting falls slightly behind in the queue and catches up afterwards.",
`
import string

ALPHABET = string.digits + string.ascii_letters          # 62 characters

def encode(n: int) -> str:
    if n == 0:
        return ALPHABET[0]
    out = []
    while n:
        n, rem = divmod(n, 62)
        out.append(ALPHABET[rem])
    return "".join(reversed(out))

print(encode(125_000_000_000))        # a short 7-character code

# write path
async def create_link(long_url: str) -> str:
    link_id = await id_generator.next()               # unique number (range-allocated per server)
    code = encode(scramble(link_id))                  # reversible shuffle, so codes are not sequential
    await db.execute("INSERT INTO links (code, long_url) VALUES ($1, $2)", code, long_url)
    return f"https://sho.rt/{code}"

# read path: cache-aside, then redirect
@app.get("/{code}")
async def redirect(code: str):
    url = await cache.get(code)
    if url is None:
        url = await db.fetchval("SELECT long_url FROM links WHERE code = $1", code)
        if url is None:
            raise HTTPException(status_code=404)
        await cache.set(code, url, ex=86400)
    await queue.publish("clicks", {"code": code})     # analytics, off the hot path
    return RedirectResponse(url, status_code=302)

# Architecture
#  client -> CDN / load balancer -> stateless API servers -> Redis cache -> database (replicated, sharded by code)
#                                            \\-> queue -> click-analytics workers -> analytics store
`,
"TinyURL, launched by Kevin Gilbertson in 2002, was the first well-known shortener. Bitly (2008) rose with Twitter's 140-character limit. The problem became a standard interview question in the 2010s.",
[["MDN: Redirections in HTTP", "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Redirections"],
 ["Redis documentation", "https://redis.io/docs/latest/"],
 ["Azure: Rate Limiting pattern", "https://learn.microsoft.com/en-us/azure/architecture/patterns/rate-limiting-pattern"]]),

X("Worked design: a chat application",
["A chat system such as WhatsApp or Slack is a contrasting exercise. A URL shortener is stateless and read-heavy. Chat is real-time, built on long-lived connections, write-heavy, and concerned with ordering and delivery guarantees.",
 "Requirements. Functional: one-to-one and group messages, delivery to users who are online immediately and to offline users when they return, message history, online presence, and delivered/read receipts. Non-functional: delivery in well under a second, no lost messages, correct order within a conversation, and support for millions of simultaneous connections.",
 "Design. A plain HTTP request and response cannot push to a client, so each client holds an open WebSocket connection to a chat server. Because a server holds connections in memory, these servers are stateful: you must know which server a given user is connected to. A registry, typically Redis, maps each user to their current server. When Anu sends Bala a message, her chat server first stores it durably, then looks up Bala's server and forwards the message through a message broker; that server pushes it down Bala's socket. If Bala is offline, the message stays in storage and a push notification is sent through Apple or Google. Each message gets an ID that increases within its conversation, so clients can sort messages and detect gaps, and clients acknowledge receipt so that the server can resend anything unacknowledged. Message history is a huge, append-only, write-heavy data set read by conversation and time, which suits a wide-column store such as Cassandra partitioned by conversation ID. For a small group, a message is fanned out to each member; very large channels are handled by having members pull."],
["WebSocket for two-way real-time delivery; long polling as a fallback.",
 "Chat servers are stateful (they hold connections); a registry maps user -> server.",
 "Store the message before acknowledging it to the sender; never rely on memory alone.",
 "Per-conversation increasing IDs give order; client acknowledgements give reliable delivery.",
 "Offline users: keep messages in storage and send a push notification.",
 "Presence: heartbeats with an expiry in Redis.",
 "History: wide-column store keyed by (conversation_id, message_id).",
 "Media files go to object storage and a CDN; the message carries only a link.",
 "End-to-end encryption means the server stores only ciphertext it cannot read."],
"A user sends a message while on a train. The connection drops before the acknowledgement arrives, so the app shows a clock icon and resends when the signal returns. The server recognises the client-generated message ID and does not store a duplicate. The recipient, who was offline, gets a push notification and receives the message, in the right order, on reconnecting.",
`
#  [Anu's phone] ==WebSocket==> [chat server 1]              [chat server 2] ==WebSocket==> [Bala's phone]
#                                     |  1. save                    ^
#                                     v                             | 4. push down the socket
#                              [message store]                      |
#                                     |  2. where is Bala? -> server 2   (Redis registry)
#                                     +------ 3. publish to server 2's channel ------+
#                                            (if offline: push notification instead)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()
local_connections: dict[int, WebSocket] = {}           # users connected to THIS server

@app.websocket("/ws/{user_id}")
async def chat(ws: WebSocket, user_id: int):
    await ws.accept()
    local_connections[user_id] = ws
    await registry.set(f"conn:{user_id}", SERVER_ID, ex=60)        # who is where (with expiry)
    try:
        while True:
            msg = await ws.receive_json()        # {"client_id": "...", "to": 9, "text": "hi"} or a ping every 20 s
            await registry.expire(f"conn:{user_id}", 60)           # heartbeat keeps the user 'online'
            if msg.get("type") == "ping":
                continue
            saved = await store.save(msg, sender=user_id)          # durable first, idempotent on client_id
            await ws.send_json({"ack": msg["client_id"], "message_id": saved.id})

            target_server = await registry.get(f"conn:{msg['to']}")
            if target_server:
                await broker.publish(f"server:{target_server}", saved.as_dict())
            else:
                await push.notify(msg["to"], "New message")        # offline
    except WebSocketDisconnect:
        local_connections.pop(user_id, None)
        await registry.delete(f"conn:{user_id}")

# each server listens on its own channel and delivers to its local sockets
async def deliver(event):
    ws = local_connections.get(event["to"])
    if ws:
        await ws.send_json(event)

# history table (Cassandra)
# CREATE TABLE messages (conversation_id bigint, message_id timeuuid, sender bigint, body text,
#                        PRIMARY KEY (conversation_id, message_id)) WITH CLUSTERING ORDER BY (message_id DESC);
`,
"Internet Relay Chat (IRC) dates from 1988. WhatsApp, founded in 2009, famously served 450 million users with about 32 engineers by building on Erlang, a language designed for telephone switches. The WebSocket protocol that modern web chat relies on was standardised in 2011.",
[["RFC 6455: The WebSocket Protocol", "https://www.rfc-editor.org/rfc/rfc6455"],
 ["MDN: WebSockets API", "https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API"],
 ["Apache Cassandra documentation", "https://cassandra.apache.org/doc/latest/"]]),

X("Low-level design: from requirements to classes",
["High-level design decides which services and databases exist. Low-level design (LLD), also called object-oriented design, decides what is inside one service: which classes, what each is responsible for, and how they work together. Its aim is code that is easy to understand, test and extend when requirements change, as they always do.",
 "A reliable method: first clarify the requirements and write the main use cases. Then find the nouns, which become candidate classes (parking lot, level, spot, vehicle, ticket), and the verbs, which become methods (park, leave, calculate fee). Decide the relationships: is it 'is-a' (inheritance) or 'has-a' (composition)? Prefer composition. Then look for the parts most likely to change and put each behind an interface, so a new variant can be added without editing working code. That is the open-closed principle from SOLID, and it is usually where a design pattern such as Strategy, Factory, Observer or State fits naturally.",
 "A good low-level design shows a few qualities. Each class has one clear responsibility. Classes depend on abstractions, not on each other's internals. Fixed sets of values are enums, not strings. Invalid states are hard to create. And it is no more elaborate than the problem requires: adding patterns for imagined future needs makes code harder to read, not better."],
["Steps: requirements -> use cases -> entities (nouns) -> behaviour (verbs) -> relationships -> interfaces for what varies.",
 "Single responsibility: one reason to change per class.",
 "Favour composition ('has-a') over inheritance ('is-a').",
 "Put what varies behind an interface: pricing rules, payment methods, notification channels.",
 "Use enums for fixed choices and dataclasses for plain data.",
 "Common patterns: Strategy (swap an algorithm), Factory (create objects), Observer (notify), State (behaviour by status), Singleton (one instance, use sparingly).",
 "Consider concurrency: what if two requests take the last spot at the same time?",
 "Keep it simple; add abstraction when a second real variant appears."],
"A parking-lot system charges by the hour. Six months later the business wants flat weekend rates and a monthly pass. Because fee calculation was placed behind a pricing-strategy interface, two new small classes are added and nothing that already works is touched.",
`
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import math, threading

class VehicleType(Enum):
    BIKE = 1
    CAR = 2
    TRUCK = 3

@dataclass
class Vehicle:
    plate: str
    type: VehicleType

@dataclass
class Spot:
    id: int
    fits: VehicleType
    vehicle: Vehicle | None = None
    @property
    def free(self) -> bool:
        return self.vehicle is None

@dataclass
class Ticket:
    spot: Spot
    vehicle: Vehicle
    entered: datetime = field(default_factory=datetime.now)

class PricingStrategy(ABC):                      # the part that varies
    @abstractmethod
    def fee(self, ticket: Ticket, now: datetime) -> int: ...      # whole rupees; never float for money

class HourlyPricing(PricingStrategy):
    RATES = {VehicleType.BIKE: 10, VehicleType.CAR: 30, VehicleType.TRUCK: 60}
    def fee(self, ticket, now):
        hours = max(1, math.ceil((now - ticket.entered).total_seconds() / 3600))
        return hours * self.RATES[ticket.vehicle.type]

class FlatWeekendPricing(PricingStrategy):       # added later, nothing else changed
    def fee(self, ticket, now):
        return 100

class ParkingLot:
    def __init__(self, spots: list[Spot], pricing: PricingStrategy):
        self.spots, self.pricing = spots, pricing
        self._lock = threading.Lock()            # two cars, one last spot

    def park(self, vehicle: Vehicle) -> Ticket:
        with self._lock:
            for spot in self.spots:
                if spot.free and spot.fits == vehicle.type:
                    spot.vehicle = vehicle
                    return Ticket(spot, vehicle)
        raise RuntimeError("No spot available")

    def leave(self, ticket: Ticket) -> int:
        with self._lock:
            ticket.spot.vehicle = None
        return self.pricing.fee(ticket, datetime.now())

lot = ParkingLot([Spot(1, VehicleType.CAR), Spot(2, VehicleType.BIKE)], HourlyPricing())
ticket = lot.park(Vehicle("TN01AB1234", VehicleType.CAR))
print(lot.leave(ticket))        # 30
`,
"Object-oriented design methods matured in the early 1990s with Grady Booch, James Rumbaugh and Ivar Jacobson, who then combined their notations into UML (1997). The 'Gang of Four' Design Patterns book appeared in 1994, and Robert C. Martin assembled the SOLID principles around 2000.",
[["Refactoring.Guru: Design Patterns", "https://refactoring.guru/design-patterns"],
 ["Unified Modeling Language (OMG)", "https://www.uml.org/"],
 ["Python: abc (Abstract Base Classes)", "https://docs.python.org/3/library/abc.html"]])
]});
