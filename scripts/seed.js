// Заполняет хранилище тестовыми приглашениями (для проверки/демо).
// Запуск: npm run seed
import 'dotenv/config';
import { nanoid } from 'nanoid';
import { getStore, usingAzure } from '../src/lib/store.js';

const sample = [
  { names: 'Иван и Мария Петровы', maxGuests: 2, note: 'со стороны невесты' },
  { names: 'Александр Смирнов', maxGuests: 1, note: 'коллега' },
  { names: 'Семья Ковалёвых', maxGuests: 4, note: 'родственники' },
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
