# ── Свадебный сайт: production-образ ─────────────────────────────────────────
FROM node:22-alpine

# Рабочая директория
WORKDIR /app

ENV NODE_ENV=production

# Устанавливаем только production-зависимости (слой кэшируется)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

# Копируем исходники
COPY src ./src
COPY views ./views
COPY public ./public
COPY scripts ./scripts

# Директория для локального файлового хранилища (если Azure не настроен)
RUN mkdir -p /app/data

# Непривилегированный пользователь
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Healthcheck — простой пинг эндпоинта /healthz
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
