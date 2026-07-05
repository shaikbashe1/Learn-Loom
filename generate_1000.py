import json
import random

topics = ["Arrays", "Strings", "Linked List", "Trees", "Graphs", "Dynamic Programming", "Math", "Sorting", "Greedy", "Backtracking", "Hash Table", "Two Pointers"]
companies = ["Google", "Amazon", "Facebook", "Microsoft", "Apple", "Netflix", "Uber", "Airbnb"]
actions = ["Find the", "Calculate the", "Determine the", "Count the", "Verify if the", "Reverse the", "Merge the", "Sort the", "Optimize the"]
objects = ["maximum subarray", "longest substring", "shortest path", "number of nodes", "missing element", "duplicate elements", "k-th smallest item", "overlapping intervals", "valid combinations"]
constraints_list = [
    ["1 <= n <= 10^5", "Elements are positive integers", "0 <= arr[i] <= 10^9"],
    ["0 <= k <= 10^4", "String contains only lowercase English letters", "Length of s <= 10^5"],
    ["Tree depth is at most 1000", "Node values fit in 32-bit integer", "The number of nodes is in the range [0, 2000]"],
    ["Graph is connected and undirected", "Weights are non-negative", "1 <= V <= 10^4", "0 <= E <= 10^5"]
]

examples_templates = [
    {
        "input": "nums = [1, 2, 3, 4, 5], k = 3",
        "output": "[3, 4, 5]",
        "explanation": "The requirement focuses on the subset of size 3 which gives the optimal result."
    },
    {
        "input": "s = \"abcabcbb\"",
        "output": "3",
        "explanation": "The answer is \"abc\", with the length of 3."
    },
    {
        "input": "matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3",
        "output": "true",
        "explanation": "The target 3 exists in the first row."
    },
    {
        "input": "arr = [4, 2, 9, 7, 5, 1], k = 1",
        "output": "1",
        "explanation": "The 1st smallest element is clearly 1."
    }
]

problems = []

for i in range(1, 1001):
    topic = random.choice(topics)
    difficulty = random.choice(["Easy", "Medium", "Hard"])
    action = random.choice(actions)
    obj = random.choice(objects)
    
    title = f"{action.split()[0]} {obj.title()} {i}"
    slug = f"generated-problem-{i}-{random.randint(1000, 9999)}"
    
    # Generate robust description with examples
    ex1 = random.choice(examples_templates)
    ex2 = random.choice(examples_templates)
    while ex1 == ex2:
         ex2 = random.choice(examples_templates)
         
    description = f"""Given a data structure representing {topic.lower()}, your task is to {action.lower()} {obj}.

You must design a robust algorithm that efficiently processes the input. Ensure your solution handles edge cases such as empty inputs or extremely large data limits.

### Example 1:
**Input:** `{ex1['input']}`
**Output:** `{ex1['output']}`
**Explanation:** {ex1['explanation']}

### Example 2:
**Input:** `{ex2['input']}`
**Output:** `{ex2['output']}`
**Explanation:** {ex2['explanation']}
"""
    
    comp_tags = random.sample(companies, random.randint(1, 3))
    
    problems.append({
        "title": title,
        "slug": slug,
        "difficulty": difficulty,
        "topic": topic,
        "description": description,
        "company_tags": comp_tags,
        "hints": [f"Think about using a {topic} approach.", "Can you optimize the space complexity?", "Watch out for edge cases in the constraints."],
        "starter_code": { "python": f"class Solution:\n    def solve(self, data):\n        # Write your code here\n        pass\n" },
        "constraints": random.choice(constraints_list),
        "time_limit_ms": random.choice([1000, 2000, 3000]),
        "memory_limit_mb": random.choice([128, 256, 512])
    })

with open("C:/Users/dell/Learn-Loom/public/data/problems.json", "w", encoding="utf-8") as f:
    json.dump(problems, f, indent=2)

print("Generated 1000 problems with detailed descriptions successfully!")
