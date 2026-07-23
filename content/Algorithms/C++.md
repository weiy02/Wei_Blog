---
title: C++
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