
## 视觉和交互效果

### 颜色 
查看 **[colors/](https://github.com/Zoooooone/Zoooooone.github.io/tree/main/_sass/colors)**.

### 悬停效果

**调整**了博客中存在的一些悬停效果，使其更加美观。

#### 标签按钮

<details markdown="1">
<summary> 详细内容 </summary> 

- 颜色
  ```scss
  .btn.btn-outline-primary {
    &:not(.disabled):hover {
      background-color: #808fb9 !important;
      border-color: var(--backgorund-color) !important;
    }
  } 
  ```

- 悬停
  ```scss
  #panel-wrapper {
    .post-tag {
      &:hover {
        transition: all 0.15s ease, transform 0.15s ease;
        transform: scale(1.08);
      }
    }
  }
  ```

</details>

#### 博文卡片

优化了主页中博客文章的预览块的交互效果。

<details markdown="1">
<summary> 详细内容 </summary> 

```scss
.post-preview {
  &:hover {
    transition: transform 0.3s ease;
    transform: scale(1.02);
    border: 0.1px solid var(--card-hover-border);
    &::before {
      opacity: 0.3;
    }
  }
}
```

</details>

#### 相关文章的导航按钮

<details markdown="1">
<summary> 详细内容 </summary> 

```scss
.pagination {
  .page-item {
    .page-link {
      border-radius: 25%;
      border: 1px solid var(--button-bg);
      background-color: var(--button-bg);

      &:hover {
        transition: transform 0.2s ease;
        transform: scale(1.2);
        background-color: var(--btn-paginator-hover-color);
      }
    }
  }
}
```

</details>

#### 社媒分享图标

<details markdown="1">
<summary> 详细内容 </summary> 

```scss
.post-tail-wrapper {
  .share-wrapper {
    .share-icons {
      .fab {
        &.fa-twitter {
          @include btn-sharing-color(rgba(29, 161, 242, 1));
          &:hover {
            @include btn-sharing-color(rgb(113, 201, 255));
          }
        }
        /* ommit the following sections, same as above */
      }
    } /* .share-icons */
    .fas.fa-link {
      @include btn-sharing-color(rgb(14, 182, 16));
      &:hover {
        @include btn-sharing-color(rgb(62, 255, 66));
      }
    }
  } /* .share-wrapper */
}
```

</details>

### 文字效果

应用了文字发光效果，使夜晚模式下的标题和加粗文字更易于区分。细节请查看 **[dark-typography.scss](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_sass/colors/dark-typography.scss)**.

<details markdown="1">
<summary> 详细内容 </summary> 

```scss
#core-wrapper {
  strong {
    text-shadow: 0 0 0.1rem var(--strong-text-color), 0 0 0.05rem var(--strong-text-color);
    color: var(--strong-text-color);
    code {
      text-shadow: none;
    }
  }
  h2 {
    text-shadow: 0 0 0.1rem var(--strong-text-color), 0 0 0.7rem var(--text-color);
  }
  h3 {
    text-shadow: 0 0 0.1rem var(--strong-text-color), 0 0 0.5rem var(--text-color);
  }
  h4 {
    text-shadow: 0 0 0.1rem var(--strong-text-color), 0 0 0.3rem var(--text-color);
  }
  h5 {
    text-shadow: 0 0 0.1rem var(--strong-text-color), 0 0 0.2rem var(--text-color);
  }
}
```

</details>

### 图片

自定义了新的图片样式（可选），位于 **[custom-img.scss](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_sass/custom/custom-img.scss)**. 
- 使用方式:
  ```html
  <img src="img path" class="custom-img">
  ```

## 新功能

### 评论系统

集成了 **[Waline](https://waline.js.org/en/)** 评论系统。

- **初始化**
  
  ```javascript
  import { init } from 'https://unpkg.com/@waline/client@v2/dist/waline.mjs';

  init({
      el: '#waline',
      serverURL: 'https://waline-beige-eight.vercel.app/',
      comment: true,
      texRenderer: (blockMode, tex) =>
      window.MathJax.startup.adaptor.outerHTML(
          window.MathJax.tex2svg(tex, {
              display: blockMode,
          }),
      ),
  });
  ```

- 更多细节请查看 **[page.html](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_layouts/page.html)**.  
- 评论区样式自定义细节位于 **[colors/](https://github.com/Zoooooone/Zoooooone.github.io/tree/main/_sass/colors)**.

### 页面访问数

导入了对博客各个页面的访问数统计功能。该功能基于Waline评论系统。此外：

- 页面访问统计包含验证博客所有者的功能，以确保在所有者或本地调试时的访问不被记入。
- 添加了用于验证博客所有者的页面 **[verification.md](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_tabs/verification.md)**.
- 本地开发时可以使用 Web Crypto API 去获取 SHA-256 哈希码，用于设置自己的验证密码。具体内容位于 **[setCookie.js](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/assets/js/setCookie.js)**.

*哈希码的获取可以参考下方代码:*

```javascript
const password = prompt("Please enter the password: ");
const msgBuffer = new TextEncoder().encode(password);
const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

const hashArray = Array.from(new Uint8Array(hashBuffer));
const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
```

```javascript
console.log(hashHex);
```

- 更多细节可以参考这篇博客文章： **[this blog post](https://zoooooone.github.io/posts/waline/)**.

### 徽章

集成了用于描述博客仓库状态的徽章。 

- 更多细节请查看 **[footer.html](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_includes/footer.html)** 以及 **[commons.scss](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_sass/addon/commons.scss)** 中 `footer` 的样式. 
- 徽章样式来自 **[shields](https://shields.io/)**.

### 外部链接

在博客右侧边栏添加了外部链接，详细内容请参考 **[external-links.html](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_includes/external-links.html)** 和 **[page.html](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_layouts/page.html)**.

### 分享功能

添加了将博客文章分享至QQ、微博和LINE的功能。

### 视频播放器嵌入

引入了Bilibili的播放器。更多细节请参考 **[bilibili.html](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_includes/embed/bilibili.html)**.
- 使用方式: 
  {% raw %}
  ```liquid
  {% include embed/bilibili.html id="use the corresponding bv id" %}
  ```
  {% endraw %}

### 音乐播放器

添加了HTML5音乐播放器 **[Aplayer](https://github.com/DIYgod/APlayer)** 的嵌入功能。

- Aplayer可以高度定制化，支持添加、修改和删除歌曲。导入方式可以参考下方代码。
  ```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/aplayer/1.10.1/APlayer.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/color-thief/2.3.0/color-thief.umd.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/meting@2.0.1/dist/Meting.min.js"></script>    
  ```
- 支持专辑封面显示以及播放进度条颜色与封面主要颜色的匹配。
- 支持歌词显示。
- 更多细节请查看 **[player.js](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/assets/js/addon/player.js)** 和 **[aplayer.scss](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_sass/custom/aplayer.scss)**.
- 使用方法:
  ```html
  <div id="aplayer"></div>
  <script src="/assets/js/APlayer/player.js"></script>
  ```

### 背景动画

为博客页面添加了背景动画。具体请参考 **[animation.scss](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_sass/custom/animation.scss)** 和 **[animated-background.html](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_includes/animated-background.html)**.

### 相册

导入了 **[lightGallery](https://github.com/sachinchoolur/lightGallery)** ，以支持固定容器的多图浏览功能。

- 导入方式
  ```html
  <script src="https://cdn.jsdelivr.net/npm/lightgallery@2.7.2/lightgallery.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/lightgallery@2.7.2/css/lightgallery-bundle.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/lightgallery@2.7.2/plugins/thumbnail/lg-thumbnail.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/lightgallery@2.7.2/plugins/zoom/lg-zoom.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/lightgallery@2.7.2/plugins/autoplay/lg-autoplay.min.js"></script>
  ```

- 支持图片的全屏显示、缩放、下载、自动播放、缩略显示等功能。

- 添加图片的方式可以参考 **[assets/src/](https://github.com/Zoooooone/Zoooooone.github.io/tree/main/assets/src)**, 在本地开发时可以将图片文件夹存放至该目录下，并按照如下格式编写 `info.json` ：
  ```json
  [
    {
      "src": "Path to image",
      "title": "The caption of the image",
      "description": "The description of the image"
    }
  ]
  ```

- 更多细节请参考 **[gallery.html](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_includes/gallery.html)**, **[gallery.scss](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_sass/custom/gallery.scss)** 和 **[gallery.js](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/assets/js/addon/gallery.js)**.

- 使用方式:
  {% raw %}
  ```liquid
  {% include gallery.html id="Your gallery id" path="Your gallery folder name" %}
  ```
  {% endraw %}

## 未来计划

| 更新项 | 状态 |
| --- | --- |
| 博客文章右侧的标签导航增加h4标签的显示 | 🟢 已完成 |
| 为博客添加相册功能 | 🟢 已完成 |
| 修复Aplayer与标签导航滚动条的不兼容问题 | 🟢 已完成 (2024.12.31) |
| 优化文章标签的算法与显示 | 🟢 已完成 |
| ... | ... |
