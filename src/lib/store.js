// ─────────────────────────────────────────────────────────────────────────────
// Слой хранения данных о приглашениях и RSVP.
//
// Если задана переменная окружения AZURE_STORAGE_CONNECTION_STRING (или
// AZURE_STORAGE_ACCOUNT + AZURE_STORAGE_KEY) — используется Azure Table Storage.
// Иначе — локальное хранилище в JSON-файле (для разработки/тестов).
//
// Публичный интерфейс (одинаковый для обоих бэкендов):
//   init()                       -> Promise<void>
//   listInvites()                -> Promise<Invite[]>
//   getInvite(code)              -> Promise<Invite|null>
//   createInvite(data)           -> Promise<Invite>
//   updateInvite(code, patch)    -> Promise<Invite>
//   deleteInvite(code)           -> Promise<void>
//   saveRsvp(code, rsvp)         -> Promise<Invite>
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUPPORTED, DEFAULT_LANG } from './lang.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PARTITION = 'invite';
const TABLE_NAME = process.env.AZURE_TABLE_NAME || 'Invites';

// ── Нормализация записи приглашения ──────────────────────────────────────────
// Единая форма объекта, с которой работает всё приложение.
function normalize(entity = {}) {
  return {
    code: entity.code ?? entity.rowKey ?? entity.RowKey ?? '',
    names: entity.names ?? '',
    maxGuests: Number(entity.maxGuests ?? 1),
    note: entity.note ?? '', // приватная заметка организатора (гость не видит)
    // Язык персональной ссылки. Записи, созданные до появления поля, отдают
    // русский — миграция не нужна, как и в случае с overnight.
    lang: SUPPORTED.includes(entity.lang) ? entity.lang : DEFAULT_LANG,
    // RSVP
    responded: Boolean(entity.responded),
    attending:
      entity.attending === true || entity.attending === false
        ? entity.attending
        : null,
    guestCount:
      entity.guestCount === undefined || entity.guestCount === null || entity.guestCount === ''
        ? null
        : Number(entity.guestCount),
    dietary: entity.dietary ?? '',
    message: entity.message ?? '',
    // Ночёвка: одно из значений content.rsvp.overnightOptions,
    // '' — гость ещё не отвечал (в том числе записи, созданные до появления поля).
    overnight: entity.overnight ?? '',
    respondedAt: entity.respondedAt ?? null,
    createdAt: entity.createdAt ?? null,
  };
}

// ── Azure Table Storage backend ──────────────────────────────────────────────
class AzureStore {
  constructor() {
    this.client = null;
  }

  async init() {
    const { TableClient, AzureNamedKeyCredential } = await import('@azure/data-tables');
    const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;

    if (conn) {
      this.client = TableClient.fromConnectionString(conn, TABLE_NAME, {
        allowInsecureConnection: conn.includes('127.0.0.1') || conn.includes('localhost'),
      });
    } else {
      const account = process.env.AZURE_STORAGE_ACCOUNT;
      const key = process.env.AZURE_STORAGE_KEY;
      const cred = new AzureNamedKeyCredential(account, key);
      this.client = new TableClient(
        `https://${account}.table.core.windows.net`,
        TABLE_NAME,
        cred,
      );
    }

    await this.client.createTable().catch((err) => {
      // 409 = таблица уже существует — это нормально
      if (err?.statusCode !== 409) throw err;
    });
  }

  toEntity(inv) {
    return {
      partitionKey: PARTITION,
      rowKey: inv.code,
      names: inv.names ?? '',
      maxGuests: Number(inv.maxGuests ?? 1),
      note: inv.note ?? '',
      lang: inv.lang || DEFAULT_LANG,
      responded: Boolean(inv.responded),
      attending: inv.attending === null ? '' : inv.attending,
      guestCount: inv.guestCount === null ? '' : Number(inv.guestCount),
      dietary: inv.dietary ?? '',
      message: inv.message ?? '',
      overnight: inv.overnight ?? '',
      respondedAt: inv.respondedAt ?? '',
      createdAt: inv.createdAt ?? '',
    };
  }

  async listInvites() {
    const out = [];
    const iter = this.client.listEntities({
      queryOptions: { filter: `PartitionKey eq '${PARTITION}'` },
    });
    for await (const e of iter) out.push(normalize(e));
    out.sort((a, b) => (a.names || '').localeCompare(b.names || '', 'ru'));
    return out;
  }

  async getInvite(code) {
    try {
      const e = await this.client.getEntity(PARTITION, code);
      return normalize(e);
    } catch (err) {
      if (err?.statusCode === 404) return null;
      throw err;
    }
  }

  async createInvite(data) {
    const inv = normalize({ ...data, createdAt: data.createdAt || new Date().toISOString() });
    await this.client.createEntity(this.toEntity(inv));
    return inv;
  }

  async updateInvite(code, patch) {
    const current = await this.getInvite(code);
    if (!current) throw new Error('Invite not found');
    const merged = normalize({ ...current, ...patch, code });
    await this.client.updateEntity(this.toEntity(merged), 'Replace');
    return merged;
  }

  async deleteInvite(code) {
    await this.client.deleteEntity(PARTITION, code);
  }

  async saveRsvp(code, rsvp) {
    return this.updateInvite(code, {
      ...rsvp,
      responded: true,
      respondedAt: new Date().toISOString(),
    });
  }
}

// ── Локальное файловое хранилище (fallback для разработки) ────────────────────
class FileStore {
  constructor() {
    this.file =
      process.env.DATA_FILE ||
      path.join(__dirname, '..', '..', 'data', 'invites.json');
    this.cache = null;
  }

  async init() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      this.cache = JSON.parse(raw);
    } catch {
      this.cache = {};
      await this._flush();
    }
  }

  async _flush() {
    await fs.writeFile(this.file, JSON.stringify(this.cache, null, 2), 'utf8');
  }

  async listInvites() {
    return Object.values(this.cache)
      .map(normalize)
      .sort((a, b) => (a.names || '').localeCompare(b.names || '', 'ru'));
  }

  async getInvite(code) {
    return this.cache[code] ? normalize(this.cache[code]) : null;
  }

  async createInvite(data) {
    const inv = normalize({ ...data, createdAt: data.createdAt || new Date().toISOString() });
    this.cache[inv.code] = inv;
    await this._flush();
    return inv;
  }

  async updateInvite(code, patch) {
    const current = this.cache[code];
    if (!current) throw new Error('Invite not found');
    const merged = normalize({ ...current, ...patch, code });
    this.cache[code] = merged;
    await this._flush();
    return merged;
  }

  async deleteInvite(code) {
    delete this.cache[code];
    await this._flush();
  }

  async saveRsvp(code, rsvp) {
    return this.updateInvite(code, {
      ...rsvp,
      responded: true,
      respondedAt: new Date().toISOString(),
    });
  }
}

let store = null;

export function usingAzure() {
  return Boolean(
    process.env.AZURE_STORAGE_CONNECTION_STRING ||
      (process.env.AZURE_STORAGE_ACCOUNT && process.env.AZURE_STORAGE_KEY),
  );
}

export async function getStore() {
  if (store) return store;
  store = usingAzure() ? new AzureStore() : new FileStore();
  await store.init();
  return store;
}

export { normalize };
