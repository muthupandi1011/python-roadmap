ROADMAP.push({
n: 23, track: "Interview practice",
title: "LeetCode Problem Bank 2: Heap, Backtracking, Graphs, DP, Intervals, Greedy, Design",
blurb: "Twenty-eight more interview classics, each solved brute force first and then the way a strong candidate solves it, with the pattern named so you can reuse it.",
topics: [
X("703. Kth Largest Element in a Stream",
["Design a class that is created with a number k and a starting list of numbers. Each call to add(val) puts a new number into the stream and returns the k-th largest number seen so far. Example: k = 3, start = [4, 5, 8, 2]. Calling add(3) returns 4, add(5) returns 5, add(10) returns 5, add(9) returns 8 and add(4) returns 8.",
 "Brute force: keep every number in a list. On each add, append the new number and sort the list, then read position k - 1 from the top. Sorting on every call costs O(n log n) per add and O(n) space, so with many calls it becomes very slow.",
 "Optimal: keep only the k largest numbers in a min-heap. The smallest of those k numbers sits at the root, and that root is exactly the k-th largest overall. On each add, push the new value and if the heap has more than k items pop the smallest. Each add is O(log k) and the heap uses O(k) space, no matter how long the stream is."],
["Pattern: top-k with a min-heap of fixed size k",
 "Brute force: O(n log n) per add, O(n) space",
 "Optimal: O(log k) per add, O(k) space",
 "Invariant: the heap always holds the k largest values seen, so heap[0] is the answer",
 "Edge cases: starting list shorter than k, duplicates, negative numbers",
 "Difficulty: Easy. Related: 215 Kth Largest Element in an Array, 347 Top K Frequent Elements"],
"Leaderboards keep the top 100 scores while millions of players send results. Monitoring systems track the 10 slowest requests in a rolling stream. Both keep a small heap instead of storing and sorting everything.",
`
import heapq

# Brute force: keep every number and sort on each add.  add is O(n log n)
class KthLargestBrute:
    def __init__(self, k, nums):
        self.k = k
        self.nums = list(nums)

    def add(self, val):
        self.nums.append(val)
        self.nums.sort(reverse=True)
        return self.nums[self.k - 1]

# Optimal: min-heap that never grows past k items.  add is O(log k), space O(k)
class KthLargest:
    def __init__(self, k, nums):
        self.k = k
        self.heap = []
        for n in nums:
            self.add(n)

    def add(self, val):
        heapq.heappush(self.heap, val)
        if len(self.heap) > self.k:
            heapq.heappop(self.heap)      # drop the smallest, it can never be k-th largest
        return self.heap[0]

kl = KthLargest(3, [4, 5, 8, 2])
print([kl.add(3), kl.add(5), kl.add(10), kl.add(9), kl.add(4)])   # [4, 5, 5, 8, 8]
kb = KthLargestBrute(3, [4, 5, 8, 2])
print([kb.add(3), kb.add(5), kb.add(10), kb.add(9), kb.add(4)])   # [4, 5, 5, 8, 8]
`,
"The binary heap was invented by J. W. J. Williams in 1964 as the data structure behind heapsort. Python's heapq module, which gives a min-heap on top of a plain list, was added in Python 2.3 in 2003.",
[["LeetCode 703", "https://leetcode.com/problems/kth-largest-element-in-a-stream/"],
 ["Python docs: heapq", "https://docs.python.org/3/library/heapq.html"]]),

X("23. Merge k Sorted Lists",
["You get a list of k linked lists, each already sorted in increasing order. Merge all of them into one sorted linked list and return its head. Example: lists [1 -> 4 -> 5], [1 -> 3 -> 4] and [2 -> 6] merge into 1 -> 1 -> 2 -> 3 -> 4 -> 4 -> 5 -> 6.",
 "Brute force: walk every list, collect all N values into one Python list, sort it and build a new linked list. That is O(N log N) time and O(N) extra space. It works, but it ignores the fact that the inputs are already sorted, and an interviewer will ask you to use that.",
 "Optimal: at any moment only the k current heads can be the next smallest node. Keep those k heads in a min-heap keyed by value. Pop the smallest, attach it to the output tail, and push the node that follows it in its own list. Every node is pushed and popped once at O(log k) cost, so the total is O(N log k) time with O(k) extra space. A tie-breaker index is stored in the tuple so Python never has to compare two ListNode objects."],
["Pattern: k-way merge with a min-heap of the current heads",
 "Brute force: O(N log N) time, O(N) space",
 "Optimal: O(N log k) time, O(k) space; divide-and-conquer pairwise merging gives the same O(N log k)",
 "Heap tuple is (value, list index, node) so ties never compare nodes",
 "Edge cases: empty outer list, some inner lists empty, all values equal",
 "Difficulty: Hard. Related: 21 Merge Two Sorted Lists, 378 Kth Smallest Element in a Sorted Matrix"],
"External sorting of files too big for memory sorts chunks separately and then k-way merges them, which is how databases run ORDER BY on large tables. Log aggregation tools merge time-sorted log streams from many servers into one timeline in exactly this way.",
`
import heapq

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build(values):
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head

def to_list(node):
    out = []
    while node:
        out.append(node.val)
        node = node.next
    return out

# Brute force: collect every value, sort, rebuild.  O(N log N) time, O(N) space
def merge_k_brute(lists):
    values = []
    for node in lists:
        values.extend(to_list(node))
    values.sort()
    return build(values)

# Optimal: min-heap of the k current heads.  O(N log k) time, O(k) space
def merge_k(lists):
    heap = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))   # i breaks ties, nodes are never compared
    dummy = tail = ListNode()
    while heap:
        val, i, node = heapq.heappop(heap)
        tail.next = node
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next

lists = [build([1, 4, 5]), build([1, 3, 4]), build([2, 6])]
print(to_list(merge_k(lists)))   # [1, 1, 2, 3, 4, 4, 5, 6]
lists = [build([1, 4, 5]), build([1, 3, 4]), build([2, 6])]
print(to_list(merge_k_brute(lists)))   # [1, 1, 2, 3, 4, 4, 5, 6]
print(to_list(merge_k([])), to_list(merge_k([None])))   # [] []
`,
"The k-way merge is the core step of external merge sort, which Donald Knuth analysed in detail in The Art of Computer Programming, Volume 3 (1973), for sorting data on magnetic tapes. Using a heap for the merge dates back to the heap structure introduced by J. W. J. Williams in 1964.",
[["LeetCode 23", "https://leetcode.com/problems/merge-k-sorted-lists/"],
 ["Python docs: heapq.merge", "https://docs.python.org/3/library/heapq.html#heapq.merge"]]),

X("621. Task Scheduler",
["A CPU gets a list of tasks, each a capital letter, and a cooldown n. The same letter must be at least n time units apart; in between the CPU can run other tasks or stay idle. Each task or idle slot takes one unit. Return the minimum total time. Example: tasks = [A, A, A, B, B, B], n = 2 gives 8, for example A B idle A B idle A B.",
 "Simulation approach: put the task counts in a max-heap. At each time unit run the task with the most remaining copies, then put it in a cooldown queue until it may run again. This builds a valid schedule and is O(T log 26), which is effectively O(T) because there are only 26 letters, but the code is longer and it needs a heap plus a queue.",
 "Optimal: count only. Let max_count be the highest frequency and num_max be how many letters have it. The most frequent letter forces a frame of (max_count - 1) blocks each of length n + 1, followed by one slot for each letter with the maximum count. That gives (max_count - 1) * (n + 1) + num_max. If there are more tasks than this frame has slots, the other tasks fill the idle gaps and no idle time is needed, so the answer is max(frame, len(tasks)). This is O(T) time and O(1) space."],
["Pattern: greedy by frequency; the most common item decides the shape",
 "Simulation: O(T log 26) time with a heap and a cooldown queue",
 "Optimal: O(T) time, O(1) space, pure counting",
 "Formula: max(len(tasks), (max_count - 1) * (n + 1) + num_max)",
 "Edge cases: n = 0 (answer is len(tasks)), all tasks the same letter, several letters tied at the maximum",
 "Difficulty: Medium. Related: 767 Reorganize String, 358 Rearrange String k Distance Apart"],
"Rate limiters that must space out requests to the same API key, and print or email queues that must not send two messages to the same user in a short window, both use the same reasoning. Operating system schedulers use the same frequency-first idea to decide what to run next.",
`
from collections import Counter, deque
import heapq

# Simulation: max-heap of remaining counts plus a cooldown queue.  O(T log 26) time
def least_interval_sim(tasks, n):
    counts = Counter(tasks)
    heap = [-c for c in counts.values()]    # negative numbers make a max-heap
    heapq.heapify(heap)
    cooldown = deque()                      # (time when ready again, remaining count)
    time = 0
    while heap or cooldown:
        time += 1
        if heap:
            remaining = heapq.heappop(heap) + 1    # one copy done, value moves toward 0
            if remaining:
                cooldown.append((time + n, remaining))
        if cooldown and cooldown[0][0] == time:
            heapq.heappush(heap, cooldown.popleft()[1])
    return time

# Optimal: count the frame built by the most frequent task.  O(T) time, O(1) space
def least_interval(tasks, n):
    counts = Counter(tasks)
    max_count = max(counts.values())
    num_max = sum(1 for c in counts.values() if c == max_count)
    frame = (max_count - 1) * (n + 1) + num_max
    return max(frame, len(tasks))

tasks = ["A", "A", "A", "B", "B", "B"]
print(least_interval(tasks, 2), least_interval_sim(tasks, 2))   # 8 8
print(least_interval(tasks, 0))                                 # 6
print(least_interval(["A", "A", "A", "B", "B", "B", "C", "C", "D", "D", "E", "E"], 2))   # 12
`,
"Scheduling jobs with separation constraints is a classic problem of operations research that has been studied since the 1950s. The round-robin idea, giving each waiting job a slot in turn, was used in the earliest time-sharing operating systems in the early 1960s.",
[["LeetCode 621", "https://leetcode.com/problems/task-scheduler/"],
 ["Python docs: collections.Counter", "https://docs.python.org/3/library/collections.html#collections.Counter"]]),

X("295. Find Median from Data Stream",
["Design a class with addNum(num), which adds a number to a growing stream, and findMedian(), which returns the median of all numbers so far. The median is the middle value when the numbers are sorted, or the average of the two middle values when the count is even. Example: add 1, add 2, findMedian gives 1.5; add 3, findMedian gives 2.0.",
 "Brute force: keep a sorted Python list and insert each new number with bisect.insort. Finding the position is O(log n) but shifting the list elements to make room is O(n), so addNum is O(n). findMedian is O(1). This is fine for a few thousand numbers and often beats fancier code in practice, but it is not the expected answer.",
 "Optimal: split the numbers into two halves. A max-heap low holds the smaller half and a min-heap high holds the larger half. Keep the sizes equal or let low have one extra element. Then the median is either the top of low or the average of the two tops. Each addNum does at most three heap operations, O(log n), and findMedian is O(1). Python has only a min-heap, so low stores negated numbers."],
["Pattern: two heaps that meet in the middle",
 "Brute force: O(n) per add with bisect.insort, O(1) median",
 "Optimal: O(log n) per add, O(1) median, O(n) space",
 "Invariant: every value in low is less than or equal to every value in high, and len(low) - len(high) is 0 or 1",
 "Push to low first, move its max to high, then rebalance: this keeps both invariants in three lines",
 "Edge cases: first element, repeated values, negative numbers",
 "Difficulty: Hard. Related: 480 Sliding Window Median, 346 Moving Average from Data Stream"],
"Latency dashboards show the median response time of a live service without storing every request. Trading systems and sensor pipelines need the running median because it ignores outliers better than the mean.",
`
import heapq
import bisect

# Brute force: sorted list with bisect.insort.  addNum O(n), findMedian O(1)
class MedianFinderBrute:
    def __init__(self):
        self.data = []

    def addNum(self, num):
        bisect.insort(self.data, num)

    def findMedian(self):
        n = len(self.data)
        mid = n // 2
        if n % 2:
            return float(self.data[mid])
        return (self.data[mid - 1] + self.data[mid]) / 2

# Optimal: two heaps.  addNum O(log n), findMedian O(1)
class MedianFinder:
    def __init__(self):
        self.low = []     # max-heap of the smaller half (values stored negated)
        self.high = []    # min-heap of the larger half

    def addNum(self, num):
        heapq.heappush(self.low, -num)
        heapq.heappush(self.high, -heapq.heappop(self.low))   # largest of low goes up
        if len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))   # keep low as big or bigger

    def findMedian(self):
        if len(self.low) > len(self.high):
            return float(-self.low[0])
        return (-self.low[0] + self.high[0]) / 2

mf = MedianFinder()
mf.addNum(1)
mf.addNum(2)
print(mf.findMedian())   # 1.5
mf.addNum(3)
print(mf.findMedian())   # 2.0

mb = MedianFinderBrute()
for x in [5, 15, 1, 3]:
    mb.addNum(x)
print(mb.findMedian())   # 4.0
`,
"The idea of keeping the two halves of a data set in opposite heaps is a standard exercise in algorithm textbooks and is often attributed to the study of order statistics in the 1970s. Streaming algorithms that approximate the median with limited memory, such as the P-square algorithm of Jain and Chlamtac (1985), were developed for exactly the case where storing all numbers is impossible.",
[["LeetCode 295", "https://leetcode.com/problems/find-median-from-data-stream/"],
 ["Python docs: bisect.insort", "https://docs.python.org/3/library/bisect.html#bisect.insort"]]),

X("46. Permutations",
["Given a list of distinct numbers, return every possible ordering of them. Example: [1, 2, 3] gives six lists: [1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]. The order of the answers does not matter on LeetCode, but the recursive solution naturally produces them in the order above.",
 "Simple version: itertools.permutations does the job in one line. It is the right call in production, but in an interview you are asked to write the recursion yourself, because the point of the problem is to show that you can build a backtracking search.",
 "Backtracking: build one permutation position by position. At each step choose a number that is not used yet, mark it, go one level deeper, and when you come back unmark it so the next loop iteration can try a different number. When the path has n elements, copy it into the result. There are n! permutations and each costs O(n) to copy, so the time is O(n * n!), and the recursion uses O(n) extra space apart from the output."],
["Pattern: backtracking (choose, explore, un-choose)",
 "Simple: itertools.permutations, same complexity but no learning value in an interview",
 "Optimal: O(n * n!) time, which is the size of the output, O(n) extra space",
 "Always append a copy of path (path[:]) to the result; appending path itself gives n! references to one list",
 "Edge cases: one element, empty list (answer is one empty permutation)",
 "Difficulty: Medium. Related: 47 Permutations II (duplicates), 31 Next Permutation, 77 Combinations"],
"Test generators enumerate every ordering of a small set of operations to find race conditions. Scheduling and routing tools try every ordering of a few jobs or stops when the count is small enough. Puzzle solvers and brute-force password research work the same way.",
`
from itertools import permutations

# Simple: standard library.  O(n * n!) time
def permute_lib(nums):
    return [list(p) for p in permutations(nums)]

# Backtracking: choose, explore, un-choose.  O(n * n!) time, O(n) extra space
def permute(nums):
    result = []
    path = []
    used = [False] * len(nums)

    def backtrack():
        if len(path) == len(nums):
            result.append(path[:])          # copy, the path keeps changing
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True                  # choose
            path.append(nums[i])
            backtrack()                     # explore
            path.pop()                      # un-choose
            used[i] = False

    backtrack()
    return result

print(permute([1, 2, 3]))   # [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]
print(permute_lib([1, 2, 3]) == permute([1, 2, 3]))   # True
print(permute([]), len(permute([1, 2, 3, 4])))   # [[]] 24
`,
"Systematic generation of permutations is old: the algorithm of B. R. Heap, which produces each next permutation with a single swap, was published in 1963. Python's itertools.permutations arrived in Python 2.6 in 2008.",
[["LeetCode 46", "https://leetcode.com/problems/permutations/"],
 ["Python docs: itertools.permutations", "https://docs.python.org/3/library/itertools.html#itertools.permutations"]]),

X("39. Combination Sum",
["Given distinct positive numbers (candidates) and a target, return all unique combinations whose sum is the target. The same number may be used any number of times, and two combinations are the same if they contain the same numbers in any order. Example: candidates [2, 3, 6, 7], target 7 gives [[2, 2, 3], [7]].",
 "Brute force: for each candidate decide how many copies to take, from 0 up to target divided by that candidate, and check every mix of counts. With itertools.product this is a few lines, but it explores the product of all count ranges even when the sum passed the target long ago, so it is exponential with no pruning.",
 "Backtracking: build a combination from a start index. From position i you may take candidates[i] again (call with i, not i + 1) or move on to later candidates, but you never go back to earlier ones. That rule means every multiset is built exactly once, in non-decreasing order, so there are no duplicates to filter. Stop a branch as soon as the remaining target would go negative. Sorting the candidates first lets you break instead of continue. The worst case is still exponential, about O(n^(target / min_candidate)), but pruning removes almost everything in practice."],
["Pattern: backtracking with a start index (combinations, not permutations)",
 "Brute force: product of count ranges, exponential with no pruning",
 "Optimal: exponential in the worst case, output-sensitive in practice; recursion depth O(target / min)",
 "Key trick: recurse with the same index i to allow reuse; use i + 1 when each number may be used once (problem 40)",
 "Edge cases: target smaller than every candidate (empty result), a candidate equal to the target",
 "Difficulty: Medium. Related: 40 Combination Sum II, 216 Combination Sum III, 377 Combination Sum IV"],
"Coin and denomination problems in payment systems, picking products that add up to a gift-card value, and building test inputs that reach a target size all use the same enumeration. Compilers and solvers use the same start-index idea to generate multisets without duplicates.",
`
from itertools import product

# Brute force: try every count of every candidate.  Exponential, no pruning
def combination_sum_brute(candidates, target):
    result = []
    ranges = [range(target // c + 1) for c in candidates]
    for counts in product(*ranges):
        if sum(c * k for c, k in zip(candidates, counts)) == target:
            combo = []
            for c, k in zip(candidates, counts):
                combo.extend([c] * k)
            result.append(combo)
    return sorted(result)

# Backtracking with a start index, each multiset built once.  Pruned exponential search
def combination_sum(candidates, target):
    candidates = sorted(candidates)
    result = []
    path = []

    def backtrack(start, remaining):
        if remaining == 0:
            result.append(path[:])
            return
        for i in range(start, len(candidates)):
            if candidates[i] > remaining:
                break                        # sorted, so later ones are too big as well
            path.append(candidates[i])
            backtrack(i, remaining - candidates[i])   # i again: reuse is allowed
            path.pop()

    backtrack(0, target)
    return result

print(combination_sum([2, 3, 6, 7], 7))         # [[2, 2, 3], [7]]
print(combination_sum_brute([2, 3, 6, 7], 7))   # [[2, 2, 3], [7]]
print(combination_sum([2, 3, 5], 8))            # [[2, 2, 2, 2], [2, 3, 3], [3, 5]]
print(combination_sum([2], 1))                  # []
`,
"The word backtracking was coined by the mathematician D. H. Lehmer in the 1950s, and the general method was described by Golomb and Baumert in their 1965 paper Backtrack Programming. The underlying question, which multisets of coins reach a sum, is the classic change-making problem.",
[["LeetCode 39", "https://leetcode.com/problems/combination-sum/"],
 ["Python docs: itertools.product", "https://docs.python.org/3/library/itertools.html#itertools.product"]]),

X("79. Word Search",
["Given a grid of letters and a word, return True if the word can be built from letters of neighbouring cells (up, down, left, right), using each cell at most once. Example: in the board A B C E / S F C S / A D E E the word ABCCED exists, SEE exists, and ABCB does not, because the B would have to be used twice.",
 "Simple version: depth-first search from every cell, carrying a set of visited positions and making a copy of the set for each branch. It is correct, but copying a set at every step adds O(L) work and memory per call, and beginners often forget to remove a cell when backtracking, which makes the search miss valid paths.",
 "Optimal: the same DFS, but mark the cell in place by writing a special character into the board, explore the four neighbours, and restore the letter afterwards. The board itself is the visited set, so no extra memory is needed beyond the recursion depth of O(L). From each of the m * n cells the search branches into at most three directions after the first step (it cannot go back to the cell it came from), giving O(m * n * 3^L) in the worst case. Early exits when the letter does not match keep it fast on real boards."],
["Pattern: grid DFS with backtracking (mark, explore, unmark)",
 "Simple: DFS with a copied visited set, O(m * n * 4^L) time and heavy memory",
 "Optimal: O(m * n * 3^L) time, O(L) recursion space, board used as the visited marker",
 "Always restore the cell after the recursive calls, even when the path failed",
 "Pruning: if a letter is needed more times in the word than it appears in the board, return False immediately",
 "Edge cases: word longer than the number of cells, one-cell board, word of length 1",
 "Difficulty: Medium. Related: 212 Word Search II (trie), 200 Number of Islands, 130 Surrounded Regions"],
"Crossword and Boggle solvers search a letter grid for dictionary words this way. The same mark-and-restore DFS appears in maze solvers, circuit routing and any search on a grid where a path may not reuse a cell.",
`
# Simple: DFS with a visited set copied per branch.  O(m*n*4^L) time, extra memory per step
def exist_simple(board, word):
    rows, cols = len(board), len(board[0])

    def dfs(r, c, i, visited):
        if i == len(word):
            return True
        if r < 0 or c < 0 or r >= rows or c >= cols:
            return False
        if (r, c) in visited or board[r][c] != word[i]:
            return False
        nxt = visited | {(r, c)}
        return (dfs(r + 1, c, i + 1, nxt) or dfs(r - 1, c, i + 1, nxt) or
                dfs(r, c + 1, i + 1, nxt) or dfs(r, c - 1, i + 1, nxt))

    return any(dfs(r, c, 0, set()) for r in range(rows) for c in range(cols))

# Optimal: mark the cell in place, restore on the way back.  O(m*n*3^L) time, O(L) space
def exist(board, word):
    rows, cols = len(board), len(board[0])

    def dfs(r, c, i):
        if i == len(word):
            return True
        if r < 0 or c < 0 or r >= rows or c >= cols or board[r][c] != word[i]:
            return False
        saved = board[r][c]
        board[r][c] = "#"                    # mark as used
        found = (dfs(r + 1, c, i + 1) or dfs(r - 1, c, i + 1) or
                 dfs(r, c + 1, i + 1) or dfs(r, c - 1, i + 1))
        board[r][c] = saved                  # restore, even if not found
        return found

    return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))

board = [["A", "B", "C", "E"], ["S", "F", "C", "S"], ["A", "D", "E", "E"]]
print(exist(board, "ABCCED"), exist(board, "SEE"), exist(board, "ABCB"))   # True True False
print(exist_simple(board, "ABCCED"), exist_simple(board, "ABCB"))         # True False
print(board[0])   # ['A', 'B', 'C', 'E']
`,
"Depth-first search was described as a strategy for exploring mazes by the French mathematician Charles Pierre Tremaux in the nineteenth century. Its modern linear-time formulation on graphs is due to John Hopcroft and Robert Tarjan in the early 1970s.",
[["LeetCode 79", "https://leetcode.com/problems/word-search/"],
 ["Python docs: sys.setrecursionlimit", "https://docs.python.org/3/library/sys.html#sys.setrecursionlimit"]]),

X("51. N-Queens",
["Place n queens on an n by n chessboard so that no two attack each other: no two share a row, a column or a diagonal. Return all distinct boards as lists of strings, where Q is a queen and a dot is empty. Example: n = 4 has two solutions, [.Q.., ...Q, Q..., ..Q.] and [..Q., Q..., ...Q, .Q..]. For n = 8 there are 92 solutions.",
 "Brute force: since each row must hold exactly one queen, try every choice of a column for every row, n^n boards in total, and check all pairs of queens for conflicts. For n = 8 that is 16 million boards times 28 pair checks. It finishes, but it is far too slow for n = 9 or more and shows no insight.",
 "Backtracking: place queens row by row. Before placing a queen in column c of row r, check three sets in O(1): used columns, used diagonals identified by r - c, and used anti-diagonals identified by r + c. If the square is free, add to the sets, recurse to the next row, and remove again on return. Whole subtrees die as soon as one row has no free square, so the real work is far below n^n; the usual bound quoted is O(n!). Space is O(n) for the sets and the recursion."],
["Pattern: backtracking with constraint sets (columns, r - c, r + c)",
 "Brute force: O(n^n * n^2) time",
 "Optimal: O(n!) time upper bound, O(n) extra space, output built only at the leaves",
 "Diagonal identity: squares on the same diagonal share r - c, on the same anti-diagonal share r + c",
 "Edge cases: n = 1 (one solution), n = 2 and n = 3 (no solutions)",
 "Difficulty: Hard. Related: 52 N-Queens II (count only), 37 Sudoku Solver, 36 Valid Sudoku"],
"Constraint satisfaction solvers for timetabling, seating plans and register allocation in compilers use the same place-check-undo loop. SAT solvers and configuration tools are large scale versions of this search with smarter pruning.",
`
from itertools import product

# Brute force: one column per row, every combination, check all pairs.  O(n^n * n^2)
def solve_n_queens_brute(n):
    result = []
    for cols in product(range(n), repeat=n):
        ok = True
        for r1 in range(n):
            for r2 in range(r1 + 1, n):
                if cols[r1] == cols[r2] or abs(cols[r1] - cols[r2]) == r2 - r1:
                    ok = False
        if ok:
            result.append(["." * c + "Q" + "." * (n - c - 1) for c in cols])
    return result

# Backtracking: row by row, O(1) safety check with three sets.  O(n!) time, O(n) space
def solve_n_queens(n):
    result = []
    cols, diag, anti = set(), set(), set()     # diag: r - c, anti: r + c
    placement = []

    def backtrack(r):
        if r == n:
            result.append(["." * c + "Q" + "." * (n - c - 1) for c in placement])
            return
        for c in range(n):
            if c in cols or (r - c) in diag or (r + c) in anti:
                continue
            cols.add(c)
            diag.add(r - c)
            anti.add(r + c)
            placement.append(c)
            backtrack(r + 1)
            placement.pop()
            cols.remove(c)
            diag.remove(r - c)
            anti.remove(r + c)

    backtrack(0)
    return result

print(solve_n_queens(4))   # [['.Q..', '...Q', 'Q...', '..Q.'], ['..Q.', 'Q...', '...Q', '.Q..']]
print(solve_n_queens_brute(4) == solve_n_queens(4))   # True
print(len(solve_n_queens(8)), len(solve_n_queens(1)), len(solve_n_queens(3)))   # 92 1 0
`,
"The eight queens puzzle was published by the chess composer Max Bezzel in 1848 and Franz Nauck gave all 92 solutions in 1850; Carl Friedrich Gauss also worked on it. Edsger Dijkstra used it in 1972 as the main example of structured programming and backtracking in his text Notes on Structured Programming.",
[["LeetCode 51", "https://leetcode.com/problems/n-queens/"],
 ["Python docs: set types", "https://docs.python.org/3/library/stdtypes.html#set-types-set-frozenset"]]),

X("133. Clone Graph",
["You get a reference to one node of a connected undirected graph. Each node has a value and a list of neighbour nodes. Return a deep copy of the whole graph: new node objects with the same values and the same connections, sharing nothing with the original. Example: a square 1-2-3-4-1 must come back as a new square with the same adjacency, and the returned node must not be the input node.",
 "Two-pass version: first run a BFS from the start node and create a copy for every node you discover, storing old to new in a dictionary. Then loop over the dictionary and, for every old node, set the neighbours of its copy to the copies of its neighbours. This is O(V + E) time and O(V) space and is easy to explain, but it walks the graph twice.",
 "Optimal: a single DFS with a dictionary that maps each original node to its copy. When you visit a node, if it already has a copy return it; otherwise create the copy, put it in the dictionary before visiting neighbours (this is what stops cycles), and then fill its neighbour list by recursing. Still O(V + E) time and O(V) space, but one pass and about ten lines. The dictionary is the visited set, so no second structure is needed."],
["Pattern: graph traversal with an old-to-new map (deep copy with cycles)",
 "Two-pass: O(V + E) time, O(V) space, BFS then wiring",
 "Optimal: O(V + E) time, O(V) space, one DFS",
 "Insert the copy into the map before recursing into neighbours, or a cycle will recurse forever",
 "Node objects are dictionary keys because they hash by identity; do not key by value unless values are unique (they are in this problem)",
 "Edge cases: None input, a single node with no neighbours, a node that points to itself",
 "Difficulty: Medium. Related: 138 Copy List with Random Pointer, 1490 Clone N-ary Tree"],
"Object serialisers and copy.deepcopy use exactly this memo dictionary to copy object graphs with shared or cyclic references. Infrastructure tools clone dependency graphs and version-control systems copy commit graphs in the same way.",
`
from collections import deque

class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

def build_graph(adj):
    # adj[i] lists the 1-based neighbours of node i + 1
    nodes = [Node(i + 1) for i in range(len(adj))]
    for i, nb in enumerate(adj):
        nodes[i].neighbors = [nodes[j - 1] for j in nb]
    return nodes[0] if nodes else None

def to_adj(node):
    seen = {}
    stack = [node]
    while stack:
        cur = stack.pop()
        if cur.val in seen:
            continue
        seen[cur.val] = cur
        stack.extend(cur.neighbors)
    return [[nb.val for nb in seen[v].neighbors] for v in sorted(seen)]

# Two-pass: BFS to create all copies, then wire the neighbours.  O(V + E) time and space
def clone_two_pass(node):
    if not node:
        return None
    copies = {node: Node(node.val)}
    queue = deque([node])
    while queue:
        cur = queue.popleft()
        for nb in cur.neighbors:
            if nb not in copies:
                copies[nb] = Node(nb.val)
                queue.append(nb)
    for old, new in copies.items():
        new.neighbors = [copies[nb] for nb in old.neighbors]
    return copies[node]

# Optimal: one DFS with an old-to-new map.  O(V + E) time and space
def clone_graph(node):
    copies = {}

    def dfs(cur):
        if cur in copies:
            return copies[cur]
        copy = Node(cur.val)
        copies[cur] = copy                   # register BEFORE visiting neighbours
        for nb in cur.neighbors:
            copy.neighbors.append(dfs(nb))
        return copy

    return dfs(node) if node else None

g = build_graph([[2, 4], [1, 3], [2, 4], [1, 3]])
c = clone_graph(g)
print(to_adj(c))   # [[2, 4], [1, 3], [2, 4], [1, 3]]
print(c is not g, c.neighbors[0] is not g.neighbors[0], c.neighbors[0].neighbors[0] is c)   # True True True
print(to_adj(clone_two_pass(g)), clone_graph(None))   # [[2, 4], [1, 3], [2, 4], [1, 3]] None
`,
"Breadth-first search was first described by Konrad Zuse in his 1945 thesis and independently by Edward F. Moore in 1959 for finding paths in mazes. The memo-dictionary technique for copying structures with shared references is also what Python's copy.deepcopy has used since the copy module appeared in the 1990s.",
[["LeetCode 133", "https://leetcode.com/problems/clone-graph/"],
 ["Python docs: copy.deepcopy", "https://docs.python.org/3/library/copy.html#copy.deepcopy"]]),

X("994. Rotting Oranges",
["A grid holds 0 (empty), 1 (fresh orange) and 2 (rotten orange). Every minute, each rotten orange makes its four fresh neighbours rotten. Return the number of minutes until no fresh orange remains, or -1 if some orange can never rot. Example: [[2, 1, 1], [1, 1, 0], [0, 1, 1]] gives 4; [[2, 1, 1], [0, 1, 1], [1, 0, 1]] gives -1 because the orange at the bottom left is isolated.",
 "Brute force: simulate minute by minute. Scan the whole grid, collect every fresh orange next to a rotten one, mark them all, count one minute, and repeat until a full pass changes nothing. Each pass is O(m * n) and there can be O(m * n) passes in a long snake-shaped grid, so the worst case is O((m * n)^2).",
 "Optimal: multi-source breadth-first search. Put every rotten orange into the queue at the start, count the fresh ones, and then process the queue level by level: one level is one minute. Each cell enters the queue at most once, so the total is O(m * n) time and O(m * n) space for the queue. When the queue is empty, if the fresh count is still positive some orange was unreachable and the answer is -1."],
["Pattern: multi-source BFS, level by level (shortest time to reach every cell)",
 "Brute force: O((m * n)^2) time with repeated full scans",
 "Optimal: O(m * n) time and space",
 "Count fresh oranges up front; the final check is fresh == 0, not whether the queue emptied",
 "Only count a minute when the level actually rotted something, or the answer is off by one",
 "Edge cases: no fresh oranges (answer 0), no rotten oranges but fresh ones (answer -1), empty grid",
 "Difficulty: Medium. Related: 286 Walls and Gates, 542 01 Matrix, 1162 As Far from Land as Possible"],
"Spread simulations (fire, infection, rumour) and distance maps in games use multi-source BFS. Network tools compute the time for a change to reach every node from many seeds, and image processing uses the same level-by-level expansion to compute distance transforms.",
`
from collections import deque

# Brute force: full-grid passes until nothing changes.  O((m*n)^2) time
def oranges_brute(grid):
    grid = [row[:] for row in grid]
    rows, cols = len(grid), len(grid[0])
    minutes = 0
    while True:
        to_rot = []
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == 2:
                    for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                            to_rot.append((nr, nc))
        if not to_rot:
            break
        for r, c in to_rot:
            grid[r][c] = 2
        minutes += 1
    if any(1 in row for row in grid):
        return -1
    return minutes

# Optimal: multi-source BFS, one queue level per minute.  O(m*n) time and space
def oranges_rotting(grid):
    grid = [row[:] for row in grid]
    rows, cols = len(grid), len(grid[0])
    queue = deque()
    fresh = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2:
                queue.append((r, c))
            elif grid[r][c] == 1:
                fresh += 1
    minutes = 0
    while queue and fresh:
        for _ in range(len(queue)):          # process exactly one level
            r, c = queue.popleft()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                    grid[nr][nc] = 2
                    fresh -= 1
                    queue.append((nr, nc))
        minutes += 1
    return minutes if fresh == 0 else -1

print(oranges_rotting([[2, 1, 1], [1, 1, 0], [0, 1, 1]]))   # 4
print(oranges_rotting([[2, 1, 1], [0, 1, 1], [1, 0, 1]]))   # -1
print(oranges_rotting([[0, 2]]), oranges_rotting([[1]]))    # 0 -1
print(oranges_brute([[2, 1, 1], [1, 1, 0], [0, 1, 1]]))     # 4
`,
"Breadth-first search for shortest paths in a grid was published by Edward F. Moore in 1959 and used by C. Y. Lee in 1961 for routing wires on circuit boards (the Lee algorithm). Starting the search from many sources at once is the same algorithm with a bigger initial queue, a trick that has been standard in distance-transform computations since the 1960s.",
[["LeetCode 994", "https://leetcode.com/problems/rotting-oranges/"],
 ["Python docs: collections.deque", "https://docs.python.org/3/library/collections.html#collections.deque"]]),

X("417. Pacific Atlantic Water Flow",
["An island is a grid of heights. The Pacific Ocean touches the top and left edges, the Atlantic touches the bottom and right edges. Water flows from a cell to a neighbour whose height is equal or lower. Return every cell from which water can reach both oceans. Example: for the 5 by 5 LeetCode grid starting [1, 2, 2, 3, 5], the answer is [[0, 4], [1, 3], [1, 4], [2, 2], [3, 0], [3, 1], [4, 0]].",
 "Brute force: from every cell run a DFS downhill and record whether it touches a Pacific edge and an Atlantic edge. Each DFS can visit the whole grid, so the total is O((m * n)^2). For a 200 by 200 grid that is more than a billion steps.",
 "Optimal: think backwards. Instead of asking where water goes, ask which cells the ocean can climb to. Start a DFS from every Pacific edge cell and move only to neighbours that are equal or higher; the visited set is every cell that drains into the Pacific. Do the same from the Atlantic edges. The answer is the intersection of the two sets. Each flood visits each cell at most once, so the total is O(m * n) time and O(m * n) space."],
["Pattern: reverse flood fill from the targets (multi-source DFS or BFS) plus set intersection",
 "Brute force: O((m * n)^2) time",
 "Optimal: O(m * n) time and space",
 "The flow condition flips: downhill in the original (next <= current) becomes uphill in reverse (next >= current)",
 "Edge cells belong to an ocean even if they are the highest point on the island",
 "Edge cases: single row or column (every cell touches both oceans), all equal heights (every cell qualifies)",
 "Difficulty: Medium. Related: 200 Number of Islands, 130 Surrounded Regions, 1020 Number of Enclaves"],
"Hydrology software computes drainage basins by flooding from river mouths upward, which is this problem on real elevation data. Reachability questions in dependency graphs and permission systems are also solved by searching backwards from the target instead of forwards from every source.",
`
# Brute force: from every cell, flow downhill and see which oceans are reached.  O((m*n)^2)
def pacific_atlantic_brute(heights):
    rows, cols = len(heights), len(heights[0])

    def reaches_both(r0, c0):
        seen = set()
        stack = [(r0, c0)]
        pac = atl = False
        while stack:
            r, c = stack.pop()
            if (r, c) in seen:
                continue
            seen.add((r, c))
            if r == 0 or c == 0:
                pac = True
            if r == rows - 1 or c == cols - 1:
                atl = True
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and heights[nr][nc] <= heights[r][c]:
                    stack.append((nr, nc))
        return pac and atl

    return [[r, c] for r in range(rows) for c in range(cols) if reaches_both(r, c)]

# Optimal: flood uphill from each ocean, intersect.  O(m*n) time and space
def pacific_atlantic(heights):
    rows, cols = len(heights), len(heights[0])

    def flood(starts):
        seen = set(starts)
        stack = list(starts)
        while stack:
            r, c = stack.pop()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if (0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in seen
                        and heights[nr][nc] >= heights[r][c]):
                    seen.add((nr, nc))
                    stack.append((nr, nc))
        return seen

    pacific = [(0, c) for c in range(cols)] + [(r, 0) for r in range(rows)]
    atlantic = [(rows - 1, c) for c in range(cols)] + [(r, cols - 1) for r in range(rows)]
    both = flood(pacific) & flood(atlantic)
    return sorted([r, c] for r, c in both)

h = [[1, 2, 2, 3, 5], [3, 2, 3, 4, 4], [2, 4, 5, 3, 1], [6, 7, 1, 4, 5], [5, 1, 1, 2, 4]]
print(pacific_atlantic(h))   # [[0, 4], [1, 3], [1, 4], [2, 2], [3, 0], [3, 1], [4, 0]]
print(pacific_atlantic_brute(h) == pacific_atlantic(h))   # True
print(pacific_atlantic([[1]]), pacific_atlantic([[2, 1], [1, 2]]))   # [[0, 0]] [[0, 0], [0, 1], [1, 0], [1, 1]]
`,
"Flood fill is one of the oldest raster algorithms; it appeared in the first interactive paint programs of the 1970s and is the bucket tool in every image editor since. Searching backwards from the goal instead of forwards from every start is a general trick that appears in reverse reachability analysis in compilers and model checkers.",
[["LeetCode 417", "https://leetcode.com/problems/pacific-atlantic-water-flow/"],
 ["Python docs: set operations", "https://docs.python.org/3/library/stdtypes.html#frozenset.intersection"]]),

X("127. Word Ladder",
["Given a start word, an end word and a dictionary of words of the same length, find the length of the shortest chain from start to end where each step changes exactly one letter and every intermediate word is in the dictionary. Return 0 if no chain exists. Example: hit to cog with [hot, dot, dog, lot, log, cog] gives 5: hit -> hot -> dot -> dog -> cog.",
 "Simple version: BFS where, to find the neighbours of a word, you compare it with every word in the dictionary and keep the ones that differ in one position. BFS gives the shortest chain, but each neighbour search is O(N * L), so the total is O(N^2 * L), too slow when the dictionary has thousands of words.",
 "Optimal: still BFS, but find neighbours in O(L^2) instead of O(N * L). Precompute buckets keyed by a pattern with one wildcard: hot goes into *ot, h*t and ho*. Two words are neighbours exactly when they share a bucket. From the current word generate its L patterns and visit the words in those buckets. Building the buckets is O(N * L^2) because each pattern string costs O(L) to create, and BFS visits each word once, so the whole thing is O(N * L^2). Bidirectional BFS from both ends is a further speed-up for very large dictionaries."],
["Pattern: BFS on an implicit graph (words are nodes, one-letter changes are edges)",
 "Simple: O(N^2 * L) time",
 "Optimal: O(N * L^2) time, O(N * L) space for the buckets",
 "The answer counts words in the chain, not steps: hit -> hot -> dot -> dog -> cog is 5",
 "Check that the end word is in the dictionary first, otherwise return 0 immediately",
 "Mark a word visited when it is enqueued, not when it is dequeued, or the queue explodes",
 "Difficulty: Hard. Related: 126 Word Ladder II (all shortest paths), 433 Minimum Genetic Mutation, 752 Open the Lock"],
"Spell checkers and fuzzy search suggest corrections by exploring one-edit neighbours in the same way. Genetic mutation paths and configuration migration planners, where each step may change one setting, are the same BFS on an implicit graph.",
`
from collections import deque, defaultdict

# Simple: BFS, compare the current word with every dictionary word.  O(N^2 * L) time
def ladder_length_simple(begin, end, word_list):
    words = set(word_list)
    if end not in words:
        return 0

    def adjacent(a, b):
        diff = 0
        for x, y in zip(a, b):
            if x != y:
                diff += 1
                if diff > 1:
                    return False
        return diff == 1

    queue = deque([(begin, 1)])
    visited = {begin}
    while queue:
        word, steps = queue.popleft()
        if word == end:
            return steps
        for nxt in words:
            if nxt not in visited and adjacent(word, nxt):
                visited.add(nxt)
                queue.append((nxt, steps + 1))
    return 0

# Optimal: BFS with wildcard buckets, neighbours found in O(L^2).  O(N * L^2) time
def ladder_length(begin, end, word_list):
    words = set(word_list)
    if end not in words:
        return 0
    buckets = defaultdict(list)              # "h*t" -> ["hot", "hit", ...]
    for w in words:
        for i in range(len(w)):
            buckets[w[:i] + "*" + w[i + 1:]].append(w)
    queue = deque([(begin, 1)])
    visited = {begin}
    while queue:
        word, steps = queue.popleft()
        if word == end:
            return steps
        for i in range(len(word)):
            for nxt in buckets[word[:i] + "*" + word[i + 1:]]:
                if nxt not in visited:
                    visited.add(nxt)         # mark when enqueued
                    queue.append((nxt, steps + 1))
    return 0

wl = ["hot", "dot", "dog", "lot", "log", "cog"]
print(ladder_length("hit", "cog", wl), ladder_length_simple("hit", "cog", wl))   # 5 5
print(ladder_length("hit", "cog", ["hot", "dot", "dog", "lot", "log"]))          # 0
print(ladder_length("a", "c", ["a", "b", "c"]))                                   # 2
`,
"Word ladders were invented by Lewis Carroll, who published the puzzle as Doublets in Vanity Fair in 1879. Breadth-first search, which finds the shortest ladder, was described by Edward F. Moore in 1959.",
[["LeetCode 127", "https://leetcode.com/problems/word-ladder/"],
 ["Python docs: collections.defaultdict", "https://docs.python.org/3/library/collections.html#collections.defaultdict"]]),

X("743. Network Delay Time",
["There are n nodes labelled 1 to n and a list of directed edges (u, v, w) meaning a signal takes w time units to travel from u to v. A signal is sent from node k. Return the time until every node has received it, or -1 if some node never does. Example: edges [[2, 1, 1], [2, 3, 1], [3, 4, 1]], n = 4, k = 2 gives 2; with the single edge [1, 2, 1] and k = 2, node 1 is unreachable, so -1.",
 "Simpler version: Bellman-Ford. Start with distance 0 at k and infinity elsewhere, then relax every edge up to n - 1 times. It is short, handles negative weights, and is O(V * E), which is fine for small graphs but slow for the typical limits of a few thousand edges and nodes.",
 "Optimal: Dijkstra with a min-heap. Pop the unsettled node with the smallest tentative distance; that distance is final because all weights are non-negative, so no later path can be shorter. Relax its outgoing edges and push improved candidates. With a visited dictionary that stores final distances, stale heap entries are skipped. The time is O((V + E) log V) and the answer is the largest final distance, or -1 if fewer than n nodes were settled."],
["Pattern: single-source shortest paths on a weighted graph (Dijkstra)",
 "Simpler: Bellman-Ford, O(V * E) time, works with negative weights",
 "Optimal: Dijkstra with a heap, O((V + E) log V) time, O(V + E) space, non-negative weights only",
 "Lazy deletion: push duplicates freely and skip a popped node if it is already settled",
 "The answer is the maximum of the shortest distances, which is the moment the last node receives the signal",
 "Edge cases: unreachable node (-1), n = 1 (answer 0), parallel edges with different weights, self-loops",
 "Difficulty: Medium. Related: 787 Cheapest Flights Within K Stops, 1514 Path with Maximum Probability, 1631 Path With Minimum Effort"],
"Routing protocols such as OSPF run Dijkstra on the network topology to build their forwarding tables, and map services run it (with heuristics on top) for driving directions. Build systems and CDN control planes use the same algorithm to estimate propagation time to every node.",
`
import heapq
from collections import defaultdict

# Simpler: Bellman-Ford, relax every edge up to n - 1 times.  O(V * E) time
def network_delay_bf(times, n, k):
    INF = float("inf")
    dist = [INF] * (n + 1)
    dist[k] = 0
    for _ in range(n - 1):
        changed = False
        for u, v, w in times:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                changed = True
        if not changed:
            break
    worst = max(dist[1:])
    return -1 if worst == INF else worst

# Optimal: Dijkstra with a min-heap.  O((V + E) log V) time
def network_delay(times, n, k):
    graph = defaultdict(list)
    for u, v, w in times:
        graph[u].append((v, w))
    dist = {}                                # node -> final shortest distance
    heap = [(0, k)]
    while heap:
        d, u = heapq.heappop(heap)
        if u in dist:
            continue                         # stale entry, already settled
        dist[u] = d
        for v, w in graph[u]:
            if v not in dist:
                heapq.heappush(heap, (d + w, v))
    return max(dist.values()) if len(dist) == n else -1

print(network_delay([[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2))   # 2
print(network_delay([[1, 2, 1]], 2, 2), network_delay([[1, 2, 1]], 2, 1))   # -1 1
print(network_delay_bf([[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2))   # 2
print(network_delay([[1, 2, 5], [1, 3, 1], [3, 2, 1]], 3, 1))   # 2
`,
"Edsger Dijkstra designed his shortest-path algorithm in 1956, reportedly in twenty minutes at a cafe in Amsterdam, and published it in 1959. The Bellman-Ford algorithm was published by Richard Bellman in 1958 and Lester Ford in 1956, and the heap-based version of Dijkstra with the O((V + E) log V) bound follows from the binary heap introduced in 1964.",
[["LeetCode 743", "https://leetcode.com/problems/network-delay-time/"],
 ["Python docs: heapq.heappush", "https://docs.python.org/3/library/heapq.html#heapq.heappush"]]),
]});
