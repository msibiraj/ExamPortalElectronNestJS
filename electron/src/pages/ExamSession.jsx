import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { io } from 'socket.io-client';
import ConfluenceEditor from '../components/ConfluenceEditor';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const WS_URL = `${API.replace(/\/$/, '')}/monitor`;

// ── Language config ──────────────────────────────────────────────────────────
const LANGUAGES = [
  { id: 'python',     label: 'Python 3',    monacoId: 'python'     },
  { id: 'javascript', label: 'JavaScript',  monacoId: 'javascript' },
  { id: 'typescript', label: 'TypeScript',  monacoId: 'typescript' },
  { id: 'java',       label: 'Java',        monacoId: 'java'       },
  { id: 'cpp',        label: 'C++17',       monacoId: 'cpp'        },
  { id: 'go',         label: 'Go',          monacoId: 'go'         },
];

const DEFAULT_CODE = {
  python:     `def solution():\n    # Your code here\n    pass\n`,
  javascript: `function solution() {\n    // Your code here\n}\n`,
  typescript: `function solution(): void {\n    // Your code here\n}\n`,
  java:       `    public static void solution() {\n        // Your code here\n    }`,
  cpp:        `void solution() {\n    // Your code here\n}\n`,
  go:         `func solution() {\n    // Your code here\n}\n`,
};

// ── Mock exam data (replace with real API when exam service is ready) ─────────
function buildMockExam(examId) {
  return {
    id: examId,
    title: 'Programming Assessment — Mock Exam',
    durationMinutes: 90,
    questions: [
      {
        id: 'q1',
        index: 0,
        title: 'Two Sum',
        difficulty: 'Easy',
        points: 10,
        description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
        examples: [
          {
            input: 'nums = [2,7,11,15], target = 9',
            output: '[0,1]',
            explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
          },
          {
            input: 'nums = [3,2,4], target = 6',
            output: '[1,2]',
            explanation: '',
          },
          {
            input: 'nums = [3,3], target = 6',
            output: '[0,1]',
            explanation: '',
          },
        ],
        constraints: [
          '2 ≤ nums.length ≤ 10⁴',
          '-10⁹ ≤ nums[i] ≤ 10⁹',
          '-10⁹ ≤ target ≤ 10⁹',
          'Only one valid answer exists.',
        ],
        testCases: [
          { input: '2 7 11 15\n9', expectedOutput: '0 1', hidden: false },
          { input: '3 2 4\n6',     expectedOutput: '1 2', hidden: false },
          { input: '3 3\n6',       expectedOutput: '0 1', hidden: true  },
        ],
        wrapper: {
          python: {
            prefix: `import sys\ndata = sys.stdin.read().split()\nn = len(data) - 1\nnums = list(map(int, data[:n]))\ntarget = int(data[n])\n\n`,
            suffix: `\n\nresult = two_sum(nums, target)\nprint(*result)`,
          },
          javascript: {
            prefix: `const lines = require('fs').readFileSync('/dev/stdin','utf-8').trim().split('\\n');\nconst nums = lines[0].split(' ').map(Number);\nconst target = Number(lines[1]);\n\n`,
            suffix: `\n\nconst result = twoSum(nums, target);\nconsole.log(result.join(' '));`,
          },
          typescript: {
            prefix: `import * as fs from 'fs';\nconst lines = fs.readFileSync('/dev/stdin','utf-8').trim().split('\\n');\nconst nums = lines[0].split(' ').map(Number);\nconst target = Number(lines[1]);\n\n`,
            suffix: `\n\nconst result = twoSum(nums, target);\nconsole.log(result.join(' '));`,
          },
          java: {
            prefix: `import java.util.*;\npublic class Main {\n`,
            suffix: `\n    public static void main(String[] args) throws Exception {\n        Scanner sc = new Scanner(System.in);\n        String[] parts = sc.nextLine().trim().split(" ");\n        int[] nums = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n        int target = sc.nextInt();\n        int[] res = twoSum(nums, target);\n        System.out.println(res[0] + " " + res[1]);\n    }\n}`,
          },
          cpp: {
            prefix: `#include <bits/stdc++.h>\nusing namespace std;\n\n`,
            suffix: `\n\nint main() {\n    int x; vector<int> nums;\n    string line; getline(cin, line);\n    istringstream iss(line);\n    while (iss >> x) nums.push_back(x);\n    int target; cin >> target;\n    auto res = twoSum(nums, target);\n    cout << res[0] << " " << res[1] << endl;\n    return 0;\n}`,
          },
          go: {
            prefix: `package main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n    "strconv"\n    "strings"\n)\n\n`,
            suffix: `\n\nfunc main() {\n    reader := bufio.NewReader(os.Stdin)\n    line, _ := reader.ReadString('\\n')\n    parts := strings.Fields(strings.TrimSpace(line))\n    nums := make([]int, len(parts))\n    for i, p := range parts { nums[i], _ = strconv.Atoi(p) }\n    var target int\n    fmt.Fscan(reader, &target)\n    res := twoSum(nums, target)\n    fmt.Println(res[0], res[1])\n}`,
          },
        },
        starterCode: {
          python:     `def two_sum(nums: list, target: int) -> list:\n    # Your code here\n    pass`,
          javascript: `function twoSum(nums, target) {\n    // Your code here\n}`,
          typescript: `function twoSum(nums: number[], target: number): number[] {\n    // Your code here\n    return [];\n}`,
          java:       `    public static int[] twoSum(int[] nums, int target) {\n        // Your code here\n        return new int[]{};\n    }`,
          cpp:        `vector<int> twoSum(vector<int>& nums, int target) {\n    // Your code here\n    return {};\n}`,
          go:         `func twoSum(nums []int, target int) []int {\n    // Your code here\n    return []int{}\n}`,
        },
      },
      {
        id: 'q2',
        index: 1,
        title: 'Reverse String',
        difficulty: 'Easy',
        points: 5,
        description: `Write a function that reverses a string.

The input string is given as an array of characters \`s\`.

You must do this by modifying the input array **in-place** with O(1) extra memory.`,
        examples: [
          { input: 's = ["h","e","l","l","o"]', output: '["o","l","l","e","h"]', explanation: '' },
          { input: 's = ["H","a","n","n","a","h"]', output: '["h","a","n","n","a","H"]', explanation: '' },
        ],
        constraints: [
          '1 ≤ s.length ≤ 10⁵',
          's[i] is a printable ASCII character.',
        ],
        testCases: [
          { input: 'hello',  expectedOutput: 'olleh',  hidden: false },
          { input: 'Hannah', expectedOutput: 'hannaH', hidden: false },
          { input: 'abcde',  expectedOutput: 'edcba',  hidden: true  },
        ],
        wrapper: {
          python: {
            prefix: `s = input().strip()\n\n`,
            suffix: `\n\nprint(reverse_string(s))`,
          },
          javascript: {
            prefix: `const s = require('fs').readFileSync('/dev/stdin','utf-8').trim();\n\n`,
            suffix: `\n\nconsole.log(reverseString(s));`,
          },
          typescript: {
            prefix: `import * as fs from 'fs';\nconst s = fs.readFileSync('/dev/stdin','utf-8').trim();\n\n`,
            suffix: `\n\nconsole.log(reverseString(s));`,
          },
          java: {
            prefix: `import java.util.*;\npublic class Main {\n`,
            suffix: `\n    public static void main(String[] args) {\n        String s = new Scanner(System.in).nextLine().trim();\n        System.out.println(reverseString(s));\n    }\n}`,
          },
          cpp: {
            prefix: `#include <bits/stdc++.h>\nusing namespace std;\n\n`,
            suffix: `\n\nint main() {\n    string s; getline(cin, s);\n    cout << reverseString(s) << endl;\n}`,
          },
          go: {
            prefix: `package main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n    "strings"\n)\n\n`,
            suffix: `\n\nfunc main() {\n    r := bufio.NewReader(os.Stdin)\n    s, _ := r.ReadString('\\n')\n    s = strings.TrimSpace(s)\n    fmt.Println(reverseString(s))\n}`,
          },
        },
        starterCode: {
          python:     `def reverse_string(s: str) -> str:\n    # Your code here\n    pass`,
          javascript: `function reverseString(s) {\n    // Your code here\n    return '';\n}`,
          typescript: `function reverseString(s: string): string {\n    // Your code here\n    return '';\n}`,
          java:       `    public static String reverseString(String s) {\n        // Your code here\n        return "";\n    }`,
          cpp:        `string reverseString(string s) {\n    // Your code here\n    return "";\n}`,
          go:         `func reverseString(s string) string {\n    // Your code here\n    return ""\n}`,
        },
      },
      {
        id: 'q3',
        index: 2,
        title: 'FizzBuzz',
        difficulty: 'Easy',
        points: 5,
        description: `Given an integer \`n\`, return a string array \`answer\` (1-indexed) where:

- \`answer[i] == "FizzBuzz"\` if \`i\` is divisible by 3 and 5.
- \`answer[i] == "Fizz"\` if \`i\` is divisible by 3.
- \`answer[i] == "Buzz"\` if \`i\` is divisible by 5.
- \`answer[i] == i\` (as a string) if none of the above conditions are true.`,
        examples: [
          { input: 'n = 3',  output: '["1","2","Fizz"]', explanation: '' },
          { input: 'n = 5',  output: '["1","2","Fizz","4","Buzz"]', explanation: '' },
          { input: 'n = 15', output: '["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]', explanation: '' },
        ],
        constraints: ['1 ≤ n ≤ 10⁴'],
        testCases: [
          { input: '5',  expectedOutput: '1\n2\nFizz\n4\nBuzz',          hidden: false },
          { input: '15', expectedOutput: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz', hidden: false },
          { input: '1',  expectedOutput: '1',                            hidden: true  },
        ],
        wrapper: {
          python: {
            prefix: `n = int(input())\n\n`,
            suffix: `\n\nfor line in fizz_buzz(n):\n    print(line)`,
          },
          javascript: {
            prefix: `const n = parseInt(require('fs').readFileSync('/dev/stdin','utf-8').trim());\n\n`,
            suffix: `\n\nconsole.log(fizzBuzz(n).join('\\n'));`,
          },
          typescript: {
            prefix: `import * as fs from 'fs';\nconst n = parseInt(fs.readFileSync('/dev/stdin','utf-8').trim());\n\n`,
            suffix: `\n\nconsole.log(fizzBuzz(n).join('\\n'));`,
          },
          java: {
            prefix: `import java.util.*;\npublic class Main {\n`,
            suffix: `\n    public static void main(String[] args) {\n        int n = new Scanner(System.in).nextInt();\n        for (String s : fizzBuzz(n)) System.out.println(s);\n    }\n}`,
          },
          cpp: {
            prefix: `#include <bits/stdc++.h>\nusing namespace std;\n\n`,
            suffix: `\n\nint main() {\n    int n; cin >> n;\n    for (auto& s : fizzBuzz(n)) cout << s << "\\n";\n}`,
          },
          go: {
            prefix: `package main\n\nimport "fmt"\n\n`,
            suffix: `\n\nfunc main() {\n    var n int\n    fmt.Scan(&n)\n    for _, s := range fizzBuzz(n) {\n        fmt.Println(s)\n    }\n}`,
          },
        },
        starterCode: {
          python:     `def fizz_buzz(n: int) -> list:\n    result = []\n    # Your code here\n    return result`,
          javascript: `function fizzBuzz(n) {\n    const result = [];\n    // Your code here\n    return result;\n}`,
          typescript: `function fizzBuzz(n: number): string[] {\n    const result: string[] = [];\n    // Your code here\n    return result;\n}`,
          java:       `    public static List<String> fizzBuzz(int n) {\n        List<String> result = new ArrayList<>();\n        // Your code here\n        return result;\n    }`,
          cpp:        `vector<string> fizzBuzz(int n) {\n    vector<string> result;\n    // Your code here\n    return result;\n}`,
          go:         `func fizzBuzz(n int) []string {\n    result := []string{}\n    // Your code here\n    return result\n}`,
        },
      },

      // ── Q4: Palindrome Check ───────────────────────────────────────────
      {
        id: 'q4',
        index: 3,
        title: 'Valid Palindrome',
        difficulty: 'Easy',
        points: 8,
        description: `A phrase is a **palindrome** if, after converting all uppercase letters to lowercase and removing all non-alphanumeric characters, it reads the same forward and backward.

Given a string \`s\`, return \`true\` if it is a palindrome, or \`false\` otherwise.`,
        examples: [
          { input: 's = "A man, a plan, a canal: Panama"', output: 'true',  explanation: '"amanaplanacanalpanama" is a palindrome.' },
          { input: 's = "race a car"',                     output: 'false', explanation: '"raceacar" is not a palindrome.' },
          { input: 's = " "',                              output: 'true',  explanation: 's is an empty string "" after removing non-alphanumeric chars.' },
        ],
        constraints: [
          '1 ≤ s.length ≤ 2 × 10⁵',
          's consists only of printable ASCII characters.',
        ],
        testCases: [
          { input: 'A man, a plan, a canal: Panama', expectedOutput: 'true',  hidden: false },
          { input: 'race a car',                    expectedOutput: 'false', hidden: false },
          { input: 'Was it a car or a cat I saw?',  expectedOutput: 'true',  hidden: true  },
        ],
        wrapper: {
          python: {
            prefix: `s = input()\n\n`,
            suffix: `\n\nprint(str(is_palindrome(s)).lower())`,
          },
          javascript: {
            prefix: `const s = require('fs').readFileSync('/dev/stdin','utf-8').trim();\n\n`,
            suffix: `\n\nconsole.log(String(isPalindrome(s)));`,
          },
          typescript: {
            prefix: `import * as fs from 'fs';\nconst s = fs.readFileSync('/dev/stdin','utf-8').trim();\n\n`,
            suffix: `\n\nconsole.log(String(isPalindrome(s)));`,
          },
          java: {
            prefix: `import java.util.*;\npublic class Main {\n`,
            suffix: `\n    public static void main(String[] args) {\n        String s = new Scanner(System.in).nextLine();\n        System.out.println(isPalindrome(s));\n    }\n}`,
          },
          cpp: {
            prefix: `#include <bits/stdc++.h>\nusing namespace std;\n\n`,
            suffix: `\n\nint main() {\n    string line; getline(cin, line);\n    cout << (isPalindrome(line) ? "true" : "false") << endl;\n}`,
          },
          go: {
            prefix: `package main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n    "strings"\n)\n\n`,
            suffix: `\n\nfunc main() {\n    r := bufio.NewReader(os.Stdin)\n    s, _ := r.ReadString('\\n')\n    s = strings.TrimSpace(s)\n    if isPalindrome(s) {\n        fmt.Println("true")\n    } else {\n        fmt.Println("false")\n    }\n}`,
          },
        },
        starterCode: {
          python:     `def is_palindrome(s: str) -> bool:\n    # Your code here\n    pass`,
          javascript: `function isPalindrome(s) {\n    // Your code here\n    return false;\n}`,
          typescript: `function isPalindrome(s: string): boolean {\n    // Your code here\n    return false;\n}`,
          java:       `    public static boolean isPalindrome(String s) {\n        // Your code here\n        return false;\n    }`,
          cpp:        `bool isPalindrome(string s) {\n    // Your code here\n    return false;\n}`,
          go:         `func isPalindrome(s string) bool {\n    // Your code here\n    return false\n}`,
        },
      },

      // ── Q5: Maximum Subarray ───────────────────────────────────────────
      {
        id: 'q5',
        index: 4,
        title: 'Maximum Subarray',
        difficulty: 'Medium',
        points: 15,
        description: `Given an integer array \`nums\`, find the **subarray** with the largest sum, and return its sum.

A **subarray** is a contiguous non-empty sequence of elements within an array.`,
        examples: [
          { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6',  explanation: 'The subarray [4,-1,2,1] has the largest sum 6.' },
          { input: 'nums = [1]',                      output: '1',  explanation: '' },
          { input: 'nums = [5,4,-1,7,8]',             output: '23', explanation: 'The subarray [5,4,-1,7,8] has the largest sum 23.' },
        ],
        constraints: [
          '1 ≤ nums.length ≤ 10⁵',
          '-10⁴ ≤ nums[i] ≤ 10⁴',
        ],
        testCases: [
          { input: '-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6',  hidden: false },
          { input: '1',                      expectedOutput: '1',  hidden: false },
          { input: '5 4 -1 7 8',             expectedOutput: '23', hidden: false },
          { input: '-1',                     expectedOutput: '-1', hidden: true  },
          { input: '-2 -1',                  expectedOutput: '-1', hidden: true  },
        ],
        wrapper: {
          python: {
            prefix: `nums = list(map(int, input().split()))\n\n`,
            suffix: `\n\nprint(max_sub_array(nums))`,
          },
          javascript: {
            prefix: `const nums = require('fs').readFileSync('/dev/stdin','utf-8').trim().split(' ').map(Number);\n\n`,
            suffix: `\n\nconsole.log(maxSubArray(nums));`,
          },
          typescript: {
            prefix: `import * as fs from 'fs';\nconst nums = fs.readFileSync('/dev/stdin','utf-8').trim().split(' ').map(Number);\n\n`,
            suffix: `\n\nconsole.log(maxSubArray(nums));`,
          },
          java: {
            prefix: `import java.util.*;\npublic class Main {\n`,
            suffix: `\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String[] parts = sc.nextLine().trim().split(" ");\n        int[] nums = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n        System.out.println(maxSubArray(nums));\n    }\n}`,
          },
          cpp: {
            prefix: `#include <bits/stdc++.h>\nusing namespace std;\n\n`,
            suffix: `\n\nint main() {\n    string line; getline(cin, line);\n    istringstream iss(line);\n    vector<int> nums; int x;\n    while (iss >> x) nums.push_back(x);\n    cout << maxSubArray(nums) << endl;\n}`,
          },
          go: {
            prefix: `package main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n    "strconv"\n    "strings"\n)\n\n`,
            suffix: `\n\nfunc main() {\n    r := bufio.NewReader(os.Stdin)\n    line, _ := r.ReadString('\\n')\n    parts := strings.Fields(strings.TrimSpace(line))\n    nums := make([]int, len(parts))\n    for i, p := range parts { nums[i], _ = strconv.Atoi(p) }\n    fmt.Println(maxSubArray(nums))\n}`,
          },
        },
        starterCode: {
          python:     `def max_sub_array(nums: list) -> int:\n    # Your code here\n    pass`,
          javascript: `function maxSubArray(nums) {\n    // Your code here\n    return 0;\n}`,
          typescript: `function maxSubArray(nums: number[]): number {\n    // Your code here\n    return 0;\n}`,
          java:       `    public static int maxSubArray(int[] nums) {\n        // Your code here\n        return 0;\n    }`,
          cpp:        `int maxSubArray(vector<int>& nums) {\n    // Your code here\n    return 0;\n}`,
          go:         `func maxSubArray(nums []int) int {\n    // Your code here\n    return 0\n}`,
        },
      },

      // ── Q6: Valid Parentheses ──────────────────────────────────────────
      {
        id: 'q6',
        index: 5,
        title: 'Valid Parentheses',
        difficulty: 'Easy',
        points: 10,
        description: `Given a string \`s\` containing just the characters \`(\`, \`)\`, \`{\`, \`}\`, \`[\` and \`]\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
        examples: [
          { input: 's = "()"',      output: 'true',  explanation: '' },
          { input: 's = "()[]{}"',  output: 'true',  explanation: '' },
          { input: 's = "(]"',      output: 'false', explanation: '' },
          { input: 's = "([)]"',    output: 'false', explanation: '' },
          { input: 's = "{[]}"',    output: 'true',  explanation: '' },
        ],
        constraints: [
          '1 ≤ s.length ≤ 10⁴',
          's consists of parentheses only: \'()[]{}\' ',
        ],
        testCases: [
          { input: '()',      expectedOutput: 'true',  hidden: false },
          { input: '()[]{}', expectedOutput: 'true',  hidden: false },
          { input: '(]',      expectedOutput: 'false', hidden: false },
          { input: '([)]',    expectedOutput: 'false', hidden: true  },
          { input: '{[]}',    expectedOutput: 'true',  hidden: true  },
        ],
        wrapper: {
          python: {
            prefix: `s = input().strip()\n\n`,
            suffix: `\n\nprint(str(is_valid(s)).lower())`,
          },
          javascript: {
            prefix: `const s = require('fs').readFileSync('/dev/stdin','utf-8').trim();\n\n`,
            suffix: `\n\nconsole.log(String(isValid(s)));`,
          },
          typescript: {
            prefix: `import * as fs from 'fs';\nconst s = fs.readFileSync('/dev/stdin','utf-8').trim();\n\n`,
            suffix: `\n\nconsole.log(String(isValid(s)));`,
          },
          java: {
            prefix: `import java.util.*;\npublic class Main {\n`,
            suffix: `\n    public static void main(String[] args) {\n        String s = new Scanner(System.in).nextLine().trim();\n        System.out.println(isValid(s));\n    }\n}`,
          },
          cpp: {
            prefix: `#include <bits/stdc++.h>\nusing namespace std;\n\n`,
            suffix: `\n\nint main() {\n    string s; cin >> s;\n    cout << (isValid(s) ? "true" : "false") << endl;\n}`,
          },
          go: {
            prefix: `package main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n    "strings"\n)\n\n`,
            suffix: `\n\nfunc main() {\n    r := bufio.NewReader(os.Stdin)\n    s, _ := r.ReadString('\\n')\n    s = strings.TrimSpace(s)\n    if isValid(s) {\n        fmt.Println("true")\n    } else {\n        fmt.Println("false")\n    }\n}`,
          },
        },
        starterCode: {
          python:     `def is_valid(s: str) -> bool:\n    # Your code here\n    pass`,
          javascript: `function isValid(s) {\n    // Your code here\n    return false;\n}`,
          typescript: `function isValid(s: string): boolean {\n    // Your code here\n    return false;\n}`,
          java:       `    public static boolean isValid(String s) {\n        // Your code here\n        return false;\n    }`,
          cpp:        `bool isValid(string s) {\n    // Your code here\n    return false;\n}`,
          go:         `func isValid(s string) bool {\n    // Your code here\n    return false\n}`,
        },
      },

      // ── Q7: Binary Search ──────────────────────────────────────────────
      {
        id: 'q7',
        index: 6,
        title: 'Binary Search',
        difficulty: 'Easy',
        points: 8,
        description: `Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search for \`target\` in \`nums\`. If \`target\` exists, return its index. Otherwise, return \`-1\`.

You must write an algorithm with **O(log n)** runtime complexity.`,
        examples: [
          { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4',  explanation: '9 exists in nums and its index is 4.' },
          { input: 'nums = [-1,0,3,5,9,12], target = 2', output: '-1', explanation: '2 does not exist in nums so return -1.' },
        ],
        constraints: [
          '1 ≤ nums.length ≤ 10⁴',
          '-10⁴ < nums[i], target < 10⁴',
          'All the integers in nums are unique.',
          'nums is sorted in ascending order.',
        ],
        testCases: [
          { input: '-1 0 3 5 9 12\n9',  expectedOutput: '4',  hidden: false },
          { input: '-1 0 3 5 9 12\n2',  expectedOutput: '-1', hidden: false },
          { input: '5\n5',              expectedOutput: '0',  hidden: true  },
          { input: '1 2 3 4 5 6 7\n4', expectedOutput: '3',  hidden: true  },
        ],
        wrapper: {
          python: {
            prefix: `data = input().split()\nnums = list(map(int, data))\ntarget = int(input())\n\n`,
            suffix: `\n\nprint(search(nums, target))`,
          },
          javascript: {
            prefix: `const lines = require('fs').readFileSync('/dev/stdin','utf-8').trim().split('\\n');\nconst nums = lines[0].split(' ').map(Number);\nconst target = Number(lines[1]);\n\n`,
            suffix: `\n\nconsole.log(search(nums, target));`,
          },
          typescript: {
            prefix: `import * as fs from 'fs';\nconst lines = fs.readFileSync('/dev/stdin','utf-8').trim().split('\\n');\nconst nums = lines[0].split(' ').map(Number);\nconst target = Number(lines[1]);\n\n`,
            suffix: `\n\nconsole.log(search(nums, target));`,
          },
          java: {
            prefix: `import java.util.*;\npublic class Main {\n`,
            suffix: `\n    public static void main(String[] args) throws Exception {\n        Scanner sc = new Scanner(System.in);\n        String[] parts = sc.nextLine().trim().split(" ");\n        int[] nums = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n        int target = sc.nextInt();\n        System.out.println(search(nums, target));\n    }\n}`,
          },
          cpp: {
            prefix: `#include <bits/stdc++.h>\nusing namespace std;\n\n`,
            suffix: `\n\nint main() {\n    string line; getline(cin, line);\n    istringstream iss(line);\n    vector<int> nums; int x;\n    while (iss >> x) nums.push_back(x);\n    int target; cin >> target;\n    cout << search(nums, target) << endl;\n}`,
          },
          go: {
            prefix: `package main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n    "strconv"\n    "strings"\n)\n\n`,
            suffix: `\n\nfunc main() {\n    r := bufio.NewReader(os.Stdin)\n    line, _ := r.ReadString('\\n')\n    parts := strings.Fields(strings.TrimSpace(line))\n    nums := make([]int, len(parts))\n    for i, p := range parts { nums[i], _ = strconv.Atoi(p) }\n    var target int\n    fmt.Fscan(r, &target)\n    fmt.Println(search(nums, target))\n}`,
          },
        },
        starterCode: {
          python:     `def search(nums: list, target: int) -> int:\n    # Your code here\n    return -1`,
          javascript: `function search(nums, target) {\n    // Your code here\n    return -1;\n}`,
          typescript: `function search(nums: number[], target: number): number {\n    // Your code here\n    return -1;\n}`,
          java:       `    public static int search(int[] nums, int target) {\n        // Your code here\n        return -1;\n    }`,
          cpp:        `int search(vector<int>& nums, int target) {\n    // Your code here\n    return -1;\n}`,
          go:         `func search(nums []int, target int) int {\n    // Your code here\n    return -1\n}`,
        },
      },

      // ── Q8: Climbing Stairs ────────────────────────────────────────────
      {
        id: 'q8',
        index: 7,
        title: 'Climbing Stairs',
        difficulty: 'Easy',
        points: 10,
        description: `You are climbing a staircase. It takes \`n\` steps to reach the top.

Each time you can either climb **1** or **2** steps. In how many distinct ways can you climb to the top?`,
        examples: [
          { input: 'n = 2', output: '2', explanation: 'There are two ways to climb to the top: 1+1 and 2.' },
          { input: 'n = 3', output: '3', explanation: '1+1+1, 1+2, 2+1.' },
          { input: 'n = 5', output: '8', explanation: '' },
        ],
        constraints: ['1 ≤ n ≤ 45'],
        testCases: [
          { input: '2',  expectedOutput: '2',  hidden: false },
          { input: '3',  expectedOutput: '3',  hidden: false },
          { input: '5',  expectedOutput: '8',  hidden: false },
          { input: '10', expectedOutput: '89', hidden: true  },
          { input: '45', expectedOutput: '1836311903', hidden: true },
        ],
        wrapper: {
          python: {
            prefix: `n = int(input())\n\n`,
            suffix: `\n\nprint(climb_stairs(n))`,
          },
          javascript: {
            prefix: `const n = parseInt(require('fs').readFileSync('/dev/stdin','utf-8').trim());\n\n`,
            suffix: `\n\nconsole.log(climbStairs(n));`,
          },
          typescript: {
            prefix: `import * as fs from 'fs';\nconst n = parseInt(fs.readFileSync('/dev/stdin','utf-8').trim());\n\n`,
            suffix: `\n\nconsole.log(climbStairs(n));`,
          },
          java: {
            prefix: `import java.util.*;\npublic class Main {\n`,
            suffix: `\n    public static void main(String[] args) {\n        int n = new Scanner(System.in).nextInt();\n        System.out.println(climbStairs(n));\n    }\n}`,
          },
          cpp: {
            prefix: `#include <bits/stdc++.h>\nusing namespace std;\n\n`,
            suffix: `\n\nint main() {\n    int n; cin >> n;\n    cout << climbStairs(n) << endl;\n}`,
          },
          go: {
            prefix: `package main\n\nimport "fmt"\n\n`,
            suffix: `\n\nfunc main() {\n    var n int\n    fmt.Scan(&n)\n    fmt.Println(climbStairs(n))\n}`,
          },
        },
        starterCode: {
          python:     `def climb_stairs(n: int) -> int:\n    # Your code here\n    pass`,
          javascript: `function climbStairs(n) {\n    // Your code here\n    return 0;\n}`,
          typescript: `function climbStairs(n: number): number {\n    // Your code here\n    return 0;\n}`,
          java:       `    public static long climbStairs(int n) {\n        // Your code here\n        return 0;\n    }`,
          cpp:        `long long climbStairs(int n) {\n    // Your code here\n    return 0;\n}`,
          go:         `func climbStairs(n int) int {\n    // Your code here\n    return 0\n}`,
        },
      },

      // ── Q9: Merge Sorted Array ─────────────────────────────────────────
      {
        id: 'q9',
        index: 8,
        title: 'Merge Sorted Array',
        difficulty: 'Easy',
        points: 8,
        description: `You are given two integer arrays \`nums1\` and \`nums2\`, sorted in **non-decreasing** order.

Merge \`nums2\` into \`nums1\` as one sorted array and print the result.

**Input format:**
- Line 1: elements of \`nums1\` (space-separated)
- Line 2: elements of \`nums2\` (space-separated)`,
        examples: [
          { input: 'nums1 = [1,2,3], nums2 = [2,5,6]', output: '[1,2,2,3,5,6]', explanation: '' },
          { input: 'nums1 = [1], nums2 = []',           output: '[1]',           explanation: '' },
          { input: 'nums1 = [], nums2 = [1]',           output: '[1]',           explanation: '' },
        ],
        constraints: [
          '0 ≤ nums1.length, nums2.length ≤ 200',
          '-10⁹ ≤ nums1[i], nums2[j] ≤ 10⁹',
          'Both arrays are sorted in non-decreasing order.',
        ],
        testCases: [
          { input: '1 2 3\n2 5 6',  expectedOutput: '1 2 2 3 5 6', hidden: false },
          { input: '1\n',           expectedOutput: '1',            hidden: false },
          { input: '\n1',           expectedOutput: '1',            hidden: true  },
          { input: '1 3 5\n2 4 6',  expectedOutput: '1 2 3 4 5 6', hidden: true  },
        ],
        wrapper: {
          python: {
            prefix: `import sys\nlines = sys.stdin.read().splitlines()\na = list(map(int, lines[0].split())) if lines[0].strip() else []\nb = list(map(int, lines[1].split())) if len(lines) > 1 and lines[1].strip() else []\n\n`,
            suffix: `\n\nprint(*merge_sorted(a, b))`,
          },
          javascript: {
            prefix: `const lines = require('fs').readFileSync('/dev/stdin','utf-8').split('\\n');\nconst a = lines[0].trim() ? lines[0].trim().split(' ').map(Number) : [];\nconst b = lines[1] && lines[1].trim() ? lines[1].trim().split(' ').map(Number) : [];\n\n`,
            suffix: `\n\nconsole.log(mergeSorted(a, b).join(' '));`,
          },
          typescript: {
            prefix: `import * as fs from 'fs';\nconst lines = fs.readFileSync('/dev/stdin','utf-8').split('\\n');\nconst a = lines[0].trim() ? lines[0].trim().split(' ').map(Number) : [];\nconst b = lines[1] && lines[1].trim() ? lines[1].trim().split(' ').map(Number) : [];\n\n`,
            suffix: `\n\nconsole.log(mergeSorted(a, b).join(' '));`,
          },
          java: {
            prefix: `import java.util.*;\npublic class Main {\n`,
            suffix: `\n    public static void main(String[] args) throws Exception {\n        Scanner sc = new Scanner(System.in);\n        String line1 = sc.hasNextLine() ? sc.nextLine().trim() : "";\n        String line2 = sc.hasNextLine() ? sc.nextLine().trim() : "";\n        int[] a = line1.isEmpty() ? new int[0] : Arrays.stream(line1.split(" ")).mapToInt(Integer::parseInt).toArray();\n        int[] b = line2.isEmpty() ? new int[0] : Arrays.stream(line2.split(" ")).mapToInt(Integer::parseInt).toArray();\n        int[] res = mergeSorted(a, b);\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < res.length; i++) { if(i>0)sb.append(' '); sb.append(res[i]); }\n        System.out.println(sb);\n    }\n}`,
          },
          cpp: {
            prefix: `#include <bits/stdc++.h>\nusing namespace std;\n\n`,
            suffix: `\n\nint main() {\n    string line1, line2;\n    getline(cin, line1); getline(cin, line2);\n    istringstream iss1(line1), iss2(line2);\n    vector<int> a, b; int x;\n    while (iss1 >> x) a.push_back(x);\n    while (iss2 >> x) b.push_back(x);\n    vector<int> res = mergeSorted(a, b);\n    for (int i = 0; i < (int)res.size(); i++) { if(i)cout<<' '; cout<<res[i]; }\n    cout << endl;\n}`,
          },
          go: {
            prefix: `package main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n    "strconv"\n    "strings"\n)\n\n`,
            suffix: `\n\nfunc main() {\n    r := bufio.NewReader(os.Stdin)\n    line1, _ := r.ReadString('\\n')\n    line2, _ := r.ReadString('\\n')\n    toInts := func(line string) []int {\n        parts := strings.Fields(strings.TrimSpace(line))\n        nums := make([]int, len(parts))\n        for i, p := range parts { nums[i], _ = strconv.Atoi(p) }\n        return nums\n    }\n    a, b := toInts(line1), toInts(line2)\n    res := mergeSorted(a, b)\n    out := make([]string, len(res))\n    for i, n := range res { out[i] = strconv.Itoa(n) }\n    fmt.Println(strings.Join(out, " "))\n}`,
          },
        },
        starterCode: {
          python:     `def merge_sorted(nums1: list, nums2: list) -> list:\n    # Your code here\n    pass`,
          javascript: `function mergeSorted(nums1, nums2) {\n    // Your code here\n    return [];\n}`,
          typescript: `function mergeSorted(nums1: number[], nums2: number[]): number[] {\n    // Your code here\n    return [];\n}`,
          java:       `    public static int[] mergeSorted(int[] nums1, int[] nums2) {\n        // Your code here\n        return new int[]{};\n    }`,
          cpp:        `vector<int> mergeSorted(vector<int>& a, vector<int>& b) {\n    // Your code here\n    return {};\n}`,
          go:         `func mergeSorted(a, b []int) []int {\n    // Your code here\n    return []int{}\n}`,
        },
      },

      // ── Q10: Count Vowels ──────────────────────────────────────────────
      {
        id: 'q10',
        index: 9,
        title: 'Count Vowels',
        difficulty: 'Easy',
        points: 5,
        description: `Given a string \`s\`, return the number of **vowels** in the string.

Vowels are: \`a\`, \`e\`, \`i\`, \`o\`, \`u\` (both uppercase and lowercase).`,
        examples: [
          { input: 's = "Hello World"', output: '3',  explanation: 'e, o, o are vowels.' },
          { input: 's = "aeiou"',       output: '5',  explanation: '' },
          { input: 's = "rhythm"',      output: '0',  explanation: 'No vowels.' },
        ],
        constraints: ['1 ≤ s.length ≤ 10⁵'],
        testCases: [
          { input: 'Hello World', expectedOutput: '3', hidden: false },
          { input: 'aeiou',       expectedOutput: '5', hidden: false },
          { input: 'rhythm',      expectedOutput: '0', hidden: false },
          { input: 'The quick brown fox jumps over the lazy dog', expectedOutput: '11', hidden: true },
        ],
        wrapper: {
          python: {
            prefix: `s = input()\n\n`,
            suffix: `\n\nprint(count_vowels(s))`,
          },
          javascript: {
            prefix: `const s = require('fs').readFileSync('/dev/stdin','utf-8').trim();\n\n`,
            suffix: `\n\nconsole.log(countVowels(s));`,
          },
          typescript: {
            prefix: `import * as fs from 'fs';\nconst s = fs.readFileSync('/dev/stdin','utf-8').trim();\n\n`,
            suffix: `\n\nconsole.log(countVowels(s));`,
          },
          java: {
            prefix: `import java.util.*;\npublic class Main {\n`,
            suffix: `\n    public static void main(String[] args) {\n        String s = new Scanner(System.in).nextLine();\n        System.out.println(countVowels(s));\n    }\n}`,
          },
          cpp: {
            prefix: `#include <bits/stdc++.h>\nusing namespace std;\n\n`,
            suffix: `\n\nint main() {\n    string s; getline(cin, s);\n    cout << countVowels(s) << endl;\n}`,
          },
          go: {
            prefix: `package main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n    "strings"\n)\n\n`,
            suffix: `\n\nfunc main() {\n    r := bufio.NewReader(os.Stdin)\n    s, _ := r.ReadString('\\n')\n    s = strings.TrimSpace(s)\n    fmt.Println(countVowels(s))\n}`,
          },
        },
        starterCode: {
          python:     `def count_vowels(s: str) -> int:\n    # Your code here\n    pass`,
          javascript: `function countVowels(s) {\n    // Your code here\n    return 0;\n}`,
          typescript: `function countVowels(s: string): number {\n    // Your code here\n    return 0;\n}`,
          java:       `    public static int countVowels(String s) {\n        // Your code here\n        return 0;\n    }`,
          cpp:        `int countVowels(string s) {\n    // Your code here\n    return 0;\n}`,
          go:         `func countVowels(s string) int {\n    // Your code here\n    return 0\n}`,
        },
      },

      // ── Q11: Algorithm Explanation (Descriptive) ───────────────────────
      {
        id: 'q11',
        index: 10,
        type: 'descriptive',
        title: 'Algorithm Explanation',
        difficulty: 'Medium',
        points: 20,
        description: `Explain the **Binary Search** algorithm in your own words.

Your answer should cover:
- How the algorithm works step by step
- Time and space complexity (with justification)
- A real-world scenario where you would choose binary search over linear search
- Any edge cases or limitations to be aware of`,
        examples: [],
        constraints: [],
        testCases: [],
      },
    ],
  };
}

// ── Difficulty badge ──────────────────────────────────────────────────────────
function DifficultyBadge({ level }) {
  const cls =
    level === 'Easy'   ? 'text-green-600 bg-green-50'  :
    level === 'Medium' ? 'text-yellow-600 bg-yellow-50' :
                         'text-red-600 bg-red-50';
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {level}
    </span>
  );
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function useTimer(durationSeconds) {
  const [remaining, setRemaining] = useState(durationSeconds);
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const isWarning = remaining < 300;
  return {
    display: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`,
    isWarning,
    expired: remaining <= 0,
  };
}

// ── Test case tab label ───────────────────────────────────────────────────────
function CaseTab({ label, result, active, onClick }) {
  const dot =
    result === undefined ? 'bg-gray-300' :
    result              ? 'bg-green-500' : 'bg-red-500';
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
        active ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ExamSession() {
  const { examId } = useParams();
  useSearchParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  // ── Exam state ──
  const [exam, setExam] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({}); // qId → { type, ...data }
  const [descriptiveAnswers, setDescriptiveAnswers] = useState({}); // qId → html
  const [mcqAnswers, setMcqAnswers] = useState({}); // qId → string[] (selected option texts)

  // ── Editor state ──
  const [language, setLanguage] = useState('python');
  const [codeMap, setCodeMap] = useState({}); // `${qId}_${lang}` → code
  const editorRef = useRef(null);

  // ── Run/test state ──
  const [running, setRunning]       = useState(false);
  const [runResults, setRunResults]   = useState(null); // null | TestCaseResult[]  (regular cases)
  const [customResult, setCustomResult] = useState(null); // null | single result   (custom input)
  const [activeCase, setActiveCase] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [bottomHeight, setBottomHeight] = useState(220);

  // ── Panel resize ──
  const [leftWidth, setLeftWidth] = useState(42); // percent
  const draggingV = useRef(false);
  const draggingH = useRef(false);

  // ── Monitor socket + WebRTC (student → proctor live video) ──
  const socketRef = useRef(null);
  const [proctorMessage, setProctorMessage] = useState(null);
  const webcamStream = useRef(null);
  const peerConnections = useRef({}); // proctorSocketId → RTCPeerConnection

  const RTC_CONFIG = { iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ] };

  useEffect(() => {
    if (!exam || !authUser) return;
    const token = localStorage.getItem('accessToken');
    const candidateId = authUser.id || authUser._id;

    const socket = io(WS_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('candidate.join', {
        examId,
        candidateId,
        candidateName: authUser.name || 'Student',
        candidateEmail: authUser.email || '',
        totalQuestions: exam.questions.length,
      });
    });

    socket.on('message.received', (data) => {
      setProctorMessage(data.message);
      setTimeout(() => setProctorMessage(null), 10000);
    });

    socket.on('warning.received', (data) => {
      alert(data.message || 'You have received a formal warning from the proctor.');
    });

    socket.on('exam.terminated', (data) => {
      alert(data.reason || 'Your exam has been terminated.');
      setSubmitted(true);
    });

    socket.on('time.extended', (data) => {
      setProctorMessage(`Time extended by ${data.extraMinutes} minutes.`);
      setTimeout(() => setProctorMessage(null), 8000);
    });

    // ── WebRTC: respond to proctor offers with webcam stream ──
    socket.on('webrtc.offer', async ({ proctorSocketId, offer }) => {
      console.log('[Student WebRTC] Received offer from proctor:', proctorSocketId);
      try {
        const stream = webcamStream.current;
        if (!stream) {
          console.warn('[Student WebRTC] No webcam stream available yet');
          return;
        }

        console.log('[Student WebRTC] Creating peer connection with tracks:', stream.getTracks().length);
        const pc = new RTCPeerConnection(RTC_CONFIG);
        peerConnections.current[proctorSocketId] = pc;

        stream.getTracks().forEach((track) => {
          console.log('[Student WebRTC] Adding track:', track.kind);
          pc.addTrack(track, stream);
        });

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            console.log('[Student WebRTC] Sending ICE candidate to proctor');
            socket.emit('webrtc.ice-candidate', {
              targetSocketId: proctorSocketId,
              candidate: e.candidate,
            });
          }
        };

        pc.onconnectionstatechange = () => {
          console.log('[Student WebRTC] Connection state:', pc.connectionState);
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        console.log('[Student WebRTC] Sending answer to proctor');
        socket.emit('webrtc.answer', { proctorSocketId, answer });
      } catch (err) {
        console.error('[Student WebRTC] Failed to handle offer:', err);
      }
    });

    socket.on('webrtc.ice-candidate', ({ fromSocketId, candidate }) => {
      console.log('[Student WebRTC] Received ICE candidate from:', fromSocketId);
      const pc = peerConnections.current[fromSocketId];
      if (pc && candidate) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
          console.error('[Student WebRTC] Failed to add ICE candidate:', err);
        });
      } else if (!pc) {
        console.warn('[Student WebRTC] No peer connection for ICE candidate from:', fromSocketId);
      }
    });

    // ── Get webcam stream ──
    console.log('[Student WebRTC] Requesting webcam access...');
    navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      .then((stream) => {
        webcamStream.current = stream;
        console.log('[Student WebRTC] Webcam stream acquired with', stream.getTracks().length, 'tracks');
      })
      .catch((err) => console.error('[Student WebRTC] Webcam not available:', err.message));

    return () => {
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      peerConnections.current = {};
      if (webcamStream.current) webcamStream.current.getTracks().forEach((t) => t.stop());
      webcamStream.current = null;
      socket.disconnect();
    };
  }, [exam, examId, authUser]);

  // ── Timer ──
  const timer = useTimer(exam ? exam.durationMinutes * 60 : 5400);

  // ── Load exam ──
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    (async () => {
      try {
        // Start / resume attempt
        await axios.post(`${API}student/exams/${examId}/start`, {}, { headers }).catch((err) => {
          const msg = err?.response?.data?.message || '';
          if (msg.toLowerCase().includes('submitted')) throw new Error('ALREADY_SUBMITTED');
        });

        // Get schedule + paper structure
        const { data } = await axios.get(`${API}student/exams/${examId}/paper`, { headers });
        const { schedule, paper } = data;

        // Collect all questionIds from sections
        const allSlots = paper.sections.flatMap((s) =>
          s.questions.map((q) => ({ ...q, sectionName: s.name })),
        );
        const uniqueIds = [...new Set(allSlots.map((s) => s.questionId))];

        // Fetch full question details in parallel
        const fetched = await Promise.all(
          uniqueIds.map((qid) =>
            axios.get(`${API}questions/${qid}`, { headers }).then((r) => r.data).catch(() => null),
          ),
        );
        const qMap = {};
        fetched.filter(Boolean).forEach((q) => { qMap[q._id] = q; });

        // Build flat questions list (one entry per slot)
        const questions = allSlots.map((slot, idx) => {
          const q = qMap[slot.questionId] || {};
          return {
            id: slot.questionId,
            index: idx,
            type: q.type || 'programming',
            title: q.body ? q.body.slice(0, 70) : `Question ${idx + 1}`,
            description: q.body || '',
            difficulty: q.difficulty || 'medium',
            points: slot.marks,
            section: slot.sectionName,
            options: q.options || [],
            testCases: (q.testCases || []).map((tc) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              hidden: tc.isHidden,
            })),
            starterCode: Object.fromEntries(
              Object.entries(q.starterCode || {}).map(([k, v]) => [k.toLowerCase(), v])
            ),
            allowedLanguages: (q.allowedLanguages || []).map((l) => l.toLowerCase()),
            examples: [],
            constraints: [],
            // Programming wrapper not stored in DB; skip for real questions
            wrapper: null,
          };
        });

        setExam({
          id: examId,
          title: schedule.title,
          durationMinutes: schedule.durationMinutes,
          questions,
        });

        // Pre-populate code map with starter code
        const initial = {};
        questions.forEach((q) => {
          LANGUAGES.forEach(({ id }) => {
            const key = `${q.id}_${id}`;
            initial[key] = (q.starterCode && q.starterCode[id]) || DEFAULT_CODE[id];
          });
        });
        setCodeMap(initial);
      } catch (err) {
        if (err?.message === 'ALREADY_SUBMITTED') {
          setSubmitted(true);
          return;
        }
        // Fallback: load mock exam so the UI isn't broken during development
        console.warn('Could not load real exam, falling back to mock:', err?.message);
        const mock = buildMockExam(examId);
        setExam(mock);
        const initial = {};
        mock.questions.forEach((q) => {
          LANGUAGES.forEach(({ id }) => {
            const key = `${q.id}_${id}`;
            initial[key] = (q.starterCode && q.starterCode[id]) || DEFAULT_CODE[id];
          });
        });
        setCodeMap(initial);
      }
    })();
  }, [examId]);

  // ── Current question + code ──
  const question = exam?.questions[qIndex];
  const codeKey = question ? `${question.id}_${language}` : '';
  const code = codeMap[codeKey] || DEFAULT_CODE[language];

  function setCode(val) {
    setCodeMap((prev) => ({ ...prev, [codeKey]: val }));
    setRunResults(null);
    setCustomResult(null);
  }

  // ── Language change → clear run results ──
  function changeLanguage(lang) {
    setLanguage(lang);
    setRunResults(null);
    setCustomResult(null);
  }

  // ── Question navigation ──
  function gotoQuestion(idx) {
    setQIndex(idx);
    setRunResults(null);
    setCustomResult(null);
    setActiveCase(0);
    setUseCustom(false);
  }

  // ── Run code ──
  const runCode = useCallback(async () => {
    if (!question || running) return;
    setRunning(true);
    setRunResults(null);

    try {
      const token = localStorage.getItem('accessToken');
      const visibleCases = useCustom
        ? [{ input: customInput, expectedOutput: '' }]
        : question.testCases.filter((tc) => !tc.hidden);

      // Wrap student function with stdin/stdout harness if defined
      const wrapper = question.wrapper?.[language];
      const codeToRun = wrapper
        ? wrapper.prefix + code + wrapper.suffix
        : code;

      const { data } = await axios.post(
        `${API}exam/run`,
        { language, code: codeToRun, testCases: visibleCases },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (useCustom) {
        setCustomResult(data[0] ?? null);
      } else {
        setRunResults(data);
        setActiveCase(0);
      }
    } catch (err) {
      setRunResults([
        {
          index: 0,
          passed: false,
          input: '',
          expected: '',
          actual: '',
          error: err.response?.data?.message || err.message || 'Network error',
          timeMs: 0,
        },
      ]);
    } finally {
      setRunning(false);
    }
  }, [question, language, code, running, useCustom, customInput]);

  // ── Submit exam ──
  async function submitExam() {
    if (submitting) return;
    if (!window.confirm('Submit the exam? You cannot make changes after submission.')) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Collect all answers into a unified array
      const allAnswers = [];
      exam.questions.forEach((q) => {
        if (q.type === 'mcq-single' || q.type === 'mcq-multiple') {
          allAnswers.push({ questionId: q.id, type: q.type, selectedOptions: mcqAnswers[q.id] || [] });
        } else if (q.type === 'descriptive') {
          allAnswers.push({ questionId: q.id, type: 'descriptive', html: descriptiveAnswers[q.id] || '' });
        } else {
          const lang = answers[q.id]?.language || language;
          const c = codeMap[`${q.id}_${lang}`] || '';
          allAnswers.push({ questionId: q.id, type: 'programming', language: lang, code: c });
        }
      });

      await axios.post(`${API}student/exams/${examId}/submit`, { answers: allAnswers }, { headers });
      socketRef.current?.emit('candidate.leave', { examId, candidateId: authUser?.id || authUser?._id });
      setSubmitted(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Vertical divider drag ──
  function onVDividerMouseDown(e) {
    draggingV.current = true;
    const startX = e.clientX;
    const startW = leftWidth;
    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const total = window.innerWidth;
      const newPct = Math.max(25, Math.min(60, startW + (dx / total) * 100));
      setLeftWidth(newPct);
    };
    const onUp = () => {
      draggingV.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    e.preventDefault();
  }

  // ── Horizontal divider drag (editor / bottom panel) ──
  function onHDividerMouseDown(e) {
    draggingH.current = true;
    const startY = e.clientY;
    const startH = bottomHeight;
    const onMove = (ev) => {
      const dy = ev.clientY - startY;
      setBottomHeight(Math.max(120, Math.min(400, startH - dy)));
    };
    const onUp = () => {
      draggingH.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    e.preventDefault();
  }

  // ── Submitted screen ──
  if (submitted) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-950 text-white gap-6">
        <div className="text-5xl">✓</div>
        <h1 className="text-2xl font-bold">Exam Submitted</h1>
        <p className="text-gray-400">Your answers have been recorded. You may now close this window.</p>
        <button
          onClick={() => navigate('/')}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold hover:bg-indigo-500 transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (!exam || !question) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-400">
        Loading exam…
      </div>
    );
  }

  const visibleTestCases = question.testCases.filter((tc) => !tc.hidden);
const passCount = runResults ? runResults.filter((r) => r.passed).length : 0;

  return (
    <div className={`flex h-screen flex-col bg-gray-950 text-gray-100 overflow-hidden${import.meta.env.DEV ? '' : ' select-none'}`}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900 px-4 gap-4">
        {/* Left: logo + title */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-bold text-indigo-400 whitespace-nowrap">ProctorPlatform</span>
          <span className="text-gray-600">/</span>
          <span className="text-sm text-gray-300 truncate">{exam.title}</span>
        </div>

        {/* Center: question picker */}
        <div className="flex items-center gap-1">
          {exam.questions.map((q, i) => {
            const ans = answers[q.id];
            const hasAns = !!ans;
            return (
              <button
                key={q.id}
                onClick={() => gotoQuestion(i)}
                className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${
                  i === qIndex
                    ? 'bg-indigo-600 text-white'
                    : hasAns
                      ? 'bg-green-700 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={q.title}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Right: timer + submit */}
        <div className="flex items-center gap-3">
          <span className={`font-mono text-sm font-bold ${timer.isWarning ? 'text-red-400' : 'text-gray-300'}`}>
            {timer.display}
          </span>
          <button
            onClick={submitExam}
            disabled={submitting}
            className="rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-60 px-4 py-1.5 text-xs font-bold text-white transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit Exam'}
          </button>
        </div>
      </header>

      {/* Proctor message banner */}
      {proctorMessage && (
        <div className="bg-indigo-600 text-white text-sm text-center py-2 px-4 shrink-0">
          {proctorMessage}
        </div>
      )}

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT PANEL — Question ──────────────────────────────────────── */}
        <div
          className="flex flex-col min-h-0 overflow-hidden bg-gray-900"
          style={{ width: `${leftWidth}%` }}
        >
          {/* Question header */}
          <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2.5 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-gray-500">
                {qIndex + 1} / {exam.questions.length}
              </span>
              <span className="text-sm font-semibold text-gray-100 truncate">{question.title}</span>
              <DifficultyBadge level={question.difficulty} />
            </div>
            <span className="text-xs text-gray-500 shrink-0">{question.points} pts</span>
          </div>

          {/* Question body — scrollable */}
          <div className="flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed space-y-5">
            {/* Description */}
            <div>
              <p className="text-gray-300 whitespace-pre-wrap">{question.description.replace(/\\n/g, '\n')}</p>
            </div>

            {/* Examples */}
            {question.examples.length > 0 && (
              <div className="space-y-3">
                {question.examples.map((ex, i) => (
                  <div key={i}>
                    <p className="text-xs font-semibold text-gray-400 mb-1">Example {i + 1}</p>
                    <div className="rounded-lg bg-gray-800 p-3 font-mono text-xs space-y-1">
                      <div><span className="text-gray-500">Input: </span><span className="text-gray-200">{ex.input}</span></div>
                      <div><span className="text-gray-500">Output: </span><span className="text-gray-200">{ex.output}</span></div>
                      {ex.explanation && (
                        <div className="pt-1 text-gray-400 font-sans">{ex.explanation}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Constraints */}
            {question.constraints.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-2">Constraints</p>
                <ul className="space-y-1">
                  {question.constraints.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                      <span className="text-indigo-400 mt-0.5">•</span>
                      <span className="font-mono">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Question navigation */}
          <div className="flex items-center justify-between border-t border-gray-800 px-4 py-2.5 shrink-0">
            <button
              onClick={() => gotoQuestion(Math.max(0, qIndex - 1))}
              disabled={qIndex === 0}
              className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-default transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => gotoQuestion(Math.min(exam.questions.length - 1, qIndex + 1))}
              disabled={qIndex === exam.questions.length - 1}
              className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-default transition-colors"
            >
              Next →
            </button>
          </div>
        </div>

        {/* ── Vertical divider ──────────────────────────────────────────── */}
        <div
          onMouseDown={onVDividerMouseDown}
          className="w-1 shrink-0 cursor-col-resize bg-gray-800 hover:bg-indigo-600 transition-colors"
        />

        {/* ── RIGHT PANEL ──────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">

          {(question.type === 'mcq-single' || question.type === 'mcq-multiple') ? (
            /* ── MCQ Answer Panel ───────────────────────────────────────── */
            <>
              <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-3 py-2 shrink-0 gap-2">
                <span className="text-xs text-gray-400 font-semibold">
                  {question.type === 'mcq-single' ? 'Select one answer' : 'Select all that apply'}
                </span>
                <button
                  onClick={() => {
                    const sel = mcqAnswers[question.id] || [];
                    setAnswers((prev) => {
                      const next = { ...prev, [question.id]: { type: question.type, selectedOptions: sel } };
                      socketRef.current?.emit('candidate.progress', {
                        examId, candidateId: authUser?.id || authUser?._id,
                        questionsAnswered: Object.keys(next).length,
                      });
                      return next;
                    });
                    if (qIndex < exam.questions.length - 1) gotoQuestion(qIndex + 1);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  ↑ Save &amp; Next
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {question.options.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No options available for this question.</p>
                ) : (
                  <div className="space-y-3 max-w-2xl">
                    {question.options.map((opt, i) => {
                      const selected = (mcqAnswers[question.id] || []).includes(opt.text);
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setMcqAnswers((prev) => {
                              const cur = prev[question.id] || [];
                              if (question.type === 'mcq-single') {
                                return { ...prev, [question.id]: [opt.text] };
                              }
                              return {
                                ...prev,
                                [question.id]: selected
                                  ? cur.filter((t) => t !== opt.text)
                                  : [...cur, opt.text],
                              };
                            });
                          }}
                          className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                            selected
                              ? 'border-indigo-500 bg-indigo-900/30 text-indigo-200'
                              : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-750'
                          }`}
                        >
                          <span className="mr-3 font-mono text-xs text-gray-500">
                            {question.type === 'mcq-single' ? '○' : '□'} {String.fromCharCode(65 + i)}.
                          </span>
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : question.type === 'descriptive' ? (
            /* ── Descriptive Answer Panel ──────────────────────────────── */
            <>
              <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-3 py-2 shrink-0 gap-2">
                <span className="text-xs text-gray-400 font-semibold">Written Answer</span>
                <button
                  onClick={() => {
                    setAnswers((prev) => {
                      const next = { ...prev, [question.id]: { html: descriptiveAnswers[question.id] || '' } };
                      socketRef.current?.emit('candidate.progress', {
                        examId, candidateId: authUser?.id || authUser?._id,
                        questionsAnswered: Object.keys(next).length,
                      });
                      return next;
                    });
                    if (qIndex < exam.questions.length - 1) gotoQuestion(qIndex + 1);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  ↑ Save &amp; Next
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ConfluenceEditor
                  value={descriptiveAnswers[question.id] || ''}
                  onChange={(html) => setDescriptiveAnswers((prev) => ({ ...prev, [question.id]: html }))}
                  placeholder="Write your answer here…"
                />
              </div>
            </>
          ) : (
            /* ── Coding Question Panel ───────────────────────────────── */
            <>

          {/* Editor toolbar */}
          <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-3 py-2 shrink-0 gap-2">
            {/* Language picker */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Language</label>
              <select
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="rounded bg-gray-800 border border-gray-700 text-xs text-gray-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (window.confirm('Reset code to starter template?')) {
                    const starter = question.starterCode?.[language] || DEFAULT_CODE[language];
                    setCode(starter);
                  }
                }}
                className="rounded px-2.5 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={runCode}
                disabled={running}
                className="flex items-center gap-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
              >
                {running ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  <span>▶</span>
                )}
                {running ? 'Running…' : 'Run'}
              </button>
              <button
                onClick={() => {
                  // Save answer and mark question as answered
                  setAnswers((prev) => {
                    const next = { ...prev, [question.id]: { language, code } };
                    socketRef.current?.emit('candidate.progress', {
                      examId, candidateId: authUser?.id || authUser?._id,
                      questionsAnswered: Object.keys(next).length,
                    });
                    return next;
                  });
                  // Optionally auto-advance
                  if (qIndex < exam.questions.length - 1) gotoQuestion(qIndex + 1);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
              >
                ↑ Save &amp; Next
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-0 overflow-hidden" style={{ minHeight: 0 }}>
            <Editor
              height="100%"
              language={LANGUAGES.find((l) => l.id === language)?.monacoId || 'plaintext'}
              value={code}
              onChange={(val) => setCode(val || '')}
              onMount={(editor) => { editorRef.current = editor; }}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                wordWrap: 'off',
                automaticLayout: true,
                tabSize: 4,
                insertSpaces: true,
                formatOnPaste: false,
                renderLineHighlight: 'line',
                padding: { top: 8 },
              }}
            />
          </div>

          {/* ── Horizontal divider ─────────────────────────────────────── */}
          <div
            onMouseDown={onHDividerMouseDown}
            className="h-1 shrink-0 cursor-row-resize bg-gray-800 hover:bg-indigo-600 transition-colors"
          />

          {/* ── Bottom panel — Test Cases ─────────────────────────────── */}
          <div
            className="flex flex-col shrink-0 bg-gray-900 overflow-hidden"
            style={{ height: bottomHeight }}
          >
            {/* Tab bar */}
            <div className="flex items-center border-b border-gray-800 bg-gray-950 px-2 pt-1 gap-0.5 shrink-0">
              <span className="text-xs text-gray-500 px-2 font-semibold">Test Cases</span>
              <div className="flex items-center gap-0.5 ml-2">
                {visibleTestCases.map((_, i) => (
                  <CaseTab
                    key={i}
                    label={`Case ${i + 1}`}
                    result={runResults?.[i]?.passed}
                    active={activeCase === i && !useCustom}
                    onClick={() => { setActiveCase(i); setUseCustom(false); }}
                  />
                ))}
                <CaseTab
                  label="Custom"
                  result={undefined}
                  active={useCustom}
                  onClick={() => setUseCustom(true)}
                />
              </div>

              {/* Run summary */}
              {runResults && !useCustom && (
                <span className={`ml-auto mr-2 text-xs font-semibold ${
                  passCount === runResults.length ? 'text-green-400' : 'text-red-400'
                }`}>
                  {passCount} / {runResults.length} passed
                </span>
              )}
            </div>

            {/* Test case content */}
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
              {useCustom ? (
                /* Custom input */
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold">Custom Input</label>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter your custom test input here…"
                    className="w-full rounded bg-gray-800 border border-gray-700 p-2 font-mono text-xs text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={3}
                  />
                  {customResult && (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400 font-semibold">Output</div>
                      <pre className="rounded bg-gray-800 p-2 font-mono text-xs text-gray-200 whitespace-pre-wrap">
                        {customResult.actual || customResult.error || '(no output)'}
                      </pre>
                      {customResult.timeMs > 0 && (
                        <div className="text-xs text-gray-500">{customResult.timeMs} ms</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Standard test case */
                (() => {
                  const tc = visibleTestCases[activeCase];
                  const res = runResults?.[activeCase];
                  if (!tc) return <p className="text-xs text-gray-500">No test cases</p>;
                  return (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Left: Input + Expected */}
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-400 font-semibold mb-1">Input</p>
                          <pre className="rounded bg-gray-800 p-2 font-mono text-xs text-gray-200 whitespace-pre-wrap">
                            {tc.input}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 font-semibold mb-1">Expected Output</p>
                          <pre className="rounded bg-gray-800 p-2 font-mono text-xs text-gray-200 whitespace-pre-wrap">
                            {tc.expectedOutput}
                          </pre>
                        </div>
                      </div>

                      {/* Right: Actual output */}
                      <div className="space-y-2">
                        {res ? (
                          <>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs text-gray-400 font-semibold">Your Output</p>
                                <span className={`text-xs font-bold ${res.passed ? 'text-green-400' : 'text-red-400'}`}>
                                  {res.passed ? '✓ Accepted' : '✗ Wrong Answer'}
                                </span>
                              </div>
                              <pre className={`rounded p-2 font-mono text-xs whitespace-pre-wrap ${
                                res.passed ? 'bg-green-950 text-green-300' : 'bg-red-950 text-red-300'
                              }`}>
                                {res.actual || '(no output)'}
                              </pre>
                            </div>
                            {res.error && (
                              <div>
                                <p className="text-xs text-red-400 font-semibold mb-1">Error / Stderr</p>
                                <pre className="rounded bg-red-950 p-2 font-mono text-xs text-red-300 whitespace-pre-wrap">
                                  {res.error}
                                </pre>
                              </div>
                            )}
                            <div className="text-xs text-gray-500">{res.timeMs} ms</div>
                          </>
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-gray-600">
                            Click <strong className="text-gray-400 mx-1">▶ Run</strong> to see output
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
