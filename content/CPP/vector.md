---
title: vector
---

## STL 库

### vector 

```cpp
#include<iostream>
#include<vector>
int main(){
    // 定义与初始化
    vector<int> v;
    // 添加元素到末尾
    vector.push_back(6);
    // 访问第一个元素
    int first = v.front();
    // 访问最后一个元素
    int last = v.back();
    // 删除
    v.pop_back();
    // 获取容器大小
    auto size = v.size();
    // 检查是否为空
    bool isEmpty = v.empty();
    // 清空
    v.clear();
    return 0;
}
```


# C++ deque 基础用法讲解

deque（双端队列，double-ended queue）是 C++ STL 中的顺序容器，核心特点是**头部和尾部都可以 O(1) 时间复杂度插入、删除元素**，兼顾了 vector 的随机访问能力和队列的两端操作特性，是竞赛里处理双端增删场景的常用容器。

---

## 一、基础准备

```cpp
#include <deque>
```

---

## 二、定义与初始化

常见的初始化方式有以下几种：

```cpp
// 1. 定义空的deque
deque<int> dq1;

// 2. 定义包含n个元素的deque（元素默认初始化为0）
deque<int> dq2(5); // 包含5个0

// 3. 定义包含n个指定值的deque
deque<int> dq3(5, 10); // 5个元素，每个都是10

// 4. 拷贝初始化
deque<int> dq4(dq3); // dq4和dq3内容完全一样
```

---

## 三、核心双端操作（最常用）

头尾增删都是 O(1) 复杂度：

```cpp
deque<int> dq;

// 1. 头部插入元素
dq.push_front(10); // dq: [10]
dq.push_front(20); // dq: [20, 10]

// 2. 尾部插入元素
dq.push_back(30);  // dq: [20, 10, 30]
dq.push_back(40);  // dq: [20, 10, 30, 40]

// 3. 头部删除元素（无返回值）
dq.pop_front();    // dq: [10, 30, 40]

// 4. 尾部删除元素（无返回值）
dq.pop_back();     // dq: [10, 30]
```

> 注意：`pop_front()` 和 `pop_back()` 只会删除元素，不会返回被删的值；要获取首尾元素请用 `front()` / `back()`。

---

## 四、元素访问

### 1. 访问首尾元素

```cpp
deque<int> dq = {10, 20, 30};

int head = dq.front(); // 首元素：10
int tail = dq.back();  // 尾元素：30
```

### 2. 下标随机访问

和数组、vector 一样，支持 `[]` 按下标访问，下标从 0 开始：

```cpp
cout << dq[0]; // 输出10
cout << dq[1]; // 输出20

dq[1] = 100;   // 也可以通过下标修改元素
```

> 小提示：deque 也支持 `dq.at(i)` 访问，越界会抛异常，竞赛中基本不用。

---

## 五、大小与清空

```cpp
deque<int> dq = {1,2,3};

// 1. 获取元素个数
int len = dq.size(); // len = 3

// 2. 判断是否为空
bool isEmpty = dq.empty(); // 空返回true，非空返回false

// 3. 清空所有元素
dq.clear(); // 清空后dq.size() == 0
```

---

## 六、遍历方式

### 1. 下标遍历（最直观）

```cpp
for (int i = 0; i < dq.size(); i++) {
    cout << dq[i] << " ";
}
```

### 2. 范围for遍历（C++11及以上，竞赛常用）

```cpp
for (int x : dq) {
    cout << x << " ";
}
```

### 3. 迭代器遍历

```cpp
// 正向遍历
for (auto it = dq.begin(); it != dq.end(); ++it) {
    cout << *it << " ";
}

// 反向遍历（从尾到头）
for (auto it = dq.rbegin(); it != dq.rend(); ++it) {
    cout << *it << " ";
}
```

---

## 七、其他基础操作

### 1. 调整大小

```cpp
dq.resize(10);     // 长度改为10，多出来的元素默认填0
dq.resize(10, 5);  // 长度改为10，多出来的元素填5
```

### 2. 中间插入/删除（了解即可）

deque 也支持 `insert`、`erase` 在中间位置操作，但**时间复杂度是 O(n)**，效率很低，竞赛中尽量不要用。如果需要频繁中间操作，更适合用 list 或其他数据结构。

---

## 八、特点与适用场景

| 容器 | 头部增删 | 尾部增删 | 随机访问 | 适用场景 |
| --- | --- | --- | --- | --- |
| vector | O(n) 慢 | O(1) 快 | O(1) 快 | 只在尾部操作、需要频繁随机访问 |
| deque | O(1) 快 | O(1) 快 | O(1) 较快 | 需要头尾两端频繁增删 |
| queue | O(1) | O(1) | 不支持 | 严格先进先出的队列场景 |

**竞赛典型用法**：

- 双端队列模拟（比如刚才的头尾插入删除+翻转题）
- 滑动窗口最值（单调队列）
- 需要两端进出的模拟题