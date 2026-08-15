(function () {
  var root = document.documentElement;
  var button = document.getElementById('theme-toggle');
  var grassLayer = document.getElementById('dark-grass-layer');
  var systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function canShowGrass() {
    return !reducedMotion.matches && window.innerWidth > 700 && 'WebGLRenderingContext' in window;
  }

  function syncGrassScroll() {
    if (!grassLayer || !grassLayer.firstElementChild) return;

    grassLayer.firstElementChild.contentWindow.postMessage({
      type: 'grass-scroll',
      scrollY: window.scrollY || window.pageYOffset
    }, window.location.origin);
  }

  function updateGrass(theme) {
    if (!grassLayer) return;

    if (theme === 'dark' && canShowGrass()) {
      if (!grassLayer.firstElementChild) {
        var frame = document.createElement('iframe');
        frame.src = grassLayer.getAttribute('data-src');
        frame.title = 'Animated grass background';
        frame.tabIndex = -1;
        frame.addEventListener('load', syncGrassScroll);
        grassLayer.appendChild(frame);
      }
      return;
    }

    grassLayer.replaceChildren();
  }

  function applyTheme(theme, savePreference) {
    root.setAttribute('data-theme', theme);
    if (button) {
      var isDark = theme === 'dark';
      button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      button.firstElementChild.textContent = isDark ? '☀' : '◐';
    }
    if (savePreference) {
      storedTheme = theme;
      localStorage.setItem('theme', theme);
    }
    updateGrass(theme);
  }

  var storedTheme;
  try {
    storedTheme = localStorage.getItem('theme');
  } catch (error) {}

  applyTheme(storedTheme || (systemTheme.matches ? 'dark' : 'light'), false);

  if (button) {
    button.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  }

  systemTheme.addEventListener('change', function (event) {
    if (!storedTheme) applyTheme(event.matches ? 'dark' : 'light', false);
  });

  reducedMotion.addEventListener('change', function () {
    updateGrass(root.getAttribute('data-theme'));
  });

  window.addEventListener('scroll', syncGrassScroll, { passive: true });
})();
