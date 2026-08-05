在ICPC等算法竞赛中，`std::stack` 是C++ STL提供的**栈容器适配器**，严格遵循「后进先出（LIFO）」原则，仅允许在栈顶进行插入、删除、访问操作，是解决括号匹配、表达式求值、单调栈、非递归DFS等经典问题的核心工具。

---

## 一、基础准备

- **头文件**：`#include <stack>`
- **命名空间**：位于 `std` 命名空间下，竞赛中通常配合 `using namespace std;` 使用
- **本质**：stack 不是独立容器，是**容器适配器**——默认底层使用 `std::deque` 实现，对外仅暴露栈操作接口，屏蔽了底层容器的其他功能。

---

## 二、定义与初始化
### 基础定义
```cpp
stack<int> stk;                // 存储int类型的空栈
stack<string> stk_str;         // 存储字符串的栈
stack<pair<int, int>> stk_p;   // 存储二元组（常用于存坐标、DFS状态）
```

### 指定底层容器（竞赛极少修改）
stack 支持替换底层容器，只要容器支持 `back()`、`push_back()`、`pop_back()` 即可，最常用的替代是 `vector`：
```cpp
stack<int, vector<int>> stk; // 底层用vector实现栈
```
默认 `deque` 的优势：分段存储，扩容无需拷贝全部元素，均摊性能更优，**绝大多数场景直接使用默认即可**。

---

## 三、核心操作（竞赛必用）
所有栈顶操作的时间复杂度均为 **O(1) 均摊**。

| 操作 | 作用 | 关键注意事项 |
|------|------|--------------|
| `stk.push(x)` | 将元素x压入栈顶 | 传入元素的拷贝，基础类型无额外开销 |
| `stk.emplace(args...)` | 在栈顶直接构造元素 | C++11引入，避免临时对象拷贝；可直接传构造参数，如 `stk.emplace(1,2)` 直接构造pair |
| `stk.pop()` | 删除栈顶元素 | **无返回值**；空栈调用会触发未定义行为（运行时错误RE） |
| `stk.top()` | 返回栈顶元素的引用 | 不删除元素；空栈调用会触发未定义行为 |
| `stk.empty()` | 判断栈是否为空 | 返回bool，空栈返回true |
| `stk.size()` | 返回栈中元素个数 | 返回值类型为 `size_t`（无符号整数） |

### ⚠️ 最高频新手错误
```cpp
// 错误：pop()返回void，不能直接赋值
int x = stk.pop(); 

// 正确写法：先取栈顶值，再弹出
int x = stk.top();
stk.pop();
```

---

## 四、进阶常用操作
### 1. 清空栈
stack **没有 `clear()` 成员函数**，竞赛中清空栈有两种标准方式：
- 方式一：逐个弹出（写法简单，适合小数据量）
  ```cpp
  while (!stk.empty()) {
      stk.pop();
  }
  ```
- 方式二：与空栈交换（O(1)时间，大数据量推荐）
  ```cpp
  stack<int>().swap(stk);
  ```

### 2. 栈的遍历
stack 不提供迭代器，也不支持下标访问。如果必须遍历，只能逐个弹出并保存数据（遍历后原栈会被清空）：
```cpp
while (!stk.empty()) {
    cout << stk.top() << " ";
    stk.pop();
}
```
如果需要保留数据且频繁访问内部元素，建议使用**数组模拟栈**。

---

## 五、竞赛高频应用场景 + 代码示例
### 场景1：括号匹配（经典入门题）
**题目**：给定仅包含 `()[]{}` 的字符串，判断括号是否合法匹配。
**思路**：左括号入栈，遇到右括号时检查栈顶是否为对应左括号，匹配则弹出，不匹配则非法。
```cpp
bool isValid(string s) {
    stack<char> stk;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') {
            stk.push(c);
        } else {
            if (stk.empty()) return false; // 右括号多于左括号
            char top = stk.top();
            if ((c == ')' && top == '(') || 
                (c == ']' && top == '[') || 
                (c == '}' && top == '{')) {
                stk.pop();
            } else {
                return false; // 括号类型不匹配
            }
        }
    }
    return stk.empty(); // 所有左括号都被匹配
}
```

### 场景2：单调栈（ICPC中频考点）
单调栈维护栈内元素单调递增/递减，可在 **O(n)** 时间内解决「下一个更大元素」「柱状图最大矩形」「接雨水」等经典问题。
**示例**：每日温度（求每个温度之后，下一个更高温度间隔的天数）
```cpp
vector<int> dailyTemperatures(vector<int>& temperatures) {
    int n = temperatures.size();
    vector<int> res(n, 0);
    stack<int> stk; // 存储数组下标，维护温度单调递减
    for (int i = 0; i < n; i++) {
        // 当前温度大于栈顶，弹出栈顶并计算答案
        while (!stk.empty() && temperatures[i] > temperatures[stk.top()]) {
            int idx = stk.top();
            stk.pop();
            res[idx] = i - idx;
        }
        stk.push(i);
    }
    return res;
}
```

### 场景3：非递归DFS（防止栈溢出）
当递归深度过大（如链状树、1e5层递归）时，系统栈会溢出导致RE，此时用手动栈模拟递归过程。
**示例**：二叉树前序遍历非递归实现
```cpp
vector<int> preorder(TreeNode* root) {
    vector<int> res;
    if (!root) return res;
    stack<TreeNode*> stk;
    stk.push(root);
    while (!stk.empty()) {
        TreeNode* node = stk.top();
        stk.pop();
        res.push_back(node->val);
        // 栈后进先出：先压右子树，再压左子树，保证左子树先处理
        if (node->right) stk.push(node->right);
        if (node->left) stk.push(node->left);
    }
    return res;
}
```

---

## 六、数组模拟栈（竞赛选手常用写法）
ICPC中很多选手偏好数组手动模拟栈，核心优势是：常数更小、可随意访问栈内元素、清空操作O(1)，在写单调栈等复杂逻辑时更灵活。

### 标准模板
```cpp
const int N = 1e5 + 10; // 根据题目数据范围开足够大的数组
int stk[N], tt = 0;     // tt为栈顶指针：tt=0表示空栈，栈顶元素为stk[tt]

// 1. 入栈
stk[++tt] = x;

// 2. 出栈
tt--;

// 3. 取栈顶
int top_val = stk[tt];

// 4. 判空
if (tt == 0) // 栈为空

// 5. 获取栈大小
int size = tt;

// 6. 清空栈
tt = 0;
```
⚠️ 注意：数组大小必须开够，否则会出现数组越界导致RE或WA。

---

## 七、常见坑点与避坑指南
1. **空栈操作导致RE**：调用 `top()` 和 `pop()` 前必须先判断 `empty()`，这是栈相关代码最常见的运行时错误来源。
2. **混淆pop与top**：`pop()` 只删除不返回值，必须先 `top()` 取值再 `pop()`。
3. **误以为有clear()**：stack 无 `clear` 方法，需用循环弹出或交换空栈。
4. **递归爆栈**：深度超过1e4的递归优先用手动栈模拟，避免系统栈溢出。
5. **指针生命周期**：栈内存储指针时，注意指向的对象是否已被释放，竞赛中优先存值或下标。

---

## 八、选型建议
| 场景 | 推荐选择 |
|------|----------|
| 快速写代码、简单栈逻辑、数据量小 | STL stack，写法简洁不易错 |
| 单调栈、需要访问栈内元素、卡常优化 | 数组模拟栈，灵活高效 |
| 自定义复杂类型、不想手动管理内存 | STL stack，自动扩容安全省心 |