EXTRA(9, "Two Sum", {
  deep: [
    "How to recognise it: the problem asks for a pair of items that together match a value, the data is NOT sorted, and you must return positions or say if a pair exists. The key idea is the complement. For each number n you already know the exact partner you need: target minus n. So the question changes from 'which pair works?' to 'have I already seen this one value?', and a dictionary answers that in one step.",
    "The template is one loop: look up the complement first, and only then store the current number. The order matters. If you store first, the number can match itself (target 6 and number 3). Checking first also handles duplicates such as [3, 3] with target 6 correctly, because the first 3 is already in the dictionary when the second 3 arrives. The time is O(n) because a dictionary lookup is O(1) on average, and the space is O(n) because in the worst case you store almost every number.",
    "The variations decide the best tool. If the list is sorted, use two pointers and you need no extra memory. If you must count all pairs, store a count for each value, not an index. For three numbers (3Sum) sort the list, fix one number, and run two pointers on the rest, which is O(n^2). Classic mistakes: sorting the list and then returning the new positions when the question asked for the original indexes, using the same element twice, and assuming there is always exactly one answer without asking the interviewer."
  ],
  iq: [
    { q: "What if the array is already sorted? Can you do it in O(1) extra space?", a: "Yes. Put one pointer at the start and one at the end. If the sum is too small move the left pointer right, and if it is too big move the right pointer left. This is O(n) time and O(1) space, so the hash map is not needed. This is the problem 'Two Sum II'.", c: `
def two_sum_sorted(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        s = nums[lo] + nums[hi]
        if s == target:
            return [lo, hi]
        if s < target:
            lo += 1
        else:
            hi -= 1
    return []

print(two_sum_sorted([1, 2, 4, 7, 11], 9))   # [1, 3]
` },
    { q: "Why must you check for the complement BEFORE you store the current number?", a: "If you store first, a number can find itself as its own partner. With [3, 2, 4] and target 6, the number 3 is stored, then 6 - 3 = 3 is found at the same index, and the function returns the same position twice. Checking first means the dictionary only holds earlier elements.", c: `
def two_sum_wrong(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        seen[n] = i                    # stored too early
        if target - n in seen:
            return [seen[target - n], i]

print(two_sum_wrong([3, 2, 4], 6))     # [0, 0]  wrong, index 0 used twice
` },
    { q: "How do you count ALL pairs that add up to the target when there are duplicates?", a: "Store how many times each value has been seen, not its index. For each number, add the count of its complement to the total, then increase the count of the number itself. Each pair is counted once because a number only pairs with numbers that came before it.", c: `
from collections import Counter

def count_pairs(nums, target):
    seen = Counter()
    total = 0
    for n in nums:
        total += seen[target - n]      # a missing key counts as 0
        seen[n] += 1
    return total

print(count_pairs([1, 1, 2, 3, 3], 4))   # 4
` },
    { q: "How do you extend this to three numbers (3Sum)?", a: "Sort the list, then loop over each element as the first number and run the two-pointer search on the part to its right for the remaining sum. That is O(n^2) time, which is the expected answer. To avoid repeated triplets, skip a value when it is equal to the previous one at the same position." }
  ],
  tips: [
    "The same idea is used to match records in real systems, for example finding two payments that together equal one invoice amount. Build the dictionary once and each match is one lookup.",
    "Testing 'x in some_list' is O(n). If you do it inside a loop you have written the brute force by accident, so convert the list to a set or dict first.",
    "Never compare money as floats, because 0.1 + 0.2 == 0.3 is False in Python. Store amounts as whole cents (integers) or use decimal.Decimal before you look for complements.",
    "If you need every position of a value, not only the last one, use collections.defaultdict(list) and append each index."
  ]
});

EXTRA(9, "Sliding Window", {
  deep: [
    "How to recognise it: the words 'contiguous', 'subarray', 'substring' or 'consecutive', together with 'longest', 'shortest', 'maximum sum' or 'at most K'. If the answer is a continuous block of the input and the brute force checks every block, think of a window. If the items do not need to be next to each other, it is not a sliding window problem.",
    "There are two kinds. A fixed window has a known size k: add the new element on the right and remove the one that left. A variable window grows and shrinks: move the right edge one step at a time, and while the window breaks the rule, move the left edge forward. Both are O(n) even though the variable version has a loop inside a loop, because each element enters the window once and leaves it at most once.",
    "The variable window only works when the rule is monotonic: making the window bigger can only push it one way (for example the sum only grows), and making it smaller can only push it back. With negative numbers the sum can go up or down when you shrink, so the method gives wrong answers. In that case use a prefix sum with a hash map.",
    "Classic mistakes: the window length is right - left + 1, not right - left. For a 'longest' problem update the answer after the shrinking loop, when the window is valid. For a 'shortest' problem update it inside the shrinking loop, while the window is still valid. Also remember to remove the left element from your counts or your set when you move the left edge."
  ],
  iq: [
    { q: "Find the length of the longest substring without repeating characters.", a: "Use a variable window and remember the last index of every character. When a character repeats inside the current window, jump the left edge to one position after its previous index. The check that the previous index is not before 'left' is important, as the input 'abba' shows.", c: `
def longest_unique(s):
    last = {}                          # char -> last index seen
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best

print(longest_unique("abcabcbb"))      # 3
print(longest_unique("abba"))          # 2
` },
    { q: "What if the array has negative numbers and you need a subarray with sum exactly k?", a: "The sliding window fails, because shrinking the window no longer always reduces the sum, so you cannot decide which edge to move. Use a running prefix sum and a dictionary that counts each prefix sum seen so far. A subarray ending here has sum k when the value 'current prefix minus k' was seen before. This is the problem 'Subarray Sum Equals K'." },
    { q: "Find the shortest subarray whose sum is at least a target (all numbers positive).", a: "Grow the window to the right. While the sum is big enough, record the length and shrink from the left. The answer is updated inside the while loop because that is when the window is valid. It is O(n) because the left pointer only moves forward.", c: `
def min_len(nums, target):
    left = total = 0
    best = len(nums) + 1
    for right, n in enumerate(nums):
        total += n
        while total >= target:
            best = min(best, right - left + 1)
            total -= nums[left]
            left += 1
    return best if best <= len(nums) else 0

print(min_len([2, 3, 1, 2, 4, 3], 7))  # 2
` },
    { q: "How do you get the maximum of every window of size k in O(n)?", a: "Calling max() on each window is O(n*k). Keep a deque of indexes whose values are in decreasing order. Before adding a new index, pop smaller values from the back, because they can never be the maximum again. The front of the deque is always the maximum of the window. Every index is pushed and popped once, so it is O(n). This is 'Sliding Window Maximum'." }
  ],
  tips: [
    "Rate limiters, moving averages on dashboards and 'errors in the last 5 minutes' alerts are all sliding windows over time.",
    "collections.deque(maxlen=k) keeps only the last k items automatically. It is a simple way to hold a fixed window over a stream.",
    "A slice such as nums[i:i + k] copies k items every time. Keep a running sum or a running Counter and update it when the window moves.",
    "When you track characters with a Counter, delete a key when its count reaches zero. Then len(counter) is the number of different characters in the window."
  ]
});

EXTRA(9, "Two Pointers", {
  deep: [
    "How to recognise it: the input is sorted (or can be sorted), and the question is about a pair or triplet, a palindrome, or changing a list 'in place' with O(1) extra space. Linked list questions about the middle node or a cycle are also two-pointer problems.",
    "There are three shapes. Opposite ends: one pointer at each end, moving towards each other (pair sum, palindrome, container with most water). Same direction: a slow 'write' pointer and a fast 'read' pointer (remove duplicates, move zeros, fast and slow in a linked list). Two inputs: one pointer in each sorted list (merge, intersection).",
    "It is O(n) because every step moves at least one pointer and no pointer ever moves back, so there are at most n steps in total. The logic for a sorted pair sum is a proof by elimination: when the sum is too small, the left value cannot work with any remaining right value, so it is safe to drop it for ever.",
    "Classic mistakes: using it on unsorted data, forgetting that sorting costs O(n log n) and destroys the original indexes, writing 'left <= right' when the two pointers must be different elements, and a loop where in some branch no pointer moves, which never ends."
  ],
  iq: [
    { q: "Remove duplicates from a sorted array in place with O(1) extra space.", a: "Use a read pointer and a write pointer. The read pointer visits every element. When it finds a value different from the last value kept, copy it to the write position and move the write pointer. The first 'write' elements are the answer.", c: `
def dedupe(nums):
    if not nums:
        return 0
    write = 1
    for read in range(1, len(nums)):
        if nums[read] != nums[write - 1]:
            nums[write] = nums[read]
            write += 1
    return write

a = [1, 1, 2, 2, 2, 3]
k = dedupe(a)
print(k, a[:k])                        # 3 [1, 2, 3]
` },
    { q: "The array is not sorted. Should you still use two pointers for a pair sum?", a: "Only if you are allowed to sort it and you need the values, not the original positions. Sorting costs O(n log n) and changes the indexes. If the question wants indexes, the hash map solution is O(n) and keeps them, so it is the better choice." },
    { q: "Check if a sentence is a palindrome, ignoring spaces, punctuation and letter case.", a: "Move two pointers from both ends and skip any character that is not a letter or digit. Compare the two characters in lower case. This uses O(1) extra space, while cleaning the string first and reversing it uses O(n).", c: `
def is_pal(s):
    i, j = 0, len(s) - 1
    while i < j:
        if not s[i].isalnum():
            i += 1
        elif not s[j].isalnum():
            j -= 1
        else:
            if s[i].lower() != s[j].lower():
                return False
            i += 1
            j -= 1
    return True

print(is_pal("A man, a plan, a canal: Panama"))   # True
print(is_pal("race a car"))                       # False
` },
    { q: "In 'Container With Most Water', why do you always move the pointer at the shorter line?", a: "The area is the width times the shorter line. If you move the taller line, the width gets smaller and the height can never be more than the same shorter line, so the area cannot improve. Moving the shorter line is the only move that can find something better, so nothing useful is skipped." }
  ],
  tips: [
    "To merge sorted inputs in real code use heapq.merge(a, b). It is lazy, so it also works on big sorted files or log streams.",
    "Comparing two sorted lists of IDs with two pointers finds missing and extra records in one pass. This is how many sync and reconciliation jobs work.",
    "s == s[::-1] is fine and clear in normal code. In an interview say that it uses O(n) extra memory and offer the two-pointer version.",
    "The read and write pointer trick removes items from a list in place. Never call list.remove() inside a loop over the same list: it is O(n) per call and it skips elements."
  ]
});

EXTRA(9, "Binary Search", {
  deep: [
    "How to recognise it: the data is sorted, or the question demands O(log n), or it asks for the 'first' or 'last' position of something. A less obvious signal is 'find the minimum value such that ...' or 'minimise the maximum'. That is binary search on the answer: you do not search the array, you search the range of possible answers.",
    "Binary search on the answer works when a yes/no check is monotonic. Example: if a ship with capacity 10 can deliver everything in time, then capacity 11 can too. So the answers look like no, no, no, yes, yes, yes, and you search for the first yes. The cost is O(n log R), where the check costs O(n) and R is the size of the answer range.",
    "Learn two templates. Exact match: while lo <= hi, with lo = mid + 1 or hi = mid - 1. Boundary (first position where a condition is true): while lo < hi, with hi = mid when the condition is true and lo = mid + 1 when it is false, and lo is the answer at the end. Mixing the two templates is the main source of bugs.",
    "Classic mistakes: writing lo = mid in a loop where mid is rounded down, which never ends when lo and hi are neighbours; using it on unsorted data; and forgetting the case where the target is larger than every element. Each step halves the range, so one million items need about 20 steps."
  ],
  iq: [
    { q: "The array has duplicates. Find the first and the last position of the target.", a: "A plain binary search stops at any matching index. Use two boundary searches: bisect_left gives the first position where the target could be inserted, and bisect_right gives the position after the last equal element. Both are O(log n). Always check that the target is really there.", c: `
import bisect

def first_last(nums, target):
    i = bisect.bisect_left(nums, target)
    if i == len(nums) or nums[i] != target:
        return [-1, -1]
    return [i, bisect.bisect_right(nums, target) - 1]

print(first_last([5, 7, 7, 8, 8, 10], 8))   # [3, 4]
print(first_last([5, 7, 7, 8, 8, 10], 6))   # [-1, -1]
` },
    { q: "Search in a sorted array that was rotated, for example [4, 5, 6, 7, 0, 1, 2].", a: "After you pick the middle, at least one half is still fully sorted. Find which half is sorted by comparing the ends, then check if the target is inside that half. If yes search there, if not search the other half. It stays O(log n).", c: `
def search_rotated(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:              # left half is sorted
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:                                  # right half is sorted
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1

print(search_rotated([4, 5, 6, 7, 0, 1, 2], 0))   # 4
` },
    { q: "Koko must eat all banana piles in h hours. Find the slowest eating speed that works. Where is the binary search?", a: "The search is on the speed, not on the array. If speed s works, every faster speed works too, so the check is monotonic. Search speeds from 1 to the largest pile and keep the smallest speed that passes the check. This is binary search on the answer.", c: `
def min_speed(piles, hours):
    lo, hi = 1, max(piles)
    while lo < hi:
        mid = (lo + hi) // 2
        need = sum((p + mid - 1) // mid for p in piles)   # round up
        if need <= hours:
            hi = mid          # works, try slower
        else:
            lo = mid + 1      # too slow
    return lo

print(min_speed([3, 6, 7, 11], 8))     # 4
` },
    { q: "Why is mid = (lo + hi) // 2 a bug in Java or C but not in Python?", a: "In languages with fixed 32-bit integers, lo + hi can be larger than the biggest integer and become negative. The safe form there is lo + (hi - lo) // 2. Python integers grow as needed, so the simple form is correct, but knowing the safe form shows experience." }
  ],
  tips: [
    "Use the bisect module in real code and do not write the loop by hand. bisect_left and bisect_right are tested and fast.",
    "bisect.insort keeps a list sorted when you add an item. Finding the place is O(log n), but the insert itself is O(n) because the list must shift elements.",
    "'x in sorted_list' is still a linear scan. Python does not know that the list is sorted, so use bisect or a set.",
    "The idea is useful outside arrays: git bisect finds the commit that broke something, and you can binary search for the largest batch size or request rate that a service still handles."
  ]
});

EXTRA(9, "Prefix Sum", {
  deep: [
    "How to recognise it: 'sum of elements between i and j', many queries on data that does not change, or 'count the subarrays whose sum is k' or 'is divisible by k'. The key fact is that every subarray sum is the difference of two prefix sums. So a question about subarrays becomes a question about pairs of prefix values.",
    "Build the prefix list with one extra 0 at the start, so prefix[i] is the sum of the first i elements. Then the sum of positions i to j is prefix[j + 1] - prefix[i] with no special case for i = 0. Building is O(n), and after that each query is O(1).",
    "The strong variation is prefix sum plus hash map. Walk through the array with a running total and store how many times each total has appeared. A subarray ending here has sum k if 'total - k' appeared before. This works with negative numbers, where the sliding window fails. The dictionary must start with {0: 1}, which stands for the empty prefix.",
    "Other variations: a 2-D prefix table for rectangle sums, prefix XOR, and the difference array, which is the reverse idea and makes range updates O(1). When NOT to use it: if the data changes between queries, every update costs O(n) to rebuild. Then use a Fenwick tree (binary indexed tree) or a segment tree, which give O(log n) for both update and query."
  ],
  iq: [
    { q: "Count the subarrays whose sum equals k. The array can contain negative numbers.", a: "Keep a running total and a dictionary of how often each total has been seen. For each element add the count of 'total - k' to the answer, then record the new total. Look up first and record after, or a subarray of length zero is counted. It is O(n) time and O(n) space.", c: `
from collections import defaultdict

def count_subarrays(nums, k):
    seen = defaultdict(int)
    seen[0] = 1                        # the empty prefix
    total = count = 0
    for n in nums:
        total += n
        count += seen[total - k]
        seen[total] += 1
    return count

print(count_subarrays([1, 1, 1], 2))          # 2
print(count_subarrays([1, -1, 1, -1], 0))     # 4
` },
    { q: "What if the array is updated between the range queries?", a: "A plain prefix array must be rebuilt after each change, which is O(n) per update. Use a Fenwick tree or a segment tree: both answer a range sum and apply a point update in O(log n). Say this trade-off clearly: prefix sums are for data that is read many times and never or rarely changed." },
    { q: "You get many updates of the form 'add v to every element from index a to b', and you read the array only at the end. How do you make it fast?", a: "Use a difference array. For each update add v at index a and subtract v at index b + 1. At the end one running sum over the difference array gives the final values. Each update is O(1), not O(n).", c: `
def apply_updates(n, updates):
    diff = [0] * (n + 1)
    for start, end, value in updates:
        diff[start] += value
        diff[end + 1] -= value
    result, running = [], 0
    for i in range(n):
        running += diff[i]
        result.append(running)
    return result

print(apply_updates(5, [(1, 3, 2), (2, 4, 3)]))   # [0, 2, 5, 5, 3]
` },
    { q: "Solve 'Product of Array Except Self' without using division.", a: "Use the same idea with products. The answer at position i is the product of everything on its left times the product of everything on its right. Compute the left products in one pass and multiply in the right products in a second pass from the end. It is O(n), and it also works when the array contains zero, where division would fail." }
  ],
  tips: [
    "itertools.accumulate(nums, initial=0) builds the prefix list in one line, and numpy.cumsum does it for arrays.",
    "In SQL a running total is SUM(amount) OVER (ORDER BY day). It is the same idea, computed by the database.",
    "Monitoring counters, such as total requests since start, are prefix sums. The number of requests in a time range is the difference of two readings.",
    "For a dashboard over data that changes only once a day, compute the cumulative totals in the nightly job and answer every range query with one subtraction."
  ]
});

EXTRA(9, "Hash Map", {
  deep: [
    "How to recognise it: the words 'count', 'frequency', 'duplicate', 'group', 'seen before', 'first unique', or any brute force that compares every item with every other item. Ask yourself: what do I need to find quickly, and what key would find it? Designing the key is the real skill.",
    "Inside, a dict computes hash(key) and uses it to pick a slot in an array. Two keys can land in the same slot (a collision), and Python then tries other slots. When the table gets too full Python makes a bigger one and moves everything. This is why lookup and insert are O(1) on average. The worst case is O(n), but with normal keys you do not meet it.",
    "A key must be hashable, which in practice means it cannot change: str, int, tuple and frozenset work, while list, dict and set do not. Good key designs: the sorted letters of a word for anagrams, a tuple of counts, a running prefix sum, a remainder, or a (row, column) tuple for grid cells.",
    "Classic mistakes: changing a dict while looping over it (RuntimeError), reading a missing key from a defaultdict, which silently creates that key, and expecting sorted order. A dict keeps insertion order (guaranteed since Python 3.7), not sorted order. If you need ordering or range queries, a hash map is the wrong tool."
  ],
  iq: [
    { q: "Can you group anagrams without sorting every word?", a: "Yes. Use the letter counts as the key: a tuple of 26 numbers. Building it is O(k) for a word of length k, and sorting is O(k log k). The total becomes O(n * k). The list of counts must be turned into a tuple, because a list cannot be a dict key.", c: `
from collections import defaultdict

def group_anagrams(words):
    groups = defaultdict(list)
    for w in words:
        counts = [0] * 26
        for ch in w:
            counts[ord(ch) - ord("a")] += 1
        groups[tuple(counts)].append(w)
    return list(groups.values())

print(group_anagrams(["eat", "tea", "tan", "ate", "nat"]))
# [['eat', 'tea', 'ate'], ['tan', 'nat']]
` },
    { q: "Why can a list not be used as a dictionary key?", a: "A key's hash must never change while it is in the dict, or the dict would look in the wrong slot and lose the item. A list can change, so Python does not let it be hashed and raises TypeError: unhashable type. Convert it to a tuple, or to a frozenset if the order does not matter." },
    { q: "Find the index of the first character that appears only once in a string.", a: "Do two passes. First count every character, then walk the string again in order and return the first index whose count is 1. A single pass cannot know that a character will not repeat later. It is O(n) time, and the space is limited by the size of the alphabet.", c: `
from collections import Counter

def first_unique(s):
    counts = Counter(s)
    for i, ch in enumerate(s):
        if counts[ch] == 1:
            return i
    return -1

print(first_unique("leetcode"))        # 0
print(first_unique("loveleetcode"))    # 2
` },
    { q: "When is a hash map the wrong choice?", a: "When you need order: the smallest key, the next larger key, or all keys in a range. A hash map would need a full scan or a sort for these. Use a sorted list with bisect, a heap, or a tree. A dict also uses much more memory than a plain list, which matters with many millions of small items." }
  ],
  tips: [
    "collections.Counter(items).most_common(3) gives the top three items with their counts in one line.",
    "To join two lists of records, first build an index such as by_id = {row['id']: row for row in rows}. That turns an O(n * m) nested loop into O(n + m).",
    "Use d.get(key, default) or a defaultdict to avoid KeyError. Write 'key in d', not 'key in d.keys()'.",
    "Use a set to remove duplicates or to test membership. list(dict.fromkeys(items)) removes duplicates and keeps the original order."
  ]
});

EXTRA(9, "Stack", {
  deep: [
    "How to recognise it: nesting or matching (brackets, tags), 'undo', 'the most recent', evaluating an expression, and 'next greater' or 'previous smaller' element. If you must come back to something you started and did not finish, and the newest one finishes first, it is a stack.",
    "The important variation is the monotonic stack. Keep the stack ordered, for example indexes whose values only go down. When a new value is bigger than the top, pop: the new value is the 'next greater element' for everything you pop. It looks like a nested loop, but each index is pushed once and popped at most once, so the total is O(n).",
    "In Python a list is the stack: append and pop at the END are O(1). Do not use insert(0, x) or pop(0), which are O(n). A stack is also how you turn recursion into a loop: you push the work that the call stack would have remembered for you.",
    "Classic mistakes: popping from an empty stack (always check 'if stack' first), forgetting to check what is still on the stack at the end, and pushing values when you need indexes. With indexes you can compute distances, and you can still read the value from the array."
  ],
  iq: [
    { q: "For each day, find how many days you must wait for a warmer temperature (Daily Temperatures).", a: "Use a monotonic stack of indexes that are still waiting for a warmer day. When today's temperature is higher than the temperature at the top index, pop that index: the wait is today minus that index. Indexes that are never popped keep the answer 0. It is O(n).", c: `
def days_until_warmer(temps):
    answer = [0] * len(temps)
    stack = []                          # indexes still waiting
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer

print(days_until_warmer([73, 74, 75, 71, 69, 72, 76, 73]))
# [1, 1, 4, 2, 1, 1, 0, 0]
` },
    { q: "Design a stack that also returns its minimum in O(1) (Min Stack).", a: "Store with each element the minimum of the stack at the moment it was pushed. The current minimum is then always on the top entry, and a pop restores the previous minimum automatically. All operations stay O(1), and the price is O(n) extra space.", c: `
class MinStack:
    def __init__(self):
        self.items = []                 # (value, min so far)
    def push(self, x):
        low = min(x, self.items[-1][1]) if self.items else x
        self.items.append((x, low))
    def pop(self):
        return self.items.pop()[0]
    def get_min(self):
        return self.items[-1][1]

s = MinStack()
s.push(5); s.push(2); s.push(8)
print(s.get_min())                      # 2
s.pop(); s.pop()
print(s.get_min())                      # 5
` },
    { q: "Can you check valid parentheses in O(1) space?", a: "Only when there is one kind of bracket. Then a counter is enough: add one for an opener, subtract one for a closer, never let it go below zero, and it must be zero at the end. With several kinds of brackets you must remember the order of the openers, so you need the stack and O(n) space." },
    { q: "How do you build a queue with only stacks?", a: "Use two stacks, an inbox and an outbox. Push always goes to the inbox. For a pop, if the outbox is empty, move everything from the inbox to the outbox, which reverses the order, then pop from the outbox. Each element is moved at most once, so every operation is O(1) amortised." }
  ],
  tips: [
    "Undo and redo are two stacks: every action goes on the undo stack, and an undo moves it to the redo stack.",
    "A Python traceback is a print of the call stack. Read it from the bottom: the last line is the error and the lines above show how the program got there.",
    "When a recursive function can go very deep, rewrite it with your own list as a stack. Your list can hold millions of items, while the recursion limit is about 1000 calls.",
    "Parsers for JSON, HTML and maths expressions use a stack for the open elements. That is why an unclosed bracket is often reported only at the end of the file."
  ]
});

EXTRA(9, "Queue", {
  deep: [
    "How to recognise it: 'in the order they arrive', 'level by level', 'fewest steps', 'the last N seconds', or a producer that adds work while a consumer takes it. If the oldest waiting item must be handled first, it is a queue.",
    "Use collections.deque. Adding and removing at both ends are O(1). A list is bad as a queue because list.pop(0) moves every other element one place, which is O(n) per call and makes the whole loop O(n^2). The other side of the trade: reading the middle of a deque by index is slow, while a list does it in O(1).",
    "Variations: a circular buffer with deque(maxlen=n), a monotonic deque for the maximum of a sliding window, and a priority queue, which is NOT first-in first-out and is built with heapq. For threads use queue.Queue, which can block and wait, and for async code use asyncio.Queue.",
    "Classic mistakes: reading q[0] on an empty deque (IndexError), marking a node as visited only when it leaves the queue in BFS, so it is added many times, and queues without a size limit in real systems. If producers are faster than consumers, such a queue grows until memory is full."
  ],
  iq: [
    { q: "Return the maximum of every window of size k in O(n) (Sliding Window Maximum).", a: "Keep a deque of indexes whose values are in decreasing order. Before adding a new index, remove smaller or equal values from the back, since they can never be the maximum again. Remove the front when it is outside the window. The front is the maximum of the current window.", c: `
from collections import deque

def window_max(nums, k):
    dq, result = deque(), []
    for i, n in enumerate(nums):
        while dq and nums[dq[-1]] <= n:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:              # front left the window
            dq.popleft()
        if i >= k - 1:
            result.append(nums[dq[0]])
    return result

print(window_max([1, 3, -1, -3, 5, 3, 6, 7], 3))   # [3, 3, 5, 5, 6, 7]
` },
    { q: "Why is a Python list a bad queue?", a: "list.pop(0) and list.insert(0, x) are O(n), because every other element must move by one position. With n items the loop becomes O(n^2). deque.popleft() is O(1) because a deque is built to grow and shrink at both ends." },
    { q: "Implement a queue using two stacks.", a: "Push goes to an inbox stack. For a pop, if the outbox stack is empty, move all items from the inbox to the outbox. Moving reverses the order, so the oldest item ends on top. Each item is moved once, so the cost is O(1) amortised per operation.", c: `
class TwoStackQueue:
    def __init__(self):
        self.inbox, self.outbox = [], []
    def push(self, x):
        self.inbox.append(x)
    def pop(self):
        if not self.outbox:
            while self.inbox:
                self.outbox.append(self.inbox.pop())
        return self.outbox.pop()

q = TwoStackQueue()
q.push(1); q.push(2); q.push(3)
print(q.pop(), q.pop())                 # 1 2
` },
    { q: "What is the difference between collections.deque and queue.Queue?", a: "deque is a plain data structure, the right choice for algorithms such as BFS. queue.Queue is made for passing work between threads: get() can wait until an item arrives, put() can wait when the queue is full, and task_done() with join() lets you wait until all work is finished. For algorithm code it only adds overhead." }
  ],
  tips: [
    "deque(maxlen=100) keeps the last 100 items and drops the oldest automatically. It is useful for 'the last N log lines' or recent events.",
    "Give work queues a maximum size, for example queue.Queue(maxsize=1000). A full queue then slows the producer down (back-pressure) and memory stays safe.",
    "In production the queue between services is usually an external system such as RabbitMQ, Kafka, SQS or a Redis list, often used through a library like Celery. The first-in first-out idea is the same.",
    "A pool of asyncio tasks that all read from one asyncio.Queue is the standard way to limit how many requests run at the same time."
  ]
});

EXTRA(9, "Linked List", {
  deep: [
    "How to recognise it: the input is a 'head' node, and the task is to reverse, merge, find the middle, detect a cycle, or remove the n-th node from the end. You cannot jump to an index, so every solution is about walking the chain and changing pointers in the right order.",
    "Three tools solve most problems. A dummy node in front of the head removes special cases when the head itself can change (merge, delete). Fast and slow pointers find the middle or a cycle in one pass. The previous, current, next trio reverses links. Almost all of these are O(n) time and O(1) extra space.",
    "Classic mistakes: overwriting node.next before you saved it, which loses the rest of the list; forgetting that fast.next can be None, so the loop must be 'while fast and fast.next'; returning head when you should return dummy.next; and being off by one when counting from the end.",
    "Honest context: you will almost never write a linked list in real Python. A list or a deque is faster, because linked nodes are separate objects spread around memory. The idea still matters, because structures such as deque, OrderedDict and LRU caches are built on it, and interviews use it to test careful pointer handling."
  ],
  iq: [
    { q: "Detect a cycle in a linked list using O(1) extra space.", a: "Use Floyd's fast and slow pointers. The slow one moves one step and the fast one moves two. If there is a cycle, the fast pointer enters it and catches the slow one. If there is no cycle, the fast pointer reaches the end. A set of visited nodes also works, but it needs O(n) memory.", c: `
class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False

a, b, c = Node(1), Node(2), Node(3)
a.next, b.next = b, c
print(has_cycle(a))                     # False
c.next = a
print(has_cycle(a))                     # True
` },
    { q: "Find the middle node in one pass.", a: "Move a slow pointer one step and a fast pointer two steps. When the fast pointer reaches the end, the slow pointer is at the middle. With an even number of nodes this version returns the second of the two middle nodes.", c: `
class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

def middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow

head = Node(1, Node(2, Node(3, Node(4, Node(5)))))
print(middle(head).val)                 # 3
` },
    { q: "Can you reverse the list recursively? What does it cost?", a: "Yes: reverse the rest of the list, then make the next node point back to the current one. It is O(n) time but also O(n) memory for the call stack. In Python a list longer than about 1000 nodes raises RecursionError, so the iterative version is the safe answer." },
    { q: "How do you remove the n-th node from the end in one pass?", a: "Use two pointers with a gap of n nodes between them, starting from a dummy node placed before the head. Move both until the front pointer reaches the last node. The back pointer is then just before the node to delete, so you can skip it. The dummy node handles the case where the head itself is removed." }
  ],
  tips: [
    "For a cache with a size limit use functools.lru_cache, or collections.OrderedDict with move_to_end and popitem(last=False). Do not write your own linked list for this.",
    "Compare nodes with 'is', not '=='. Two different nodes can hold the same value.",
    "Use collections.deque when you need fast insert and remove at both ends. Inside, it is a linked chain of blocks.",
    "In the interview draw the boxes and arrows and move the pointers on paper for a list of two nodes. Most pointer bugs show up at once."
  ]
});

EXTRA(9, "Trees", {
  deep: [
    "How to recognise it: the input is a 'root', or the data is a hierarchy (folders, categories, comments, an organisation chart). Questions about depth, height, paths, ancestors or levels are tree questions.",
    "The recursive template is always the same. First handle the empty node. Then ask the left and the right subtree for their answers. Then combine them with the current node. To design a solution ask: what should one call return to its parent? A harder family (diameter, maximum path sum) returns one value upwards while it updates a separate best answer on the way.",
    "There are two ways to visit. DFS goes deep first and has three orders: pre-order (node, left, right), in-order (left, node, right) and post-order (left, right, node). BFS goes level by level with a queue. Use BFS when the question speaks about levels or the node closest to the root.",
    "Time is O(n) because each node is visited once. Space is O(h), the height: about log n for a balanced tree but n for a tree that is one long chain, and that can hit the recursion limit. Classic mistakes: counting height in nodes in one place and in edges in another, and in 'minimum depth' treating a node with only one child as a leaf."
  ],
  iq: [
    { q: "Return the node values level by level (Level Order Traversal).", a: "Use BFS with a queue. At the start of each round the queue holds exactly one full level, so read its length and process that many nodes. Their children form the next level. It is O(n) time, and the queue holds at most the widest level.", c: `
from collections import deque

class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def level_order(root):
    levels, queue = [], deque([root] if root else [])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        levels.append(level)
    return levels

root = TreeNode(1, TreeNode(2, TreeNode(4)), TreeNode(3))
print(level_order(root))                # [[1], [2, 3], [4]]
` },
    { q: "The tree is a chain of 100000 nodes. The recursive max depth crashes. Now what?", a: "The recursion is 100000 calls deep and Python stops at about 1000 with RecursionError. Use your own stack that holds (node, depth) pairs, or use BFS and count the levels. The work is still O(n), but the memory is now a normal list and not the call stack.", c: `
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def max_depth_iter(root):
    best, stack = 0, [(root, 1)]
    while stack:
        node, depth = stack.pop()
        if node:
            best = max(best, depth)
            stack.append((node.left, depth + 1))
            stack.append((node.right, depth + 1))
    return best

root = TreeNode(1, TreeNode(2, TreeNode(4)), TreeNode(3))
print(max_depth_iter(root))             # 3
` },
    { q: "How do you find the diameter of a binary tree, the longest path between any two nodes?", a: "The longest path does not have to pass through the root. For every node, the longest path through it is the left height plus the right height. Write a height function that returns the height to its parent and also updates a best value with left + right. One pass, O(n)." },
    { q: "How do you find the lowest common ancestor of two nodes?", a: "Search both subtrees recursively. If the current node is one of the two targets, return it. If the left and the right search both return a node, the current node is the answer. If only one side returns a node, pass that result up. In a BST it is simpler: walk down from the root until the two values go to different sides." }
  ],
  tips: [
    "For folders use os.walk or pathlib.Path.rglob. They already do the tree traversal for you.",
    "Nested JSON is a tree. One small recursive function that handles dict, list and plain value can find or change any key at any depth.",
    "Python's ast module turns source code into a tree. Linters and code formatters work by walking that tree.",
    "When you store a tree in SQL with a parent_id column, read a whole subtree with a recursive query (WITH RECURSIVE), not with one query per node."
  ]
});

EXTRA(9, "BST", {
  deep: [
    "How to recognise it: the problem says 'binary search tree', or asks for the k-th smallest, the next larger value, values in a range, or a validity check. The most useful fact is that an in-order traversal (left, node, right) of a BST visits the values in sorted order. Many BST problems are an in-order walk in disguise.",
    "Search, insert and delete all follow one path from the root downwards, so they cost O(h), where h is the height. A balanced tree has h near log n. If you insert keys that are already sorted into a simple BST, every node goes to the right and the tree becomes a chain with h = n. Self-balancing trees (AVL, red-black) exist to prevent this by rotating nodes after inserts and deletes.",
    "Compared with a hash map, a BST is slower for one exact lookup (O(log n) against O(1)), but it keeps order. It can give the minimum, the maximum, the next larger key and all keys in a range without sorting. That is why databases build indexes on trees.",
    "Classic mistakes: validating by comparing a node only with its two children, forgetting to decide where duplicates go, and deleting a node with two children wrongly. The correct delete replaces the value with its in-order successor (the smallest value in the right subtree) and then deletes that successor node."
  ],
  iq: [
    { q: "Find the k-th smallest value in a BST.", a: "Do an in-order traversal, which gives the values in increasing order, and stop at the k-th one. The iterative version with a stack can stop early, so it costs O(h + k) and does not visit the whole tree.", c: `
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def kth_smallest(root, k):
    stack, node = [], root
    while stack or node:
        while node:                     # go left as far as possible
            stack.append(node)
            node = node.left
        node = stack.pop()
        k -= 1
        if k == 0:
            return node.val
        node = node.right

root = TreeNode(5, TreeNode(3, TreeNode(2), TreeNode(4)), TreeNode(8))
print(kth_smallest(root, 3))            # 4
` },
    { q: "What happens when you insert the keys 1, 2, 3, 4, 5 in this order into a plain BST?", a: "Each key is larger than all the keys before it, so it always goes to the right. The tree becomes a chain of height n, and search becomes O(n), like a linked list. The same keys in a mixed order give a much shorter tree. Balanced trees fix this automatically.", c: `
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def insert(node, val):
    if not node:
        return TreeNode(val)
    if val < node.val:
        node.left = insert(node.left, val)
    else:
        node.right = insert(node.right, val)
    return node

def height(node):
    return 0 if not node else 1 + max(height(node.left), height(node.right))

root = None
for v in [1, 2, 3, 4, 5]:
    root = insert(root, v)
print(height(root))                     # 5

root = None
for v in [3, 1, 4, 2, 5]:
    root = insert(root, v)
print(height(root))                     # 3
` },
    { q: "Why do databases use B-trees and not binary search trees?", a: "Data on disk is read in pages, and each page read is slow. A B-tree node holds many keys and has many children, so the tree is very shallow and a lookup touches only a few pages. A binary tree with the same number of rows would be much deeper and would need many more disk reads." },
    { q: "When would you choose a BST or another sorted structure over a hash map?", a: "When you need order: the smallest or largest key, the nearest key below or above a value, keys in sorted order, or all keys between two values. A hash map answers only 'is this exact key here?' quickly. For anything about ordering it needs a full scan or a sort." }
  ],
  tips: [
    "Python has no built-in balanced tree. For most needs a sorted list with the bisect module is enough, and the third-party package sortedcontainers offers SortedList and SortedDict.",
    "A database index is a tree, so it helps range filters (BETWEEN, <, >) and ORDER BY, not only equality checks.",
    "When you validate with bounds in Python, start with float('-inf') and float('inf'). Fixed numbers such as -1 or 0 break on unusual inputs.",
    "If keys arrive in sorted order, such as timestamps or auto-increment IDs, never store them in a simple unbalanced BST. That is its worst case."
  ]
});

EXTRA(9, "DFS", {
  deep: [
    "How to recognise it: 'all paths', 'is there a path', 'connected regions', 'islands', 'detect a cycle', or any task that must explore everything reachable from a start point. A grid is a graph in disguise: each cell is a node and its four neighbours are its edges.",
    "The template: keep a visited set, mark a node when you ENTER it, then visit each neighbour that is not visited yet. The complexity is O(V + E), because each node is entered once and each edge is looked at once (twice if the graph is undirected). In a grid that becomes O(rows * cols).",
    "Variations: recursive DFS or an explicit stack; marking visited by changing the input or with a separate set; three states (not visited, in progress, done) to find a cycle in a directed graph; and the finishing order of nodes, which gives a topological sort.",
    "Classic mistakes: no visited set on a graph with cycles, so the code never stops; marking a node only after its neighbours were visited; and deep recursion. A grid of 1000 by 1000 land cells can need a million nested calls, far past Python's limit. Also remember that DFS finds A path, not the SHORTEST path."
  ],
  iq: [
    { q: "Your recursive island counter crashes on a large grid. Fix it.", a: "The recursion can go as deep as the number of cells in one island, which passes Python's recursion limit. Replace the recursion with your own stack. Mark a cell when you push it, not when you pop it, so the same cell is never pushed twice.", c: `
def count_islands(grid):
    rows, cols = len(grid), len(grid[0])
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != 1:
                continue
            count += 1
            grid[r][c] = 0
            stack = [(r, c)]
            while stack:
                y, x = stack.pop()
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < rows and 0 <= nx < cols and grid[ny][nx] == 1:
                        grid[ny][nx] = 0
                        stack.append((ny, nx))
    return count

print(count_islands([[1, 1, 0], [0, 0, 1], [1, 0, 1]]))   # 3
` },
    { q: "How do you detect a cycle in a DIRECTED graph with DFS? Why is one visited set not enough?", a: "With one visited set, a node reached by two different paths looks like a cycle even when it is not (a diamond shape: A to B, A to C, B to D, C to D). Use three states. Meeting a node that is 'in progress' means you came back to your own current path, which is a real cycle. Meeting a node that is 'done' is fine.", c: `
def has_cycle(graph):
    state = {}                          # 1 = in progress, 2 = done
    def visit(node):
        if state.get(node) == 1:
            return True
        if state.get(node) == 2:
            return False
        state[node] = 1
        for nxt in graph.get(node, []):
            if visit(nxt):
                return True
        state[node] = 2
        return False
    return any(visit(n) for n in graph)

print(has_cycle({"a": ["b"], "b": ["c"], "c": []}))       # False
print(has_cycle({"a": ["b"], "b": ["c"], "c": ["a"]}))    # True
` },
    { q: "What if you are not allowed to change the input grid?", a: "Keep a separate visited set of (row, column) tuples and check it before visiting a cell. It costs O(rows * cols) extra memory. It is good practice to ask the interviewer whether you may change the input, because changing it in real code can surprise the caller." },
    { q: "When do you choose DFS and when BFS?", a: "Choose DFS to explore everything, to find components, cycles, topological order, or all paths. It is short to write and uses little memory on wide graphs. Choose BFS when you need the shortest path in number of steps, because DFS can reach a node by a long path first." }
  ],
  tips: [
    "Dependency resolvers, the mark phase of garbage collectors and web crawlers are all DFS or BFS over a graph.",
    "Do not fix deep recursion by setting sys.setrecursionlimit to a huge number. The process can run out of real stack memory and crash without a clean Python error, so use an explicit stack.",
    "Keep visited cells in a set of tuples. Checking 'in' on a list is O(n) and can make the whole search O(n^2).",
    "Write the four directions once as a tuple of (dr, dc) pairs and loop over it. Four copied if-blocks are where typing mistakes hide."
  ]
});

EXTRA(9, "BFS", {
  deep: [
    "How to recognise it: 'shortest', 'minimum number of moves or steps', 'nearest', 'level', or something that spreads step by step (fire, infection, rotting fruit). The answer is a number of steps and every step costs the same.",
    "Why it gives the shortest path: the queue releases nodes in order of distance from the start, first all nodes at distance 1, then all at distance 2, and so on. So the first time you reach a node is by a shortest route. This is only true when every edge has the same cost. With different weights use Dijkstra's algorithm with a heap.",
    "Variations: multi-source BFS, where all the starting points are put in the queue at the beginning (distance to the nearest exit, rotting oranges); processing one level at a time by reading len(queue); bidirectional BFS, which searches from both ends; and BFS over 'states' such as (row, column, keys collected).",
    "Classic mistakes: marking a node visited when it is removed from the queue and not when it is added, so it enters the queue many times; using list.pop(0), which is O(n); and forgetting the result for 'no path exists'. BFS can also use a lot of memory, because the queue holds a whole level of the graph."
  ],
  iq: [
    { q: "Return the actual shortest path, not only its length.", a: "Store for every node the node you came from (its parent) when you first reach it. When you reach the goal, walk back through the parents to the start and reverse the list. The parent dictionary also does the job of the visited set.", c: `
from collections import deque

def path(graph, start, goal):
    parent = {start: None}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        if node == goal:
            out = []
            while node is not None:
                out.append(node)
                node = parent[node]
            return out[::-1]
        for nxt in graph[node]:
            if nxt not in parent:
                parent[nxt] = node
                queue.append(nxt)
    return []

g = {"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": ["E"], "E": []}
print(path(g, "A", "E"))                # ['A', 'B', 'D', 'E']
` },
    { q: "What if the edges have different weights?", a: "Plain BFS is wrong then, because fewer edges does not mean lower cost. Use Dijkstra's algorithm: a min-heap always gives the closest unfinished node. It needs weights that are not negative and costs O((V + E) log V). With negative weights use Bellman-Ford.", c: `
import heapq

def dijkstra(graph, start):
    dist = {start: 0}
    heap = [(0, start)]
    while heap:
        d, node = heapq.heappop(heap)
        if d > dist[node]:
            continue                    # old entry, skip it
        for nxt, w in graph[node]:
            nd = d + w
            if nd < dist.get(nxt, float("inf")):
                dist[nxt] = nd
                heapq.heappush(heap, (nd, nxt))
    return dist

g = {"A": [("B", 5), ("C", 1)], "C": [("B", 2)], "B": []}
print(dijkstra(g, "A"))                 # {'A': 0, 'B': 3, 'C': 1}
` },
    { q: "In 'Rotting Oranges' many oranges are rotten at the start. Do you run one BFS per orange?", a: "No. Put all the rotten oranges in the queue at the beginning with time 0 and run one BFS. This is multi-source BFS. It acts as if one hidden start node were connected to all the sources, and it gives each cell the distance to its nearest source in O(rows * cols)." },
    { q: "Why mark a node as visited when you add it to the queue, and not when you remove it?", a: "Between the adding and the removing, other neighbours can find the same node and add it again. The answer can still be correct, but the queue grows with repeated entries and the code does extra work. Marking at the moment of adding guarantees that each node enters the queue exactly once." }
  ],
  tips: [
    "Friend suggestions, counting network hops and 'crawl only 2 links deep' are BFS with a depth limit.",
    "Queue items must describe the complete state. If the state includes more than the position, such as keys held or fuel left, put it in a tuple and use that same tuple in the visited set.",
    "Use collections.deque and popleft(). A list with pop(0) silently turns O(V + E) into something much slower.",
    "On huge graphs always set a maximum depth or a maximum number of nodes, or one request can try to load the whole graph into memory."
  ]
});

EXTRA(9, "Heap", {
  deep: [
    "How to recognise it: 'top K', 'K-th largest', 'K closest', 'merge K sorted lists', 'median of a stream', or a process that always takes the smallest, the earliest or the most important item next. You need the best item again and again while new items keep arriving.",
    "How it works: a heap is a binary tree stored in a plain list, where the children of index i are at 2i + 1 and 2i + 2, and every parent is smaller than or equal to its children. Push and pop move one item along one path of the tree, so they are O(log n). Reading the smallest item, heap[0], is O(1). heapq.heapify turns a whole list into a heap in O(n).",
    "A heap is NOT sorted. Only the root is guaranteed to be the smallest, so heap[-1] is not the largest and searching for a value is O(n). Python's heapq is always a min-heap. For a max-heap push negative numbers, or push tuples whose first field is the negative priority.",
    "The top-K trick feels backwards: to keep the K LARGEST items use a MIN-heap of size K, so the smallest of them is at the root and easy to throw away. Classic mistakes: using the wrong kind of heap, and pushing tuples where the first fields can be equal and the next field cannot be compared (for example dicts), which raises TypeError."
  ],
  iq: [
    { q: "Return the k most frequent items (Top K Frequent Elements).", a: "Count with a Counter, then take the k keys with the largest counts using a heap. That is O(n log k), better than sorting all the different keys when k is small. heapq.nlargest does the heap work for you.", c: `
import heapq
from collections import Counter

def top_k(words, k):
    counts = Counter(words)
    return heapq.nlargest(k, counts, key=counts.get)

print(top_k(["a", "b", "a", "c", "b", "a"], 2))   # ['a', 'b']
` },
    { q: "Python only has a min-heap. How do you get a max-heap?", a: "Store the negative of each number, so the largest original value becomes the smallest stored value. Negate again when you read it. For objects, push a tuple such as (-priority, counter, item), where the counter breaks ties and stops Python from comparing the items.", c: `
import heapq

nums = [3, 1, 4, 1, 5]
heap = [-n for n in nums]
heapq.heapify(heap)
print(-heapq.heappop(heap))             # 5
print(-heap[0])                         # 4
` },
    { q: "How do you find the median of a stream of numbers at any time?", a: "Keep two heaps: a max-heap for the smaller half and a min-heap for the larger half, with sizes that differ by at most one. The median is the top of the bigger heap, or the average of both tops. Adding a number is O(log n) and reading the median is O(1). This is 'Find Median from Data Stream'." },
    { q: "Can you find the k-th largest element faster than O(n log k)?", a: "Yes, Quickselect does it in O(n) on average. It partitions the array like quicksort but continues only in the side that contains the answer. Its worst case is O(n^2), and it needs the whole array in memory. A heap is better for a stream, because it never holds more than k items." }
  ],
  tips: [
    "heapq.nlargest(k, items, key=...) and heapq.nsmallest are the one-line answer for a top-K in real code.",
    "For a priority queue of jobs push (priority, next(counter), job) with counter = itertools.count(). The counter keeps equal priorities in arrival order and avoids comparing the job objects.",
    "heapq.merge(*sorted_inputs) merges many sorted files or streams lazily. Only one item from each input is in memory.",
    "Schedulers and timers keep (run_at_time, task) in a heap, so the next task to run is always heap[0]."
  ]
});

EXTRA(9, "Graph", {
  deep: [
    "How to recognise it: things with connections between them. Signal words are 'network', 'route', 'depends on', 'prerequisite', 'friends', 'connected', or an input that is a list of pairs such as [a, b]. The first step is nearly always to build an adjacency list from those pairs.",
    "Ask four questions before you code. Is it directed? Is it weighted? Can it have cycles? Can it be in several separate pieces? The answers choose the algorithm: reachability or components need DFS or BFS, fewest steps needs BFS, cheapest path with non-negative weights needs Dijkstra, an order that respects dependencies needs topological sort, and 'are these two in the same group' needs union-find.",
    "Storage is a trade-off. An adjacency list uses O(V + E) memory and is best for the usual case, where most pairs of nodes are not connected. An adjacency matrix uses O(V^2) memory but answers 'is there an edge between a and b' in O(1), which is good for small and dense graphs.",
    "Classic mistakes: adding an undirected edge in only one direction; leaving out nodes that have no edges, so they are missing from the dict; starting the search from only one node when the graph has several pieces; and forgetting the visited set when cycles are possible."
  ],
  iq: [
    { q: "Do not only say if the courses can be finished. Return a valid order (Course Schedule II).", a: "It is the same Kahn's algorithm, but you record each course when it leaves the queue. If the recorded order is shorter than the number of courses, some courses are stuck in a cycle and no valid order exists.", c: `
from collections import deque

def course_order(n, prerequisites):
    graph = [[] for _ in range(n)]
    indegree = [0] * n
    for course, pre in prerequisites:
        graph[pre].append(course)
        indegree[course] += 1
    queue = deque(i for i in range(n) if indegree[i] == 0)
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for nxt in graph[node]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)
    return order if len(order) == n else []

print(course_order(4, [[1, 0], [2, 0], [3, 1], [3, 2]]))   # [0, 1, 2, 3]
print(course_order(2, [[1, 0], [0, 1]]))                   # []
` },
    { q: "Count the connected components of an undirected graph. Can you do it without DFS?", a: "Yes, with union-find (disjoint set). Every node starts as its own group. For each edge, find the root of both ends, and if the roots differ, join them and reduce the count by one. Path compression keeps the trees flat, so each operation is almost O(1).", c: `
def count_components(n, edges):
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]   # path compression
            x = parent[x]
        return x
    count = n
    for a, b in edges:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
            count -= 1
    return count

print(count_components(5, [[0, 1], [1, 2], [3, 4]]))   # 2
` },
    { q: "Adjacency list or adjacency matrix: when do you use which?", a: "Use a list for most problems: it needs O(V + E) memory and you loop only over real neighbours. Use a matrix when the graph is small and dense, or when you must check very often whether one specific edge exists. A matrix for 100000 nodes needs ten billion cells, which is not possible." },
    { q: "How do you detect a cycle in an UNDIRECTED graph?", a: "With DFS, remember the node you came from. If you meet a visited neighbour that is not that parent, there is a cycle. With union-find, an edge whose two ends are already in the same group closes a cycle. The three-state method for directed graphs is not needed here, because every edge can be walked in both directions." }
  ],
  tips: [
    "The standard library has graphlib.TopologicalSorter (Python 3.9+). It returns a valid order and raises CycleError when there is a cycle.",
    "Build adjacency lists with collections.defaultdict(list), and for an undirected graph append in both directions.",
    "pip, Docker image layers, Airflow DAGs, Makefiles and CI pipelines all order their work with a topological sort of a dependency graph.",
    "For real graph analysis use a library such as networkx. Writing the algorithm by hand is for interviews and for very special needs."
  ]
});

EXTRA(9, "Recursion", {
  deep: [
    "How to recognise it: the problem is defined in terms of a smaller copy of itself. Examples are nested data (a folder contains folders), trees, 'all combinations', and divide and conquer, where you split the input, solve each half and combine the results.",
    "Design it with three questions. What is the smallest input that I can answer directly (the base case)? How do I make the input smaller? How do I build my answer from the answer to the smaller input? Then trust the function: assume it already works for the smaller input and write only one level of the logic.",
    "Cost: each call that has not finished yet keeps a frame on the call stack, so the space is O(depth) even if you create no data. Python stops at about 1000 nested calls with RecursionError and it does not optimise tail calls. For the time, count the calls: one call on half the input gives O(log n), one call on n - 1 gives O(n), and two calls on n - 1 give O(2^n).",
    "Classic mistakes: a base case that is never reached (for example a negative input that jumps over zero), forgetting to RETURN the result of the recursive call, a mutable default argument such as def f(x, seen=[]) that is shared between calls, and slicing the list on every call, which adds a hidden O(n) copy each time."
  ],
  iq: [
    { q: "Rewrite the nested-list flatten without recursion.", a: "Use your own stack. Pop an item. If it is a list, push its elements in reverse order so the first element is handled first. If it is not a list, add it to the result. Now the nesting depth is limited only by memory, not by the recursion limit.", c: `
def flatten(items):
    result, stack = [], [items]
    while stack:
        item = stack.pop()
        if isinstance(item, list):
            stack.extend(reversed(item))
        else:
            result.append(item)
    return result

print(flatten([1, [2, [3, 4]], 5]))     # [1, 2, 3, 4, 5]
` },
    { q: "What happens if a recursive function goes 5000 calls deep?", a: "Python raises RecursionError when the depth passes the limit, which is 1000 by default. This limit protects the real memory stack of the process. The right fix is a loop or an explicit stack. Raising the limit is a risky workaround.", c: `
import sys
print(sys.getrecursionlimit())          # 1000 (the default)

def total(n):
    return 0 if n == 0 else n + total(n - 1)

print(total(500))                       # 125250
try:
    total(5000)
except RecursionError:
    print("too deep")                   # too deep
` },
    { q: "What is the complexity of the simple recursive Fibonacci, and how do you fix it?", a: "It is exponential, about O(2^n), because fib(n - 2) is computed again inside fib(n - 1), and the same happens at every level. The stack depth is only O(n). Storing each result (memoisation) or a simple loop makes it O(n), since each value is then computed once." },
    { q: "Does Python optimise tail recursion?", a: "No. Every call gets a new stack frame, even when the recursive call is the very last action. This was a design choice, so that tracebacks stay complete and easy to read. A tail-recursive function should be written as a while loop in Python." }
  ],
  tips: [
    "Do not recurse over input whose depth is controlled by a user, for example deeply nested JSON. Use an explicit stack, or check the depth and reject input that is too deep.",
    "functools.cache (Python 3.9+) or lru_cache makes a pure recursive function fast when the same arguments repeat. The arguments must be hashable.",
    "sys.setrecursionlimit only moves the safety limit. If you set it very high, a deep recursion can crash the whole interpreter and not raise a clean error.",
    "Pass indexes (lo, hi) to the recursive call. Slices such as items[1:] copy the list on every call."
  ]
});

EXTRA(9, "Backtracking", {
  deep: [
    "How to recognise it: 'all possible', 'every combination', 'generate', 'permutations', 'subsets', or a puzzle with rules (Sudoku, N-Queens), and the input is small (often n is 20 or less). The small limit is the biggest hint: the expected solution is exponential, so the interviewer wants a clean search, not a clever formula.",
    "Backtracking is DFS on a tree of decisions. Each level of the tree is one decision, each branch is one option, and 'path' holds the decisions made so far. After you explore a branch you undo the decision, so the same path list can be used again for the next branch. Pruning means you stop a branch the moment it breaks a rule, and that is where the speed comes from.",
    "The cost is exponential and you cannot avoid it, because the output itself is that big: 2^n subsets and n! permutations. Know the variations by one detail each. Subsets and combinations pass a start index. Permutations keep a 'used' list. If an item may be reused, recurse with i and not i + 1. With duplicates in the input, sort first and skip equal values on the same level.",
    "Classic mistakes: appending 'path' itself to the result and not a copy, so every stored answer is the same list and is empty at the end; forgetting the un-choose step; and leaving out the start index, which produces both [1, 2] and [2, 1] when order should not matter."
  ],
  iq: [
    { q: "Generate all permutations of a list.", a: "Order matters now, so there is no start index. At each position try every element that is not used yet. A 'used' list tracks what is already in the path. There are n! results and each one takes O(n) to copy, so the time is O(n * n!).", c: `
def permutations(nums):
    result, path, used = [], [], [False] * len(nums)
    def explore():
        if len(path) == len(nums):
            result.append(path[:])
            return
        for i in range(len(nums)):
            if not used[i]:
                used[i] = True
                path.append(nums[i])
                explore()
                path.pop()
                used[i] = False
    explore()
    return result

print(permutations([1, 2, 3]))
# [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]
` },
    { q: "The input has duplicates, for example [1, 2, 2]. How do you avoid duplicate subsets?", a: "Sort the input so that equal values are neighbours. Inside the loop, skip a value if it is equal to the previous one AND it is not the first option on this level (i > start). You can still take the same value again on the next level, which is how [2, 2] is built. This is 'Subsets II'.", c: `
def subsets_unique(nums):
    nums = sorted(nums)
    result, path = [], []
    def explore(start):
        result.append(path[:])
        for i in range(start, len(nums)):
            if i > start and nums[i] == nums[i - 1]:
                continue                # same value, same level: skip
            path.append(nums[i])
            explore(i + 1)
            path.pop()
    explore(0)
    return result

print(subsets_unique([1, 2, 2]))
# [[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]
` },
    { q: "What goes wrong if you write result.append(path) and not result.append(path[:])?", a: "You store the same list object many times, not a snapshot of it. Later append and pop calls change that one list, and when the search ends it is empty, so the result is a list of empty lists. path[:] or list(path) makes a copy at that moment." },
    { q: "When should you use dynamic programming and not backtracking?", a: "Backtracking is right when you must LIST every solution. If the question asks only for a count, a best value, or yes/no, and the same sub-problem appears many times, DP is much faster because it solves each sub-problem once. Example: listing all subsets that reach a sum needs backtracking, but asking if any subset reaches the sum is a DP problem." }
  ],
  tips: [
    "In real code use itertools.permutations, combinations and product. They are written in C, they are lazy, and they are already correct.",
    "Check the rules as early as possible, and try the most limited choice first. Good pruning often matters more than any other optimisation.",
    "If there can be very many results, write the search as a generator with yield. The caller can stop early and memory stays small.",
    "For real scheduling or assignment problems with many rules use a solver library such as OR-Tools. Hand-written backtracking becomes too slow as the input grows."
  ]
});

EXTRA(9, "Dynamic Programming", {
  deep: [
    "How to recognise it: the question asks for a minimum, a maximum, the number of ways, or whether something is possible; at each step you make a choice; and a simple recursion would solve the same smaller problem many times. If each sub-problem appears only once, it is plain recursion (divide and conquer), not DP.",
    "Use a fixed method. One: define the state in words, for example 'dp[a] is the fewest coins for amount a'. Two: write the transition, which says how a state is built from smaller states. Three: set the base cases. Four: choose an order so that smaller states are ready first. Five: say where the final answer is. The complexity is the number of states times the work per state.",
    "Top-down is the recursion plus a cache. It is quick to write and computes only the states that are needed, but it can hit the recursion limit. Bottom-up fills a table with loops. It has no recursion and lets you save memory by keeping only the last row or the last few values. A good way to work: write the brute-force recursion, add the cache, and convert to a table only if needed.",
    "Classic mistakes: using greedy where it is not correct, for example with coins [1, 3, 4] and amount 6 the largest-coin-first choice gives three coins but the best is 3 + 3; wrong base cases; and a wrong loop order. In the 0/1 knapsack with a one-dimensional table, the capacity loop must go downwards or an item is used twice."
  ],
  iq: [
    { q: "Why not solve coin change greedily by always taking the largest coin?", a: "Greedy works only for special coin systems, such as normal currency. In general a large coin now can force worse choices later. DP is correct because it tries every coin as the last coin and keeps the best result for each amount.", c: `
def coin_change(coins, amount):
    dp = [0] + [float("inf")] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] != float("inf") else -1

def greedy(coins, amount):
    count = 0
    for c in sorted(coins, reverse=True):
        count += amount // c
        amount %= c
    return count if amount == 0 else -1

print(greedy([1, 3, 4], 6), coin_change([1, 3, 4], 6))   # 3 2
` },
    { q: "Write coin change top-down. What are the limits of that version?", a: "Put a cache on a recursive function that returns the best result for one amount. It is the same O(amount * coins) work. The limits: the recursion can be as deep as the amount, so large amounts raise RecursionError, and the cached arguments must be hashable, which is why the coins are a tuple here.", c: `
from functools import cache

def coin_change(coins, amount):
    @cache
    def best(a):
        if a == 0:
            return 0
        options = [best(a - c) for c in coins if c <= a]
        return min(options) + 1 if options else float("inf")
    result = best(amount)
    return result if result != float("inf") else -1

print(coin_change((1, 2, 5), 11))       # 3
print(coin_change((2,), 3))             # -1
` },
    { q: "Now count the NUMBER of ways to make the amount (Coin Change II). What changes?", a: "The transition adds and does not take a minimum: the ways for amount a include the ways for a - c. The loop order becomes important. Put the coins in the outer loop, so each combination is counted once. With the amount in the outer loop you would count 1 + 2 and 2 + 1 as two different ways.", c: `
def count_ways(coins, amount):
    dp = [1] + [0] * amount             # one way to make 0: use no coins
    for c in coins:
        for a in range(c, amount + 1):
            dp[a] += dp[a - c]
    return dp[amount]

print(count_ways([1, 2, 5], 5))         # 4
` },
    { q: "Can you reduce the memory of a DP solution?", a: "Often, yes. Look at which earlier states the transition really reads. Fibonacci, Climbing Stairs and House Robber read only the last two values, so two variables are enough and the space is O(1). Two-string problems such as Longest Common Subsequence read only the previous row, so two rows are enough and not the full table." }
  ],
  tips: [
    "functools.cache and lru_cache need hashable arguments. Pass a tuple, not a list, or pass indexes into data that lives outside the function.",
    "In a long-running server use lru_cache(maxsize=...) with a limit. A cache without a limit grows for ever and looks like a memory leak.",
    "When the answer is wrong, print the dp table for a tiny input and compare it with values you worked out by hand. The first wrong cell shows the bug.",
    "DP is used in real tools: diff programs and difflib compare sequences, spell checkers use edit distance, and route and resource planners use it for optimisation."
  ]
});
