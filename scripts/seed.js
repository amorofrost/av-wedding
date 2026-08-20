// Заполняет хранилище тестовыми приглашениями (для проверки/демо).
// Запуск: npm run seed
import 'dotenv/config';
import { nanoid } from 'nanoid';
import { getStore, usingAzure } from '../src/lib/store.js';

// Сид пишет тестовые приглашения. Бэкенд выбирается по переменным окружения,
// поэтому в обычной оболочке разработчика он молча целится в боевой Azure.
// Инвертируем умолчание: в Azure — только по явному разрешению.
if (usingAzure() && process.env.SEED_ALLOW_AZURE !== '1') {
  console.error('✗ Отказ: seed нацелен на Azure Table Storage (боевые данные).');
  console.error('  Локальное хранилище:');
  console.error('    DATA_FILE=/tmp/seed.json AZURE_STORAGE_CONNECTION_STRING= npm run seed');
  console.error('  Если вы действительно хотите писать в Azure:');
  console.error('    SEED_ALLOW_AZURE=1 npm run seed');
  process.exit(1);
}

const sample = [
  { names: 'Иван и Мария Петровы', maxGuests: 2, note: 'со стороны невесты', lang: 'ru' },
  { names: 'Олена Ковальчук', maxGuests: 1, note: 'подруга невесты', lang: 'uk' },
  { names: 'John & Kate Miller', maxGuests: 4, note: 'friends from Seattle', lang: 'en' },
];

const store = await getStore();
console.log(`Хранилище: ${usingAzure() ? 'Azure Table Storage' : 'локальный файл'}`);

for (const s of sample) {
  const code = nanoid(10);
  await store.createInvite({ ...s, code });
  console.log(`✓ ${s.names}  →  /invite/${code}`);
}

console.log('\nГотово. Откройте /admin, чтобы управлять приглашениями.');
process.exit(0);
