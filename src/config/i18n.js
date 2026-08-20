// ─────────────────────────────────────────────────────────────────────────────
// Словарь интерфейса.
//
// Здесь живут подписи, которые раньше были вписаны прямо в шаблоны: названия
// разделов, подписи формы, тексты ошибок. В отличие от content.local.js файл
// лежит в git — по этим строкам пару опознать нельзя.
//
// Формат тот же, что и у контента: { ru, uk, en }. Значение, одинаковое во всех
// языках, можно оставить обычной строкой.
//
// Названий языков здесь нет — они в src/lib/lang.js: языковая карта
// схлопывается до одной строки, а переключателю нужны все три сразу.
//
// Новая строка добавляется сразу на трёх языках, иначе падает test/i18n.test.js.
// ─────────────────────────────────────────────────────────────────────────────

import { localize } from '../lib/localize.js';

const ui = {
  common: {
    and: { ru: 'и', uk: 'та', en: 'and' },
    backHome: { ru: 'На главную', uk: 'На головну', en: 'Back to home' },
    onMap: { ru: 'На карте →', uk: 'На мапі →', en: 'View map →' },
  },

  langSwitcher: {
    label: { ru: 'Язык сайта', uk: 'Мова сайту', en: 'Site language' },
  },

  countdown: {
    days: { ru: 'дней', uk: 'днів', en: 'days' },
    hours: { ru: 'часов', uk: 'годин', en: 'hours' },
    minutes: { ru: 'минут', uk: 'хвилин', en: 'minutes' },
    seconds: { ru: 'секунд', uk: 'секунд', en: 'seconds' },
  },

  nav: {
    venue: { ru: 'Где', uk: 'Де', en: 'Where' },
    when: { ru: 'Когда', uk: 'Коли', en: 'Schedule' },
    story: { ru: 'История', uk: 'Історія', en: 'Our story' },
    dresscode: { ru: 'Дресс-код', uk: 'Дрес-код', en: 'Dress code' },
    faq: { ru: 'Вопросы', uk: 'Питання', en: 'FAQ' },
  },

  hero: {
    eyebrow: { ru: 'Мы женимся', uk: 'Ми одружуємось', en: "We're getting married" },
    scrollHint: { ru: 'Листать вниз', uk: 'Гортати вниз', en: 'Scroll down' },
  },

  home: {
    whereTitle: { ru: 'Где', uk: 'Де', en: 'Where' },
    whereLead: {
      ru: 'Будем счастливы разделить этот день с вами.',
      uk: 'Будемо щасливі розділити цей день з вами.',
      en: "We'd love to share this day with you.",
    },
    venuePhotoAlt: {
      ru: 'Дом, где пройдёт свадьба',
      uk: 'Будинок, де відбудеться весілля',
      en: 'The house where the wedding takes place',
    },
    whenTitle: { ru: 'Когда', uk: 'Коли', en: 'Schedule' },
    storyTitle: { ru: 'Наша история', uk: 'Наша історія', en: 'Our story' },
    faqTitle: { ru: 'Частые вопросы', uk: 'Часті питання', en: 'Frequently asked questions' },
    ctaTitle: {
      ru: 'Подтвердите присутствие',
      uk: 'Підтвердьте свою присутність',
      en: 'Please RSVP',
    },
    ctaLead: {
      ru: 'Мы отправили каждому гостю персональную ссылку-приглашение. Пожалуйста, ответьте до',
      uk: 'Ми надіслали кожному гостю персональне посилання-запрошення. Будь ласка, дайте відповідь до',
      en: "We've sent every guest a personal invitation link. Please reply by",
    },
    ctaHint: {
      ru: 'Откройте ссылку из вашего приглашения, чтобы ответить.',
      uk: 'Відкрийте посилання з вашого запрошення, щоб відповісти.',
      en: 'Open the link from your invitation to reply.',
    },
    contactsTitle: { ru: 'Контакты', uk: 'Контакти', en: 'Contacts' },
  },

  invite: {
    eyebrow: { ru: 'Дорогие', uk: 'Дорогі', en: 'Dear' },
    leadSuffix: {
      ru: 'приглашают вас на свою свадьбу',
      uk: 'запрошують вас на своє весілля',
      en: 'invite you to their wedding',
    },
    ceremonyAt: { ru: 'Церемония в', uk: 'Церемонія о', en: 'Ceremony at' },
    moreLink: {
      ru: 'Смотреть расписание и все детали →',
      uk: 'Дивитися розклад і всі деталі →',
      en: 'See the full schedule and details →',
    },
    rsvpTitle: { ru: 'Ваш ответ', uk: 'Ваша відповідь', en: 'Your reply' },
    savedThanks: {
      ru: 'Спасибо! Ваш ответ сохранён.',
      uk: 'Дякуємо! Вашу відповідь збережено.',
      en: 'Thank you! Your reply has been saved.',
    },
    savedYesLead: {
      ru: 'Будем очень рады видеть вас —',
      uk: 'Будемо дуже раді бачити вас —',
      en: "We'll be delighted to see you —",
    },
    savedYesTail: {
      ru: 'Ответ можно изменить в любой момент до',
      uk: 'Відповідь можна змінити будь-коли до',
      en: 'You can change your reply any time before',
    },
    savedNo: {
      ru: 'Жаль, что не сможете быть с нами. Если планы изменятся — просто ответьте снова.',
      uk: 'Шкода, що не зможете бути з нами. Якщо плани зміняться — просто дайте відповідь ще раз.',
      en: "We're sorry you can't join us. If your plans change, just reply again.",
    },
    alreadyYes: {
      ru: 'Вы уже ответили — ждём вас!',
      uk: 'Ви вже відповіли — чекаємо на вас!',
      en: "You've already replied — we're looking forward to seeing you!",
    },
    alreadyNo: {
      ru: 'Вы уже ответили.',
      uk: 'Ви вже відповіли.',
      en: "You've already replied.",
    },
    alreadyTail: {
      ru: 'Можно изменить ответ в форме ниже.',
      uk: 'Відповідь можна змінити у формі нижче.',
      en: 'You can change your reply in the form below.',
    },
    deadlineLead: {
      ru: 'Пожалуйста, ответьте до',
      uk: 'Будь ласка, дайте відповідь до',
      en: 'Please reply by',
    },
  },

  rsvp: {
    attendLegend: {
      ru: 'Сможете присоединиться?',
      uk: 'Чи зможете приєднатися?',
      en: 'Will you be able to join us?',
    },
    yes: { ru: 'С радостью буду 🎉', uk: 'З радістю буду 🎉', en: "I'll be there 🎉" },
    no: {
      ru: 'К сожалению, не смогу',
      uk: 'На жаль, не зможу',
      en: "Sorry, I can't make it",
    },
    guestCountLabel: {
      ru: 'Сколько вас будет?',
      uk: 'Скільки вас буде?',
      en: 'How many of you are coming?',
    },
    maxHint: { ru: 'максимум', uk: 'максимум', en: 'max' },
    dietaryLabel: {
      ru: 'Ограничения в еде / аллергии',
      uk: 'Обмеження в їжі / алергії',
      en: 'Dietary restrictions / allergies',
    },
    dietaryPlaceholder: {
      ru: 'Например: вегетарианец, без орехов',
      uk: 'Наприклад: вегетаріанець, без горіхів',
      en: 'For example: vegetarian, no nuts',
    },
    messageLabel: {
      ru: 'Пожелание паре / заявка на песню (необязательно)',
      uk: 'Побажання парі / заявка на пісню (необов’язково)',
      en: 'A note for the couple / a song request (optional)',
    },
    messagePlaceholder: {
      ru: 'Пара тёплых слов или любимый трек для танцпола',
      uk: 'Кілька теплих слів або улюблений трек для танцполу',
      en: 'A few warm words or a favourite track for the dance floor',
    },
    submit: { ru: 'Отправить ответ', uk: 'Надіслати відповідь', en: 'Send reply' },
    errorNoChoice: {
      ru: 'Пожалуйста, выберите, сможете ли вы присутствовать.',
      uk: 'Будь ласка, оберіть, чи зможете ви бути присутні.',
      en: "Please choose whether you'll be able to attend.",
    },
    // Формы для plural(): у ru/uk три, у en две.
    guests: {
      ru: { one: 'гость', few: 'гостя', many: 'гостей' },
      uk: { one: 'гість', few: 'гості', many: 'гостей' },
      en: { one: 'guest', other: 'guests' },
    },
  },

  errors: {
    notFound: { ru: 'Страница не найдена', uk: 'Сторінку не знайдено', en: 'Page not found' },
    server: {
      ru: 'Что-то пошло не так. Попробуйте позже.',
      uk: 'Щось пішло не так. Спробуйте пізніше.',
      en: 'Something went wrong. Please try again later.',
    },
    inviteNotFoundTitle: {
      ru: 'Приглашение не найдено',
      uk: 'Запрошення не знайдено',
      en: 'Invitation not found',
    },
    inviteNotFoundText: {
      ru: 'Похоже, ссылка неполная или устарела. Пожалуйста, проверьте её ещё раз или свяжитесь с нами — мы всё исправим.',
      uk: 'Схоже, посилання неповне або застаріле. Будь ласка, перевірте його ще раз або зв’яжіться з нами — ми все виправимо.',
      en: "The link looks incomplete or out of date. Please check it again or get in touch — we'll sort it out.",
    },
  },

  titles: {
    invite: { ru: 'Приглашение', uk: 'Запрошення', en: 'Invitation' },
    error: { ru: 'Ошибка', uk: 'Помилка', en: 'Error' },
  },

  meta: {
    description: {
      ru: 'Приглашение на свадьбу',
      uk: 'Запрошення на весілля',
      en: 'Wedding invitation —',
    },
  },
};

// Неколапсированный словарь — нужен тестам на полноту.
export const rawUi = ui;

const cache = new Map();

// Схлопывание идёт один раз на язык при первом обращении, а не на каждый запрос.
export function getUi(lang) {
  if (!cache.has(lang)) cache.set(lang, localize(ui, lang));
  return cache.get(lang);
}
