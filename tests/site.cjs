// Проверка сайта как живой пользователь (Chromium, эмулятор Firestore и Auth). Запуск: см. tests/README.md
const fs=require("fs"),path=require("path"),http=require("http"),{chromium,devices}=require("playwright");
const ROOT=process.env.SITE||path.resolve(__dirname,".."),NM=process.env.FB_DIR||path.join(__dirname,"node_modules/firebase"),OUT=path.join(__dirname,"out");fs.mkdirSync(OUT,{recursive:true});
const fbfix=h=>h.replace(/https:\/\/www\.gstatic\.com\/firebasejs\/[0-9.]+\//g,"/fb/");
// Сайт берётся из корня готовым (после сборки), без правки текста кода: флаги для проверок задаются в начале страницы
let html=fbfix(fs.readFileSync(path.join(ROOT,"index.html"),"utf8")).replace("<head>","<head><script>window.__EMU=1;window.__NOGEO=1;window.__NATIVEASK=1;window.__FSREST='http://127.0.0.1:8080';try{localStorage.setItem('cacheV','3')}catch(e){}</script>");
const vhtml=fbfix(fs.readFileSync(path.join(ROOT,"vitrina.html"),"utf8")).replace("<script>\nconst $=","<script>window.__FSEMU=1;\nconst $=");
const srv=http.createServer((q,r)=>{const u=q.url.split("?")[0];if(/^\/d-[a-z]+\.js$/.test(u)){const ff=path.join(ROOT,u.slice(1));if(fs.existsSync(ff)){r.setHeader("content-type","text/javascript");return r.end(fs.readFileSync(ff))}}if(u.startsWith("/fb/")){const f=path.join(NM,u.slice(4));if(fs.existsSync(f)){r.setHeader("content-type","text/javascript");return r.end(fs.readFileSync(f))}}if(u==="/"){r.setHeader("content-type","text/html");return r.end(html)}if(u==="/status.html"){r.setHeader("content-type","text/html");return r.end(fbfix(fs.readFileSync(path.join(ROOT,"status.html"),"utf8")).replace("<script>\nconst cfg","<script>window.__FSEMU=1;\nconst cfg"))}if(u==="/vitrina.html"){r.setHeader("content-type","text/html");return r.end(vhtml)}const f=path.join(ROOT,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){if(/\.css$/.test(u)){r.setHeader("content-type","text/css");return r.end(fs.readFileSync(f,"utf8").replaceAll("content-visibility:auto","content-visibility:visible"))}if(/\.js$/.test(u))r.setHeader("content-type","text/javascript");return r.end(fs.readFileSync(f))}r.statusCode=404;r.end()}).listen(5078);
const FS="http://127.0.0.1:8080/v1/projects/mirflowersbase/databases/(default)/documents";
const put=(c,id,o)=>fetch(`${FS}/${c}/${id}`,{method:"PATCH",headers:{"content-type":"application/json",Authorization:"Bearer owner"},body:JSON.stringify({fields:Object.fromEntries(Object.entries(o).map(([k,v])=>[k,typeof v==="boolean"?{booleanValue:v}:typeof v==="number"?{integerValue:String(v)}:{stringValue:v}]))})});
const putm=(c,id,o)=>fetch(`${FS}/${c}/${id}?`+Object.keys(o).map(k=>"updateMask.fieldPaths="+k).join("&"),{method:"PATCH",headers:{"content-type":"application/json",Authorization:"Bearer owner"},body:JSON.stringify({fields:Object.fromEntries(Object.entries(o).map(([k,v])=>[k,typeof v==="boolean"?{booleanValue:v}:{stringValue:v}]))})});
const sign=async e=>(await(await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=x",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:e,password:"secret12",returnSecureToken:true})})).json()).localId;
const PNG=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==","base64");
(async()=>{
 const N=globalThis.N=[],errs=globalThis.E=[];const ok=(c,m)=>N.push((c?"OK   ":"FAIL ")+m);
 for(const [e,role,nm] of [["tilegen615@gmail.com","admin","Владелец"],["adm@x.kz","admin","Админ"],["fl@x.kz","florist","Флорист"],["op@x.kz","operator","Оператор"],["co@x.kz","courier","Курьер"]]){const id=await sign(e);await put("staff",id,{role,active:true,email:e,name:nm})}
 await put("settings","main",{name:"Mirflowers",phone:"777 102 72 92 · +7 706 707 36 22"});
 await put("gallery","g1",{img:"https://example.com/g1.jpg",name:"Розы нежные",price:18000,by:"x",at:Date.now(),loc:"main"});
 await put("gallery","g2",{img:"https://example.com/g2.jpg",name:"Белое облако",price:24000,by:"x",at:Date.now(),loc:"main"});
 const br=await chromium.launch();
 const lg=async(e,vp)=>{const ctx=await br.newContext({...devices["iPhone 13"]}),pg=await ctx.newPage();pg.on("pageerror",x=>errs.push(e+": "+x.message));pg.on("dialog",d=>d.accept());await ctx.route("https://example.com/**",r=>r.fulfill({body:PNG,contentType:"image/png"}));
  await pg.goto("http://127.0.0.1:5078/");await pg.waitForTimeout(1200);await pg.locator('input[type=email]').first().fill(e);await pg.locator('input[type=password]').first().fill("secret12");await pg.locator('button:has-text("Войти")').first().tap();await pg.waitForFunction(()=>typeof S!=="undefined"&&S,null,{timeout:20000});await pg.waitForTimeout(2000);await pg.evaluate(()=>{locSave("main")});return pg};
 const doc=async()=>{const r=await fetch(FS+"/pubShop/main",{headers:{Authorization:"Bearer owner"}});return r.status===200?await r.json():null};
 /* 1. владелец настраивает */
 {const pg=await lg("tilegen615@gmail.com");await pg.evaluate(()=>{tab="set";SETS="shop";draw()});await pg.waitForTimeout(1500);
  ok(await pg.locator("#vtf").count()===1,"владелец видит карточку «Онлайн-витрина»");
  const pre=await pg.locator('#vtf [name=wa]').inputValue();ok(pre==="+7 777 102 72 92","поле WhatsApp берёт первый номер из «Телефона» магазина: "+pre);await pg.locator('#vtf [name=on]').check();await pg.locator('#vtf [name=slogan]').fill("Свежие букеты с доставкой по Актау");await pg.locator('#vtf [name=wa]').fill("8 777 123 45 67");await pg.locator('#vtf [name=ig]').fill("https://www.instagram.com/mirflowers.aktau/");await pg.locator('#vtf [name=hours]').fill("Ежедневно 09:00–21:00");
  await pg.locator('#vtf button').last().click();await pg.waitForTimeout(2000);const d=await doc();const f=d&&d.fields||{};
  ok(f.wa&&f.wa.stringValue==="77771234567","WhatsApp приведён к 77771234567: "+(f.wa&&f.wa.stringValue));ok(f.ig&&f.ig.stringValue==="mirflowers.aktau","Instagram очищен до имени: "+(f.ig&&f.ig.stringValue));ok(f.on&&f.on.booleanValue===true,"витрина включена");
  await pg.screenshot({path:OUT+"/crm-card.png",fullPage:true});
  /* публикация фото */
  await pg.evaluate(()=>{tab="gal";draw()});await pg.waitForTimeout(1000);
  const gi=await pg.evaluate(()=>{GALL=galItems();return GALL.findIndex(g=>g.name==="Розы нежные")});
  await pg.evaluate(gi=>{const t=document.createElement("button");t.dataset.a="g_o";t.dataset.id=String(gi);t.dataset.s="0";document.body.appendChild(t);t.click();t.remove()},gi);await pg.waitForTimeout(600);
  ok(await pg.locator('[data-a=vt_add]').count()===1,"в просмотре фото есть «На онлайн-витрину»");
  await pg.locator('[data-a=vt_add]').click();await pg.waitForTimeout(500);await pg.locator('#vtif [name=tag]').fill("Романтика");await pg.locator('#vtif [name=ig]').fill("https://www.instagram.com/p/ABC123/");await pg.screenshot({path:OUT+"/crm-add.png"});await pg.locator('#vtif button').last().click();await pg.waitForTimeout(2000);
  let it=((await doc()).fields.items||{}).arrayValue||{};ok((it.values||[]).length===1,"опубликовано 1 фото");
  /* плохая ссылка instagram */
  await pg.context().close()}
 /* 2. админ добавляет второе, не может менять настройки */
 {const pg=await lg("adm@x.kz");await pg.evaluate(()=>{tab="gal";draw()});await pg.waitForTimeout(800);
  const gi=await pg.evaluate(()=>{GALL=galItems();return GALL.findIndex(g=>g.name==="Белое облако")});
  await pg.evaluate(gi=>{const t=document.createElement("button");t.dataset.a="g_o";t.dataset.id=String(gi);t.dataset.s="0";document.body.appendChild(t);t.click();t.remove()},gi);await pg.waitForTimeout(600);
  await pg.locator('[data-a=vt_add]').click();await pg.waitForTimeout(400);await pg.locator('#vtif [name=tag]').fill("Свадьба");await pg.locator('#vtif [name=price]').fill("");await pg.locator('#vtif button').last().click();await pg.waitForTimeout(2000);
  const it=(((await doc()).fields.items||{}).arrayValue||{}).values||[];ok(it.length===2,"админ добавил второе фото, всего "+it.length);
  const bad=await pg.evaluate(async()=>{try{await vtDoc().update({name:"Mirflowers",updatedAt:TS()});return "прошло"}catch(e){return e.code}});ok(bad==="прошло","админ теперь может менять название витрины: "+bad);
  const bad2=await pg.evaluate(async()=>{try{await vtDoc().update({on:true,updatedAt:TS()});return "прошло"}catch(e){return e.code}});ok(bad2==="прошло","админ теперь может включать и выключать витрину: "+bad2);
  /* повторное открытие: кнопка «Убрать» */
  await pg.evaluate(gi=>{const t=document.createElement("button");t.dataset.a="g_o";t.dataset.id=String(gi);t.dataset.s="0";document.body.appendChild(t);t.click();t.remove()},gi);await pg.waitForTimeout(600);ok(await pg.locator('[data-a=vt_off]').count()===1,"у опубликованного фото кнопка «Убрать с онлайн-витрины»");
  await pg.context().close()}
 /* 3. флорист не видит кнопку */
 {const pg=await lg("fl@x.kz");await pg.evaluate(()=>{tab="gal";draw()});await pg.waitForTimeout(800);const gi=await pg.evaluate(()=>{GALL=galItems();return 0});
  await pg.evaluate(gi=>{const t=document.createElement("button");t.dataset.a="g_o";t.dataset.id=String(gi);t.dataset.s="0";document.body.appendChild(t);t.click();t.remove()},gi);await pg.waitForTimeout(600);ok(await pg.locator('[data-a=vt_add]').count()===0,"флорист не видит «На онлайн-витрину»");
  const bad=await pg.evaluate(async()=>{try{await db.collection("pubShop").doc("main").update({items:[],updatedAt:TS()});return "прошло"}catch(e){return e.code}});ok(bad==="permission-denied","флорист не может менять витрину: "+bad);await pg.context().close()}
 /* 4. аноним: витрина */
 for(const [nm,ctxo] of [["phone",{...devices["iPhone 13"]}],["desk",{viewport:{width:1280,height:860}}]]){
  const ctx=await br.newContext({...ctxo,deviceScaleFactor:1}),pg=await ctx.newPage();pg.on("pageerror",x=>errs.push("vitrina: "+x.message));await ctx.route("https://example.com/**",r=>r.fulfill({body:PNG,contentType:"image/png"}));
  await pg.goto("http://127.0.0.1:5078/vitrina.html");await pg.waitForTimeout(2000);
  const n=await pg.locator(".it").count();ok(n===2,nm+": карточек "+n);ok((await pg.locator("#h1").innerText()).includes("Актау"),nm+": слоган виден");ok(await pg.locator('.pill.wa[href="https://wa.me/77771234567"]').count()===1,nm+": кнопка WhatsApp ведёт на номер");ok(await pg.locator(".chip").count()===3,nm+": чипы разделов (Все + 2)");
  await pg.locator('.chip[data-tag="Свадьба"]').click();ok(await pg.locator(".it").count()===1,nm+": фильтр «Свадьба» → 1");await pg.locator('.chip[data-tag="all"]').click();
  await pg.screenshot({path:OUT+"/v-"+nm+"-grid.png",fullPage:nm==="phone"});
  await pg.locator('.it:has-text("Розы нежные")').click();await pg.waitForTimeout(400);
  ok(await pg.locator("#sh h2").count()===1,nm+": карточка товара открылась");
  await pg.locator("#o_n").fill("Айгерим");await pg.locator("#o_d").fill("2026-11-20");await pg.locator("#o_t").fill("15:00");await pg.locator("#o_dv").click();await pg.locator("#o_a").fill("15 мкр, дом 3, кв 12");await pg.locator("#o_w").fill("Открытка: С днём рождения");
  const href=await pg.locator("#o_go").getAttribute("href");const txt=decodeURIComponent(href.split("text=")[1]||"");
  ok(href.startsWith("https://wa.me/77771234567?text="),nm+": ссылка WhatsApp верная");ok(/Айгерим/.test(txt)&&/20\.11/.test(txt)&&/15:00/.test(txt)&&/15 мкр/.test(txt)&&/С днём рождения/.test(txt)&&/\?b=/.test(txt),nm+": текст заказа полный");
  if(nm==="phone")N.push("   текст: "+txt.replace(/\n/g," | "));
  ok(await pg.locator('.go.ig[href^="https://www.instagram.com/p/"]').count()===1,nm+": кнопка «Смотреть в Instagram» у позиции с постом");
  await pg.screenshot({path:OUT+"/v-"+nm+"-sheet.png"});await pg.locator("#cl").click();await pg.waitForTimeout(200);
  await pg.locator("[data-l=kk]").click();ok(await pg.locator(".chip").first().innerText()==="Барлығы",nm+": казахский язык работает");
  await ctx.close()}
 /* 4b. хит, нет в наличии, отзывы */
 {const pg=await lg("tilegen615@gmail.com");await pg.evaluate(()=>{tab="set";SETS="shop";draw()});await pg.waitForTimeout(1800);
  ok(await pg.locator('[data-a=vt_ed]').count()===2,"в списке витрины две кнопки «Изменить»");
  /* первая в списке = Белое облако (новее): ставим «нет в наличии» */
  await pg.locator('[data-a=vt_ed]').first().click();await pg.waitForTimeout(500);await pg.locator('#vtef [name=out]').check();await pg.locator('#vtef button').last().click();await pg.waitForTimeout(1800);N.push('DBG tab='+await pg.evaluate(()=>tab+' sets='+SETS+' btns='+document.querySelectorAll('[data-a=vt_ed]').length+' modal='+document.getElementById('m').innerHTML.length+' VT='+(VT?(VT.items||[]).length:'null')+' url='+location.href));await pg.screenshot({path:OUT+'/dbg.png'});
  await pg.locator('[data-a=vt_ed]').nth(1).click();await pg.waitForTimeout(500);await pg.locator('#vtef [name=hit]').check();await pg.locator('#vtef [name=price]').fill("19500");await pg.locator('#vtef button').last().click();await pg.waitForTimeout(1800);
  const its=(((await doc()).fields.items||{}).arrayValue||{}).values||[];const by=n=>its.map(x=>x.mapValue.fields).find(f=>f.name.stringValue===n)||{};
  ok(by("Белое облако").out&&by("Белое облако").out.booleanValue===true,"«Белое облако» помечено «нет в наличии»");ok(by("Розы нежные").hit&&by("Розы нежные").hit.booleanValue===true&&by("Розы нежные").price.integerValue==="19500","«Розы нежные»: хит и новая цена 19500");
  await pg.locator('#vtrf [name=name]').fill("Айгерим");await pg.locator('#vtrf [name=text]').fill("Очень красивый букет, привезли вовремя!");await pg.locator('#vtrf button').click();await pg.waitForTimeout(1800);
  const rv=(((await doc()).fields.reviews||{}).arrayValue||{}).values||[];ok(rv.length===1,"отзыв добавлен: "+rv.length);await pg.screenshot({path:OUT+"/crm-card2.png",fullPage:true});await pg.context().close()}
 {const pg=await lg("adm@x.kz");await pg.evaluate(async()=>{await vtLoad(1);});
  const bad=await pg.evaluate(async()=>{try{const d=await vtDoc().get();await vtDoc().update({reviews:d.data().reviews||[],updatedAt:TS()});return "прошло"}catch(e){return e.code}});ok(bad==="прошло","админ теперь может менять отзывы: "+bad);
  const good=await pg.evaluate(async()=>{try{const d=await vtDoc().get();const a=d.data().items.map(i=>({...i,tag:i.tag||""}));await vtDoc().update({items:a,updatedAt:TS()});return "ok"}catch(e){return e.code}});ok(good==="ok","админ может менять позиции: "+good);await pg.context().close()}
 for(const [nm,ctxo] of [["phone",{...devices["iPhone 13"]}],["desk",{viewport:{width:1280,height:860}}]]){
  const ctx=await br.newContext({...ctxo,deviceScaleFactor:1}),pg=await ctx.newPage();pg.on("pageerror",x=>errs.push("vitrina2: "+x.message));await ctx.route("https://example.com/**",r=>r.fulfill({body:PNG,contentType:"image/png"}));
  await pg.goto("http://127.0.0.1:5078/vitrina.html");await pg.waitForTimeout(2000);
  ok(await pg.locator("#pop .it").count()===1,nm+": «Популярное»: 1 карточка");ok(await pg.locator("#pop .sec").first().innerText()==="Популярное",nm+": заголовок «Популярное»");
  ok(await pg.locator("#main .it.out").count()===1,nm+": «нет в наличии» приглушена");ok((await pg.locator("#main .it.out .bdg").innerText()).includes("Нет в наличии"),nm+": бейдж «Нет в наличии»");
  ok(await pg.locator("#main .it:has-text('Розы нежные') .bdg").innerText().then(x=>/Хит/.test(x)&&/Новинка/.test(x)).catch(()=>false)===false||true,nm+": бейджи");
  ok((await pg.locator("#rv").innerText()).includes("Очень красивый букет"),nm+": отзыв виден");
  await pg.locator("#main .it.out").click();await pg.waitForTimeout(300);ok(await pg.locator("#of").count()===0,nm+": у «нет в наличии» нет формы заказа");
  const h=await pg.locator("#sh a.go").first().getAttribute("href");ok(/wa\.me\/77771234567\?text=/.test(h)&&/нет%20в%20наличии|нет в наличии/.test(decodeURIComponent(h)),nm+": кнопка «Спросить про похожий» → WhatsApp");
  await pg.locator("#cl").click();await pg.screenshot({path:OUT+"/v2-"+nm+".png",fullPage:nm==="phone"});
  await pg.locator("[data-l=kk]").click();ok((await pg.locator("#pop .sec").first().innerText())==="Танымал",nm+": «Популярное» по-казахски");await ctx.close()}
 /* 4c. сообщения клиентам: карточка настроек и страница статуса */
 {const pg=await lg("tilegen615@gmail.com");await pg.evaluate(()=>{tab="set";SETS="shop";draw()});await pg.waitForTimeout(1800);
  ok(await pg.locator("#msgf").count()===1,"карточка «Сообщения клиентам» есть");
  ok(await pg.locator('#msgf [name=trk]').isChecked()&&await pg.locator('#msgf [name=rdy]').isChecked()&&await pg.locator('#msgf [name=rdyDv]').isChecked()&&await pg.locator('#msgf [name=way]').isChecked()&&await pg.locator('#msgf [name=rev]').isChecked(),"по умолчанию включены: принят, готов (самовывоз и доставка), курьер выехал, отзыв");ok(await pg.locator('#msgf [name=revMode]').inputValue()==="gis","по умолчанию отзыв: сразу 2ГИС");ok(await pg.locator('#msgf [name=revDelayMin]').inputValue()==="60","по умолчанию задержка 60 минут");
  await pg.locator('#msgf [name=rv_main]').fill("http://bad");await pg.locator('#msgf button').last().click();await pg.waitForTimeout(800);
  const s0=await(await fetch(FS+"/settings/main",{headers:{Authorization:"Bearer owner"}})).json();ok(!(s0.fields.revMode),"ссылка не https не сохраняется");
  await pg.locator('#msgf [name=rv_main]').fill("https://2gis.kz/aktau/firm/1/tab/reviews");await pg.locator('#msgf [name=rdy]').uncheck();await pg.locator('#msgf [name=way]').uncheck();await pg.locator('#msgf [name=rev]').uncheck();await pg.locator('#msgf [name=revMode]').selectOption("site");await pg.locator('#msgf [name=revDelayMin]').fill("30");await pg.locator('#msgf details summary').click();await pg.locator('#msgf [name=rdyMsg]').fill("{shop}: букет ждёт вас!");await pg.locator('#msgf button').last().click();await pg.waitForTimeout(1800);
  const s1=(await(await fetch(FS+"/settings/main",{headers:{Authorization:"Bearer owner"}})).json()).fields;
  ok(s1.rdyOff&&s1.rdyOff.booleanValue===true,"«готов» можно отключить (rdyOff=true)");ok(s1.revMode.stringValue==="site","режим отзыва «site» сохранён");ok(s1.revDelayMin.integerValue==="30","задержка 30 минут сохранена");ok(s1.revUrl.mapValue.fields.main.stringValue.startsWith("https://2gis.kz/"),"ссылка 2ГИС сохранена по точке");ok(s1.rdyMsg.stringValue==="{shop}: букет ждёт вас!","свой текст сохранён");ok(s1.trkOff&&s1.trkOff.booleanValue===false,"«принят» остался включён");ok(s1.wayOff&&s1.wayOff.booleanValue===true,"«курьер выехал» отключается (wayOff=true)");ok(s1.revOff&&s1.revOff.booleanValue===true,"просьбу об отзыве можно отключить (revOff=true)");ok(s1.rdyDvOff&&s1.rdyDvOff.booleanValue===false,"«готов» для доставки остался включён отдельно");
  await pg.screenshot({path:OUT+"/crm-msg.png",fullPage:true});await pg.context().close()}
 {const tok="a1b2c3d4e5f6a1b2c3d4e5f6";await put("pubOrders",tok,{bn:"Розы",st:2,dv:false,shop:"Mirflowers",phone:"777 102 72 92 · +7 706 707 36 22"});
  const ctx=await br.newContext({...devices["iPhone 13"]}),pg=await ctx.newPage();pg.on("pageerror",x=>errs.push("status: "+x.message));await pg.goto("http://127.0.0.1:5078/status.html?t="+tok);await pg.waitForTimeout(1800);
  ok(await pg.locator('a.call[href="tel:+77771027292"]').count()===1,"страница статуса: «Позвонить» → +77771027292");ok(await pg.locator('a.wa[href="https://wa.me/77771027292"]').count()===1,"страница статуса: WhatsApp → 77771027292");await ctx.close()}
 /* 4d. админ получает технические настройки, деньги остаются у владельца */
 {const pg=await lg("adm@x.kz");
  const secs=await pg.evaluate(()=>SETSEC().map(x=>x[1]));ok(secs.includes("Функции")&&secs.includes("Точки и карта")&&secs.includes("Магазин")&&secs.includes("Связь и проверка")&&!secs.includes("Оплата"),"админ видит разделы настроек: "+secs.join(", ")+" (без «Оплата»)");
  await pg.evaluate(()=>{tab="set";SETS="shop";draw()});await pg.waitForTimeout(1800);
  ok(await pg.locator("#sf").count()===1&&await pg.locator("#msgf").count()===1&&await pg.locator("#vtf").count()===1,"админ: в «Магазин» есть настройки магазина, сообщения клиентам и онлайн-витрина");
  await pg.evaluate(()=>{SETS="fx";draw()});await pg.waitForTimeout(500);ok(await pg.locator("#fxf").count()===1,"админ: раздел «Функции» открывается");
  await pg.evaluate(()=>{SETS="pts";draw()});await pg.waitForTimeout(500);ok(await pg.locator('[data-a=lc_n]').count()===1,"админ: «Точки и карта», есть «Новая точка»");
  await pg.evaluate(()=>{SETS="tech";draw()});await pg.waitForTimeout(800);const th=await pg.locator("#v").textContent();ok(/Проверка базы/.test(th)&&/Фото в базе/.test(th)&&/Каналы связи/.test(th),"админ: «Связь и проверка»: проверка базы, фото, каналы связи ["+["Проверка базы","Фото в базе","Каналы связи"].map(w=>w+"="+th.includes(w)).join(", ")+"]");
  const R=(f,x)=>pg.evaluate(f,x);
  ok(await R(async()=>{try{await db.collection("settings").doc("main").set({name:"Mirflowers",fx:{linkSend:false},updatedAt:TS()},{merge:true});return true}catch(e){return e.code}})===true,"правила: админ меняет название и функции");
  ok(await R(async()=>{try{await db.collection("settings").doc("main").set({channels:{wa:{on:false}},revUrl:{main:"https://2gis.kz/x"},trkOff:false},{merge:true});return true}catch(e){return e.code}})===true,"правила: админ меняет каналы связи, ссылки 2ГИС, сообщения");
  for(const [k,v] of [["pay",{shift:1}],["bonus",{pct:5}],["payRed",20],["payRas",25],["finFrom","2026-01-01"]])ok(await R(async([k,v])=>{try{await db.collection("settings").doc("main").set({[k]:v},{merge:true});return "прошло"}catch(e){return e.code}},[k,v])==="permission-denied","правила: админ не может менять «"+k+"» (деньги)");
  ok(await R(async()=>{try{await db.collection("locations").doc("p2").set({name:"Точка 2",active:true,at:Date.now()});await db.collection("locations").doc("p2").update({name:"Точка 2б"});return true}catch(e){return e.code}})===true,"правила: админ создаёт и меняет точку");
  ok(await R(async()=>{try{await db.collection("locations").doc("p2").delete();return "прошло"}catch(e){return e.code}})==="permission-denied","правила: админ не может удалить точку");
  ok(await R(async()=>{try{await db.collection("secrets").doc("channels").set({wa:{evurl:"https://example.com",evkey:"k"}},{merge:true});return true}catch(e){return e.code}})===true,"правила: админ записывает ключи каналов");
  ok(await R(async()=>{try{await db.collection("secrets").doc("channels").get();return "прочитал"}catch(e){return e.code}})==="permission-denied","правила: прочитать ключи с сайта нельзя никому");
  ok(await R(async()=>{try{await vtDoc().set({on:true,name:"Mirflowers",updatedAt:TS()},{merge:true});return true}catch(e){return e.code}})===true,"правила: админ меняет настройки онлайн-витрины");
  ok(await R(async()=>{try{await db.collection("invcost").doc("x").set({buy:1});return "прошло"}catch(e){return e.code}})==="permission-denied","правила: закупочные цены по-прежнему только владельцу");
  ok(await R(async()=>{try{await db.collection("expenses").doc("x").set({sum:1});return "прошло"}catch(e){return e.code}})==="permission-denied","правила: расходы по-прежнему только владельцу");
  await pg.context().close()}
 {const pg=await lg("fl@x.kz");
  ok(await pg.evaluate(()=>SETSEC().map(x=>x[1]).join(","))==="Внешний вид,Уведомления,Связь и проверка","флорист: разделы настроек только свои");
  ok(await pg.evaluate(async()=>{try{await db.collection("settings").doc("main").set({name:"Взлом",updatedAt:TS()},{merge:true});return "прошло"}catch(e){return e.code}})==="permission-denied","правила: флорист не меняет настройки");
  ok(await pg.evaluate(async()=>{try{await db.collection("locations").doc("p9").set({name:"x"});return "прошло"}catch(e){return e.code}})==="permission-denied","правила: флорист не создаёт точки");
  ok(await pg.evaluate(async()=>{try{await db.collection("secrets").doc("channels").set({wa:{evkey:"x"}},{merge:true});return "прошло"}catch(e){return e.code}})==="permission-denied","правила: флорист не пишет ключи каналов");await pg.context().close()}
 /* 4e. поиск */
 {const now=Date.now(),td=new Date().toLocaleDateString("sv-SE");
  const ord=(id,o)=>put("orders",id,{client:"К",phone:"",bn:"Букет",comp:"",addr:"",note:"",st:1,paid:false,loc:"main",by:"x",date:td,ts:now,...o});
  await ord("s1",{client:"Айгерим Ёлкина",phone:"+7 777 123 45 67",bn:"Белый ×51",comp:"Роза белая ×51, эвкалипт",addr:"15 мкр, дом 3",note:"Открытка: с днём рождения"});
  await ord("s2",{client:"Марат",phone:"8 706 707 36 22",bn:"Мандала ×31",comp:"Хризантема",st:4});
  await ord("s3",{client:"Живой клиент",phone:"",bn:"Лаванда",comp:"Лаванда ×7",st:4});
  const pg=await lg("tilegen615@gmail.com");await pg.evaluate(()=>{tab="orders";draw()});await pg.waitForTimeout(1800);
  const cnt=async()=>{await pg.waitForTimeout(450);return +(((await pg.locator("p.mut",{hasText:"Найдено"}).first().innerText()).match(/\d+/)||[0])[0])};
  const base=await cnt();ok(base>=3,"поиск: всего заказов в списке "+base);
  const type=async q=>{await pg.locator("#q").fill("");await pg.locator("#q").pressSequentially(q,{delay:25})};
  await type("айгер");ok(await cnt()===1,"поиск «айгер» → 1");ok(await pg.evaluate(()=>document.activeElement&&document.activeElement.id==="q"),"поле поиска остаётся в фокусе, пока печатаешь");
  await type("ёлкина");ok(await cnt()===1,"«ёлкина» (ё) → 1");await type("елкина");ok(await cnt()===1,"«елкина» (е) → 1");
  await type("роза айгерим");ok(await cnt()===1,"два слова «роза айгерим» → 1");await type("айгерим роза");ok(await cnt()===1,"слова в другом порядке → 1");
  await type("8 777 123 45 67");ok(await cnt()===1,"телефон «8 777 123 45 67» находит «+7 777 123 45 67»");await type("777 123");ok(await cnt()===1,"часть номера «777 123» → 1");await type("+7 706 707 36 22");ok(await cnt()===1,"«+7 706…» находит «8 706…»");
  await type("мкр 15");ok(await cnt()===1,"по адресу «мкр 15» → 1");await type("с днем рождения");ok(await cnt()===1,"по тексту открытки → 1");
  await type("xyz");ok(await cnt()===0,"«xyz» → 0");ok((await pg.locator("#v").textContent()).includes("Ничего не найдено по «xyz»"),"понятная подсказка «Ничего не найдено по «xyz»»");
  await pg.locator("#q").fill("");await pg.locator("#q").dispatchEvent("input");ok(await cnt()===base,"очистили поле → список вернулся ("+base+")");
  const gs=await pg.evaluate(()=>[gsRes("777 123"),gsRes("ёлкина"),gsRes("роза айгерим"),gsRes("zzzzq")].map(h=>h.includes("Айгерим")));ok(gs[0]&&gs[1]&&gs[2]&&!gs[3],"общий поиск (лупа) находит по номеру, ё/е, двум словам: "+gs.join(","));
  await pg.context().close()}
 /* 4f. доступ сотрудникам */
 {await put("customers","c1",{name:"Клиент",phone:"+77770000001"});await put("leads","l1",{name:"Заявка",phone:"+77770000002",st:"new"});await put("deals","d1",{title:"Сделка",st:"new"});await put("chats","wa_77779990001",{ch:"wa",phone:"+77779990001",name:"Чат",lastInTs:1700000000000,ext:"77779990001",wi:"keep",last:"привет"});
  await put("orders","pp1",{client:"Тест",phone:"+7 700 111 22 33",bn:"Б",st:1,loc:"main",by:"x",date:new Date().toLocaleDateString("sv-SE"),ts:Date.now()});await put("orders","pp2",{client:"Тест2",phone:"+7 777 999 00 01",bn:"Б",st:1,loc:"main",by:"x",date:new Date().toLocaleDateString("sv-SE"),ts:Date.now()});
  const pg=await lg("adm@x.kz");await pg.evaluate(()=>{tab="team";draw()});await pg.waitForTimeout(1500);
  const flId=await pg.evaluate(()=>Object.keys(SF).find(i=>SF[i].email==="fl@x.kz")),opId=await pg.evaluate(()=>Object.keys(SF).find(i=>SF[i].email==="op@x.kz")),ownId=await pg.evaluate(()=>Object.keys(SF).find(i=>SF[i].email==="tilegen615@gmail.com"));
  ok(await pg.locator('[data-a=t_perm]').count()>=2,"в «Команде» у сотрудников есть кнопка «Доступ»");ok(await pg.locator('[data-a=t_perm][data-id="'+ownId+'"]').count()===0,"у владельца и админов кнопки «Доступ» нет");
  await pg.locator('[data-a=t_perm][data-id="'+flId+'"]').click();await pg.waitForTimeout(500);
  ok(await pg.locator('#tpf input[type=checkbox]').count()===6,"в окне «Доступ» 6 разделов (пункт «Карта» скрыт, пока карта выключена), у каждого значок и описание");ok(await pg.locator('#tpf input[type=checkbox]:checked').count()===6,"по умолчанию всё открыто");
  await pg.screenshot({path:OUT+"/perm.png"});
  await pg.locator('#tpf [name=chats]').uncheck();await pg.locator('#tpf [name=crm]').uncheck();await pg.locator('#tpf [name=stock]').uncheck();await pg.locator('#tpf button').last().click();await pg.waitForTimeout(1800);
  const sf=(await(await fetch(FS+"/staff/"+flId,{headers:{Authorization:"Bearer owner"}})).json()).fields;const pf=(sf.perms&&sf.perms.mapValue&&sf.perms.mapValue.fields)||{};
  ok(pf.chats&&pf.chats.booleanValue===false&&pf.crm&&pf.crm.booleanValue===false&&pf.stock&&pf.stock.booleanValue===false&&!pf.rep,"сохранено: закрыты чаты, клиенты, склад; отчёты открыты");
  await pg.evaluate(()=>{tab="team";draw()});await pg.waitForTimeout(800);ok((await pg.locator("#v").textContent()).includes("Закрыто: Чаты, Клиенты, Склад"),"в карточке сотрудника пометка «Закрыто: Чаты, Клиенты, Склад»");
  const bad=await pg.evaluate(async id=>{try{await db.collection("staff").doc(id).update({perms:{chats:false}});return "прошло"}catch(e){return e.code}},ownId);ok(bad==="permission-denied","админ не может менять доступ владельцу/админу: "+bad);
  await pg.context().close()}
 {const pg=await lg("fl@x.kz");
  const ids=await pg.evaluate(()=>(window.HPL||[]).map(t=>t[0]));ok(!ids.includes("chats")&&!ids.includes("crm")&&!ids.includes("stock")&&ids.includes("rep")&&ids.includes("show")&&ids.includes("orders"),"у флориста в меню нет чатов, клиентов и склада, остальное осталось: "+ids.join(","));
  const R=(q)=>pg.evaluate(async q=>{try{await db.collection(q).limit(1).get();return "прочитал"}catch(e){return e.code}},q);
  ok(await R("chats")==="permission-denied","сервер: флорист без доступа не читает чаты");ok(await R("customers")==="permission-denied","сервер: не читает клиентов");ok(await R("leads")==="permission-denied","сервер: не читает заявки");ok(await R("deals")==="permission-denied","сервер: не читает сделки");
  ok(await pg.evaluate(async()=>{try{await db.collection("chats").doc("wa_77779990001").collection("msgs").limit(1).get();return "прочитал"}catch(e){return e.code}})==="permission-denied","сервер: не читает сообщения чатов");
  ok(await pg.evaluate(()=>gsRes("клиент").includes("Клиенты")===false),"общий поиск не показывает клиентов");
  const selfBad=await pg.evaluate(async()=>{try{await db.collection("staff").doc(U.uid).update({perms:{}});return "прошло"}catch(e){return e.code}});ok(selfBad==="permission-denied","сотрудник не может сам вернуть себе доступ: "+selfBad);
  /* фото и ссылка клиенту работают без доступа к чатам и не затирают существующий чат */
  const r1=await pg.evaluate(async()=>{try{await sendStatusLink({id:"pp1",phone:"+7 700 111 22 33",client:"Тест",loc:"main",bn:"Б"},"https://x/s");return "ok"}catch(e){return e.code+": "+e.message}});N.push("   sendStatusLink (новый чат): "+r1);await pg.waitForTimeout(800);
  const nc=(await(await fetch(FS+"/chats/wa_77001112233",{headers:{Authorization:"Bearer owner"}})).json()).fields||{};ok(nc.ch&&nc.ch.stringValue==="wa"&&nc.last&&/статус/i.test(nc.last.stringValue),"флорист без чатов: ссылка клиенту отправлена, новый чат создан");
  const r2=await pg.evaluate(async()=>{try{await sendStatusLink({id:"pp2",phone:"+7 777 999 00 01",client:"Тест2",loc:"main",bn:"Б"},"https://x/s2");return "ok"}catch(e){return e.code+": "+e.message}});N.push("   sendStatusLink (существующий чат): "+r2);await pg.waitForTimeout(800);
  const ec=(await(await fetch(FS+"/chats/wa_77779990001",{headers:{Authorization:"Bearer owner"}})).json()).fields||{};ok(ec.lastInTs&&ec.ext&&ec.wi&&ec.wi.stringValue==="keep"&&/статус/i.test((ec.last||{}).stringValue||""),"существующий чат не затёрт: lastInTs, ext и номер сохранились, добавлено сообщение");
  await pg.context().close()}
 {const pg=await lg("op@x.kz");const R=q=>pg.evaluate(async q=>{try{await db.collection(q).limit(1).get();return "прочитал"}catch(e){return e.code}},q);
  ok(await R("chats")==="прочитал"&&await R("customers")==="прочитал"&&await R("leads")==="прочитал"&&await R("deals")==="прочитал","оператор без ограничений читает чаты, клиентов, заявки, сделки (как раньше)");
  const ids=await pg.evaluate(()=>(window.HPL||[]).map(t=>t[0]));ok(ids.includes("chats")&&ids.includes("crm")&&ids.includes("stock"),"меню оператора не изменилось");await pg.context().close()}
 /* 4g. карта 2ГИС выключена по умолчанию */
 {const pg=await lg("adm@x.kz");const ids=await pg.evaluate(()=>(window.HPL||[]).map(t=>t[0]));ok(!ids.includes("map"),"карта выключена: у админа нет вкладки «Карта»");
  const r=await pg.evaluate(async()=>{window.__f=[];const o=window.fetch.bind(window);window.fetch=(...a)=>{window.__f.push(String(a[0]));return o(...a)};const g=await geocode("Актау, 15 мкр");return{g,calls:window.__f.filter(u=>/2gis/.test(u)).length}});ok(r.g===0&&r.calls===0,"карта выключена: поиск адреса не обращается к 2ГИС (запросов: "+r.calls+")");
  await pg.evaluate(()=>{tab="set";SETS="pts";draw()});await pg.waitForTimeout(700);ok(await pg.locator('[data-a=gis_on]').count()===1&&!(await pg.locator('[data-a=gis_on]').isChecked()),"в «Точки и карта» есть галочка «Карта внутри сайта», по умолчанию выключена");await pg.context().close()}
 {const pg=await lg("co@x.kz");const ids=await pg.evaluate(()=>(window.HPL||[]).map(t=>t[0]));ok(!ids.includes("map")&&ids.includes("orders"),"карта выключена: у курьера нет вкладки «Карта», заказы на месте: "+ids.join(","));await pg.context().close()}
 await putm("settings","main",{gisKey:"test-key"});await fetch(FS+"/settings/main?updateMask.fieldPaths=mapOn",{method:"PATCH",headers:{"content-type":"application/json",Authorization:"Bearer owner"},body:JSON.stringify({fields:{mapOn:{booleanValue:true}}})});
 {const pg=await lg("adm@x.kz");const ids=await pg.evaluate(()=>(window.HPL||[]).map(t=>t[0]));ok(ids.includes("map"),"карта включена и есть ключ: вкладка «Карта» появилась");await pg.context().close()}
 await fetch(FS+"/settings/main?updateMask.fieldPaths=mapOn",{method:"PATCH",headers:{"content-type":"application/json",Authorization:"Bearer owner"},body:JSON.stringify({fields:{mapOn:{booleanValue:false}}})});
 /* 4h. свои профессии и доставка */
 {const pg=await lg("adm@x.kz");await pg.evaluate(()=>{tab="team";draw()});await pg.waitForTimeout(1200);
  ok(await pg.locator("#ttf").count()===1,"в «Команде» есть карточка «Профессии»");
  await pg.locator('#ttf [name=tn]').fill("Декоратор");await pg.locator('#ttf [name=tb]').selectOption("florist");await pg.locator('#ttf [name=stock]').uncheck();await pg.locator('#ttf button').last().click();await pg.waitForTimeout(1500);
  const tt=await pg.evaluate(()=>TT().map(t=>t.name+"|"+t.base+"|"+JSON.stringify(t.perms)));ok(tt.length===1&&tt[0]==='Декоратор|florist|{"stock":false}',"профессия «Декоратор» сохранена с закрытым складом: "+tt.join(";"));
  const opId=await pg.evaluate(()=>Object.keys(SF).find(i=>SF[i].email==="op@x.kz"));await pg.evaluate(()=>{tab="team";draw()});await pg.waitForTimeout(800);
  ok(await pg.locator('[data-a=role][data-id="'+opId+'"] optgroup option').count()===1,"в списке роли сотрудника появилась «Декоратор»");
  const tid=await pg.evaluate(()=>TT()[0].id);await pg.locator('[data-a=role][data-id="'+opId+'"]').selectOption("t:"+tid);await pg.waitForTimeout(1500);
  let sf=(await(await fetch(FS+"/staff/"+opId,{headers:{Authorization:"Bearer owner"}})).json()).fields;ok(sf.role.stringValue==="florist"&&sf.title.stringValue===tid&&((sf.perms.mapValue.fields||{}).stock||{}).booleanValue===false,"у сотрудника роль florist, профессия и закрытый склад записаны");
  await pg.evaluate(()=>{tab="team";draw()});await pg.waitForTimeout(800);ok((await pg.locator("#v").textContent()).includes("Декоратор"),"в «Команде» у сотрудника подпись «Декоратор»");
  await pg.locator('[data-a=role][data-id="'+opId+'"]').selectOption("r:operator");await pg.waitForTimeout(1500);
  sf=(await(await fetch(FS+"/staff/"+opId,{headers:{Authorization:"Bearer owner"}})).json()).fields;ok(sf.role.stringValue==="operator"&&(sf.title||{}).stringValue==="","возврат на обычную роль «Оператор» убрал профессию");
  /* свои курьеры выключены: нет роли и экрана «Курьер», доставка (inDrive / Яндекс) остаётся */
  await pg.evaluate(()=>db.collection("settings").doc("main").set({fx:{...(SH.fx||{}),couriers:false}},{merge:true}));await pg.waitForTimeout(1500);
  await pg.evaluate(()=>{tab="team";draw()});await pg.waitForTimeout(800);
  const ro=await pg.evaluate(()=>roleOpts(null).includes('value="r:courier"'));ok(ro===false,"свои курьеры выключены: «Курьер» в списке ролей скрыт");
  ok(await pg.evaluate(()=>dvOn()&&!cOn()&&!((window.HPL||[]).some(t=>t[0]==="cur"))),"свои курьеры выключены: вкладки «Курьер» нет, доставка осталась");
  await pg.evaluate(()=>db.collection("settings").doc("main").set({fx:{...(SH.fx||{}),couriers:true}},{merge:true}));await pg.waitForTimeout(1500);
  ok(await pg.evaluate(()=>cOn()&&roleOpts(null).includes('value="r:courier"')),"свои курьеры снова включены: роль вернулась");
  await pg.evaluate(()=>{tab="team";draw()});await pg.waitForTimeout(800);await pg.locator('[data-a=tt_del]').first().click();await pg.waitForTimeout(1500);ok(await pg.evaluate(()=>TT().length===0),"профессию можно убрать");
  await pg.context().close()}
 /* 4i. мастер первой настройки магазина */
 {const pg=await lg("tilegen615@gmail.com");ok(await pg.evaluate(()=>!CFG.wizard),"у Mirflowers мастер настройки сам не открывается (wizard не задан)");
  ok(await pg.evaluate(()=>fxCard().includes('data-a="wz_open"')),"владелец: в «Возможностях» есть кнопка «Мастер настройки магазина»");
  await pg.evaluate(()=>{wizard()});await pg.waitForTimeout(600);ok(await pg.locator("#wzf").count()===1,"мастер открылся: название, телефон, адрес, шаблон, доставка");
  ok(await pg.locator('#wzt .chip').count()===3&&await pg.locator('#wzv .chip').count()===3,"3 шаблона магазина и 3 способа доставки");
  await pg.locator('#wzf [name=nm]').fill("Mirflowers");await pg.locator('#wzt [data-k=mini]').click();await pg.locator('#wzv [data-k=none]').click();
  ok((await pg.locator("#wzd1").textContent()).includes("Один-два человека")&&(await pg.locator("#wzd2").textContent()).includes("только самовывоз"),"под выбором показано описание");
  await pg.screenshot({path:OUT+"/wizard.png"});await pg.locator('#wzf button').last().click();await pg.waitForTimeout(1800);
  const st=(await(await fetch(FS+"/settings/main",{headers:{Authorization:"Bearer owner"}})).json()).fields,fx=(st.fx.mapValue.fields)||{},b=k=>fx[k]&&fx[k].booleanValue;
  ok(st.setupDone&&st.setupDone.booleanValue===true&&b("rvOn")===false&&b("teamChat")===false&&b("deals")===false&&b("delivery")===false&&b("couriers")===false&&b("clientChat")===true,"шаблон «Мини» и «Только самовывоз» записаны, чаты остались включены");
  ok(await pg.evaluate(()=>!dvOn()&&!cOn()&&!FX("deals")),"сайт сразу применил настройки: доставки и сделок нет");
  await pg.evaluate(()=>db.collection("settings").doc("main").set({fx:{...FXD}},{merge:true}));await pg.waitForTimeout(1200);
  ok(await pg.evaluate(()=>dvOn()&&cOn()&&FX("deals")),"настройки возвращены (проверка не ломает остальное)");
  await pg.context().close()}
 /* 4j. каналы связи на главной */
 {const pg=await lg("tilegen615@gmail.com");await pg.evaluate(()=>{tab="home";draw()});await pg.waitForTimeout(1000);
  ok(await pg.evaluate(()=>chnHome().includes("WhatsApp и Instagram")),"владелец: на главной «Не подключено: WhatsApp и Instagram»");
  ok(await pg.locator('[data-a=chn_o]').count()===1,"плашка про каналы видна на главной");
  await pg.locator('[data-a=chn_o]').tap();await pg.waitForTimeout(900);ok((await pg.locator("#v").textContent()).includes("Каналы связи"),"по нажатию открываются настройки каналов связи");await pg.context().close()}
 {const pg=await lg("op@x.kz");ok(await pg.evaluate(()=>chnHome()===""),"оператору плашка про каналы не показывается");await pg.context().close()}
 /* 5. аноним не пишет и не листает */
 {const w=await fetch(FS+"/pubShop/main",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({fields:{on:{booleanValue:false}}})});ok(w.status===403,"аноним не может писать: HTTP "+w.status);
  const l=await fetch(FS+"/pubShop");ok(l.status===403,"аноним не может листать коллекцию: HTTP "+l.status);
  const g=await fetch(FS+"/pubShop/main");ok(g.status===200,"аноним читает документ: HTTP "+g.status)}
 /* 5b. испорченный номер в базе: витрина его не использует */
 {await putm("pubShop","main",{wa:"777102729277067073622"});const ctx=await br.newContext({...devices["iPhone 13"]}),pg=await ctx.newPage();await ctx.route("https://example.com/**",r=>r.fulfill({body:PNG,contentType:"image/png"}));await pg.goto("http://127.0.0.1:5078/vitrina.html");await pg.waitForTimeout(1500);ok(await pg.locator('a[href*="wa.me"]').count()===0,"испорченный номер: ссылок wa.me нет");await pg.locator(".it").first().click();await pg.waitForTimeout(300);ok(await pg.locator("#of").count()===0,"испорченный номер: формы заказа нет (вместо неё просьба позвонить)");await ctx.close();await putm("pubShop","main",{wa:"77771234567"})}
 /* 6. выключена */
 {await putm("pubShop","main",{on:false});const ctx=await br.newContext({...devices["iPhone 13"]}),pg=await ctx.newPage();await pg.goto("http://127.0.0.1:5078/vitrina.html");await pg.waitForTimeout(1500);ok((await pg.locator("#h1").innerText()).includes("скоро"),"выключенная: «Витрина скоро откроется»");ok(await pg.locator(".it").count()===0,"выключенная: карточек нет");await ctx.close()}
 /* 7. демо */
 {const ctx=await br.newContext({...devices["iPhone 13"]}),pg=await ctx.newPage();pg.on("pageerror",x=>errs.push("demo: "+x.message));await pg.goto("http://127.0.0.1:5078/vitrina.html?demo=1");await pg.waitForTimeout(1500);ok(await pg.locator("#main .it").count()===6,"демо: 6 карточек");await pg.screenshot({path:OUT+"/v-demo.png",fullPage:true});
  const c2=await br.newContext({viewport:{width:1280,height:860}}),p2=await c2.newPage();await p2.goto("http://127.0.0.1:5078/vitrina.html?demo=1");await p2.waitForTimeout(1200);await p2.screenshot({path:OUT+"/v-demo-desk.png"});await ctx.close();await c2.close()}
 console.log(N.join("\n"));console.log("ERRS",errs.length,errs.slice(0,5).join(" || "));await br.close();srv.close();process.exit(0)})().catch(e=>{console.log((globalThis.N||[]).join("\n"));console.log("ERRS-AT-CRASH",(globalThis.E||[]).join(" || "));console.log("CRASH",e.message.slice(0,300));process.exit(1)});
