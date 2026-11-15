// Проверка страницы продажи sell.html: телефон и ноутбук, без ошибок, без горизонтальной прокрутки, картинки, язык, бирка. Запуск: node tests/sell.cjs
const fs=require("fs"),path=require("path"),http=require("http"),{chromium,devices}=require("playwright");
const ROOT=path.resolve(__dirname,".."),OUT=path.join(__dirname,"out");fs.mkdirSync(OUT,{recursive:true});
const MT={".html":"text/html; charset=utf-8",".jpg":"image/jpeg",".js":"text/javascript",".css":"text/css"};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split("?")[0]);if(u==="/")u="/sell.html";const f=path.join(ROOT,u);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.statusCode=404;return r.end("no")}r.setHeader("content-type",MT[path.extname(f)]||"application/octet-stream");r.end(fs.readFileSync(f))}).listen(5079);
(async()=>{const N=[],ok=(c,m)=>N.push((c?"OK   ":"FAIL ")+m),errs=[];const br=await chromium.launch();
 for(const [nm,opt] of [["phone",{...devices["iPhone 13"]}],["desk",{viewport:{width:1280,height:900}}]]){
  const ctx=await br.newContext({...opt,deviceScaleFactor:1}),pg=await ctx.newPage();pg.on("pageerror",e=>errs.push(nm+": "+e.message));pg.on("console",m=>{if(m.type()==="error")errs.push(nm+" console: "+m.text())});
  await pg.goto("http://127.0.0.1:5079/");await pg.waitForTimeout(600);
  ok(await pg.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),nm+": нет горизонтальной прокрутки");
  ok(await pg.evaluate(()=>[...document.images].every(i=>i.complete)),nm+": картинки загружаются");
  await pg.evaluate(()=>[...document.images].forEach(i=>i.loading="eager"));await pg.waitForTimeout(500);
  ok(await pg.evaluate(()=>[...document.images].every(i=>i.naturalWidth>0)),nm+": у всех картинок есть содержимое");
  await pg.waitForTimeout(4600);ok(await pg.evaluate(()=>document.querySelectorAll("#steps li.on").length===5&&document.getElementById("bub").classList.contains("on")),nm+": бирка заказа прошла все 5 этапов, сообщение клиенту показано");
  ok(await pg.evaluate(()=>[...document.querySelectorAll("[data-wa]")].every(a=>/^https:\/\/wa\.me\/77071362008\?text=/.test(a.href)&&!a.classList.contains("todo"))),nm+": кнопки WhatsApp ведут на номер с готовым сообщением");
  ok(await pg.evaluate(()=>[...document.querySelectorAll("[data-mail]")].every(a=>getComputedStyle(a).display==="none")),nm+": без почты кнопка почты скрыта");
  ok(await pg.evaluate(()=>/[0-9]/.test(document.querySelector("[data-p=base]").textContent)&&!document.querySelector(".plans .todo")),nm+": цены на странице");
  ok(await pg.evaluate(()=>document.querySelectorAll("[data-kk]").length>60),nm+": тексты есть и на казахском");
  await pg.locator('.lang [data-l=kk]').click();await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>document.documentElement.lang==="kk"&&/Гүл дүкенінің/.test(document.querySelector("h1").textContent)),nm+": язык переключается на казахский");
  await pg.locator('.lang [data-l=ru]').click();await pg.waitForTimeout(200);ok(await pg.evaluate(()=>/Заказы, склад/.test(document.querySelector("h1").textContent)),nm+": и обратно на русский");
  await pg.locator("details summary").first().click();await pg.waitForTimeout(250);ok(await pg.evaluate(()=>document.querySelector("details").open),nm+": вопрос раскрывается");
  const bad=await pg.evaluate(()=>[...document.querySelectorAll("a,button")].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.height<40)&&!e.closest("summary")&&e.tagName!=="A"||false}).map(e=>e.textContent.trim().slice(0,20)));
  ok(bad.length===0,nm+": кнопки не ниже 40 px"+(bad.length?" ("+bad.join(",")+")":""));
  await pg.screenshot({path:OUT+"/sell-"+nm+".png",fullPage:true});await ctx.close()}
 
 console.log(N.join("\n"));console.log("ERRS",errs.length,errs.slice(0,5).join(" || "));await br.close();srv.close();process.exit(0)})().catch(e=>{console.log("CRASH",e.message.slice(0,300));process.exit(1)});
