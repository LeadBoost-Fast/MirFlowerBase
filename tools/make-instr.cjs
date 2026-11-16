// PDF-инструкции для каждой должности из справки сайта (d-help.js) на русском и казахском. Запуск после сборки:
//   node tools/make-instr.cjs   → docs/instrukcii/Instrukciya-*.pdf
// Нужен Playwright (есть в tests/node_modules). Дата в шапке — DATE ниже.
const fs=require("fs"),vm=require("vm"),path=require("path");let PW;try{PW=require("playwright")}catch(e){PW=require(path.join(__dirname,"..","tests","node_modules","playwright"))}const {chromium}=PW;
const ROOT=path.join(__dirname,"..");
const src=fs.readFileSync(path.join(ROOT,"d-help.js"),"utf8").split("/* ---------- поиск и показ ---------- */")[0];
const w={};vm.runInNewContext(src,{window:w});const H=w.HELPX;
const kkSrc=fs.readFileSync(path.join(ROOT,"d-kk.js"),"utf8");
const kw={confirm(){},alert(){},prompt(){}};vm.runInNewContext(kkSrc,{window:kw,LANG:"ru",document:{documentElement:{},body:{},addEventListener(){},readyState:"loading"},MutationObserver:class{observe(){}},console});const T0=kw.__kkInit(new RegExp("(?!)","g"));
const kq=x=>String(x).replace(/«([^»]+)»/g,(m,y)=>{const v=T0(y);return v&&v!==y?"«"+v+"»":m});
const ROLES=[["1-Florist","f","Флорист","Флорист"],["2-Pomoshnik","s","Помощник флориста","Флорист көмекшісі"],["3-Operator","p","Оператор","Оператор"],["4-Kurer","c","Курьер","Курьер"],["5-Glavnyi-admin-Vladelec","o","Владелец","Иесі"],["6-Administrator","a","Администратор","Әкімші"]];
const KC={"Начало":"Бастау","Заказы":"Тапсырыстар","Доставка":"Жеткізу","Склад":"Склад","Клиенты и чаты":"Клиенттер және чаттар","Команда и отчёты":"Команда және есептер","Деньги и настройки":"Ақша және баптаулар"};
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const html=(r,kk)=>{const A=H.filter(a=>a[2].includes(r[1])),cats=[...new Set(A.map(a=>a[1]))],T=kk?"Mirflowers — нұсқаулық (21 қараша)":"Mirflowers — инструкция (21 ноября)",R=kk?r[3]:r[2];
 return `<!doctype html><meta charset="utf-8"><style>@page{size:A4;margin:16mm 15mm}body{font:12.5pt/1.45 "DejaVu Sans","Noto Sans",Arial,sans-serif;color:#1c1b22}h1{font-size:25pt;margin:0 0 4px}h2{font-size:15pt;margin:22px 0 8px;padding-bottom:4px;border-bottom:2px solid #6c3fe0;color:#4a24b8;break-after:avoid}h3{font-size:12.5pt;margin:14px 0 4px;break-after:avoid}.k{color:#6c3fe0;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:10pt}p.s{color:#666;margin:2px 0 14px}ol{margin:4px 0 8px;padding-left:22px}li{margin:0 0 4px}.a{break-inside:avoid;margin-bottom:6px}.f{margin-top:24px;color:#777;font-size:10pt;border-top:1px solid #ddd;padding-top:8px}</style>
 <p class="k">${T}</p><h1>${esc(R)}</h1><p class="s">${kk?"Бұл нұсқаулық сайттағы «Справка» бөлімімен бірдей. Сайттағы іздеуге «қалай толтыру» деп жазсаңыз да көмек шығады.":"Эта инструкция совпадает с разделом «Справка» на сайте. Там же можно написать вопрос в поиске, например «как заполнить склад», и появится подсказка."}</p>
 ${cats.map(c=>`<h2>${esc(kk?KC[c]||c:c)}</h2>${A.filter(a=>a[1]===c).map(a=>`<div class="a"><h3>${esc(kk?kq(a[7]):a[3])}</h3><ol>${(kk?a[8].map(kq):a[5]).map(x=>`<li>${esc(x)}</li>`).join("")}</ol></div>`).join("")}`).join("")}
 <p class="f">${kk?"Сұрақ туса — әкімшіге жазыңыз. Өзгерістер сайтта автоматты жаңарады.":"Остались вопросы — спросите администратора. Справка на сайте обновляется сама."}</p>`};
(async()=>{const br=await chromium.launch();const pg=await br.newPage();let n=0;
 for(const r of ROLES)for(const kk of [0,1]){await pg.setContent(html(r,kk));const f=path.join(path.join(ROOT,"docs","instrukcii"),"Instrukciya-"+r[0]+(kk?"-kk":"")+".pdf");await pg.pdf({path:f,format:"A4",printBackground:true,preferCSSPageSize:true});n++;console.log(path.basename(f),fs.statSync(f).size)}
 await br.close();console.log("pdf",n,"articles",H.length)})();
