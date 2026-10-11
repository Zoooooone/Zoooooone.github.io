---
title: 关于矩阵求导（其一）
date: 2023-08-22 23:24:00 +0900
categories: [Study notes, Math]
tags: [machine learning, math, matrix calculus]     # TAG names should always be lowercase
math: true
---

## 概念准备
在进行矩阵求导之前，我们首先需要做一些关于概念上的铺垫。主要分为以下两个部分：
- 函数与变元的种类
- 分子布局与分母布局
  
### 函数与变元的种类
这里的种类指的就是**标量、向量和矩阵**这三种。在本文后续内容中对于这三种形式的符号表达都遵循如下定义:
- 标量，用正文字体小写字母表示，例如： 
$$
x, y
$$

- 向量，用粗体小写字母表示，例如：
$$
\mathbf{x}_{n \times 1} = \begin{pmatrix} x_1, x_2, \cdots, x_n \end{pmatrix}^T
$$

- 矩阵，用粗体大写字母表示，例如：
$$
\mathbf{X}_{m \times n}
=
\begin{pmatrix}
    x_{11} & x_{12} & \cdots & x_{1n} \\
    x_{21} & x_{22} & \cdots & x_{2n} \\
    \vdots & \vdots & \ddots & \vdots \\
    x_{m1} & x_{m2} & \cdots & x_{mn}
\end{pmatrix}
$$

接下来是具体分类：
1. 函数为**标量**，称之为**实值标量函数**，根据变元种类分为以下三种：
   - 变元为**标量**，例:
  
   $$
   f(x) = x^2
   $$

   - 变元为**向量**， 例:
   
   $$
   \begin{aligned}
        & \mathbf{x}_{3 \times 1} = \begin{pmatrix} x_1, x_2, x_3 \end{pmatrix}^T 
        \\[5mm]
        & f(\mathbf{x}) = x_1^2 + x_2^2 + x_3^2
   \end{aligned}
   $$

   - 变元为**矩阵**， 例：
   
   $$
   \begin{aligned}
        \mathbf{X}_{2 \times 3} 
        &=
        \begin{pmatrix}
            x_{11} & x_{12} & x_{13} \\
            x_{21} & x_{22} & x_{23}
        \end{pmatrix} 
        \\[5mm]
        f(\mathbf{X})
        &=
        x_{11}^2 + x_{12} + x_{13} + x_{21} + x_{22} + x_{23}
   \end{aligned}
   $$

2. 函数为**向量**，称之为**实向量函数**，根据变元种类分为以下三种：
   - 变元为**标量**， 例：
   
   $$
   \mathbf{f}_{3 \times 1}(x) =
   \begin{pmatrix}
       f_1(x) \\ f_2(x) \\ f_3(x)
   \end{pmatrix} =
   \begin{pmatrix}
       x \\ x^2 \\ x^3
   \end{pmatrix}
   $$

   - 变元为**向量**， 例：
   
   $$
   \begin{aligned}
        \mathbf{x}_{3 \times 1} 
        &= 
        \begin{pmatrix} x_1 & x_2 & x_3 \end{pmatrix}^T 
        \\[5mm]
        \mathbf{f}_{3 \times 1}(\mathbf{x}) 
        &=
        \begin{pmatrix}
            f_1(\mathbf{x}) \\ f_2(\mathbf{x}) \\ f_3(\mathbf{x})
        \end{pmatrix} =
        \begin{pmatrix}
            x_1 + x_2 \\ x_2 + x_3 \\ x_3 + x_1
        \end{pmatrix}
   \end{aligned}
   $$

   - 变元为**矩阵**， 例：
   
   $$
   \begin{aligned}
        \mathbf{X}_{2 \times 3} 
        &=
        \begin{pmatrix}
            x_{11} & x_{12} & x_{13} \\
            x_{21} & x_{22} & x_{23}
        \end{pmatrix} 
        \\[7mm]
        \mathbf{f}_{3 \times 1}(\mathbf{X}) 
        &=
        \begin{pmatrix}
            f_1(\mathbf{\mathbf{X}}) \\ f_2(\mathbf{\mathbf{X}}) \\ f_3(\mathbf{\mathbf{X}})
        \end{pmatrix} 
        \\[7mm]
        &=
        \begin{pmatrix}
            x_{11} + x_{12} + x_{21}^2 \\ x_{13} + x_{21} + x_{22}^2 \\ x_{22} + x_{23} + x_{23}^2
        \end{pmatrix}
   \end{aligned}
   $$

3. 函数为**矩阵**， 称之为**实矩阵函数**，根据变元种类分为以下三种：
   - 变元为**标量**， 例：
   
   $$
   \begin{aligned}
        \mathbf{F}_{2 \times 3}(x)
        &=
        \begin{pmatrix}
            f_{11}(x) & f_{12}(x) & f_{13}(x) \\
            f_{21}(x) & f_{22}(x) & f_{23}(x)
        \end{pmatrix} 
        \\[5mm]
        &=
        \begin{pmatrix}
            x & 2x & 3x \\
            x^2 & 2x^2 & 3x^3
        \end{pmatrix}
   \end{aligned}
   $$

   - 变元为**向量**， 例：
   
   $$
   \begin{aligned}
        \mathbf{x}_{3 \times 1}
        &=
        \begin{pmatrix}
            x_{11} & x_{12} & x_{13}
        \end{pmatrix}^T
        \\[5mm]
        \mathbf{F}_{2 \times 3}(\mathbf{x})
        &=
        \begin{pmatrix}
            f_{11}(\mathbf{x}) & f_{12}(\mathbf{x}) & f_{13}(\mathbf{x}) \\
            f_{21}(\mathbf{x}) & f_{22}(\mathbf{x}) & f_{23}(\mathbf{x})
        \end{pmatrix} 
        \\[5mm]
        &=
        \begin{pmatrix}
            x_{11} + x_{12} + x_{13} & 2x_{11} + x_{12} + x_{13} & 3x_{11} + x_{12} + x_{13} \\
            4x_{11} + x_{12} + x_{13} & 5x_{11} + x_{12} + x_{13} & 6x_{11} + x_{12} + x_{13}
        \end{pmatrix}
   \end{aligned}
   $$

   - 变元为**矩阵**， 例：
   
   $$
   \begin{aligned}
        \mathbf{X}_{2 \times 3} 
        &=
        \begin{pmatrix}
            x_{11} & x_{12} & x_{13} \\
            x_{21} & x_{22} & x_{23}
        \end{pmatrix} 
        \\[7mm]
        \mathbf{F}_{3 \times 2}(\mathbf{X})
        &=
        \begin{pmatrix}
            f_{11}(\mathbf{X}) & f_{12}(\mathbf{X}) \\ 
            f_{21}(\mathbf{X}) & f_{22}(\mathbf{X}) \\ 
            f_{31}(\mathbf{X}) & f_{32}(\mathbf{X})
        \end{pmatrix} 
        \\[7mm]
        &=
        \begin{pmatrix}
            x_{11} + x_{12} + x_{13} + x_{21} + x_{22} + x_{23} & 2x_{11} + x_{12} + x_{13} + x_{21} + x_{22} + x_{23} \\ 
            3x_{11} + x_{12} + x_{13} + x_{21} + x_{22} + x_{23} & 4x_{11} + x_{12} + x_{13} + x_{21} + x_{22} + x_{23} \\ 
            5x_{11} + x_{12} + x_{13} + x_{21} + x_{22} + x_{23} & 6x_{11} + x_{12} + x_{13} + x_{21} + x_{22} + x_{23}
        \end{pmatrix}
   \end{aligned}
   $$

最后关于函数和变元的种类，可以总结如下：

| 函数 \ 变元 | 标量变元 | 向量变元 | 矩阵变元 |
| --- | --- | --- | --- |
| 实值标量函数 | $f(x)$| $f(\mathbf{x})$ | $f\mathbf{(X)}$ |
| 实向量函数 | $\mathbf{f}(x)$ | $\mathbf{f}(\mathbf{x})$ | $\mathbf{f}(\mathbf{X})$ |
| 实矩阵函数 | $\mathbf{F}(x)$ | $\mathbf{F}(\mathbf{x}) $ | $\mathbf{F}(\mathbf{X})$ |

### 分子布局与分母布局
进行矩阵求导的时候实际上是将函数中的每一个分量依次对变元中的每一个分量求偏导，并将所有求偏导的结果排列起来，根据不同的排列规则分为**分子布局** (Numerator Layout) 和 **分母布局** (Denominator Layout)。举一个例子：

$$
\mathbf{x} = 
\begin{pmatrix}
    x_1 \\ x_2 \\ \vdots \\ x_n
\end{pmatrix}_{n \times 1}
, \qquad
\frac{\partial{f}}{\partial{\mathbf{x}}} =
\begin{pmatrix}
    \frac{\partial{f}}{\partial{x_1}} \\ \frac{\partial{f}}{\partial{x_2}} \\ \vdots \\ \frac{\partial{f}}{\partial{x_n}}
\end{pmatrix}_{n \times 1}
$$

这里的 $f(\mathbf{x})$ 是一个实值标量函数，而变元 $\mathbf{x}$ 是一个 $n \times 1$ 的列向量，求完导后的结果也是一个 $n \times 1$ 的列向量。如果把这里求导的式子 $\frac{\partial{f}}{\partial{\mathbf{x}}}$ 视作分式的话可以发现，求导结果的维度与分母 $\mathbf{x}$ 一致，所以这里采用的是**分母布局**。再举一个例子：

$$
\mathbf{x} = 
\begin{pmatrix}
    x_1 \\ x_2 \\ \vdots \\ x_n
\end{pmatrix}_{n \times 1}
, \qquad
\mathbf{f} = 
\begin{pmatrix}
    f_1 \\ f_2 \\ \vdots \\ f_m
\end{pmatrix}_{m \times 1}
, \qquad
\frac{\partial{\mathbf{f}}}{\partial{\mathbf{x}}} =
\large
\begin{pmatrix}
    \frac{\partial{\color{royalblue}f_1}}{\partial{\color{orange}x_1}} & \frac{\partial{\color{royalblue}{f_2}}}{\partial{x_1}} & \color{royalblue}{\cdots} & \frac{\partial{\color{royalblue}{f_m}}}{\partial{x_1}} \\
    \frac{\partial{f_1}}{\partial{\color{orange}{x_2}}} & \frac{\partial{f_2}}{\partial{x_2}} & \cdots & \frac{\partial{f_m}}{\partial{x_2}} \\
    \color{orange}{\vdots} & \vdots & \ddots & \vdots \\
    \frac{\partial{f_1}}{\partial{\color{orange}{x_n}}} & \frac{\partial{f_2}}{\partial{x_n}} & \cdots & \frac{\partial{f_m}}{\partial{x_n}} 
\end{pmatrix}_{\color{orange}{n} \times \color{royalblue}{m}}
$$

这里的 $\mathbf{f}(\mathbf{x})$ 是一个 $m \times 1$ 的实向量函数，而变元 $\mathbf{x}$ 是一个 $n \times 1$ 的列向量，求导的结果是一个 $\color{orange}{n} \times \color{royalblue}{m}$ 的矩阵。我们可以看到这个结果符合变元 $\mathbf{x}$ 的排列方式（橙色部分），而函数 $\mathbf{f}$ 则转变为行向量的排列方式（蓝色部分），也就是转置了。这里采用的还是**分母布局**。如果采用**分子布局**的话：

$$
\frac{\partial{\mathbf{f}}}{\partial{\mathbf{x}}} =
\large
\begin{pmatrix}
    \frac{\partial{\color{royalblue}{f_1}}}{\partial{\color{orange}{x_1}}} & \frac{\partial{f_1}}{\partial{\color{orange}{x_2}}} & \color{orange}{\cdots} & \frac{\partial{f_1}}{\partial{\color{orange}{x_n}}} \\
    \frac{\partial{\color{royalblue}{f_2}}}{\partial{x_1}} & \frac{\partial{f_2}}{\partial{x_2}} & \cdots & \frac{\partial{f_2}}{\partial{x_n}} \\
    \color{royalblue}{\vdots} & \vdots & \ddots & \vdots \\
    \frac{\partial{\color{royalblue}{f_m}}}{\partial{x_1}} & \frac{\partial{f_m}}{\partial{x_2}} & \cdots & \frac{\partial{f_m}}{\partial{x_n}} 
\end{pmatrix}_{\color{royalblue}{m} \times \color{orange}{n}}
$$

结果就是一个 $\color{royalblue}{m} \times \color{orange}{n}$ 的矩阵，变元 $\mathbf{x}$ 发生了转置。

| 函数 \ 变元 | 标量变元 | 向量变元 | 矩阵变元 |
| --- | --- | --- | --- |
| 实值标量函数 | $f(x)$| $\color{red}{f(\mathbf{x})}$ | $\color{red}{f\mathbf{(X)}}$ |
| 实向量函数 | $\color{red}{\mathbf{f}(x)}$ | $\color{red}{\mathbf{f}(\mathbf{x})}$ | $\mathbf{f}(\mathbf{X})$ |
| 实矩阵函数 | $\color{red}{\mathbf{F}(x)}$ | $\mathbf{F}(\mathbf{x}) $ | $\mathbf{F}(\mathbf{X})$ |

本文后续关于求导的部分只讨论上表中标注为红色的情况，那么关于求导的布局可以通俗地总结为：**矩阵求导结果是什么布局由分子、分母中没有发生转置的那一个决定。**

---
<div id="v-by-v"></div>

## 矩阵求导公式

以下表中所有的**向量**初始状态都默认为**列向量**。例如：

$$
\mathbf{x} = 
\begin{pmatrix}
    x_1 \\ \vdots \\ x_n
\end{pmatrix}_{n \times 1}
$$

### 向量对向量 (Vector-by-vector)

| Codition | Expression | Numerator layout | Denominator layout | Proof |
| :---: | :---: | :---: | :---: | :---: |
| $\large \mathbf{a}$ is not a function of $\large \mathbf{x}$ | $\Large \frac{\partial{\mathbf{a}}}{\partial{\mathbf{x}}}$ | $\large \mathbf{0}$ | $\large \mathbf{0}$ | [Proof 1-1](#1-1) | <!-- 1-1 --->
|  | $\Large \frac{\partial{\mathbf{x}}}{\partial{\mathbf{x}}}$ | $\large \mathbf{I}$ | $\large \mathbf{I}$ |  | <!----->
| $\large \mathbf{A}$ is not a funtion of $\large \mathbf{x}$ | $\Large \frac{\partial{\mathbf{Ax}}}{\partial{\mathbf{x}}}$ | $\large \mathbf{A}$ | $\large \mathbf{A}^T$ | [Proof 1-2 ](#1-2) | <!-- 1-2 --->
| $\large \mathbf{A}$ is not a funtion of $\large \mathbf{x}$ | $\Large \frac{\partial{\mathbf{x}^T\mathbf{A}}}{\partial{\mathbf{x}}}$ | $\large \mathbf{A}^T$ | $\large \mathbf{A}$ | [Proof 1-3](#1-3) | <!-- 1-3 -->
| $\large a$ is not a function of $\large \mathbf{x}$, <br> $\mathbf{u} = \mathbf{u}(\mathbf{x})$ | $\Large \frac{\partial{a\mathbf{u}}}{\partial{\mathbf{x}}}$ | $a$ $\large \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}$ | $a$ $\large \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}$ | [Proof 1-4](#1-4) | <!-- 1-4 -->
| $v = v(\mathbf{x}), \; \mathbf{u} = \mathbf{u}(\mathbf{x})$ | $\Large \frac{\partial{v \mathbf{u}}}{\partial{\mathbf{x}}}$ | $v$ $\large \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}} +$ $\mathbf{u}$ $\large \frac{\partial{v}}{\partial{\mathbf{x}}}$ | $v$ $\large \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}} + \frac{\partial{v}}{\partial{\mathbf{x}}}$ $\mathbf{u}^T$ | [Proof 1-5](#1-5) | <!-- 1-5 -->
| $\large \mathbf{A}$ is not a function of $\large \mathbf{x}$, <br> $\mathbf{u} = \mathbf{u}(\mathbf{x})$ | $\Large \frac{\partial{\mathbf{Au}}}{\partial{\mathbf{x}}}$ | $\mathbf{A}$ $\large \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}$ | $\large \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}$ $\mathbf{A}^T$ | [Proof 1-6](#1-6) | <!-- 1-6 -->
| $\mathbf{u} = \mathbf{u}(\mathbf{x}), \; \mathbf{v} = \mathbf{v}(\mathbf{x})$ | $\Large \frac{\partial{(\mathbf{u} + \mathbf{v})}}{\partial{\mathbf{x}}}$ | $\large \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}} + \frac{\partial{\mathbf{v}}}{\partial{\mathbf{x}}}$ | $\large \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}} + \frac{\partial{\mathbf{v}}}{\partial{\mathbf{x}}}$ |  |
| $\mathbf{u} = \mathbf{u}(\mathbf{x})$ | $\Large \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{x}}}$ | $\large \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{u}}} \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}$ | $\large \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}} \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{x}}}$ | [Proof 1-7](#1-7) | <!-- 1-7 -->
| $\mathbf{u} = \mathbf{u}(\mathbf{x})$ | $\Large \frac{\partial{\mathbf{f}(\mathbf{g}(\mathbf{u}))}}{\partial{\mathbf{x}}}$ | $\large \frac{\partial{\mathbf{f}(\mathbf{g})}}{\partial{\mathbf{g}}} \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{u}}} \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}$ | $\large \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}} \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{u}}} \frac{\partial{\mathbf{f}(\mathbf{g})}}{\partial{\mathbf{g}}}$ | [Proof 1-8](#1-8) | <!-- 1-8 -->

<div id="s-by-v"></div>

### 标量对向量 (Scalar-by-vector)

| Codition | Expression | Numerator layout <br> (row vector) | Denominator layout <br> (column vector) | Proof |
| :---: | :---: | :---: | :---: | :---: |
| $\large a$ is not a function of $\large \mathbf{x}$ | $\Large \frac{\partial{a}}{\partial{\mathbf{x}}}$ | $\large \mathbf{0}^T$ | $\large \mathbf{0}$ |  | <!---->
| $\large a$ is not a function of $\large \mathbf{x}$, <br> $u = u(\mathbf{x})$ | $\Large \frac{\partial{au}}{\partial{\mathbf{x}}}$ | $\large a \frac{\partial{u}}{\partial{\mathbf{x}}}$ | $\large a \frac{\partial{u}}{\partial{\mathbf{x}}}$ |  | <!---->
| $u = u(\mathbf{x}), \; v = v(\mathbf{x})$ | $\Large \frac{\partial{(u + v)}}{\partial{\mathbf{x}}}$ | $\large \frac{\partial{u}}{\partial{\mathbf{x}}} + \frac{\partial{v}}{\partial{\mathbf{x}}}$ | $\large \frac{\partial{u}}{\partial{\mathbf{x}}} + \frac{\partial{v}}{\partial{\mathbf{x}}}$ |  | <!---->
| $u = u(\mathbf{x}), \; v = v(\mathbf{x})$ | $\Large \frac{\partial{uv}}{\partial{\mathbf{x}}}$ | $\large u \frac{\partial{v}}{\partial{\mathbf{x}}} + v \frac{\partial{u}}{\partial{\mathbf{x}}}$ | $\large u \frac{\partial{v}}{\partial{\mathbf{x}}} + v \frac{\partial{u}}{\partial{\mathbf{x}}}$ |  | <!---->
| $u = u(\mathbf{x})$ | $\Large \frac{\partial{g}(u)}{\partial{\mathbf{x}}}$ | $\large \frac{\partial{g}(u)}{\partial{u}} \frac{\partial{u}}{\partial{\mathbf{x}}}$ | $\large \frac{\partial{g}(u)}{\partial{u}} \frac{\partial{u}}{\partial{\mathbf{x}}}$ |  | <!---->
| $u = u(\mathbf{x})$ | $\Large \frac{\partial{f(g(u))}}{\partial{\mathbf{x}}}$ | $\large \frac{\partial{f}(g)}{\partial{g}} \frac{\partial{g}(u)}{\partial{u}} \frac{\partial{u}}{\partial{\mathbf{x}}}$ | $\large \frac{\partial{f}(g)}{\partial{g}} \frac{\partial{g}(u)}{\partial{u}} \frac{\partial{u}}{\partial{\mathbf{x}}}$ |  | <!---->
| $\mathbf{u} = \mathbf{u}(\mathbf{x}), \; \mathbf{v} = \mathbf{v}(\mathbf{x})$ | $\Large \frac{\partial{(\mathbf{u \cdot v})}}{\partial{\mathbf{x}}}$ | $\mathbf{u}^T \large \frac{\partial{\mathbf{v}}}{\partial{\mathbf{x}}} + \normalsize \mathbf{v}^T \large \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}$ | $\large \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}  \normalsize \mathbf{v} + \large \frac{\partial{\mathbf{v}}} {\partial{\mathbf{x}}} \normalsize \mathbf{u}$ | [Proof 2-1](#2-1) | <!-- 2-1 -->
| $\mathbf{u} = \mathbf{u}(\mathbf{x}), \; \mathbf{v} = \mathbf{v}(\mathbf{x})$, <br> $\mathbf{A}$ is not a function of $\mathbf{x}$ | $\Large \frac{\partial{(\mathbf{u} \cdot \mathbf{Av})}}{\partial{\mathbf{x}}}$ | $\mathbf{u}^T \mathbf{A} \large \frac{\partial{\mathbf{v}}}{\partial{\mathbf{x}}} + \normalsize \mathbf{v}^T \mathbf{A}^T \large \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}$ | $\large \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}} \normalsize \mathbf{A} \mathbf{v} + \large \frac{\partial{\mathbf{v}}}{\partial{\mathbf{x}}} \normalsize \mathbf{A}^T \mathbf{u}$ | [Proof 2-2](#2-2) | <!-- 2-2 -->
| $\large $ | $\Large \frac{\partial^2{f}}{\partial{\mathbf{x}}\partial{\mathbf{x}}^T}$ | $\mathbf{H}^T$ | $\mathbf{H}$ | [Proof 2-3](#2-3) | <!-- 2-3 -->
| $\large \mathbf{a}$ is not a function of $\large \mathbf{x}$ | $\Large \frac{\partial{(\mathbf{a \cdot x})}}{\partial{\mathbf{x}}} $ | $\mathbf{a}^T $ | $\mathbf{a}$ | [Proof 2-4](#2-4) | <!-- 2-4 -->
| $\mathbf{A, \; a}$ are not functions of $\mathbf{x}$ | $\Large \frac{\partial{(\mathbf{a}^T \mathbf{Ax})}}{\partial{\mathbf{x}}}$ | $\mathbf{a}^T \mathbf{A}$ | $\mathbf{A}^T \mathbf{a}$ | [Proof 2-5](#2-5) | <!-- 2-5 -->
| $\mathbf{A}$ is not a function of $\mathbf{x}$ | $\Large \frac{\partial({\mathbf{x}^T\mathbf{Ax}})}{\partial{\mathbf{x}}}$ | $\mathbf{x}^T (\mathbf{A} + \mathbf{A}^T)$ | $(\mathbf{A} + \mathbf{A}^T) \mathbf{x}$ | [Proof 2-6](#2-6) | <!-- 2-6 -->
| $\mathbf{A}$ is not a function of $\mathbf{x}$ | $\Large \frac{\partial^2({\mathbf{x}^T\mathbf{Ax}})}{\partial{\mathbf{x}\partial{\mathbf{x}^T}}}$ | $\mathbf{A} + \mathbf{A}^T$ | $\mathbf{A} + \mathbf{A}^T$ | [Proof 2-7](#2-7) | <!-- 2-7 -->
| $\large $ | $\Large \frac{\partial{\Vert \mathbf{x} \Vert^2}}{\partial{\mathbf{x}}}$ | $2 \mathbf{x}^T$ | $2 \mathbf{x}$ | [Proof 2-8](#2-8) | <!-- 2-8 -->
| $\large \mathbf{a}, \mathbf{b}$ are not functions of $\large \mathbf{x}$ | $\Large \frac{\partial({\mathbf{a}^T \mathbf{xx}^T \mathbf{b}})}{\partial{\mathbf{x}}}$ | $\mathbf{x}^T (\mathbf{ab}^T + \mathbf{ba}^T)$ | $(\mathbf{ab}^T + \mathbf{ba}^T) \mathbf{x}$ | [Proof 2-9](#2-9) | <!-- 2-9 -->
| $\large \mathbf{a}$ is not a function of $\large \mathbf{x}$ | $\Large \frac{\partial{\Vert \mathbf{x - a} \Vert}}{\partial{\mathbf{x}}}$ | $\large \frac{(\mathbf{x - a})^T}{\Vert \mathbf{x - a} \Vert}$ | $\large \frac{\mathbf{x - a}}{\Vert \mathbf{x - a} \Vert}$ | [Proof 2-10](#2-10) | <!-- 2-10 -->


<div id="v-by-s"></div>

### 向量对标量 (Vector-by-scalar)

| Codition | Expression | Numerator layout | Denominator layout | Proof |
| :---: | :---: | :---: | :---: | :---: |
| $\large \mathbf{a}$ is not a function of $\large x$ | $\Large \frac{\partial{\mathbf{a}}}{\partial{x}} $ | $\large \mathbf{0}$ | $\large \mathbf{0}$ |  | <!---->
| $\large a$ is not a function of $\large x$, <br> $\mathbf{u} = \mathbf{u}(x)$ | $\Large \frac{\partial{a\mathbf{u}}}{\partial{x}}$ | $\normalsize a \large \frac{\partial{\mathbf{u}}}{\partial{x}}$ | $\normalsize a \large \frac{\partial{\mathbf{u}}}{\partial{x}}$ |  | <!---->
| $\large \mathbf{A}$ is not a function of $\large x$. <br> $\mathbf{u} = \mathbf{u}(x)$ | $\Large \frac{\partial{\mathbf{Au}}}{\partial{x}}$ | $\normalsize \mathbf{A} \large \frac{\partial{\mathbf{u}}}{\partial{x}}$ | $\large \frac{\partial{\mathbf{u}}}{\partial{x}} \normalsize \mathbf{A}^T$ | [Proof 3-1](#3-1) | <!-- 3-1 -->
| $\mathbf{u} = \mathbf{u}(x)$ | $\Large \frac{\partial{\mathbf{u}^T}}{\partial{x}}$ | $\large (\frac{\partial{\mathbf{u}}}{\partial{x}})^T$ | $\large (\frac{\partial{\mathbf{u}}}{\partial{x}})^T$ | | <!---->
| $\mathbf{u} = \mathbf{u}(x), \mathbf{v} = \mathbf{v}(x)$ | $\Large \frac{\partial(\mathbf{u} + \mathbf{v})}{\partial{x}}$ | $\large \frac{\partial{\mathbf{u}}}{\partial{x}} + \frac{\partial{\mathbf{v}}}{\partial{x}}$ | $\large \frac{\partial{\mathbf{u}}}{\partial{x}} + \frac{\partial{\mathbf{v}}}{\partial{x}}$ |  | <!----> 
| $\mathbf{u} = \mathbf{u}(x), \mathbf{v} = \mathbf{v}(x)$ | $\Large \frac{\partial(\mathbf{u}^T \mathbf{v})}{\partial{x}}$ | $\large (\frac{\partial{\mathbf{u}}}{\partial{x}})^T  \normalsize \mathbf{v} + \mathbf{u}^T \large \frac{\partial{\mathbf{v}}}{\partial{x}}$ | $\large \frac{\partial{\mathbf{u}}}{\partial{x}} \normalsize \mathbf{v} + \mathbf{u}^T \large (\frac{\partial{\mathbf{v}}}{\partial{x}})^T$ | [Proof 3-2](#3-2) | <!-- 3-2 -->
| $\mathbf{u} = \mathbf{u}(x)$ | $\Large \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{x}}$ | $\large \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{u}}} \frac{\partial{\mathbf{u}}}{\partial{x}}$ | $\large \frac{\partial{\mathbf{u}}}{\partial{x}} \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{u}}}$ | [Proof 3-3](#3-3) | <!-- 3-3 -->
| $ \mathbf{u} = \mathbf{u}(x) $ | $\Large \frac{\partial{\mathbf{f}(\mathbf{g}(\mathbf{u}))}}{\partial{x}}$ | $\large \frac{\partial{\mathbf{f}(\mathbf{g})}}{\partial{\mathbf{g}}} \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{u}}} \frac{\partial{\mathbf{u}}}{\partial{x}}$ | $\large \frac{\partial{\mathbf{u}}}{\partial{x}} \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{u}}} \frac{\partial{\mathbf{f}(\mathbf{g})}}{\partial{\mathbf{g}}}$ | [Proof 3-4](#3-4) | <!-- 3-4 -->
| $\mathbf{U} = \mathbf{U}(x), \mathbf{v} = \mathbf{v}(x)$ | $\Large \frac{\partial{\mathbf{U}\mathbf{v}}}{\partial{x}}$ | $\large \frac{\partial{\mathbf{U}}}{\partial{x}} \normalsize \mathbf{v} + \mathbf{U} \large \frac{\partial{\mathbf{v}}}{\partial{x}}$ | $\large \normalsize \mathbf{v}^T \large \frac{\partial{\mathbf{U}}}{\partial{x}} + \frac{\partial{\mathbf{v}}}{\partial{x}} \normalsize \mathbf{U}^T$ | [Proof 3-5](#3-5) | <!-- 3-5 -->

---

## 推导过程
### 向量对向量 (Vector-by-vector)

<div id="1-1"></div>

- **Proof 1-1** 
  - $\color{royalblue}{\LARGE \frac{\partial{\mathbf{a}}}{\partial{\mathbf{x}}}}$, $\; \large \mathbf{a}$ is not a function of $\large \mathbf{x}$
  
    $$
    \mathbf{a} =
    \begin{pmatrix}
        a_1 & \cdots & a_m
    \end{pmatrix}_{m \times 1}^T
    , \qquad
    \mathbf{x} = 
    \begin{pmatrix}
        x_1 & \cdots & x_n
    \end{pmatrix}_{n \times 1}^T
    $$

    Numerator layout:

    $$
    \frac{\partial{\mathbf{a}}}{\partial{\mathbf{x}}} =
    \large
    \begin{pmatrix}
        \frac{\partial{a_1}}{\partial{x_1}} & \cdots & \frac{\partial{a_1}}{\partial{x_n}} \\
        \vdots & \ddots & \vdots \\
        \frac{\partial{a_m}}{\partial{x_1}} & \cdots & \frac{\partial{a_m}}{\partial{x_n}}
    \end{pmatrix}_{m \times n} =
    \begin{pmatrix}
        0 & \cdots & 0 \\
        \vdots & \ddots & \vdots \\
        0 & \cdots & 0
    \end{pmatrix}_{m \times n} =
    \mathbf{0}_{m \times n}
    $$

    Denominator layout:

    $$
    \frac{\partial{\mathbf{a}}}{\partial{\mathbf{x}}} =
    \large
    \begin{pmatrix}
        \frac{\partial{a_1}}{\partial{x_1}} & \cdots & \frac{\partial{a_m}}{\partial{x_1}} \\
        \vdots & \ddots & \vdots \\
        \frac{\partial{a_1}}{\partial{x_n}} & \cdots & \frac{\partial{a_m}}{\partial{x_n}}
    \end{pmatrix}_{n \times m} =
    \begin{pmatrix}
        0 & \cdots & 0 \\
        \vdots & \ddots & \vdots \\
        0 & \cdots & 0
    \end{pmatrix}_{n \times m} =
    \mathbf{0}_{n \times m}
    $$

<p align="right"><a href="#v-by-v"> Back to table </a></p>

<div id="1-2"></div>
<br><br>

- **Proof 1-2**
  - $\color{royalblue}{\LARGE \frac{\partial{\mathbf{Ax}}}{\partial{\mathbf{x}}}}$, $\; \large \mathbf{A}$ is not a funtion of $\large \mathbf{x}$
    
    $$
    \mathbf{A} = 
    \begin{pmatrix}
        a_{11} & \cdots & a_{1n} \\
        \vdots & \ddots & \vdots \\
        a_{m1} & \cdots & a_{mn}
    \end{pmatrix}_{m \times n}
    , \qquad
    \mathbf{x} = 
    \begin{pmatrix}
        x_1 & \cdots & x_n
    \end{pmatrix}_{n \times 1}^T
    $$

    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial{\mathbf{Ax}}}{\partial{\mathbf{x}}}
        &=
        \frac{\partial}{\partial{\mathbf{x}}}
        \left\{
        \begin{pmatrix}
            a_{11} & \cdots & a_{1n} \\
            \vdots & \ddots & \vdots \\
            a_{m1} & \cdots & a_{mn}
        \end{pmatrix}_{m \times n}
        \begin{pmatrix}
            x_1 \\ \vdots \\ x_n
        \end{pmatrix}_{n \times 1}
        \right\}
        \\[10mm]
        &=
        \frac{\partial}{\partial{\mathbf{x}}}
        \large
        \begin{pmatrix}
            \sum_{i=1}^n a_{1i}x_i \\
            \vdots \\
            \sum_{i=1}^n a_{mi}x_i
        \end{pmatrix}_{m \times 1}
        \\[10mm]
        &=
        \Large
        \begin{pmatrix}
            \frac{\partial{\sum_{i=1}^n a_{1i}x_i}}{\partial{x_1}} & \cdots & \frac{\partial{\sum_{i=1}^n a_{mi}x_i}}{\partial{x_1}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{\sum_{i=1}^n a_{1i}x_i}}{\partial{x_n}} & \cdots & \frac{\partial{\sum_{i=1}^n a_{mi}x_i}}{\partial{x_n}}
        \end{pmatrix}_{n \times m}
        \\[10mm]
        &=
        \begin{pmatrix}
            a_{11} & \cdots & a_{m1} \\
            \vdots & \ddots & \vdots \\
            a_{1n} & \cdots & a_{mn}
        \end{pmatrix}_{n \times m}
        \\[10mm]
        &=
        \mathbf{A}^T
    \end{aligned}
    $$

<p align="right"><a href="#v-by-v"> Back to table </a></p>

<div id="1-3"></div>
<br><br>

- **Proof 1-3**
  - $\color{royalblue}{\LARGE \frac{\partial{\mathbf{x}^T\mathbf{A}}}{\partial{\mathbf{x}}}}$, $\; \large \mathbf{A}$ is not a funtion of $\large \mathbf{x}$
    
    $$
    \mathbf{A} = 
    \begin{pmatrix}
        a_{11} & \cdots & a_{1m} \\
        \vdots & \ddots & \vdots \\
        a_{n1} & \cdots & a_{nm}
    \end{pmatrix}_{n \times m}
    , \qquad
    \mathbf{x} = 
    \begin{pmatrix}
        x_1 & \cdots & x_n
    \end{pmatrix}_{n \times 1}^T
    $$

    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial{\mathbf{x}^T\mathbf{A}}}{\partial{\mathbf{x}}}
        &=
        \frac{\partial}{\partial{\mathbf{x}}}
        \left\{
        \begin{pmatrix}
            x_1 & \cdots & x_n
        \end{pmatrix}_{1 \times n}
        \begin{pmatrix}
            a_{11} & \cdots & a_{1m} \\
            \vdots & \ddots & \vdots \\
            a_{n1} & \cdots & a_{nm}
        \end{pmatrix}_{n \times m}
        \right\}
        \\[10mm]
        &=
        \frac{\partial}{\partial{\mathbf{x}}}
        \begin{pmatrix}
            \sum_{i=1}^n a_{i1}x_i & \cdots & \sum_{i=1}^n a_{im}x_i
        \end{pmatrix}_{1 \times m}
        \\[5mm]
        &=
        \Large
        \begin{pmatrix}
            \frac{\partial{\sum_{i=1}^n a_{i1}x_i}}{\partial{x_1}} & \cdots & \frac{\partial{\sum_{i=1}^n a_{im}x_i}}{\partial{x_1}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{\sum_{i=1}^n a_{i1}x_i}}{\partial{x_n}} & \cdots & \frac{\partial{\sum_{i=1}^n a_{im}x_i}}{\partial{x_n}} 
        \end{pmatrix}_{n \times m}
        \\[10mm]
        &=
        \begin{pmatrix}
            a_{11} & \cdots & a_{1m} \\
            \vdots & \ddots & \vdots \\
            a_{n1} & \cdots & a_{nm}
        \end{pmatrix}_{n \times m}
        \\[10mm]
        &=
        \mathbf{A}
    \end{aligned}
    $$

<p align="right"><a href="#v-by-v"> Back to table </a></p>

<div id="1-4"></div>
<br><br>

- **Proof 1-4**
  - $\color{royalblue}{\LARGE \frac{\partial{a\mathbf{u}}}{\partial{\mathbf{x}}}}$, $\; \large a$ is not a function of $x, \; \mathbf{u} = \mathbf{u}(\mathbf{x})$
    
    $$
    \mathbf{u} = 
    \begin{pmatrix}
        u_1 & \cdots & u_m
    \end{pmatrix}_{m \times 1}^T
    , \qquad
    \mathbf{x} =
    \begin{pmatrix}
        x_1 & \cdots & x_n
    \end{pmatrix}_{n \times 1}^T
    $$

    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial{a\mathbf{u}}}{\partial{\mathbf{x}}}
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{au_1}}{\partial{x_1}} & \cdots & \frac{\partial{au_m}}{\partial{x_1}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{au_1}}{\partial{x_n}} & \cdots & \frac{\partial{au_m}}{\partial{x_n}}
        \end{pmatrix}_{n \times m}
        \\[10mm]
        &=
        a
        \large
        \begin{pmatrix}
            \frac{\partial{u_1}}{\partial{x_1}} & \cdots & \frac{\partial{u_m}}{\partial{x_1}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{u_1}}{\partial{x_n}} & \cdots & \frac{\partial{u_m}}{\partial{x_n}}
        \end{pmatrix}_{n \times m}
        \\[10mm]
        &=
        a \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}
    \end{aligned}
    $$

<p align="right"><a href="#v-by-v"> Back to table </a></p>

<div id="1-5"></div>
<br><br>

- **Proof 1-5** 
  - $\color{royalblue}{\LARGE \frac{\partial{v \mathbf{u}}}{\partial{\mathbf{x}}}}$, $\; v = v(\mathbf{x}), \; \mathbf{u} = \mathbf{u}(\mathbf{x})$

    $$
    \mathbf{u} =
    \begin{pmatrix}
        u_1 & \cdots & u_m
    \end{pmatrix}_{m \times 1}^T
    , \qquad
    \mathbf{x} =
    \begin{pmatrix}
        x_1 & \cdots & x_n
    \end{pmatrix}_{n \times 1}^T
    $$

    Numerator layout:

    $$
    \begin{aligned}
        \frac{\partial{v \mathbf{u}}}{\partial{\mathbf{x}}}
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{v u_1}}{\partial{x_1}} & \cdots & \frac{\partial{v u_1}}{\partial{x_n}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{v u_m}}{\partial{x_1}} & \cdots & \frac{\partial{v u_1}}{\partial{x_n}}
        \end{pmatrix}_{m \times n}
        \\[10mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{v}}{\partial{x_1}} u_1 + v \frac{\partial{u_1}}{\partial{x_1}} & \cdots & \frac{\partial{v}}{\partial{x_n}} u_1 + v \frac{\partial{u_1}}{\partial{x_n}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{v}}{\partial{x_1}} u_m + v \frac{\partial{u_m}}{\partial{x_1}} & \cdots & \frac{\partial{v}}{\partial{x_n}} u_m + v \frac{\partial{u_m}}{\partial{x_n}}
        \end{pmatrix}_{m \times n}
        \\[10mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{v}}{\partial{x_1}} u_1 & \cdots & \frac{\partial{v}}{\partial{x_n}} u_1 \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{v}}{\partial{x_1}} u_m & \cdots & \frac{\partial{v}}{\partial{x_n}} u_m
        \end{pmatrix}_{m \times n}
        \quad + \quad
        \large
        \begin{pmatrix}
            v \frac{\partial{u_1}}{\partial{x_1}} & \cdots & v \frac{\partial{u_1}}{\partial{x_n}} \\
            \vdots & \ddots & \vdots \\
            v \frac{\partial{u_m}}{\partial{x_1}} & \cdots & v \frac{\partial{u_m}}{\partial{x_n}}
        \end{pmatrix}_{m \times n}
        \\[10mm]
        &=
        \large
        \begin{pmatrix}
            u_1 \\ \vdots \\ u_m
        \end{pmatrix}_{m \times 1}
        \large
        \begin{pmatrix}
            \frac{\partial{v}}{\partial{x_1}} & \cdots & \frac{\partial{v}}{\partial{x_n}}
        \end{pmatrix}_{1 \times n}
        \quad + \quad
        v
        \large
        \begin{pmatrix}
            \frac{\partial{u_1}}{\partial{x_1}} & \cdots & \frac{\partial{u_1}}{\partial{x_n}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{u_m}}{\partial{x_1}} & \cdots & \frac{\partial{u_m}}{\partial{x_n}}
        \end{pmatrix}_{m \times n}
        \\[10mm]
        &=
        \mathbf{u} \frac{\partial{v}}{\partial{\mathbf{x}}} + v \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}
    \end{aligned}
    $$

    <br><br>
    Denominator layout:
    <br><br>

    $$
    \begin{aligned}
        \frac{\partial{v \mathbf{u}}}{\partial{\mathbf{x}}}
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{v u_1}}{\partial{x_1}} & \cdots & \frac{\partial{v u_m}}{\partial{x_1}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{v u_1}}{\partial{x_n}} & \cdots & \frac{\partial{v u_m}}{\partial{x_n}}
        \end{pmatrix}_{n \times m}
        \\[10mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{v}}{\partial{x_1}} u_1 + v \frac{\partial{u_1}}{\partial{x_1}} & \cdots & \frac{\partial{v}}{\partial{x_1}} u_m + v \frac{\partial{u_m}}{\partial{x_1}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{v}}{\partial{x_n}} u_1 + v \frac{\partial{u_1}}{\partial{x_n}} & \cdots & \frac{\partial{v}}{\partial{x_n}} u_m + v \frac{\partial{u_m}}{\partial{x_n}}
        \end{pmatrix}_{n \times m}
        \\[10mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{v}}{\partial{x_1}} u_1 & \cdots & \frac{\partial{v}}{\partial{x_1}} u_m \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{v}}{\partial{x_n}} u_1 & \cdots & \frac{\partial{v}}{\partial{x_n}} u_m
        \end{pmatrix}_{n \times m}
        \quad + \quad
        \large
        \begin{pmatrix}
            v \frac{\partial{u_1}}{\partial{x_1}} & \cdots & v \frac{\partial{u_m}}{\partial{x_1}} \\
            \vdots & \ddots & \vdots \\
            v \frac{\partial{u_1}}{\partial{x_n}} & \cdots & v \frac{\partial{u_m}}{\partial{x_n}}
        \end{pmatrix}_{n \times m}
        \\[10mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{v}}{\partial{x_1}} \\ \vdots \\ \frac{\partial{v}}{\partial{x_n}}
        \end{pmatrix}_{n \times 1}
        \large
        \begin{pmatrix}
            u_1 & \cdots & u_m
        \end{pmatrix}_{1 \times m}
        \quad + \quad
        v
        \large
        \begin{pmatrix}
            \frac{\partial{u_1}}{\partial{x_1}} & \cdots & \frac{\partial{u_m}}{\partial{x_1}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{u_1}}{\partial{x_n}} & \cdots & \frac{\partial{u_m}}{\partial{x_n}}
        \end{pmatrix}_{n \times m}
        \\[10mm]
        &=
        \frac{\partial{v}}{\partial{\mathbf{x}}} \mathbf{u}^T + v \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}
    \end{aligned}
    $$

<p align="right"><a href="#v-by-v"> Back to table </a></p>

<div id="1-6"></div>
<br><br>

- **Proof 1-6**
  - $\color{royalblue}{\LARGE \frac{\partial{\mathbf{Au}}}{\partial{\mathbf{x}}}}$, $\; \mathbf{A}$ is not a function of $\mathbf{x}, \; \mathbf{u} = \mathbf{u}(\mathbf{x})$

    $$
    \mathbf{A} = 
    \begin{pmatrix}
        a_{11} & \cdots & a_{1m} \\
        \vdots & \ddots & \vdots \\
        a_{m1} & \cdots & a_{mm}
    \end{pmatrix}_{m \times m}
    , \qquad
    \mathbf{u} =
    \begin{pmatrix}
        u_1 & \cdots & u_m
    \end{pmatrix}_{m \times 1}^T
    , \qquad
    \mathbf{x} =
    \begin{pmatrix}
        x_1 & \cdots & x_n
    \end{pmatrix}_{n \times 1}^T
    $$

    Numerator layout:

    $$
    \begin{aligned}
        \frac{\partial{\mathbf{Au}}}{\partial{\mathbf{x}}}
        &=
        \frac{\partial}{\partial{\mathbf{x}}}
        \begin{pmatrix}
            a_{11} & \cdots & a_{1m} \\
            \vdots & \ddots & \vdots \\
            a_{m1} & \cdots & a_{mm}
        \end{pmatrix}_{m \times m}
        \begin{pmatrix}
            u_1 \\ \vdots \\ u_m
        \end{pmatrix}_{m \times 1}
        \\[10mm]
        &=
        \frac{\partial}{\partial{\mathbf{x}}}
        \large
        \begin{pmatrix}
            \sum_{i=1}^m a_{1i} u_i \\
            \vdots \\
            \sum_{i=1}^m a_{mi} u_i
        \end{pmatrix}_{m \times 1}
        \\[10mm]
        &=
        \Large
        \begin{pmatrix}
            \frac{\partial{\sum_{i=1}^m a_{1i} u_i}}{\partial{x_1}} & \cdots & \frac{\partial{\sum_{i=1}^m a_{1i} u_i}}{\partial{x_n}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{\sum_{i=1}^m a_{mi} u_i}}{\partial{x_1}} & \cdots & \frac{\partial{\sum_{i=1}^m a_{mi} u_i}}{\partial{x_n}}
        \end{pmatrix}_{m \times n}
        \\[10mm]
        &=
        \large
        \begin{pmatrix}
            \sum_{i=1}^m a_{1i} \frac{\partial{u_i}}{\partial{x_1}} & \cdots & \sum_{i=1}^m a_{1i} \frac{\partial{u_i}}{\partial{x_n}} \\
            \vdots & \ddots & \vdots \\
            \sum_{i=1}^m a_{mi} \frac{\partial{u_i}}{\partial{x_n}} & \cdots & \sum_{i=1}^m a_{mi} \frac{\partial{u_i}}{\partial{x_n}} \\
        \end{pmatrix}_{m \times n}
        \\[10mm]
        &=
        \begin{pmatrix}
            a_{11} & \cdots & a_{1m} \\
            \vdots & \ddots & \vdots \\
            a_{m1} & \cdots & a_{mm}
        \end{pmatrix}_{m \times m}
        \large
        \begin{pmatrix}
            \frac{\partial{u_1}}{\partial{x_1}} & \cdots & \frac{\partial{u_1}}{\partial{x_n}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{u_m}}{\partial{x_n}} & \cdots & \frac{\partial{u_m}}{\partial{x_n}}
        \end{pmatrix}_{m \times n}
        \\[10mm]
        &=
        \mathbf{A} \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}
    \end{aligned}
    $$

    <br><br>
    Denominator layout:
    <br><br>

    $$
    \begin{aligned}
        \frac{\partial{\mathbf{Au}}}{\partial{\mathbf{x}}}
        &=
        \frac{\partial}{\partial{\mathbf{x}}}
        \begin{pmatrix}
            a_{11} & \cdots & a_{1m} \\
            \vdots & \ddots & \vdots \\
            a_{m1} & \cdots & a_{mm}
        \end{pmatrix}_{m \times m}
        \begin{pmatrix}
            u_1 \\ \vdots \\ u_m
        \end{pmatrix}_{m \times 1}
        \\[10mm]
        &=
        \frac{\partial}{\partial{\mathbf{x}}}
        \large
        \begin{pmatrix}
            \sum_{i=1}^m a_{1i} u_i \\
            \vdots \\
            \sum_{i=1}^m a_{mi} u_i
        \end{pmatrix}_{m \times 1}
        \\[10mm]
        &=
        \Large
        \begin{pmatrix}
            \frac{\partial{\sum_{i=1}^m a_{1i} u_i}}{\partial{x_1}} & \cdots & \frac{\partial{\sum_{i=1}^m a_{mi} u_i}}{\partial{x_1}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{\sum_{i=1}^m a_{1i} u_i}}{\partial{x_n}} & \cdots & \frac{\partial{\sum_{i=1}^m a_{mi} u_i}}{\partial{x_n}}
        \end{pmatrix}_{n \times m}
        \\[10mm]
        &=
        \large
        \begin{pmatrix}
            \sum_{i=1}^m a_{1i} \frac{\partial{u_i}}{\partial{x_1}} & \cdots & \sum_{i=1}^m a_{mi} \frac{\partial{u_i}}{\partial{x_1}} \\
            \vdots & \ddots & \vdots \\
            \sum_{i=1}^m a_{1i} \frac{\partial{u_i}}{\partial{x_n}} & \cdots & \sum_{i=1}^m a_{mi} \frac{\partial{u_i}}{\partial{x_n}} \\
        \end{pmatrix}_{n \times m}
        \\[10mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{u_1}}{\partial{x_1}} & \cdots & \frac{\partial{u_m}}{\partial{x_1}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{u_1}}{\partial{x_n}} & \cdots & \frac{\partial{u_m}}{\partial{x_n}}
        \end{pmatrix}_{n \times m}
        \begin{pmatrix}
            a_{11} & \cdots & a_{m1} \\
            \vdots & \ddots & \vdots \\
            a_{1m} & \cdots & a_{mm}
        \end{pmatrix}_{m \times m}
        \\[10mm]
        &=
        \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}} \mathbf{A}^T
    \end{aligned}
    $$

<p align="right"><a href="#v-by-v"> Back to table </a></p>

<div id="1-7"></div>
<br><br>

- **Proof 1-7**
  - $\color{royalblue}{\LARGE \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{x}}}}$, $\; \mathbf{u} = \mathbf{u}(\mathbf{x})$

    $$
    \mathbf{g} =
    \begin{pmatrix}
        g_1 & \cdots & g_p
    \end{pmatrix}_{p \times 1}^T
    , \qquad
    \mathbf{u} =
    \begin{pmatrix}
        u_1 & \cdots & u_m
    \end{pmatrix}_{m \times 1}^T
    , \qquad
    \mathbf{x} =
    \begin{pmatrix}
        x_1 & \cdots & x_n
    \end{pmatrix}_{n \times 1}^T
    $$

    Numerator layout:

    $$
    \begin{aligned}
        \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{x}}}
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{g_1}}{\partial{x_1}} & \cdots & \frac{\partial{g_1}}{\partial{x_n}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{g_p}}{\partial{x_1}} & \cdots & \frac{\partial{g_p}}{\partial{x_n}}
        \end{pmatrix}_{p \times n}
        \\[10mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{g_1}}{\partial{\mathbf{u}}} \frac{\partial{\mathbf{u}}}{\partial{x_1}} & \cdots & \frac{\partial{g_1}}{\partial{\mathbf{u}}} \frac{\partial{\mathbf{u}}}{\partial{x_n}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{g_p}}{\partial{\mathbf{u}}} \frac{\partial{\mathbf{u}}}{\partial{x_1}} & \cdots & \frac{\partial{g_p}}{\partial{\mathbf{u}}} \frac{\partial{\mathbf{u}}}{\partial{x_n}}
        \end{pmatrix}_{p \times n}
        \\[10mm]
        &=
        \large
        \begin{pmatrix}
            \begin{pmatrix}
                \frac{\partial{g_1}}{\partial{u_1}} & \cdots & \frac{\partial{g_1}}{\partial{u_m}}
            \end{pmatrix} 
            \begin{pmatrix}
                \frac{\partial{u_1}}{\partial{x_1}} \\ \vdots \\ \frac{\partial{u_m}}{\partial{x_1}}
            \end{pmatrix}
            & 
            \cdots 
            & 
            \begin{pmatrix}
                \frac{\partial{g_1}}{\partial{u_1}} & \cdots & \frac{\partial{g_1}}{\partial{u_m}}
            \end{pmatrix} 
            \begin{pmatrix}
                \frac{\partial{u_1}}{\partial{x_n}} \\ \vdots \\ \frac{\partial{u_m}}{\partial{x_n}}
            \end{pmatrix}
            \\
            \vdots & \ddots & \vdots 
            \\
            \begin{pmatrix}
                \frac{\partial{g_p}}{\partial{u_1}} & \cdots & \frac{\partial{g_p}}{\partial{u_m}}
            \end{pmatrix} 
            \begin{pmatrix}
                \frac{\partial{u_1}}{\partial{x_1}} \\ \vdots \\ \frac{\partial{u_m}}{\partial{x_1}}
            \end{pmatrix}
            & 
            \cdots 
            & 
            \begin{pmatrix}
                \frac{\partial{g_p}}{\partial{u_1}} & \cdots & \frac{\partial{g_p}}{\partial{u_m}}
            \end{pmatrix} 
            \begin{pmatrix}
                \frac{\partial{u_1}}{\partial{x_n}} \\ \vdots \\ \frac{\partial{u_m}}{\partial{x_n}}
            \end{pmatrix}
        \end{pmatrix}_{p \times n}
        \\[10mm]
        &=
        \large
        \begin{pmatrix}
            \sum_{i=1}^m \frac{\partial{g_1}}{\partial{u_i}} \frac{\partial{u_i}}{\partial{x_1}} & \cdots & \sum_{i=1}^m \frac{\partial{g_1}}{\partial{u_i}} \frac{\partial{u_i}}{\partial{x_n}} \\
            \vdots & \ddots & \vdots \\
            \sum_{i=1}^m \frac{\partial{g_p}}{\partial{u_i}} \frac{\partial{u_i}}{\partial{x_1}} & \cdots & \sum_{i=1}^m \frac{\partial{g_p}}{\partial{u_i}} \frac{\partial{u_i}}{\partial{x_n}}
        \end{pmatrix}_{p \times n}
        \\[10mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{g_1}}{\partial{u_1}} & \cdots & \frac{\partial{g_1}}{\partial{u_m}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{g_p}}{\partial{u_1}} & \cdots & \frac{\partial{g_p}}{\partial{u_m}}
        \end{pmatrix}_{p \times m}
        \begin{pmatrix}
            \frac{\partial{u_1}}{\partial{x_1}} & \cdots & \frac{\partial{u_1}}{\partial{x_n}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{u_m}}{\partial{x_1}} & \cdots & \frac{\partial{u_m}}{\partial{x_n}}
        \end{pmatrix}_{m \times n}
        \\[10mm]
        &=
        \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{u}}} \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}
    \end{aligned}
    $$

    <br><br>
    Denominator layout:
    <br><br>

    $$
    \begin{aligned}
        \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{x}}}
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{g_1}}{\partial{x_1}} & \cdots & \frac{\partial{g_p}}{\partial{x_1}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{g_1}}{\partial{x_n}} & \cdots & \frac{\partial{g_p}}{\partial{x_n}}
        \end{pmatrix}_{n \times p}
        \\[10mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{\mathbf{u}}}{\partial{x_1}} \frac{\partial{g_1}}{\partial{\mathbf{u}}} & \cdots & \frac{\partial{\mathbf{u}}}{\partial{x_1}} \frac{\partial{g_p}}{\partial{\mathbf{u}}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{\mathbf{u}}}{\partial{x_n}} \frac{\partial{g_1}}{\partial{\mathbf{u}}}& \cdots & \frac{\partial{\mathbf{u}}}{\partial{x_n}} \frac{\partial{g_p}}{\partial{\mathbf{u}}}
        \end{pmatrix}_{n \times p}
        \\[10mm]
        &=
        \large
        \begin{pmatrix}
            \begin{pmatrix}
                \frac{\partial{u_1}}{\partial{x_1}} & \cdots & \frac{\partial{u_m}}{\partial{x_1}}
            \end{pmatrix} 
            \begin{pmatrix}
                \frac{\partial{g_1}}{\partial{u_1}} \\ \vdots \\ \frac{\partial{g_1}}{\partial{u_m}}
            \end{pmatrix}
            & 
            \cdots 
            & 
            \begin{pmatrix}
                \frac{\partial{u_1}}{\partial{x_1}} & \cdots & \frac{\partial{u_m}}{\partial{x_1}}
            \end{pmatrix} 
            \begin{pmatrix}
                \frac{\partial{g_p}}{\partial{u_1}} \\ \vdots \\ \frac{\partial{g_p}}{\partial{u_m}}
            \end{pmatrix}
            \\
            \vdots & \ddots & \vdots 
            \\
            \begin{pmatrix}
                \frac{\partial{u_1}}{\partial{x_n}} & \cdots & \frac{\partial{u_m}}{\partial{x_n}}
            \end{pmatrix} 
            \begin{pmatrix}
                \frac{\partial{g_1}}{\partial{u_1}} \\ \vdots \\ \frac{\partial{g_1}}{\partial{u_m}}
            \end{pmatrix}
            & 
            \cdots 
            & 
            \begin{pmatrix}
                \frac{\partial{u_1}}{\partial{x_n}} & \cdots & \frac{\partial{u_m}}{\partial{x_n}}
            \end{pmatrix} 
            \begin{pmatrix}
                \frac{\partial{g_p}}{\partial{u_1}} \\ \vdots \\ \frac{\partial{g_p}}{\partial{u_m}}
            \end{pmatrix}
        \end{pmatrix}_{n \times p}
        \\[10mm]
        &=
        \large
        \begin{pmatrix}
            \sum_{i=1}^m \frac{\partial{u_i}}{\partial{x_1}} \frac{\partial{g_1}}{\partial{u_i}} & \cdots & \sum_{i=1}^m \frac{\partial{u_i}}{\partial{x_1}} \frac{\partial{g_p}}{\partial{u_i}} \\
            \vdots & \ddots & \vdots \\
            \sum_{i=1}^m \frac{\partial{u_i}}{\partial{x_n}} \frac{\partial{g_1}}{\partial{u_i}} & \cdots & \sum_{i=1}^m \frac{\partial{u_i}}{\partial{x_n}} \frac{\partial{g_p}}{\partial{u_i}}
        \end{pmatrix}_{n \times p}
        \\[10mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{u_1}}{\partial{x_1}} & \cdots & \frac{\partial{u_m}}{\partial{x_1}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{u_1}}{\partial{x_n}} & \cdots & \frac{\partial{u_m}}{\partial{x_n}}
        \end{pmatrix}_{n \times m}
        \begin{pmatrix}
            \frac{\partial{g_1}}{\partial{u_1}} & \cdots & \frac{\partial{g_p}}{\partial{u_1}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{g_1}}{\partial{u_m}} & \cdots & \frac{\partial{g_p}}{\partial{u_m}}
        \end{pmatrix}_{m \times p}
        \\[10mm]
        &=
        \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}} \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{u}}}
    \end{aligned}
    $$

<p align="right"><a href="#v-by-v"> Back to table </a></p>

<div id="1-8"></div>
<br><br>

- **Proof 1-8**
  - $\color{royalblue}{\LARGE \frac{\partial{\mathbf{f}(\mathbf{g}(\mathbf{u}))}}{\partial{\mathbf{x}}}}$, $\; \mathbf{u} = \mathbf{u}(\mathbf{x})$

    <br><br>
    Numerator layout:

    $$
    \begin{aligned}
        \frac{\partial{\mathbf{f}(\mathbf{g}(\mathbf{u}))}}{\partial{\mathbf{x}}}
        &=
        \frac{\partial{\mathbf{f}(\mathbf{g}(\mathbf{u}))}}{\partial{\mathbf{g}(\mathbf{u})}} \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{x}}}
        \\[5mm]
        &=
        \frac{\partial{\mathbf{f}(\mathbf{g})}}{\partial{\mathbf{g}}} \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{u}}} \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}
    \end{aligned}
    $$

    <br><br>
    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial{\mathbf{f}(\mathbf{g}(\mathbf{u}))}}{\partial{\mathbf{x}}}
        &=
        \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{x}}} \frac{\partial{\mathbf{f}(\mathbf{g}(\mathbf{u}))}}{\partial{\mathbf{g}(\mathbf{u})}}
        \\[5mm]
        &=
        \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}} \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{u}}}  \frac{\partial{\mathbf{f}(\mathbf{g})}}{\partial{\mathbf{g}}} 
    \end{aligned}
    $$

<p align="right"><a href="#v-by-v"> Back to table </a></p>

### 标量对向量 (Scalar-by-vector)

<div id="2-1"></div>
<br><br>

- **Proof 2-1**
  - $\color{royalblue}{\LARGE \frac{\partial{(\mathbf{u \cdot v})}}{\partial{\mathbf{x}}}}$, $\; \mathbf{u} = \mathbf{u}(\mathbf{x}), \; \mathbf{v} = \mathbf{v}(\mathbf{x})$

    $$
    \mathbf{u} = 
    \begin{pmatrix}
        u_1 & \cdots & u_m
    \end{pmatrix}_{m \times 1}^T
    , \qquad
    \mathbf{v} = 
    \begin{pmatrix}
        v_1 & \cdots & v_m
    \end{pmatrix}_{m \times 1}^T
    , \qquad
    \mathbf{x} = 
    \begin{pmatrix}
        x_1 & \cdots & x_n 
    \end{pmatrix}_{n \times 1}^T
    $$

    <br><br>
    Numerator layout:
    <br><br>

    $$
    \begin{aligned}
        \begin{split}
            \frac{\partial{(\mathbf{u \cdot v})}}{\partial{\mathbf{x}}}
            &=
            \frac{\partial}{\partial{\mathbf{x}}} \sum_{i=1}^m u_i v_i
            \\[5mm]
            &=
            \Large
            \begin{pmatrix}
                \frac{\partial{\sum_{i=1}^m u_i v_i}}{\partial{x_1}} & \cdots & \frac{\partial{\sum_{i=1}^m u_i v_i}}{\partial{x_n}}
            \end{pmatrix}_{1 \times n}
            \\[5mm]
            &=
            \large
            \begin{pmatrix}
                \sum_{i=1}^m \left(\frac{\partial{u_i}}{\partial{x_1}} v_i + u_i \frac{\partial{v_i}}{\partial{x_1}} \right) & \cdots & \sum_{i=1}^m \left(\frac{\partial{u_i}}{\partial{x_n}} v_i + u_i \frac{\partial{v_i}}{\partial{x_n}} \right)
            \end{pmatrix}_{1 \times n}
            \\[5mm]
            &=
            \large
            \begin{pmatrix}
                \sum_{i=1}^m \left(\frac{\partial{u_i}}{\partial{x_1}} v_i \right) & \cdots & \sum_{i=1}^m \left(\frac{\partial{u_i}}{\partial{x_n}} v_i \right)
            \end{pmatrix}_{1 \times n}
            \\
            &+
            \large
            \begin{pmatrix}
                \sum_{i=1}^m u_i \left(\frac{\partial{v_i}}{\partial{x_1}} \right) & \cdots & \sum_{i=1}^m u_i \left(\frac{\partial{v_i}}{\partial{x_n}} \right)
            \end{pmatrix}_{1 \times n}
            \\[5mm]
            &=
            \large
            \begin{pmatrix}
                v_1 & \cdots & v_m
            \end{pmatrix}_{1 \times m}
            \begin{pmatrix}
                \frac{\partial{u_1}}{\partial{x_1}} & \cdots & \frac{\partial{u_1}}{\partial{x_n}} \\
                \vdots & \ddots & \vdots \\
                \frac{\partial{u_m}}{\partial{x_1}} & \cdots & \frac{\partial{u_m}}{\partial{x_n}}
            \end{pmatrix}_{m \times n}
            \\
            &+
            \large
            \begin{pmatrix}
                u_1 & \cdots & u_m
            \end{pmatrix}_{1 \times m}
            \begin{pmatrix}
                \frac{\partial{v_1}}{\partial{x_1}} & \cdots & \frac{\partial{v_1}}{\partial{x_n}} \\
                \vdots & \ddots & \vdots \\
                \frac{\partial{v_m}}{\partial{x_1}} & \cdots & \frac{\partial{v_m}}{\partial{x_n}}
            \end{pmatrix}_{m \times n}
            \\[10mm]
            &=
            \mathbf{v}^T \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}} + \mathbf{u}^T \frac{\partial{\mathbf{v}}}{\partial{\mathbf{x}}}
        \end{split}
    \end{aligned}
    $$

    <br><br>
    Denominator layout:
    <br><br>

    $$
    \begin{aligned}
        \frac{\partial{(\mathbf{u \cdot v})}}{\partial{\mathbf{x}}}
        &=
        \left\{
            \mathbf{v}^T \underset{\bf{Numerator}}{\left(\frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}\right)} + \mathbf{u}^T \underset{\bf{Numerator}}{\left(\frac{\partial{\mathbf{v}}}{\partial{\mathbf{x}}}\right)}
        \right\}^T
        \\[7mm]
        &=
        \underset{\bf{Numerator}}{\left(\frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}\right)}^T {(\mathbf{v}^T)}^T + \underset{\bf{Numerator}}{\left(\frac{\partial{\mathbf{v}}}{\partial{\mathbf{x}}}\right)}^T
        {(\mathbf{u}^T)}^T
        \\[7mm]
        &=
        \underset{\bf{Denominator}}{\left(\frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}}\right)} \mathbf{v} + \underset{\bf{Denominator}}{\left(\frac{\partial{\mathbf{v}}}{\partial{\mathbf{x}}}\right)} \mathbf{u}
        \\[7mm]
        &=
        \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}} \mathbf{v} + \frac{\partial{\mathbf{v}}}{\partial{\mathbf{x}}} \mathbf{u}
    \end{aligned}
    $$

<p align="right"><a href="#s-by-v"> Back to table </a></p>

<div id="2-2"></div>
<br><br>

- **Proof 2-2**
  - $\color{royalblue}{\LARGE \frac{\partial{(\mathbf{u} \cdot \mathbf{Av})}}{\partial{\mathbf{x}}}}$, $\; \mathbf{u} = \mathbf{u}(\mathbf{x}), \; \mathbf{v} = \mathbf{v}(\mathbf{x}), \; \mathbf{A}$ is not a function of $\mathbf{x}$

    $$
    \begin{aligned}
        &
        \mathbf{u} = 
        \begin{pmatrix}
            u_1 & \cdots & u_m
        \end{pmatrix}_{m \times 1}^T
        , \qquad
        \mathbf{v} = 
        \begin{pmatrix}
            v_1 & \cdots & v_m
        \end{pmatrix}_{m \times 1}^T
        \\[10mm]
        &
        \mathbf{A}=
        \begin{pmatrix}
            a_{11} & \cdots & a_{1m} \\
            \vdots & \ddots & \vdots \\
            a_{m1} & \cdots & a_{mm}
        \end{pmatrix}_{m \times m}
        , \qquad
        \mathbf{x} = 
        \begin{pmatrix}
            x_1 & \cdots & x_n 
        \end{pmatrix}_{n \times 1}^T
    \end{aligned}
    $$

    <br><br>
    Numerator layout:

    $$
    \begin{aligned}
        \frac{\partial{(\mathbf{u} \cdot \mathbf{Av})}}{\partial{\mathbf{x}}}
        &=
        (\mathbf{Av})^T \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}} + \mathbf{u}^T \frac{\partial{(\mathbf{Av})}}{\partial{\mathbf{x}}}
        \\[7mm]
        &=
        \mathbf{v}^T \mathbf{A}^T \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}} + \mathbf{u}^T \mathbf{A} \frac{\partial{\mathbf{v}}}{\partial{\mathbf{x}}}
    \end{aligned}
    $$

    <br><br>
    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial{(\mathbf{u} \cdot \mathbf{Av})}}{\partial{\mathbf{x}}}
        &=
        \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}} \mathbf{Av} + \frac{\partial{(\mathbf{Av})}}{\partial{\mathbf{x}}} \mathbf{u}
        \\[7mm]
        &=
        \frac{\partial{\mathbf{u}}}{\partial{\mathbf{x}}} \mathbf{Av} + \frac{\partial{\mathbf{v}}}{\partial{\mathbf{x}}} \mathbf{A}^T \mathbf{u}
    \end{aligned}
    $$

<p align="right"><a href="#s-by-v"> Back to table </a></p>

<div id="2-3"></div>
<br><br>

- **Proof 2-3**
  - $\color{royalblue}{\LARGE \frac{\partial^2{f}}{\partial{\mathbf{x}}\partial{\mathbf{x}}^T}}$

    $$
    \mathbf{x} = 
    \begin{pmatrix}
        x_1 & \cdots & x_n
    \end{pmatrix}_{n \times 1}^T
    $$

    <br><br>
    Numerator layout:

    $$
    \begin{aligned}
        \frac{\partial^2{f}}{\partial{\mathbf{x}}\partial{\mathbf{x}}^T}
        &=
        \frac{\partial}{\partial{\mathbf{x}^T}} \frac{\partial{f}}{\partial{\mathbf{x}}}
        \\[7mm]
        &=
        \frac{\partial}{\partial{\mathbf{x}^T}}
        \large
        \begin{pmatrix}
            \frac{\partial{f}}{\partial{x_1}} & \cdots & \frac{\partial{f}}{\partial{x_n}}
        \end{pmatrix}_{1 \times n}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{f}}{\partial{x_1}\partial{x_1}} & \cdots & \frac{\partial{f}}{\partial{x_n}\partial{x_1}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{f}}{\partial{x_1}\partial{x_n}} & \cdots & \frac{\partial{f}}{\partial{x_n}\partial{x_n}}
        \end{pmatrix}_{n \times n}
        \\[7mm]
        &=
        \mathbf{H}^T
    \end{aligned}
    $$

    <br><br>
    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial^2{f}}{\partial{\mathbf{x}}\partial{\mathbf{x}}^T}
        &=
        \frac{\partial}{\partial{\mathbf{x}^T}} \frac{\partial{f}}{\partial{\mathbf{x}}}
        \\[7mm]
        &=
        \frac{\partial}{\partial{\mathbf{x}^T}}
        \large
        \begin{pmatrix}
            \frac{\partial{f}}{\partial{x_1}} \\ \vdots \\ \frac{\partial{f}}{\partial{x_n}}
        \end{pmatrix}_{n \times 1}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{f}}{\partial{x_1}\partial{x_1}} & \cdots & \frac{\partial{f}}{\partial{x_1}\partial{x_n}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{f}}{\partial{x_n}\partial{x_1}} & \cdots & \frac{\partial{f}}{\partial{x_n}\partial{x_n}}
        \end{pmatrix}_{n \times n}
        \\[7mm]
        &=
        \mathbf{H}
    \end{aligned}
    $$

<p align="right"><a href="#s-by-v"> Back to table </a></p>

<div id="2-4"></div>
<br><br>

- **Proof 2-4**
  - $\color{royalblue}{\LARGE \frac{\partial{(\mathbf{a \cdot x})}}{\partial{\mathbf{x}}}}$ $, \; \mathbf{a}$ is not a function of $\mathbf{x}$ 

    $$
    \mathbf{a} =
    \begin{pmatrix}
        a_1 & \cdots & a_n
    \end{pmatrix}_{n \times 1}^T
    , \qquad
    \mathbf{x} = 
    \begin{pmatrix}
        x_1 & \cdots & x_n
    \end{pmatrix}_{n \times 1}^T
    $$

    <br><br>
    Numerator layout:

    $$
    \begin{aligned}
        \frac{\partial{(\mathbf{a \cdot x})}}{\partial{\mathbf{x}}}
        &=
        \mathbf{a}^T \frac{\partial{\mathbf{x}}}{\partial{\mathbf{x}}} + \mathbf{x}^T \frac{\partial{\mathbf{a}}}{\partial{\mathbf{x}}}
        \\[7mm]
        &=
        \mathbf{a}^T \mathbf{I} + \mathbf{x}^T \mathbf{0}
        \\[7mm]
        &=
        \mathbf{a}^T
    \end{aligned}
    $$
    
    <br><br>
    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial{(\mathbf{a \cdot x})}}{\partial{\mathbf{x}}}
        &=
        \frac{\partial{\mathbf{x}}}{\partial{\mathbf{x}}} \mathbf{a} + \frac{\partial{\mathbf{a}}}{\partial{\mathbf{x}}} \mathbf{x}
        \\[7mm]
        &=
        \mathbf{I} \mathbf{a} + \mathbf{0} \mathbf{x}
        \\[7mm]
        &=
        \mathbf{a}
    \end{aligned}
    $$

<p align="right"><a href="#s-by-v"> Back to table </a></p>

<div id="2-5"></div>
<br><br>

- **Proof 2-5**
  - $\color{royalblue}{\LARGE \frac{\partial{(\mathbf{a}^T \mathbf{Ax})}}{\partial{\mathbf{x}}}}$ $, \; \mathbf{A}$, $\mathbf{a}$ are not functions of $\mathbf{x}$

    $$
    \mathbf{a} = 
    \begin{pmatrix}
        a_1 & \cdots & a_m
    \end{pmatrix}_{m \times 1}^T
    , \qquad
    \mathbf{A} =
    \begin{pmatrix}
        a_{11} & \cdots & a_{1n} \\
        \vdots & \ddots & \vdots \\
        a_{m1} & \cdots & a_{mn}
    \end{pmatrix}_{m \times n}
    , \qquad
    \mathbf{x} =
    \begin{pmatrix}
        x_1 & \cdots & x_n
    \end{pmatrix}_{n \times 1}^T
    $$

    <br><br>
    Numerator layout:

    $$
    \begin{aligned}
        \frac{\partial{(\mathbf{a}^T \mathbf{Ax})}}{\partial{\mathbf{x}}}
        &=
        \frac{\partial(\mathbf{a} \cdot \mathbf{Ax})}{\partial{\mathbf{x}}}\\[7mm]
        &=
        \mathbf{a}^T \mathbf{A} \frac{\partial{\mathbf{x}}}{\partial{\mathbf{x}}} + \mathbf{x}^T \mathbf{A}^T \frac{\partial{\mathbf{a}}}{\partial{\mathbf{x}}}
        \\[7mm]
        &= 
        \mathbf{a}^T \mathbf{AI} + \mathbf{x}^T \mathbf{A}^T \mathbf{0}
        \\[7mm]
        &=
        \mathbf{a}^T \mathbf{A}
    \end{aligned}
    $$

    <br><br>
    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial{(\mathbf{a}^T \mathbf{Ax})}}{\partial{\mathbf{x}}}
        &=
        \frac{\partial(\mathbf{a} \cdot \mathbf{Ax})}{\partial{\mathbf{x}}}\\[7mm]
        &= \frac{\partial{\mathbf{a}}}{\partial{\mathbf{x}}} \mathbf{Ax} +  \frac{\partial{\mathbf{x}}}{\partial{\mathbf{x}}} \mathbf{A}^T \mathbf{a}
        \\[7mm]
        &=
        \mathbf{0} \mathbf{Ax} + \mathbf{I} \mathbf{A}^T \mathbf{a}
        \\[7mm]
        &=
        \mathbf{A}^T \mathbf{a}
    \end{aligned}
    $$

<p align="right"><a href="#s-by-v"> Back to table </a></p>

<div id="2-6"></div>
<br><br>

- **Proof 2-6**
  - $\color{royalblue}{\LARGE \frac{\partial({\mathbf{x}^T\mathbf{Ax}})}{\partial{\mathbf{x}}}}$, $\; \mathbf{A}$ is not a function of $\mathbf{x}$

    $$
    \mathbf{A} = 
    \begin{pmatrix}
        a_{11} & \cdots & a_{1n} \\
        \vdots & \ddots & \vdots \\
        a_{n1} & \cdots & a_{nn}
    \end{pmatrix}_{n \times n}
    , \qquad
    \mathbf{x} =
    \begin{pmatrix}
        x_1 & \cdots & x_n
    \end{pmatrix}_{n \times 1}^T
    $$

    <br><br>
    Numerator layout:

    $$
    \begin{aligned}
        \frac{\partial({\mathbf{x}^T\mathbf{Ax}})}{\partial{\mathbf{x}}}
        &=
        \frac{\partial(\mathbf{x} \cdot \mathbf{Ax})}{\partial{\mathbf{x}}}
        \\[7mm]
        &=
        \mathbf{x}^T \mathbf{A} \frac{\partial{\mathbf{x}}}{\partial{\mathbf{x}}} + \mathbf{x}^T \mathbf{A}^T \frac{\partial{\mathbf{x}}}{\partial{\mathbf{x}}}
        \\[7mm]
        &=
        \mathbf{x}^T \mathbf{A} \mathbf{I} + \mathbf{x}^T \mathbf{A}^T \mathbf{I}
        \\[7mm]
        &=
        \mathbf{x}^T (\mathbf{A} + \mathbf{A}^T)
    \end{aligned}
    $$

    <br><br>
    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial({\mathbf{x}^T\mathbf{Ax}})}{\partial{\mathbf{x}}}
        &=
        \frac{\partial(\mathbf{x} \cdot \mathbf{Ax})}{\partial{\mathbf{x}}}
        \\[7mm]
        &=
        \frac{\partial{\mathbf{x}}}{\partial{\mathbf{x}}} \mathbf{A} \mathbf{x} + \frac{\partial{\mathbf{x}}}{\partial{\mathbf{x}}} \mathbf{A}^T \mathbf{x}
        \\[7mm]
        &=
        \mathbf{IAx} + \mathbf{I} \mathbf{A}^T \mathbf{x}
        \\[7mm]
        &=
        (\mathbf{A} + \mathbf{A}^T) \mathbf{x}
    \end{aligned}
    $$

<p align="right"><a href="#s-by-v"> Back to table </a></p>

<div id="2-7"></div>
<br><br>

- **Proof 2-7**
  - $\color{royalblue}{\LARGE \frac{\partial^2({\mathbf{x}^T\mathbf{Ax}})}{\partial{\mathbf{x}\partial{\mathbf{x}^T}}}}$, $\; \mathbf{A}$ is not a function of $\mathbf{x}$

    $$
    \mathbf{A} = 
    \begin{pmatrix}
        a_{11} & \cdots & a_{1n} \\
        \vdots & \ddots & \vdots \\
        a_{n1} & \cdots & a_{nn}
    \end{pmatrix}_{n \times n}
    , \qquad
    \mathbf{x} =
    \begin{pmatrix}
        x_1 & \cdots & x_n
    \end{pmatrix}_{n \times 1}^T
    $$

    <br><br>
    Numerator layout:

    $$
    \begin{aligned}
        \frac{\partial^2({\mathbf{x}^T\mathbf{Ax}})}{\partial{\mathbf{x}\partial{\mathbf{x}^T}}}
        &=
        \frac{\partial}{\partial{\mathbf{x}^T}} \{\mathbf{x}^T (\mathbf{A} + \mathbf{A}^T)\}
        \\[7mm]
        &=
        \left\{\frac{\partial}{\partial{\mathbf{x}}} [\mathbf{x}^T (\mathbf{A} + \mathbf{A}^T)] \right\}^T
        \\[7mm]
        &=
        \left\{(\mathbf{A} + \mathbf{A}^T)^T\right\}^T
        \\[7mm]
        &=
        \mathbf{A} + \mathbf{A}^T
    \end{aligned}
    $$

    <br><br>
    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial^2({\mathbf{x}^T\mathbf{Ax}})}{\partial{\mathbf{x}\partial{\mathbf{x}^T}}}
        &=
        \frac{\partial}{\partial{\mathbf{x}^T}} \{\mathbf{x}^T (\mathbf{A} + \mathbf{A}^T)\}
        \\[7mm]
        &=
        \left\{\frac{\partial}{\partial{\mathbf{x}}} [\mathbf{x}^T (\mathbf{A} + \mathbf{A}^T)] \right\}^T
        \\[7mm]
        &=
        (\mathbf{A} + \mathbf{A}^T)^T
        \\[7mm]
        &=
        \mathbf{A} + \mathbf{A}^T
    \end{aligned}
    $$

<p align="right"><a href="#s-by-v"> Back to table </a></p>

<div id="2-8"></div>
<br><br>

- **Proof 2-8**
  - $\color{royalblue}{\LARGE \frac{\partial{\Vert \mathbf{x} \Vert^2}}{\partial{\mathbf{x}}}}$

    $$
    \mathbf{x} = 
    \begin{pmatrix}
        x_1 & \cdots & x_n
    \end{pmatrix}_{n \times 1}^T
    $$

    <br><br>
    Numerator layout:

    $$
    \begin{aligned}
        \frac{\partial{\Vert \mathbf{x} \Vert^2}}{\partial{\mathbf{x}}}
        &=
        \frac{\partial(\mathbf{x} \cdot \mathbf{x})}{\partial{\mathbf{x}}}
        \\[7mm]
        &=
        \mathbf{x}^T \frac{\partial{\mathbf{x}}}{\partial{\mathbf{x}}} + \mathbf{x}^T \frac{\partial{\mathbf{x}}}{\partial{\mathbf{x}}}
        \\[7mm]
        &=
        \mathbf{x}^T \mathbf{I} + \mathbf{x}^T \mathbf{I}
        \\[7mm]
        &=
        2\mathbf{x}^T
    \end{aligned}
    $$

    <br><br>
    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial{\Vert \mathbf{x} \Vert^2}}{\partial{\mathbf{x}}}
        &=
        \frac{\partial(\mathbf{x} \cdot \mathbf{x})}{\partial{\mathbf{x}}}
        \\[7mm]
        &=
        \frac{\partial{\mathbf{x}}}{\partial{\mathbf{x}}} \mathbf{x} + \frac{\partial{\mathbf{x}}}{\partial{\mathbf{x}}} \mathbf{x}
        \\[7mm]
        &=
        \mathbf{I} \mathbf{x} +  \mathbf{I} \mathbf{x}
        \\[7mm]
        &=
        2\mathbf{x}
    \end{aligned}
    $$

<p align="right"><a href="#s-by-v"> Back to table </a></p>

<div id="2-9"></div>
<br><br>

- **Proof 2-9**
  - $\color{royalblue}{\LARGE \frac{\partial({\mathbf{a}^T \mathbf{xx}^T \mathbf{b}})}{\partial{\mathbf{x}}}}$, $\; \mathbf{a}, \mathbf{b}$ are not functions of $\mathbf{x}$

    $$
    \mathbf{a} =
    \begin{pmatrix}
        a_1 & \cdots & a_n
    \end{pmatrix}_{n \times 1}^T
    , \qquad
    \mathbf{b} =
    \begin{pmatrix}
        b_1 & \cdots & b_n
    \end{pmatrix}_{n \times 1}^T
    , \qquad
    \mathbf{x} =
    \begin{pmatrix}
        x_1 & \cdots & x_n
    \end{pmatrix}_{n \times 1}^T
    $$

    <br><br>
    Numerator layout:

    $$
    \begin{aligned}
        \frac{\partial(\mathbf{a}^T \mathbf{xx}^T \mathbf{b})}{\partial{\mathbf{x}}}
        &=
        \frac{\partial[(\mathbf{a}^T \mathbf{x}) (\mathbf{x}^T \mathbf{b})]}{\partial{\mathbf{x}}}
        \\[7mm]
        &=
        \mathbf{a}^T \mathbf{x} \frac{\partial(\mathbf{x}^T \mathbf{b})}{\partial{\mathbf{x}}} + \mathbf{x}^T \mathbf{b} \frac{\partial(\mathbf{a}^T \mathbf{x})}{\partial{\mathbf{x}}}
        \\[7mm]
        &=
        \mathbf{a}^T \mathbf{x} \mathbf{b}^T + \mathbf{x}^T \mathbf{b} \mathbf{a}^T
        \\[7mm]
        &=
        \mathbf{x}^T \mathbf{a} \mathbf{b}^T + \mathbf{x}^T \mathbf{b} \mathbf{a}^T
        \\[7mm]
        &=
        \mathbf{x}^T (\mathbf{a} \mathbf{b}^T + \mathbf{b} \mathbf{a}^T)
    \end{aligned}
    $$

    <br><br>
    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial(\mathbf{a}^T \mathbf{xx}^T \mathbf{b})}{\partial{\mathbf{x}}}
        &=
        \frac{\partial[(\mathbf{a}^T \mathbf{x}) (\mathbf{x}^T \mathbf{b})]}{\partial{\mathbf{x}}}
        \\[7mm]
        &=
        \mathbf{a}^T \mathbf{x} \frac{\partial(\mathbf{x}^T \mathbf{b})}{\partial{\mathbf{x}}} + \mathbf{x}^T \mathbf{b} \frac{\partial(\mathbf{a}^T \mathbf{x})}{\partial{\mathbf{x}}}
        \\[7mm]
        &=
        \mathbf{a}^T \mathbf{x} \mathbf{b} + \mathbf{x}^T \mathbf{b} \mathbf{a}
        \\[7mm]
        &=
        \mathbf{a}^T \mathbf{x} \mathbf{b} + \mathbf{b}^T \mathbf{x} \mathbf{a}
        \\[7mm]
        &=
        \mathbf{ba}^T \mathbf{x} + \mathbf{ab}^T \mathbf{x}
        \\[7mm]
        &=
        (\mathbf{ab}^T + \mathbf{ba}^T) \mathbf{x}
    \end{aligned}
    $$

<p align="right"><a href="#s-by-v"> Back to table </a></p>

<div id="2-10"></div>
<br><br>

- **Proof 2-10**
  - $\color{royalblue}{\LARGE \frac{\partial{\Vert \mathbf{x - a} \Vert}}{\partial{\mathbf{x}}}}$, $\; \mathbf{a}$ is not a function of $\mathbf{x}$

    $$
    \mathbf{a} = 
    \begin{pmatrix}
        a_1 & \cdots & a_n
    \end{pmatrix}_{n \times 1}^T
    , \qquad
    \mathbf{x} =
    \begin{pmatrix}
        x_1 & \cdots & x_n
    \end{pmatrix}_{n \times 1}^T
    $$

    <br><br>
    Numerator layout:

    $$
    \begin{aligned}
        \frac{\partial{\Vert \mathbf{x - a} \Vert}}{\partial{\mathbf{x}}}
        &=
        \large
        \frac{\partial \sqrt{\sum_{i=1}^n (x_i - a_i)^2}}{\partial{\mathbf{x}}}
        \\[7mm]
        &=
        \Large
        \begin{pmatrix}
            \frac{\partial \sqrt{\sum_{i=1}^n (x_i - a_i)^2}}{\partial{x_1}} & \cdots & \frac{\partial \sqrt{\sum_{i=1}^n (x_i - a_i)^2}}{\partial{x_n}}
        \end{pmatrix}_{1 \times n}
        \\[7mm]
        &=
        \Large
        \begin{pmatrix}
            \frac{2(x_1 - a_1)}{2\sqrt{\sum_{i=1}^n (x_i - a_i)^2}} & \cdots & \frac{2(x_n - a_n)}{2\sqrt{\sum_{i=1}^n (x_i - a_i)^2}}
        \end{pmatrix}_{1 \times n}
        \\[7mm]
        &=
        \frac{1}{\Vert \mathbf{x - a} \Vert}
        \begin{pmatrix}
            x_1 - a_1 \\ \vdots \\ x_n - a_n
        \end{pmatrix}_{1 \times n}^T
        \\[7mm]
        &=
        \frac{1}{\Vert \mathbf{x - a} \Vert}
        (
            \begin{pmatrix}
                x_1 \\ \vdots \\ x_n
            \end{pmatrix}_{1 \times n}^T
            -
            \begin{pmatrix}
                a_1 \\ \vdots \\ a_n
            \end{pmatrix}_{1 \times n}^T
        )
        \\[7mm]
        &=
        \frac{(\mathbf{x} - \mathbf{a})^T}{\Vert \mathbf{x - a} \Vert}
    \end{aligned}
    $$

    <br><br>
    优化:

    $$
    \begin{aligned}
        \frac{\partial{\Vert \mathbf{x - a} \Vert}}{\partial{\mathbf{x}}}
        &=
        \frac{\partial\sqrt{(\mathbf{x} - \mathbf{a}) \cdot (\mathbf{x} - \mathbf{a})}}{\partial{\mathbf{x}}}
        \\[7mm]
        &=
        \frac{1}{2 \sqrt{(\mathbf{x} - \mathbf{a}) \cdot (\mathbf{x} - \mathbf{a})}} \frac{\partial{(\mathbf{x} - \mathbf{a}) \cdot (\mathbf{x} - \mathbf{a})}}{\partial{\mathbf{x}}}
        \\[7mm]
        &=
        \frac{1}{2 \sqrt{(\mathbf{x} - \mathbf{a}) \cdot (\mathbf{x} - \mathbf{a})}} \left\{(\mathbf{x} - \mathbf{a})^T \frac{\partial(\mathbf{x} - \mathbf{a})}{\partial{\mathbf{x}}} + (\mathbf{x} - \mathbf{a})^T \frac{\partial(\mathbf{x} - \mathbf{a})}{\partial{\mathbf{x}}} \right\}
        \\[7mm]
        &=
        \frac{1}{2 \sqrt{(\mathbf{x} - \mathbf{a}) \cdot (\mathbf{x} - \mathbf{a})}} \left\{(\mathbf{x} - \mathbf{a})^T \mathbf{I} + (\mathbf{x} - \mathbf{a})^T \mathbf{I} \right\}
        \\[7mm]
        &=
        \frac{2 (\mathbf{x} - \mathbf{a})^T}{2 \sqrt{(\mathbf{x} - \mathbf{a}) \cdot (\mathbf{x} - \mathbf{a})}}
        \\[7mm]
        &=
        \frac{(\mathbf{x} - \mathbf{a})^T}{\Vert \mathbf{x} - \mathbf{a} \Vert}
    \end{aligned}
    $$

    <br><br>
    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial{\Vert \mathbf{x - a} \Vert}}{\partial{\mathbf{x}}}
        &=
        \left\{
            \frac{(\mathbf{x} - \mathbf{a})^T}{\Vert \mathbf{x - a} \Vert}
        \right\}^T
        \\[7mm]
        &=
        \frac{\mathbf{x} - \mathbf{a}}{\Vert \mathbf{x - a} \Vert}
    \end{aligned}
    $$

<p align="right"><a href="#s-by-v"> Back to table </a></p>

### 向量对标量 (Vector-by-scalar)

<div id="3-1"></div>
<br><br>

- **Proof 3-1**
  - $\color{royalblue}{\LARGE \frac{\partial{\mathbf{Au}}}{\partial{x}}}$, $\; \mathbf{A}$ is not a function of $\large x$

    $$
    \mathbf{A} =
    \begin{pmatrix}
        a_{11} & \cdots & a_{1n} \\
        \vdots & \ddots & \vdots \\
        a_{m1} & \cdots & a_{mn}
    \end{pmatrix}_{m \times n}
    , \qquad
    \mathbf{u} = 
    \begin{pmatrix}
        u_1 & \cdots & u_n
    \end{pmatrix}_{n \times 1}^T
    $$

    <br><br>
    Numerator layout:

    $$
    \begin{aligned}
        \frac{\partial{\mathbf{Au}}}{\partial{x}}
        &=
        \large
        \frac{\partial}{\partial{x}}
        \begin{pmatrix}
            \sum_{i=1}^n a_{1i} u_i \\
            \vdots \\
            \sum_{i=1}^n a_{mi} u_i
        \end{pmatrix}_{m \times 1}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial}{\partial{x}} \sum_{i=1}^n a_{1i} u_i \\
            \vdots \\
            \frac{\partial}{\partial{x}} \sum_{i=1}^n a_{mi} u_i
        \end{pmatrix}_{m \times 1}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \sum_{i=1}^n a_{1i} \frac{\partial{u_i}}{\partial{x}}\\
            \vdots \\
            \sum_{i=1}^n a_{mi} \frac{\partial{u_i}}{\partial{x}}
        \end{pmatrix}_{m \times 1}
        \\[7mm]
        &=
        \begin{pmatrix}
            a_{11} & \cdots & a_{1n} \\
            \vdots & \ddots & \vdots \\
            a_{m1} & \cdots & a_{mn}
        \end{pmatrix}_{m \times n}
        \large
        \begin{pmatrix}
            \frac{\partial{u_1}}{\partial{x}} \\
            \vdots \\
            \frac{\partial{u_n}}{\partial{x}}   
        \end{pmatrix}_{n \times 1}
        \\[7mm]
        &=
        \mathbf{A} \frac{\partial{\mathbf{u}}}{\partial{x}}
    \end{aligned}
    $$

    <br><br>
    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial{\mathbf{Au}}}{\partial{x}}
        &=
        \large
        \frac{\partial}{\partial{x}}
        \begin{pmatrix}
            \sum_{i=1}^n a_{1i} u_i \\
            \vdots \\
            \sum_{i=1}^n a_{mi} u_i
        \end{pmatrix}_{m \times 1}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial}{\partial{x}} \sum_{i=1}^n a_{1i} u_i \\
            \vdots \\
            \frac{\partial}{\partial{x}} \sum_{i=1}^n a_{mi} u_i
        \end{pmatrix}_{m \times 1}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \sum_{i=1}^n a_{1i} \frac{\partial{u_i}}{\partial{x}}\\
            \vdots \\
            \sum_{i=1}^n a_{mi} \frac{\partial{u_i}}{\partial{x}}
        \end{pmatrix}_{m \times 1}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{u_1}}{\partial{x}} & \cdots & \frac{\partial{u_n}}{\partial{x}}
        \end{pmatrix}_{1 \times n}
        \normalsize
        \begin{pmatrix}
            a_{11} & \cdots & a_{m1} \\
            \vdots & \ddots & \vdots \\
            a_{1n} & \cdots & a_{mn}
        \end{pmatrix}_{n \times m}
        \\[7mm]
        &=
        \frac{\partial{\mathbf{u}}}{\partial{x}} \mathbf{A}^T
    \end{aligned}
    $$


<p align="right"><a href="#v-by-s"> Back to table </a></p>

<div id="3-2"></div>
<br><br>

- **Proof 3-2**
  - $\color{royalblue}{\LARGE \frac{\partial(\mathbf{u}^T \mathbf{v})}{\partial{x}}}$, $\; \mathbf{u} = \mathbf{u}(x), \mathbf{v} = \mathbf{v}(x)$

    $$
    \mathbf{u} = 
    \begin{pmatrix}
        u_1 & \cdots & u_n
    \end{pmatrix}_{n \times 1}^T
    , \qquad
    \mathbf{v} = 
    \begin{pmatrix}
        v_1 & \cdots & v_n
    \end{pmatrix}_{n \times 1}^T
    $$

    <br>

    $$
    \underset{\bf{numerator}}{\frac{\partial{\mathbf{u}}}{\partial{x}}} =
    \large 
    \begin{pmatrix}
        \frac{\partial{u_1}}{\partial{x}} \\ \vdots \\ \frac{\partial{u_n}}{\partial{x}}
    \end{pmatrix}_{n \times 1}
    , \qquad
    \normalsize
    \underset{\bf{denominator}}{\frac{\partial{\mathbf{u}}}{\partial{x}}} =
    \large
    \begin{pmatrix}
        \frac{\partial{u_1}}{\partial{x}} & \cdots & \frac{\partial{u_n}}{\partial{x}}
    \end{pmatrix}_{1 \times n}
    $$

    <br><br>
    Numerator layout:

    $$
    \begin{aligned}
        \frac{\partial(\mathbf{u}^T \mathbf{v})}{\partial{x}}
        &=
        \frac{\partial}{\partial{x}} \sum_{i=1}^n u_i v_i
        \\[7mm]
        &=
        \sum_{i=1}^n \frac{\partial}{\partial{x}} u_i v_i
        \\[7mm]
        &= 
        \sum_{i=1}^n \left(\frac{\partial{u_i}}{\partial{x}} v_i + u_i \frac{\partial{v_i}}{\partial{x}}\right)
        \\[7mm]
        &=
        \sum_{i=1}^n \frac{\partial{u_i}}{\partial{x}} v_i + \sum_{i=1}^n  u_i \frac{\partial{v_i}}{\partial{x}}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{u_1}}{\partial{x}} & \cdots & \frac{\partial{u_n}}{\partial{x}}
        \end{pmatrix}_{1 \times n}
        \normalsize
        \begin{pmatrix}
            v_1 \\ \vdots \\ v_n
        \end{pmatrix}_{n \times 1}
        +
        \begin{pmatrix}
            u_1 & \cdots & u_n
        \end{pmatrix}_{1 \times n}
        \large
        \begin{pmatrix}
            \frac{\partial{v_1}}{\partial{x}} \\ \vdots \\ \frac{\partial{v_n}}{\partial{x}}
        \end{pmatrix}_{n \times 1}
        \\[7mm]
        &=
        \left(\frac{\partial{\mathbf{u}}}{\partial{x}}\right)^T \mathbf{v} + \mathbf{u}^T \frac{\partial{\mathbf{v}}}{\partial{x}}
    \end{aligned}
    $$

    <br><br>
    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial(\mathbf{u}^T \mathbf{v})}{\partial{x}}
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{u_1}}{\partial{x}} & \cdots & \frac{\partial{u_n}}{\partial{x}}
        \end{pmatrix}_{1 \times n}
        \normalsize
        \begin{pmatrix}
            v_1 \\ \vdots \\ v_n
        \end{pmatrix}_{n \times 1}
        +
        \begin{pmatrix}
            u_1 & \cdots & u_n
        \end{pmatrix}_{1 \times n}
        \large
        \begin{pmatrix}
            \frac{\partial{v_1}}{\partial{x}} \\ \vdots \\ \frac{\partial{v_n}}{\partial{x}}
        \end{pmatrix}_{n \times 1}
        \\[7mm]
        &=
        \frac{\partial{\mathbf{u}}}{\partial{x}} \mathbf{v} + \mathbf{u}^T \left(\frac{\partial{\mathbf{v}}}{\partial{x}}\right)^T
    \end{aligned}
    $$

<p align="right"><a href="#v-by-s"> Back to table </a></p>

<div id="3-3"></div>
<br><br>

- **Proof 3-3**
  - $\color{royalblue}{\LARGE \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{x}}}$, $\; \mathbf{u} = \mathbf{u}(x)$

    $$
    \mathbf{g} = 
    \begin{pmatrix}
        g_1 & \cdots & g_m
    \end{pmatrix}_{m \times 1}^T
    , \qquad
    \mathbf{u} = 
    \begin{pmatrix}
        u_1 & \cdots & u_n
    \end{pmatrix}_{n \times 1}^T
    $$

    <br><br>
    Numerator layout:

    $$
    \begin{aligned}
        \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{x}}
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{g_1}}{\partial{x}}\\ \vdots \\ \frac{\partial{g_m}}{\partial{x}}
        \end{pmatrix}_{m \times 1}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{g_1}}{\partial{\mathbf{u}}} \frac{\partial{\mathbf{u}}}{\partial{x}} \\ 
            \vdots \\
            \frac{\partial{g_m}}{\partial{\mathbf{u}}} \frac{\partial{\mathbf{u}}}{\partial{x}}
        \end{pmatrix}_{m \times 1}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \begin{pmatrix}
                \frac{\partial{g_1}}{\partial{u_1}} & \cdots & \frac{\partial{g_1}}{\partial{u_n}}
            \end{pmatrix}
            \begin{pmatrix}
                \frac{\partial{u_1}}{\partial{x}} \\ \vdots \\ \frac{\partial{u_n}}{\partial{x}}
            \end{pmatrix}
            \\
            \vdots
            \\
            \begin{pmatrix}
                \frac{\partial{g_m}}{\partial{u_1}} & \cdots & \frac{\partial{g_m}}{\partial{u_n}}
            \end{pmatrix}
            \begin{pmatrix}
                \frac{\partial{u_1}}{\partial{x}} \\ \vdots \\ \frac{\partial{u_n}}{\partial{x}}
            \end{pmatrix}
        \end{pmatrix}_{m \times 1}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \sum_{i=1}^n \frac{\partial{g_1}}{\partial{u_i}} \frac{\partial{u_i}}{\partial{x}}
            \\
            \vdots
            \\
            \sum_{i=1}^n \frac{\partial{g_m}}{\partial{u_i}} \frac{\partial{u_i}}{\partial{x}}
        \end{pmatrix}_{m \times 1}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{g_1}}{\partial{u_1}} & \cdots & \frac{\partial{g_1}}{\partial{u_n}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{g_m}}{\partial{u_1}} & \cdots & \frac{\partial{g_m}}{\partial{u_n}}
        \end{pmatrix}_{m \times n}
        \begin{pmatrix}
            \frac{\partial{u_1}}{\partial{x}} \\ \vdots \\ \frac{\partial{u_n}}{\partial{x}}
        \end{pmatrix}_{n \times 1}
        \\[7mm]
        &=
        \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{u}}} \frac{\partial{\mathbf{u}}}{\partial{x}}
    \end{aligned}
    $$

    <br><br>
    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial{\mathbf{g}}}{\partial{x}}
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{g_1}}{\partial{x}} & \cdots & \frac{\partial{g_m}}{\partial{x}}
        \end{pmatrix}_{1 \times m}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{\mathbf{u}}}{\partial{x}} \frac{\partial{g_1}}{\partial{\mathbf{u}}} & \cdots & \frac{\partial{\mathbf{u}}}{\partial{x}} \frac{\partial{g_m}}{\partial{\mathbf{u}}}
        \end{pmatrix}_{1 \times m}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \begin{pmatrix}
                \frac{\partial{u_1}}{\partial{x}} & \cdots & \frac{\partial{u_n}}{\partial{x}}
            \end{pmatrix}
            \begin{pmatrix}
                \frac{\partial{g_1}}{\partial{u_1}} \\ \vdots \\ \frac{\partial{g_1}}{\partial{u_n}}
            \end{pmatrix}
            &
            \cdots
            &
            \begin{pmatrix}
                \frac{\partial{u_1}}{\partial{x}} & \cdots & \frac{\partial{u_n}}{\partial{x}}
            \end{pmatrix}
            \begin{pmatrix}
                \frac{\partial{g_m}}{\partial{u_1}} \\ \vdots \\ \frac{\partial{g_m}}{\partial{u_n}}
            \end{pmatrix}
        \end{pmatrix}_{1 \times m}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \sum_{i=1}^n \frac{\partial{u_i}}{\partial{x}} \frac{\partial{g_1}}{\partial{u_i}} & \cdots & \sum_{i=1}^n \frac{\partial{u_i}}{\partial{x}} \frac{\partial{g_m}}{\partial{u_i}}
        \end{pmatrix}_{1 \times m}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{u_1}}{\partial{x}} & \cdots & \frac{\partial{u_n}}{\partial{x}}
        \end{pmatrix}_{1 \times n}
        \begin{pmatrix}
            \frac{\partial{g_1}}{\partial{u_1}} & \cdots & \frac{\partial{g_m}}{\partial{u_1}} \\
            \vdots & \ddots & \vdots \\
            \frac{\partial{g_1}}{\partial{u_n}} & \cdots & \frac{\partial{g_m}}{\partial{u_n}}
        \end{pmatrix}_{n \times m}
        \\[7mm]
        &=
        \frac{\partial{\mathbf{u}}}{\partial{x}} \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{u}}}
    \end{aligned}
    $$


<p align="right"><a href="#v-by-s"> Back to table </a></p>

<div id="3-4"></div>
<br><br>

- **Proof 3-4**
  - $\color{royalblue}{\LARGE \frac{\partial{\mathbf{f}(\mathbf{g}(\mathbf{u}))}}{\partial{x}}}$, $\; \mathbf{u} = \mathbf{u}(x)$

    <br><br>
    Numerator:

    $$
    \begin{aligned}
        \frac{\partial{\mathbf{f}(\mathbf{g}(\mathbf{u}))}}{\partial{x}}
        &=
        \frac{\partial{\mathbf{f}(\mathbf{g}(\mathbf{u}))}}{\partial{\mathbf{g}(\mathbf{u})}} \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{x}}
        \\[7mm]
        &=
        \frac{\partial{\mathbf{f}(\mathbf{g})}}{\partial{\mathbf{g}}} \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{u}}} \frac{\partial{\mathbf{u}}}{\partial{x}} 
    \end{aligned}
    $$

    <br><br>
    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial{\mathbf{f}(\mathbf{g}(\mathbf{u}))}}{\partial{x}}
        &=
        \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{x}} \frac{\partial{\mathbf{f}(\mathbf{g}(\mathbf{u}))}}{\partial{\mathbf{g}(\mathbf{u})}}
        \\[7mm]
        &=
        \frac{\partial{\mathbf{u}}}{\partial{x}} \frac{\partial{\mathbf{g}(\mathbf{u})}}{\partial{\mathbf{u}}} \frac{\partial{\mathbf{f}(\mathbf{g})}}{\partial{\mathbf{g}}}
    \end{aligned}
    $$

<p align="right"><a href="#v-by-s"> Back to table </a></p>

<div id="3-5"></div>
<br><br>

- **Proof 3-5**
  - $\color{royalblue}{\LARGE \frac{\partial{\mathbf{U}\mathbf{v}}}{\partial{x}}}$, $\; \mathbf{U} = \mathbf{U}(x), \; \mathbf{v} = \mathbf{v}(x)$

    $$
    \mathbf{U} = 
    \begin{pmatrix}
        u_{11} & \cdots & u_{1n} \\
        \vdots & \ddots & \vdots \\
        u_{m1} & \cdots & u_{mn}
    \end{pmatrix}_{m \times n}
    , \qquad
    \mathbf{v} = 
    \begin{pmatrix}
        v_1 & \cdots & v_n
    \end{pmatrix}_{n \times 1}^T
    $$

    <br><br>
    Numerator layout:

    $$
    \begin{aligned}
        \frac{\partial{\mathbf{U}\mathbf{v}}}{\partial{x}}
        &=
        \frac{\partial}{\partial{x}}
        \left\{
            \begin{pmatrix}
                u_{11} & \cdots & u_{1n} \\
                \vdots & \ddots & \vdots \\
                u_{m1} & \cdots & u_{mn}
            \end{pmatrix}_{m \times n}
            \begin{pmatrix}
                v_1 \\ \vdots \\ v_n
            \end{pmatrix}_{n \times 1}
        \right\}
        \\[7mm]
        &=
        \frac{\partial}{\partial{x}} 
        \begin{pmatrix}
            \sum_{i=1}^n u_{1i} v_i \\ \vdots \\ \sum_{i=1}^n u_{mi} v_i
        \end{pmatrix}_{m \times 1}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
        \sum_{i=1}^n  \frac{\partial}{\partial{x}} \normalsize u_{1i} v_i \\ \vdots \\ \sum_{i=1}^n \frac{\partial}{\partial{x}} \normalsize u_{mi} v_i
        \end{pmatrix}_{m \times 1}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \sum_{i=1}^n (\frac{\partial{u_{1i}}}{\partial{x}} \normalsize v_i + u_{1i} \large \frac{\partial{v_i}}{\partial{x}})
            \\
            \vdots
            \\
            \sum_{i=1}^n (\frac{\partial{u_{mi}}}{\partial{x}} \normalsize v_i + u_{mi} \large \frac{\partial{v_i}}{\partial{x}})
        \end{pmatrix}_{m \times 1}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \sum_{i=1}^n \frac{\partial{u_{1i}}}{\partial{x}} \normalsize v_i
            \\
            \vdots
            \\
            \sum_{i=1}^n \frac{\partial{u_{mi}}}{\partial{x}} \normalsize v_i
        \end{pmatrix}_{m \times 1}
        \normalsize
        +
        \large
        \begin{pmatrix}
            \sum_{i=1}^n \normalsize u_{1i} \large \frac{\partial{v_i}}{\partial{x}}
            \\
            \vdots
            \\
            \sum_{i=1}^n \normalsize u_{mi} \large \frac{\partial{v_i}}{\partial{x}}
        \end{pmatrix}_{m \times 1}
        \\[7mm]
        &=
        \large
        \begin{pmatrix}
            \frac{\partial{u_{11}}}{\partial{x}} & \cdots & \frac{\partial{u_{1n}}}{\partial{x}} 
            \\
            \vdots & \ddots & \vdots 
            \\
            \frac{\partial{u_{m1}}}{\partial{x}} & \ddots & \frac{\partial{u_{mn}}}{\partial{x}}
        \end{pmatrix}_{m \times n}
        \begin{pmatrix}
            v_1 \\ \vdots \\ v_n
        \end{pmatrix}_{n \times 1}
        +
        \normalsize
        \begin{pmatrix}
            u_{11} & \cdots & u_{1n} \\
            \vdots & \ddots & \vdots \\
            u_{m1} & \cdots & u_{mn}
        \end{pmatrix}_{m \times n}
        \large
        \begin{pmatrix}
            \frac{\partial{v_1}}{\partial{x}} 
            \\
            \vdots 
            \\
            \frac{\partial{v_n}}{\partial{x}}
        \end{pmatrix}_{n \times 1}
        \\[7mm]
        &=
        \frac{\partial{\mathbf{U}}}{\partial{x}} \mathbf{v} + \mathbf{U} \frac{\partial{\mathbf{v}}}{\partial{x}}
    \end{aligned}
    $$

    <br><br>
    Denominator layout:

    $$
    \begin{aligned}
        \frac{\partial{\mathbf{U}\mathbf{v}}}{\partial{x}}
        &=
        \large
        \begin{pmatrix}
        \sum_{i=1}^n  \frac{\partial}{\partial{x}} \normalsize u_{1i} v_i & \cdots & \sum_{i=1}^n \frac{\partial}{\partial{x}} \normalsize u_{mi} v_i
        \end{pmatrix}_{1 \times m}
        \\[7mm]
        &=
        \left\{\underset{\bf{numerator}}{\left(\frac{\partial{\mathbf{U}}}{\partial{x}}\right)} \mathbf{v} + \mathbf{U} \underset{\bf{numerator}}{\left(\frac{\partial{\mathbf{v}}}{\partial{x}}\right)}\right\}^T
        \\[7mm]
        &=
        \mathbf{v}^T \underset{\bf{denominator}}{\left(\frac{\partial{\mathbf{U}}}{\partial{x}}\right)} + \underset{\bf{denominator}}{\left(\frac{\partial{\mathbf{v}}}{\partial{x}}\right)} \mathbf{U}^T
        \\[7mm]
        &=
        \mathbf{v}^T \frac{\partial{\mathbf{U}}}{\partial{x}} + \frac{\partial{\mathbf{v}}}{\partial{x}} \mathbf{U}^T
    \end{aligned}
    $$

<p align="right"><a href="#v-by-s"> Back to table </a></p>

## 参考
- <https://en.wikipedia.org/wiki/Matrix_calculus>
- <https://zhuanlan.zhihu.com/p/263777564>

