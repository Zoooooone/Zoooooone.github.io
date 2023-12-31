---
title: 神经网络中基于BP（反向传播）的梯度下降法
date: 2023-08-19 00:00:00 +0900
categories: [Study notes, Machine learning]
tags: [machine learning, back propagation]     # TAG names should always be lowercase
math: true
img_path: /assets/img/2023-08-19-back_propagation/
---

# 前言
本文总结神经网络中基于反向传播的随机梯度下降法的数学推导过程，文章内容源于个人的学习心得。
## 前向传播、反向传播以及梯度下降法
首先我们需要整理一下相关名词的含义。
- **前向传播：** 指的是在神经网络中将前一层的输出结果作为变量进行计算后输入至下一层的数据传播方式。
- **反向传播：** 其实是**误差反向传播**的简称，它指的是将根据输出层的输出计算得来的损失函数的信息沿着神经网络从后一层向前一层不断传播的方式。
- **梯度下降法：** 指根据反向传播的计算结果将神经元节点间的权重**按照损失函数梯度减小的方向更新**的学习方式。

所以一个简单的神经网络的学习过程可以总结如下:

$$
\begin{equation}
    \textbf{数据输入} \to \textbf{前向传播} \to \textbf{结果输出} \to \textbf{反向传播（应用梯度下降法更新权重）}\nonumber
\end{equation}
$$

接下来我们先从两层的神经网络（**输出层 + 输入层**）开始总结神经网络中基于反向传播的梯度下降法的数学推导过程。
## 双层神经网络
### 输出层为单个神经元
<div style="text-align: center">
<img src="NN_2layers_1out.svg" class="custom-img"/>
</div>

我们先用最简单的一个例子来探讨误差的反向传播是如何实现的。如上图所示，这是一个输入层有n个节点，输出层只有1个节点的双层神经网络。前向传播的过程如下: 

$$
\begin{equation}
    u = \sum_{i=1}^{n} x_i \omega_i \tag{1}
\end{equation}
$$

此处的$u$为根据前一层的输出结果计算出的输入进下一层的值。当该层神经元的激活函数为$f(x)$时，向下一层输出的值为: 

$$
\begin{equation}
    \hat{y} = f(u) \tag{2}
\end{equation}
$$ 

由于这个神经网络只有两层，所以这时就获得了该神经网络对于此次输入的一个输出值$\hat{y}$，前向传播也就完成了。接下来我们计算这个输出值与正确值的损失函数$E$。为了之后反向传播的推导式简洁，这里使用如下方式去计算:

$$
\begin{equation}
    E = \frac{1}{2}(\hat{y} - y) ^ 2 \tag{3}
\end{equation}
$$

这里$y$指的是输出层对应节点的正确值。反向传播时，我们应当考察该损失函数关于每一个权重$\omega_{i}$的偏导:

$$
\begin{align}
    \frac{\partial{E}}{\partial{\omega_i}} 
    &= 
    \frac{\partial{E}}{\partial{u}} \frac{\partial{u}}{\partial{\omega_i}}  \tag{4}\\[3mm]
    &= 
    \frac{\partial}{\partial{u}} \left[\frac{1}{2} (\hat{y} - y) ^ 2\right] \frac{\partial{u}}{\partial{\omega_i}} \qquad \cdots (3) \tag{5} \\[3mm]
    &= 
    \frac{\partial}{\partial{u}} \left[\frac{1}{2} (f(u) - y) ^ 2\right] \frac{\partial}{\partial\omega_i} \left(\sum_{i=0}^n x_i\omega_i\right) \qquad \cdots (2), (1) \tag{6} \\[3mm]
    &= 
    (f(u) - y)f'(u)x_i \tag{7} \\[3mm]
    &= 
    (\hat{y} - y)f'(u)x_i \tag{8}
\end{align}
$$

这样对每一个权重都求得相对于损失函数的偏导之后，便可以得到损失函数$E$的梯度了。梯度下降法便是让权值矩阵**向误差梯度下降的方式进行更新**。为了便于理解这个过程，我们还是先用权值矩阵中某一单个权重$\omega_{i}$进行举例，它的更新方式如下:

$$
\begin{align}
    \omega_i^{new} 
    &= 
    \omega_i^{old} - \eta\frac{\partial{E}}{\partial{\omega_i}} \tag{9} \\[3mm]
    &= 
    \omega_i^{old} - \eta(\hat{y} - y)f'(u)x_i \tag{10}
\end{align}
$$

这里$\eta$为**学习率**，表示的是权重更新时的步长（速率）。将$(10)$式推广到整个权值矩阵，可得:

$$
\begin{equation}
    \begin{pmatrix}
        \omega_1 \\ \omega_2 \\ \vdots \\ \omega_n
    \end{pmatrix}_{new} 
    = 
    \begin{pmatrix}
        \omega_1 \\ \omega_2 \\ \vdots \\ \omega_n
    \end{pmatrix}_{old} 
    - 
    \eta(\hat{y} - y)f'(u)
    \begin{pmatrix}
        x_1 \\ x_2 \\ \vdots \\ x_n
    \end{pmatrix} \tag{11}
\end{equation}
$$

这便是此种情况下权值矩阵的更新方式了。
<br>

### 输出层为多个神经元
<div style="text-align: center">
<img src="NN_2layers_multi_out.svg" class="custom-img"/>
</div>

如上图所示，此时输出层的神经元节点个数从1个增加到了n个，那么对于权值矩阵中的权重下标我们这样定义: **前一层的节点$i$与后一层的节点$j$所对应的权重为**$\omega_{ji}$，也即$\mathbf{\omega_{后一层下标\to前一层下标}}$。那么对于这个权重，我们可以依照上一节的内容推导出它的更新方式，具体步骤如下：<br>
首先还是计算输出层中对应节点$u_j$的输入值：

$$
\begin{equation}
    u_j = \sum_{i=1}^m x_i\omega_{ji} \qquad (1 \leq j \leq n) \tag{12}
\end{equation}
$$

激活函数为$f(x)$时，输出为:

$$
\begin{equation}
    \hat{y_j} = f(u_j) \tag{13}
\end{equation}
$$

损失函数计算方式与上一节相同:

$$
\begin{equation}
    E = \sum_{j=1}^n\frac{1}{2}(\hat{y_j} - y_j)^2 = \sum_{j=1}^n\frac{1}{2}(f(u_j) - y_j)^2 \tag{14}
\end{equation}
$$

于是$\omega_{ji}$的更新方式为:
<div id="链式法则替代项"></div>

$$
\begin{align}
    \frac{\partial{E}}{\partial{\omega_{ji}}} 
    &= 
    \frac{\partial{E}}{\partial{u_j}} \cdot \frac{\partial{u_j}}{\partial{\omega_{ji}}} \tag{15} \\[3mm]
    &= 
    (f(u_j) - y_j)f'(u_j) \cdot x_i \tag{16} \\[3mm]
    &= 
    (\hat{y_j} - y_j)f'(u_j)x_i \tag{17}
\end{align}
$$

对于这一步推导，我们**可以把$(15)$式等号右侧的第一项命名为**$\delta_j$，这一项代表了该层梯度传播的某种特性。于是有:

$$
\begin{equation}
    \delta_j = \frac{\partial{E}}{\partial{u_j}} = (\hat{y_j} - y_j)f'(u_j) \tag{18}
\end{equation}
$$

这样表示的好处是$\frac{\partial{E}}{\partial{\omega_{ji}}}$将只和$\delta_j$与前一层的输出$x_i$相关，理解起来比较直观，同时也有助于后续多层神经网络反向传播的递推公式的推导。
<div id="21"></div>

$$
\begin{equation}
    \frac{\partial{E}}{\partial{\omega_{ji}}} = \delta_j x_i \tag{19}
\end{equation}
$$

于是此时权重的更新方式为:

$$
\begin{equation}
    \omega_{ji}^{new} = \omega_{ji}^{old} - \eta \delta_j x_i \tag{20}
\end{equation}
$$

将该式推广到整个权值矩阵后，计算方式如下:

$$
\begin{equation}
    \begin{split}
        {\mathop{
            \begin{pmatrix}
                \omega_{11} & \omega_{12} & \cdots & \omega_{1m} \\
                \omega_{21} & \omega_{22} & \cdots & \omega_{2m} \\
                \vdots & \vdots & \ddots & \vdots \\
                \omega_{n1} & \omega_{n2} & \cdots & \omega_{nm}
            \end{pmatrix}
        }\limits^{n \times m}}_{new} 
        &= 
        {\mathop{
            \begin{pmatrix}
                \omega_{11} & \omega_{12} & \cdots & \omega_{1m} \\
                \omega_{21} & \omega_{22} & \cdots & \omega_{2m} \\
                \vdots & \vdots & \ddots & \vdots \\
                \omega_{n1} & \omega_{n2} & \cdots & \omega_{nm}
            \end{pmatrix}
        }\limits^{n \times m}}_{old} \\ 
        &- 
        \eta(
            \mathop{
                \begin{pmatrix}
                    \hat{y_1} \\ \hat{y_2} \\ \vdots \\ \hat{y_n}
                \end{pmatrix}
            }\limits^{n \times 1} 
            - 
            \mathop{
                \begin{pmatrix}
                    y_1 \\ y_2 \\ \vdots \\ y_n
                \end{pmatrix}
            }\limits^{n \times 1}
        ) 
        \odot 
        f'(
            \mathop{
                \begin{pmatrix}
                    u_1 \\ u_2 \\ \vdots \\ u_n 
                \end{pmatrix}
            }\limits^{n \times 1}
        )
        \mathop{
            \begin{pmatrix}
                x_1 \\ x_2 \\ \vdots \\ x_m
            \end{pmatrix}^T
        }\limits^{1 \times m} 
    \end{split} \tag{21}
\end{equation}
$$

这里观察一下权值矩阵的结构可以发现，对于输出层的某一个节点$j$，前一层所有节点与其的权重$\omega_{ji} \: (i \in [1, m])$所构成的向量是权值矩阵中第$j$行的部分。此外，式子中的每一个矩阵上方都标注了其大小，通过计算过程可以确认等式两端计算出的矩阵大小一致。（这里$\odot$表示矩阵的元素积，$T$表示矩阵的转置）最后我们可以把该表达式简化为:

$$
\begin{equation}
    \boldsymbol{W_{new}} = \boldsymbol{W_{old}} - \eta\boldsymbol{\delta_j}\boldsymbol{x}^T \tag{22}
\end{equation}
$$

此时, 

$$
\begin{equation} 
    \boldsymbol{\delta_j} = (\boldsymbol{\hat{y} - y})\odot f'(\boldsymbol{u}) \tag{23}
\end{equation}
$$

## 三层神经网络
在上述内容的基础上，我们可以尝试把神经网络从双层增加到三层了，也即**输入层、隐藏层和输出层**。其示意图如下。
<div style="text-align: center">
<img src="NN_3layers.svg" class="custom-img"/>
</div>

### 相关计算量定义
这个神经网络的输入层、隐藏层和输出层分别具有$m, n, l$个节点，对于每一层的一个任意的节点，我们指定它的编号分别为$i, j, k$。前向传播时，从输入层到隐藏层的线性结合为$u_j^h$，从隐藏层到输出层的线性结合为$u_k^o$。与此对应的隐藏层和输出层的激活函数分别为$f(x), g(x)$。**权重以及其构成的权值矩阵**根据层与层之间的关系决定，三层的情况下层与层之间的关系分别为**输入层**$\leftrightarrow$**隐藏层**与**隐藏层**$\leftrightarrow$**输出层**。依照上一章第二节的[权重下标定义](#输出层为多个神经元)，可以得到输入层与隐藏层之间的权值矩阵中一个任意的权重为$\omega_{ji}$，隐藏层与输出层之间的为$\omega_{kj}$。以上定义完成后，我们便可以进行下一步的数学推导了。

### 三层神经网络的权值矩阵更新方式
输入层到隐藏层的前向传播:

$$
\begin{equation}
    u_j^h = \sum_{i=1}^m x_i\omega_{ji} \quad, \quad y_j = f(u_j^h) \tag{24}
\end{equation}
$$

隐藏层到输出层的前向传播:

$$
\begin{equation}
    u_k^o = \sum_{j=1}^n y_j\omega_{kj} \quad, \quad \hat{y}_k = g(u_k^o) \tag{25}
\end{equation}
$$

计算损失函数，这里$z_k$表示输出层的第$k$个节点所对应的正确值:

$$
\begin{equation}
    E = \frac{1}{2}\sum_{k=1}^l(\hat{y}_k - z_k)^2 = \frac{1}{2}\sum_{k=1}^l(g(u_k^o) - z_k)^2 \tag{26}
\end{equation}
$$

接下来进行关于反向传播的以及梯度下降法的数学推导，分为两个部分:
- 对于**隐藏层与输出层之间**的权值矩阵中一个任意的权重$\omega_{kj}$的更新
- 对于**输入层与隐藏层之间**的权值矩阵中一个任意的权重$\omega_{ji}$的更新

#### 隐藏层与输出层之间
$\omega_{kj}$关于损失函数$E$的偏导：

$$
\begin{align}
    \frac{\partial{E}}{\partial{\omega_{kj}}} 
    &= 
    \frac{\partial{E}}{\partial{u_k^o}}\frac{\partial{u_k^o}}{\partial{\omega_{kj}}} \tag{27} \\[3mm]
    &= 
    (g(u_k^o) - z_k)g'(u_k^o) \cdot y_j \tag{28} \\[3mm]
    &= 
    (\hat{y}_k - z_k)g'(u_k^o)y_j \tag{29}
\end{align}
$$

这里根据之前章节中提到的[推导式简化方法](#链式法则替代项)，可以类似地得到:

$$
\begin{equation}
    \delta_k^o = (\hat{y}_k - z_k)g'(u_k^o) \tag{30}
\end{equation}
$$

于是，该权重的基于梯度下降法的更新方式即可表示为:

$$
\begin{equation}
    \omega_{kj}^{new} = \omega_{kj}^{old} - \eta \delta_k^o y_j \tag{31}
\end{equation}
$$

与[$(21)$式](#21)类似，我们将其推广到整个权值矩阵:

$$
\begin{equation}
    \begin{split}
        {\mathop{
            \begin{pmatrix}
                \omega_{11} & \omega_{12} & \cdots & \omega_{1n} \\
                \omega_{21} & \omega_{22} & \cdots & \omega_{2n} \\
                \vdots & \vdots & \ddots & \vdots \\
                \omega_{l1} & \omega_{l2} & \cdots & \omega_{ln}
            \end{pmatrix}
        }\limits^{l \times n}}_{new} 
        &= 
        {\mathop{
            \begin{pmatrix}
                \omega_{11} & \omega_{12} & \cdots & \omega_{1n} \\
                \omega_{21} & \omega_{22} & \cdots & \omega_{2n} \\
                \vdots & \vdots & \ddots & \vdots \\
                \omega_{l1} & \omega_{l2} & \cdots & \omega_{ln}
            \end{pmatrix}
        }\limits^{l \times n}}_{old} \\ 
        &- 
        \eta(
            \mathop{
                \begin{pmatrix}
                    \hat{y_1} \\ \hat{y_2} \\ \vdots \\ \hat{y_l}
                \end{pmatrix}
            }\limits^{l \times 1} 
            - 
            \mathop{
                \begin{pmatrix}
                    z_1 \\ z_2 \\ \vdots \\ z_l
                \end{pmatrix}
            }\limits^{l \times 1}
        ) 
        \odot 
        g'(
            \mathop{
                \begin{pmatrix}
                    u_1^o \\ u_2^o \\ \vdots \\ u_l^o 
                \end{pmatrix}
            }\limits^{l \times 1}
        )
        \mathop{
            \begin{pmatrix}
                y_1 \\ y_2 \\ \vdots \\ y_n
            \end{pmatrix}^T
        }\limits^{1 \times n}
    \end{split} \tag{32}
\end{equation}
$$

简化后可以写为:

$$
\begin{align}
    \boldsymbol{ {\underset{H \to O}{W} }_{new}} 
    &= 
    \boldsymbol{ {\underset{H \to O}{W} }_{old}} - \eta\boldsymbol{\delta_k^o}\boldsymbol{y}^T \tag{33} \\[5mm]
    \boldsymbol{\delta_k^o} 
    &= 
    (\boldsymbol{\hat{y}} - \boldsymbol{z}) \odot g'(\boldsymbol{u^o}) \tag{34}
\end{align}
$$

这里$\boldsymbol{\underset{H \to O}{W}}$表示的是隐藏层(**H**idden layer)与输出层(**O**utput layer)之间的权值矩阵。

#### 输入层与隐藏层之间
$\omega_{ji}$关于损失函数$E$的偏导：

$$
\begin{align}
    \frac{\partial{E}}{\partial{\omega_{ji}}} 
    &= 
    \frac{\partial{E}}{\partial{y_j}}\frac{\partial{y_j}}{\partial{u_j^h}}\frac{\partial{u_j^h}}{\partial{\omega_{ji}}} \tag{35} \\[5mm]
    &= 
    \frac{\partial}{\partial{y_j}}\left[\frac{1}{2}\sum_{k=1}^l(g(u_k^o) - z_k)^2\right] \cdot f'(u_j^h) \cdot \frac{\partial}{\partial{\omega_{ji}}}\left(\sum_{i=1}^m x_i\omega_{ji}\right) \qquad \cdots (26), (24) \tag{36} \\[5mm]
    &= 
    \frac{1}{2}\sum_{k=1}^l \left[\frac{\partial}{\partial{y_j}}(g(u_k^o) - z_k)^2\right] f'(u_j^h)x_i \tag{37} \\[5mm]
    &= 
    \frac{1}{2}\sum_{k=1}^l \left[\frac{\partial}{\partial{u_k^o}}(g(u_k^o) - z_k)^2 \cdot \frac{\partial{u_k^o}}{\partial{y_j}}\right] f'(u_j^h)x_i \tag{38} \\[5mm]
    &= 
    \sum_{k=1}^l \left[(g(u_k^o) - z_k)g'(u_k^o) \cdot \frac{\partial}{\partial{y_j}} \left(\sum_{j=1}^n y_j\omega_{kj}\right) \right] f'(u_j^h)x_i \qquad \cdots (25) \tag{39} \\[5mm]
    &= 
    \sum_{k=1}^l \Big[{\color{red}{(\hat{y}_k - z_k)g'(u_k^o)}}\omega_{kj}\Big] f'(u_j^h)x_i \qquad \cdots (25) \tag{40} \\[5mm]
    &= 
    \sum_{k=1}^l \Big({\color{red}{\delta_k^o}}\omega_{kj}\Big) f'(u_j^h)x_i \tag{41}
\end{align}
$$

还是根据之前提到的求梯度时用到的[推导式简化方法](#链式法则替代项)，我们希望将链式法则的推导式精简为只和**前一层的输出**以及**当前层关于损失函数梯度传播的特性**这两项相关。对于$(41)$式，我们应该这样化简:

$$
\begin{align}
    \delta_j^h = \sum_{k=1}^l & \Big({\delta_k^o}\omega_{kj}\Big) f'(u_j^h) \tag{42} \\[5mm]
    \frac{\partial{E}}{\partial{\omega_{ji}}} &= \delta_j^h x_i \tag{43}
\end{align}
$$

那么可以得到权重$\omega_{ji}$基于梯度下降法的更新方式:

$$
\begin{equation}
    \omega_{ji}^{new} = \omega_{ji}^{old} - \eta \delta_j^h x_i \tag{44}
\end{equation}
$$

接下来尝试将其推广到整个权值矩阵。在此之前，我们可以先考察一下将$\delta_j^h$推广到矩阵的情况，将$(42)$式的求和改写成矩阵乘法的话可以得到:

$$
\begin{equation}
    \delta_j^h 
    = 
    \begin{pmatrix}
        \omega_{1j} \\ \omega_{2j} \\ \vdots \\ \omega_{lj}
    \end{pmatrix}^T
    \begin{pmatrix}
        \delta_1^o \\ \delta_2^o \\ \vdots \\ \delta_l^o
    \end{pmatrix}
    f'(u_j^h) \tag{45}
\end{equation}
$$

如果继续对隐藏层节点下标$j$进行扩充（隐藏层共有$n$个节点）的话，我们便可以得到:

$$
\begin{equation}
    \boldsymbol{\delta_j^h} 
    =
    \overset{n \times 1}{
        \begin{pmatrix}
            \delta_1^h \\ \delta_2^h \\ \vdots \\ \delta_n^h
        \end{pmatrix}
    } 
    = 
    \overset{n \times l}{
        \underset{
            \boldsymbol{
                \color{blue}{
                    \xrightarrow[\qquad 扩充方向 \qquad]{}
                }
            }
        }{
            \begin{pmatrix}
                \omega_{11} & \omega_{12} & \cdots & \omega_{1n} \\
                \omega_{21} & \omega_{22} & \cdots & \omega_{2n} \\
                \vdots & \vdots & \ddots & \vdots \\
                \omega_{l1} & \omega_{l2} & \cdots & \omega_{ln} 
            \end{pmatrix}^T
        }
    }
    \overset{l \times 1}{
        \begin{pmatrix}
            \delta_1^o \\ \delta_2^o \\ \vdots \\ \delta_l^o
        \end{pmatrix}
    } 
    \odot
    f'(
        \overset{n \times 1}{
            \begin{pmatrix}
                u_1^h \\ u_2^h \\ \vdots \\ u_n^h
            \end{pmatrix}
        }
    ) \tag{46}
\end{equation}
$$

这时就可以发现扩充出来的 $n \times l$ 矩阵其实就是隐藏层与输出层之间的**更新前的**权值矩阵$\boldsymbol{W_{H \to O}}$。我们可以依此写出输入层与隐藏层之间的权值矩阵基于梯度下降法的更新方式：

$$
\begin{equation}
    \begin{split}
        {\mathop{
            \begin{pmatrix}
                \omega_{11} & \omega_{12} & \cdots & \omega_{1m} \\
                \omega_{21} & \omega_{22} & \cdots & \omega_{2m} \\
                \vdots & \vdots & \ddots & \vdots \\
                \omega_{n1} & \omega_{n2} & \cdots & \omega_{nm}
            \end{pmatrix}
        }\limits^{n \times m}}_{new} 
        &= 
        {\mathop{
            \begin{pmatrix}
                \omega_{11} & \omega_{12} & \cdots & \omega_{1m} \\
                \omega_{21} & \omega_{22} & \cdots & \omega_{2m} \\
                \vdots & \vdots & \ddots & \vdots \\
                \omega_{n1} & \omega_{n2} & \cdots & \omega_{nm}
            \end{pmatrix}
        }\limits^{n \times m}}_{old} \\
        &- 
        \eta{
            \color{red}{
                \overset{n \times l}{
                    \begin{pmatrix}
                        \omega_{11} & \omega_{12} & \cdots & \omega_{1n} \\
                        \omega_{21} & \omega_{22} & \cdots & \omega_{2n} \\
                        \vdots & \vdots & \ddots & \vdots \\
                        \omega_{l1} & \omega_{l2} & \cdots & \omega_{ln} 
                    \end{pmatrix}^T_{old}               
                }
                \overset{l \times 1}{
                    \begin{pmatrix}
                        \delta_1^o \\ \delta_2^o \\ \vdots \\ \delta_l^o
                    \end{pmatrix}
                } \odot
                f'(
                    \overset{n \times 1}{
                        \begin{pmatrix}
                            u_1^h \\ u_2^h \\ \vdots \\ u_n^h
                        \end{pmatrix}
                    }
                )
            }
        }
        \mathop{
            \begin{pmatrix}
                x_1 \\ x_2 \\ \vdots \\ y_m
            \end{pmatrix}^T
            }\limits^{1 \times m}
    \end{split} \tag{47}
\end{equation}
$$
<div id="50-53"></div><br>

简化后可以写为:

$$
\begin{align}
    \boldsymbol{ {\underset{I \to H}{W} }_{new}} 
    &= 
    \boldsymbol{ {\underset{I \to H}{W} }_{old}} - 
    \eta{
        \color{red}{
            \boldsymbol{ {\underset{H \to O}{W^T} }_{old}} \boldsymbol{\delta_k^o} \odot f'\boldsymbol{(u^h)}
        }
    } 
    \boldsymbol{x}^T \tag{48} \\[3mm]
    &=
    \boldsymbol{ {\underset{I \to H}{W} }_{old}} - 
    \eta{
        \color{red}{ 
            \boldsymbol{\delta_j^h}
        }
    }
    \boldsymbol{x}^T \tag{49}
\end{align}
$$

这便是最终的结果了。
### 三层神经网络的总结
最后，我们总结一下三层神经网络的权值矩阵更新方式。

$$
\begin{align}
    & \boldsymbol{ {\underset{H \to O}{W} }_{new}} = \boldsymbol{ {\underset{H \to O}{W} }_{old}} - \eta\boldsymbol{\delta_k^o}\boldsymbol{y}^T \tag{50} \\[5mm]
    & \boldsymbol{ {\underset{I \to H}{W} }_{new}} = \boldsymbol{ {\underset{I \to H}{W} }_{old}} - \eta \boldsymbol{\delta_j^h}\boldsymbol{x}^T \tag{51} \\[5mm]
    & \boldsymbol{\delta_k^o} = (\boldsymbol{\hat{y}} - \boldsymbol{z}) \odot g'(\boldsymbol{u^o}) \tag{52} \\[5mm]
    & \boldsymbol{\delta_j^h} = \boldsymbol{ {\underset{H \to O}{W^T} }_{old}} \boldsymbol{\delta_k^o} \odot f'\boldsymbol{(u^h)} \tag{53}
\end{align}
$$

## 多层神经网络
### 反向传播问题的一般化
这里的多层神经网络指的是隐藏层多于一层的情况，也即整个网络结构为**输入层，层数大于1的隐藏层**和**输出层**。随着层数的增加，层与层之间的权值矩阵的个数也会随之增加。那么当计算权值矩阵的更新方式时，采用之前所述的方法将会变得越来越复杂。但事实上从三层神经网络的计算结果来看我们可以发现，不同层之间的权值矩阵的更新方式并不是毫不相关的。如果我们把$(48)$与$(49)$式用自然语言来描述的话，其实是这样:<br>

$$
\begin{aligned}
    \small{
        \begin{split}
            \boldsymbol{当前层}更新后的权值矩阵 
            &= 
            \boldsymbol{当前层}更新前的权值矩阵 \\
            &- 
            学习率 \times {\color{red}{\boldsymbol{当前层}的梯度传播特性矩阵}} \cdot \boldsymbol{前一层}输出值矩阵的转置 \\[5mm]
            {\color{red}{\boldsymbol{当前层}的梯度传播特性矩阵}}
            &=
            \boldsymbol{后一层}更新前的权值矩阵的转置 \cdot \boldsymbol{后一层}梯度传播特性矩阵 \\
            &
            \odot \boldsymbol{当前层}输入值矩阵相对于该层激活函数的导数
        \end{split}
    }
\end{aligned}
$$

那么如果我们需要更新前一层和当前层之间的权值矩阵，那么只需要知道前一层、当前层和后一层的相关信息便可以通过递推公式的方式推导出来。如果把刚才用自然语言描述的内容再度抽象成数学语言，则为:

$$
\begin{align}
    \boldsymbol{W_{new}^{(l)}} 
    &= 
    \boldsymbol{W_{old}^{(l)}} - \eta {\color{red}{\boldsymbol{\delta^{(l)}}}} {\boldsymbol{y^{(l-1)}}}^T \tag{54} \\[3mm]
    {\color{red}{\boldsymbol{\delta^{(l)}}}} 
    &=
    {\boldsymbol{W_{old}^{(l+1)}}}^T \boldsymbol{\delta^{(l+1)}} \odot f'^{(l)}(\boldsymbol{u^{(l)}}) \tag{55}
\end{align}
$$

这里右上角括号内的内容表示神经层的序号，与常见的递推公式诸如数列递推公式中的字母下标等效，其大小表示层的先后顺序，数值越大表示该层在神经网络中越靠后，也可以理解为离输入层越远。$\boldsymbol{u}$表示的是某一层**输入值**的矩阵，而$\boldsymbol{y}$表示的则是某一层**输出**值的矩阵。而这两者正好就是前向传播中进行运算的量，于是有:

$$
\begin{align}
    \boldsymbol{u^{(l)}} &= \boldsymbol{W^{(l)} y^{(l-1)}} \tag{56} \\[3mm]
    \boldsymbol{y^{(l)}} &= f^{(l)}(\boldsymbol{u^{(l)}}) \tag{57}
\end{align}
$$

此外，观察$(54)$与$(55)$式可以发现**反向传播其实计算的就是不同层的**$\boldsymbol{\delta}$，根据其结果进行权值矩阵的更新。接下来我们希望证明这个递推公式，不过在此之前可以先考察一下不同序号的权值矩阵在神经网络中的实际位置：

$$
\begin{equation}
    \boldsymbol{
        \underset{Input}{I} \xrightarrow{W^{(1)}} 
        \underbrace{
            H_1 \xrightarrow{W^{(2)}} H_2 \xrightarrow{} \cdots \xrightarrow{W^{(l)}} H_l \xrightarrow{} \cdots \xrightarrow{W^{(L-1)}} H_{L-1}
        }_{Hidden}
         \xrightarrow{W^{(L)}} \underset{Output}{O}
    } \tag{58}
\end{equation}
$$

这个式子中箭头所指的便是神经层，箭头上方所标注的便是该箭头两端神经层间对应的权值矩阵。当整个神经网络具有$L-1$个隐藏层（也即具有$L+1$个神经层）时权值矩阵的个数为$L$个$(L > 2)$。前向传播的时候输入层的输入值会经由这$L$个神经层一步步传递至输出层。而反向传播时我们注意到$(55)$式中出现了与当前层的后一层（第$l+1$层）相关的信息，所以对于最后一个权值矩阵来说，它的更新方式与其他的略有不同（从[$(52)$与$(53)$式](#50-53)中可以看出，实际上就是关于梯度传播的特性项$\boldsymbol{\delta}$不同）。那么之前的递推公式适用范围应为$l \in [1, \;L-1]$。接下来用数学归纳法进行证明。

### 反向传播递推公式证明
对于整个神经网络的最后一个权值矩阵$\boldsymbol{W^{(L)}}$，根据[三层神经网络](#50-53)章节中的推导结果可以得出:

$$
\begin{align}
    \boldsymbol{\delta^{(L)}} 
    &= 
    (\boldsymbol{y^{(L)}} - \boldsymbol{y})f'^{(L)}(\boldsymbol{u^{(L)}}) \tag{59} \\[3mm]
    \boldsymbol{\delta^{(L-1)}}
    &= 
    {\boldsymbol{W^{(L)}}}^T \boldsymbol{\delta^{(L)}} \odot f'^{(L-1)}(\boldsymbol{u^{(L-1)}}) \tag{60} \\[3mm]
    &= 
    {\boldsymbol{W^{[(L-1) {\color{red}{+1}}]}}}^T \boldsymbol{\delta^{[(L-1) {\color{red}{+1}}]}} \odot f'^{(L-1)}(\boldsymbol{u^{(L-1)}}) \tag{61}
\end{align}
$$

其中，$\boldsymbol{y}$指的**用来学习的正确输出值**。那么如果使用数学归纳法，则有:

$$
\begin{equation}
    \boldsymbol{(i) \; k=1}, \qquad \boldsymbol{\delta^{(L-k)}} = \boldsymbol{\delta^{(L-1)}} = {\boldsymbol{W^{[(L-1) {\color{red}{+1}}]}}}^T \boldsymbol{\delta^{[(L-1) {\color{red}{+1}}]}} \odot f'^{(L-1)}(\boldsymbol{u^{(L-1)}}) \tag{62}
\end{equation}
$$

若令如下算式成立

$$
\begin{align}
    \boldsymbol{(ii) \; k=m \; (m < L-1)}, \qquad \boldsymbol{\delta^{(L-k)}} 
    &= 
    \boldsymbol{\delta^{(L-m)}} \tag{63} \\[3mm]
    &= {\boldsymbol{W^{[(L-m)+{\color{red}{1}}]}}}^T \boldsymbol{\delta^{[(L-m)+{\color{red}{1}}]}} \odot f'^{(L-m)}(\boldsymbol{u^{(L-m)}}) \tag{64}
\end{align}
$$
<div id="6970"></div>

那么有:

$$
\begin{align}
    \boldsymbol{(iii) \; k=m+1}, \qquad \boldsymbol{\delta^{(L-k)}} 
    &=
    \boldsymbol{\delta^{[L-(m+1)]}} \tag{65} \\[3mm]
    &=
    \frac{\partial{E}}{\partial{\boldsymbol{u^{[L-(m+1)]}}}} \tag{66} \\[3mm]
    &=
    \frac{\partial{\boldsymbol{u^{(L-m)}}}}{\partial{\boldsymbol{u^{[L-(m+1)]}}}} \frac{\partial{E}}{\partial{\boldsymbol{u^{(L-m)}}}} \tag{67} \\[3mm]
    &=
    \frac{\partial}{\partial{\boldsymbol{u^{[L-(m+1)]}}}} \left(\boldsymbol{W^{(L-m)} y^{[L-(m+1)]}}\right) \boldsymbol{\delta^{(L-m)}} \tag{68} \\[3mm]
    &=
    \frac{\partial}{\partial{\boldsymbol{u^{[L-(m+1)]}}}} \left(\boldsymbol{W^{(L-m)}} f^{[L-(m+1)]}(\boldsymbol{u^{[L-(m+1)]}})\right) \boldsymbol{\delta^{(L-m)}} \tag{69} \\[3mm]
    &=
    {\boldsymbol{W^{(L-m)}}}^T \boldsymbol{\delta^{(L-m)}} \odot f'^{[L-(m+1)]}(\boldsymbol{u^{[L-(m+1)]}}) \tag{70} \\[3mm]
    &=
    {\boldsymbol{W^{[L-(m+1)+{\color{red}{1}}]}}}^T \boldsymbol{\delta^{[L-(m+1)+{\color{red}{1}}]}} \odot f'^{[L-(m+1)]}(\boldsymbol{u^{[L-(m+1)]}}) \tag{71}
\end{align}
$$

于是，该递推公式成立，其中关于$(69)$到$(70)$式的求导过程会放在附录中叙述。

## 总结
对于$L$层$(L \geq 3)$神经网络，总结其前向传播、反向传播以及其遵循梯度下降法进行权值矩阵更新的数学公式。

$$
\boldsymbol{
    \underset{Input}{I} \xrightarrow{W^{(1)}} 
    \underbrace{
        H_1 \xrightarrow{W^{(2)}} H_2 \xrightarrow{} \cdots \xrightarrow{W^{(l)}} H_l \xrightarrow{} \cdots \xrightarrow{W^{(L-2)}} H_{L-2}
    }_{Hidden}
        \xrightarrow{W^{(L-1)}} \underset{Output}{O}
}
$$

### 前向传播
对于任意$l \; (1 \leq l \leq L-1)$，有:

$$
\begin{align}
    \boldsymbol{u^{(l)}} &= \boldsymbol{W^{(l)} y^{(l-1)}} \tag{72} \\[3mm]
    \boldsymbol{y^{(l)}} &= f^{(l)}(\boldsymbol{u^{(l)}}) \tag{73}
\end{align}
$$

此外，特别定义，当 $l = 0$ 时，$\boldsymbol{y^{(0)}}$表示输入层的输出。

### 反向传播
对于任意$l \; (1 \leq l \leq L-2)$，有:

$$
\begin{equation}
    \boldsymbol{\delta^{(l)}} ={\boldsymbol{W_{old}^{(l+1)}}}^T \boldsymbol{\delta^{(l+1)}} \odot f'^{(l)}(\boldsymbol{u^{(l)}}) \tag{74}
\end{equation}
$$

此外，特别定义，当 $l = L-1$ 时，

$$
\begin{equation}
    \boldsymbol{\delta^{(l)}} = (\boldsymbol{y^{(l)}} - \boldsymbol{y})f'^{(l)}(\boldsymbol{u^{(l)}}) \tag{75}
\end{equation}
$$

### 基于梯度下降法的学习
对于任意$l \; (1 \leq l \leq L-1)$，有:

$$
\begin{equation}
    \boldsymbol{W_{new}^{(l)}} = \boldsymbol{W_{old}^{(l)}} - \eta \boldsymbol{\delta^{(l)}} {\boldsymbol{y^{(l-1)}}}^T \tag{76}
\end{equation}
$$

## 附录：反向传播求导过程
[69式:](#6970)

$$
\frac{\partial}{\partial{\boldsymbol{u^{[L-(m+1)]}}}} \left(\boldsymbol{W^{(L-m)}} f^{[L-(m+1)]}(\boldsymbol{u^{[L-(m+1)]}})\right)\boldsymbol{\delta^{(L-m)}} 
$$

这里我们为了后续推导式具有较为简洁的形式，暂且可以去除所有的序号上标，因为上标只是为了指代递推关系，并不会影响到数学计算。所以可以简化为:

$$
\frac{\partial}{\partial{\boldsymbol{u}}} \{ \boldsymbol{W} f(\boldsymbol{u})\} \boldsymbol{\delta} 
$$

这里我们不妨设前一层具有$m$个，后一层具有$n$个神经元节点，那么上式中的矩阵具体写出来的效果为:

$$
\boldsymbol{u} = 
\begin{pmatrix}
    u_1 \\ u_2 \\ \vdots \\ u_m
\end{pmatrix}, \quad
\boldsymbol{W} =
\begin{pmatrix}
    \omega_{11} & \omega_{12} & \cdots & \omega_{1m} \\
    \omega_{21} & \omega_{22} & \cdots & \omega_{2m} \\
    \vdots & \vdots & \ddots & \vdots \\
    \omega_{n1} & \omega_{n2} & \cdots & \omega_{nm}
\end{pmatrix}, \quad
\boldsymbol{\delta} =
\begin{pmatrix}
    \delta_1 \\ \delta_2 \\ \vdots \\ \delta_m
\end{pmatrix}
$$

代入上式可得:

$$
\begin{aligned}
    \frac{\partial}{\partial{\boldsymbol{u}}} \{ \boldsymbol{W} f(\boldsymbol{u})\} \boldsymbol{\delta}
    &=
    \frac{\partial}{\partial{\boldsymbol{u}}}
    \begin{pmatrix}
        \sum_{i=1}^m \omega_{1i}f(u_i) \\ \sum_{i=1}^m \omega_{2i}f(u_i) \\ \vdots \\ \sum_{i=1}^m \omega_{ni}f(u_i)
    \end{pmatrix}
    \boldsymbol{\delta} \\[12mm]
    &=
    \begin{pmatrix}
        \frac{\partial{\sum_{i=1}^m \omega_{1i}f(u_i)}}{\partial{u_1}} & \cdots & \frac{\partial{\sum_{i=1}^m \omega_{ni}f(u_i)}}{\partial{u_1}} \\
        \vdots & \ddots & \vdots \\
        \frac{\partial{\sum_{i=1}^m \omega_{1i}f(u_i)}}{\partial{u_m}} & \cdots & \frac{\partial{\sum_{i=1}^m \omega_{ni}f(u_i)}}{\partial{u_m}}
    \end{pmatrix}
    \boldsymbol{\delta} \\[12mm]
    &=
    \begin{pmatrix}
        \omega_{11}f'(u_1) & \omega_{21}f'(u_1) & \cdots & \omega_{n1}f'(u_1) \\
        \omega_{12}f'(u_2) & \omega_{22}f'(u_2) & \cdots & \omega_{n2}f'(u_2) \\
        \vdots & \vdots & \ddots & \vdots \\
        \omega_{1m}f'(u_m) & \omega_{2m}f'(u_m) & \cdots & \omega_{nm}f'(u_m)
    \end{pmatrix}
    \begin{pmatrix}
        \delta_1 \\ \delta_2 \\ \vdots \\ \delta_m
    \end{pmatrix} \\[12mm]
    &=
    \begin{pmatrix}
        \omega_{11} & \omega_{21} & \cdots & \omega_{n1} \\
        \omega_{12} & \omega_{22} & \cdots & \omega_{n2} \\
        \vdots & \vdots & \ddots & \vdots \\
        \omega_{1m} & \omega_{2m} & \cdots & \omega_{nm}
    \end{pmatrix}
    \begin{pmatrix}
        \delta_1 \\ \delta_2 \\ \vdots \\ \delta_m
    \end{pmatrix}
    \odot
    \begin{pmatrix}
        f'(u_1) \\ f'(u_2) \\ \vdots \\ f'(u_m)
    \end{pmatrix} \\[12mm]
    &=
    \boldsymbol{W}^T \boldsymbol{\delta} \odot f'(\boldsymbol{u})
\end{aligned}
$$