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
 ["Python docs: itertools.accumulate", "https://docs.python.org/3/library/itertools.html#itertools.accumulate"]]),

X("128. Longest Consecutive Sequence",
["Problem: an unsorted list of integers. Return the length of the longest run of consecutive values (each one bigger by exactly 1 than the one before), in O(n) time. The values do not have to be next to each other in the list. Example: [100, 4, 200, 1, 3, 2] gives 4, because 1, 2, 3, 4 is a run of length 4.",
 "Brute force: for every number n, count upward: is n + 1 in the list, is n + 2 in the list, and so on. Membership in a list is O(n), and the counting repeats work for every member of a long run, so the worst case is O(n^3). Sorting gives a clean O(n log n) solution: sort the distinct values and measure each stretch of neighbours that differ by 1.",
 "Optimal: put all values in a set. Then for each value n, only start counting if n - 1 is not in the set, which means n is the first value of its run. From a start, count upward using O(1) set lookups. The invariant: every run is counted exactly once, from its smallest element. Each value is visited once as a start candidate and once inside its run, so the total is O(n) time with O(n) space."],
["Pattern: Hash set with a start-of-run check",
 "Brute force: O(n^3) worst case, O(1) space",
 "Sorting: O(n log n) time, O(n) space",
 "Optimal: O(n) time, O(n) space",
 "Edge cases: empty list, duplicates (a set makes them count once), negative numbers, one element",
 "The start-of-run check is the whole trick: without it the loop is O(n^2) on a long run",
 "Difficulty: Medium. Related: 1 Two Sum, 217 Contains Duplicate, 674 Longest Continuous Increasing Subsequence"],
"A fitness app shows your longest streak of days with activity, and a build server shows the longest run of consecutive failed build numbers. In both cases the events arrive out of order and the streak must be found without sorting the whole history.",
`
# Brute force: count upward from each number using list membership.  Time O(n^3) worst, Space O(1)
def longest_consecutive_brute(nums):
    best = 0
    for n in nums:
        length = 1
        while n + length in nums:        # 'in' on a list is O(n)
            length += 1
        best = max(best, length)
    return best

# Sorting: Time O(n log n), Space O(n)
def longest_consecutive_sort(nums):
    if not nums:
        return 0
    nums = sorted(set(nums))
    best = run = 1
    for i in range(1, len(nums)):
        if nums[i] == nums[i - 1] + 1:
            run += 1
            best = max(best, run)
        else:
            run = 1
    return best

# Optimal: hash set, only count from the start of a run.  Time O(n), Space O(n)
def longest_consecutive(nums):
    values = set(nums)
    best = 0
    for n in values:
        if n - 1 not in values:          # n is the first value of a run
            length = 1
            while n + length in values:
                length += 1
            best = max(best, length)
    return best

print(longest_consecutive_brute([100, 4, 200, 1, 3, 2]))          # 4
print(longest_consecutive_sort([0, 3, 7, 2, 5, 8, 4, 6, 0, 1]))   # 9
print(longest_consecutive([100, 4, 200, 1, 3, 2]))                # 4
print(longest_consecutive([]))                                    # 0
`,
"The other classic way to solve this is union-find, joining n with n + 1 and asking for the largest group; union-find was introduced by Galler and Fischer in 1964. The set-based start-of-run idea is a standard example of amortised analysis, where each element is paid for at most twice.",
[["LeetCode 128", "https://leetcode.com/problems/longest-consecutive-sequence/"],
 ["Python docs: set types", "https://docs.python.org/3/library/stdtypes.html#set-types-set-frozenset"]]),

X("125. Valid Palindrome",
["Problem: a string s with letters, digits, spaces and punctuation. Keep only letters and digits, ignore case, and return True if the result reads the same forwards and backwards. Example: 'A man, a plan, a canal: Panama' gives True. 'race a car' gives False. An empty string after cleaning counts as a palindrome.",
 "Simple idea: build a new list of the lowercase letters and digits and compare it with its reverse. This is O(n) time and O(n) space because it copies the string. In Python it is one line and it is a fine first answer.",
 "Optimal: two pointers. Start left at index 0 and right at the last index. Move each pointer inward past any character that is not a letter or digit, compare the two characters in lowercase, and stop with False at the first mismatch. The invariant: every pair of characters outside the window [left, right] has already been checked and matched. Each pointer moves at most n times, so O(n) time and O(1) extra space."],
["Pattern: Two pointers from both ends",
 "Simple: O(n) time, O(n) space (cleaned copy)",
 "Optimal: O(n) time, O(1) space",
 "Edge cases: empty string, only punctuation, one character, mixed case, digits (0P is not a palindrome)",
 "str.isalnum and str.lower do the character work; say that you would use ASCII range checks in a language without them",
 "Difficulty: Easy. Related: 680 Valid Palindrome II, 5 Longest Palindromic Substring, 234 Palindrome Linked List"],
"Validating a confirmation code that must be symmetric, comparing a DNA sequence with its reverse, and the inner loop of 'expand around centre' used to find palindromic substrings in text search all use the same two-pointer walk.",
`
# Simple: build the cleaned string and compare with its reverse.  Time O(n), Space O(n)
def is_palindrome_simple(s):
    cleaned = [ch.lower() for ch in s if ch.isalnum()]
    return cleaned == cleaned[::-1]

# Optimal: two pointers, skip characters that are not letters or digits.  Time O(n), Space O(1)
def is_palindrome(s):
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True

print(is_palindrome_simple("A man, a plan, a canal: Panama"))   # True
print(is_palindrome("A man, a plan, a canal: Panama"))          # True
print(is_palindrome("race a car"))                              # False
print(is_palindrome(" "))                                       # True
`,
"The word palindrome comes from Greek and means running back again. The Sator Square, a Latin word square that reads the same in four directions, was found on a wall in Pompeii, so it is older than AD 79.",
[["LeetCode 125", "https://leetcode.com/problems/valid-palindrome/"],
 ["Python docs: str.isalnum", "https://docs.python.org/3/library/stdtypes.html#str.isalnum"]]),

X("15. 3Sum",
["Problem: a list of integers. Return all unique triples [a, b, c] whose sum is 0. The same triple must not appear twice, even if the numbers come from different positions. Example: [-1, 0, 1, 2, -1, -4] gives [[-1, -1, 2], [-1, 0, 1]].",
 "Brute force: three nested loops over all triples, O(n^3) time. Duplicates are removed by storing each triple sorted in a set. With n = 3000 (the LeetCode limit) that is billions of steps, so it times out.",
 "Optimal: sort the list first, O(n log n). Fix the first number nums[i], then find two numbers in the rest that sum to -nums[i] with two pointers from both ends, exactly like the sorted two-sum. The invariant for the pointers: if the sum is too small only moving left rightwards can increase it, and if too big only moving right leftwards can decrease it, so no valid pair is skipped. To avoid duplicate triples skip a first number equal to the previous first number, and after recording a triple skip equal second numbers. Each fixed i costs O(n), so O(n^2) time and O(1) extra space apart from the output."],
["Pattern: Sort + fix one + two pointers",
 "Brute force: O(n^3) time",
 "Optimal: O(n^2) time, O(1) extra space (sorting in place, output not counted)",
 "Edge cases: fewer than 3 numbers, all zeros, no answer, many duplicates",
 "Early exit: once nums[i] > 0 no triple can sum to zero because the rest are larger",
 "Difficulty: Medium. Related: 1 Two Sum, 167 Two Sum II, 16 3Sum Closest, 18 4Sum"],
"An accounting tool looks for three transactions that cancel each other out to zero. In computational geometry, deciding whether three points are on one line reduces to 3SUM, and many lower bounds for geometry problems are stated in terms of it.",
`
# Brute force: every triple, remove duplicates with a set.  Time O(n^3)
def three_sum_brute(nums):
    found = set()
    n = len(nums)
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n):
                if nums[i] + nums[j] + nums[k] == 0:
                    found.add(tuple(sorted((nums[i], nums[j], nums[k]))))
    return [list(t) for t in sorted(found)]

# Optimal: sort, fix one number, two pointers for the other two.  Time O(n^2), Space O(1) extra
def three_sum(nums):
    nums.sort()
    result = []
    n = len(nums)
    for i in range(n - 2):
        if nums[i] > 0:
            break                          # all later numbers are positive too
        if i > 0 and nums[i] == nums[i - 1]:
            continue                       # skip a repeated first number
        left, right = i + 1, n - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total < 0:
                left += 1
            elif total > 0:
                right -= 1
            else:
                result.append([nums[i], nums[left], nums[right]])
                left += 1
                while left < right and nums[left] == nums[left - 1]:
                    left += 1              # skip a repeated second number
                right -= 1
    return result

print(three_sum_brute([-1, 0, 1, 2, -1, -4]))   # [[-1, -1, 2], [-1, 0, 1]]
print(three_sum([-1, 0, 1, 2, -1, -4]))         # [[-1, -1, 2], [-1, 0, 1]]
print(three_sum([0, 0, 0, 0]))                  # [[0, 0, 0]]
`,
"The 3SUM problem is famous in theory: Gajentaan and Overmars showed in 1995 that many geometry problems are at least as hard as 3SUM, which created the class of 3SUM-hard problems. For decades O(n^2) was believed optimal, until Gronlund and Pettie gave a slightly faster algorithm in 2014.",
[["LeetCode 15", "https://leetcode.com/problems/3sum/"],
 ["Python docs: list.sort", "https://docs.python.org/3/library/stdtypes.html#list.sort"]]),

X("11. Container With Most Water",
["Problem: a list height where height[i] is the height of a vertical line at position i. Pick two lines so that, together with the x-axis, they hold the most water. The water is (distance between the lines) times (the shorter height). Return that maximum area. Example: [1, 8, 6, 2, 5, 4, 8, 3, 7] gives 49, from the 8 at index 1 and the 7 at index 8: 7 * 7.",
 "Brute force: try every pair of lines and compute the area. O(n^2) time and O(1) space. With 100,000 lines that is five billion areas.",
 "Optimal: start with the widest container, left at index 0 and right at the last index. The area is limited by the shorter line. Moving the taller line inward can never help: the width gets smaller and the height is still limited by the same shorter line. So move the shorter line inward and hope to find a taller one. The invariant: the best container that uses any line already left behind has been seen. Each step moves one pointer, so O(n) time and O(1) space."],
["Pattern: Two pointers with a greedy exchange argument",
 "Brute force: O(n^2) time, O(1) space",
 "Optimal: O(n) time, O(1) space",
 "Edge cases: exactly two lines, all equal heights, heights with zeros, increasing then decreasing",
 "On a tie either pointer may move; both choices are safe",
 "Difficulty: Medium. Related: 42 Trapping Rain Water, 84 Largest Rectangle in Histogram"],
"Choosing the two time points with the largest guaranteed throughput between them, or the two support columns that give the widest shelf for the lowest column, are the same greedy pointer walk. The exchange argument is also a model for proving that other greedy choices are safe.",
`
# Brute force: every pair of lines.  Time O(n^2), Space O(1)
def max_area_brute(height):
    best = 0
    for i in range(len(height)):
        for j in range(i + 1, len(height)):
            best = max(best, (j - i) * min(height[i], height[j]))
    return best

# Optimal: two pointers from both ends, move the shorter line inward.  Time O(n), Space O(1)
def max_area(height):
    left, right = 0, len(height) - 1
    best = 0
    while left < right:
        area = (right - left) * min(height[left], height[right])
        best = max(best, area)
        if height[left] < height[right]:
            left += 1            # the shorter line limits the area, so try to replace it
        else:
            right -= 1
    return best

print(max_area_brute([1, 8, 6, 2, 5, 4, 8, 3, 7]))   # 49
print(max_area([1, 8, 6, 2, 5, 4, 8, 3, 7]))         # 49
print(max_area([1, 1]))                              # 1
`,
"Two-pointer walks are as old as the merge step of merge sort, described by John von Neumann in 1945. The proof style used here, showing that a discarded choice can never beat the one we keep, is called an exchange argument and is the standard tool for proving greedy algorithms correct.",
[["LeetCode 11", "https://leetcode.com/problems/container-with-most-water/"],
 ["Python docs: built-in min and max", "https://docs.python.org/3/library/functions.html#min"]]),

X("42. Trapping Rain Water",
["Problem: a list of bar heights, each bar 1 unit wide. After rain, how many units of water are trapped between the bars? Example: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] gives 6. [4, 2, 0, 3, 2, 5] gives 9.",
 "Brute force: water above bar i is min(highest bar to its left including itself, highest bar to its right including itself) minus height[i]. Computing the two maximums by scanning for each bar is O(n^2) time and O(1) space. A better version precomputes left_max and right_max arrays in two passes, giving O(n) time and O(n) space.",
 "Optimal: two pointers with running maximums. Keep left_max for everything seen from the left and right_max for everything seen from the right. If height[left] < height[right], then the true right wall for position left is at least height[right], which is bigger than left_max, so the water at left is decided by left_max alone; add it and move left. Otherwise do the mirror step on the right. The invariant: the pointer we process always has the smaller side as its limiting wall. O(n) time and O(1) space. A monotonic stack also solves it in O(n) by filling water layer by layer."],
["Pattern: Prefix and suffix maximums, then two pointers",
 "Brute force: O(n^2) time, O(1) space",
 "Prefix arrays: O(n) time, O(n) space",
 "Optimal: O(n) time, O(1) space",
 "Edge cases: fewer than 3 bars, strictly increasing or decreasing (no water), all equal, zeros at both ends",
 "Water at a bar is never negative because the maximums include the bar itself",
 "Difficulty: Hard. Related: 11 Container With Most Water, 84 Largest Rectangle in Histogram, 407 Trapping Rain Water II"],
"Computing how much a terrain profile can flood is a real task in map and flood-risk software, and the 2-D version is used on digital elevation models. The same min-of-two-maximums idea appears in signal processing when you clip a signal by an envelope from both sides.",
`
# Brute force: for each bar, water = min(max to the left, max to the right) - height.  Time O(n^2), Space O(1)
def trap_brute(height):
    total = 0
    for i in range(len(height)):
        left_max = max(height[:i + 1])
        right_max = max(height[i:])
        total += min(left_max, right_max) - height[i]
    return total

# Better: precompute the running maximums.  Time O(n), Space O(n)
def trap_prefix(height):
    n = len(height)
    if n == 0:
        return 0
    left_max = [0] * n
    right_max = [0] * n
    left_max[0] = height[0]
    for i in range(1, n):
        left_max[i] = max(left_max[i - 1], height[i])
    right_max[n - 1] = height[n - 1]
    for i in range(n - 2, -1, -1):
        right_max[i] = max(right_max[i + 1], height[i])
    return sum(min(left_max[i], right_max[i]) - height[i] for i in range(n))

# Optimal: two pointers, the side with the smaller wall is decided.  Time O(n), Space O(1)
def trap(height):
    left, right = 0, len(height) - 1
    left_max = right_max = 0
    total = 0
    while left < right:
        if height[left] < height[right]:
            left_max = max(left_max, height[left])
            total += left_max - height[left]
            left += 1
        else:
            right_max = max(right_max, height[right])
            total += right_max - height[right]
            right -= 1
    return total

bars = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]
print(trap_brute(bars))           # 6
print(trap_prefix(bars))          # 6
print(trap(bars))                 # 6
print(trap([4, 2, 0, 3, 2, 5]))   # 9
`,
"The stack solution is an instance of the all nearest smaller values problem, studied by Berkman, Schieber and Vishkin in 1993. The two-pointer solution uses the same prefix-maximum idea as prefix sums and is a well-known example of replacing two arrays with two running variables.",
[["LeetCode 42", "https://leetcode.com/problems/trapping-rain-water/"],
 ["Python docs: built-in sum", "https://docs.python.org/3/library/functions.html#sum"]]),

X("121. Best Time to Buy and Sell Stock",
["Problem: prices[i] is the price of a stock on day i. Choose one day to buy and a later day to sell to make the biggest profit. If no profit is possible, return 0. Example: [7, 1, 5, 3, 6, 4] gives 5, buy at 1 on day 1 and sell at 6 on day 4.",
 "Brute force: try every buy day i and every later sell day j, and keep the largest prices[j] - prices[i]. Two nested loops, O(n^2) time and O(1) space. With 100,000 days that is five billion subtractions.",
 "Optimal: walk the days once and remember the lowest price seen so far. On each day the best possible sale today is today's price minus that lowest price. Keep the maximum of those. The invariant: after day i, lowest is the minimum of prices[0..i] and best is the best profit for any sale on or before day i. One pass, O(n) time, O(1) space. This is Kadane's maximum subarray algorithm applied to the daily price differences."],
["Pattern: One pass with a running minimum (Kadane)",
 "Brute force: O(n^2) time, O(1) space",
 "Optimal: O(n) time, O(1) space",
 "Edge cases: prices always falling (answer 0), one day, two days, equal prices",
 "You must buy before you sell, so the minimum must come from earlier days only",
 "Difficulty: Easy. Related: 122 Buy and Sell Stock II, 123 Buy and Sell Stock III, 53 Maximum Subarray"],
"Any report that asks for the biggest rise between an earlier and a later reading uses this: the largest latency jump in a monitoring series, the biggest gain in a currency rate, or the maximum drawdown in a portfolio (the mirror version with a running maximum).",
`
# Brute force: every buy day with every later sell day.  Time O(n^2), Space O(1)
def max_profit_brute(prices):
    best = 0
    for i in range(len(prices)):
        for j in range(i + 1, len(prices)):
            best = max(best, prices[j] - prices[i])
    return best

# Optimal: remember the lowest price so far.  Time O(n), Space O(1)
def max_profit(prices):
    lowest = float("inf")
    best = 0
    for p in prices:
        if p < lowest:
            lowest = p                  # a new cheapest day to buy
        elif p - lowest > best:
            best = p - lowest           # selling today beats the best so far
    return best

print(max_profit_brute([7, 1, 5, 3, 6, 4]))   # 5
print(max_profit([7, 1, 5, 3, 6, 4]))         # 5
print(max_profit([7, 6, 4, 3, 1]))            # 0
`,
"The one-pass idea is Kadane's algorithm, found by Jay Kadane in 1984 and made famous by Jon Bentley's Programming Pearls column the same year. Applied to the day-to-day price differences, the maximum subarray sum is exactly the best single-trade profit.",
[["LeetCode 121", "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/"],
 ["Python docs: math.inf", "https://docs.python.org/3/library/math.html#math.inf"]]),

X("3. Longest Substring Without Repeating Characters",
["Problem: given a string s, return the length of the longest substring (contiguous) in which no character repeats. Example: 'abcabcbb' gives 3 (abc). 'pwwkew' gives 3 (wke). 'bbbbb' gives 1.",
 "Brute force: check every substring. For each start i and end j, build a set of the characters and compare its size with the length. There are O(n^2) substrings and each check is O(n), so O(n^3) time. Even the smarter O(n^2) version that extends j until a repeat appears is too slow for long inputs.",
 "Optimal: a sliding window [left, right] that never contains a repeated character, plus a dictionary with the last index of each character. When the character at right was seen at an index inside the window, move left to that index plus one. The invariant: s[left..right] has no repeats after every step. Each pointer only moves forward, so O(n) time and O(min(n, alphabet)) space."],
["Pattern: Sliding window with last-seen index",
 "Brute force: O(n^3) time (O(n^2) with early stop)",
 "Optimal: O(n) time, O(min(n, alphabet)) space",
 "Edge cases: empty string, one character, all equal, all different, repeat far outside the window",
 "The check last[ch] >= left is essential: an old index outside the window must not move left backwards",
 "Difficulty: Medium. Related: 159 and 340 (at most k distinct), 424 Longest Repeating Character Replacement, 76 Minimum Window Substring"],
"Finding the longest run of unique session ids in a log, detecting the longest stretch of distinct packets in a network trace, and the input-validation rule 'no repeated character in the last n keystrokes' are all this window. The last-seen dictionary trick is the same one used in rate limiters that remember the last time a key was used.",
`
# Brute force: check every substring with a set.  Time O(n^3), Space O(n)
def length_of_longest_substring_brute(s):
    best = 0
    for i in range(len(s)):
        for j in range(i, len(s)):
            if len(set(s[i:j + 1])) == j - i + 1:
                best = max(best, j - i + 1)
    return best

# Optimal: sliding window with the last index of each character.  Time O(n), Space O(min(n, alphabet))
def length_of_longest_substring(s):
    last = {}              # character -> last index where it was seen
    left = 0
    best = 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1          # jump past the earlier copy
        last[ch] = right
        best = max(best, right - left + 1)
    return best

print(length_of_longest_substring_brute("abcabcbb"))   # 3
print(length_of_longest_substring("abcabcbb"))         # 3
print(length_of_longest_substring("pwwkew"))           # 3
print(length_of_longest_substring(""))                 # 0
`,
"The sliding window takes its name from the TCP sliding window flow control described in RFC 793 in 1981. As a named interview pattern it became popular through coding-interview courses in the 2010s, and this problem, number 3 on LeetCode, is its most common first example.",
[["LeetCode 3", "https://leetcode.com/problems/longest-substring-without-repeating-characters/"],
 ["Python docs: enumerate", "https://docs.python.org/3/library/functions.html#enumerate"]]),

X("76. Minimum Window Substring",
["Problem: strings s and t. Return the shortest substring of s that contains every character of t, including repeats. If there is none return the empty string. Example: s = 'ADOBECODEBANC', t = 'ABC' gives 'BANC'. s = 'a', t = 'aa' gives the empty string because one a is not enough.",
 "Brute force: for every start index, extend the end until the window contains all of t, then record the length. Checking a window with a Counter costs O(n), so this is O(n^3) in the worst case, or O(n^2) with an incremental count. Too slow when s has 100,000 characters.",
 "Optimal: a sliding window with two counters. need[c] is how many more of c the window still needs (it goes negative when the window has extra copies), and missing is the total number of characters still needed. Move right and add characters; when missing hits 0 the window is valid, so record it and move left to shrink until it becomes invalid again. The invariant: missing == 0 if and only if the window covers t. Each index enters and leaves the window once, so O(n + m) time and O(alphabet) space."],
["Pattern: Variable-size sliding window with a need counter",
 "Brute force: O(n^3) time",
 "Optimal: O(n + m) time, O(alphabet) space",
 "Edge cases: t longer than s, t with repeated letters, s equal to t, no valid window, several windows of the same length",
 "Track missing as one integer: comparing two dictionaries on every step costs O(alphabet) each time",
 "Difficulty: Hard. Related: 3 Longest Substring Without Repeating Characters, 567 Permutation in String, 438 Find All Anagrams"],
"A log viewer that finds the shortest time range containing at least one error of each required type, a search engine snippet generator that picks the shortest piece of a page containing all the query words, and DNA tools that find the shortest region covering a set of markers all use this window.",
`
from collections import Counter

# Brute force: for every start, grow until the window covers t.  Time O(n^3) worst
def min_window_brute(s, t):
    need = Counter(t)
    best = ""
    for i in range(len(s)):
        for j in range(i + len(t), len(s) + 1):
            window = Counter(s[i:j])
            if all(window[c] >= need[c] for c in need):
                if best == "" or j - i < len(best):
                    best = s[i:j]
                break                   # a longer window from i is never shorter
    return best

# Optimal: sliding window with a count of missing characters.  Time O(n + m), Space O(alphabet)
def min_window(s, t):
    if not t or not s:
        return ""
    need = Counter(t)
    missing = len(t)                    # characters (with repeats) still needed
    left = 0
    best_start, best_len = 0, float("inf")
    for right, ch in enumerate(s):
        if need[ch] > 0:
            missing -= 1
        need[ch] -= 1
        while missing == 0:             # the window covers t: record and shrink
            if right - left + 1 < best_len:
                best_start, best_len = left, right - left + 1
            need[s[left]] += 1
            if need[s[left]] > 0:
                missing += 1            # we just removed a needed character
            left += 1
    return "" if best_len == float("inf") else s[best_start:best_start + best_len]

print(min_window_brute("ADOBECODEBANC", "ABC"))   # BANC
print(min_window("ADOBECODEBANC", "ABC"))         # BANC
print(repr(min_window("a", "aa")))                # ''
`,
"Two indexes moving in the same direction over an array is sometimes called the caterpillar method in programming olympiad circles, because the window stretches and contracts like a caterpillar. The collections.Counter class that makes the counting short was added to Python in 2010.",
[["LeetCode 76", "https://leetcode.com/problems/minimum-window-substring/"],
 ["Python docs: collections.Counter", "https://docs.python.org/3/library/collections.html#collections.Counter"]]),

X("155. Min Stack",
["Problem: design a stack with push, pop, top and getMin, where getMin returns the smallest value currently in the stack, and every operation must run in O(1) time. Example: push -2, push 0, push -3, getMin gives -3; pop; top gives 0; getMin gives -2.",
 "Simple idea: a normal Python list, and getMin scans all items with min(). push, pop and top are O(1) but getMin is O(n). It is correct and a fine warm-up, but it fails the O(1) requirement.",
 "Optimal: store with every element the minimum of the stack at the moment it was pushed, as a pair (value, min_so_far). The invariant: the pair on top always knows the minimum of everything below it, because the minimum of the stack can only change when something is pushed or popped from the top. getMin reads the top pair. All four operations are O(1) and the space is O(n). A variant keeps a second stack that only records new minimums, which saves space when the data mostly grows."],
["Pattern: Stack with extra state per element (auxiliary stack)",
 "Simple: getMin O(n)",
 "Optimal: all operations O(1) time, O(n) space",
 "Edge cases: pop on an empty stack (the problem promises it never happens), equal minimums pushed twice, negative numbers",
 "When using a second min stack, push on equal values too (<=), or a pop can remove the minimum too early",
 "Difficulty: Medium. Related: 716 Max Stack, 232 Queue using Stacks, 225 Stack using Queues"],
"Undo histories that must show the current lowest zoom or earliest timestamp, interpreters that track the current minimum of a value stack, and streaming price feeds that need the running minimum of the last n ticks (two min stacks make a min queue) use this structure.",
`
# Simple: a plain list; getMin scans everything.  push/pop/top O(1), getMin O(n)
class MinStackSlow:
    def __init__(self):
        self.items = []
    def push(self, val):
        self.items.append(val)
    def pop(self):
        self.items.pop()
    def top(self):
        return self.items[-1]
    def getMin(self):
        return min(self.items)

# Optimal: keep the minimum so far next to every element.  All operations O(1), Space O(n)
class MinStack:
    def __init__(self):
        self.items = []          # pairs (value, minimum of the stack up to this value)
    def push(self, val):
        current_min = min(val, self.items[-1][1]) if self.items else val
        self.items.append((val, current_min))
    def pop(self):
        self.items.pop()
    def top(self):
        return self.items[-1][0]
    def getMin(self):
        return self.items[-1][1]

st = MinStack()
st.push(-2)
st.push(0)
st.push(-3)
print(st.getMin())   # -3
st.pop()
print(st.top())      # 0
print(st.getMin())   # -2
`,
"The stack as a computing idea was patented by Friedrich Bauer and Klaus Samelson in 1957 for expression evaluation; Alan Turing had described the same push and pop operations, which he called bury and unbury, in 1946. Python lists are the standard stack: append and pop at the end are amortised O(1).",
[["LeetCode 155", "https://leetcode.com/problems/min-stack/"],
 ["Python docs: using lists as stacks", "https://docs.python.org/3/tutorial/datastructures.html#using-lists-as-stacks"]]),

X("739. Daily Temperatures",
["Problem: temperatures[i] is the temperature on day i. For each day, return how many days you must wait until a warmer day, or 0 if there is none. Example: [73, 74, 75, 71, 69, 72, 76, 73] gives [1, 1, 4, 2, 1, 1, 0, 0].",
 "Brute force: for each day scan forward until a warmer day appears. O(n^2) time in the worst case (a falling sequence) and O(1) extra space.",
 "Optimal: a monotonic stack of indexes whose temperatures are decreasing from bottom to top; these are the days still waiting for a warmer day. When a new day arrives, pop every index with a lower temperature: today is their answer. Then push today. The invariant: the stack always holds exactly the days that have not yet seen a warmer day, in decreasing temperature order. Each index is pushed once and popped at most once, so O(n) time and O(n) space."],
["Pattern: Monotonic stack (next greater element)",
 "Brute force: O(n^2) time, O(1) space",
 "Optimal: O(n) time, O(n) space",
 "Edge cases: one day, strictly falling (all zeros), strictly rising (all ones), equal temperatures (not warmer)",
 "Pop while strictly less: an equal temperature is not a warmer day",
 "Difficulty: Medium. Related: 496 and 503 Next Greater Element, 901 Online Stock Span, 84 Largest Rectangle in Histogram"],
"Finding for each price tick when it was first exceeded, computing for each build when the next faster build happened, and matching each opening bracket with its closing one in a parser all keep a stack of items that are still waiting for their partner.",
`
# Brute force: for each day scan forward.  Time O(n^2), Space O(1) extra
def daily_temperatures_brute(temps):
    answer = [0] * len(temps)
    for i in range(len(temps)):
        for j in range(i + 1, len(temps)):
            if temps[j] > temps[i]:
                answer[i] = j - i
                break
    return answer

# Optimal: monotonic stack of days still waiting for a warmer day.  Time O(n), Space O(n)
def daily_temperatures(temps):
    answer = [0] * len(temps)
    stack = []                        # indexes with decreasing temperatures
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()           # day j finally sees a warmer day: today
            answer[j] = i - j
        stack.append(i)
    return answer

print(daily_temperatures_brute([73, 74, 75, 71, 69, 72, 76, 73]))   # [1, 1, 4, 2, 1, 1, 0, 0]
print(daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]))         # [1, 1, 4, 2, 1, 1, 0, 0]
print(daily_temperatures([30, 40, 50, 60]))                         # [1, 1, 1, 0]
`,
"Finding the nearest larger or smaller value for every element is the all nearest smaller values problem, studied by Berkman, Schieber and Vishkin in 1993, who also gave parallel algorithms for it. The stack solution is the standard sequential version and is the base of Largest Rectangle in Histogram.",
[["LeetCode 739", "https://leetcode.com/problems/daily-temperatures/"],
 ["Python docs: list.pop", "https://docs.python.org/3/tutorial/datastructures.html#more-on-lists"]])
]});
