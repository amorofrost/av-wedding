// Обратный отсчёт до свадьбы.
(function () {
  var nodes = document.querySelectorAll('.countdown');
  if (!nodes.length) return;

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function tick() {
    nodes.forEach(function (el) {
      var target = new Date(el.getAttribute('data-target')).getTime();
      var diff = Math.max(0, target - Date.now());
      var s = Math.floor(diff / 1000);
      var days = Math.floor(s / 86400);
      var hours = Math.floor((s % 86400) / 3600);
      var minutes = Math.floor((s % 3600) / 60);
      var seconds = s % 60;

      var set = function (key, val) {
        var n = el.querySelector('[data-cd="' + key + '"]');
        if (n) n.textContent = val;
      };
      set('days', days);
      set('hours', pad(hours));
      set('minutes', pad(minutes));
      set('seconds', pad(seconds));
    });
  }

  tick();
  setInterval(tick, 1000);
})();
