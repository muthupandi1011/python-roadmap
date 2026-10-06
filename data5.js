ROADMAP.push({
n: 9,
title: "Python DSA",
blurb: "Solve problems by recognising patterns, not memorising answers. Each topic goes brute force, then optimised, then complexity, then how to explain it in an interview.",
topics: [
T("Two Sum",
"Given a list of numbers and a target, find the two numbers that add up to the target. It is the classic first interview problem and teaches the idea of trading memory for speed with a hash map.",
"Finding two items in a shop whose prices add up exactly to a gift-card value, or two transactions that together match a suspicious amount.",
`
# Brute force: check every pair.  Time O(n^2), Space O(1)
def two_sum_brute(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]

# Optimised: remember what we have seen.  Time O(n), Space O(n)
def two_sum(nums, target):
    seen = {}                              # value -> index
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i

print(two_sum([2, 7, 11, 15], 9))          # [0, 1]
`,
"Two Sum is problem number 1 on LeetCode (founded 2015) and probably the most-solved coding interview question in the world. It is a special case of the subset-sum problem.",
"'For each number I need its complement, target minus n. Instead of scanning the list for it, I store the numbers seen so far in a dictionary, so each lookup is O(1). One pass, O(n) time, O(n) extra space.'"),

T("Sliding Window",
"A technique for problems about contiguous sub-arrays or substrings. Keep a 'window' with a left and right edge; slide it along, adding the new element and removing the old one, instead of recomputing everything.",
"Finding the best 7-day sales period in a year of data, or the highest request count in any 60-second window for rate limiting.",
`
# Max sum of any k consecutive numbers
# Brute force: sum every window.  Time O(n*k)
def max_sum_brute(nums, k):
    return max(sum(nums[i:i + k]) for i in range(len(nums) - k + 1))

# Optimised: slide the window.  Time O(n), Space O(1)
def max_sum(nums, k):
    window = best = sum(nums[:k])
    for i in range(k, len(nums)):
        window += nums[i] - nums[i - k]    # add new, drop old
        best = max(best, window)
    return best

print(max_sum([2, 1, 5, 1, 3, 2], 3))      # 9
`,
"The name echoes the sliding window protocol used in TCP networking since the 1970s. As a named interview pattern it was popularised by coding-interview courses in the 2010s.",
"'Neighbouring windows overlap in all but two elements, so I update the sum in O(1) by adding the entering element and subtracting the leaving one. That turns O(n*k) into O(n).'"),

T("Two Pointers",
"Use two indexes that move through the data, usually from both ends towards the middle, or one slow and one fast. It often removes the need for a nested loop on sorted data.",
"Checking whether a word is a palindrome, merging two sorted lists of timestamps, or removing duplicates from a sorted list in place.",
`
# Pair with a target sum in a SORTED list
# Brute force: all pairs, O(n^2)
# Optimised: Time O(n), Space O(1)
def pair_sum(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        total = nums[left] + nums[right]
        if total == target:
            return [left, right]
        if total < target:
            left += 1                 # need a bigger sum
        else:
            right -= 1                # need a smaller sum

print(pair_sum([1, 3, 4, 6, 9], 10))  # [0, 4]

def is_palindrome(s):
    return all(s[i] == s[-1 - i] for i in range(len(s) // 2))
`,
"Two-pointer ideas appear in classic algorithms such as the merge step of merge sort (John von Neumann, 1945) and Hoare's partition in quicksort (1959).",
"'Because the list is sorted, if the sum is too small only moving the left pointer right can increase it, and if too big only moving the right pointer left can reduce it. Each step discards one element, so it is O(n).'"),

T("Binary Search",
"Find an item in sorted data by repeatedly halving the search range: look at the middle, then discard the half that cannot contain the answer.",
"Looking up a word in a dictionary, a database index finding a row among a billion, or 'git bisect' finding which commit introduced a bug.",
`
# Brute force: linear scan, O(n)
# Optimised: Time O(log n), Space O(1)
def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

print(binary_search([1, 4, 7, 9, 12, 15], 12))    # 4

import bisect
print(bisect.bisect_left([1, 4, 7, 9], 7))        # 2
`,
"First described by John Mauchly in 1946, yet the first fully correct published version took until 1962. A bug in Java's library version went unnoticed for nine years, until 2006.",
"'The data is sorted, so comparing with the middle element tells me which half to drop. Halving each time gives O(log n): a million items need only about 20 steps. I am careful with the lo <= hi condition and the mid plus or minus one updates.'"),

T("Prefix Sum",
"Precompute a running total so that the sum of any range can be answered instantly: sum(i..j) = prefix[j+1] - prefix[i].",
"A dashboard answers 'total sales between day 40 and day 95' thousands of times a second without re-adding the numbers each time.",
`
# Brute force: sum the slice per query, O(n) each
# Optimised: O(n) to build, then O(1) per query, Space O(n)
def build_prefix(nums):
    prefix = [0]
    for n in nums:
        prefix.append(prefix[-1] + n)
    return prefix

def range_sum(prefix, i, j):          # inclusive i..j
    return prefix[j + 1] - prefix[i]

sales = [5, 3, 8, 6, 2]
p = build_prefix(sales)               # [0, 5, 8, 16, 22, 24]
print(range_sum(p, 1, 3))             # 3 + 8 + 6 = 17
`,
"Running totals are ancient bookkeeping. In computing, the 2-D version (the summed-area table) was introduced by Frank Crow in 1984 for computer graphics.",
"'Many range queries on data that does not change, so I pay O(n) once to build cumulative sums. Any range is then the difference of two prefix values, O(1) per query.'"),

T("Hash Map",
"Use a dictionary (or set) for instant lookup, counting or grouping. Many O(n^2) 'compare everything with everything' problems become O(n) with a hash map.",
"Detecting duplicate email addresses during signup import, counting word frequency, or grouping anagrams.",
`
# Group anagrams
# Brute force: compare every pair of words, O(n^2 * k)
# Optimised: Time O(n * k log k), Space O(n * k)
from collections import defaultdict

def group_anagrams(words):
    groups = defaultdict(list)
    for w in words:
        groups["".join(sorted(w))].append(w)    # same letters -> same key
    return list(groups.values())

print(group_anagrams(["eat", "tea", "tan", "ate", "nat"]))

def has_duplicate(nums):
    return len(set(nums)) != len(nums)
`,
"Hashing was invented by Hans Peter Luhn at IBM in 1953. Python's dict is one of the most carefully optimised hash tables anywhere.",
"'I need a signature that is identical for all anagrams. Sorted letters work. I use that as a dictionary key and append each word to its group, so one pass over the words is enough.'"),

T("Stack",
"Last-in, first-out. Reach for a stack when the most recent unfinished thing must be dealt with first: matching brackets, undo, nested structures, 'next greater element'.",
"A code editor checking that every opening bracket has a matching closing one, or a browser's Back button.",
`
# Valid parentheses.  Time O(n), Space O(n)
def is_valid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack

print(is_valid("{[()]}"), is_valid("([)]"))     # True False
`,
"Described by Alan Turing in 1946 and by Friedrich Bauer and Klaus Samelson in 1957. Every function call your program makes uses the call stack.",
"'Brackets must close in the reverse order they opened, which is exactly LIFO. I push openers; on a closer I pop and check it matches. At the end the stack must be empty.'"),

T("Queue",
"First-in, first-out. Use a queue when things must be handled in arrival order, and for level-by-level exploration (BFS). In Python use collections.deque.",
"Customer-support tickets handled in order, a printer's job list, or counting recent requests in the last few seconds.",
`
# Count requests in the last 3000 ms.  Each call O(1) amortised
from collections import deque

class RecentCounter:
    def __init__(self):
        self.q = deque()
    def ping(self, t):
        self.q.append(t)
        while self.q[0] < t - 3000:
            self.q.popleft()          # drop old requests
        return len(self.q)

rc = RecentCounter()
print(rc.ping(1), rc.ping(100), rc.ping(3001), rc.ping(3002))   # 1 2 3 3
`,
"Queueing theory began with Agner Erlang's work on telephone exchanges in 1909. Queues are at the heart of operating-system scheduling.",
"'Old requests leave in the same order they arrived, so a queue fits. I append the new time and pop from the left while the oldest is outside the window. Each element is added and removed once, so it is O(1) amortised.'"),

T("Linked List",
"A chain of nodes where each node holds a value and a pointer to the next node. Inserting or deleting is O(1) once you hold the node just before that position, but reaching the k-th item is O(n).",
"A music playlist's next/previous song, the browser history chain, or the internals of an LRU cache.",
`
class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

# Reverse a linked list.  Time O(n), Space O(1)
def reverse(head):
    prev = None
    while head:
        nxt = head.next        # save
        head.next = prev       # flip the pointer
        prev, head = head, nxt # advance
    return prev

head = reverse(Node(1, Node(2, Node(3))))
while head:
    print(head.val)            # 3 2 1
    head = head.next
`,
"Invented in 1955-56 by Allen Newell, Cliff Shaw and Herbert Simon for their IPL language and early AI programs. Lisp (1958) was built entirely on linked lists.",
"'I walk the list once with three pointers: previous, current and next. At each node I save next, point current back to previous, then move forward. O(n) time and O(1) space. A recursive version uses O(n) stack.'"),

T("Trees",
"A hierarchy of nodes: one root, each node having children, with no cycles. In a binary tree each node has at most two children. Most tree problems are solved with recursion.",
"The folder structure on your computer, the HTML DOM of a web page, a company's organisation chart, or comment threads.",
`
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

# Maximum depth.  Time O(n), Space O(h) where h is the height
def max_depth(node):
    if not node:
        return 0
    return 1 + max(max_depth(node.left), max_depth(node.right))

root = TreeNode(1, TreeNode(2, TreeNode(4)), TreeNode(3))
print(max_depth(root))         # 3
`,
"Tree diagrams go back centuries (family trees). Mathematician Arthur Cayley studied them formally in 1857. They became core computer science with compilers and file systems in the 1960s.",
"'A tree's depth is one plus the deeper of its two subtrees, and an empty tree has depth zero. That definition is the recursive solution. It visits each node once: O(n) time, O(h) stack.'"),

T("BST",
"A Binary Search Tree is a binary tree with an ordering rule: everything in the left subtree is smaller than the node, and everything in the right is larger. Search, insert and delete are O(log n) when the tree is balanced.",
"Database indexes use B-trees, a close relative, to find one row in billions. Sorted maps and autocomplete ranges use the same idea.",
`
# Search.  Time O(h): O(log n) balanced, O(n) worst case
def search(node, target):
    while node:
        if target == node.val:
            return True
        node = node.left if target < node.val else node.right
    return False

# Validate a BST.  Time O(n)
def is_bst(node, low=float("-inf"), high=float("inf")):
    if not node:
        return True
    if not low < node.val < high:
        return False
    return is_bst(node.left, low, node.val) and is_bst(node.right, node.val, high)
`,
"BSTs were discovered independently around 1960 by Windley, Booth, Colin and Hibbard. Self-balancing versions followed: AVL trees (1962), B-trees (1970) and red-black trees (1972).",
"'To validate, checking only a node's direct children is the classic mistake. Every node must lie within a range set by all its ancestors, so I pass a low and a high bound down the recursion and tighten it at each step.'"),

T("DFS",
"Depth-First Search explores as far as possible along one path before backtracking. It is written with recursion or an explicit stack.",
"Solving a maze, finding all files in nested folders, detecting circular dependencies between packages, or counting connected regions in a map.",
`
# Number of islands in a grid.  Time O(rows*cols), Space O(rows*cols)
def count_islands(grid):
    rows, cols = len(grid), len(grid[0])
    def sink(r, c):
        if 0 <= r < rows and 0 <= c < cols and grid[r][c] == 1:
            grid[r][c] = 0                       # mark visited
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                sink(r + dr, c + dc)
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1:
                count += 1
                sink(r, c)
    return count

print(count_islands([[1, 1, 0], [0, 0, 0], [0, 1, 1]]))   # 2
`,
"Charles Pierre Tremaux described it as a maze-solving strategy in the 19th century. Robert Tarjan's 1972 paper showed its power for graph algorithms.",
"'Each time I find unvisited land I count one island and run DFS to mark the whole connected piece as visited, so it is not counted again. Every cell is visited a constant number of times, so O(rows times cols).'"),

T("BFS",
"Breadth-First Search explores level by level: all neighbours first, then their neighbours. It uses a queue and finds the shortest path in an unweighted graph.",
"'People you may know' (friends of friends) on a social network, or the fewest moves to reach a square in a game.",
`
# Shortest path length in an unweighted graph.  Time O(V + E), Space O(V)
from collections import deque

def shortest_path(graph, start, goal):
    queue = deque([(start, 0)])
    seen = {start}
    while queue:
        node, dist = queue.popleft()
        if node == goal:
            return dist
        for nxt in graph[node]:
            if nxt not in seen:
                seen.add(nxt)
                queue.append((nxt, dist + 1))
    return -1

g = {"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": ["E"], "E": []}
print(shortest_path(g, "A", "E"))      # 3
`,
"Invented by Konrad Zuse in 1945 (unpublished) and rediscovered by Edward F. Moore in 1959 for finding the shortest way out of a maze.",
"'BFS reaches nodes in order of distance from the start, so the first time I reach the goal is by a shortest path. I use a queue plus a visited set so each node is processed once: O(V + E).'"),

T("Heap",
"A heap keeps the smallest (or largest) item instantly available. Use it for 'top K', 'K-th largest', merging sorted streams and scheduling by priority.",
"Showing the top 10 trending hashtags out of millions, or always dispatching the nearest available driver.",
`
# K-th largest element
# Brute force: sort everything, O(n log n)
# Optimised: heap of size k.  Time O(n log k), Space O(k)
import heapq

def kth_largest(nums, k):
    heap = []
    for n in nums:
        heapq.heappush(heap, n)
        if len(heap) > k:
            heapq.heappop(heap)        # throw away the smallest
    return heap[0]

print(kth_largest([3, 2, 1, 5, 6, 4], 2))    # 5
`,
"Invented by J. W. J. Williams in 1964 for heapsort. Heaps also power Dijkstra's shortest-path algorithm in its efficient form.",
"'I do not need a full sort, only the k largest. I keep a min-heap of size k; whenever it grows beyond k I pop the smallest. What remains are the k largest and the root is the k-th. O(n log k).'"),

T("Graph",
"Nodes (vertices) connected by edges. Graphs may be directed or undirected, weighted or unweighted. In Python they are usually stored as an adjacency list: a dict mapping each node to its neighbours.",
"Road maps for navigation, social networks, flight routes, and the order in which packages or courses must be completed.",
`
# Can all courses be finished? (cycle detection, topological sort)
# Time O(V + E), Space O(V + E)
from collections import deque

def can_finish(n, prerequisites):
    graph = {i: [] for i in range(n)}
    indegree = [0] * n
    for course, pre in prerequisites:
        graph[pre].append(course)
        indegree[course] += 1
    queue = deque(i for i in range(n) if indegree[i] == 0)
    done = 0
    while queue:
        node = queue.popleft()
        done += 1
        for nxt in graph[node]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)
    return done == n

print(can_finish(2, [[1, 0]]), can_finish(2, [[1, 0], [0, 1]]))   # True False
`,
"Graph theory began in 1736 when Leonhard Euler solved the Seven Bridges of Konigsberg puzzle. Dijkstra's shortest-path algorithm dates from 1956, and Kahn's topological sort from 1962.",
"'Courses and prerequisites form a directed graph. I repeatedly take courses with no remaining prerequisites (in-degree zero) and remove their edges. If I can take all of them there is no cycle. This is Kahn's algorithm, O(V + E).'"),

T("Recursion",
"A function that solves a problem by calling itself on a smaller version of the same problem. It needs a base case that stops the recursion and a recursive case that moves towards it.",
"Walking through nested folders, flattening nested JSON, or computing the total price of a product bundle that contains other bundles.",
`
# Flatten a nested list.  Time O(n * depth) worst case, Space O(depth)
def flatten(items):
    result = []
    for item in items:
        if isinstance(item, list):
            result.extend(flatten(item))     # recursive case
        else:
            result.append(item)              # base case
    return result

print(flatten([1, [2, [3, 4]], 5]))          # [1, 2, 3, 4, 5]

def factorial(n):
    return 1 if n <= 1 else n * factorial(n - 1)
`,
"Recursion in programming arrived with Lisp (John McCarthy, 1958) and ALGOL 60. Python limits recursion depth to about 1000 by default.",
"'I state the base case first: an item that is not a list is appended. For a list I trust the function to flatten it and extend my result. Each element is visited once but copied once per nesting level by extend, so it is O(n) for shallow nesting, and stack depth equals the nesting depth.'"),

T("Backtracking",
"Build a solution step by step. When a path cannot lead to a valid answer, undo the last step (backtrack) and try the next option. The pattern is: choose, explore, un-choose.",
"Solving Sudoku, generating every possible timetable, or listing all valid seating arrangements.",
`
# All subsets.  Time O(n * 2^n), Space O(n) for the recursion
def subsets(nums):
    result, path = [], []
    def explore(start):
        result.append(path[:])            # record a copy
        for i in range(start, len(nums)):
            path.append(nums[i])          # choose
            explore(i + 1)                # explore
            path.pop()                    # un-choose
    explore(0)
    return result

print(subsets([1, 2, 3]))
# [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]
`,
"The term was coined by American mathematician D. H. Lehmer in the 1950s. The eight queens puzzle (1848) is the classic backtracking problem.",
"'At each index I decide what to add next. I append a choice, recurse, then pop it to restore the state before trying the next one. There are 2^n subsets and copying each costs up to n, so O(n * 2^n).'"),

T("Dynamic Programming",
"Solve a problem by breaking it into overlapping sub-problems and storing each answer so it is computed only once. Top-down is recursion plus a cache (memoisation); bottom-up fills a table (tabulation).",
"Finding the fewest coins or notes to give as change, spell-checker edit distance, and route planning.",
`
# Fewest coins to make an amount
# Brute force: try every combination, exponential
# Optimised: Time O(amount * coins), Space O(amount)
def coin_change(coins, amount):
    dp = [0] + [float("inf")] * amount       # dp[a] = fewest coins for a
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] != float("inf") else -1

print(coin_change([1, 2, 5], 11))            # 3  (5 + 5 + 1)

from functools import cache
@cache
def fib(n): return n if n < 2 else fib(n - 1) + fib(n - 2)
`,
"Invented by Richard Bellman at RAND in the 1950s. He chose the impressive name 'dynamic programming' partly to hide the mathematical research from a hostile boss.",
"'I define dp[a] as the fewest coins for amount a. For each a I try every coin c: dp[a] is the minimum of dp[a - c] + 1. The base case is dp[0] = 0. Every sub-amount is solved once, giving O(amount times coins).'")
]});

ROADMAP.push({
n: 10,
title: "Python + AI / GenAI",
blurb: "Connecting Python to large language models: APIs, prompts, embeddings, RAG, tools and agents, ending in a production customer-support AI.",
topics: [
T("LLM API",
"A Large Language Model (LLM) API lets your program send text to a model such as Claude or GPT over HTTP and get generated text back. You send a list of messages and pay per token (a piece of a word).",
"A helpdesk tool sends the customer's question to the model and shows the drafted reply to a support agent.",
`
import anthropic                      # pip install anthropic

client = anthropic.Anthropic()        # reads ANTHROPIC_API_KEY

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=2000,
    system="You are a polite support assistant for an online store.",
    messages=[{"role": "user", "content": "Where is my order 1042?"}],
)
# the reply is a list of blocks; print the text ones
print("".join(b.text for b in response.content if b.type == "text"))
print(response.usage.input_tokens, response.usage.output_tokens)
`,
"The Transformer architecture behind LLMs was introduced by Google researchers in the 2017 paper 'Attention Is All You Need'. OpenAI opened the GPT-3 API in 2020, ChatGPT launched in November 2022, and Anthropic's Claude followed in 2023."),

T("FastAPI for AI services",
"Wrapping the LLM call in your own API so web and mobile apps talk to your backend, never directly to the model provider. Your backend holds the API key, adds authentication, logging and limits, and streams the answer.",
"A website's chat widget calls POST /chat on your FastAPI server, which calls the LLM and streams the reply back token by token.",
`
import anthropic
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI()
client = anthropic.AsyncAnthropic()

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(req: ChatRequest):
    async def generate():
        async with client.messages.stream(
            model="claude-opus-5-5", max_tokens=2000,
            messages=[{"role": "user", "content": req.message}],
        ) as stream:
            async for text in stream.text_stream:
                yield text
    return StreamingResponse(generate(), media_type="text/plain")
`,
"FastAPI (2018) became the default framework for AI backends because it is async, streams well and validates data with Pydantic, which the AI SDKs also use."),

T("Prompt Engineering",
"Writing instructions that get reliable, useful output from a model. Key techniques: give a clear role and task, supply context, show examples (few-shot), specify the output format, and ask the model to reason step by step when needed.",
"A vague prompt, 'summarise this', gives random results. A precise prompt with audience, length and format gives the same clean three-bullet summary for every support ticket.",
`
SYSTEM = """You are a support assistant for ShopKart.
Rules:
- Answer only from the provided context. If the answer is not there, say you do not know.
- Reply in at most 3 short sentences, in a friendly tone.
- Never promise refunds; direct refund requests to a human agent."""

def build_prompt(context: str, question: str) -> str:
    return f"""<context>
{context}
</context>

<question>{question}</question>

Answer the question using only the context above."""
`,
"The practice emerged with GPT-3 in 2020, when people found that wording changed results dramatically. Few-shot prompting comes from the GPT-3 paper and 'chain-of-thought' prompting from Google researchers in 2022."),

T("Embeddings",
"An embedding turns text into a list of numbers (a vector) that captures its meaning. Texts with similar meaning get vectors that are close together, which makes search by meaning possible, not just by keyword.",
"A customer types 'my parcel hasn't come'. Embedding search finds the help article titled 'Delayed delivery' even though the two share no words.",
`
from sentence_transformers import SentenceTransformer   # pip install sentence-transformers
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")
docs = ["Delayed delivery policy", "How to reset your password", "Refund timelines"]
doc_vecs = model.encode(docs, normalize_embeddings=True)

query = model.encode("my parcel has not come", normalize_embeddings=True)
scores = doc_vecs @ query                 # cosine similarity
print(docs[int(np.argmax(scores))])       # Delayed delivery policy
`,
"Word embeddings became famous with Google's word2vec in 2013 (Tomas Mikolov). Sentence-level embeddings followed with BERT (2018) and Sentence-BERT (2019)."),

T("Vector Database",
"A database built to store embeddings and quickly find the vectors nearest to a query vector, even among millions, using approximate nearest-neighbour indexes such as HNSW. Examples: pgvector, Chroma, Qdrant, Pinecone, Milvus (FAISS is a search library that many of them build on).",
"Storing embeddings of 2 million product descriptions and returning the 5 most similar to a shopper's query in a few milliseconds.",
`
import chromadb                        # pip install chromadb

client = chromadb.Client()
articles = client.create_collection("help_articles")

articles.add(
    ids=["a1", "a2", "a3"],
    documents=["Orders are delivered in 3-5 days.",
               "Refunds are processed within 7 working days.",
               "Reset your password from the login page."],
    metadatas=[{"topic": "shipping"}, {"topic": "refund"}, {"topic": "account"}],
)
result = articles.query(query_texts=["when will I get my money back"], n_results=1)
print(result["documents"][0])          # the refund article
`,
"Facebook released the FAISS similarity-search library in 2017. Dedicated vector databases boomed in 2022-2023 with generative AI, and pgvector (2021) brought vector search into PostgreSQL."),

T("RAG",
"Retrieval-Augmented Generation: before asking the model, retrieve relevant documents from your own data and put them in the prompt. The model answers from those facts instead of only from memory, which reduces made-up answers and keeps knowledge current.",
"A company chatbot answers 'What is our leave policy?' from the actual HR handbook, quoting the correct section, even though the model was never trained on it.",
`
def answer(question: str) -> str:
    # 1. Retrieve
    hits = articles.query(query_texts=[question], n_results=3)
    context = chr(10).join(hits["documents"][0])
    # 2. Augment
    prompt = f"Context:{chr(10)}{context}{chr(10)}{chr(10)}Question: {question}"
    # 3. Generate
    response = client_llm.messages.create(
        model="claude-opus-5-5", max_tokens=2000,
        system="Answer only from the context. If it is not there, say you do not know.",
        messages=[{"role": "user", "content": prompt}])
    return "".join(b.text for b in response.content if b.type == "text")

# Indexing step, done once: load documents -> split into chunks -> embed -> store
`,
"The name comes from a 2020 paper by Patrick Lewis and colleagues at Facebook AI Research. It became the standard way to connect LLMs to private data from 2023 onward."),

T("Tool Calling",
"Also called function calling. You describe your functions to the model (name, purpose, parameters). The model replies with a structured request to call one; your code runs it and sends the result back, and the model writes the final answer. The model never runs code itself.",
"A customer asks 'Where is my order 1042?'. The model requests get_order_status(order_id=1042), your code queries the database, and the model replies 'It shipped yesterday and arrives on Friday.'",
`
tools = [{
    "name": "get_order_status",
    "description": "Look up the current status of a customer's order.",
    "input_schema": {"type": "object",
                     "properties": {"order_id": {"type": "integer"}},
                     "required": ["order_id"]},
}]
messages = [{"role": "user", "content": "Where is my order 1042?"}]
resp = client.messages.create(model="claude-opus-5-5", max_tokens=2000,
                              tools=tools, messages=messages)

if resp.stop_reason == "tool_use":
    call = next(b for b in resp.content if b.type == "tool_use")
    result = get_order_status(**call.input)          # YOUR code runs it
    messages += [{"role": "assistant", "content": resp.content},
                 {"role": "user", "content": [{"type": "tool_result",
                  "tool_use_id": call.id, "content": str(result)}]}]
    final = client.messages.create(model="claude-opus-5-5", max_tokens=2000,
                                   tools=tools, messages=messages)
`,
"OpenAI introduced function calling in June 2023 and other providers quickly followed. In November 2024 Anthropic published the Model Context Protocol (MCP), an open standard for connecting models to tools."),

T("Agents",
"An agent is an LLM running in a loop: it decides what to do, calls a tool, looks at the result, and repeats until the task is done. The model, not your code, chooses the sequence of steps.",
"A support agent handles 'I got the wrong item': it looks up the order, checks the return policy, creates a return label and emails the customer, all in one conversation.",
`
def run_agent(user_message: str, max_steps: int = 8) -> str:
    messages = [{"role": "user", "content": user_message}]
    for _ in range(max_steps):                       # always cap the loop
        resp = client.messages.create(model="claude-opus-5-5", max_tokens=1000,
                                      tools=tools, messages=messages)
        if resp.stop_reason != "tool_use":
            return "".join(b.text for b in resp.content if b.type == "text")   # finished
        messages.append({"role": "assistant", "content": resp.content})
        results = []
        for block in resp.content:
            if block.type == "tool_use":
                output = TOOL_FUNCTIONS[block.name](**block.input)
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": str(output)})
        messages.append({"role": "user", "content": results})
    return "Stopped: too many steps."
`,
"The 'reason then act' loop was described in the ReAct paper (Princeton and Google, 2022). AutoGPT made agents a public sensation in 2023, and by 2025 coding agents were in everyday professional use."),

T("LangChain",
"An open-source framework of building blocks for LLM applications: prompt templates, model wrappers, document loaders, text splitters, retrievers and output parsers, chained together with the | operator.",
"Building a 'chat with your PDFs' prototype in an afternoon: a loader reads the PDFs, a splitter chunks them, a vector store indexes them and a chain answers questions.",
`
from langchain_anthropic import ChatAnthropic          # pip install langchain-anthropic
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

prompt = ChatPromptTemplate.from_messages([
    ("system", "You classify support tickets as: billing, shipping or account."),
    ("human", "{ticket}"),
])
llm = ChatAnthropic(model="claude-opus-5-5")
chain = prompt | llm | StrOutputParser()               # LCEL pipeline

print(chain.invoke({"ticket": "I was charged twice for one order"}))
`,
"Created by Harrison Chase and released as open source in October 2022, just before ChatGPT. It grew into one of the fastest-growing open-source projects ever."),

T("LangGraph",
"A library from the LangChain team for building agents as a graph: nodes are steps (call the model, run a tool, ask a human), edges decide what happens next, and a shared state object is passed along. It supports loops, branching, memory and human approval.",
"A refund workflow: classify the request, check the order, and if the amount is over 5,000 pause for a human manager to approve before issuing the refund.",
`
from typing import TypedDict
from langgraph.graph import StateGraph, START, END     # pip install langgraph

class State(TypedDict):
    amount: int
    decision: str

def check(state: State): return {"decision": "review" if state["amount"] > 5000 else "auto"}
def auto_refund(state: State): return {"decision": "refunded automatically"}
def human_review(state: State): return {"decision": "sent to manager"}

g = StateGraph(State)
g.add_node("check", check); g.add_node("auto", auto_refund); g.add_node("review", human_review)
g.add_edge(START, "check")
g.add_conditional_edges("check", lambda s: s["decision"], {"auto": "auto", "review": "review"})
g.add_edge("auto", END); g.add_edge("review", END)
print(g.compile().invoke({"amount": 8000, "decision": ""}))
`,
"Released in early 2024 after developers found simple chains too rigid for real agents. Its design draws on Google's Pregel graph system (2010)."),

T("Production AI",
"Everything needed to run an LLM application reliably: evaluation sets to measure quality, guardrails on input and output, tracing of every model call, cost and latency monitoring, caching, retries and fallbacks, protection against prompt injection, and privacy controls.",
"Before changing a prompt, the team runs it against 200 saved real questions and compares scores with the old prompt, so a 'small improvement' cannot silently break answers.",
`
EVAL_SET = [
    {"q": "How long do refunds take?", "must_include": "7 working days"},
    {"q": "Can I change my delivery address?", "must_include": "before dispatch"},
]

def evaluate(answer_fn) -> float:
    passed = 0
    for case in EVAL_SET:
        reply = answer_fn(case["q"])
        if case["must_include"].lower() in reply.lower():
            passed += 1
    return passed / len(EVAL_SET)

# score = evaluate(answer)
# deploy only if the score is at least as good as the current version
`,
"The field, often called LLMOps, grew out of MLOps in 2023. OWASP published its first Top 10 for LLM Applications in 2023, with prompt injection as the number one risk."),

T("Capstone: Customer Support AI",
"The full project that ties every phase together: a FastAPI service with authentication, PostgreSQL for users and conversations, Redis for caching and rate limits, RAG over help articles in a vector database, and an LLM with tools that call the CRM, order and shipping APIs.",
"A real online store's assistant: it knows who is logged in, answers policy questions from the help centre, checks live order and shipping status, and hands over to a human agent when it cannot help.",
`
# Request flow
# Customer -> FastAPI /chat
#   1. Authentication     verify the JWT, load the user          (Phase 7)
#   2. Redis              rate limit, load recent chat history   (Phase 7)
#   3. RAG                embed the question, search vector DB   (Phase 10)
#   4. LLM + tools        get_order, track_shipment, open_ticket (Phase 10)
#   5. PostgreSQL         save the conversation                  (Phase 7)
#   6. Return the reply (stream it in the real product)          (Phase 6, 7)
#   + logs, metrics, traces, retries, timeouts                   (Phase 8)

@app.post("/chat")
async def chat(req: ChatRequest, user=Depends(get_current_user)):
    await rate_limit(user.id)
    history = await load_history(user.id)
    context = await retrieve(req.message)
    reply = await run_agent(req.message, history, context, user)
    await save_turn(user.id, req.message, reply)
    return {"reply": reply}
`,
"AI customer-support assistants were among the first widely deployed LLM products in 2023-2024, because the work is mostly text and there are clear measures such as resolution rate.")
]});
