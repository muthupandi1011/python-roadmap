EXTRA(22, "217. Contains Duplicate", {
  deep: [
    "How to recognise it: the words 'appears twice', 'distinct', 'unique' or 'already seen' point to a hash set. Whenever a brute force compares every element with every other element, ask: can I remember the elements in a set and ask the set instead? That one question turns many O(n^2) loops into O(n).",
    "Why it is correct: the loop keeps the invariant that the set holds exactly the values from the positions already visited. If the current value is in the set, a copy of it exists at an earlier position, so the answer is True. If we reach the end without a hit, every value was new when we saw it, so all values are different. Variation 219 adds a distance limit k: keep a set of only the last k values (remove nums[i-k] when the window slides). Variation 220 adds a value difference limit and needs buckets or a sorted container.",
    "Traps and constraint changes: len(set(nums)) != len(nums) is the shortest answer but always reads the whole list, while the loop stops at the first duplicate. If the input is already sorted, compare each element with its neighbour, O(n) time and O(1) space. If memory is tight and you may change the input, sort in place and compare neighbours: O(n log n) time, O(1) space. If the values are small integers in a known range, a boolean array of that size is a faster set. For a stream of values the set approach still works, but memory grows with the number of distinct values; a Bloom filter gives a small, approximate answer."
  ],
  iq: [
    { q: "What if you cannot use extra memory?", a: "Sort the list in place and then compare each element with the next one. Equal neighbours mean a duplicate. This costs O(n log n) time but only O(1) extra space, and it changes the order of the input, so ask whether that is allowed.", c: `
def contains_duplicate_sorted(nums):
    nums.sort()
    for i in range(1, len(nums)):
        if nums[i] == nums[i - 1]:
            return True
    return False

print(contains_duplicate_sorted([3, 1, 4, 1, 5]))   # True
` },
    { q: "How would you solve 219, where the two equal values must be at most k positions apart?", a: "Use a sliding window set that holds only the last k values. At index i, first check whether nums[i] is in the set, then add it, and if the set has more than k values remove nums[i-k]. Every value enters and leaves the set once, so it is still O(n) time with O(k) space.", c: `
def contains_nearby_duplicate(nums, k):
    window = set()
    for i, n in enumerate(nums):
        if n in window:
            return True
        window.add(n)
        if len(window) > k:
            window.remove(nums[i - k])
    return False

print(contains_nearby_duplicate([1, 2, 3, 1], 3))        # True
print(contains_nearby_duplicate([1, 2, 3, 1, 2, 3], 2))  # False
` },
    { q: "Why is a set lookup O(1) and when can it be slower?", a: "A set stores each value in a position chosen by its hash. A lookup computes the hash and jumps straight to that position. When many values share a position (a collision) the lookup has to probe more slots. With a good hash function this is rare, so the average is O(1), but a bad or attacker-chosen set of keys can push it toward O(n). Python randomises string hashing per process for that reason." },
    { q: "The input is a stream of a billion ids and you only need an approximate answer. What do you use?", a: "A Bloom filter. It is a bit array with several hash functions. It never says False for an id that was seen, but it may say True by mistake with a small, tunable probability. It uses a few bits per item instead of the full value, so a billion ids fit in about a gigabyte." }
  ],
  tips: [
    "Say the brute force in one sentence, then say 'I can do better with a set', and write the set version directly. Nobody wants to watch you type the O(n^2) loop.",
    "Ask: can the list be empty? Are values integers only? Is the input sorted? May I modify it? Each answer changes the best solution.",
    "Python trick: len(set(nums)) != len(nums) is a one-liner; mention it, then explain the early-exit loop is better when duplicates appear early.",
    "Test out loud: [] -> False, [1] -> False, [1, 2, 3, 1] -> True, [-1, -1] -> True, [1, 2, 3, 4] -> False."
  ]
});

EXTRA(22, "242. Valid Anagram", {
  deep: [
    "How to recognise it: 'same letters in a different order', 'rearrange', 'permutation of a string' and 'uses the same characters' all mean compare letter counts. The sorted-string signature and the counts array are the two standard signatures; the sorted string is also the key used to group anagrams in problem 49.",
    "Why it is correct: two strings are anagrams exactly when, for every character c, the number of c in s equals the number of c in t. The single counter array keeps the difference of these two numbers per letter. All differences zero means equal multisets. The early length check matters: without it, s = 'a' and t = 'aa' would be read by zip up to the shorter string and could be reported as anagrams by mistake.",
    "Traps and constraint changes: ord(ch) - ord('a') assumes lowercase ASCII letters; with uppercase, digits or Unicode use a dictionary or Counter. If the strings are huge and come as streams, you can still keep one Counter per stream and compare at the end. If you need to answer many queries 'is t an anagram of s' for the same s, precompute the count of s once. For a sliding version (problem 438, find all anagrams of p inside s) you keep a window count and a running number of matched letters so each step is O(1)."
  ],
  iq: [
    { q: "What if the strings contain Unicode characters?", a: "A fixed array of 26 slots no longer works because there are more than a million possible code points. Use a dictionary keyed by character, which is what collections.Counter does. The time stays O(n) and the space becomes O(k) where k is the number of distinct characters.", c: `
from collections import Counter
print(Counter("resume") == Counter("meuser"))   # True
` },
    { q: "Can you solve it in one pass without a Counter and without a list of 26?", a: "Yes, use one dictionary and add one for letters from s and subtract one for letters from t, deleting a key when it reaches zero. The strings are anagrams exactly when the dictionary is empty at the end. This is the same invariant as the array version, but it also works for any characters.", c: `
def is_anagram_dict(s, t):
    if len(s) != len(t):
        return False
    diff = {}
    for a, b in zip(s, t):
        diff[a] = diff.get(a, 0) + 1
        diff[b] = diff.get(b, 0) - 1
        if diff[a] == 0:
            del diff[a]
        if b in diff and diff[b] == 0:
            del diff[b]
    return not diff

print(is_anagram_dict("listen", "silent"))   # True
print(is_anagram_dict("aab", "abb"))         # False
` },
    { q: "How would you find all anagrams of p inside a long string s (problem 438)?", a: "Slide a window of length len(p) over s. Keep a count of the letters inside the window and compare it with the count of p. Comparing 26 counters each step is O(26 n), which is fine. The cleaner version keeps a running number of letters whose counts match, so each step is O(1)." },
    { q: "Is sorting ever the better choice here?", a: "When the strings are short and you want the simplest correct code, sorted(s) == sorted(t) is hard to beat for readability. It is also the natural key when you must group many words by anagram class. For a single long comparison the counting method wins because it is linear and allocates less." }
  ],
  tips: [
    "Clarify the alphabet first: lowercase a to z only? That one question decides whether you write a 26-slot list or a Counter.",
    "Write the length check as the first line. It is cheap, it is correct, and interviewers notice when it is missing.",
    "Python trick: Counter(s) == Counter(t) is one line and handles any text; be ready to explain that it is a dictionary of counts.",
    "Test out loud: ('anagram', 'nagaram') -> True, ('rat', 'car') -> False, ('a', 'ab') -> False, ('', '') -> True."
  ]
});

EXTRA(22, "347. Top K Frequent Elements", {
  deep: [
    "How to recognise it: 'most frequent', 'top k', 'k largest' or 'k most common' means two steps: count with a hash map, then select. The selection step is where the interesting choice lives: sort everything (simple), a heap of size k (good when k is much smaller than n), bucket sort by frequency (linear), or quickselect on the counts (average linear, in place).",
    "Why bucket sort is correct: a value cannot appear more than n times, so frequencies are integers from 1 to n and a list of n + 1 buckets can hold them all. Reading the buckets from index n down to 1 visits values in non-increasing order of frequency, so the first k values collected are k most frequent ones. The problem promises the answer is unique, which means there is no tie at the border between the k-th and the (k+1)-th value, so any order inside a bucket is fine.",
    "Traps and constraint changes: heapq.nlargest(k, count, key=count.get) iterates over the keys, not the counts; passing count.items() by mistake returns pairs. If k equals the number of distinct values, just return all keys. If the values arrive as an endless stream, exact top-k needs memory for every distinct value; approximate structures such as Count-Min Sketch or the Misra-Gries algorithm give a bounded-memory answer. If ties must be broken by value (problem 692 breaks them alphabetically), the heap or sort key must include the value too."
  ],
  iq: [
    { q: "Why is the heap version O(n log k) and not O(n log n)?", a: "The heap never holds more than k items. For each of the m distinct values we push and maybe pop, which costs O(log k). Counting is O(n), so the total is O(n + m log k), which is at most O(n log k). When k is 10 and n is a million, that is much better than sorting all the counts.", c: `
import heapq
from collections import Counter

def top_k_min_heap(nums, k):
    count = Counter(nums)
    heap = []                                   # min-heap of (freq, value), size <= k
    for value, freq in count.items():
        heapq.heappush(heap, (freq, value))
        if len(heap) > k:
            heapq.heappop(heap)                 # drop the least frequent
    return [value for freq, value in heap]

print(sorted(top_k_min_heap([4, 4, 4, 6, 6, 1, 1, 1, 1], 2)))   # [1, 4]
` },
    { q: "How does quickselect solve this in average O(n) time?", a: "Put the distinct values in a list and partition it by frequency, like one step of quicksort. The pivot ends at its final position p. If p is exactly the border for the top k, stop; otherwise recurse only into the side that contains the border. Each step halves the work on average, so the expected time is linear, but the worst case is O(n^2) unless you pick pivots randomly or use median of medians." },
    { q: "What changes if the problem asks for the top k frequent words, with ties broken alphabetically (692)?", a: "The key used for ranking becomes a pair: higher count first, then smaller word first. With heapq.nsmallest you can pass key=lambda w: (-count[w], w). Bucket sort still works but each bucket must be sorted alphabetically before reading, which costs extra log factors inside the bucket.", c: `
import heapq
from collections import Counter

def top_k_words(words, k):
    count = Counter(words)
    return heapq.nsmallest(k, count, key=lambda w: (-count[w], w))

print(top_k_words(["i", "love", "leetcode", "i", "love", "coding"], 2))   # ['i', 'love']
` },
    { q: "The data does not fit in one machine. How would you compute the top k?", a: "Split the data across machines. Each machine counts its own part and sends its local top k candidates with their counts to a coordinator. This is only exact if each machine sends full counts for every value, so in practice a two-round approach is used: round one collects global counts per value with a shuffle by key (MapReduce style), round two takes the top k of the combined counts." }
  ],
  tips: [
    "Say the plan in two steps before coding: 'count with a Counter, then pick k by frequency'. Then discuss which selection method fits the constraints.",
    "Python trick: Counter(nums).most_common(k) returns the answer as (value, count) pairs in one line; show it, then explain it sorts and is O(n log n).",
    "The bucket index is the frequency, so the bucket list must have length len(nums) + 1. Off by one here raises IndexError when every element is the same.",
    "Test out loud: ([1,1,1,2,2,3], 2) -> [1, 2], ([1], 1) -> [1], ([5,5,5,5], 1) -> [5], and a case where k equals the number of distinct values."
  ]
});

EXTRA(22, "238. Product of Array Except Self", {
  deep: [
    "How to recognise it: 'except self', 'all other elements', or any question that asks for an aggregate of everything on the left and right of each index points to prefix and suffix arrays. The same two-pass shape solves 'leftmost smaller to the left and right', 'max to the left and right' (used by Trapping Rain Water) and 'is this index a pivot' (724).",
    "Why it is correct: define L[i] as the product of nums[0..i-1] and R[i] as the product of nums[i+1..n-1]. Then answer[i] = L[i] * R[i] by definition. The first loop fills answer with L using a running prefix (L[0] is the empty product, 1). The second loop multiplies by R using a running suffix built from the right end. Two variables replace two full arrays, so the extra space is constant. The output array itself is required by the problem and is not counted.",
    "Traps and constraint changes: starting prefix or suffix at 0 instead of 1 zeroes the whole answer. Zeros in the input are handled naturally: a single zero makes every other position zero and that position the product of the rest; two zeros make everything zero. If division were allowed and there were no zeros, total // nums[i] works in one pass but risks overflow in languages with fixed integer sizes (Python integers do not overflow). If the array can be updated between queries, a segment tree or Fenwick tree keeps range products in O(log n) per operation."
  ],
  iq: [
    { q: "If division were allowed, how would you handle zeros?", a: "Count the zeros. If there are two or more, every answer is zero. If there is exactly one, every answer is zero except at the zero's position, which gets the product of all non-zero numbers. If there are none, answer[i] is the total product divided by nums[i]. Still one pass, but the three cases are easy to get wrong, which is why the prefix-suffix method is preferred.", c: `
def product_with_division(nums):
    zeros = nums.count(0)
    total = 1
    for n in nums:
        if n != 0:
            total *= n
    if zeros > 1:
        return [0] * len(nums)
    if zeros == 1:
        return [total if n == 0 else 0 for n in nums]
    return [total // n for n in nums]

print(product_with_division([1, 2, 3, 4]))      # [24, 12, 8, 6]
print(product_with_division([2, 0, 5]))         # [0, 10, 0]
` },
    { q: "Why do we say O(1) extra space when the result is a list of size n?", a: "The problem states that the output array does not count toward space complexity, because any correct solution must produce it. The question is about memory beyond the output. The two-pass solution uses the output list as its working prefix array and two integer variables, nothing more." },
    { q: "How would you do it with explicit prefix and suffix arrays first, and why is that still acceptable?", a: "Build L where L[i] is the product of everything left of i, build R where R[i] is the product of everything right of i, then answer[i] = L[i] * R[i]. That is O(n) time and O(n) space, and it is the clearest version to explain. The two-variable version is just the same algorithm with R folded into a running variable.", c: `
def product_except_self_arrays(nums):
    n = len(nums)
    left, right = [1] * n, [1] * n
    for i in range(1, n):
        left[i] = left[i - 1] * nums[i - 1]
    for i in range(n - 2, -1, -1):
        right[i] = right[i + 1] * nums[i + 1]
    return [left[i] * right[i] for i in range(n)]

print(product_except_self_arrays([2, 3, 4, 5]))   # [60, 40, 30, 24]
` },
    { q: "What would you change if the numbers were very large or the language had 32-bit integers?", a: "In Python integers grow as needed, so only time matters. In Java or C the product can overflow, so the problem usually promises the result fits in 32 bits, or asks for the answer modulo a prime. With a modulus, division becomes multiplication by a modular inverse, which exists only when the number is not a multiple of the prime, so the prefix-suffix method is again the safe choice." }
  ],
  tips: [
    "Open with: 'The product except i is left product times right product.' Draw a small example with four numbers and show the two running products.",
    "State clearly that you will not use division, both because the problem forbids it and because of zeros. Interviewers listen for this.",
    "Python trick: itertools.accumulate(nums, operator.mul) gives the prefix products in one line; accumulate over reversed(nums) gives the suffix products.",
    "Test out loud: [1,2,3,4] -> [24,12,8,6], [0,4] -> [4,0], [0,0,3] -> [0,0,0], [-1,1,0,-3,3] -> [0,0,9,0,0], [2,3] -> [3,2]."
  ]
});
