---
title: Java
---

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

