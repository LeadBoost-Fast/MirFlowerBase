#!/usr/bin/env node
/* Полная выгрузка базы Firestore в один файл (JSON Lines): по одной строке на документ, вместе со вложенными коллекциями
   (например, сообщения чатов). Нужна перед переездом на свой сервер (этап 0) и как ещё одна копия.
   Файл содержит данные клиентов: храните его только у себя, в чат и в почту не отправляйте.

   Запуск (один раз установить: cd tools && npm install):
     GOOGLE_APPLICATION_CREDENTIALS=/путь/к/ключу-сервисного-аккаунта.json node tools/export-firestore.cjs --project mirflowersbase --out export.jsonl
   Проверка без боевой базы: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node tools/export-firestore.cjs --project demo --out /tmp/e.jsonl
   Формат строки: {"path":"orders/abc","data":{...}}. Время хранится как {"__ts":миллисекунды}, ссылки как {"__ref":"путь"},
   точки на карте как {"__geo":[широта,долгота]}, бинарные данные как {"__bytes":"base64"}.
   Первая строка: {"meta":{...}} с проектом, временем и версией формата. Последняя: {"end":{"docs":число}}. */
const fs = require("fs");
const path = require("path");
function arg(name, def) { const i = process.argv.indexOf("--" + name); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def; }
if (process.argv.includes("--help")) { console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace("#!/usr/bin/env node\n/*", "")); process.exit(0); }
let admin;
try { admin = require("firebase-admin"); } catch (e) { console.error("Нет библиотеки firebase-admin. Выполните: cd tools && npm install"); process.exit(2); }
const project = arg("project", process.env.GCLOUD_PROJECT || "");
if (!project) { console.error("Укажите проект: --project mirflowersbase"); process.exit(2); }
const out = arg("out", "firestore-export-" + new Date().toISOString().slice(0, 10) + ".jsonl");
if (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("Нужен ключ сервисного аккаунта: задайте GOOGLE_APPLICATION_CREDENTIALS=/путь/к/ключу.json (ключ храните только у себя)."); process.exit(2);
}
admin.initializeApp({ projectId: project });
const db = admin.firestore();
const T = admin.firestore.Timestamp, G = admin.firestore.GeoPoint, R = admin.firestore.DocumentReference;
function enc(v) {
  if (v === null || typeof v !== "object") return v;
  if (v instanceof T) return { __ts: v.toMillis() };
  if (v instanceof G) return { __geo: [v.latitude, v.longitude] };
  if (v instanceof R) return { __ref: v.path };
  if (Buffer.isBuffer(v) || v instanceof Uint8Array) return { __bytes: Buffer.from(v).toString("base64") };
  if (Array.isArray(v)) return v.map(enc);
  const o = {}; for (const k of Object.keys(v)) o[k] = enc(v[k]); return o;
}
(async () => {
  const fd = fs.openSync(path.resolve(out), "w", 0o600);
  const w = obj => fs.writeSync(fd, JSON.stringify(obj) + "\n");
  w({ meta: { project, at: new Date().toISOString(), format: 1, emulator: !!process.env.FIRESTORE_EMULATOR_HOST } });
  let n = 0; const per = {};
  async function walk(col) {
    const snap = await col.get();
    for (const d of snap.docs) {
      w({ path: d.ref.path, data: enc(d.data()) }); n++;
      const top = d.ref.path.split("/")[0]; per[top] = (per[top] || 0) + 1;
      for (const sub of await d.ref.listCollections()) await walk(sub);
    }
  }
  for (const col of await db.listCollections()) await walk(col);
  w({ end: { docs: n } });
  fs.closeSync(fd);
  console.log("Готово: " + n + " документов в " + path.resolve(out));
  Object.keys(per).sort().forEach(k => console.log("  " + k + ": " + per[k]));
  process.exit(0);
})().catch(e => { console.error("Ошибка выгрузки: " + (e && e.message || e)); process.exit(1); });
