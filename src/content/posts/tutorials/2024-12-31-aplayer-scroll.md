---
title: APlayer引入导致Tocbot目录滚动失效问题的解决
date: 2024-12-31 13:00:00 +0900
categories: [Study notes, Blog]
tags: [APlayer, Tocbot, scroll, tutorial]
---

## 问题描述

**[APlayer](https://github.com/DIYgod/APlayer)** 是一款HTML5音乐播放器，因其轻量、美观的特性被广泛使用。**[Tocbot](https://github.com/tscanlin/tocbot)** 是一个轻量级的JavaScript库，用于自动生成Markdown文章的目录（Table of Contents, TOC），通常用于博客或文档网站。两者都是博客搭建时可能会使用到的组件，然而当它们遇到一起时却会引发意想不到的问题：**APlayer的引入会导致Tocbot生成的目录在被点击后无法自动滚动到页面的对应位置。**

## 问题定位

这个问题确实很离奇，起初我认为或许是APlayer中某些滚动条的行为与Tocbot控制的部分发生了冲突，但是经过排查我发现由Tocbot生成的英文目录竟然没有受到影响，依旧可以自如地定位目录的位置并进行滚动。此外，如果打开浏览器开发者工具可以发现，在点击中文目录导航时Console并没有出现任何报错信息，且网页链接会正常出现对应目录的hashtag。那么可以确定并不是滚动条的行为发生了问题，而有可能是中文书写的目录在解析的过程遇到了什么问题，而这个问题是由APlayer的引入所带来的。

随后我在网上进行了一番搜索，发现果然有不少人遇到了类似的问题。具体内容参见：
- [Aplayer conflicts with hexo-toc](https://github.com/DIYgod/APlayer/issues/242)
- [Aplayer 的一个 bug 导致文章内目录点不动了](https://github.com/Yue-plus/hexo-theme-arknights/issues/16)

其中有人给出了解答：

> 这个问题是aplayer依赖的webpack引入的[smoothscroll.js](https://github.com/alicelieutier/smoothScroll)导致的，它给hashtag链接的click事件增加了listener，但是却不能正确处理含有中文的hashtag链接（因为url编码）。这玩意儿17年到现在都没更新过，也难怪。解决方法是将含有hashtag链接的node复制一份替换掉原来的，这样就能移除掉所有的event listener，详见[https://stackoverflow.com/a/9251864](https://stackoverflow.com/a/9251864)。不过有一说一，一个音乐播放器，为什么要依赖另一个功能完全无关（用于平滑滚动页面）的脚本呢？

可以看到问题已经被其解释地很清楚，那么接下来就是修复这个问题。

## 解决方法

问题的原因是`smoothscroll.js`为了实现页面的平滑滚动，主动拦截了博客文章界面中所有hashtag链接的默认跳转（通过添加点击事件的事件监听器的方式），并尝试自己算出滚动位置。但是它遇到中文链接就会处理失败，导致页面滚动失效。解决方法是**等待APlayer组件加载完成，待其中依赖的`smoothscroll.js`为hashtag链接添加事件监听器之后，再将这些监听器移除**。

通常引入APlayer的相关依赖是在头部元素中进行，例如此博客的相关代码位于`_includes/head.html`中：

```html
<!-- APlayer -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/aplayer/1.10.1/APlayer.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/color-thief/2.3.0/color-thief.umd.js"></script>
<script src="https://cdn.jsdelivr.net/npm/meting@2.0.1/dist/Meting.min.js"></script>
```

需要在这部分以及Tocbot初始化完成后再去除监听。因此可以选择在`<body>`标签之前进行干预。关于事件监听的移除参考上面回答中给出的链接：

```javascript
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach((oldNode) => {
    const newNode = oldNode.cloneNode(true);
    oldNode.parentNode.replaceChild(newNode, oldNode);
    });
});
```

简单解释一下这个做法。首先等待DOM加载完毕后查找所有被添加上事件监听的旧节点，这里的旧节点是指所有`href`属性以`#`开头的`<a>`标签，也就是目录导航中标签的形式。随后使用新的克隆节点替换原来的旧节点，这个新的克隆节点会复制旧节点本身以及它的子节点，但是不会复制事件监听器。如此一来，我们便达成了既保留原本标签的信息，又将被附加的事件监听器剔除的目的。