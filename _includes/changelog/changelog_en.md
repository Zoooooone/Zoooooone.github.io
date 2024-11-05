
## Display

### Colors 
Please check **[colors/](https://github.com/Zoooooone/Zoooooone.github.io/tree/main/_sass/colors)**.

### hover behavior

Changed the appearance and hover behavior of certain webpage elements.

#### post tag button

<details markdown="1">
<summary> details </summary>

- color
  ```scss
  .btn.btn-outline-primary {
    &:not(.disabled):hover {
      background-color: #808fb9 !important;
      border-color: var(--backgorund-color) !important;
    }
  } 
  ```

- hover behavior
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

#### post card

<details markdown="1">
<summary> details </summary>

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

#### page link button

<details markdown="1">
<summary> details </summary>

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

#### share icons

<details markdown="1">
<summary> details </summary>

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

### text effect

Applied a glow effect to headings and bold text in dark mode for better distiction from regular text. Please check **[dark-typography.scss](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_sass/colors/dark-typography.scss)**.

<details markdown="1">
<summary> details </summary>

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

### image

New customized image style in **[custom-img.scss](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_sass/custom/custom-img.scss)**. Usage:

```html
<img src="img path" class="custom-img">
```

## New features

<h3>Waline</h3>

Intergrated support for **[Waline](https://waline.js.org/en/)** comment system in addition to Disqus, Utterances, and Giscus. 

- **Initialization**
  
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

- For more details, please check **[page.html](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_layouts/page.html)**.  
- The style customization of Waline is **[colors/](https://github.com/Zoooooone/Zoooooone.github.io/tree/main/_sass/colors)**.

### pageview

Activated pageview tracking for the blog home page and individual posts.

- This feature requires the introduction of the Waline comment system.
- Additionally, pageview tracking includes a feature to verify the identity of the blog owner, ensuring that views during presonal browsing or local editting aren't counted.
- Added a new page for blog owner verification, please check **[verification.md](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_tabs/verification.md)**.
- You can use the Web Crypto API to obtain the SHA-256 hash of your custom password and set it in the format below in **[setCookie.js](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/assets/js/setCookie.js)**.

*The hash value of your password can be obtained using the following code:*

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

- For more details, please refer to **[this blog post](https://zoooooone.github.io/posts/waline/)**.

### badges

Incorporated badges in the footer describing the status of the blog repository. 

- For more details, please check **[footer.html](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_includes/footer.html)** and `footer` CSS ruleset in **[commons.scss](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_sass/addon/commons.scss)**. 
- The style of badges comes from **[shields](https://shields.io/)**.

### external links

Added external links panel to the right sidebar. For more details, please check **[external-links.html](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_includes/external-links.html)** and **[page.html](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_layouts/page.html)**.

### share 

Enabled sharing of blog posts to QQ, Weibo and LINE. 

### embedding

Introduced Bilibili embedding functionality.

- Added the capability to embed Bilibili videos directly into blog posts for seamless video integration and a better user experience.
- For more details, please check **[bilibili.html](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_includes/embed/bilibili.html)**
- Usage: 
  {% raw %}
  ```liquid
  {% include embed/bilibili.html id="use the corresponding bv id" %}
  ```
  {% endraw %}

### Aplayer

Embedded an HTML5 music player **[Aplayer](https://github.com/DIYgod/APlayer)**

- Embedded a versatile, customized music player in the blog, supporting the addition, modification and deletion of songs.
  ```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/aplayer/1.10.1/APlayer.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/color-thief/2.3.0/color-thief.umd.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/meting@2.0.1/dist/Meting.min.js"></script>    
  ```
- Displays album art with progress bar color matching the cover.
- Supports lyrics display.
- For more details, please check **[player.js](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/assets/js/addon/player.js)** and **[aplayer.scss](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_sass/custom/aplayer.scss)**.
- Usage:
  ```html
  <div id="aplayer"></div>
  <script src="/assets/js/APlayer/player.js"></script>
  ```

### background animation

Added background animations to the blog pages.

- For more details, please check **[animation.scss](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_sass/custom/animation.scss)** and **[animated-background.html](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_includes/animated-background.html)**.

### lightGallery

Added the gallery functionality using **[lightGallery](https://github.com/sachinchoolur/lightGallery)**.

- Installation
  ```html
  <script src="https://cdn.jsdelivr.net/npm/lightgallery@2.7.2/lightgallery.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/lightgallery@2.7.2/css/lightgallery-bundle.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/lightgallery@2.7.2/plugins/thumbnail/lg-thumbnail.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/lightgallery@2.7.2/plugins/zoom/lg-zoom.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/lightgallery@2.7.2/plugins/autoplay/lg-autoplay.min.js"></script>
  ```

- The gallery supports **fullscreen display**, **zoom**, **download**, **autoplay**, **thumbnails**, and more. You can also customize additional features using plugins provided by lightGallery.

- In **[assets/src/](https://github.com/Zoooooone/Zoooooone.github.io/tree/main/assets/src)**, add your own gallery folder and include an `info.json` file in the following format：
  ```json
  [
    {
      "src": "Path to image",
      "title": "The caption of the image",
      "description": "The description of the image"
    }
  ]
  ```

- For more details, please check **[gallery.html](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_includes/gallery.html)**, **[gallery.scss](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/_sass/custom/gallery.scss)** and **[gallery.js](https://github.com/Zoooooone/Zoooooone.github.io/blob/main/assets/js/addon/gallery.js)**.

- Usage:
  {% raw %}
  ```liquid
  {% include gallery.html id="Your gallery id" path="Your gallery folder name" %}
  ```
  {% endraw %}

## Future works

| Task | Status |
| --- | --- |
| **Add** h4 to the auto-generated table of contents | 🟢 Completed |
| **Introduce** a gallery feature to the blog and optimize image display | 🟢 Completed |
| **Fix** the conflict between Aplayer scrollbar and tocbot | 🔴 Not Started |
| **Enhance** the tags page and implement sorting by frequency | 🟢 Completed |
| ... | ... |
