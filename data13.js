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
