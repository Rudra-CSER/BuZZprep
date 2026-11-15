// Runs before the app bundle so the first paint already uses the right theme.
(function () {
  try {
    var pref = localStorage.getItem('bp-theme') || 'system';
    var dark =
      pref === 'dark' ||
      (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {
    /* storage unavailable — fall back to light */
  }
})();
