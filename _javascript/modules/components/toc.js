export function toc() {
  const contentArea = document.getElementById('content-area');
  const isMultiLanguage = contentArea !== null;
  const contentSelector = isMultiLanguage ? getActiveContentSelector() : '.post-content';

  if (document.querySelector(`${contentSelector} h2, ${contentSelector} h3, ${contentSelector} h4`)) {
    tocbot.init({
      tocSelector: '#toc',
      contentSelector: contentSelector,
      ignoreSelector: '[data-toc-skip]',
      headingSelector: 'h2, h3, h4',
      orderedList: false,
      scrollSmooth: false,
    });

    if (isMultiLanguage) {
      initializeLanguageToggle();
    }
  }
}

function getActiveContentSelector() {
  const preferredLanguage = localStorage.getItem('preferredLanguage') || 'en';
  return `#${preferredLanguage}-content`;
}

function initializeLanguageToggle() {
  const switchButtons = document.querySelectorAll('button[data-lang]');
  switchButtons.forEach(button => {
    button.addEventListener('click', () => {
      const lang = button.getAttribute('data-lang');
      switchLanguage(lang);
    });
  });

  const preferredLanguage = localStorage.getItem('preferredLanguage') || 'en';
  switchLanguage(preferredLanguage);
}

function switchLanguage(lang) {
  const contents = document.querySelectorAll('#content-area > div');
  contents.forEach((content) => {
    content.style.display = 'none';
  });

  const activeContent = document.getElementById(`${lang}-content`);
  if (activeContent) {
    activeContent.style.display = 'block';
  }

  localStorage.setItem('preferredLanguage', lang);

  tocbot.destroy();
  tocbot.init({
    tocSelector: '#toc',
    contentSelector: `#${lang}-content`,
    ignoreSelector: '[data-toc-skip]',
    headingSelector: 'h2, h3, h4',
    orderedList: false,
    scrollSmooth: false,
  });
}