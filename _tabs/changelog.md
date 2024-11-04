---
layout: post
comments: true
refactor: true
toc: true
title: false
icon: fas fa-history
order: 6
---

<nav>
  <button data-lang="en">English</button>
  <button data-lang="zh">中文</button>
</nav>

<div id="content-area">
  <div id="en-content" style="display: none;">
    {% capture en_content %}
      {% include changelog/changelog_en.md %}
    {% endcapture %}
    {{ en_content | markdownify }}
  </div>

  <div id="zh-content" style="display: none;">
    {% capture zh_content %}
      {% include changelog/changelog_zh.md %}
    {% endcapture %}
    {{ zh_content | markdownify }}
  </div>
</div>
