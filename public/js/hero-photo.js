// Фото пары в шапке грузится по внешней ссылке (HERO_PHOTO_URL). Если ссылка
// протухла или хостинг недоступен, вместо картинки браузер показал бы «битую»
// иконку. Проще убрать рамку целиком — шапка вернётся к обычному текстовому виду.
(function () {
  var figure = document.querySelector('.hero__photo');
  if (!figure) return;

  var img = figure.querySelector('img');
  if (!img) return;

  function drop() {
    var hero = figure.closest('.hero');
    figure.remove();
    if (hero) hero.classList.remove('hero--split');
  }

  img.addEventListener('error', drop);
  // Скрипт с defer выполняется после разбора страницы — картинка могла не
  // загрузиться ещё до того, как мы повесили обработчик.
  if (img.complete && img.naturalWidth === 0) drop();
})();
