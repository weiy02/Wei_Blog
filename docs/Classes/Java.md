---
title: Java
---

## Java变量命名规则

1. 可以包含字母，数字，`_`，`$`
2. 不可以包含Java中的关键字
3. 不能以数字开头
4. Java区分大小写

## 数据类型

### 基本数据类型

整数类型

| 类型  | 字节  | 大致范围 | 精确范围 |
| ----- | ----- | -------- | -------- |
| byte  | 1字节 |          |          |
| short | 2字节 |          |          |
| int   | 4字节 |          |          |
| long  | 8字节 |          |          |

浮点类型

| 类型  | 字节  | 大致范围 | 精确范围 |
| ----- | ----- | -------- | -------- |
| float  | 4字节 |          |          |
| double | 8字节 |          |          |

字符类型

| 类型  | 字节  | 大致范围 | 精确范围 |
| ----- | ----- | -------- | -------- |
| char  | 2字节 |          |          |

布尔类型

boolean

### 引用数据类型

数组
创建数组的方式：

1. 创建定长数组(动态初始化数组)

```java
//该情况下给所有元素赋默认值为0
int [] num = new int[1000];
```

2. 创建指定元素的数组（静态初始化数组）

```java
int [] num = {1,2,3,4,5};
```

```java
int [] num = new int[]{1,2,3,4,5};
```

!!! note
    类、接口详细讲解见下面的[面向对象编程](#oop)部分。

    枚举、注解期末考试考不到。

### 强制类型转换

## 修饰符

### 访问修饰符

|符号||||
|----|----|----|----|
|public||||
|private||||
|protected||||

### 非访问修饰符

## 运算符
`+`、`-`、`*`、`/`、`++`、`--`、`=`等常见的运算符不再讲解

对于==只能判断基本数据类型是否相等然后返回布尔值
对于引用类型的判断需要使用`var_name1.equals(var_name2)`的形式进行判断


## 循环结构

`for`循环语句

```java
for(初始化;结束条件;更新条件){
    //循环语句，只有一句的时候可以省略花括号
}
```

`for-each`循环（增强`for`循环）

```java
for(循环变量:循环体){

}
```

`while`循环

```java
while(判断条件){

}
```

## 条件语句

## 分支语句

## 面向对象编程OOP {#oop}

### 创建对象

```java
Person per = new Person();
```
左边为引用类型（编译时类型）决定了可以调用那些方法跟属性

右边为对象类型（运行时类型）堆内存中真正创建的对象，程序运行时实际上是执行的这个逻辑

场景一：普通类引用（左右一样）
```java
class Person {
    public void say() {
        System.out.println("我是人");
    }
}

// 左右类型相同
Person p = new Person();
p.say(); 
```
引用和对象是同一个类，能调用该类所有非私有成员，编译、运行完全一致。

场景二：父子类（向上转型）

```java
// 父类
class Person {
    public void say() {
        System.out.println("父类：我是人");
    }
    public void work() {
        System.out.println("父类：工作");
    }
}

// 子类 Student 继承 Person
class Student extends Person {
    // 重写父类方法
    @Override
    public void say() {
        System.out.println("子类：我是学生");
    }
    // 子类独有方法
    public void study() {
        System.out.println("子类：学习");
    }
}
```
1.成员方法编译看左边，运行看右边
2.成员变量不存在重写编译运行都看左边
调用对象的方法
```java
p.say();   // 编译看Person有say()，运行执行Student的say()
// 输出：子类：我是学生

p.work();  // 子类没有重写，执行父类原方法
// 输出：父类：工作
p.study();
//编译错误

//向下转型（强制类型转换）
Student s = (Student) p;
s.study(); // 正常调用

class Person {
    String name = "人类";
}
class Student extends Person {
    String name = "学生";
}

Person p = new Student();
System.out.println(p.name); // 输出：人类（只看左边父类）
```
场景三：接口+实现类

### 抛出异常

### 内部类

## 常用实用类

## 常用算法思想技巧