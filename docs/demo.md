---
title: 样式演示
date: 2026-06-11
tags: [demo, markdown, 测试]
---

# Markdown 样式演示

这篇文章展示本站支持的各种 Markdown 排版样式。

---

## 1. 标题层级

# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题

---

## 2. 文本样式

普通文字，**加粗文字**，*斜体文字*，***加粗斜体***，~~删除线文字~~。

行内代码：`pip install mkdocs-material`。

下标：H~2~O，上标：X^2^。

==高亮文字==。

键盘快捷键：<kbd>Ctrl</kbd> + <kbd>C</kbd>，<kbd>F12</kbd>。

:smile: :heart: :rocket: :warning: :fire: :+1:

---

## 3. 引用

> 这是一段引用文字。
>
> 引用可以有多行。
>
> > 还可以嵌套引用。
>
> —— 某位名人

---

## 4. 列表

### 无序列表

- 苹果
- 香蕉
- 樱桃
  - 车厘子
  - 樱桃番茄
- 榴莲

### 有序列表

1. 第一步：准备材料
2. 第二步：开始烹饪
    1. 切菜
    2. 炒菜
3. 第三步：装盘

### 任务列表

- [x] 已完成的任务
- [ ] 未完成的任务
- [ ] 另一个待办事项

---

## 5. 代码块

### Python

```python
def fibonacci(n: int) -> list:
    """生成斐波那契数列"""
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    return fib[:n]

# 生成前 10 项
result = fibonacci(10)
print(result)  # [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

### JavaScript

```javascript
// 阶乘函数
const factorial = (n) => {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
};

console.log(`5! = ${factorial(5)}`);
```

### 带有文件名的代码块

```c title="hello.c"
#include <stdio.h>

int main() {
    printf("Hello, World!\n");
    return 0;
}
```

### 行号高亮

```python linenums="1" hl_lines="3 5-6"
def greet(name):
    """向某人打招呼"""
    message = f"你好，{name}！"
    print(message)
    return message

greet("世界")
```

---

## 6. 表格

| 语言 | 类型 | 难度 | 用途 |
|:---|:---:|:---:|---|
| Python | 动态 | ⭐ 低 | 数据科学、Web |
| Rust | 静态 | ⭐⭐⭐ 高 | 系统编程 |
| Go | 静态 | ⭐⭐ 中 | 后端开发 |
| JavaScript | 动态 | ⭐⭐ 中 | 前端开发 |

| 左对齐 | 居中对齐 | 右对齐 | 默认 |
|:---|---:|:---:|---|
| A | B | C | D |
| 1 | 2 | 3 | 4 |

---

## 7. 注脚

这是一段文字[^1]，这里有另一个注脚[^2]。

[^1]: 这是注脚的内容，显示在页面底部。
[^2]: 可以包含 **富文本** 和 `代码`。

---

## 8. 定义列表

Python
: 一种解释型、面向对象的高级编程语言。
: 以简洁清晰的语法著称。

MkDocs
: 一个快速的静态站点生成器，专为项目文档而设计。

---

## 9. 警告框（Admonition）

!!! note
    这是一个 note 类型的提示框。

!!! tip
    这是一个小技巧。

!!! warning
    这是一个警告信息。

!!! danger
    这是一个危险提示！

!!! info
    这是一条一般信息。

!!! success
    操作成功！

!!! failure
    操作失败。

!!! bug
    这里有一个 Bug。

!!! quote
    这是一段引用框。

### 带标题的警告框

!!! note "自定义标题"
    可以给提示框自定义标题文字。

### 可折叠警告框

??? note "点击展开"
    这是折叠的内容，默认是折叠状态。

???+ tip "默认展开"
    这个默认是展开状态，点击可以折叠。

---

## 10. 选项卡

=== "Python"
    ```python
    print("Hello")
    ```

=== "JavaScript"
    ```javascript
    console.log("Hello");
    ```

=== "Go"
    ```go
    package main
    import "fmt"
    func main() { fmt.Println("Hello") }
    ```

=== "Rust"
    ```rust
    fn main() {
        println!("Hello");
    }
    ```

---

## 11. 图片

![占位图](https://picsum.photos/seed/1/800/300 "鼠标悬停提示文字")

*图片可以带标题文字*

---

## 12. 链接

- [普通链接](https://www.mkdocs.org)
- <https://squidfunk.github.io/mkdocs-material/>（自动链接）
- `example@email.com`（自动识别邮箱）

---

## 13. 分割线

上面已经出现过很多次了：

---

---

## 14. 表情符号

:smile: :heart: :rocket: :computer: :book: :bulb: :fire: :warning: :memo: :chart_with_upwards_trend:

---

## 15. 进度条

`[=0%]` `[=25%]` `[=50%]` `[=75%]` `[=100%]`

[=0%]  [=25%]  [=50%]  [=75%]  [=100%]

---

## 16. 脚标与上标

- 水分子：H~2~O
- 面积单位：m^2^
- 立方：X^3^ + Y^3^ = Z^3^

---

## 17. 标记与修饰

这里是一段文字，其中 ==这部分是被高亮的==，非常醒目。

`ins` 用于插入文本，~~删除线~~（~~文本~~）用于删除文本。

---

## 18. 列表嵌套复杂结构

- 📦 **Python 环境管理**
    - `pip` — 包管理器
    - `virtualenv` — 虚拟环境
    - `uv` — 新一代包管理器（⭐ 推荐）
        > uv 比 pip 快 10-100 倍，用 Rust 编写。
    - 示例操作：
        ```bash
        uv venv
        source .venv/bin/activate
        uv pip install mkdocs-material
        ```

---

## 19. 内联高亮

行内代码 `print("hello")` 高亮显示。

这是行内代码 `pip install` 的效果。

`var` 变量名也会被高亮。

---

## 20. 脚标组合示例

这是一个综合段落，包含了**加粗**、*斜体*、`代码`、~~删除~~、H~2~O、X^2^ 和 ==高亮== 等多种样式。

---

以上就是本站支持的大部分 Markdown 样式。你可以参考这篇文章来编写自己的博客内容！
