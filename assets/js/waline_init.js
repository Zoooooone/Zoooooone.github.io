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