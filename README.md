# My Blog 
<img alt="GitHub commit activity" src="https://img.shields.io/github/commit-activity/m/zoooooone/zoooooone.github.io?label=activity"> &ensp; <img alt="GitHub last commit (branch)" src="https://img.shields.io/github/last-commit/zoooooone/Zoooooone.github.io/main"> &ensp; <img alt="GitHub repo size" src="https://img.shields.io/github/repo-size/zoooooone/zoooooone.github.io"> &ensp; <img alt="GitHub issues" src="https://img.shields.io/github/issues/zoooooone/zoooooone.github.io"> &ensp; <img alt="GitHub deployments" src="https://img.shields.io/github/deployments/zoooooone/zoooooone.github.io/github-pages">

This is my customized blog based on the **[Chirpy jekyll theme](https://github.com/cotes2020/jekyll-theme-chirpy)**. Here is the link to **[my blog](https://zoooooone.github.io/)**.

# Purpose
To record study notes and daily life, and to enjoy the process of building a blog as a beginner.
- Coding
- Researching
- Travelling
- ...

# Personalized contents
## Display
- **Customized** color display for both light and dark theme. 
  - For details, please see  [`_sass/colors/dark-typography.scss`](_sass/colors/dark-typography.scss) and [`_sass/colors/light-typography.scss`](_sass/colors/light-typography.scss). 
- **Customized** syntax highlighting for light theme by overwriting [`_sass/colors/light-syntax.scss`](_sass/colors/light-syntax.scss).
- **Changed** hover behavior (color) of buttons in [`_sass/addon/commons.scss`](_sass/addon/commons.scss). Details:
  ```scss
  .btn.btn-outline-primary {
    &:not(.disabled):hover {
      background-color: #808fb9 !important;
      border-color: --backgorund-color !important;
    }
  } 
  ``` 
## New features
- **Added** support for **[Waline](https://waline.js.org/en/)** comment system in addition to Disqus, Utterances, and Giscus. 
  - For details, please see [`_layouts/page.html`](_layouts/page.html).  
  - The style customization of Waline is also in [`_sass/colors/dark-typography.scss`](_sass/colors/dark-typography.scss) and [`_sass/colors/light-typography.scss`](_sass/colors/light-typography.scss).
- **Added** badges in the footer describing the status of the blog repository. 
  - For details, please see [`_includes/footer.html`](_includes/footer.html) and `footer` CSS ruleset in [`_sass/addon/commons.scss`](_sass/addon/commons.scss). 
  - The style of badges comes from **[shields](https://shields.io/)**.
- **Added** external links panel to the right sidebar.
  - This idea comes from **[Nihil](https://github.com/NichtsHsu/nichtshsu.github.io/tree/master)**.
  - For details, please see [`_includes/external-links.html`](_includes/external-links.html) and [`_layouts/page.html`](_layouts/page.html).
- **Added** the function of sharing blog posts to QQ and Weibo. 
  - For details, please see [`_data/share.yml`](_data/share.yml).

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