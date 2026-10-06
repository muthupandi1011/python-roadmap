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

EXTRA(22, "128. Longest Consecutive Sequence", {
  deep: [
    "How to recognise it: the problem says 'consecutive' or 'streak' about values, not positions, and it demands O(n), which rules out sorting. That combination means a hash set. The general lesson: when you need neighbours of a value (n - 1, n + 1) rather than neighbours of an index, a set or dictionary keyed by value gives them in O(1).",
    "Why it is O(n) even with a nested loop: the inner while loop only runs from a value n whose predecessor n - 1 is absent, so each run is walked exactly once, starting from its smallest value. Over the whole loop every value is touched at most twice: once as a candidate start and once while walking its run. This is amortised analysis; the nested loop looks quadratic but the total work is linear. If you forget the n - 1 check, a run of length n costs 1 + 2 + ... + n steps, which is O(n^2).",
    "Traps and constraint changes: iterate over the set, not the list, or duplicates make you repeat the same walk. With a sorted input, one pass comparing neighbours is enough and uses O(1) space, but be careful with equal neighbours: they neither break nor extend the run. If the numbers arrive as a stream and you need the answer after every element, keep a dictionary that maps each run's two end values to the run length and merge runs when a new value touches them. Union-find is a third way and is the one to mention if the interviewer likes graph structures."
  ],
  iq: [
    { q: "How would you solve it with union-find?", a: "Make every value its own set. For each value n that has n + 1 in the input, union n with n + 1. The answer is the size of the largest set. With path compression and union by size this is almost linear. It is more code than the set approach but it generalises to merging ranges dynamically.", c: `
def longest_consecutive_uf(nums):
    parent = {n: n for n in nums}
    size = {n: 1 for n in nums}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]    # path halving
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra == rb:
            return
        if size[ra] < size[rb]:
            ra, rb = rb, ra
        parent[rb] = ra
        size[ra] += size[rb]

    for n in parent:
        if n + 1 in parent:
            union(n, n + 1)
    return max(size[find(n)] for n in parent) if parent else 0

print(longest_consecutive_uf([100, 4, 200, 1, 3, 2]))   # 4
` },
    { q: "The numbers arrive one by one and you must report the longest run after each one. What do you do?", a: "Keep a dictionary from a run's end values to the run length. When a new value n arrives, look up the run ending at n - 1 and the run starting at n + 1, merge them into one run of length left + right + 1, and write that length at the new left end and right end. Only the ends need to be correct, because a new value can only touch a run at an end.", c: `
def longest_consecutive_stream(stream):
    ends = {}        # value -> length of the run that starts or ends at this value
    best = 0
    for n in stream:
        if n in ends:
            continue
        left = ends.get(n - 1, 0)
        right = ends.get(n + 1, 0)
        length = left + right + 1
        ends[n] = length
        ends[n - left] = length
        ends[n + right] = length
        best = max(best, length)
    return best

print(longest_consecutive_stream([1, 9, 3, 10, 4, 20, 2]))   # 4
` },
    { q: "Why does iterating over the set instead of the list matter?", a: "With duplicates in the list, the same start value would be walked once per copy. For a list of a million copies of 1 followed by 2..1000, you would walk the run a million times. Iterating over the set guarantees each start value is tried once, which is what the O(n) proof needs." },
    { q: "Can you solve it in O(n) time and O(1) extra space?", a: "Not in general without changing the input. If you may modify the list, you can sort it in place with an O(n log n) sort and scan, which is O(1) extra space but not O(n) time. If the values are bounded to a small range, a bit array of that range works as a set with a constant factor less memory, but that is still O(range) space." }
  ],
  tips: [
    "Say first: 'Sorting would be O(n log n), the problem wants O(n), so I will use a set and only start counting at the beginning of a run.' That one sentence shows the whole plan.",
    "Explain the amortised bound out loud. Many candidates write the right code and then wrongly call it O(n^2); interviewers test whether you understand why it is linear.",
    "Python trick: build the set once with values = set(nums) and loop over values, not nums. Membership tests n - 1 not in values and n + length in values are both O(1).",
    "Test out loud: [] -> 0, [5] -> 1, [1, 2, 0, 1] -> 3 (duplicates), [100, 4, 200, 1, 3, 2] -> 4, [-2, -1, 0] -> 3."
  ]
});

EXTRA(22, "125. Valid Palindrome", {
  deep: [
    "How to recognise it: 'reads the same forwards and backwards', 'symmetric', 'mirror' and 'compare from both ends' are two-pointer words. The pattern also hides inside bigger problems: expanding around a centre in Longest Palindromic Substring (5), checking the second half of a linked list (234), and the delete-one-character variant (680).",
    "Why it is correct: a string is a palindrome exactly when character i equals character n - 1 - i for every i in the first half. The two pointers visit exactly those pairs, from the outside in, skipping characters that the problem says to ignore. When left and right meet or cross, every pair has been compared, so returning True is safe. The inner while loops need the left < right guard, otherwise a string made only of punctuation makes the pointers run past each other.",
    "Traps and constraint changes: s[left].lower() != s[right].lower() compares one character at a time, so no copy is made; the simple version copies the string, which matters at a few hundred megabytes. For Unicode text, str.casefold is stricter than str.lower (the German sharp s becomes ss), and combined characters such as an accent stored as a separate code point can break symmetry; normalising with unicodedata.normalize fixes that. If the input is a stream that you cannot index, you must store it, so O(1) space is no longer possible."
  ],
  iq: [
    { q: "Follow-up 680: you may delete at most one character. Is it still a palindrome?", a: "Walk with two pointers as before. At the first mismatch you have two choices: skip the left character or skip the right one. Check whether either remaining range is a palindrome with a plain two-pointer scan. Because only one deletion is allowed, you branch at most once, so the total is still O(n).", c: `
def valid_palindrome_two(s):
    def is_pal(i, j):
        while i < j:
            if s[i] != s[j]:
                return False
            i += 1
            j -= 1
        return True

    i, j = 0, len(s) - 1
    while i < j:
        if s[i] != s[j]:
            return is_pal(i + 1, j) or is_pal(i, j - 1)
        i += 1
        j -= 1
    return True

print(valid_palindrome_two("abca"))   # True
print(valid_palindrome_two("abc"))    # False
` },
    { q: "How would you write isalnum yourself, for example in a language without it?", a: "Compare the character against the three ASCII ranges a to z, A to Z and 0 to 9. Mention that this is ASCII only and that real Unicode letter classes need a library table. Interviewers ask this to see if you know the character comparisons behind the helper.", c: `
def is_alnum_ascii(ch):
    return ("a" <= ch <= "z") or ("A" <= ch <= "Z") or ("0" <= ch <= "9")

print([is_alnum_ascii(c) for c in "a,Z9 "])   # [True, False, True, True, False]
` },
    { q: "How do you check whether a singly linked list is a palindrome in O(1) space (234)?", a: "Find the middle with slow and fast pointers, reverse the second half in place, then walk one pointer from the head and one from the start of the reversed half and compare values. Afterwards reverse the second half again if the list must stay unchanged. Three linear passes, constant extra space." },
    { q: "What changes for very long strings or for case rules in other languages?", a: "For long strings the two-pointer version is the only one that avoids a full copy, and it also exits early on the first mismatch. For case rules, lower() is enough for ASCII; for general text use casefold() and consider Unicode normalisation so that an accented letter stored as two code points matches the same letter stored as one." }
  ],
  tips: [
    "Clarify three things in one breath: ignore case, ignore non-alphanumeric characters, and the empty string is a palindrome. Then write the two-pointer loop.",
    "Guard both inner while loops with left < right. Say it out loud, because the all-punctuation case is the classic failing test.",
    "Python trick: the one-liner is cleaned = [c.lower() for c in s if c.isalnum()]; return cleaned == cleaned[::-1]. Offer it first, then give the O(1) space version.",
    "Test out loud: 'A man, a plan, a canal: Panama' -> True, 'race a car' -> False, ' ' -> True, '0P' -> False, 'a' -> True."
  ]
});

EXTRA(22, "15. 3Sum", {
  deep: [
    "How to recognise it: 'find all triples', 'sum to zero', 'unique triplets' and the instruction that the same numbers must not be reported twice. The general kSum family is solved by fixing k - 2 numbers with loops and solving the last two with two pointers on sorted data, giving O(n^(k-1)). 3Sum Closest (16) is the same loop with a running best difference instead of an exact match.",
    "Why it is correct and duplicate-free: after sorting, for a fixed i the two-pointer scan finds every pair in nums[i+1..] that sums to -nums[i]; the pointer argument is the same as sorted two-sum. Skipping nums[i] == nums[i-1] means each distinct first value is used once, and since the inner scan starts at i + 1, a triple is always reported with its smallest element first, in a fixed order. Skipping equal values after a hit removes repeated second elements; the third element is then forced, so it cannot repeat either. Therefore each distinct triple appears exactly once.",
    "Traps and constraint changes: forgetting to skip duplicates on i gives repeated triples; skipping before the first hit for left (comparing with nums[left - 1] when left == i + 1) can wrongly skip a valid pair such as [-1, -1, 2], so skip only after recording a triple. The nums[i] > 0 break is an optimisation, not a correctness rule. If the input cannot be sorted (you must report indexes), use a hash set per fixed i, still O(n^2) but with O(n) extra space. If the target is a value t instead of zero, replace zero by t everywhere."
  ],
  iq: [
    { q: "How does this extend to 4Sum, and what is the complexity?", a: "Sort, then two nested loops fix the first two numbers (with the same duplicate skipping), and two pointers find the remaining pair. That is O(n^3). For general kSum write a recursive function that fixes one number and calls itself with k - 1, until k == 2 uses two pointers. The pattern costs O(n^(k-1)) and O(1) extra space apart from the recursion and output." },
    { q: "Solve 3Sum Closest: return the sum of three numbers nearest to a target.", a: "Same sorting and two-pointer walk. For each total, if its distance to the target is smaller than the best so far, record it. Then move the pointers toward the target: left up if the total is too small, right down if too big. If the total equals the target you can return at once because nothing is closer.", c: `
def three_sum_closest(nums, target):
    nums.sort()
    best = nums[0] + nums[1] + nums[2]
    for i in range(len(nums) - 2):
        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if abs(total - target) < abs(best - target):
                best = total
            if total < target:
                left += 1
            elif total > target:
                right -= 1
            else:
                return total
    return best

print(three_sum_closest([-1, 2, 1, -4], 1))   # 2
` },
    { q: "Can you do it with a hash set instead of two pointers?", a: "Yes. For each fixed i, scan j from i + 1 and keep a set of the numbers seen between i and j. If -nums[i] - nums[j] is in the set, you found a triple. Sorting is still the easiest way to skip duplicates. It is O(n^2) time like the pointer version but uses O(n) extra space, so the two-pointer version is usually preferred.", c: `
def three_sum_hash(nums):
    nums.sort()
    result = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        seen = set()
        j = i + 1
        while j < len(nums):
            need = -nums[i] - nums[j]
            if need in seen:
                result.append([nums[i], need, nums[j]])
                while j + 1 < len(nums) and nums[j] == nums[j + 1]:
                    j += 1
            seen.add(nums[j])
            j += 1
    return result

print(sorted(three_sum_hash([-1, 0, 1, 2, -1, -4])))   # [[-1, -1, 2], [-1, 0, 1]]
` },
    { q: "Is O(n^2) the best possible?", a: "For practical purposes yes. The theoretical 3SUM conjecture says no algorithm runs in O(n^(2 - e)) for any e > 0, and only tiny logarithmic improvements are known. Many problems in geometry and string matching are proven to be at least as hard as 3SUM, so an interviewer accepts O(n^2) as optimal." }
  ],
  tips: [
    "Start by saying: 'I will sort, fix one number, and run the sorted two-sum with two pointers on the rest.' Then mention that duplicates are the tricky part before you write code.",
    "Write the two duplicate-skip lines as you code and explain each: one for the fixed number, one for the second number after a hit.",
    "Python trick: if you are short on time, use a set of tuples to deduplicate and sort the output at the end; it is slower but it is correct, and you can improve it when asked.",
    "Test out loud: [-1, 0, 1, 2, -1, -4] -> two triples, [0, 0, 0, 0] -> [[0, 0, 0]], [1, 2, 3] -> [], [] -> [], [-2, 0, 1, 1, 2] -> [[-2, 0, 2], [-2, 1, 1]]."
  ]
});

EXTRA(22, "11. Container With Most Water", {
  deep: [
    "How to recognise it: two indexes, an answer that depends on their distance and on the smaller of two values, and a request for better than O(n^2). The two-pointer walk from both ends fits because the width is largest at the start and only ever shrinks, so each step must try to improve the height. Trapping Rain Water (42) looks similar but asks a different question: the sum of water over all bars, not the best single pair.",
    "Why it is correct, as an exchange argument: suppose the shorter line is at left. Every container that uses left with some right2 between left and right has width smaller than right - left and height at most height[left], so it cannot beat the container we just measured. Therefore left can never be part of a better answer and it is safe to discard it. By symmetry the same holds when right is shorter. Each step discards one line that cannot be in the optimal pair, so when the pointers meet, the optimal pair was measured at some step.",
    "Traps and constraint changes: do not move both pointers at once, and do not move the taller one. On equal heights either move is safe; moving both is also safe here because neither can improve with the other. The result cannot be smaller than zero because heights are non-negative. If the problem asked for the pair of indexes, record them when the area improves. If heights can change between queries, there is no quick update, you rerun the O(n) scan, or use a more complex structure."
  ],
  iq: [
    { q: "Prove that moving the shorter line never loses the optimal answer.", a: "Say the shorter line is at left. Any container that keeps left and moves right inward has a smaller width and a height still capped by height[left], so its area is strictly not bigger. So every container that includes left and some index between left and right is no better than the one we already measured. Discarding left loses nothing. The same argument works for right when it is the shorter one." },
    { q: "What happens on a tie, when both lines are equal?", a: "Either move is safe. Any container that uses left with a nearer right has height at most height[left] and a smaller width, and symmetrically for right. Moving both pointers at once is also safe for the same reason. The code moves right on a tie because of the else branch, and that is fine." },
    { q: "Can this be solved faster than O(n)?", a: "No. Any algorithm must at least look at every height once, because an unseen line could be very tall and far from one end, giving the best area. So O(n) is a lower bound and the two-pointer solution is optimal in time, and it already uses O(1) space." },
    { q: "Return the two indexes, not just the area.", a: "Keep the best pair next to the best area and update both only when the area strictly improves. This returns the first pair found with the maximum area. If there are several pairs with the same area, say which tie rule the interviewer prefers.", c: `
def max_area_indices(height):
    left, right = 0, len(height) - 1
    best, pair = 0, (0, 0)
    while left < right:
        area = (right - left) * min(height[left], height[right])
        if area > best:
            best, pair = area, (left, right)
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return best, pair

print(max_area_indices([1, 8, 6, 2, 5, 4, 8, 3, 7]))   # (49, (1, 8))
` }
  ],
  tips: [
    "Open with the formula: area = (right - left) * min(height[left], height[right]). Then say the brute force is O(n^2) and that you will use two pointers from the ends.",
    "Explain the greedy step before you code: 'I always move the shorter line, because moving the taller one cannot increase the area.' Interviewers want to hear the reason, not only the rule.",
    "Python trick: keep the loop to five lines; compute area, update best, move one pointer. Do not try to be clever by skipping several lines at once unless asked.",
    "Test out loud: [1, 1] -> 1, [1, 8, 6, 2, 5, 4, 8, 3, 7] -> 49, [4, 3, 2, 1, 4] -> 16, [1, 2, 1] -> 2."
  ]
});

EXTRA(22, "42. Trapping Rain Water", {
  deep: [
    "How to recognise it: the amount at each position depends on the highest value on its left and on its right. Whenever a per-index answer needs 'the maximum (or minimum, or sum) of everything before me and everything after me', think prefix and suffix arrays first, then try to fold them into two running variables with two pointers. Daily Temperatures (739) and Largest Rectangle (84) are the monotonic stack cousins.",
    "Why the two-pointer version is correct: at any moment left_max is the maximum of height[0..left] and right_max the maximum of height[right..n-1]. When height[left] < height[right], the true right wall for position left is the maximum of everything to its right, which includes height[right], so it is at least height[right] > height[left]. Then min(left wall, right wall) for position left equals left_max if left_max <= right wall, and since left_max cannot exceed the true left wall and the right wall is bigger than height[left], the water at left is exactly left_max - height[left]. The mirror argument covers the other branch. Each index is settled once.",
    "Traps and constraint changes: start left_max and right_max at 0, not at the first heights, or an input with one or two bars breaks; the loop with left < right already handles short inputs by adding nothing. Negative heights are not allowed. If bars have different widths, multiply each depth by its width. The 2-D version (407) needs a min-heap starting from the border cells, because the wall of a cell is the lowest wall on any path to the edge. The stack version is the one to use if you also need to report the pools, since each pop corresponds to one horizontal layer of water."
  ],
  iq: [
    { q: "Solve it with a monotonic stack.", a: "Keep a stack of indexes whose heights decrease from bottom to top. When a new bar is taller than the top, pop the top as the bottom of a pool: the new bar is its right wall, the new stack top is its left wall, the width is the gap between the walls and the depth is the shorter wall minus the bottom. Add width times depth and keep popping. Each index is pushed and popped once, so O(n) time and O(n) space.", c: `
def trap_stack(height):
    stack = []          # indexes of bars, heights decreasing from bottom to top
    total = 0
    for i, h in enumerate(height):
        while stack and height[stack[-1]] < h:
            bottom = stack.pop()
            if not stack:
                break
            left = stack[-1]
            width = i - left - 1
            depth = min(height[left], h) - height[bottom]
            total += width * depth
        stack.append(i)
    return total

print(trap_stack([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]))   # 6
print(trap_stack([4, 2, 0, 3, 2, 5]))                     # 9
` },
    { q: "How would you solve the 2-D version, a grid of heights (407)?", a: "Water can escape in any direction, so a cell's wall is the lowest maximum along any path to the border. Push all border cells into a min-heap, keep the highest wall seen so far while popping the lowest cell, and for each unvisited neighbour add max(0, wall - its height) and push it with height max(wall, its height). It is Dijkstra-like, O(mn log(mn))." },
    { q: "Bars have different widths. What changes?", a: "The depth of water above a bar is unchanged, it is still min(left wall, right wall) minus the bar height. Only the volume changes: multiply the depth by the width of that bar. Both the two-pointer and the prefix versions need one extra multiplication.", c: `
def trap_with_widths(height, width):
    left, right = 0, len(height) - 1
    left_max = right_max = 0
    total = 0
    while left < right:
        if height[left] < height[right]:
            left_max = max(left_max, height[left])
            total += (left_max - height[left]) * width[left]
            left += 1
        else:
            right_max = max(right_max, height[right])
            total += (right_max - height[right]) * width[right]
            right -= 1
    return total

print(trap_with_widths([3, 0, 2], [1, 4, 1]))   # 8
` },
    { q: "Why is the two-pointer version allowed to ignore the exact right maximum when it processes the left side?", a: "Because it only processes the left side when height[left] < height[right]. The real right wall for that position is at least height[right], so it is taller than the left wall, which means the left wall is the one that limits the water. The exact value of the right wall does not matter once we know it is the taller one. That is the key sentence to say in the interview." }
  ],
  tips: [
    "Explain the per-bar formula first with a drawing: water above bar i = min(tallest to the left, tallest to the right) - height[i]. Everything else is just computing those maximums faster.",
    "Give the O(n) time O(n) space prefix version before the two-pointer version. It is easier to prove and most interviewers accept it; then improve space when asked.",
    "Python trick: in the prefix version use itertools.accumulate(height, max) for left_max and the same on reversed(height) for right_max; it keeps the code to a few lines.",
    "Test out loud: [] -> 0, [2] -> 0, [1, 2, 3] -> 0, [3, 0, 3] -> 3, [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] -> 6, [4, 2, 0, 3, 2, 5] -> 9."
  ]
});

EXTRA(22, "121. Best Time to Buy and Sell Stock", {
  deep: [
    "How to recognise it: 'buy before you sell', 'one transaction', 'largest difference where the smaller value comes first'. The order constraint is what separates it from max(prices) - min(prices). Whenever a per-index answer depends on the best value among earlier indexes only, a running minimum or maximum in one pass is the tool.",
    "Why it is correct: for any sell day j, the best buy day is the cheapest day before j. The loop keeps exactly that cheapest price, so when it reaches day j it evaluates the best trade that sells on j. Taking the maximum over all j covers every possible trade. The elif is safe because a day that sets a new minimum cannot also be a profitable sell day against itself. Seen through Kadane: profit is a sum of consecutive daily differences, and the maximum subarray of differences is the maximum single trade.",
    "Traps and constraint changes: initialise lowest to the first price or to infinity, never to 0, or negative prices and all-falling inputs break. Return 0, not negative, when prices only fall. Problem 122 allows unlimited trades: sum every positive daily difference. Problem 123 allows two trades and 188 allows k trades: keep a small state machine (holding or not, after how many sales). With a cooldown (309) or a fee (714) the same state machine gets one more rule. For a streaming price feed the one-pass version works as is, because it only needs the running minimum."
  ],
  iq: [
    { q: "Show the connection with Kadane's maximum subarray.", a: "Take the daily differences d[i] = prices[i] - prices[i-1]. The profit of buying on day a and selling on day b is the sum d[a+1] + ... + d[b], so the best trade is the maximum subarray sum of d, with 0 allowed for no trade. Kadane keeps the best sum ending at the current day and resets to 0 when it would go negative.", c: `
def max_profit_kadane(prices):
    best = current = 0
    for i in range(1, len(prices)):
        current = max(0, current + prices[i] - prices[i - 1])
        best = max(best, current)
    return best

print(max_profit_kadane([7, 1, 5, 3, 6, 4]))   # 5
` },
    { q: "Follow-up 122: you may buy and sell as many times as you like.", a: "Every day the price goes up, you want to have bought the day before and sell today. So the answer is the sum of all positive daily differences. This is a greedy argument: any longer upward trade is the sum of its daily rises, and a day that falls should never be inside a trade.", c: `
def max_profit_many(prices):
    return sum(max(0, prices[i] - prices[i - 1]) for i in range(1, len(prices)))

print(max_profit_many([7, 1, 5, 3, 6, 4]))   # 7
` },
    { q: "Follow-up 123: at most two transactions.", a: "Keep four running values: the best cash after the first buy, after the first sell, after the second buy and after the second sell. Each day update them in that order. buy1 is the best of minus the price, sell1 is buy1 plus price, buy2 is sell1 minus price, sell2 is buy2 plus price. It is O(n) time and O(1) space, and it generalises to k trades with 2k variables.", c: `
def max_profit_two(prices):
    buy1 = buy2 = float("-inf")
    sell1 = sell2 = 0
    for p in prices:
        buy1 = max(buy1, -p)
        sell1 = max(sell1, buy1 + p)
        buy2 = max(buy2, sell1 - p)
        sell2 = max(sell2, buy2 + p)
    return sell2

print(max_profit_two([3, 3, 5, 0, 0, 3, 1, 4]))   # 6
` },
    { q: "Why not simply take max(prices) - min(prices)?", a: "Because the maximum might come before the minimum, and you cannot sell before you buy. In [7, 1, 5, 3, 6, 4] it happens to work, but in [5, 4, 3, 2, 1] it gives 4 while the correct answer is 0. The one-pass solution respects the order by only using the minimum of earlier days." }
  ],
  tips: [
    "Say the key sentence early: 'For each day, the best sale is today's price minus the cheapest earlier price, so I track the running minimum.' Then write the loop.",
    "Ask whether prices can be empty or have one element, and confirm that no profit means 0 and not a negative number.",
    "Python trick: start lowest at float('inf') so the first day sets it naturally; it avoids a special case for the first element.",
    "Test out loud: [7, 1, 5, 3, 6, 4] -> 5, [7, 6, 4, 3, 1] -> 0, [1] -> 0, [2, 4, 1] -> 2, [1, 2] -> 1."
  ]
});

EXTRA(22, "3. Longest Substring Without Repeating Characters", {
  deep: [
    "How to recognise it: 'longest substring' or 'longest subarray' plus a condition that stays true when you remove elements from the ends (no repeats, at most k distinct, sum at most s). Such conditions are monotonic, which is what makes the two-pointer window valid: if a window breaks the rule, every bigger window containing it breaks it too, so shrinking from the left is always the right move.",
    "Why it is correct: when the character at right was last seen at index p with p >= left, the window [left, right] would contain a repeat, and so would every window that starts at or before p. The smallest start that removes the repeat is p + 1, so left jumps there directly. If p < left, the earlier copy is already outside and nothing changes. Because left never moves backwards and right moves once per step, the invariant 'no repeats in s[left..right]' holds after each step, and best records the largest valid window seen.",
    "Traps and constraint changes: forgetting the last[ch] >= left check makes left jump backwards, for example on 'abba' at the final a, and produces a wrong answer of 3 instead of 2. The slower but common version shrinks left one step at a time while removing characters from a set; that is also O(n) because each character leaves the set at most once. For a fixed small alphabet an array of 128 or 256 last indexes is faster than a dictionary. For 'at most k distinct characters' (340) replace the last-seen dictionary with a count dictionary and shrink while its size exceeds k."
  ],
  iq: [
    { q: "Why do you need the condition last[ch] >= left and not just ch in last?", a: "The dictionary keeps indexes of characters that may have already left the window. Without the check, for 'abba' at the last a the stored index 0 would set left to 1, which is smaller than the current left of 2, and the window would wrongly include the two b's. The check keeps left monotonic, which is also what the O(n) argument needs." },
    { q: "Follow-up 340: longest substring with at most k distinct characters.", a: "Keep a dictionary of character counts for the window. Add the right character, and while the dictionary has more than k keys remove the left character, deleting a key when its count reaches zero. Each character enters and leaves once, so it is O(n) time and O(k) space.", c: `
def longest_k_distinct(s, k):
    count = {}
    left = best = 0
    for right, ch in enumerate(s):
        count[ch] = count.get(ch, 0) + 1
        while len(count) > k:
            count[s[left]] -= 1
            if count[s[left]] == 0:
                del count[s[left]]
            left += 1
        best = max(best, right - left + 1)
    return best

print(longest_k_distinct("eceba", 2))   # 3
` },
    { q: "Return the substring itself, not just its length.", a: "Record the start index together with the best length whenever the window grows past the best. At the end slice the string once. Do not build substrings inside the loop, because that would cost O(n) per step.", c: `
def longest_unique_substring(s):
    last = {}
    left = 0
    best_start = best_len = 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1
        last[ch] = right
        if right - left + 1 > best_len:
            best_start, best_len = left, right - left + 1
    return s[best_start:best_start + best_len]

print(longest_unique_substring("pwwkew"))   # wke
` },
    { q: "What is the space complexity exactly, and how would you reduce it?", a: "The dictionary holds at most one entry per distinct character, so O(min(n, alphabet)). For ASCII input that is at most 128 entries, which is O(1). You can replace the dictionary by a list of 128 integers initialised to -1 for a small speed gain. For full Unicode the dictionary is the right choice." }
  ],
  tips: [
    "Open with the window invariant: 'I keep a window with no repeated characters and expand it to the right; when a repeat appears I move the left edge just past the earlier copy.'",
    "Mention the slow-shrink version (set, move left one by one) and the jump version (last-seen index), and explain that both are O(n).",
    "Python trick: enumerate(s) gives index and character together; a dictionary keyed by character with the last index is all the state you need.",
    "Test out loud: '' -> 0, 'a' -> 1, 'bbbbb' -> 1, 'abcabcbb' -> 3, 'pwwkew' -> 3, 'abba' -> 2 (the case that catches the missing >= left check)."
  ]
});

EXTRA(22, "76. Minimum Window Substring", {
  deep: [
    "How to recognise it: 'shortest substring that contains', 'minimum window', 'covers all characters of'. The condition 'covers t' is monotonic in the other direction from problem 3: if a window covers t, every bigger window also covers t. So the shape is grow right until valid, then shrink left while still valid, recording the best at each valid moment.",
    "Why it is correct: need[c] starts at the count of c in t and is decreased for every c that enters the window, so need[c] > 0 means the window still lacks copies of c, and need[c] <= 0 means it has enough or extra. missing is the sum of the positive parts of need, maintained in O(1) per step: it drops when an entering character had need > 0 and rises when a leaving character makes need > 0 again. So missing == 0 exactly when the window covers t. For every right, the inner loop finds the largest left that keeps the window valid, which gives the shortest valid window ending at right, and the best over all right is the answer.",
    "Traps and constraint changes: decrease need[ch] for every character, even ones not in t, or the leaving logic breaks; a Counter returns 0 for unknown keys so this is safe in Python. Record the window before shrinking, inside the while loop, not after. Characters are case sensitive unless told otherwise. If t can contain Unicode or any character, the Counter handles it; with a fixed alphabet an array of 128 integers is faster. For a fixed-size window such as Permutation in String (567) the window length is constant and you only compare counts."
  ],
  iq: [
    { q: "There is a while loop inside the for loop. Why is the total still O(n)?", a: "left only moves to the right and never past right, so over the whole run it moves at most n times. The for loop moves right n times. Every step of either pointer does O(1) work with the Counter and the missing integer. So the total is O(n + m), where m is the time to count t." },
    { q: "Why keep a missing counter instead of comparing the two dictionaries each step?", a: "Comparing two Counters costs time proportional to the number of distinct characters, up to the alphabet size, and would be done on every step, giving O(n * alphabet). The missing integer answers 'is the window valid' in O(1) because it is updated incrementally only when a character crosses the zero boundary of its need count." },
    { q: "Follow-up 567: does s2 contain a permutation of s1?", a: "This is a fixed-size window of length len(s1). Keep a Counter of the current window; move it one step at a time, adding the new character and removing the old one, and compare with the Counter of s1. The comparison is O(alphabet), which is fine for 26 letters, or you can keep a matched count for O(1) per step.", c: `
from collections import Counter

def check_inclusion(s1, s2):
    k = len(s1)
    if k > len(s2):
        return False
    need = Counter(s1)
    window = Counter(s2[:k])
    if window == need:
        return True
    for i in range(k, len(s2)):
        window[s2[i]] += 1
        out = s2[i - k]
        window[out] -= 1
        if window[out] == 0:
            del window[out]
        if window == need:
            return True
    return False

print(check_inclusion("ab", "eidbaooo"))   # True
print(check_inclusion("ab", "eidboaoo"))   # False
` },
    { q: "How would you return all minimum windows, or handle s arriving as a stream?", a: "For all windows of the minimum length, do a second pass with the known best length, or collect candidates with their lengths during the single pass and filter at the end. For a stream you can still run the algorithm, because it only needs the characters between left and right; keep them in a deque so left can drop from the front, and memory is bounded by the longest valid window." }
  ],
  tips: [
    "State the shape before coding: 'expand right until the window covers t, then shrink left while it still covers t, and record the best every time it is valid.'",
    "Say what need and missing mean in one sentence each, because the interviewer must be able to follow the bookkeeping.",
    "Python trick: Counter(t) returns 0 for absent keys, so need[ch] -= 1 works for every character of s with no key check; a plain dict would need .get.",
    "Test out loud: ('ADOBECODEBANC', 'ABC') -> 'BANC', ('a', 'a') -> 'a', ('a', 'aa') -> '', ('ab', 'b') -> 'b', ('aa', 'aa') -> 'aa'."
  ]
});

EXTRA(22, "155. Min Stack", {
  deep: [
    "How to recognise it: 'design a data structure', 'constant time for every operation', 'get the minimum (or maximum) of what is currently stored'. The trick in all such problems is to store extra information together with each element so that the answer for the current state is already computed when it is needed. Stacks make this easy because the state only changes at the top.",
    "Why it is correct: the minimum of a stack with elements x1..xk is min(x1..xk). If we store m_i = min(x1..x_i) with every element, then after a pop the new top still carries the correct minimum of everything below it, because the elements below did not change. Pushing computes the new minimum from the old top in O(1). So getMin is a single read. In the two-stack variant, the min stack holds the sequence of running minimums without repeats; the current minimum is its top and it is popped only when the main stack pops a value equal to it, which is why pushing on <= and not < is required.",
    "Traps and constraint changes: with two stacks, using < instead of <= on push breaks when the same minimum is pushed twice and popped once. If memory per element matters, store the difference between the value and the current minimum (negative means new minimum); it is O(1) extra space but needs arbitrary-size integers, which Python has. A Max Stack with popMax (716) is different: removing the maximum from the middle needs a sorted structure or a doubly linked list with a heap, O(log n). A Min Queue is built from two min stacks, one for the input side and one for the output side."
  ],
  iq: [
    { q: "Can you reduce the memory, since storing a pair for every element doubles the space?", a: "Keep a second stack that only stores values which are a new minimum or equal to the current minimum. Most pushes then touch only the main stack. On pop, if the popped value equals the top of the min stack, pop it there too. In the worst case, a falling sequence, both stacks are full, so the asymptotic space is still O(n).", c: `
class MinStackTwo:
    def __init__(self):
        self.items = []
        self.mins = []                   # only values that were a new (or equal) minimum
    def push(self, val):
        self.items.append(val)
        if not self.mins or val <= self.mins[-1]:
            self.mins.append(val)
    def pop(self):
        val = self.items.pop()
        if val == self.mins[-1]:
            self.mins.pop()
    def top(self):
        return self.items[-1]
    def getMin(self):
        return self.mins[-1]

st = MinStackTwo()
for v in [5, 3, 7, 3, 8]:
    st.push(v)
print(st.getMin())   # 3
st.pop()
st.pop()             # removed 8 and 3
print(st.getMin())   # 3
st.pop()
st.pop()             # removed 7 and 3
print(st.getMin())   # 5
` },
    { q: "Why must the second stack push on val <= current minimum and not only on val < current minimum?", a: "Suppose the minimum 3 is pushed twice and only pushed once to the min stack. Popping one 3 from the main stack would also pop it from the min stack, and getMin would report a wrong, larger value even though another 3 is still inside. Pushing on equal values keeps one entry per copy of the minimum." },
    { q: "How would you build a queue that returns its minimum in O(1)?", a: "Use two min stacks. Enqueue pushes onto the input stack. Dequeue pops from the output stack, and when the output stack is empty it moves every element from the input stack over, which reverses the order. The minimum of the queue is the smaller of the two stack minimums. Each element is moved once, so all operations are amortised O(1)." },
    { q: "How does Max Stack with popMax (716) differ, and what complexity can you reach?", a: "popMax removes the maximum even if it is deep inside the stack, so storing a running maximum is not enough. A doubly linked list for the stack order plus a heap or sorted container of nodes gives O(log n) for popMax with lazy deletion, and O(1) or O(log n) for the others. In Python a heap with a set of removed ids is the usual approach." }
  ],
  tips: [
    "Say the idea before writing the class: 'Each element remembers the minimum at the time it was pushed, so the top always knows the current minimum.' Then the code is ten lines.",
    "Clarify whether pop and top can be called on an empty stack; LeetCode promises they are not, which lets you skip error handling and say so.",
    "Python trick: a tuple (value, min_so_far) in one list is simpler than two parallel lists, and self.items[-1][1] reads the minimum in O(1).",
    "Test out loud: push -2, 0, -3 -> getMin -3; pop -> top 0, getMin -2; push 1, 1 then pop once -> getMin still 1 if the minimum is 1 (the equal-minimum case)."
  ]
});

EXTRA(22, "739. Daily Temperatures", {
  deep: [
    "How to recognise it: 'for each element, the next element that is greater (or smaller)', 'how many days until', 'nearest larger to the right'. These are next greater element questions and the monotonic stack is their standard O(n) tool. The direction of the comparison decides whether the stack is decreasing (next greater) or increasing (next smaller), and whether you scan left to right or right to left decides which side you are answering for.",
    "Why it is correct: an index stays on the stack only while no later day has been warmer. When day i arrives, any index on top with a lower temperature has found its first warmer day, because all days between it and i were cooler than it (otherwise it would already have been popped). Popping in order from the top handles the most recent waiting days first, and the stack stays decreasing, so the pops stop at the first index that is at least as warm. Every index is pushed once and popped at most once, which gives the O(n) bound even though there is a nested while loop.",
    "Traps and constraint changes: use strict less-than in the pop condition because an equal temperature is not warmer; for next greater or equal use <=. If the question asks for the value rather than the distance, store the value when popping. For a circular array (503) loop over 2n indexes with i % n and push only in the first pass. For a stream where elements arrive one at a time (Online Stock Span, 901) the same stack works, you just do one step per arrival. Memory can be reduced to the answer array alone by scanning from the right and jumping with the answers already computed."
  ],
  iq: [
    { q: "Follow-up 503: next greater element in a circular array.", a: "Walk the indexes twice, from 0 to 2n - 1, and use i % n to read the value. Pop and answer as usual during both passes, but push only during the first pass, so the second pass can only resolve waiting indexes. Elements with no greater element anywhere keep the default -1. Still O(n) time and space.", c: `
def next_greater_circular(nums):
    n = len(nums)
    answer = [-1] * n
    stack = []
    for i in range(2 * n):
        while stack and nums[stack[-1]] < nums[i % n]:
            answer[stack.pop()] = nums[i % n]
        if i < n:
            stack.append(i)
    return answer

print(next_greater_circular([1, 2, 1]))   # [2, -1, 2]
` },
    { q: "There is a while loop inside the for loop. Why is it O(n) and not O(n^2)?", a: "Count the stack operations instead of the loop iterations. Each index is pushed exactly once, and it can be popped at most once because after a pop it is gone. The while loop runs once per pop plus one failed check per outer step, so the total number of inner iterations is at most 2n. This is the standard amortised argument for every monotonic stack." },
    { q: "Can you do it with O(1) extra space apart from the answer array?", a: "Yes, scan from right to left. For day i, start at j = i + 1; while temps[j] is not warmer, jump j forward by answer[j], because every day between j and j + answer[j] is at most temps[j], which is not warmer either. If answer[j] is 0 there is no warmer day after j, so none after i. Each jump skips a block, and the total is O(n) because each jump lands on a strictly warmer day than the last one.", c: `
def daily_temperatures_jump(temps):
    n = len(temps)
    answer = [0] * n
    for i in range(n - 2, -1, -1):
        j = i + 1
        while j < n and temps[j] <= temps[i]:
            if answer[j] == 0:
                j = n                  # no warmer day after j, so none after i
            else:
                j += answer[j]         # jump to the warmer day of j
        if j < n:
            answer[i] = j - i
    return answer

print(daily_temperatures_jump([73, 74, 75, 71, 69, 72, 76, 73]))   # [1, 1, 4, 2, 1, 1, 0, 0]
` },
    { q: "How does this change when the data arrives as a stream (Online Stock Span, 901)?", a: "The stack works one element at a time. For stock span you need the number of consecutive previous days with a price less than or equal to today, which is the distance to the previous greater element. Keep a stack of (price, span) pairs; pop while the top price is <= today and add its span to today's span, then push today. Each call is amortised O(1)." }
  ],
  tips: [
    "Say the pattern name: 'This is next greater element, so I will keep a decreasing monotonic stack of indexes.' Naming it earns credit before any code.",
    "Explain the stack as 'days still waiting for a warmer day' and walk the sample input on paper for three or four steps; it makes the pop condition obvious.",
    "Python trick: store indexes, not temperatures, on the stack. The index gives you both the distance (i - j) and the temperature (temps[j]).",
    "Test out loud: [30, 40, 50, 60] -> [1, 1, 1, 0], [30, 60, 90] -> [1, 1, 0], [90, 60, 30] -> [0, 0, 0], [70, 70, 75] -> [2, 1, 0], [50] -> [0]."
  ]
});
