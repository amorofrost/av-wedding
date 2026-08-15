// Фото дома грузится по внешней ссылке (VENUE_PHOTO_URL) — ровно как фото пары
// в шапке, см. hero-photo.js. Если ссылка протухла, вместо картинки браузер
// показал бы «битую» иконку; проще убрать рамку и вернуть карточку в одну колонку.
(function () {
  var figure = document.querySelector('.venue__photo');
  if (!figure) return;

  var img = figure.querySelector('img');
  if (!img) return;

  function drop() {
    var block = figure.closest('.venue-block');
    figure.remove();
    if (block) block.classList.remove('venue-block--split');
  }

  img.addEventListener('error', drop);
  // Скрипт с defer выполняется после разбора страницы — картинка могла не
  // загрузиться ещё до того, как мы повесили обработчик.
  if (img.complete && img.naturalWidth === 0) drop();
})();
