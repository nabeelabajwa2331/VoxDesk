(function () {
  var root = document.documentElement;
  var toggles = document.querySelectorAll('.theme-toggle');

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    toggles.forEach(function (t) {
      t.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    });
    try { localStorage.setItem('voxdesk-theme', theme); } catch (e) {}
  }

  var saved = null;
  try { saved = localStorage.getItem('voxdesk-theme'); } catch (e) {}
  apply(saved === 'dark' ? 'dark' : 'light');

  toggles.forEach(function (t) {
    t.addEventListener('click', function () {
      apply(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  });

  document.querySelectorAll('.seg').forEach(function (group) {
    var buttons = group.querySelectorAll('button');
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        buttons.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      });
    });
  });
})();
