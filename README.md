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

- Customized color display for both light and dark theme. 
- Customized syntax highlighting for light theme by overwriting **[_sass/colors/light-syntax.scss](_sass/colors/light-syntax.scss)**.
- Changed the appearance and hover behavior of certain webpage elements.
- Applied a glow effect to headings and bold text in dark mode for better distiction from regular text.
- Enhanced image animations and improved aesthetics.

## New features

- Intergrated support for **[Waline](https://waline.js.org/en/)** comment system in addition to Disqus, Utterances, and Giscus. 
- Activated pageview tracking for the blog home page and individual posts.
- Incorporated badges in the footer describing the status of the blog repository. 
- Added external links panel to the right sidebar.
- Enabled sharing of blog posts to QQ, Weibo and LINE. 
- Introduced Bilibili embedding functionality.
- Embedded an HTML5 music player **[Aplayer](https://github.com/DIYgod/APlayer)**
- Added animations to the blog pages.
- Added the gallery functionality using **[lightGallery](https://github.com/sachinchoolur/lightGallery)**.

**More details are available [here](https://zoooooone.github.io/changelog/)**.

## Future works

| Task | Status |
| --- | --- |
| **Add** h4 to the auto-generated table of contents | 🟢 Completed |
| **Introduce** a gallery feature to the blog and optimize image display | 🟢 Completed |
| **Fix** the conflict between Aplayer scrollbar and tocbot | 🔴 Not Started |
| **Enhance** the tags page and implement sorting by frequency | 🔴 Not Started |
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