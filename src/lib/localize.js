// ─────────────────────────────────────────────────────────────────────────────
// Схлопывание языковых карт.
//
// Переводимое значение записывается прямо в дереве как { ru, uk, en }; функция
// localize() проходит дерево и оставляет от каждой такой карты одну строку.
// Шаблоны в итоге получают обычный объект и про языки ничего не знают.
//
// Значение, одинаковое во всех языках (адрес, ссылка, hex-цвет), остаётся
// обычной строкой — она проходит насквозь.
// ─────────────────────────────────────────────────────────────────────────────

import { SUPPORTED, DEFAULT_LANG } from './lang.js';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Языковая карта — объект, все ключи которого являются кодами языков.
// Правило однозначно: в дереве контента нет объектов с полями ru/uk/en.
export function isLangMap(value) {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => SUPPORTED.includes(key));
}

// Недостающий перевод откатывается на русский, а если нет и его — на первое
// заполненное значение. Так недоперевод показывает русский текст, а не
// «[object Object]».
export function localize(value, lang) {
  if (isLangMap(value)) {
    if (value[lang] !== undefined) return value[lang];
    if (value[DEFAULT_LANG] !== undefined) return value[DEFAULT_LANG];
    const first = Object.keys(value)[0];
    return first === undefined ? '' : value[first];
  }

  if (Array.isArray(value)) return value.map((item) => localize(item, lang));

  if (isPlainObject(value)) {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = localize(item, lang);
    return out;
  }

  return value;
}
