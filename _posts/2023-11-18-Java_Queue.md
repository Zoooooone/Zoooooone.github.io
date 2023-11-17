---
title: Java集合框架 之 Queue接口
date: 2023-11-18 2:00:00 +0900
categories: [Study notes, Java]
tags: [java, java.util]
---

特点：元素**有序**，**可重复**。包含以下几个常用的实现类：
- [PriorityQueue](#priorityqueue)
  - [构造方法](#构造方法)
  - [常用方法](#常用方法)
  - [遍历方式](#遍历方式)
  - [比较器（Comparator）](#比较器comparator)
- [ArrayDeque](#arraydeque)
  - [构造方法](#构造方法-1)
  - [常用方法](#常用方法-1)
  - [遍历方式](#遍历方式-1)
- [参考](#参考)

这里后两者都实现了Queue接口的子接口Deque，由于LinkedList类已在先前的文章中总结完毕，故在此处省略。

## PriorityQueue
- 基于二叉堆实现
- 按照入队元素的大小重新排序，最小的元素最先出队列（**最小堆**）
- 默认排序方式为**升序排序**
- 线程不安全

### 构造方法
```java
PriorityQueue<E> nums = new PriorityQueue<>();
```

### 常用方法

| 方法类型 | 具体方法 | 描述 |
| --- | --- | --- |
| 添加元素 | `add(E e)` <br> `offer(E e)`  | 向优先队列中添加元素，当队列已满会**抛异常** <br> 向优先队列中添加元素，当队列已满会**返回**`false` |
| 访问元素 | `element()` <br> `peek()` | 获取队头元素，队列为空时**抛异常** <br> 获取队头元素，队列为空时**返回**`null` |
| 删除元素 | `remove()` <br> `poll()` | 删除队头元素并返回，队列为空时**抛异常** <br> 删除队头元素并返回，队列为空时**返回**`null` |
| 其他 | `size()` <br> `contains(E e)` <br> `toArray()` | 返回队列长度 <br> 判断队列中是否包含指定元素 <br> 将队列转化为数组并返回 |

代码示例：
```java
import java.util.*;

public class priorityqueue{
    public static void main(String[] args){
        /* initialization */
        PriorityQueue<Integer> nums = new PriorityQueue<>();

        /* add, offer */
        for (int i = 10; i > 0; i--){
            nums.offer(i);
        }
        print("offer:", nums);
        nums.add(0);
        print("add:", nums);

        /* element, peek */
        print("element(default):", nums.element());
        print("peek(default):", nums.peek());

        /* remove, poll */
        print("remove:", nums.remove());
        print("poll:", nums.poll());

        /* size */
        print("size:", nums.size());

        /* contains */
        print("contains 7:", nums.contains(7));
        print("contains 100:", nums.contains(100));
    }

    public static void print(String prompt, PriorityQueue<Integer> nums){
        System.out.println(String.format("%-30s %-30s", prompt, nums));
    }

    public static void print(String prompt, Object num){
        System.out.println(String.format("%-30s %-30s", prompt, num));
    }

    public static void print(String prompt, boolean contain){
        System.out.println(String.format("%-30s %-30s", prompt, contain));
    }
}
```
输出：
```
offer:                         [1, 2, 5, 4, 3, 9, 6, 10, 7, 8]
add:                           [0, 1, 5, 4, 2, 9, 6, 10, 7, 8, 3]
element(default):              0                             
peek(default):                 0                             
remove:                        0                             
poll:                          1                             
size:                          9                             
contains 7:                    true                          
contains 100:                  false
```

### 遍历方式
遍历队列的方式：
```java
Iterator<Integer> iter = nums.iterator();
while (iter.hasNext()){
    print("iter:", iter.next());
}
```
输出：
```
iter:                          0                             
iter:                          1                             
iter:                          5                             
iter:                          4                             
iter:                          2                             
iter:                          9                             
iter:                          6                             
iter:                          10                            
iter:                          7                             
iter:                          8                             
iter:                          3
```

### 比较器（Comparator）
通过使用Comparator，我们可以自定义队列中元素的排序方式。使用时需要创建自定义的比较器类，令其实现Comparator接口，示例如下：
```java
class CustomComparator implements Comparator<Integer>{
    @Override
    public int compare(Integer n1, Integer n2){
        if (n1 > n2){
            return -1;
        }
        else if (n1 == n2){
             return 0;
        }
        else{ 
            return 1;
        }
    }
}
```
这里看到通过Comparator接口实现的自定义类中存在一个`compare`方法，它的作用是用来定义参数的排序方式。更具体地说，这个方法返回一个具有三种可能性的值 **（正、负、零）**，分别代表第一个参数**大于、小于、等于**第二个参数。而这里可以看到当`n1 > n2`时返回负值，说明此时在这个自定义的比较器类中**正常情况下越大的整数会被识别为越小的值**，也即**倒序**排列。将这个自定义的排序方式应用到优先队列中的方式如下：
```java
PriorityQueue<Integer> nums = new PriorityQueue<>(new CustomComparator());
```
此时这个优先队列实际上成为了一个**最大堆**。最后看一下实现的效果：
```java
for (int i = 0; i < 10; i++){
    nums.offer(i);
}
System.out.println(String.format("%-10s %-10s", "nums:", nums));
```
输出：
```
nums:      [9, 8, 5, 6, 7, 1, 4, 0, 3, 2]
```

## ArrayDeque
- 基于数组实现
- **查找快，增删慢**
- 线程不安全
- 可以用作**栈**，效率高于Stack
- 可以用作**队列**，效率高于LinkedList

### 构造方法
```java
ArrayDeque<Integer> nums = new ArrayDeque<>();
```

### 常用方法

| 方法类型 | 具体方法 | 描述 | 是否抛异常 | 是否返回值 |
| --- | --- | --- | --- | --- | 
| 添加元素 | `add(E e)` <br> `addFirst(E e)` <br> `addLast(E e)` | 将指定元素添加至队尾 <br> 将指定元素添加至队头 <br> 将指定元素添加至队尾（与`add()`等效） | 是 | 否，添加失败时抛异常 |
| 添加元素 | `offer(E e)` <br> `offerFirst(E e)` <br> `offerLast(E e)` | 将指定元素添加至队尾 <br> 将指定元素添加至队头 <br> 将指定元素添加至队尾 | 否 | 是，添加失败则返回`false`反之`true` |
| 访问元素 | `getFirst()` <br> `getLast()` | 返回队头元素 <br> 返回队尾元素 | 是 | 是，队列为空时抛异常 |
| 访问元素 | `peek()` <br> `peekFirst()` <br> `peekLast()` | 返回队头元素 <br> 返回队头元素（与`peek()`等效） <br> 返回队尾元素 | 否 | 是，队列为空时返回`null` |
| 删除元素 | `remove()` <br> `removeFirst()` <br> `removeLast()` | 删除并返回队头元素 <br> 删除并返回队头元素（与`remove()`等效）<br> 删除并返回队尾元素 | 是 | 是，队列为空时抛异常 |
| 删除元素 | `poll()` <br> `pollFirst()` <br> `pollLast()` | 删除并返回队头元素 <br> 删除并返回队头元素（与`poll()`等效）<br> 删除并返回队尾元素 | 否 | 是，队列为空时返回`null` |

代码示例：
```java
import java.util.*;

public class arraydeque {
    public static void main(String[] args){
        /* initialization */
        ArrayDeque<Integer> nums = new ArrayDeque<>();
        nums.add(0);
        print("initial arrayqueue:", nums);
        System.out.println("");
        
        /* add */
        nums.add(1);
        print("add 1:", nums);
        nums.addFirst(2);
        print("addFirst 2:", nums);
        nums.addLast(3);
        print("addLast 3:", nums);
        System.out.println("");

        /* offer */
        nums.offer(4);
        print("offer 4:", nums);
        nums.offerFirst(5);
        print("offerFirst 5:", nums);
        nums.offerLast(6);
        print("offerLast 6:", nums);
        System.out.println("");

        /* get */
        print("getFirst:", nums.getFirst());
        print("getLast:", nums.getLast());
        System.out.println("");

        /* peek */
        print("peek:", nums.peek());
        print("peekFirst:", nums.peekFirst());
        print("peekLast:", nums.peekLast());
        System.out.println("");

        /* remove */
        print("remove:", nums.remove());
        print("removeFirst:", nums.removeFirst());
        print("removeLast:", nums.removeLast());
        System.out.println("");

        /* poll */
        print("poll:", nums.poll());
        print("pollFirst:", nums.pollFirst());
        print("pollLast:", nums.pollLast());
    }

    public static void print(String prompt, ArrayDeque<Integer> nums){
        System.out.println(String.format("%-20s %-30s", prompt, nums));
    }

    public static void print(String prompt, Integer num){
        System.out.println(String.format("%-20s %-30s", prompt, num));
    }
}
```
输出：
```
initial arrayqueue:  [0]                           

add 1:               [0, 1]                        
addFirst 2:          [2, 0, 1]                     
addLast 3:           [2, 0, 1, 3]                  

offer 4:             [2, 0, 1, 3, 4]               
offerFirst 5:        [5, 2, 0, 1, 3, 4]            
offerLast 6:         [5, 2, 0, 1, 3, 4, 6]         

getFirst:            5                             
getLast:             6                             

peek:                5                             
peekFirst:           5                             
peekLast:            6                             

remove:              5                             
removeFirst:         2                             
removeLast:          6                             

poll:                0                             
pollFirst:           1                             
pollLast:            4
```

### 遍历方式
同样还是采用Iterator：
```java
Iterator<Integer> iter = nums.iterator();
while (iter.hasNext()){
    print("iter:", iter.next());
}
```
输出：
```
iter:                5                             
iter:                2                             
iter:                0                             
iter:                1                             
iter:                3                             
iter:                4                             
iter:                6
```

## 参考
- [https://forthe77.github.io/2019/03/28/collection-frame-diagram/](https://forthe77.github.io/2019/03/28/collection-frame-diagram/)
- [https://www.cainiaojc.com/java/java-priorityqueue.html](https://www.cainiaojc.com/java/java-priorityqueue.html)
- [https://www.cainiaojc.com/java/java-arraydeque.html](https://www.cainiaojc.com/java/java-arraydeque.html)