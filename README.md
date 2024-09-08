# My Blog 
<img alt="GitHub commit activity" src="https://img.shields.io/github/commit-activity/m/zoooooone/zoooooone.github.io?label=activity"> &ensp; <img alt="GitHub last commit (branch)" src="https://img.shields.io/github/last-commit/zoooooone/Zoooooone.github.io/main"> &ensp; <img alt="GitHub repo size" src="https://img.shields.io/github/repo-size/zoooooone/zoooooone.github.io"> &ensp; <img alt="GitHub issues" src="https://img.shields.io/github/issues/zoooooone/zoooooone.github.io"> &ensp; <img alt="GitHub deployments" src="https://img.shields.io/github/deployments/zoooooone/zoooooone.github.io/github-pages">

This is my customized blog based on the **[Chirpy jekyll theme](https://github.com/cotes2020/jekyll-theme-chirpy)**. Here is the link to **[my blog](https://zoooooone.github.io/)**.

# Purpose
To record study notes and daily life, and to enjoy the process of starting a blog as a beginner.
- Coding
- Researching
- Travelling
- ...

# Personalized contents
## Display

- **Customized** color display for both light and dark theme. 
  <details>
    <summary> Details </summary>

    - For more details, please check  **[_sass/colors/dark-typography.scss](_sass/colors/dark-typography.scss)** and **[_sass/colors/light-typography.scss](_sass/colors/light-typography.scss)**. 

  </details>

- **Customized** syntax highlighting for light theme by overwriting **[_sass/colors/light-syntax.scss](_sass/colors/light-syntax.scss)**.

- **Changed** the appearance and hover behavior of certain webpage elements.
  
    <details>
    <summary> Details </summary>
    <table>
    
    <thead>
    <tr>
    <th style="text-align: center;"> elements </th><th style="text-align: center;"> source code </th><th style="text-align: center;"> link </th>
    </tr>
    </thead>
    
    <tbody>
    
    <tr>
    <td> post tag button </td>
    <td>
    <b> color: </b>

    ```scss
    .btn.btn-outline-primary {
      &:not(.disabled):hover {
        background-color: #808fb9 !important;
        border-color: var(--backgorund-color) !important;
      }
    } 
    ```

    <b> hover behavior: </b>

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

    </td>
    <td> <b><a href="_sass/addon/commons.scss">_sass/addon/commons.scss</a></b> </td>
    </tr>
    
    <tr>
    <td> post card </td>
    <td>

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

    </td>
    <td> <b><a href="_sass/addon/commons.scss">_sass/addon/commons.scss</a></b> </td>
    </tr>

    <tr>
    <td> page link button </td>
    <td>
    
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

    </td>
    <td> <b><a href="_sass/layout/home.scss">_sass/layout/home.scss</a></b> </td>
    </tr>

    <tr>
    <td> share icons </td>
    <td>

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

    </td>
    <td> <b><a href="_sass/layout/post.scss">_sass/layout/post.scss</a></b> </td>
    </tr>
    
    </tbody>
    
    </table>
    </details>

- **Applied** a glow effect to headings and bold text in dark mode for better distiction from regular text.
  <details>
    <summary> Details </summary>

    - Modified this part in **[_sass/colors/dark-typography.scss](_sass/colors/dark-typography.scss)**
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

- **Enhanced** image animations and improved aesthetics.
  <details>
    <summary> Details </summary>

    - For more details, please check **[_sass/custom/custom-img.scss](_sass/custom/custom-img.scss)**
    - Usage:
      ```html
      <img src="img path" class="custom-img">
      ```

  </details>

## New features

- **Intergrated** support for **[Waline](https://waline.js.org/en/)** comment system in addition to Disqus, Utterances, and Giscus. 
  <details>
    <summary> Details </summary>

    - For more details, please check **[_layouts/page.html](_layouts/page.html)**.  
    - The style customization of Waline is also in **[_sass/colors/dark-typography.scss](_sass/colors/dark-typography.scss)** and **[_sass/colors/light-typography.scss](_sass/colors/light-typography.scss)**.

  </details>

- **Activated** pageview tracking for the blog home page and individual posts.
  <details>
    <summary> Details </summary>

    - This feature requires the introduction of the Waline comment system.
    - Additionally, pageview tracking includes a feature to verify the identity of the blog owner, ensuring that views during presonal browsing or local editting aren't counted.
      - Added a new page for blog owner verification, please check **[_tabs/verification.md](_tabs/verification.md)**.
      - You can use the Web Crypto API to obtain the SHA-256 hash of your custom password and set it in the format below in **[assets/js/setCookie.js](assets/js/setCookie.js)**.
        <br>

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

    - For more details, please refer to **[this blog post](https://zoooooone.github.io/posts/waline/)**, **[assets/js/pageview.js](assets/js/pageview.js)** and **[_includes/pageview.html](_includes/pageview.html)**.

  </details>

- **Incorporated** badges in the footer describing the status of the blog repository. 
  <details>
    <summary> Details </summary>

    - For more details, please check **[_includes/footer.html](_includes/footer.html)** and `footer` CSS ruleset in **[_sass/addon/commons.scss](_sass/addon/commons.scss)**. 
    - The style of badges comes from **[shields](https://shields.io/)**.

  </details>

- **Added** external links panel to the right sidebar.
  <details>
    <summary> Details </summary>

    - This idea comes from **[Nihil](https://github.com/NichtsHsu/nichtshsu.github.io/tree/master)**.
    - For more details, please check **[_includes/external-links.html](_includes/external-links.html)** and **[_layouts/page.html](_layouts/page.html)**.

  </details>

- **Enabled** sharing of blog posts to QQ, Weibo and LINE. 
  <details>
    <summary> Details </summary>

    - For more details, please check **[_data/share.yml](_data/share.yml)**.

  </details>

- **Introduced** Bilibili embedding functionality.
  <details>
    <summary> Details </summary>

    - Added the capability to embed Bilibili videos directly into blog posts for seamless video integration and a better user experience.
    - For more details, please check **[_includes/embed/bilibili.html](_includes\embed\bilibili.html)**
    - Usage: 
      ```liquid
      {% include embed/bilibili.html id="use the corresponding bv id" %}
      ```

  </details>

- **Embedded** an HTML5 music player **[Aplayer](https://github.com/DIYgod/APlayer)**
  <details>
    <summary> Details </summary>

    - Embedded a versatile, customized music player in the blog, supporting the addition, modification and deletion of songs.
      ```html
      <script src="https://cdnjs.cloudflare.com/ajax/libs/aplayer/1.10.1/APlayer.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/color-thief/2.3.0/color-thief.umd.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/meting@2.0.1/dist/Meting.min.js"></script>    
      ```
    - Displays album art with progress bar color matching the cover.
    - Supports lyrics display.
    - For more details, please check **[assets/js/APlayer/player.js](assets/js/APlayer/player.js)** and **[_sass/custom/aplayer.scss](_sass/custom/aplayer.scss)**.
    - Usage:
      ```html
      <div id="aplayer"></div>
      <script src="/assets/js/APlayer/player.js"></script>
      ```

  </details>

- **Added** animations to the blog pages.
  <details>
    <summary> Details </summary>

    - For more details, please check **[_sass/custom/animation.scss](_sass/custom/animation.scss)** and **[_includes/animated-background.html](_includes/animated-background.html)** 

  </details>

- **Added** the gallery functionality using **[lightGallery](https://github.com/sachinchoolur/lightGallery)**.
  <details>
    <summary> Details </summary>

    - Installation
      ```html
      <script src="https://cdn.jsdelivr.net/npm/lightgallery@2.7.2/lightgallery.min.js"></script>
      <link href="https://cdn.jsdelivr.net/npm/lightgallery@2.7.2/css/lightgallery-bundle.min.css" rel="stylesheet">
      <script src="https://cdn.jsdelivr.net/npm/lightgallery@2.7.2/plugins/thumbnail/lg-thumbnail.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/lightgallery@2.7.2/plugins/zoom/lg-zoom.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/lightgallery@2.7.2/plugins/autoplay/lg-autoplay.min.js"></script>
      ```

    - The gallery supports **fullscreen display**, **zoom**, **download**, **autoplay**, **thumbnails**, and more. You can also customize additional features using plugins provided by lightGallery.

    - In **[assets/src/](assets/src/)**, add your own gallery folder and include an `info.json` file in the following format：
      ```json
      [
        {
          "src": "Path to image",
          "title": "The caption of the image",
          "description": "The description of the image"
        }
      ]
      ```

    - For more details, please check **[_includes/gallery.html](_includes/gallery.html)**, **[_sass/custom/gallery.scss](_sass/custom/gallery.scss)** and **[assets/js/gallery.js](assets/js/gallery.js)**.

    - Usage:
      ```liquid
      {% include gallery.html id="Your gallery id" path="Your gallery folder name" %}
      ```

  </details>

## Future works

| Task | Status |
| --- | --- |
| **Add** h4 to the auto-generated table of contents | 🔴 Not Started |
| **Fix** the conflict between Aplayer scrollbar and tocbot | 🔴 Not Started |
| **Enhance** the tags page and implement sorting by frequency | 🔴 Not Started |
| **Introduce** a gallery feature to the blog and optimize image display | 🟢 Completed |
| ... | ... |

# Start-up
- Install **Ruby** and **Jekyll**, the tutorial is **[here](https://jekyllrb.com/docs/installation/)**. More details:
    
    1. Requirements: **Ruby**, **RubyGems**, **GCC**, **Make** 
       1. [Install instructions for macOS](https://jekyllrb.com/docs/installation/macos/)
       2. [Install instructions for Ubuntu](https://jekyllrb.com/docs/installation/ubuntu/)
       3. [Install instructions for Windows](https://jekyllrb.com/docs/installation/windows/)
    
    2. Install Jekyll
       1. macOS
          ```
          gem install jekyll
          ```
       2. Ubuntu & Windows
          ```
          gem install jekyll bundler
          ```

- Run This blog website **locally**:
    ```
    bundle install
    bundle exec jekyll serve
    ```

- The **[tutorial](https://chirpy.cotes.page/posts/getting-started/)** of jekyll theme **Chirpy**.