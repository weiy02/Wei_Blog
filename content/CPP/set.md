---
title: C++ 算法竞赛中 set 用法精讲
---
# C++ 算法竞赛中 set 用法精讲

`set` 是 **STL 有序集合**，内部基于**红黑树**实现，核心特点：

- 元素**自动排序**（默认升序）
- 元素**唯一不重复**
- 插入、删除、查找均为 **O(log n)**
- 不支持下标访问 `[]`，只能用迭代器

竞赛中常用于：**去重 + 排序**、维护有序序列、二分查找、维护第 k 大/小等。

---

## 1. 头文件与定义
```cpp
#include <set>
using namespace std;

set<int> s;                  // int 升序 set
set<int, greater<int>> s;   // 降序 set
set<string> ss;             // 字符串 set
```

---

## 2. 常用基础操作
### 插入元素
```cpp
s.insert(x);      // 插入 x，重复则自动忽略
s.emplace(x);     // 同 insert，效率略高（竞赛常用）
```

### 删除元素
```cpp
s.erase(x);       // 删除值为 x 的所有元素（set 只有 0/1 个）
s.erase(it);      // 删除迭代器 it 指向的元素（O(1)）
s.clear();        // 清空 set
```

### 查询大小与判空
```cpp
s.size();         // 元素个数
s.empty();        // 是否为空，空返回 true
```

### 查找元素
```cpp
auto it = s.find(x);
if (it != s.end()) {
    // 找到 x
} else {
    // 没找到
}
```
`find` 找不到会返回 `s.end()`，**千万不要直接解引用**。

---

## 3. 迭代器遍历
```cpp
// 正向遍历（升序）
for (auto it = s.begin(); it != s.end(); ++it) {
    cout << *it << ' ';
}

// 范围 for（最常用）
for (int x : s) {
    cout << x << ' ';
}

// 反向遍历（降序）
for (auto it = s.rbegin(); it != s.rend(); ++it) {
    cout << *it << ' ';
}
```

---

## 4. 竞赛高频：二分相关函数
`set` 自带二分，比手写 `lower_bound` 更快更稳。

### lower_bound(x)
返回 **第一个 ≥ x** 的元素迭代器。
```cpp
auto it = s.lower_bound(x);
```

### upper_bound(x)
返回 **第一个 > x** 的元素迭代器。
```cpp
auto it = s.upper_bound(x);
```

### 经典用法：找前驱 / 后继
```cpp
// 后继：第一个 > x 的数
auto it = s.upper_bound(x);
if (it != s.end()) ans = *it;

// 前驱：最后一个 < x 的数
auto it = s.lower_bound(x);
if (it != s.begin()) {
    --it;
    ans = *it;
}
```

---

## 5. 特殊：multiset（可重复有序集合）
竞赛中如果**需要重复元素**，用 `multiset`：

- 用法和 set 几乎一样
- 允许重复值
- `erase(x)` 会删除**所有** x
- 想只删一个要用迭代器：`s.erase(s.find(x))`

```cpp
multiset<int> ms;
ms.insert(2);
ms.insert(2);
ms.erase(2);      // 两个 2 都没了
ms.erase(ms.find(2)); // 只删一个
```

---

## 6. 算法竞赛典型使用场景
1. **离线去重+排序**
   ```cpp
   set<int> st(a, a + n);
   vector<int> v(st.begin(), st.end());
   ```
2. **动态维护有序集合**（实时插入、查询最值）
   - 最小值：`*s.begin()`
   - 最大值：`*s.rbegin()`
3. **离散化**（配合 lower_bound 做坐标压缩）
4. **模拟堆/维护有序窗口**

---

## 7. 注意坑点（竞赛必看）
1. **不能修改元素**
   迭代器是 `const` 的，不能 `*it = 5`，要改只能删了重插。
2. `find` 找不到返回 `end()`，直接 `*s.find(x)` 会 RE
3. `multiset` 用值删除会删全部，务必小心
4. 速度：`set` 比数组、vector 慢，数据量大优先离散化+二分