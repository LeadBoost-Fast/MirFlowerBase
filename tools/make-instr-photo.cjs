// PDF-инструкции с фото каждой страницы для каждой должности + пошаговая справка в конце.
// Снимки делает сценарий проверок (эмулятор): папка со снимками и man.json передаётся в PHOTOS.
//   PHOTOS=/путь/к/снимкам node tools/make-instr-photo.cjs   → docs/instrukcii/Instrukciya-*.pdf (русские)
const fs=require("fs"),vm=require("vm"),path=require("path");let PW;try{PW=require("playwright")}catch(e){PW=require(path.join(__dirname,"..","tests","node_modules","playwright"))}const {chromium}=PW;
const ROOT=path.join(__dirname,".."),PH=process.env.PHOTOS,DATE="21 ноября 2026";
if(!PH||!fs.existsSync(path.join(PH,"man.json"))){console.error("Нет снимков: PHOTOS=папка с man.json");process.exit(1)}
const {C,man}=JSON.parse(fs.readFileSync(path.join(PH,"man.json"),"utf8"));
const src=fs.readFileSync(path.join(ROOT,"d-help.js"),"utf8").split("/* ---------- поиск и показ ---------- */")[0];const w={};vm.runInNewContext(src,{window:w});const H=w.HELPX;
const RL={"1-Florist":"f","2-Pomoshnik":"s","3-Operator":"p","4-Kurer":"c","5-Glavnyi-admin-Vladelec":"o","6-Administrator":"a"};
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const FIRST={c:["Откройте ссылку в Safari → «Поделиться» → «На экран «Домой»». Дальше открывайте сайт со значка.","Войдите по почте и паролю от владельца. При первом входе пройдите короткую настройку.","Включите уведомления (последний шаг настройки), чтобы узнавать о новых доставках.","На главной нажмите «Выйти на линию», когда готовы возить."],
 d:["Откройте ссылку в Safari → «Поделиться» → «На экран «Домой»». Дальше открывайте сайт со значка.","Войдите по почте и паролю от владельца. При первом входе пройдите короткую настройку: меню, размер, цвет, уведомления.","Придя на работу, нажмите на главной «Начать смену». В конце смены сдайте отчёты и нажмите «Закончить смену».","Не нашли кнопку — лупа вверху: напишите вопрос своими словами, например «как списать цветы»."]};
const html=r=>{const role=RL[r.file],A=H.filter(a=>a[2].includes(role)),cats=[...new Set(A.map(a=>a[1]))],first=role==="c"?FIRST.c:FIRST.d;
 return `<!doctype html><meta charset="utf-8"><style>@page{size:A4;margin:12mm 11mm}body{font:11pt/1.4 "DejaVu Sans","Noto Sans",Arial,sans-serif;color:#1c1b22;margin:0}
 .k{color:#7a4f7a;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:9pt;margin:0}h1{font-size:24pt;margin:2px 0 4px}p.s{color:#555;margin:0 0 10px}
 .first{border:1px solid #e3d9e3;border-radius:10px;padding:10px 14px;margin:0 0 12px;background:#faf6fa}.first b{display:block;margin-bottom:4px}.first ol{margin:0;padding-left:20px}.first li{margin:2px 0}
 .g{display:grid;grid-template-columns:repeat(3,1fr);gap:9mm 6mm}figure{margin:0;break-inside:avoid}figure img{width:100%;border:1px solid #d9d2d9;border-radius:14px;display:block}
 figcaption{font-size:9.5pt;line-height:1.35;margin-top:5px}figcaption i{font-style:normal;display:inline-block;min-width:18px;height:18px;border-radius:9px;background:#7a4f7a;color:#fff;text-align:center;font-size:8.5pt;line-height:18px;margin-right:5px}
 h2{font-size:14pt;margin:18px 0 6px;padding-bottom:3px;border-bottom:2px solid #7a4f7a;color:#5a3a5a;break-after:avoid}h3{font-size:11pt;margin:10px 0 3px;break-after:avoid}ol.st{margin:2px 0 6px;padding-left:20px}ol.st li{margin:0 0 2px}.a{break-inside:avoid}.steps{break-before:page}
 .f{margin-top:16px;color:#777;font-size:9pt;border-top:1px solid #ddd;padding-top:6px}</style>
 <p class="k">Инструкция · ${DATE}</p><h1>${esc(r.title)}</h1><p class="s">Каждая страница сайта с пояснением. Снимки сделаны на телефоне в обычном виде (Bento, чёрно-белое оформление); у вас цвет может быть другим.</p>
 <div class="first"><b>Первые шаги</b><ol>${first.map(x=>`<li>${esc(x)}</li>`).join("")}</ol></div>
 <div class="g">${r.shots.map(([k,f],i)=>`<figure><img src="${path.basename(f)}"><figcaption><i>${i+1}</i>${esc(C[k]||k)}</figcaption></figure>`).join("")}</div>
 <div class="steps"><p class="k">Как сделать: пошагово</p>${cats.map(c=>`<h2>${esc(c)}</h2>${A.filter(a=>a[1]===c).map(a=>`<div class="a"><h3>${esc(a[3])}</h3><ol class="st">${a[5].map(x=>`<li>${esc(x)}</li>`).join("")}</ol></div>`).join("")}`).join("")}</div>
 <p class="f">Остались вопросы — спросите администратора или откройте «Справку» на сайте: она обновляется сама.</p>`};
(async()=>{const br=await chromium.launch(),pg=await br.newPage();
 for(const r of man){const hf=path.join(PH,"Instrukciya-"+r.file+".html");fs.writeFileSync(hf,html(r));await pg.goto("file://"+hf);await pg.waitForTimeout(400);
  const out=path.join(ROOT,"docs","instrukcii","Instrukciya-"+r.file+".pdf");await pg.pdf({path:out,format:"A4",printBackground:true,preferCSSPageSize:true});console.log(path.basename(out),Math.round(fs.statSync(out).size/1024)+" КБ",r.shots.length+" снимков")}
 await br.close()})();
