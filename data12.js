ROADMAP.push({
n: 22, track: "Interview practice",
title: "LeetCode Problem Bank 1: Arrays, Strings, Pointers, Stack, Search, Lists, Trees",
blurb: "Twenty-seven classic interview problems, each solved brute force first and then the optimal way, with the pattern, the complexity and the follow-up questions a big company asks.",
topics: [
X("217. Contains Duplicate",
["Problem: you get a list of integers. Return True if any value appears at least twice, and False if every value is different. Example: [1, 2, 3, 1] gives True because 1 appears twice. [1, 2, 3, 4] gives False.",
 "Brute force: compare every pair. For each index i, look at every later index j and check nums[i] == nums[j]. With n numbers that is about n^2 / 2 comparisons, so O(n^2) time and O(1) extra space. For 100,000 numbers that is five billion steps, which is too slow.",
 "Optimal: walk through the list once and keep a set of values already seen. Before adding a value, ask the set if it is already there. The invariant is simple: after processing index i, the set contains exactly the values from positions 0..i. A set lookup is O(1) on average, so the whole pass is O(n) time with O(n) extra space. Sorting first and comparing neighbours is a middle option: O(n log n) time and O(1) extra space if you may sort in place."],
["Pattern: Hash set (trade memory for speed)",
 "Brute force: O(n^2) time, O(1) space",
 "Sorting: O(n log n) time, O(1) extra space, but changes the input",
 "Optimal: O(n) time, O(n) space",
 "Edge cases: empty list, one element, all values equal, negative numbers",
 "Difficulty: Easy. Related: 219 Contains Duplicate II, 220 Contains Duplicate III, 1 Two Sum"],
"A signup importer checks whether an email address already exists before inserting it, and a payment service checks whether a transaction id was already processed so a retry does not charge a customer twice. Both are a hash set lookup on the key.",
`
# Brute force: compare every pair.  Time O(n^2), Space O(1)
def contains_duplicate_brute(nums):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] == nums[j]:
                return True
    return False

# Optimal: remember what we have seen.  Time O(n), Space O(n)
def contains_duplicate(nums):
    seen = set()
    for n in nums:
        if n in seen:
            return True
        seen.add(n)
    return False

# Shortest version, same complexity (but always reads the whole list)
def contains_duplicate_short(nums):
    return len(set(nums)) != len(nums)

print(contains_duplicate_brute([1, 2, 3, 1]))                    # True
print(contains_duplicate([1, 2, 3, 4]))                          # False
print(contains_duplicate_short([1, 1, 1, 3, 3, 4, 3, 2, 4, 2]))  # True
`,
"The hash table was described by Hans Peter Luhn at IBM in 1953, and it is the structure behind Python's dict and set. Python got a set type as a module in version 2.3 (2003) and as a built-in type in 2.4 (2004).",
[["LeetCode 217", "https://leetcode.com/problems/contains-duplicate/"],
 ["Python docs: sets", "https://docs.python.org/3/tutorial/datastructures.html#sets"]]),

X("242. Valid Anagram",
["Problem: two strings s and t of lowercase letters. Return True if t is an anagram of s, which means t uses exactly the same letters the same number of times, in any order. Example: s = 'anagram', t = 'nagaram' gives True. s = 'rat', t = 'car' gives False.",
 "Simple idea: sort both strings and compare. Two anagrams have the same sorted form. Sorting is O(n log n) time and creates two new lists, so O(n) space. It is short and correct, and many interviewers accept it as a first answer, but they will ask for better.",
 "Optimal: count letters. If the lengths differ, return False at once. Otherwise keep an array of 26 counters. For each position add one for the letter in s and subtract one for the letter in t. The invariant: counter[c] is the number of c seen in s minus the number of c seen in t. At the end every counter must be zero. One pass, O(n) time, and the array has a fixed size of 26, so O(1) extra space. collections.Counter does the same with a dictionary and also works for Unicode text."],
["Pattern: Frequency count (fixed alphabet array or Counter)",
 "Sorting: O(n log n) time, O(n) space",
 "Optimal: O(n) time, O(1) space (26 counters)",
 "Edge cases: different lengths, empty strings, one letter, Unicode input",
 "Check lengths first: it is the cheapest way to say False",
 "Difficulty: Easy. Related: 49 Group Anagrams, 438 Find All Anagrams in a String, 383 Ransom Note"],
"Spell checkers and word games (Scrabble helpers) look up words by their letter counts. A fraud team compares two documents by character frequency to spot a copy with shuffled words. Search engines use a similar signature to detect near-duplicate pages.",
`
# Simple: sort both strings.  Time O(n log n), Space O(n)
def is_anagram_sort(s, t):
    return sorted(s) == sorted(t)

# Optimal: count letters.  Time O(n), Space O(1) because the alphabet is fixed
def is_anagram(s, t):
    if len(s) != len(t):
        return False
    count = [0] * 26
    for a, b in zip(s, t):
        count[ord(a) - ord("a")] += 1
        count[ord(b) - ord("a")] -= 1
    return all(c == 0 for c in count)

# Same idea with a dictionary, works for any characters
from collections import Counter

def is_anagram_counter(s, t):
    return Counter(s) == Counter(t)

print(is_anagram_sort("anagram", "nagaram"))   # True
print(is_anagram("rat", "car"))                # False
print(is_anagram_counter("ab", "a"))           # False
`,
"Counting sort, the idea of using the values themselves as array positions, was described by Harold Seward in 1954. Python's collections.Counter was added in version 2.7 and 3.1 (2010).",
[["LeetCode 242", "https://leetcode.com/problems/valid-anagram/"],
 ["Python docs: collections.Counter", "https://docs.python.org/3/library/collections.html#collections.Counter"]]),

X("347. Top K Frequent Elements",
["Problem: given a list of integers and a number k, return the k values that appear most often. The answer may be in any order and the problem promises it is unique. Example: nums = [1, 1, 1, 2, 2, 3], k = 2 gives [1, 2].",
 "Simple idea: count with a dictionary, then sort the distinct values by their count and take the first k. Counting is O(n). Sorting m distinct values is O(m log m), which is O(n log n) in the worst case. This is short and fine for most inputs. A heap is better when k is small: heapq.nlargest keeps only k items, so it costs O(n log k).",
 "Optimal: bucket sort by frequency. A value can appear at most n times, so make n + 1 empty buckets where bucket[f] holds every value that appears exactly f times. Fill the buckets from the count dictionary, then read the buckets from the highest frequency down until k values are collected. Every step is linear, so O(n) time and O(n) space. The invariant: when we start reading bucket f, every value with frequency greater than f is already in the result."],
["Pattern: Hash map count + bucket sort (or heap)",
 "Sorting: O(n log n) time, O(n) space",
 "Heap: O(n log k) time, O(n) space",
 "Optimal: O(n) time, O(n) space",
 "Edge cases: k equal to the number of distinct values, one element, all values equal",
 "Say out loud that the problem guarantees a unique answer, so ties are not a problem",
 "Difficulty: Medium. Related: 692 Top K Frequent Words, 215 Kth Largest Element, 451 Sort Characters By Frequency"],
"Trending hashtags on a social network, the top ten error messages in today's logs, and the most viewed products on a shop dashboard are all top-k-frequent queries. Log tools such as Elasticsearch terms aggregations do this count-then-rank step for you.",
`
from collections import Counter
import heapq

# Simple: count, then sort by count.  Time O(n log n), Space O(n)
def top_k_frequent_sort(nums, k):
    count = Counter(nums)
    ordered = sorted(count, key=lambda x: count[x], reverse=True)
    return ordered[:k]

# Heap: keep only the k biggest counts.  Time O(n log k), Space O(n)
def top_k_frequent_heap(nums, k):
    count = Counter(nums)
    return heapq.nlargest(k, count, key=count.get)

# Optimal: bucket sort by frequency.  Time O(n), Space O(n)
def top_k_frequent(nums, k):
    count = Counter(nums)
    buckets = [[] for _ in range(len(nums) + 1)]   # index = how many times a value appears
    for num, freq in count.items():
        buckets[freq].append(num)
    result = []
    for freq in range(len(buckets) - 1, 0, -1):    # from most frequent down
        for num in buckets[freq]:
            result.append(num)
            if len(result) == k:
                return result
    return result

print(top_k_frequent_sort([1, 1, 1, 2, 2, 3], 2))   # [1, 2]
print(top_k_frequent_heap([1, 1, 1, 2, 2, 3], 2))   # [1, 2]
print(top_k_frequent([1, 1, 1, 2, 2, 3], 2))        # [1, 2]
print(top_k_frequent([1], 1))                       # [1]
`,
"The binary heap was invented by J. W. J. Williams in 1964 for the heapsort algorithm. Python's heapq module arrived in version 2.3 (2003) and its nlargest and nsmallest helpers are the standard way to pick the top k items in Python.",
[["LeetCode 347", "https://leetcode.com/problems/top-k-frequent-elements/"],
 ["Python docs: heapq.nlargest", "https://docs.python.org/3/library/heapq.html#heapq.nlargest"]]),

X("238. Product of Array Except Self",
["Problem: given a list nums, return a list answer where answer[i] is the product of all the numbers except nums[i]. You may not use division, and the target is O(n) time. Example: [1, 2, 3, 4] gives [24, 12, 8, 6].",
 "Brute force: for each index multiply all the other numbers. Two nested loops, O(n^2) time and O(1) extra space. A tempting shortcut is to compute the total product once and divide by nums[i], but the problem forbids division, and it also breaks when the list contains zero.",
 "Optimal: the product of everything except i is (product of all numbers to the left of i) times (product of all numbers to the right of i). Make one pass from the left storing the running prefix product in answer[i], then one pass from the right multiplying each answer[i] by the running suffix product. The invariant in the first pass: before step i, prefix equals nums[0] * ... * nums[i-1]. Two passes, O(n) time, and the only extra memory is two variables, so O(1) space if the output list is not counted."],
["Pattern: Prefix and suffix products (two passes)",
 "Brute force: O(n^2) time, O(1) space",
 "Optimal: O(n) time, O(1) extra space (output array not counted)",
 "Edge cases: one zero (only that position is non-zero), two zeros (all zero), negative numbers, length 2",
 "Division is forbidden: say that out loud so the interviewer knows you read the problem",
 "Difficulty: Medium. Related: 303 Range Sum Query, 152 Maximum Product Subarray, 724 Find Pivot Index"],
"Leave-one-out calculations appear in statistics and machine learning, for example computing a score for a dataset with each item removed in turn. The prefix-suffix trick is also how you remove one factor from a chain of matrix or probability products without recomputing everything.",
`
# Brute force: multiply all the others for each index.  Time O(n^2), Space O(1) extra
def product_except_self_brute(nums):
    result = []
    for i in range(len(nums)):
        p = 1
        for j in range(len(nums)):
            if j != i:
                p *= nums[j]
        result.append(p)
    return result

# Optimal: prefix products, then suffix products.  Time O(n), Space O(1) extra
def product_except_self(nums):
    n = len(nums)
    result = [1] * n
    prefix = 1
    for i in range(n):               # result[i] = product of everything left of i
        result[i] = prefix
        prefix *= nums[i]
    suffix = 1
    for i in range(n - 1, -1, -1):   # multiply by product of everything right of i
        result[i] *= suffix
        suffix *= nums[i]
    return result

print(product_except_self_brute([1, 2, 3, 4]))   # [24, 12, 8, 6]
print(product_except_self([1, 2, 3, 4]))         # [24, 12, 8, 6]
print(product_except_self([-1, 1, 0, -3, 3]))    # [0, 0, 9, 0, 0]
`,
"Prefix (running) totals are old bookkeeping, and the general form, the parallel prefix or scan operation, was studied by Guy Blelloch in his 1990 paper Prefix Sums and Their Applications. Python's itertools.accumulate (added in 3.2, 2011) computes a prefix product in one line.",
[["LeetCode 238", "https://leetcode.com/problems/product-of-array-except-self/"],
 ["Python docs: itertools.accumulate", "https://docs.python.org/3/library/itertools.html#itertools.accumulate"]])
]});
