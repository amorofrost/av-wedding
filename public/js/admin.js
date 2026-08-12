// Админка: копирование ссылок и живой поиск по списку гостей.
(function () {
  // Копирование ссылки-приглашения
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var link = btn.getAttribute('data-copy');
      var done = function () {
        var old = btn.textContent;
        btn.textContent = 'Скопировано ✓';
        setTimeout(function () { btn.textContent = old; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(done, function () { fallback(link); done(); });
      } else {
        fallback(link); done();
      }
    });
  });

  function fallback(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  // Поиск по имени гостя
  var filter = document.getElementById('guest-filter');
  if (filter) {
    filter.addEventListener('input', function () {
      var q = filter.value.trim().toLowerCase();
      document.querySelectorAll('.guests tbody tr').forEach(function (row) {
        var name = row.getAttribute('data-name') || '';
        row.style.display = name.indexOf(q) !== -1 ? '' : 'none';
      });
    });
  }
})();
