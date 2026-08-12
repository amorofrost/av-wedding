// Показ/скрытие деталей RSVP в зависимости от ответа «приду / не приду».
(function () {
  var form = document.querySelector('.rsvp-form');
  if (!form) return;

  var details = form.querySelector('.rsvp-details');
  var radios = form.querySelectorAll('input[name="attending"]');

  function sync() {
    var yes = form.querySelector('input[name="attending"][value="yes"]');
    var attending = yes && yes.checked;
    if (!details) return;
    details.style.opacity = attending ? '1' : '0.4';
    details.querySelectorAll('input, select, textarea').forEach(function (el) {
      el.disabled = !attending;
    });
  }

  radios.forEach(function (r) { r.addEventListener('change', sync); });
  sync();
})();
