EXTRA(23, "703. Kth Largest Element in a Stream", {
  deep: [
    "Recognise the pattern from the words 'k-th largest', 'top k', 'k most frequent' or 'k closest' together with 'stream', 'one at a time' or 'design a class'. Whenever only k results matter and the input keeps growing, a heap of size k is the first tool to think about. Sorting is the right answer only when you need the whole order or when the data is small and fixed.",
    "Why it is correct: after every add, the heap holds exactly the k largest values seen so far. When a new value arrives we push it, so the heap holds k + 1 values, and then we pop the smallest of those k + 1. The value that leaves is smaller than or equal to k other values, so it can never be the k-th largest again; the stream only grows, so its rank can only get worse. The root of a min-heap is the smallest element in the heap, which is the k-th largest overall. The same trick with a max-heap gives 'k-th smallest'.",
    "Common traps: using a max-heap of everything and popping k times on each call (O(k log n) per add and the popped values must be pushed back); forgetting that the starting list may be shorter than k, which is fine with this code because the first k adds simply fill the heap; and comparing against heap[0] before the heap has k items. If k is huge compared to the stream, the heap is not helpful and a sorted structure or a balanced tree is better. If the stream also removes values, a heap alone is not enough; you need a lazy-deletion heap or a sorted container."
  ],
  iq: [
    { q: "Why a min-heap and not a max-heap for the k largest values?", a: "We want fast access to the smallest of the k largest values, because that value is the answer and it is also the one we throw away when a bigger value arrives. A min-heap gives the smallest in O(1) and removes it in O(log k). With a max-heap of all values, each query would need k pops and pushes." },
    { q: "What is the complexity if there are m calls to add and the starting list has n numbers?", a: "Building from the starting list is O(n log k), because each of the n numbers is pushed and possibly popped once. Each of the m adds is O(log k). Total O((n + m) log k) time and O(k) space. Compare that with sort on each call: O(m * (n + m) log(n + m)).", c: `
import heapq
heap = []
k = 3
for v in [17, 92, 3, 44, 98, 61, 5, 97, 20, 8]:
    heapq.heappush(heap, v)
    if len(heap) > k:
        heapq.heappop(heap)
print(sorted(heap))   # [92, 97, 98]
` },
    { q: "How would you return the k largest values in sorted order at the end, and how would you handle k-th smallest?", a: "At the end call sorted(heap, reverse=True), which is O(k log k), or pop k times. For k-th smallest use the same idea with a max-heap, which in Python means pushing negated values and negating the root when you read it. heapq.nlargest(k, iterable) does the fixed-list version in one call." },
    { q: "How does this change if values can also be removed from the stream?", a: "A plain heap cannot delete an arbitrary value fast. Two common answers: lazy deletion, where you keep a counter of values to ignore and skip them when they appear at the top, or a balanced sorted container such as a sorted list from the sortedcontainers package or a tree map in other languages. In an interview, say the trade-off out loud: lazy deletion is O(log n) amortised but the heap can grow with stale values." }
  ],
  tips: [
    "Start by restating: 'The heap always holds the k largest values seen so far, so its minimum is the answer.' Interviewers want to hear the invariant before the code.",
    "heapq.heappushpop(heap, val) pushes then pops in one call and is faster than two separate calls; use it once the heap already has k items.",
    "Test out loud: starting list shorter than k, a value smaller than the current root (answer must not change), a value larger than everything (root should move up), and duplicates.",
    "Mention heapq.nlargest and sorted(...)[-k] as the one-liners for the non-streaming version, then explain why they do not fit a stream."
  ]
});

EXTRA(23, "23. Merge k Sorted Lists", {
  deep: [
    "Recognise the pattern when the input is several sequences that are each already sorted and the output must also be sorted. Words like 'k sorted lists', 'k sorted arrays', 'merge streams' or 'smallest range covering elements from k lists' point to a k-way merge. The classic two-list merge (problem 21) is the base case; this problem asks you to generalise it without doing k - 1 separate merges.",
    "Why the heap version is correct: the smallest unused node in all lists must be the head of some list, because every list is sorted. The heap holds exactly one unused head per non-empty list, so the heap minimum is the global minimum. After we take it, the next node of the same list becomes that list's new head, and we push it. The output is built in increasing order and every node enters the heap once, giving O(N log k). The alternative divide-and-conquer approach merges lists in pairs like a tournament: log k rounds, each touching all N nodes, also O(N log k) but with O(1) extra space beyond recursion.",
    "Traps: pushing bare ListNode objects into the heap fails in Python when two values are equal, because ListNode does not define ordering; the fix is a tuple with a unique counter in the middle. Merging the lists one after another into a growing result is O(N * k) and is the answer interviewers hope you avoid. If lists arrive over the network as streams, the heap version works unchanged because it only needs the current head of each. If memory is the limit, note that the heap holds only k references, not N."
  ],
  iq: [
    { q: "Why is merging the lists one by one into one result O(N * k)?", a: "After merging i lists the result has about i * N / k nodes, and the next merge walks the whole result again. Summing i * N / k for i from 1 to k gives about N * k / 2. The heap and the pairwise divide-and-conquer both avoid re-walking the long result, so they get O(N log k)." },
    { q: "Can you solve it without a heap?", a: "Yes, with divide and conquer: merge list 0 with list 1, list 2 with list 3, and so on, then repeat on the halves. There are about log k rounds and each round visits all N nodes once, so it is O(N log k) with O(1) extra space apart from the recursion stack of the two-list merge.", c: `
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def merge_two(a, b):
    dummy = tail = ListNode()
    while a and b:
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b
    return dummy.next

def merge_k_pairwise(lists):
    if not lists:
        return None
    while len(lists) > 1:
        merged = []
        for i in range(0, len(lists), 2):
            right = lists[i + 1] if i + 1 < len(lists) else None
            merged.append(merge_two(lists[i], right))
        lists = merged
    return lists[0]

def build(values):
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head

out = merge_k_pairwise([build([1, 4, 5]), build([1, 3, 4]), build([2, 6])])
vals = []
while out:
    vals.append(out.val)
    out = out.next
print(vals)   # [1, 1, 2, 3, 4, 4, 5, 6]
` },
    { q: "What happens in Python if two heap entries have the same value and you store the node as the second item?", a: "heapq compares tuples element by element. When the values tie, it compares the nodes, and ListNode has no ordering, so Python raises TypeError. Putting a unique integer, such as the list index or a running counter, as the second element guarantees the comparison stops before the node." },
    { q: "How would you merge k sorted files that do not fit in memory?", a: "Open all k files and read one record from each into a heap keyed by sort key and file index. Pop the smallest, write it to the output, and read the next record from that file. Only k records are in memory at once. This is the merge phase of external merge sort used by databases." }
  ],
  tips: [
    "Say the plan in one sentence: 'At each step the next output node is the smallest current head, so I keep the k heads in a min-heap.' Then mention the O(N log k) bound before writing code.",
    "heapq.merge(*iterables) does the k-way merge for plain iterables in the standard library; it is a good thing to mention for arrays even though the linked-list version needs your own loop.",
    "Use a dummy head node so you never special-case the first node, and keep a tail pointer so appending is O(1).",
    "Test out loud: empty outer list, a list of empty lists, lists of different lengths, and duplicated values across lists (this is the case that exposes the tuple comparison bug)."
  ]
});

EXTRA(23, "621. Task Scheduler", {
  deep: [
    "Recognise the pattern from 'cooldown', 'same item at least n apart', 'minimum time including idle' or 'rearrange so that equal items are not adjacent'. These are frequency problems: the item with the highest count controls the answer, and everything else is filler. The usual tools are a Counter, a max-heap of counts, and often a closed formula.",
    "Why the formula is correct: take the letter with the largest count m. Its m copies need at least m - 1 gaps of length n between them, so the schedule is at least (m - 1) * (n + 1) + 1 long, and each other letter that also has count m needs one more slot at the end. That gives the lower bound (m - 1) * (n + 1) + num_max. It is achievable: fill the gaps round-robin with the other letters, most frequent first. When the other letters do not fit into the gaps, every slot is a task and there is no idle time, so the length is exactly len(tasks). The answer is the maximum of the two bounds.",
    "Traps: forgetting the num_max term when several letters share the top count; forgetting the max with len(tasks) when there are many different tasks; and using n instead of n + 1 for the block length. If the interviewer changes the problem to return the actual schedule, not just the length, you need the heap simulation, because the formula only counts. If tasks had different durations or the cooldown was per task type, the greedy formula breaks and you need a simulation or a scheduling model."
  ],
  iq: [
    { q: "Why can the answer never be less than len(tasks)?", a: "Every task takes one time unit and no two tasks run at the same time, so the schedule has at least one slot per task. Idle slots can only make it longer. That is why the formula takes the maximum of the frame length and len(tasks)." },
    { q: "Return the actual order of execution, not only the length.", a: "Use the simulation: a max-heap of remaining counts and a queue of tasks in cooldown. At each time step run the available task with the most copies left, otherwise append 'idle'. This greedy choice keeps the most dangerous letter moving and matches the formula length.", c: `
from collections import Counter, deque
import heapq

def schedule(tasks, n):
    heap = [(-c, t) for t, c in Counter(tasks).items()]
    heapq.heapify(heap)
    cooldown = deque()
    order = []
    time = 0
    while heap or cooldown:
        time += 1
        if heap:
            count, task = heapq.heappop(heap)
            order.append(task)
            if count + 1:
                cooldown.append((time + n, count + 1, task))
        else:
            order.append("idle")
        if cooldown and cooldown[0][0] == time:
            ready = cooldown.popleft()
            heapq.heappush(heap, (ready[1], ready[2]))
    return order

print(schedule(["A", "A", "A", "B", "B", "B"], 2))   # ['A', 'B', 'idle', 'A', 'B', 'idle', 'A', 'B']
` },
    { q: "What changes if n is 0 or if there is only one kind of task?", a: "With n = 0 there is no constraint and the answer is len(tasks); the formula gives (m - 1) * 1 + num_max which is at most len(tasks), so the max handles it. With one kind of task the frame is (m - 1) * (n + 1) + 1 and nothing fills the gaps, so the answer is that frame, which is bigger than len(tasks) when n > 0." },
    { q: "How do you prove the greedy 'run the most frequent available task' is optimal?", a: "Use an exchange argument: in any optimal schedule, if a less frequent task runs while a more frequent one is available, swapping them never violates a cooldown of the more frequent task later, because it now has more room, and the less frequent task has fewer copies left to place. Repeating the swap turns any optimal schedule into the greedy one without increasing the length." }
  ],
  tips: [
    "Draw the frame on the whiteboard: A _ _ A _ _ A, then say 'the gaps are filled by the other letters'. The picture makes the formula obvious and shows the interviewer you understand it.",
    "Counter(tasks).most_common(1)[0][1] gives the maximum count in one call; a generator with sum(1 for ...) counts how many letters share it.",
    "Test out loud: the given example (8), n = 0 (6), many distinct letters so that there is no idle (12 for 12 tasks), and a single letter with n = 2 (A _ _ A _ _ A gives 7).",
    "If asked for the order, switch to the heap simulation; say that the formula is the O(1)-space answer and the simulation is the constructive one."
  ]
});

EXTRA(23, "295. Find Median from Data Stream", {
  deep: [
    "Recognise the pattern from 'median', 'middle element', 'running statistics', 'stream' and 'design a class'. The median needs the boundary between the smaller half and the larger half; two heaps give you the maximum of the lower half and the minimum of the upper half in O(1). A single heap cannot do it because the median is not at either end of a heap.",
    "Why it is correct: the invariant is that every element of low is less than or equal to every element of high, and that low has either the same size as high or one more element. The push sequence keeps it: we push into low, then move the largest of low into high, which guarantees the order property; if high is now bigger, we move its smallest back to low, which restores the size property without breaking the order. With n elements, low has the smallest ceil(n / 2) numbers, so its top is the median for odd n and the two tops average to the median for even n.",
    "Traps: forgetting that Python has only a min-heap, so the low side must store negated values; mixing up which side may be bigger; and integer division in languages where the median must be a float. If the interviewer adds a sliding window, deletions are needed and the two-heap solution needs lazy deletion (problem 480). If the values come from a small known range, such as ages 0 to 120, a counting array gives O(1) add and O(range) median with no heaps at all. If approximation is allowed on huge streams, sketches such as t-digest are the production answer."
  ],
  iq: [
    { q: "Why not keep one sorted list?", a: "bisect finds the insertion point in O(log n) but inserting into a Python list shifts all later elements, which is O(n). For millions of adds that is too slow. The two heaps do every add in O(log n). For a few thousand values the sorted list is fine and even faster, which is worth saying so the interviewer sees you know the constant factors." },
    { q: "What if all numbers are integers between 0 and 100?", a: "Keep an array of 101 counters. Add is O(1). For the median, walk the counters from 0 until the running total reaches half of the count, O(101) which is constant. This is better than heaps when the range is small, and it is a classic follow-up for this exact problem.", c: `
class SmallRangeMedian:
    def __init__(self):
        self.counts = [0] * 101
        self.n = 0

    def addNum(self, num):
        self.counts[num] += 1
        self.n += 1

    def findMedian(self):
        want = [(self.n - 1) // 2, self.n // 2]   # positions of the two middle values
        found = []
        seen = 0
        for value, c in enumerate(self.counts):
            seen += c
            while len(found) < 2 and seen > want[len(found)]:
                found.append(value)
        return (found[0] + found[1]) / 2

m = SmallRangeMedian()
for x in [5, 15, 1, 3]:
    m.addNum(x)
print(m.findMedian())   # 4.0
m.addNum(100)
print(m.findMedian())   # 5.0
` },
    { q: "How do you support a sliding window of the last k numbers?", a: "You need to delete the number leaving the window. Heaps cannot delete arbitrary elements fast, so use lazy deletion: record the value to delete in a dictionary, and when it appears at the top of a heap, pop it and decrement the record. Keep separate counts of valid elements on each side to rebalance correctly. The amortised cost stays O(log k) per step." },
    { q: "How would you handle a stream of a billion numbers on one machine?", a: "Exact median needs all numbers or two passes, which may not fit. In practice use an approximate quantile sketch such as t-digest or KLL, which uses a few kilobytes and gives the median within a small error, and say that the two-heap exact solution is O(n) memory and therefore not suitable at that scale." }
  ],
  tips: [
    "Open with the invariant: 'low holds the smaller half as a max-heap, high the larger half as a min-heap, and low may be one bigger.' Draw two triangles pointing at each other.",
    "The three-line add (push to low, move max of low to high, rebalance if high is bigger) is easier to get right than branching on the new value; use it even if it does one extra heap operation.",
    "Negate numbers when pushing and popping from the max-heap side; write -heapq.heappop(low) as a habit so you never forget one of the signs.",
    "Test out loud: one element (median is that element), two elements (average), a descending run of inputs, and duplicates such as 2, 2, 2."
  ]
});

EXTRA(23, "46. Permutations", {
  deep: [
    "Recognise the pattern from 'all orderings', 'all arrangements', 'every possible sequence' or 'return all ...'. When the problem asks for every answer, not the best one, you are enumerating, and enumeration with constraints is backtracking. Ask yourself two questions: does order matter (permutations) or not (combinations), and may an element be used more than once? The answers decide the shape of the loop.",
    "Why it is correct: the recursion tree has depth n. At depth d every unused element is tried once, so the leaves are exactly the sequences of n distinct elements, each appearing once. The used array is the state that prevents repeats, and un-choosing after the recursive call returns the state to what it was, so each loop iteration starts from a clean slate. Variations: with duplicates (problem 47) sort first and skip nums[i] when it equals nums[i - 1] and index i - 1 is not used; the swap-based version swaps nums[d] with each nums[i] for i >= d and needs no used array; iterative generation with next permutation gives them in lexicographic order with O(1) extra memory.",
    "Traps: result.append(path) without a copy returns n! references to the same, finally empty, list; forgetting to reset used[i]; and running out of recursion depth, which is not a problem here because depth is n and n is at most 6 on LeetCode, but matters if n is large. If n grows to 10 or more, the output itself is millions of lists and no algorithm helps; you then need a generator (yield) so the caller can stop early, or a way to count or sample instead of listing."
  ],
  iq: [
    { q: "How do you handle duplicate numbers so that each distinct permutation appears once?", a: "Sort the input, then in the loop skip nums[i] if it equals nums[i - 1] and used[i - 1] is False. That rule makes equal numbers be taken in order from left to right, so two equal numbers never swap roles. The output size becomes n! divided by the product of the factorials of the counts of each duplicate.", c: `
def permute_unique(nums):
    nums = sorted(nums)
    result, path, used = [], [], [False] * len(nums)

    def backtrack():
        if len(path) == len(nums):
            result.append(path[:])
            return
        for i in range(len(nums)):
            if used[i] or (i > 0 and nums[i] == nums[i - 1] and not used[i - 1]):
                continue
            used[i] = True
            path.append(nums[i])
            backtrack()
            path.pop()
            used[i] = False

    backtrack()
    return result

print(permute_unique([1, 1, 2]))   # [[1, 1, 2], [1, 2, 1], [2, 1, 1]]
` },
    { q: "Can you write it without the used array?", a: "Yes, with the swap method: at depth d, for each i from d to n - 1 swap nums[d] and nums[i], recurse on d + 1, and swap back. The prefix nums[:d] is the fixed part and the rest is the pool of unused elements. It uses O(1) extra memory apart from the output, but the permutations do not come out in lexicographic order.", c: `
def permute_swap(nums):
    result = []

    def backtrack(d):
        if d == len(nums):
            result.append(nums[:])
            return
        for i in range(d, len(nums)):
            nums[d], nums[i] = nums[i], nums[d]
            backtrack(d + 1)
            nums[d], nums[i] = nums[i], nums[d]

    backtrack(0)
    return result

print(permute_swap([1, 2, 3]))   # [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 2, 1], [3, 1, 2]]
` },
    { q: "What is the time complexity and why is it not just O(n!)?", a: "There are n! leaves and each leaf copies a list of length n, so output alone is O(n * n!). The inner nodes add about e * n! calls in total, which does not change the bound. Any algorithm that returns all permutations as separate lists must be at least O(n * n!), so the backtracking solution is optimal." },
    { q: "How would you return permutations lazily, one at a time?", a: "Replace result.append with yield and make the recursive calls 'yield from'. The caller gets a generator and can stop after the first few permutations without the program building all of them. This is how itertools.permutations behaves and it is the right design when n is large or when the consumer may stop early." }
  ],
  tips: [
    "Say the template out loud before writing: 'choose, explore, un-choose'. Then say which state you need (used flags and path) and when a leaf is reached (len(path) == n).",
    "path[:] or list(path) is the copy; write it in the first line of the leaf case so you cannot forget it.",
    "Test out loud: [1, 2, 3] gives six, [1] gives one, [] gives one empty permutation, and check that the input list is not changed afterwards.",
    "Mention itertools.permutations as the production answer and the swap method or next permutation as the memory-light variants; interviewers like to hear that you know the standard library."
  ]
});

EXTRA(23, "39. Combination Sum", {
  deep: [
    "Recognise the pattern from 'all combinations that sum to', 'unlimited supply', 'may use each number any number of times' and 'order does not matter'. Combination problems are backtracking with a start index: at each level you may only pick the current candidate or later ones, which removes permutations of the same multiset. If the question asks for the count or the minimum number of coins instead of the list, switch to dynamic programming (problems 377 and 322).",
    "Why it is correct: every combination can be written exactly once in non-decreasing order of candidates. The recursion with start index i builds sequences where each next element is at index >= i, which are exactly the non-decreasing sequences, so each multiset is produced once and only once. Passing i again allows repeats of the same candidate; passing i + 1 would forbid them. Pruning is safe because candidates are positive: once remaining is below a candidate, no extension can bring the sum back to the target, and after sorting, all later candidates are even larger, so break is correct.",
    "Traps: forgetting the start index and producing [2, 3, 2] as well as [2, 2, 3]; using continue instead of break and losing the sorted pruning; and an infinite recursion if a candidate could be zero (the problem guarantees positive values, say that you rely on it). If candidates may contain negative numbers, remaining can go down and up again and the pruning breaks; then you need a bound on the number of elements. If the target is large and only the count is wanted, the DP in O(n * target) is far better than enumeration."
  ],
  iq: [
    { q: "How does the code change when each candidate may be used only once and the input has duplicates (problem 40)?", a: "Sort the candidates, recurse with i + 1 instead of i, and inside the loop skip candidates[i] if i > start and it equals candidates[i - 1]. The skip prevents the same number from starting two identical branches at the same level, while still allowing it to appear twice in one combination via different levels.", c: `
def combination_sum2(candidates, target):
    candidates = sorted(candidates)
    result, path = [], []

    def backtrack(start, remaining):
        if remaining == 0:
            result.append(path[:])
            return
        for i in range(start, len(candidates)):
            if candidates[i] > remaining:
                break
            if i > start and candidates[i] == candidates[i - 1]:
                continue
            path.append(candidates[i])
            backtrack(i + 1, remaining - candidates[i])
            path.pop()

    backtrack(0, target)
    return result

print(combination_sum2([10, 1, 2, 7, 6, 1, 5], 8))   # [[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]]
` },
    { q: "If only the number of combinations is needed, is there something faster?", a: "Yes, dynamic programming: dp[s] is the number of combinations that sum to s. Loop over candidates in the outer loop and sums in the inner loop, dp[s] += dp[s - c]. The outer loop over candidates makes each multiset counted once, so it counts combinations, not ordered sequences. Time O(n * target), space O(target).", c: `
def count_combinations(candidates, target):
    dp = [0] * (target + 1)
    dp[0] = 1
    for c in candidates:              # candidates outside: each multiset counted once
        for s in range(c, target + 1):
            dp[s] += dp[s - c]
    return dp[target]

print(count_combinations([2, 3, 6, 7], 7))   # 2
print(count_combinations([2, 3, 5], 8))      # 3
` },
    { q: "What is the complexity of the backtracking solution?", a: "The recursion depth is at most target divided by the smallest candidate, and each level branches over at most n candidates, so the worst case is O(n^(target / min)). Each solution also costs O(target / min) to copy. In practice pruning on sorted candidates makes the explored tree close to the number of valid partial sums, so it runs fast for the constraints given (target up to 40)." },
    { q: "Why do we not need a visited set or a used array here?", a: "Because the start index already encodes what may still be chosen. Everything before start is finished and everything from start onward is allowed, including the current candidate itself when reuse is permitted. A used array is needed only when any remaining element may be chosen in any order, which is the permutation case." }
  ],
  tips: [
    "First clarify: can a number be reused, are candidates distinct, and are they all positive? Each answer changes one line of the code, and saying so shows you know the family of problems.",
    "Sort the candidates and break on candidates[i] > remaining; mention that break is only safe because the list is sorted and all values are positive.",
    "Test out loud: the given example, a target smaller than every candidate (empty list), a candidate equal to the target (one-element combination), and a case with several answers such as [2, 3, 5] with 8.",
    "If the follow-up is about counting or the minimum number of items, name the DP versions (377 and 322) right away instead of trying to adapt the backtracking."
  ]
});

EXTRA(23, "79. Word Search", {
  deep: [
    "Recognise the pattern from 'grid', 'adjacent cells', 'path', 'each cell used once' and 'does there exist'. A grid is an implicit graph where each cell has up to four neighbours; 'exists a path with property X' is DFS with backtracking. If the question were 'how many connected cells' or 'shortest path' you would use plain DFS or BFS with a permanent visited set; the words 'at most once per path' are what force un-marking.",
    "Why it is correct: dfs(r, c, i) answers 'can word[i:] be completed starting at cell (r, c) given the current marks'. The marks hold exactly the cells on the current path, because every mark is removed when the call returns. So the search never reuses a cell within one path, but a cell is free again for other paths. The four recursive calls are combined with or, which stops at the first success. The time bound O(m * n * 3^L) comes from starting at every cell and branching into at most three new directions per step after the first.",
    "Traps: forgetting to restore the cell on failure (the board stays damaged and later searches fail); checking the bounds after indexing the board; and using a global visited set that is never cleared, which breaks correctness. Performance tricks that interviewers like: count the letters of the word against the board and return False early if the word needs more of a letter than the board has, and reverse the word when its last letter is rarer than its first so the search dies earlier. For many words on one board (problem 212) the right structure is a trie walked during one DFS."
  ],
  iq: [
    { q: "Why is the branching factor 3 and not 4 in the complexity?", a: "The first step from a start cell can go in four directions. After that, one of the four neighbours is the cell you just came from, and it is marked, so the recursion returns immediately for it. Only three directions can lead to new work, which gives 4 * 3^(L - 1), written as O(3^L) per start cell." },
    { q: "How do you make it fast when the board is large and the word rarely exists?", a: "Add a frequency check before searching: count letters in the board and in the word, and return False if any letter is needed more times than it appears. Also start from the rarer end of the word, because fewer start cells match and branches die sooner. These two checks can turn a slow solution into a fast one on adversarial tests.", c: `
from collections import Counter

def quick_reject(board, word):
    have = Counter(ch for row in board for ch in row)
    need = Counter(word)
    return any(have[ch] < n for ch, n in need.items())

board = [["A", "B", "C", "E"], ["S", "F", "C", "S"], ["A", "D", "E", "E"]]
print(quick_reject(board, "ABCCED"), quick_reject(board, "AAAA"))   # False True
` },
    { q: "What is the space complexity, and is an explicit stack better than recursion?", a: "O(L) for the recursion stack, where L is the word length, plus O(1) for marks because the board is reused. Recursion is fine here because L is at most 15 on LeetCode. An explicit stack would need to store the path and the restore actions, which is more code; it only becomes necessary when the path could be thousands of cells deep." },
    { q: "How does the solution change for a list of thousands of words (Word Search II)?", a: "Running this DFS per word is too slow. Build a trie of all words, then do one DFS from each cell that walks the board and the trie together, stopping when the trie has no child for the next letter. When a trie node marks the end of a word, record it and remove it from the trie so it is not found twice. This finds all words in roughly one pass over the board." }
  ],
  tips: [
    "Say 'this is DFS with backtracking on an implicit grid graph; I will mark cells in place and restore them' before coding. Then write the bounds check first, the letter check second.",
    "Use a sentinel character that cannot appear in the word, such as the hash sign, and store the original letter in a local variable so restoring is one line.",
    "Test out loud: the three given examples (True, True, False), a word of length 1, a word longer than the board, and confirm that the board is unchanged after the function returns.",
    "Mention the two pruning tricks (letter count check and starting from the rarer end) and the trie for multiple words; they are the usual follow-ups."
  ]
});

EXTRA(23, "51. N-Queens", {
  deep: [
    "Recognise the pattern from 'place items so that no two conflict', 'all valid boards' or 'constraints between positions'. These are constraint satisfaction problems and the standard attack is backtracking row by row with constant-time conflict checks. The key insight that turns the board into a one-dimensional problem is that every row has exactly one queen, so a solution is just a list of column numbers.",
    "Why the diagonal trick works: moving one step down and one step right keeps r - c the same, so all squares on a top-left to bottom-right diagonal share the value r - c; moving down and left keeps r + c the same, so anti-diagonals share r + c. With three sets, a square is safe exactly when its column, its r - c and its r + c are all unused. Each check is O(1), and adding or removing on the way in and out keeps the sets consistent with the current partial board. The row-by-row order means rows never need checking.",
    "Traps: forgetting to remove from the three sets when backtracking; building the string board at every level instead of only at the leaves; and using lists with O(n) membership tests instead of sets. For counting only (problem 52) do not build boards at all, just count leaves. For large n, bit masks replace the sets: three integers for columns and the two diagonals, shifted left or right as you go down a row, which is several times faster. Note also that the problem has symmetry: solutions come in mirror pairs, so you can search only half of the first row and mirror, which halves the work."
  ],
  iq: [
    { q: "Why can you place exactly one queen per row and still find every solution?", a: "Two queens in the same row attack each other, so a valid board has at most one queen per row, and with n queens on n rows it must have exactly one per row. Searching by rows therefore loses nothing, and it also makes the row constraint automatic, leaving only columns and diagonals to check." },
    { q: "How would you count solutions as fast as possible for n up to 14 or 15?", a: "Use bit masks. Keep three integers: cols, and two diagonal masks that are shifted left and right by one bit when moving to the next row. The free squares in the current row are the bits not set in any mask; iterate over them by extracting the lowest set bit. This replaces set operations with a few integer operations and is the classic fast counting solution.", c: `
def total_n_queens(n):
    full = (1 << n) - 1

    def go(cols, d1, d2):
        if cols == full:
            return 1
        count = 0
        free = full & ~(cols | d1 | d2)
        while free:
            bit = free & -free
            free -= bit
            count += go(cols | bit, ((d1 | bit) << 1) & full, (d2 | bit) >> 1)
        return count

    return go(0, 0, 0)

print([total_n_queens(n) for n in range(1, 9)])   # [1, 0, 0, 2, 10, 4, 40, 92]
` },
    { q: "What is the time complexity of the backtracking solution?", a: "A loose upper bound is O(n!) because the first row has n choices, the second at most n - 1 free columns, and so on, with pruning from diagonals removing more. Building each output board costs O(n^2) per solution. The exact number of solutions grows faster than exponential, so no algorithm can list them for large n; for n = 8 there are 92 solutions and the search visits only a few thousand nodes." },
    { q: "How would you find one solution quickly for a very large n, such as a million?", a: "Backtracking is too slow in the worst case. For a single solution there are known explicit constructions based on arithmetic patterns of the column positions, and there are also local-search methods (min-conflicts) that start from a random placement and repeatedly move the queen with the most conflicts; they find a solution for a million queens in seconds on average. In an interview, naming these approaches and their trade-offs is enough." }
  ],
  tips: [
    "Start by saying 'one queen per row, so a state is a list of columns; I need O(1) checks for column and both diagonals, which r - c and r + c give me'. Drawing a 4 by 4 board with the r - c values in each cell convinces the interviewer.",
    "Store placement as a list of column indexes and render the strings only at a leaf; a one-line comprehension with dots and one Q does it.",
    "Test out loud: n = 1 (one board), n = 2 and n = 3 (no boards), n = 4 (two boards), and n = 8 (92, a number worth remembering).",
    "Offer the bit-mask version as the follow-up for counting and mention the mirror symmetry; both show that you know how to go beyond the first working solution."
  ]
});

EXTRA(23, "133. Clone Graph", {
  deep: [
    "Recognise the pattern from 'deep copy', 'clone', 'nodes with references to other nodes' and 'may contain cycles'. Any copy of a linked structure that can contain shared or cyclic references needs a map from original to copy; without it you either copy a shared node twice or loop forever. The same idea solves Copy List with Random Pointer (138) and copying trees with parent pointers.",
    "Why the one-pass DFS is correct: the dictionary is both the visited set and the result store. Registering the copy before visiting neighbours guarantees that when a cycle leads back to a node already in progress, dfs returns the existing copy instead of recursing again, so every original node is created exactly once and every edge is copied exactly once (each neighbour list is filled from the original list of the same node). Because the graph is connected, the DFS from the given node reaches all V nodes. Time O(V + E), space O(V) for the map plus O(V) recursion depth in the worst case (a long chain).",
    "Traps: registering the copy after the recursive calls (infinite recursion on a cycle); keying the dictionary by value when values could repeat; forgetting the None input; and returning a copy whose neighbour lists still contain original nodes (a shallow copy). If the graph is deep, Python recursion can hit the default limit of 1000, so the BFS version or an explicit stack is safer. If nodes have extra data, copy it too. If the graph is huge and copying must be lazy, you would build a view instead of a copy, which is a different design question."
  ],
  iq: [
    { q: "How would you verify that the result is really a deep copy?", a: "Walk both graphs together and check that no node of the clone is the same object as a node of the original (use the is operator), that values match, and that neighbour lists have the same values in the same order. A single shared object means a shallow copy somewhere.", c: `
class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

def is_deep_copy(a, b, seen=None):
    seen = seen if seen is not None else set()
    if a is b or a.val != b.val or len(a.neighbors) != len(b.neighbors):
        return False
    if a in seen:
        return True
    seen.add(a)
    return all(is_deep_copy(x, y, seen) for x, y in zip(a.neighbors, b.neighbors))

n1, n2 = Node(1), Node(2)
n1.neighbors, n2.neighbors = [n2], [n1]
c1, c2 = Node(1), Node(2)
c1.neighbors, c2.neighbors = [c2], [c1]
print(is_deep_copy(n1, c1))   # True
shallow = Node(1, [n2])
print(is_deep_copy(n1, shallow))   # False
` },
    { q: "Why do you insert the copy into the map before recursing into the neighbours?", a: "Because the graph can have cycles. If node 1 points to 2 and 2 points back to 1, dfs(1) calls dfs(2) which calls dfs(1) again. With the copy already in the map, the inner dfs(1) returns the copy immediately. Without it, the recursion never ends." },
    { q: "What is the difference between copy.copy and copy.deepcopy, and would deepcopy solve this problem?", a: "copy.copy makes a new top-level object but shares all nested objects, so the clone's neighbour list would still point to original nodes. copy.deepcopy recursively copies everything and uses a memo dictionary keyed by id to handle shared and cyclic references, which is exactly the algorithm here. It would pass the problem, but an interviewer wants to see you write the memo map yourself." },
    { q: "How do you clone a graph that is too deep for recursion?", a: "Use the BFS or an explicit stack. Create the copy of the start node, push the original on a queue, and whenever you pop a node, create copies for its unseen neighbours and append the copies to the current copy's neighbour list. The map is the same; only the traversal order changes, and there is no recursion depth to worry about." }
  ],
  tips: [
    "State the plan as 'DFS with a dictionary from original node to its copy; the dictionary is also my visited set', and point out the cycle problem and where the insert must go before writing code.",
    "Node objects hash by identity by default, so they can be dictionary keys directly; say that you rely on this and that keying by val would also work here because values are unique.",
    "Test out loud: None, a single node, two nodes pointing at each other, and the square from the example; then check that the returned node is not the input node.",
    "Mention copy.deepcopy and its memo dictionary as the production answer; it shows you know the standard library implements the same idea."
  ]
});

EXTRA(23, "994. Rotting Oranges", {
  deep: [
    "Recognise the pattern from 'each minute', 'spreads to neighbours', 'minimum time until all', or 'nearest source for every cell'. When several cells start the process at once and every step costs the same, it is a multi-source BFS: put all sources in the queue at distance 0 and expand level by level. Simulating minute by minute with full scans is the same computation done many times over.",
    "Why it is correct: BFS visits cells in order of their distance from the nearest source, because the queue holds the frontier at distance d before any cell at distance d + 1. Processing the queue one level at a time makes the level number equal the minute at which those oranges rot. Each cell is marked rotten the moment it is enqueued, so it enters the queue at most once; that gives the O(m * n) bound. The fresh counter avoids a final scan and makes the -1 test exact.",
    "Traps: off-by-one in the minute count, which happens when you add a minute after a level that rotted nothing; the fix in the code is the loop condition 'while queue and fresh'. Forgetting the case with zero fresh oranges, where the answer is 0, not -1. Marking cells rotten when dequeued instead of enqueued, which lets the same cell be queued many times. If the grid is huge and sparse in sources, BFS is still linear; if the spread had different costs per cell, you would need Dijkstra instead. If oranges could become fresh again, the problem would be a simulation, not a shortest-path problem."
  ],
  iq: [
    { q: "Why not run a BFS from each rotten orange separately and take the minimum per cell?", a: "That is O(S * m * n) where S is the number of rotten oranges, and in the worst case S is a large fraction of the grid, giving O((m * n)^2). Starting one BFS with all sources in the queue computes exactly the minimum over sources for every cell in a single O(m * n) pass, because a cell is reached first by its nearest source." },
    { q: "How do you process the queue level by level in Python?", a: "Read the queue length at the start of each minute and pop exactly that many items; everything appended during those pops belongs to the next minute. The alternative is to store the minute together with the cell as a tuple (r, c, t) and read the time from the last popped tuple.", c: `
from collections import deque

def rotting_with_timestamps(grid):
    rows, cols = len(grid), len(grid[0])
    grid = [row[:] for row in grid]
    queue = deque((r, c, 0) for r in range(rows) for c in range(cols) if grid[r][c] == 2)
    fresh = sum(row.count(1) for row in grid)
    last = 0
    while queue:
        r, c, t = queue.popleft()
        last = t
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                grid[nr][nc] = 2
                fresh -= 1
                queue.append((nr, nc, t + 1))
    return last if fresh == 0 else -1

print(rotting_with_timestamps([[2, 1, 1], [1, 1, 0], [0, 1, 1]]))   # 4
print(rotting_with_timestamps([[0, 2]]))   # 0
` },
    { q: "What changes if rotting also spreads diagonally, or if some cells are walls?", a: "Diagonal spread just adds four more neighbour offsets. Walls are the value 0 already: the BFS never enqueues them because it only enqueues cells equal to 1. The structure of the algorithm does not change, which is a sign that multi-source BFS is the right abstraction." },
    { q: "How would you solve problem 542 (distance of every cell to the nearest 0) with this idea?", a: "It is the same multi-source BFS: enqueue every 0 cell with distance 0, then expand level by level writing the distance into each 1 cell the first time it is reached. The result array is the BFS distance map. Problem 1162 (farthest cell from land) is also this BFS, keeping the maximum distance reached." }
  ],
  tips: [
    "Say 'multi-source BFS, all rotten oranges start in the queue, one level equals one minute' and mention the fresh counter for the -1 check; that sentence covers the whole algorithm.",
    "Keep the four direction offsets in a tuple of tuples and loop over them; writing out four if statements invites typos.",
    "Test out loud: the two given examples (4 and -1), a grid with no fresh oranges (0), a grid with fresh but no rotten (-1), and a 1 by 1 grid.",
    "If asked for complexity, say O(m * n) time and space, and explain that each cell is enqueued at most once because it is marked when enqueued."
  ]
});

EXTRA(23, "417. Pacific Atlantic Water Flow", {
  deep: [
    "Recognise the pattern from 'can reach the border', 'flows to both', 'connected to the edge' or 'from how many cells can X be reached'. When the question is about reaching a target set from many starts, flip it: search from the target set instead. One search from the targets replaces one search per start. Problems 130 (Surrounded Regions) and 1020 (Number of Enclaves) use the same flip, searching from the border inward.",
    "Why it is correct: water flows from A to B when height(B) <= height(A). Reversing every edge gives a graph where you move from B to A when height(A) >= height(B), that is, uphill or flat. A cell can reach the Pacific in the original graph exactly when the Pacific can reach it in the reversed graph. The flood from all Pacific edge cells computes the full set of such cells in one traversal, and the same holds for the Atlantic. Intersection gives cells that reach both. Each flood is O(m * n) because a cell is added to seen once.",
    "Traps: using the wrong direction of the comparison after the flip (it must be >=, equal heights flow both ways); forgetting that corner cells belong to both oceans; and starting the flood only from the top row and left column but forgetting the right column and bottom row for the Atlantic. If memory is tight, use two boolean grids instead of sets of tuples. If the grid were a real elevation model with millions of cells, you would use an iterative stack (as in the code) rather than recursion, and possibly BFS to keep the frontier small."
  ],
  iq: [
    { q: "Why does searching from the oceans reduce the complexity from O((m * n)^2) to O(m * n)?", a: "In the forward approach every cell starts its own search, and each search can cover the whole grid, so the work is the number of cells times the grid size. In the reverse approach there are only two searches, one per ocean, and each marks a cell at most once. The work is proportional to the grid size, not its square." },
    { q: "Can you solve it with BFS instead of DFS, and does it matter?", a: "Yes, replace the stack with a deque and popleft. Reachability does not depend on the order of visiting, so both give the same set. BFS keeps a smaller frontier on wide open grids and avoids any recursion concerns; DFS with an explicit stack is equally fine. Only recursive DFS is risky because the recursion depth can reach m * n on a grid.", c: `
from collections import deque

def flood_bfs(heights, starts):
    rows, cols = len(heights), len(heights[0])
    seen = set(starts)
    queue = deque(starts)
    while queue:
        r, c = queue.popleft()
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in seen and heights[nr][nc] >= heights[r][c]:
                seen.add((nr, nc))
                queue.append((nr, nc))
    return seen

h = [[1, 2, 2, 3, 5], [3, 2, 3, 4, 4], [2, 4, 5, 3, 1], [6, 7, 1, 4, 5], [5, 1, 1, 2, 4]]
pac = flood_bfs(h, [(0, c) for c in range(5)] + [(r, 0) for r in range(5)])
atl = flood_bfs(h, [(4, c) for c in range(5)] + [(r, 4) for r in range(5)])
print(sorted(pac & atl))   # [(0, 4), (1, 3), (1, 4), (2, 2), (3, 0), (3, 1), (4, 0)]
` },
    { q: "What if water could only flow strictly downhill?", a: "Then equal heights do not connect, and the reversed condition becomes strictly greater: heights[next] > heights[current]. Everything else stays the same. Saying this shows that you understand the flip rather than having memorised the comparison." },
    { q: "How would you return the cells that reach exactly one ocean?", a: "Compute the two sets as before and return the symmetric difference, pacific ^ atlantic in Python. Cells in neither set are those that cannot reach any ocean, for example a basin surrounded by higher ground." }
  ],
  tips: [
    "Open with 'instead of asking where each cell drains, I ask which cells each ocean can climb to; two floods and an intersection'. Interviewers are listening for that flip.",
    "Build the start lists with two comprehensions, one for the row edge and one for the column edge, and reuse one flood function for both oceans; duplicated code is where bugs hide.",
    "Test out loud: the given 5 by 5 example, a 1 by 1 grid (answer the single cell), a 2 by 2 grid (every cell, because every cell is an edge cell), and all equal heights (every cell).",
    "Use an iterative stack rather than recursion for grid floods and say why: recursion depth can reach the number of cells."
  ]
});

EXTRA(23, "127. Word Ladder", {
  deep: [
    "Recognise the pattern from 'shortest sequence of transformations', 'minimum number of steps', 'change one letter at a time' or 'each move costs the same'. Shortest path with unit costs is BFS, and the graph does not need to exist in memory: nodes are generated from the current state. Problems 752 (Open the Lock) and 433 (Minimum Genetic Mutation) are the same template with a different neighbour function.",
    "Why it is correct: BFS explores states in non-decreasing distance from the start, so the first time the end word is dequeued its distance is minimal. The buckets are a correct neighbour function because two words of equal length differ in exactly one position if and only if they share a pattern with one wildcard at that position. Marking a word visited when it is enqueued keeps each word in the queue at most once and does not lose optimality, because the first enqueue already happens at the smallest possible distance. The total cost is O(N * L^2): building patterns costs L patterns of length L per word, and the BFS touches each bucket entry a constant number of times.",
    "Traps: returning the number of edges instead of the number of words (the expected answer is 5, not 4); forgetting to check that the end word is in the list; generating neighbours by trying all 26 letters at each position without buckets, which is O(26 * L^2) per word and acceptable but slower; and visiting on dequeue instead of enqueue, which can make the queue grow quadratically. If the dictionary is enormous, bidirectional BFS expands from both ends and meets in the middle, which cuts the explored states from b^d to about 2 * b^(d / 2). If you need all shortest ladders (126), BFS must record parents for each level and then backtrack."
  ],
  iq: [
    { q: "How would you speed this up for a very large dictionary?", a: "Bidirectional BFS: keep two frontiers, one from begin and one from end, and always expand the smaller one. Stop when a word appears in both. The number of explored states drops from roughly b^d to 2 * b^(d / 2), which is a large saving when the ladder is long.", c: `
from collections import defaultdict

def ladder_bidirectional(begin, end, word_list):
    words = set(word_list)
    if end not in words:
        return 0
    buckets = defaultdict(list)
    for w in words | {begin}:
        for i in range(len(w)):
            buckets[w[:i] + "*" + w[i + 1:]].append(w)
    front, back = {begin}, {end}
    visited = {begin, end}
    steps = 1
    while front and back:
        if len(front) > len(back):
            front, back = back, front
        nxt = set()
        for word in front:
            for i in range(len(word)):
                for cand in buckets[word[:i] + "*" + word[i + 1:]]:
                    if cand in back:
                        return steps + 1
                    if cand not in visited:
                        visited.add(cand)
                        nxt.add(cand)
        front = nxt
        steps += 1
    return 0

print(ladder_bidirectional("hit", "cog", ["hot", "dot", "dog", "lot", "log", "cog"]))   # 5
print(ladder_bidirectional("hit", "cog", ["hot", "dot", "dog", "lot", "log"]))          # 0
` },
    { q: "Why is BFS the right choice and not DFS or Dijkstra?", a: "Every transformation has the same cost, so the shortest path in edges is the shortest path in cost, and BFS finds it in O(V + E) without a heap. DFS finds some path, not the shortest one, and may explore exponentially many ladders first. Dijkstra would be correct but does extra log-factor work for nothing; it becomes necessary only when steps have different costs." },
    { q: "How many edges can the word graph have, and how does that affect complexity?", a: "Each word has at most 25 * L one-letter neighbours but only those in the dictionary count, so the edge count is at most N * 25 * L and usually far less. With buckets, the BFS cost is proportional to the sum of bucket sizes visited, which is O(N * L) entries each handled once, plus O(L) string work per entry, giving O(N * L^2) overall." },
    { q: "How do you return the actual ladder, not only its length?", a: "Store a parent dictionary: when a word is enqueued, record the word it came from. When the end word is reached, follow the parents back to begin and reverse the list. This adds O(N) memory and no extra time. For all shortest ladders (problem 126), keep a list of parents per word but only from the previous BFS level." }
  ],
  tips: [
    "Say 'words are nodes, one-letter changes are edges, shortest path with unit cost means BFS' and then explain the wildcard bucket trick as the way to find neighbours quickly.",
    "Build the pattern with word[:i] + '*' + word[i + 1:]; the same expression is used when building the buckets and when querying them, so put it in a tiny helper to avoid a mismatch.",
    "Test out loud: the given example (5), the end word missing (0), begin equal to a one-step neighbour (2), and a dictionary containing the begin word itself (must not break).",
    "Mention bidirectional BFS and the parent map for reconstructing the path as the two standard follow-ups."
  ]
});

EXTRA(23, "743. Network Delay Time", {
  deep: [
    "Recognise the pattern from 'weighted edges', 'minimum time or cost to reach', 'non-negative weights' and 'from one source to all nodes'. Unit weights mean BFS; non-negative weights mean Dijkstra; negative weights mean Bellman-Ford; all pairs means Floyd-Warshall. The final answer here is the maximum over all shortest distances, which is just a different way of reading the same distance table.",
    "Why Dijkstra is correct: when a node u is popped with distance d, every other unsettled node has a tentative distance >= d, and because weights are non-negative any path to u through an unsettled node would be at least d. So d is final. The lazy version pushes a new heap entry each time a shorter candidate is found and skips entries for already-settled nodes; it is simpler than a decrease-key heap and has the same O((V + E) log V) bound because at most E + 1 entries are pushed. The dist dictionary doubles as the visited set, and its size tells you how many nodes were reached.",
    "Traps: using Dijkstra when weights can be negative (it gives wrong answers silently); forgetting to skip stale heap entries (correctness is fine but you may relax edges from a node twice); building the graph with a plain dict and crashing on a node with no outgoing edges (defaultdict avoids it); and returning the maximum of the distance array including index 0 when nodes are 1-based. If the graph is dense (E close to V^2), the array-based O(V^2) Dijkstra without a heap is faster. If there are many queries from different sources on the same graph, precompute with Floyd-Warshall O(V^3) or run Dijkstra per source."
  ],
  iq: [
    { q: "Why does Dijkstra fail with negative edge weights?", a: "The proof that a popped node is final assumes no later path can be shorter, which is only true when adding edges never decreases the total. A negative edge can make a longer-looking path cheaper after the node is already settled. Bellman-Ford handles negative weights in O(V * E) and also detects negative cycles.", c: `
import heapq
from collections import defaultdict

def dijkstra(edges, n, src):
    graph = defaultdict(list)
    for u, v, w in edges:
        graph[u].append((v, w))
    dist, heap = {}, [(0, src)]
    while heap:
        d, u = heapq.heappop(heap)
        if u in dist:
            continue
        dist[u] = d
        for v, w in graph[u]:
            if v not in dist:
                heapq.heappush(heap, (d + w, v))
    return dist

def bellman_ford(edges, n, src):
    dist = {i: float("inf") for i in range(1, n + 1)}
    dist[src] = 0
    for _ in range(n - 1):
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    return dist

edges = [[1, 2, 2], [1, 3, 5], [2, 3, -4]]   # 1 -> 2 -> 3 costs -2, cheaper than the direct 5
print(dijkstra(edges, 3, 1)[3], bellman_ford(edges, 3, 1)[3])   # -2 -2
edges = [[1, 3, 1], [1, 2, 5], [2, 3, -10]]  # Dijkstra settles 3 at cost 1 and never looks back
print(dijkstra(edges, 3, 1)[3], bellman_ford(edges, 3, 1)[3])   # 1 -5
` },
    { q: "What is the complexity of the heap version and when is the O(V^2) version better?", a: "With a binary heap each edge can push one entry, so O(E log E) pushes and pops, usually written O((V + E) log V) since E <= V^2. For dense graphs where E is close to V^2, the simple array version that scans for the minimum each round is O(V^2), which is less than O(V^2 log V) and has no heap overhead." },
    { q: "How would you return the actual path to the slowest node?", a: "Keep a parent dictionary: when you push (d + w, v) also remember that v was reached from u with distance d + w, and finalise the parent when v is popped. After the run, find the node with the maximum distance and follow parents back to the source." },
    { q: "How does this relate to real routing protocols?", a: "Link-state protocols such as OSPF and IS-IS give every router the whole topology and each one runs Dijkstra with itself as the source to fill its routing table. Distance-vector protocols such as RIP run a distributed form of Bellman-Ford. Knowing which family a protocol belongs to is a common system-design follow-up." }
  ],
  tips: [
    "Name the decision table out loud: unit weights BFS, non-negative Dijkstra, negative Bellman-Ford, all pairs Floyd-Warshall. Then say the answer is the maximum of the shortest distances.",
    "Use the lazy Dijkstra pattern: push (distance, node), skip a popped node that is already in dist. It is shorter and less error-prone than decrease-key.",
    "Test out loud: the given example (2), an unreachable node (-1), n = 1 (0), and a case where the direct edge is longer than a two-hop path, to show relaxation works.",
    "Build the adjacency list with defaultdict(list) so nodes without outgoing edges do not raise KeyError, and remember that the nodes are 1-based."
  ]
});
