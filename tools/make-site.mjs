#!/usr/bin/env node
// Собирает папку с сайтом для выкладки на свой сервер (PS.kz): только то, что нужно магазину.
// Запуск: node tools/make-site.mjs [--out dist/ps-site/site] [--with-sell] [--check]
// Сначала должна быть выполнена сборка (node build/build.mjs). Сайт на сервере всё так же работает с Firebase,
// пока не будет готово ядро своего сервера (этап 1), поэтому Firebase-ключи и настройки магазина не трогаем.
// --check: только проверить и ничего не копировать (для проверки в GitHub).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : d; };
const flag = n => process.argv.includes("--" + n);
const out = path.resolve(ROOT, arg("out", "dist/ps-site/site"));
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8");
const die = m => { console.error("Ошибка: " + m); process.exit(1); };
const warn = m => console.log("Внимание: " + m);

if (!fs.existsSync(path.join(ROOT, "index.html"))) die("нет index.html: сначала node build/build.mjs");
const page = rd("index.html");
const files = new Set(["index.html", "shop.config.js", "vitrina.html", "status.html", "manifest.json", "firebase-messaging-sw.js", "privacy.html", "terms.html", "data-deletion.html"]);
for (const f of fs.readdirSync(ROOT)) if (/^d-[a-z]+\.js$/.test(f) || /^icon-\d+\.png$/.test(f)) files.add(f);
// скрипт и стили сайта, на которые ссылается страница (с хэшем в имени)
const refs = [...page.matchAll(/(?:src|href)="(assets\/app\.[0-9a-f]{8}\.(?:js|css))"/g)].map(m => m[1]);
if (refs.length < 2) die("в index.html нет ссылок на assets/app.*.js и .css");
refs.forEach(r => files.add(r));
if (flag("with-sell")) { files.add("sell.html"); if (fs.existsSync(path.join(ROOT, "assets/sell"))) for (const f of fs.readdirSync(path.join(ROOT, "assets/sell"))) files.add("assets/sell/" + f); }

const missing = [...files].filter(f => !fs.existsSync(path.join(ROOT, f)));
if (missing.length) die("нет файлов: " + missing.join(", "));
try { JSON.parse(rd("manifest.json")); } catch (e) { die("manifest.json не читается: " + e.message); }
if (!/window\.SHOP_CFG\s*=/.test(rd("shop.config.js"))) die("в shop.config.js нет window.SHOP_CFG");
// редкие разделы, которые сайт подгружает по требованию
const app = rd(refs.find(r => r.endsWith(".js")));
for (const d of ["d-cosmos.js", "d-command.js", "d-atlas.js", "d-help.js", "d-kk.js"]) if (!files.has(d) && app.includes(d)) die("сайт подгружает " + d + ", а файла нет");
// реквизиты для страниц Meta
const cfg = rd("shop.config.js");
if (/legal:\{[^}]*owner:""/.test(cfg)) warn("в shop.config.js пустые реквизиты (legal): страницы privacy, terms и data-deletion публиковать нельзя");

const h = crypto.createHash("sha256");
[...files].sort().forEach(f => { h.update(f); h.update(fs.readFileSync(path.join(ROOT, f))); });
const ver = h.digest("hex").slice(0, 12);
if (flag("check")) { console.log("Проверка пройдена: " + files.size + " файлов, версия " + ver); process.exit(0); }

fs.rmSync(out, { recursive: true, force: true });
let bytes = 0;
for (const f of files) { const to = path.join(out, f); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(ROOT, f), to); bytes += fs.statSync(to).size; }
fs.writeFileSync(path.join(out, "site-version.txt"), ver + "\n" + new Date().toISOString() + "\n");
console.log("Готово: " + out + "\n файлов: " + files.size + ", " + Math.round(bytes / 1024) + " КБ, версия " + ver);
