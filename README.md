# Свадебный сайт · AV Wedding

Сайт для гостей свадьбы: информация о торжестве, персональные приглашения по
уникальным ссылкам и форма подтверждения присутствия (RSVP). Данные хранятся в
**Azure Table Storage**. Приложение упаковано в **Docker** и разворачивается на
VM в Azure.

Интерфейс — на русском языке.

---

## Что умеет

- **Главная страница** с информацией о свадьбе: дата с обратным отсчётом,
  площадки (церемония/банкет) с картами, программа дня, дресс-код, наша история,
  частые вопросы и контакты.
- **Персональные приглашения** — у каждого гостя своя ссылка вида
  `/invite/<код>`. Открывается без пароля, показывает имя гостя и форму ответа.
- **RSVP** собирает: приду / не приду, количество гостей (в пределах лимита
  приглашения), ограничения в еде, пожелание паре / заявку на песню. Ответ
  можно изменить в любой момент.
- **Админ-панель** (`/admin`, вход по паролю): статистика, создание приглашений
  с генерацией ссылок, копирование ссылок, поиск по гостям, удаление, экспорт
  всех ответов в **CSV**.

---

## Структура проекта

```
src/
  server.js            — точка входа (Express)
  config/content.js    — ВСЁ содержимое сайта (тексты, даты, площадки) — редактируйте здесь
  lib/store.js         — хранилище: Azure Table Storage или локальный файл
  middleware/auth.js   — защита админки паролем
  routes/              — public / invite / admin
views/                 — EJS-шаблоны
public/                — CSS и клиентский JS
scripts/seed.js        — тестовые приглашения (npm run seed)
Dockerfile, docker-compose.yml
.env.example           — пример настроек
```

---

## Настройка содержимого

Все тексты, даты, имена, площадки, программа дня, дресс-код и FAQ находятся в
одном файле — [`src/config/content.js`](src/config/content.js). Отредактируйте
его под свою свадьбу и перезапустите приложение (или пересоберите контейнер).

---

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

| Переменная | Назначение |
|---|---|
| `PORT` | Порт приложения (по умолчанию `3000`) |
| `APP_URL` | Публичный адрес сайта — используется для генерации ссылок-приглашений в админке, напр. `https://wedding.example.com` |
| `CONTACT_PHONE` | Телефон в блоке контактов. Держится вне git — репозиторий публичный. Если не задан, контакт показывается без телефона |
| `ADMIN_PASSWORD` | **Пароль для входа в `/admin`. Обязательно смените.** |
| `SESSION_SECRET` | Длинная случайная строка для подписи cookie сессии |
| `AZURE_STORAGE_CONNECTION_STRING` | Строка подключения к Azure Storage. Если не задана — используется локальный файл `data/invites.json` (только для разработки) |
| `AZURE_STORAGE_ACCOUNT` / `AZURE_STORAGE_KEY` | Альтернатива строке подключения |
| `AZURE_TABLE_NAME` | Имя таблицы (по умолчанию `Invites`) |

> Таблица в Azure создаётся автоматически при первом запуске — вручную создавать
> её не нужно.

---

## Локальный запуск (для разработки)

```bash
npm install
cp .env.example .env        # задайте ADMIN_PASSWORD и SESSION_SECRET
npm run seed                # (необязательно) добавит тестовые приглашения
npm start
```

Без `AZURE_STORAGE_CONNECTION_STRING` приложение хранит данные в `data/invites.json`.
Откройте <http://localhost:3000> и админку на <http://localhost:3000/admin>.

---

## Развёртывание на VM в Azure (Docker)

### 1. Создайте Storage Account и получите строку подключения

```bash
az storage account create \
  --name myweddingstorage --resource-group my-rg --location westeurope --sku Standard_LRS

az storage account show-connection-string \
  --name myweddingstorage --resource-group my-rg --query connectionString -o tsv
```

### 2. На VM: получите код и настройте `.env`

```bash
git clone <repo-url> av-wedding && cd av-wedding
cp .env.example .env
# отредактируйте .env: ADMIN_PASSWORD, SESSION_SECRET, APP_URL,
# AZURE_STORAGE_CONNECTION_STRING
```

### 3. Запуск через Docker Compose

```bash
docker compose up -d --build
docker compose logs -f          # проверить, что стартовало
```

Или вручную:

```bash
docker build -t av-wedding .
docker run -d --name av-wedding --restart unless-stopped \
  -p 3000:3000 --env-file .env av-wedding
```

Приложение слушает порт `3000` внутри контейнера. В `docker-compose.yml` он
проброшен на хост.

### 4. HTTPS и домен

Поставьте перед контейнером обратный прокси (nginx / Caddy) для TLS и домена.
Приложение доверяет заголовкам `X-Forwarded-*` (`trust proxy`), а cookie сессии
получают флаг `Secure` при `NODE_ENV=production`. Пример nginx:

```nginx
server {
    server_name wedding.example.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Не забудьте открыть порт в Network Security Group VM и оформить сертификат
(например, `certbot`).

---

## Как пользоваться

1. Войдите в `/admin` под своим паролем.
2. Создайте приглашение — укажите имя гостей и максимальное число гостей.
3. Скопируйте персональную ссылку и отправьте гостю (мессенджер, e-mail).
4. Следите за ответами и статистикой в админке; выгрузите итог в CSV.

Проверка работоспособности контейнера — эндпоинт `GET /healthz`.

---

## Данные и приватность

- Страницы закрыты от индексации (`noindex`), ссылки-приглашения содержат
  случайный код и не перечисляются публично.
- В Azure Table Storage хранится одна таблица `Invites`: имя гостя, лимит
  гостей, приватная заметка организатора и поля ответа (RSVP).
- При локальном режиме данные лежат в `data/invites.json` (в git не попадает).
