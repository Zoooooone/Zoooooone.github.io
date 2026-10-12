(function () {
  var root = document.documentElement;
  var wallpapers = JSON.parse(document.getElementById('wallpapers-data').textContent);
  var KEYS = ['bg', 'veil', 'glass', 'glass-strong', 'card', 'border', 'border-strong', 'fg', 'fg-muted', 'fg-faint', 'accent', 'accent-soft', 'code-bg'];

  window.__applyWallpaperTheme = function (idx) {
    var theme = wallpapers[idx].theme;
    ['light', 'dark'].forEach(function (mode) {
      var suffix = mode === 'light' ? '-l' : '-d';
      var palette = (theme && theme[mode]) || null;
      KEYS.forEach(function (key) {
        var name = '--wp-' + key + suffix;
        if (palette && palette[key]) root.style.setProperty(name, palette[key]);
        else root.style.removeProperty(name);
      });
    });
  };

  // Navigation replaces the attributes of <html>, so this runs again after every swap.
  window.__applyDocState = function () {
    root.classList.add('js');

    var lite = false;
    try {
      var conn = navigator.connection || {};
      lite =
        conn.saveData === true ||
        /(^|-)2g$/.test(conn.effectiveType || '') ||
        (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4) ||
        (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);
    } catch (e) {}
    var lessTransparency = false;
    try {
      lessTransparency = matchMedia('(prefers-reduced-transparency: reduce)').matches;
    } catch (e) {}
    if (lite) root.setAttribute('data-lite', '');
    else root.removeAttribute('data-lite');
    if (lite || lessTransparency) root.setAttribute('data-opaque', '');
    else root.removeAttribute('data-opaque');

    try {
      root.dataset.fx = localStorage.getItem('fx') === 'off' ? 'off' : 'on';
    } catch (e) {
      root.dataset.fx = 'on';
    }

    try {
      var theme = localStorage.getItem('theme');
      root.dataset.theme = theme === 'light' ? 'light' : 'dark';
    } catch (e) {
      root.dataset.theme = 'dark';
    }

    var index = 0;
    try {
      index = parseInt(localStorage.getItem('bg') || '0', 10) || 0;
    } catch (e) {}
    if (index < 0 || index >= wallpapers.length) index = 0;
    var src = wallpapers[index].src;
    root.dataset.bg = String(index);
    if (src) {
      root.style.setProperty('--bg-image', 'url("' + src + '")');
      root.style.setProperty('--bg-position', wallpapers[index].position || 'center');
      root.removeAttribute('data-plain');
    } else {
      root.style.removeProperty('--bg-image');
      root.setAttribute('data-plain', '');
    }
    window.__applyWallpaperTheme(index);
  };

  window.__applyDocState();
  if (!window.__docStateBound) {
    window.__docStateBound = true;
    // Carry the current <html> attributes into the new document so a swap never resets the theme to the server defaults.
    document.addEventListener('astro:before-swap', function (e) {
      var next = e.newDocument.documentElement;
      Array.prototype.slice.call(next.attributes).forEach(function (a) {
        next.removeAttribute(a.name);
      });
      Array.prototype.slice.call(root.attributes).forEach(function (a) {
        next.setAttribute(a.name, a.value);
      });
    });
    document.addEventListener('astro:after-swap', function () {
      window.__applyDocState();
    });
  }
})();
