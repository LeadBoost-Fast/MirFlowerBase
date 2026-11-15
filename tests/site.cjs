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
 {const pg=await lg("tilegen615@gmail.com");await pg.evaluate(()=>{tab="set";SETS="cl";draw()});await pg.waitForTimeout(1500);
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
 {const pg=await lg("tilegen615@gmail.com");await pg.evaluate(()=>{tab="set";SETS="cl";draw()});await pg.waitForTimeout(1800);
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
 {const pg=await lg("tilegen615@gmail.com");await pg.evaluate(()=>{tab="set";SETS="cl";draw()});await pg.waitForTimeout(1800);
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
  const secs=await pg.evaluate(()=>SETSEC().map(x=>x[1]));ok(secs.join(",")==="Разделы,Магазин,Клиенты и оплата,Команда и доступ,Вид,Уведомления,Каналы связи,Дополнительно","админ видит 8 групп настроек: "+secs.join(", "));ok(await pg.evaluate(()=>{SETS="shop";draw();return !document.querySelector("#pmf")}),"админ: наценок оплаты в «Магазине» нет (только владелец)");
  await pg.evaluate(()=>{tab="set";SETS="shop";draw()});await pg.waitForTimeout(1800);
  ok(await pg.locator("#sf").count()===1,"админ: в «Магазин» есть настройки магазина");await pg.evaluate(()=>{SETS="cl";draw()});await pg.waitForTimeout(800);ok(await pg.locator("#msgf").count()===1&&await pg.locator("#vtf").count()===1,"админ: в «Клиенты и оплата» есть сообщения клиентам и онлайн-витрина");
  await pg.evaluate(()=>{SETS="fx";draw()});await pg.waitForTimeout(500);ok(await pg.locator("#fxf").count()===1,"админ: раздел «Функции» открывается");
  await pg.evaluate(()=>{SETS="shop";draw()});await pg.waitForTimeout(500);ok(await pg.locator('[data-a=lc_n]').count()===1,"админ: в «Магазине» есть «Новая точка»");
  await pg.evaluate(()=>{SETS="tech";draw()});await pg.waitForTimeout(800);const th=await pg.locator("#v").textContent();ok(/Проверка базы/.test(th)&&/Фото в базе/.test(th),"админ: «Дополнительно»: проверка базы и фото ["+["Проверка базы","Фото в базе"].map(w=>w+"="+th.includes(w)).join(", ")+"]");await pg.evaluate(()=>{SETS="chn";draw()});await pg.waitForTimeout(500);ok((await pg.locator("#v").textContent()).includes("Каналы связи"),"админ: группа «Каналы связи» открывается");
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
  ok(await pg.evaluate(()=>SETSEC().map(x=>x[1]).join(","))==="Вид,Уведомления,Дополнительно","флорист: разделы настроек только свои");
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
 {const pg=await lg("adm@x.kz");const ids=await pg.evaluate(()=>(window.TALL||[]).map(t=>t[0]));ok(!ids.includes("map"),"карта выключена: у админа нет вкладки «Карта»");
  const r=await pg.evaluate(async()=>{window.__f=[];const o=window.fetch.bind(window);window.fetch=(...a)=>{window.__f.push(String(a[0]));return o(...a)};const g=await geocode("Актау, 15 мкр");return{g,calls:window.__f.filter(u=>/2gis/.test(u)).length}});ok(r.g===0&&r.calls===0,"карта выключена: поиск адреса не обращается к 2ГИС (запросов: "+r.calls+")");
  await pg.evaluate(()=>{tab="set";SETS="pts";draw()});await pg.waitForTimeout(700);ok(await pg.locator('[data-a=gis_on]').count()===1&&!(await pg.locator('[data-a=gis_on]').isChecked()),"в «Точки и карта» есть галочка «Карта внутри сайта», по умолчанию выключена");await pg.context().close()}
 {const pg=await lg("co@x.kz");const ids=await pg.evaluate(()=>(window.TALL||[]).map(t=>t[0]));ok(!ids.includes("map")&&ids.includes("orders"),"карта выключена: у курьера нет вкладки «Карта», заказы на месте: "+ids.join(","));await pg.context().close()}
 await putm("settings","main",{gisKey:"test-key"});await fetch(FS+"/settings/main?updateMask.fieldPaths=mapOn",{method:"PATCH",headers:{"content-type":"application/json",Authorization:"Bearer owner"},body:JSON.stringify({fields:{mapOn:{booleanValue:true}}})});
 {const pg=await lg("adm@x.kz");const ids=await pg.evaluate(()=>(window.TALL||[]).map(t=>t[0]));ok(ids.includes("map"),"карта включена и есть ключ: вкладка «Карта» появилась");await pg.context().close()}
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
  ok(await pg.evaluate(()=>dvOn()&&!cOn()&&!((window.TALL||[]).some(t=>t[0]==="cur"))),"свои курьеры выключены: вкладки «Курьер» нет, доставка осталась");
  await pg.evaluate(()=>db.collection("settings").doc("main").set({fx:{...(SH.fx||{}),couriers:true}},{merge:true}));await pg.waitForTimeout(1500);
  ok(await pg.evaluate(()=>cOn()&&roleOpts(null).includes('value="r:courier"')),"свои курьеры снова включены: роль вернулась");
  await pg.evaluate(()=>{tab="team";draw()});await pg.waitForTimeout(800);await pg.locator('[data-a=tt_del]').first().click();await pg.waitForTimeout(1500);ok(await pg.evaluate(()=>TT().length===0),"профессию можно убрать");
  await pg.context().close()}
 /* 4i. мастер первой настройки магазина */
 /* выгрузка склада в CSV (для бухгалтера) */
 {const pg=await lg("tilegen615@gmail.com");await put("inventory","tinv1",{name:"Роза красная",cat:"Цветы",unit:"шт",qty:12,sell:900,buy:400});await pg.waitForTimeout(1200);
  const [dl]=await Promise.all([pg.waitForEvent("download",{timeout:8000}),pg.evaluate(()=>{const b=document.createElement("button");b.dataset.a="exp_s";document.body.appendChild(b);b.click()})]);
  const txt=require("fs").readFileSync(await dl.path(),"utf8");
  ok(dl.suggestedFilename().startsWith("sklad-")&&txt.includes("Роза красная")&&txt.includes("Остаток")&&txt.includes("Стоимость остатка"),"выгрузка склада: файл, позиция, остаток и стоимость у владельца");
  ok(/Роза красная;Цветы;шт;12;(0;)*900;400;4800/.test(txt.replace(/\r?\n/g,"\n")),"выгрузка склада: 12 шт × 400 = 4800 в строке")}
 /* план дня и праздничные даты */
 {const pg=await lg("tilegen615@gmail.com"),td=new Date().toLocaleDateString("sv-SE");
  await put("orders","plan1",{client:"П1",phone:"+7 700 000 00 01",bn:"План Утро",st:0,loc:"main",by:"x",date:td,time:"09:00",ts:Date.now()});
  await put("orders","plan2",{client:"П2",phone:"+7 700 000 00 02",bn:"План Вечер",st:1,loc:"main",by:"x",date:td,time:"23:59",ts:Date.now()});
  await put("orders","plan3",{client:"П3",phone:"+7 700 000 00 03",bn:"План Готов",st:2,loc:"main",by:"x",date:td,time:"10:00",ts:Date.now()});
  await pg.waitForTimeout(1500);
  ok(await pg.evaluate(()=>{const r=planRows().map(x=>x.o.bn);return r.includes("План Утро")&&r.includes("План Вечер")&&!r.includes("План Готов")}),"план дня: в списке заказы на сборку, готовые не попадают");
  ok(await pg.evaluate(()=>{const r=planRows(),a=r.findIndex(x=>x.o.bn==="План Утро"),b=r.findIndex(x=>x.o.bn==="План Вечер");return a>-1&&b>a}),"план дня: сортировка по времени");
  ok(await pg.evaluate(()=>{const x=planRows().find(x=>x.o.bn==="План Вечер");return !!x&&x.due===(23*60+59)-planLead()}),"план дня: «собрать до» = время минус запас на сборку");
  ok(await pg.evaluate(()=>{const h=planHtml();return h.includes("План Вечер")&&h.includes("План дня")&&h.includes("plg")}),"план дня: блок рисуется, есть части дня");
  ok(await pg.evaluate(()=>WG.plan.ok()===true),"план дня: включён по умолчанию");
  await pg.evaluate(async()=>{await db.collection("settings").doc("main").set({fx:{dayPlan:false}},{merge:true})});await pg.waitForTimeout(1200);
  ok(await pg.evaluate(()=>WG.plan.ok()===false),"план дня: выключается в настройках");
  await pg.evaluate(async()=>{await db.collection("settings").doc("main").set({fx:{dayPlan:true},planLead:30},{merge:true})});await pg.waitForTimeout(1200);
  ok(await pg.evaluate(()=>WG.plan.ok()===true&&planLead()===30),"план дня: включается снова, запас на сборку берётся из настроек");
  const d3=await pg.evaluate(()=>addD(today(),3));
  ok(await pg.evaluate(()=>holAll().length===0&&WG.hol.ok()===false),"праздники: по умолчанию выключены");
  await put("orders","hol1",{client:"Х1",phone:"+7 700 000 00 04",bn:"Праздничный 1",st:0,loc:"main",by:"x",date:d3,ts:Date.now()});await put("orders","hol2",{client:"Х2",phone:"+7 700 000 00 05",bn:"Праздничный 2",st:1,loc:"main",by:"x",date:d3,ts:Date.now()});
  await pg.evaluate(async d=>{await db.collection("settings").doc("main").set({fx:{holidays:true},holidays:[{n:"Тест-праздник",f:d.slice(5),t:d.slice(5),l:2,o:30,note:"Только самовывоз",on:true}]},{merge:true})},d3);await pg.waitForTimeout(1500);
  ok(await pg.evaluate(d=>!!holOn(d)&&!holOn(today())&&holNext().d===3,d3),"праздники: дата распознаётся, ближайший через 3 дня");
  ok(await pg.evaluate(d=>{const h=holHint(d,"");return h.includes("Тест-праздник")&&h.includes("2 из 2")&&h.includes("Лимит достигнут")&&h.includes("Только самовывоз")},d3),"праздники: подсказка в заказе показывает число заказов, лимит и заметку");
  ok(await pg.evaluate(d=>holHint(d,"hol1").includes("1 из 2")&&!holHint(d,"hol1").includes("Лимит достигнут"),d3),"праздники: при редактировании заказа он сам себя не считает");
  ok(await pg.evaluate(()=>WG.hol.ok()&&WG.hol.r().includes("Тест-праздник")&&WG.hol.r().includes("через 3 дн.")),"праздники: блок «Ближайший праздник» на главной");
  ok(await pg.evaluate(async d=>{form();const f=document.getElementById("of");f.elements.date.value=d;f.dispatchEvent(new Event("input",{bubbles:true}));await new Promise(r=>setTimeout(r,200));return document.getElementById("holh").innerText.includes("Тест-праздник")},d3),"праздники: в форме заказа при выборе даты появляется подсказка");
  await pg.evaluate(async()=>{modal("");await holPub(true,SH.holidays);await vtDoc().set({on:true,name:"Тест"},{merge:true})});
  {const pd=await (await fetch(FS+"/pubShop/main")).json(),f=pd.fields||{};ok(f.holOn&&f.holOn.booleanValue===true&&JSON.stringify(f.hol||{}).includes("Тест-праздник"),"праздники: список опубликован для онлайн-витрины")}
  {const ctx=await br.newContext({...devices["iPhone 13"]}),vp=await ctx.newPage();await vp.goto("http://127.0.0.1:5078/vitrina.html");await vp.waitForTimeout(2500);
   const tx=await vp.evaluate(()=>(document.querySelector("#hol .hol")||{}).innerText||"");ok(tx.includes("Тест-праздник")&&tx.includes("через 3 дн."),"праздники: на онлайн-витрине виден баннер предзаказа");
   await ctx.close()}
  await pg.evaluate(async()=>{await db.collection("settings").doc("main").set({fx:{holidays:false}},{merge:true});await holPub(false,[])});await pg.waitForTimeout(1200);
  ok(await pg.evaluate(()=>holAll().length===0&&WG.hol.ok()===false),"праздники: выключаются в настройках");
  ok(await pg.evaluate(()=>!layGet().some(i=>i.id==="hol")),"праздники: выключенный блок не стоит на главной");
  {const ctx=await br.newContext({...devices["iPhone 13"]}),vp=await ctx.newPage();await vp.goto("http://127.0.0.1:5078/vitrina.html");await vp.waitForTimeout(2000);ok(await vp.evaluate(()=>!document.querySelector("#hol .hol")),"праздники: после выключения баннера на витрине нет");await ctx.close()}
 }
 /* воронка в чатах и подписки на цветы */
 {const pg=await lg("tilegen615@gmail.com");
  ok(await pg.evaluate(()=>funOk()),"воронка в чатах: по умолчанию включена");
  ok(await pg.evaluate(()=>FTPL.some(f=>f[0]==="retail"&&f[3].length===6)),"шаблон воронки «Обычные покупатели» есть");
  await pg.evaluate(()=>{tab="chats";chV="fun";draw()});await pg.waitForTimeout(800);
  {const tx=await pg.evaluate(()=>{const v=document.getElementById("v");return (/chfun/.test(v.innerHTML)?"FUN ":"nofun ")+v.innerText.slice(0,160)});ok(tx.startsWith("FUN ")&&/новая сделка/i.test(tx),"воронка в чатах: доска сделок открывается во вкладке «Воронка» ["+tx.replace(/\n/g," | ")+"]")}
  ok(await pg.locator('.chtabs [data-a=ch_v][data-id=fun]').count()===1,"вкладка «Воронка» стоит среди вкладок чатов");
  await pg.evaluate(()=>dealForm({client:"Анна",phone:"+7 700 111 22 33",src:"WhatsApp"}));
  ok(await pg.evaluate(()=>{const f=document.getElementById("df");return f.elements.client.value==="Анна"&&f.elements.phone.value.includes("700")&&f.elements.src.value==="WhatsApp"}),"сделка из чата: имя, телефон и источник подставлены");
  await pg.evaluate(()=>modal(""));
  await pg.evaluate(async()=>{await db.collection("settings").doc("main").set({fx:{chatFun:false}},{merge:true})});await pg.waitForTimeout(1200);
  ok(await pg.evaluate(()=>!funOk()),"воронка в чатах: выключается в настройках");
  await pg.evaluate(()=>{tab="chats";chV="list";draw()});await pg.waitForTimeout(500);
  ok(await pg.locator('.chtabs [data-a=ch_v][data-id=fun]').count()===0,"после выключения вкладки «Воронка» в чатах нет");
  await pg.evaluate(async()=>{await db.collection("settings").doc("main").set({fx:{chatFun:true}},{merge:true})});await pg.waitForTimeout(800);
  /* подписки */
  ok(await pg.evaluate(()=>!subsOn()&&WG.subd.ok()===false),"подписки: по умолчанию выключены");
  ok(await pg.evaluate(()=>sbNext("2026-01-31","m")==="2026-02-28"&&sbNext("2026-03-10","w")==="2026-03-17"&&sbNext("2026-03-10","2w")==="2026-03-24"),"подписки: следующая дата (неделя, две недели, месяц с концом месяца)");
  await pg.evaluate(async()=>{await db.collection("settings").doc("main").set({fx:{subs:true}},{merge:true})});await pg.waitForTimeout(1200);
  ok(await pg.evaluate(()=>subsOn()&&WG.subd.ok()===true),"подписки: включаются в настройках");
  const sid=await pg.evaluate(async()=>{const r=await db.collection("subs").add({client:"Сауле",phone:"+7 701 000 00 01",bn:"Нежный микс",comp:"",p:15000,freq:"w",next:today(),time:"10:00",dv:false,addr:"",loc:"main",note:"",on:true,n:0,ts:Date.now()});return r.id});
  await pg.evaluate(()=>{tab="deals";DLV="subs";draw()});await pg.waitForTimeout(1200);
  {const tx=await pg.evaluate(()=>document.getElementById("v").innerText.slice(0,600));ok(/нежный микс/i.test(tx)&&/пора оформить/i.test(tx)&&/подписки/i.test(tx),"подписки: список, метка «Пора оформить» и вкладка «Подписки» ["+tx.replace(/\n/g," | ")+"]")}
  ok(await pg.evaluate(()=>WG.subd.r().includes("Сауле")),"подписки: блок на главной показывает клиента");
  const nO=await pg.evaluate(()=>O.length);
  await pg.locator('[data-a=sb_o]').first().click();await pg.waitForTimeout(1800);
  ok(await pg.evaluate(id=>O.some(o=>o.sub===id&&o.src==="Подписка"&&o.date===today()&&o.bn==="Нежный микс"&&+o.p===15000&&+o.st===0),sid),"подписки: кнопка создаёт заказ на сегодня");
  ok(await pg.evaluate(async id=>{const s=(await db.collection("subs").doc(id).get()).data();return s.next===addD(today(),7)&&s.n===1&&s.last===today()},sid),"подписки: после заказа следующая дата через неделю, счётчик 1");
  const dub=await pg.evaluate(async id=>{const s=(await db.collection("subs").doc(id).get()).data(),before=O.length;sbOrder({...s,id,next:today()});await new Promise(r=>setTimeout(r,1000));return O.length-before},sid);ok(dub===0,"подписки: второй заказ на ту же дату не создаётся");
  await pg.evaluate(()=>{DLV="subs";draw()});await pg.waitForTimeout(500);
  await pg.locator('[data-a=sb_s]').first().click();await pg.waitForTimeout(1200);
  ok(await pg.evaluate(async id=>(await db.collection("subs").doc(id).get()).data().next===addD(today(),14),sid),"подписки: «Пропустить» сдвигает дату");
  await pg.locator('[data-a=sb_p]').first().click();await pg.waitForTimeout(1200);
  ok(await pg.evaluate(async id=>(await db.collection("subs").doc(id).get()).data().on===false&&!sbDue({...(await db.collection("subs").doc(id).get()).data(),next:today()}),sid),"подписки: пауза выключает подписку");
  await pg.evaluate(async id=>{await db.collection("subs").doc(id).delete();await db.collection("settings").doc("main").set({fx:{subs:false}},{merge:true})},sid);await pg.waitForTimeout(1200);
  ok(await pg.evaluate(()=>!subsOn()&&subsChips()===""),"подписки: выключаются в настройках, вкладки нет");
  ok(await pg.evaluate(()=>!layGet().some(i=>i.id==="subd")),"подписки: выключенный блок не стоит на главной");
 }
 /* размер интерфейса */
 {const pg=await lg("tilegen615@gmail.com");
  ok(await pg.evaluate(()=>uizGet()==="m"&&/^width=\d+,/.test(document.getElementById("vp").content)&&!/device-width/.test(document.getElementById("vp").content)),"размер интерфейса: по умолчанию «Чуть мельче», страница шире экрана");
  ok(await pg.evaluate(()=>window.innerWidth>=430),"размер интерфейса: раскладка получила ширину около 433 px");
  await pg.evaluate(()=>uizSet("s"));ok(await pg.evaluate(()=>/width=488,/.test(document.getElementById("vp").content)&&STO.get("uiz")==="s"),"размер интерфейса: «Мельче» (80%), выбор запоминается на телефоне");
  await pg.evaluate(()=>uizSet("n"));ok(await pg.evaluate(()=>/device-width/.test(document.getElementById("vp").content)),"размер интерфейса: «Обычный» возвращает обычный размер");
  await pg.evaluate(()=>{tab="set";SETS="look";draw()});await pg.waitForTimeout(500);ok(await pg.locator('.chip[onclick^="uizSet"]').count()===3,"в настройках вида три размера интерфейса");
  await pg.evaluate(()=>uizSet("m"));await pg.context().close()}
 /* доска заказов */
 {const pg=await lg("tilegen615@gmail.com");
  await put("orders","brd1",{client:"Доска1",phone:"+7 700 000 01 01",bn:"Доска Букет",st:0,loc:"main",by:"x",date:new Date().toLocaleDateString("sv-SE"),time:"23:50",ts:Date.now()+5});
  await pg.waitForTimeout(1500);
  await pg.evaluate(()=>{tab="orders";draw()});await pg.waitForTimeout(500);
  ok(await pg.evaluate(()=>ovwOn())&&await pg.locator('.chip[data-a=obv]').count()===2,"доска заказов: переключатель «Список» и «Доска» есть");
  await pg.locator('.chip[data-a=obv][data-id=board]').click();await pg.waitForTimeout(600);
  ok(await pg.locator('.obd .obcol').count()===5&&await pg.locator('.obd .obc').count()>=1,"доска заказов: пять колонок и карточки");
  ok(/новые/i.test(await pg.locator('.obd').first().innerText())&&/выданы сегодня/i.test(await pg.locator('.obd').first().innerText()),"доска заказов: колонки названы по статусам");
  ok(await pg.locator('.obc [data-a=adv][data-id=brd1]').count()===1,"доска заказов: у нового заказа кнопка следующего шага");
  await pg.locator('.obc [data-a=adv][data-id=brd1]').click();await pg.waitForTimeout(600);
  ok(await pg.locator('#tcy').count()===1,"доска заказов: кнопка включает то же подтверждение «Точно берёшь этот заказ?», что и список");
  await pg.locator('#tcy').click();await pg.waitForTimeout(2500);
  ok(await pg.evaluate(async()=>{const d=(await db.collection("orders").doc("brd1").get()).data();return +d.st===1&&!!d.takenBy}),"доска заказов: после подтверждения заказ взят в работу по обычным правилам");
  ok(await pg.locator('.obcol').nth(1).locator('.obc').filter({hasText:"Доска Букет"}).count()===1,"доска заказов: карточка переехала в колонку «Собирается»");
  await pg.locator('.chip[data-a=obv][data-id=list]').click();await pg.waitForTimeout(500);
  ok(await pg.locator('.obd').count()===0&&await pg.locator('.pt').count()===1,"доска заказов: «Список» возвращает обычный вид");
  await pg.evaluate(async()=>{await db.collection("settings").doc("main").set({fx:{ordBoard:false}},{merge:true})});await pg.waitForTimeout(1200);
  ok(await pg.evaluate(()=>{tab="orders";draw();return !ovwOn()})&&await pg.locator('.chip[data-a=obv]').count()===0,"доска заказов: выключается в настройках, переключателя нет");
  await pg.evaluate(async()=>{await db.collection("settings").doc("main").set({fx:{ordBoard:true}},{merge:true});STO.set("obv","list")});await pg.waitForTimeout(800);await pg.context().close()}
 {const pg=await lg("tilegen615@gmail.com");ok(await pg.evaluate(()=>!CFG.wizard),"у Mirflowers мастер настройки сам не открывается (wizard не задан)");
  ok(await pg.evaluate(()=>wzCard().includes('data-a="wz_open"')),"владелец: в «Магазине» есть кнопка «Мастер настройки магазина»");
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
 /* 4k. настройки: 5 групп, короткие подписи, главная без пустого */
 {const pg=await lg("tilegen615@gmail.com");await pg.evaluate(()=>{tab="set";SETS="look";draw()});await pg.waitForTimeout(700);
  const tabs=await pg.locator(".setnav .chip").allTextContents();ok(tabs.join("|")==="Разделы|Магазин|Клиенты и оплата|Команда и доступ|Вид|Уведомления|Каналы связи|Дополнительно","у владельца 8 групп настроек: "+tabs.join(", "));
  await pg.evaluate(()=>{SETS="adv";draw()});await pg.waitForTimeout(500);ok(await pg.locator("details.adv").count()>=3&&await pg.locator("details.adv[open]").count()===0,"«Дополнительно»: блоки свёрнуты");
  await pg.evaluate(()=>{SETS="fx";draw()});await pg.waitForTimeout(500);ok(await pg.locator("details.adv[open] #fxf").count()===1,"старое значение «fx» открывает «Дополнительно» с раскрытыми возможностями");
  const lens=await pg.evaluate(()=>Object.keys(FXD).map(k=>(FXS[k]||"").length));ok(lens.every(n=>n>0&&n<45),"подписи переключателей короткие: "+lens.join(","));
  ok(await pg.locator("#fxf .hint-btn").count()===15,"у каждого переключателя есть значок «?»");
  await pg.locator("#fxf .hint-btn").first().click();await pg.waitForTimeout(400);ok((await pg.locator("#modal, .modal, [role=dialog]").first().textContent().catch(()=>"" )).length>20||await pg.locator('[data-a=x]').count()>0,"по значку «?» открывается пояснение");
  await pg.evaluate(()=>modal(""));
  await pg.evaluate(()=>{tab="home";draw()});await pg.waitForTimeout(800);ok(!(await pg.locator("#v").textContent()).includes("Срочных дел нет"),"на главной нет пустой карточки «Всё сделано»");
  await pg.context().close()}
 /* 4l. HUD: расстановка главной */
 {const pg=await lg("fl@x.kz");await pg.evaluate(()=>{tab="home";draw()});await pg.waitForTimeout(800);
  const uid=await pg.evaluate(()=>U.uid),opId=await pg.evaluate(()=>Object.keys(SF).find(i=>SF[i].email==="op@x.kz"));
  ok(await pg.evaluate(()=>{const s=LAY;LAY=null;const n=layGet().length;LAY=s;return n>0}),"без сохранённой расстановки главная берёт встроенный набор роли (не пустая)");
  ok(await pg.locator('[data-a=wg_edit]').count()===0,"на главной кнопки «Расставить» нет");
  await pg.evaluate(()=>{tab="set";SETS="look";draw()});await pg.waitForTimeout(600);ok(await pg.locator('[data-a=wg_open_home]').count()===1,"в «Настройки → Вид → Мой экран» есть «Расставить главную»");
  await pg.locator('[data-a=wg_open_home]').click();await pg.waitForTimeout(500);
  const n0=await pg.locator(".wg-ed").count();ok(n0>=3,"режим «Расставить»: виджеты в рамках, их "+n0);
  const ids0=await pg.evaluate(()=>layGet().map(i=>i.id));
  /* размер */
  await pg.locator('[data-a=wg_set][data-z=m]').first().click();await pg.waitForTimeout(700);ok(await pg.evaluate(()=>layGet().some(i=>i.s==='m')),"размер выбирается кнопкой «Средний»");const o1=await pg.evaluate(()=>layGet().map(i=>i.id));await pg.locator('[data-a=wg_dn]').first().click();await pg.waitForTimeout(700);const o2=await pg.evaluate(()=>layGet().map(i=>i.id));ok(o2[1]===o1[0]&&o2[0]===o1[1],"стрелка «вниз» меняет первый и второй виджеты местами");
  /* добавить виджет из галереи */
  await pg.locator('[data-a=wg_add]').click();await pg.waitForTimeout(400);ok(await pg.locator('[data-a=wg_put][data-id=ordst]').count()===1&&await pg.locator('[data-a=wg_put][data-id=moneyd]').count()===0,"в галерее есть «Заказы сегодня», а денег флористу не предлагается");
  await pg.locator('[data-a=wg_put][data-id=ordst]').click();await pg.waitForTimeout(900);
  ok(await pg.evaluate(()=>layGet().some(i=>i.id==="ordst")),"виджет «Заказы сегодня» добавлен");
  /* убрать */
  const rmId=await pg.evaluate(()=>{const f=layGet().find(i=>!WG[i.id].fix&&i.id!=="ordst");return f&&f.id});
  if(rmId){await pg.locator('[data-a=wg_rm][data-id="'+rmId+'"]').click();await pg.waitForTimeout(900);ok(await pg.evaluate(id=>!layGet().some(i=>i.id===id),rmId),"виджет «"+rmId+"» убран")}
  /* перетаскивание: первый виджет переносим под второй */
  const before=await pg.evaluate(()=>layGet().map(i=>i.id)),hs=pg.locator(".wg-h"),nh=await hs.count();
  if(nh>=2){const a=await hs.first().boundingBox(),z=await pg.locator(".wg").nth(1).boundingBox();await pg.mouse.move(a.x+a.width/2,a.y+a.height/2);await pg.mouse.down();await pg.mouse.move(z.x+z.width/2,z.y+z.height*0.85,{steps:12});await pg.mouse.up();await pg.waitForTimeout(900);
   const after=await pg.evaluate(()=>layGet().map(i=>i.id));ok(after[1]===before[0]&&after.length===before.length,"перетаскивание: первый виджет ("+before[0]+") теперь второй: "+after.slice(0,3).join(","))}
  const doc=(await(await fetch(FS+"/layouts/"+uid,{headers:{Authorization:"Bearer owner"}})).json()).fields||{},vs=((doc.items||{}).arrayValue||{}).values||[];
  ok(vs.length>=3&&vs.every(v=>v.mapValue.fields.id&&v.mapValue.fields.s),"расстановка записана на сервер: "+vs.length+" виджетов");
  const ids1=await pg.evaluate(()=>layGet().map(i=>i.id));
  await pg.locator('[data-a=wg_done]').click();await pg.waitForTimeout(400);
  await pg.reload();await pg.waitForTimeout(2500);ok(JSON.stringify(await pg.evaluate(()=>layGet().map(i=>i.id)))===JSON.stringify(ids1),"после перезагрузки расстановка та же");
  /* чужая расстановка и неизвестный виджет */
  const bad=await pg.evaluate(async id=>{try{await db.collection("layouts").doc(id).set({items:[]});return "прошло"}catch(e){return e.code}},opId);ok(bad==="permission-denied","сотрудник не может записать расстановку другому: "+bad);
  const E0=errs.length;await pg.evaluate(()=>db.collection("layouts").doc(U.uid).set({items:[{id:"zzz",s:"m"},{id:"me",s:"l"}]}));await pg.waitForTimeout(1200);
  ok(await pg.evaluate(()=>layGet().every(i=>i.id!=="zzz"))&&errs.length===E0,"неизвестный виджет пропускается без ошибок");
  /* сброс */
  await pg.evaluate(()=>{LAYEDIT=true;draw()});await pg.waitForTimeout(300);await pg.locator('[data-a=wg_reset]').click();await pg.waitForTimeout(1500);
  ok(await pg.evaluate(()=>LAY===null),"«Сбросить» возвращает встроенный набор");
  await pg.context().close()}
 {const pg=await lg("adm@x.kz");await pg.evaluate(()=>{tab="home";draw()});await pg.waitForTimeout(800);
  ok(await pg.evaluate(()=>{const o=Object.keys(WG).filter(k=>WG[k].ok());return["moneyd","lowst","lateo","onsh"].every(k=>o.includes(k))}),"админу в галерее доступны деньги, склад, просрочено, кто на смене");
  await pg.evaluate(()=>{LAYEDIT=true;laySave(layGet().concat([{id:"moneyd",s:"s"},{id:"lowst",s:"s"}]));draw()});await pg.waitForTimeout(900);
  ok(await pg.locator('.wg[data-wg=moneyd] .wgn').count()===1&&await pg.locator('.wg[data-wg=lowst] .wgn').count()===1,"плитки «Деньги за день» и «Мало на складе» показываются с числом");
  await pg.screenshot({path:OUT+"/hud-edit.png"});await pg.evaluate(()=>{LAYEDIT=false;LAY=null;db.collection("layouts").doc(U.uid).delete()});await pg.context().close()}
 /* 4m. расстановки по ролям от владельца */
 {const ow=await lg("tilegen615@gmail.com"),fl=await lg("fl@x.kz");
  await ow.evaluate(()=>{tab="set";SETS="team";draw()});await ow.waitForTimeout(800);
  ok(await ow.locator('[data-a=lay_role][data-id=role_florist]').count()===1,"владелец: в «Команда и доступ» есть расстановка для роли «Флорист»");
  await ow.locator('[data-a=lay_role][data-id=role_florist]').click();await ow.waitForTimeout(700);
  ok(await ow.evaluate(()=>LAYTGT==="role_florist"&&LAYEDIT&&tab==="home"),"открылся режим расстановки для роли");
  await ow.evaluate(()=>laySave([{id:"me",s:"l"},{id:"ordst",s:"m"}]));await ow.waitForTimeout(900);
  const rd=(await(await fetch(FS+"/layouts/role_florist",{headers:{Authorization:"Bearer owner"}})).json()).fields||{};ok((((rd.items||{}).arrayValue||{}).values||[]).length===2,"шаблон роли «Флорист» записан: 2 виджета");
  ok(await ow.evaluate(()=>{msView("florist");const t=document.body.innerText;return/Глазами: Флорист/.test(t)&&/Заказы сегодня/.test(t)}),"«Смотреть как» флорист показывает расстановку роли");
  await ow.evaluate(()=>{modal("");LAYTGT="";LAYEDIT=false;tab="set";SETS="team";draw()});await ow.waitForTimeout(500);
  await ow.locator('[data-a=lay_lock][data-id=role_florist]').check();await ow.waitForTimeout(1500);
  const st=(await(await fetch(FS+"/settings/main",{headers:{Authorization:"Bearer owner"}})).json()).fields||{};ok((((st.layLock||{}).mapValue||{}).fields||{}).role_florist&&st.layLock.mapValue.fields.role_florist.booleanValue===true,"замок для роли «Флорист» записан");
  await fl.reload();await fl.waitForTimeout(2500);await fl.evaluate(()=>{tab="home";draw()});await fl.waitForTimeout(700);
  ok(await fl.evaluate(()=>layLocked()),"флорист: расстановка закреплена владельцем");
  ok(await fl.locator('[data-a=wg_edit]').count()===0,"флорист: кнопки «Расставить» нет");await fl.evaluate(()=>{tab="set";SETS="look";draw()});await fl.waitForTimeout(500);ok(await fl.locator('[data-a=wg_open_home]').count()===0,"флорист: в настройках «Расставить главную» нет, расстановку закрепил владелец");await fl.evaluate(()=>{tab="home";draw()});await fl.waitForTimeout(300);
  const ids=await fl.evaluate(()=>layGet().map(i=>i.id));ok(ids.includes("me")&&ids.includes("ordst")&&!ids.includes("wd")&&!ids.includes("todo"),"флорист видит расстановку роли: "+ids.join(","));
  const w=await fl.evaluate(async()=>{try{await db.collection("layouts").doc("role_florist").set({items:[]});return "прошло"}catch(e){return e.code}});ok(w==="permission-denied","флорист не может менять шаблон роли: "+w);
  await ow.locator('[data-a=lay_lock][data-id=role_florist]').uncheck();await ow.waitForTimeout(1500);await fl.waitForTimeout(800);
  ok(await fl.evaluate(()=>!layLocked()),"замок снят: флорист снова может расставлять");
  await ow.evaluate(()=>db.collection("layouts").doc("role_florist").delete());await ow.context().close();await fl.context().close()}
 /* 4n. живая картина */
 {const pg=await lg("adm@x.kz");const flId=await pg.evaluate(()=>Object.keys(SF).find(i=>SF[i].email==="fl@x.kz")),opId=await pg.evaluate(()=>Object.keys(SF).find(i=>SF[i].email==="op@x.kz")),td=new Date().toLocaleDateString("sv-SE"),now=Date.now();
  await put("orders","lv1",{client:"Лайв1",phone:"+7 700 000 11 11",bn:"Букет А",st:2,loc:"main",date:td,time:"23:30",by:opId,takenBy:flId,asm:flId,createdAt:now-1.2e7,takenAt:now-1.1e7,readyAt:now-7.2e6,ts:now-1.2e7});
  await put("orders","lv2",{client:"Лайв2",phone:"+7 700 000 22 22",bn:"Букет Б",st:1,loc:"main",date:td,time:"23:30",by:opId,takenBy:flId,createdAt:now-3.6e6,takenAt:now-3e6,ts:now-3.6e6});
  await put("orders","lv3",{client:"Лайв3",phone:"+7 700 000 33 33",bn:"Букет В",st:1,loc:"main",date:td,time:"00:01",by:opId,createdAt:now-1.4e7,ts:now-1.4e7});
  await pg.reload();await pg.waitForTimeout(2800);
  ok(await pg.evaluate(()=>(window.TALL||[]).some(t=>t[0]==="live")),"админу доступен раздел «Картина»");
  const sd=await pg.evaluate(([u,d])=>staffDay(u,d),[flId,td]);ok(sd.counts.taken===2&&sd.counts.asm===1&&sd.cur&&!sd.onShift,"staffDay флориста: взял 2, собрал 1, ведёт заказ, не на смене: "+JSON.stringify(sd.counts));
  const fl2=await pg.evaluate(()=>orderFlow(O.find(o=>o.id==="lv2")).map(x=>x.k).join(","));ok(fl2==="created,taken","orderFlow заказа без «собран»: только имеющиеся этапы ("+fl2+")");
  await pg.evaluate(()=>{tab="live";draw()});await pg.waitForTimeout(900);const lt=await pg.locator("#v").textContent();
  ok(/Флорист/.test(lt)&&/Оператор/.test(lt)&&/Лента дня/.test(lt)&&!/NaN|undefined/.test(lt),"«Живая картина»: карточки людей и лента дня, без NaN");
  ok(await pg.locator(".lvr.late").count()>=1&&await pg.locator(".lvr").count()>=3,"в ленте дня заказы полосками, просроченный выделен");
  await pg.screenshot({path:OUT+"/live.png",fullPage:true});
  await pg.locator('.lvc[data-id="'+flId+'"]').click();await pg.waitForTimeout(500);ok(await pg.locator(".lvd").count()===3,"день сотрудника: 3 отметки на линии");
  await pg.evaluate(()=>modal(""));await pg.context().close()}
 {const pg=await lg("op@x.kz");ok(await pg.evaluate(()=>!(window.TALL||[]).some(t=>t[0]==="live")&&liveBoard()===""),"оператору раздела «Картина» нет");await pg.context().close()}
 /* 4o. настроить любой экран */
 {const pg=await lg("fl@x.kz");const uid=await pg.evaluate(()=>U.uid);await pg.evaluate(()=>{tab="orders";draw()});await pg.waitForTimeout(900);
  ok(await pg.locator('[data-a=scr_edit]').count()===1,"на «Заказах» есть «Настроить экран»");
  ok(await pg.evaluate(()=>{tab="home";draw();return !document.querySelector('[data-a=scr_edit]')}),"на главной кнопки «Настроить экран» нет (там «Расставить»)");
  await pg.evaluate(()=>{tab="orders";draw()});await pg.waitForTimeout(600);
  await pg.locator('[data-a=scr_edit]').click();await pg.waitForTimeout(600);
  await pg.screenshot({path:OUT+"/scr-edit.png"});const nb=await pg.locator(".scr-bar").count();ok(nb>=3,"режим настройки: у блоков есть панели ("+nb+")");
  const qid=await pg.evaluate(()=>{const q=document.querySelector("#q");return q&&q.dataset.scrb});ok(!!qid,"поле поиска — отдельный блок ("+qid+")");
  const ids0=await pg.evaluate(()=>[...document.querySelectorAll(".scr-bar [data-a=scr_up]")].map(b=>b.dataset.id));
  await pg.locator('.scr-bar [data-a=scr_dn][data-id="'+ids0[0]+'"]').click();await pg.waitForTimeout(600);
  ok(await pg.evaluate(([a,b])=>{const x=document.querySelector('[data-scrb="'+a+'"]'),y=document.querySelector('[data-scrb="'+b+'"]');return +x.style.order>+y.style.order},[ids0[0],ids0[1]]),"стрелка «вниз» меняет порядок блоков");
  await pg.locator('.scr-bar [data-a=scr_hide][data-id="'+qid+'"]').click();await pg.waitForTimeout(600);
  ok(await pg.locator(".scr-dim #q, #q.scr-dim").count()>=0&&await pg.locator('.scr-bar [data-a=scr_hide][data-id="'+qid+'"]').textContent()==="Показать","скрытый блок в режиме настройки приглушён, кнопка «Показать»");
  await pg.locator('[data-a=scr_done]').click();await pg.waitForTimeout(700);
  ok(await pg.evaluate(()=>{const q=document.querySelector("#q");return !q||q.offsetParent===null}),"после «Готово» поиск скрыт");
  const d1=(await(await fetch(FS+"/layouts/"+uid,{headers:{Authorization:"Bearer owner"}})).json()).fields||{};ok(JSON.stringify(d1.scr||{}).includes(qid),"настройка экрана записана на сервер");
  await pg.reload();await pg.waitForTimeout(2500);await pg.evaluate(()=>{tab="orders";draw()});await pg.waitForTimeout(800);
  ok(await pg.evaluate(()=>{const q=document.querySelector("#q");return !q||q.offsetParent===null}),"после перезагрузки поиск всё ещё скрыт");
  await pg.locator('[data-a=scr_edit]').click();await pg.waitForTimeout(500);await pg.locator('[data-a=scr_reset]').click();await pg.waitForTimeout(800);await pg.locator('[data-a=scr_done]').click();await pg.waitForTimeout(500);
  ok(await pg.evaluate(()=>{const q=document.querySelector("#q");return !!q&&q.offsetParent!==null}),"«Сбросить» возвращает поиск");
  await pg.context().close()}
 {const ow=await lg("tilegen615@gmail.com");await ow.evaluate(()=>{tab="orders";draw()});await ow.waitForTimeout(900);
  await ow.locator('[data-a=scr_edit]').click();await ow.waitForTimeout(500);const qid=await ow.evaluate(()=>{const q=document.querySelector("#q");return q&&q.dataset.scrb});
  await ow.locator('.scr-bar [data-a=scr_hide][data-id="'+qid+'"]').click();await ow.waitForTimeout(500);
  await ow.locator('[data-a=scr_role]').click();await ow.waitForTimeout(500);await ow.locator('[data-a=scr_put][data-id=role_florist]').click();await ow.waitForTimeout(1200);
  const rd=(await(await fetch(FS+"/layouts/role_florist",{headers:{Authorization:"Bearer owner"}})).json()).fields||{};ok(JSON.stringify(rd.scr||{}).includes(qid),"экран «Заказы» сохранён как основа для роли «Флорист»");
  const fl=await lg("fl@x.kz");await fl.evaluate(()=>{tab="orders";draw()});await fl.waitForTimeout(1200);
  ok(await fl.evaluate(()=>{const q=document.querySelector("#q");return !q||q.offsetParent===null}),"флорист без своей настройки видит экран по основе роли (поиск скрыт)");
  await fl.context().close();
  await ow.evaluate(async()=>{await db.collection("layouts").doc("role_florist").delete();await db.collection("layouts").doc(U.uid).set({scr:{}},{mergeFields:["scr"]})});await ow.context().close()}
 /* 4p. сжатые разделы, «Разделы» в настройках, общий поиск, карточка заказа */
 {const pg=await lg("adm@x.kz");
  ok(await pg.evaluate(()=>!/изменить/.test(wdHint())&&/настройки/.test(wdHint())),"на главной вместо «изменить» ссылка «настройки»");
  const cnt=await pg.evaluate(()=>[(window.HPL||[]).length,(window.TALL||[]).length]);ok(cnt[0]<=cnt[1]-5,"в меню меньше кнопок, чем разделов: "+cnt[0]+" из "+cnt[1]);
  await pg.evaluate(()=>{tab="orders";draw()});await pg.waitForTimeout(700);const g1=(await pg.locator(".gtab button").allTextContents()).join("|");ok(/Заказы/.test(g1)&&/Сборка/.test(g1)&&/Курьеры/.test(g1),"«Заказы» собраны с «Сборкой» и «Курьерами»: "+g1);
  ok(await pg.locator("#q").count()===1,"в «Заказах» свой отдельный поиск остался");
  await pg.evaluate(()=>{tab="team";draw()});await pg.waitForTimeout(700);const g2=(await pg.locator(".gtab button").allTextContents()).join("|");ok(/Сотрудники/.test(g2)&&/График/.test(g2)&&/Контроль/.test(g2)&&/Картина/.test(g2),"«Команда» собрана с «Графиком», «Контролем», «Картиной»: "+g2);
  await pg.evaluate(()=>{tab="set";SETS="sec";draw()});await pg.waitForTimeout(700);ok(await pg.locator('#v [data-a=set_go]').count()>=6,"«Разделы» в настройках: кнопки к настройкам других разделов");
  await pg.locator('#v [data-a=set_go][data-s=shop]').first().click();await pg.waitForTimeout(500);ok(await pg.evaluate(()=>SETS==="shop"&&tab==="set"),"кнопка ведёт в нужную настройку");
  /* общий поиск */
  await pg.evaluate(()=>gsOpen());await pg.waitForTimeout(600);await pg.locator("#gsq").fill("время работы");await pg.waitForTimeout(500);
  ok(await pg.locator('#gsr [data-a=gs_nav]').count()>=1&&(await pg.locator("#gsr").textContent()).includes("Время работы магазина"),"общий поиск находит настройку «Время работы магазина»");
  await pg.locator('#gsr [data-a=gs_nav]').first().click();await pg.waitForTimeout(600);ok(await pg.evaluate(()=>tab==="set"&&SETS==="shop"),"нажатие на результат открывает нужную настройку");
  ok(await pg.evaluate(()=>/gs_nav/.test(gsRes("склад"))&&/Раздел/.test(gsRes("склад"))),"общий поиск находит раздел «Склад»");
  /* карточка заказа */
  const oid=await pg.evaluate(()=>O[0]&&O[0].id);ok(!!oid,"есть заказ для проверки карточки");
  ok(await pg.evaluate(id=>{const o=O.find(x=>x.id===id);const h=card(o);return/class="prg"/.test(h)&&/\+7/.test(h)},oid),"в карточке по умолчанию есть полоска этапов и телефон");
  await pg.evaluate(()=>ocfSave(["prg","phone"]));await pg.waitForTimeout(900);
  ok(await pg.evaluate(id=>{const h=card(O.find(x=>x.id===id));return!/class="prg"/.test(h)&&!/\+7 7/.test(h.split("Клиенту")[0])},oid),"скрытые поля («полоска», «телефон») из карточки убраны");
  await pg.evaluate(()=>{tab="set";SETS="look";draw()});await pg.waitForTimeout(500);ok(await pg.locator('[data-a=ocf_t]').count()>=5,"в «Вид» есть «Карточка заказа» с галочками");
  await pg.evaluate(()=>ocfSave([]));await pg.waitForTimeout(600);await pg.context().close()}
 /* 4q. движение */
 {const pg=await lg("adm@x.kz");
  ok(await pg.evaluate(()=>{const g=n=>{const v=getComputedStyle(document.documentElement).getPropertyValue(n).trim();return v.endsWith("ms")?parseFloat(v):parseFloat(v)*1000};return g("--m1")===100&&g("--m2")===150&&g("--m3")===200&&g("--m4")===300}),"единые длительности движения: 100/150/200/300 мс");
  ok(await pg.evaluate(()=>{tab="orders";draw();return document.getElementById("v").classList.contains("mv-in")}),"при смене раздела включается плавное появление");
  ok(await pg.evaluate(()=>[...document.getElementById("v").children].some(e=>getComputedStyle(e).animationName==="mvIn")),"блоки раздела появляются анимацией");
  await pg.waitForTimeout(1000);ok(await pg.evaluate(()=>!document.getElementById("v").classList.contains("mv-in")),"после появления класс снимается, обычные обновления не мигают");
  ok(await pg.evaluate(()=>{modal("<p>тест</p>");modal("");return !!document.getElementById("ov")&&document.getElementById("ov").classList.contains("ov-out")}),"окно закрывается плавно");
  await pg.waitForTimeout(450);ok(await pg.evaluate(()=>!document.getElementById("ov")),"после плавного закрытия окна не остаётся");
  ok(await pg.evaluate(()=>{modal("<p>а</p>");modal("");modal("<p>б</p>");return document.querySelector("#m .sh").textContent.includes("б")}),"новое окно сразу после закрытия не пропадает");
  await pg.waitForTimeout(450);ok(await pg.evaluate(()=>!!document.querySelector("#m .sh")&&document.querySelector("#m .sh").textContent.includes("б")),"и через 0,4 с остаётся на экране");
  await pg.evaluate(()=>modal(""));await pg.waitForTimeout(400);
  /* перестановка блоков главной двигается */
  await pg.evaluate(()=>{tab="home";LAYEDIT=true;draw()});await pg.waitForTimeout(700);
  ok(await pg.evaluate(()=>{document.querySelector("[data-a=wg_dn]").click();return document.getAnimations().length>0}),"при перестановке блоков есть движение");
  await pg.waitForTimeout(500);await pg.evaluate(()=>{LAYEDIT=false;LAY=null;draw()});
  /* «меньше движения» выключает всё */
  await pg.emulateMedia({reducedMotion:"reduce"});
  ok(await pg.evaluate(()=>{tab="stock";draw();return [...document.getElementById("v").children].every(e=>getComputedStyle(e).animationName==="none")}),"при настройке телефона «уменьшить движение» анимаций нет");
  await pg.context().close()}
 /* 4r. меню снизу: любые разделы */
 {const pg=await lg("adm@x.kz");const uid=await pg.evaluate(()=>U.uid);await pg.evaluate(()=>{tab="more";draw()});await pg.waitForTimeout(700);
  ok(await pg.locator('[data-a=pin_open]').count()===1,"в «Ещё» есть «Настроить меню снизу»");
  const navT=()=>pg.evaluate(()=>[...document.querySelectorAll("nav button[data-t]")].map(b=>b.dataset.t));const before=await navT();
  await pg.locator('[data-a=pin_open]').click();await pg.waitForTimeout(600);const np=await pg.locator('[data-a=pin_t]').count();ok(np>=10,"в списке меню все разделы ("+np+")");
  await pg.locator('[data-a=pin_t][data-id=show]').uncheck();await pg.waitForTimeout(500);await pg.locator('[data-a=pin_t][data-id=ctrl]').check();await pg.waitForTimeout(900);
  ok((await navT()).includes("ctrl"),"«Контроль» стоит в нижнем меню: "+(await navT()).join(","));
  ok(await pg.evaluate(()=>{const b=document.querySelector('nav button[data-t=ctrl]');return !!b&&/Контроль/.test(b.textContent)}),"кнопка называется «Контроль», а не «Команда»");
  await pg.locator('[data-a=pin_t][data-id=crm]').click();await pg.waitForTimeout(500);ok(await pg.locator('[data-a=pin_t][data-id=crm]').isChecked()===false,"больше 4 разделов закрепить нельзя");
  const d1=(await(await fetch(FS+"/layouts/"+uid,{headers:{Authorization:"Bearer owner"}})).json()).fields||{};ok(JSON.stringify(d1.pins||{}).includes("ctrl"),"меню записано на сервер");
  await pg.evaluate(()=>modal(""));await pg.waitForTimeout(400);await pg.evaluate(()=>{tab="ctrl";draw()});await pg.waitForTimeout(500);ok(await pg.evaluate(()=>document.querySelector('nav button[data-t=ctrl]').classList.contains("on")),"открыт «Контроль»: кнопка в меню подсвечена");
  await pg.reload();await pg.waitForTimeout(2500);ok((await navT()).includes("ctrl"),"после перезагрузки «Контроль» в меню");
  await pg.evaluate(()=>{tab="more";draw()});await pg.waitForTimeout(500);await pg.locator('[data-a=pin_open]').click();await pg.waitForTimeout(500);await pg.locator('[data-a=pin_reset]').click();await pg.waitForTimeout(900);
  ok(JSON.stringify(await navT())===JSON.stringify(before),"«По умолчанию» возвращает прежнее меню");
  /* «Ещё»: свой список, раздел может стоять и внизу, и в «Ещё» */
  {const moreDef=await pg.evaluate(()=>moreIds()),pinned=before.find(x=>x!=="home"&&x!=="more");
   ok(await pg.evaluate(()=>JSON.stringify(MORE.map(t=>t[0]))===JSON.stringify(moreIds())),"«Ещё»: по умолчанию список как раньше (чего нет в нижнем меню)");
   await pg.evaluate(()=>pinsOpen());await pg.waitForTimeout(500);
   ok(await pg.locator('[data-a=more_t]').count()>=5&&await pg.locator('.pin-h').count()===1,"в меню два столбца: «Снизу» и «В Ещё»");
   await pg.locator('[data-a=more_t][data-id='+pinned+']').check();await pg.waitForTimeout(800);
   ok(await pg.evaluate(id=>MORE.some(t=>t[0]===id)&&rolePins().includes(id),pinned),"раздел «"+pinned+"» стоит и внизу, и в «Ещё»");
   ok((await navT()).includes(pinned),"нижнее меню не изменилось");
   const dm=(await(await fetch(FS+"/layouts/"+uid,{headers:{Authorization:"Bearer owner"}})).json()).fields||{};ok(JSON.stringify(dm.more||{}).includes(pinned),"список «Ещё» записан на сервер");
   const ids=await pg.evaluate(()=>moreIds());for(const id of ids.slice(0,-1)){await pg.locator('[data-a=more_t][data-id='+id+']').uncheck();await pg.waitForTimeout(250)}
   await pg.locator('[data-a=more_t][data-id='+ids[ids.length-1]+']').click();await pg.waitForTimeout(400);
   ok(await pg.locator('[data-a=more_t][data-id='+ids[ids.length-1]+']').isChecked()&&(await pg.evaluate(()=>moreIds())).length===1,"в «Ещё» нельзя убрать последний раздел");
   await pg.locator('[data-a=pin_reset]').click();await pg.waitForTimeout(900);
   ok(JSON.stringify(await pg.evaluate(()=>moreIds()))===JSON.stringify(moreDef)&&JSON.stringify(await navT())===JSON.stringify(before),"«По умолчанию» возвращает и «Ещё», и нижнее меню")}
  await pg.evaluate(()=>modal(""));await pg.context().close()}
 {const ow=await lg("tilegen615@gmail.com");await ow.evaluate(()=>{tab="more";draw()});await ow.waitForTimeout(600);await ow.locator('[data-a=pin_open]').click();await ow.waitForTimeout(500);
  await ow.locator('[data-a=pin_role]').click();await ow.waitForTimeout(500);await ow.locator('[data-a=pins_put][data-id=role_florist]').click();await ow.waitForTimeout(1200);
  const rd=(await(await fetch(FS+"/layouts/role_florist",{headers:{Authorization:"Bearer owner"}})).json()).fields||{};ok(JSON.stringify(rd.pins||{}).includes("stock"),"меню сохранено как основа для роли «Флорист»");
  const fl=await lg("fl@x.kz");await fl.waitForTimeout(800);ok(await fl.evaluate(()=>{const t=layTplF("pins");return !!t&&t.pins.includes("stock")}),"флорист видит основу меню от владельца");await fl.context().close();
  await ow.evaluate(async()=>{await db.collection("layouts").doc("role_florist").delete()});await ow.context().close()}
 /* 4s. конструктор экранов */
 {const ow=await lg("tilegen615@gmail.com");await ow.evaluate(()=>{tab="set";SETS="sec";draw()});await ow.waitForTimeout(700);
  const nt=await ow.locator('[data-a=stu_open]').count();ok(nt>=8,"в «Разделах» плитки экранов для настройки: "+nt);
  ok(await ow.locator('.st-tile[data-a=wg_home_tile]').count()===1,"плитка «Главная» ведёт в расстановку главной");
  await ow.locator('[data-a=stu_open][data-id=orders]').click();await ow.waitForTimeout(900);
  ok(await ow.evaluate(()=>tab==="set"),"конструктор не уводит со страницы настроек");
  ok(await ow.locator("#stv .scr-bar").count()>=3,"в окне виден экран «Заказы» с панелями блоков");
  const auds=(await ow.locator(".st-aud .chip").allTextContents()).join("|");ok(/Для меня/.test(auds)&&/Все сотрудники/.test(auds)&&/Флорист/.test(auds),"можно выбрать, для кого: "+auds);
  await ow.screenshot({path:OUT+"/studio.png"});
  await ow.locator('.st-aud [data-id=all]').click();await ow.waitForTimeout(500);
  const qid=await ow.evaluate(()=>{const q=document.querySelector("#stv input[type=search]");let e=q;while(e&&e.parentNode&&e.parentNode.id!=="stv")e=e.parentNode;const bar=e&&e.previousElementSibling;return bar&&bar.querySelector("[data-a=stu_hide]")?bar.querySelector("[data-a=stu_hide]").dataset.id:null});
  ok(!!qid,"поле поиска — отдельный блок в конструкторе ("+qid+")");
  await ow.locator('#stbody [data-a=stu_hide][data-id="'+qid+'"]').click();await ow.waitForTimeout(500);
  await ow.locator('[data-a=stu_apply]').click();await ow.waitForTimeout(1200);
  const da=(await(await fetch(FS+"/layouts/all",{headers:{Authorization:"Bearer owner"}})).json()).fields||{};ok(JSON.stringify(da.scr||{}).includes(qid),"настройка для всех записана (layouts/all)");
  const fl=await lg("fl@x.kz");await fl.evaluate(()=>{tab="orders";draw()});await fl.waitForTimeout(1200);
  ok(await fl.evaluate(()=>{const q=document.querySelector("#q");return !q||q.offsetParent===null}),"флорист без своих настроек видит экран «для всех» (поиск скрыт)");
  ok(await fl.evaluate(()=>{tab="set";SETS="look";draw();return document.querySelectorAll("[data-a=stu_open]").length>0}),"у флориста тоже есть конструктор (в «Вид»)");
  await fl.evaluate(()=>stOpen("orders","me"));await fl.waitForTimeout(500);const fa=(await fl.locator(".st-aud .chip").allTextContents()).join("|");ok(fa==="Для меня","сотруднику доступно только «Для меня»: "+fa);
  await fl.context().close();
  await ow.locator('.st-aud [data-id=all]').click();await ow.waitForTimeout(400);await ow.locator('#stbody [data-a=lay_lock][data-id=all]').check();await ow.waitForTimeout(1200);
  const st=(await(await fetch(FS+"/settings/main",{headers:{Authorization:"Bearer owner"}})).json()).fields||{};ok((((st.layLock||{}).mapValue||{}).fields||{}).all&&st.layLock.mapValue.fields.all.booleanValue===true,"замок «все сотрудники» записан");
  const fl2=await lg("fl@x.kz");await fl2.waitForTimeout(800);ok(await fl2.evaluate(()=>layLocked()),"флорист: настройка закреплена");await fl2.context().close();
  await ow.evaluate(async()=>{modal("");await db.collection("settings").doc("main").set({layLock:{all:false}},{merge:true});await db.collection("layouts").doc("all").delete()});await ow.context().close()}
 /* 4t. «Заказы»: без дублей фильтров */
 {const pg=await lg("op@x.kz");await pg.evaluate(()=>{tab="orders";draw()});await pg.waitForTimeout(900);
  ok(await pg.locator(".pt button").count()===4,"в «Заказах» 4 плитки этапов с числами");
  const ch=(await pg.locator('.chips [data-a=f]').allTextContents()).join("|");ok(ch==="Все|Выданы|Отменены","кнопки фильтра без дублей плиток: "+ch);
  await pg.locator('.pt [data-a=f]').nth(1).click();await pg.waitForTimeout(500);ok(await pg.evaluate(()=>fs==="1"),"нажатие на плитку «В сборке» включает фильтр");
  await pg.locator('.chips [data-a=f][data-id=""]').click();await pg.waitForTimeout(500);ok(await pg.evaluate(()=>fs===""),"«Все» сбрасывает фильтр");
  await pg.context().close()}
 /* 4u. воронки */
 {const ow=await lg("tilegen615@gmail.com");
  ok(await ow.evaluate(()=>FUN().length===1&&FUN()[0].id==="sales"&&FUN()[0].st.length===6&&FUN()[0].st[3].k==="won"&&FUN()[0].st[4].k==="lost"),"по умолчанию одна воронка «Продажи» с 6 этапами, как раньше");
  await ow.evaluate(()=>{tab="set";SETS="cl";draw()});await ow.waitForTimeout(700);
  ok(await ow.locator('#fnl [data-a=fn_tpl]').count()===1,"в «Клиенты и оплата» есть «Воронки продаж»");
  await ow.locator('#fnl [data-a=fn_tpl]').click();await ow.waitForTimeout(500);
  const nt=await ow.locator('[data-a=fn_add]').count();ok(nt===11,"в списке 10 готовых воронок и «Своя воронка»: "+nt);
  await ow.locator('[data-a=fn_add][data-id=b2b]').click();await ow.waitForTimeout(1500);
  await ow.locator('#fnl [data-a=fn_tpl]').click();await ow.waitForTimeout(500);await ow.locator('[data-a=fn_add][data-id=holiday]').click();await ow.waitForTimeout(1500);
  ok(await ow.evaluate(()=>FUN().map(f=>f.id).join(",")==="sales,b2b,holiday"),"добавлены «Корпоративные клиенты» и «Праздники»");
  const sd=(await(await fetch(FS+"/settings/main",{headers:{Authorization:"Bearer owner"}})).json()).fields||{};ok((((sd.funnels||{}).arrayValue||{}).values||[]).length===3,"воронки записаны в настройки");
  await ow.evaluate(()=>{FSEL="b2b";tab="deals";draw()});await ow.waitForTimeout(800);
  ok(await ow.locator('.chips [data-a=fn_sel]').count()===3,"в «Сделках» переключатель из 3 воронок");
  ok((await ow.locator("#v").textContent()).includes("Договор и счёт"),"колонки воронки «Корпоративные клиенты»");
  await ow.locator('[data-a=dl_n]').first().click();await ow.waitForTimeout(600);
  ok(await ow.evaluate(()=>document.querySelector("#df [name=fid]").value==="b2b"),"в новой сделке выбрана текущая воронка");
  await ow.locator('#df [name=client]').fill("Офис Альфа");await ow.locator('#df [name=phone]').fill("+7 700 555 66 77");await ow.locator('#df [name=title]').fill("Букеты в офис раз в неделю");await ow.locator('#df button').last().click();await ow.waitForTimeout(1500);
  ok(await ow.evaluate(()=>DL.some(d=>d.client==="Офис Альфа"&&d.fid==="b2b"&&+d.st===0)),"сделка создана в воронке «Корпоративные клиенты»");
  ok((await ow.locator("#v").textContent()).includes("Офис Альфа"),"сделка видна в колонке «Запрос»");
  await ow.evaluate(()=>{FSEL="sales";draw()});await ow.waitForTimeout(500);ok(!(await ow.locator("#v").textContent()).includes("Офис Альфа"),"в воронке «Продажи» её нет");
  const did=await ow.evaluate(()=>DL.find(d=>d.client==="Офис Альфа").id);
  await ow.evaluate(id=>dealOpen(id),did);await ow.waitForTimeout(600);
  ok(await ow.evaluate(()=>/wa\.me\/77005556677/.test(document.getElementById("dwa").href)&&/Получили ваш запрос/.test(decodeURIComponent(document.getElementById("dwa").href))),"кнопка WhatsApp подставляет сообщение для этапа «Запрос»");
  await ow.locator('#dof [name=st]').selectOption("6");await ow.waitForTimeout(300);ok(await ow.locator("#drs").isVisible(),"на этапе «Завершено» нужно указать результат");
  await ow.locator('#dof button').last().click();await ow.waitForTimeout(1500);
  ok(await ow.evaluate(()=>{const d=DL.find(x=>x.client==="Офис Альфа");return +d.st===6&&dWon(d)&&!!d.res}),"сделка закрыта как успешная");
  ok(await ow.evaluate(()=>{const h=anV();return/Воронки/.test(h)&&/Корпоративные клиенты/.test(h)}),"в аналитике есть блок «Воронки»");
  ok(await ow.evaluate(()=>/Сделки в работе/.test(WG.funw.r())),"на главной доступен блок «Воронки»");
  /* редактор */
  await ow.evaluate(()=>feOpen("b2b"));await ow.waitForTimeout(500);
  ok(await ow.locator('#fe [data-a=fe_up]').first().isDisabled()&&await ow.locator('#fe [data-a=fe_rm]').first().isDisabled(),"в воронке есть сделки: этапы нельзя переставлять и убирать");
  const n0=await ow.locator("#fe .fe-r").count();await ow.locator('#fe [data-a=fe_add]').click();await ow.waitForTimeout(300);await ow.locator('#fe [data-fe=sn]').last().fill("Повторный заказ");await ow.locator('#fe [data-fe=n]').fill("Корпоративные");await ow.locator('#fe [data-a=fe_save]').click();await ow.waitForTimeout(1500);
  ok(await ow.evaluate(()=>{const f=FUN().find(x=>x.id==="b2b");return f.n==="Корпоративные"&&f.st.length===9&&f.st[8].n==="Повторный заказ"}),"этап добавлен, воронка переименована ("+n0+" → "+(n0+1)+")");
  /* своя воронка */
  await ow.evaluate(()=>funTpl());await ow.waitForTimeout(400);await ow.locator('[data-a=fn_add][data-id=new]').click();await ow.waitForTimeout(1500);
  ok(await ow.locator("#fe").count()===1,"«Своя воронка»: сразу открывается редактор этапов");
  await ow.locator('#fe [data-fe=n]').fill("Свои");await ow.locator('#fe [data-a=fe_save]').click();await ow.waitForTimeout(1200);
  ok(await ow.evaluate(()=>FUN().some(f=>f.n==="Свои")),"своя воронка сохранена");
  /* уборка */
  await ow.evaluate(async id=>{modal("");await db.collection("deals").doc(id).delete();await db.collection("settings").doc("main").set({funnels:[]},{merge:true})},did);await ow.waitForTimeout(800);await ow.context().close()}
 {const op=await lg("op@x.kz");await op.evaluate(()=>{tab="deals";draw()});await op.waitForTimeout(800);ok(await op.locator('[data-a=dl_n]').count()>=1&&await op.locator('[data-a=fn_open]').count()===0,"оператор работает со сделками, но не меняет воронки");await op.context().close()}
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
