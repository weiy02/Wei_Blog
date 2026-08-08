---
title: 字符串处理
---

# C++ 算法竞赛中 string 常用用法（极简实用版）
算法竞赛里 `string` 就是**可变长度字符数组**，比 char 数组好用太多，不用管长度、不用手动拷贝，直接当数组用。

---

## 1. 头文件
```cpp
#include <iostream>
#include <string>
using namespace std;
```

---

## 2. 定义与初始化
```cpp
string s;              // 空串
string s = "abc";
string s1(s);          // 拷贝构造
string s2(5, 'a');     // "aaaaa"
```

---

## 3. 访问字符（像数组一样）
```cpp
string s = "hello";
char c = s[0];    // 'h'
s[1] = 'E';       // 变成 "hEllo"
```

- 下标从 **0 开始**
- 越界会 RE，注意长度

---

## 4. 常用成员函数（竞赛高频）
### 长度 / 判空
```cpp
s.size();    // 长度（推荐）
s.length();  // 同上
s.empty();   // 是否为空，返回 bool
```

### 拼接
```cpp
s += "abc";
s += 'x';
s = s1 + s2;
```

### 插入、删除
```cpp
s.insert(pos, "str");   // 在 pos 前插入字符串
s.erase(pos, len);      // 从 pos 删 len 个字符
s.erase(pos);           // 从 pos 删到末尾
```

### 截取子串
```cpp
s.substr(pos, len);
// 从 pos 开始，取 len 个字符
// 不写 len 就取到末尾
```

### 查找
```cpp
s.find("ab");
// 返回第一次出现的下标
// 找不到返回 string::npos
```
常用判断：
```cpp
if (s.find("abc") != string::npos) {
    // 找到了
}
```

### 替换
```cpp
s.replace(pos, len, "new_str");
```

### 清空
```cpp
s.clear();
```

---

## 5. 比较
直接用运算符：
```cpp
if (s1 < s2) …   // 字典序比较
s1 == s2
s1 != s2
```

---

## 6. 与数字互转（竞赛超级常用）
### 字符串 → 数字
```cpp
stoi(s);    // int
stoll(s);   // long long
```

### 数字 → 字符串
```cpp
to_string(x);
```

---

## 7. 遍历字符串
```cpp
// 普通 for
for (int i = 0; i < s.size(); ++i)
    cout << s[i];

// 范围 for
for (char c : s)
    cout << c;
```

---

## 8. 输入输出
```cpp
string s;
cin >> s;        // 读到空格/换行停止
getline(cin, s); // 读一整行（包括空格）
cout << s;
```

注意：`cin` 后用 `getline` 要先吞换行。

---

## 9. 常用技巧
1. **反转字符串**
   ```cpp
   reverse(s.begin(), s.end());
   ```

2. **排序**
   ```cpp
   sort(s.begin(), s.end());
   ```

3. **判断回文**
   ```cpp
   string t(s.rbegin(), s.rend());
   if (s == t) // 回文
   ```

4. **转小写/大写**
   ```cpp
   for (char &c : s) c = tolower(c);
   for (char &c : s) c = toupper(c);
   ```

---

## 10. 常见坑
- `s.size()` 返回**无符号整数**，不要写：
  ```cpp
  for (int i = 0; i <= s.size()-1; ++i)
  ```
  空串会变成巨大数导致死循环 / RE。
  直接写：
  ```cpp
  for (int i = 0; i < s.size(); ++i)
  ```

- 不要和 `scanf/printf` 混用输出字符串，要用 `cout` 或 `s.c_str()`。

---