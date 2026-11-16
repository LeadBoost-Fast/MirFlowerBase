// Снимки каждой страницы для PDF-инструкций с фото. Запуск (эмуляторы как для site.cjs): OUTP=/папка node tests/instr-photos.cjs, затем PHOTOS=/папка node tools/make-instr-photo.cjs
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
 for(const [e,role,nm] of [["tilegen615@gmail.com","admin","Владелец"],["adm@x.kz","admin","Админ"],["fl@x.kz","florist","Флорист"],["op@x.kz","operator","Оператор"],["co@x.kz","courier","Курьер"],["as@x.kz","assistant","Помощник"]]){const id=await sign(e);await put("staff",id,{role,active:true,email:e,name:nm})}
 await put("settings","main",{name:"Mirflowers",phone:"777 102 72 92 · +7 706 707 36 22"});
 await put("gallery","g1",{img:"https://example.com/g1.jpg",name:"Розы нежные",price:18000,by:"x",at:Date.now(),loc:"main"});
 await put("gallery","g2",{img:"https://example.com/g2.jpg",name:"Белое облако",price:24000,by:"x",at:Date.now(),loc:"main"});
 const br=await chromium.launch();
 const lg=async(e,vp)=>{const ctx=await br.newContext({...(vp||devices["iPhone 13"]),deviceScaleFactor:2}),pg=await ctx.newPage();pg.on("pageerror",x=>errs.push(e+": "+x.message));pg.on("dialog",d=>d.accept());await ctx.route("https://example.com/**",r=>r.fulfill({body:PNG,contentType:"image/png"}));
  await pg.goto("http://127.0.0.1:5078/");await pg.waitForTimeout(1200);await pg.locator('input[type=email]').first().fill(e);await pg.locator('input[type=password]').first().fill("secret12");await pg.locator('button:has-text("Войти")').first().tap();await pg.waitForFunction(()=>typeof S!=="undefined"&&S,null,{timeout:20000});await pg.waitForTimeout(2000);await pg.evaluate(()=>{locSave("main")});return pg};
 const doc=async()=>{const r=await fetch(FS+"/pubShop/main",{headers:{Authorization:"Bearer owner"}});return r.status===200?await r.json():null};
 fs.mkdirSync(OUT+"/shots",{recursive:true});
 const td=new Date().toLocaleDateString("sv-SE"),now=Date.now(),H=36e5;
 await put("settings","main",{name:"Цветочная лавка",phone:"+7 700 000 00 00"});
 const ow=await lg("tilegen615@gmail.com");
 const ids=await ow.evaluate(()=>Object.fromEntries(Object.keys(SF).map(i=>[SF[i].email,i])));
 const nm={"fl@x.kz":"Айгерим","op@x.kz":"Дина","co@x.kz":"Ерлан","adm@x.kz":"Мадина"};
 for(const [em,n] of Object.entries(nm))await ow.evaluate(([id,n])=>db.collection("staff").doc(id).update({name:n}),[ids[em],n]);
 const O=[["Розы нежные, 51 шт","Алия",1,"18:00",24500,"fl@x.kz",3.2],["Тюльпаны микс, 25 шт","Данияр",0,"19:30",12000,null,0.3],["Пионы розовые, 15 шт","Айнур",2,"16:00",31800,"fl@x.kz",4.5],["Букет «Нежность»","Мария",3,"17:30",18900,"fl@x.kz",5],["Композиция в коробке","Самат",1,"20:00",27500,"fl@x.kz",1.4],["Ранункулюсы, 21 шт","Жанар",0,"21:00",15600,null,0.2],["Букет невесты","Асель",4,"12:00",42000,"fl@x.kz",9]];
 for(const [i,[bn,cl,st,tm,p,who,ago]] of O.entries()){const o={client:cl,phone:"+7 701 555 0"+(10+i)+" "+(20+i),bn,st,loc:"main",by:ids["op@x.kz"],date:td,time:tm,p,ts:now-ago*H,createdAt:now-ago*H,dv:i%2?1:0,addr:i%2?"мкр 15, дом 3":"",paid:st>=3};if(who){o.takenBy=ids[who];o.takenAt=now-(ago-0.2)*H;if(st>=2){o.asm=ids[who];o.readyAt=now-(ago-1)*H}}await put("orders","demo"+i,o)}
 await ow.reload();await ow.waitForTimeout(3500);

 const OUTP=process.env.OUTP;fs.mkdirSync(OUTP,{recursive:true});
 const nm2={"as@x.kz":"Сауле"};for(const [em,n] of Object.entries(nm2))if(ids[em])await ow.evaluate(([id,n])=>db.collection("staff").doc(id).update({name:n}),[ids[em],n]);
 /* склад, витрина, чат, заявка, сделка, сообщения команды — чтобы экраны не были пустыми */
 await ow.evaluate(async()=>{const inv=[["Роза Эквадор 60 см","Цветы","шт",1200,140,20],["Пион розовый","Цветы","шт",1800,35,10],["Эвкалипт","Зелень","ветка",600,40,10],["Тюльпан микс","Цветы","шт",700,8,30],["Плёнка крафт","Упаковка","лист",300,120,20]];
  for(const [name,cat,unit,sell,q,min] of inv)await db.collection("inventory").add({name,cat,unit,sell,qty:q,qs:{main:q},min,ts:Date.now()});
  for(const [name,price] of [["Нежный микс",18500],["Розы 25 шт",32000],["Пионы в коробке",27000]])await db.collection("showcase").add({name,price,st:"in",at:Date.now(),loc:"main",by:U.uid,shelf:3});
  const t=Date.now();await db.collection("chats").doc("wa_77015552233").set({ch:"wa",name:"Асель",phone:"+7 701 555 22 33",loc:"main",lastTs:t,lastTxt:"Здравствуйте! Можно букет из 25 роз на завтра к 18:00?",lastDir:"in",unread:1,firstTs:t,st:"open",resp:"",nOut:0});
  await db.collection("chats").doc("wa_77015552233").collection("msgs").add({t:"Здравствуйте! Можно букет из 25 роз на завтра к 18:00?",dir:"in",ts:t});
  await db.collection("leads").add({loc:"main",src:"Instagram",name:"Гульнара",phone:"+7 702 111 22 33",want:"Свадебный букет",budget:45000,note:"",st:"new",resp:"",by:U.uid,ts:t});
  await db.collection("deals").add({fid:"sales",client:"Компания «Береке»",phone:"+7 705 000 11 22",title:"Букеты на корпоратив, 12 шт",p:180000,src:"WhatsApp",loc:"main",oid:"",st:1,by:U.uid,byName:"Владелец",ts:t,last:t,hist:[{t,w:"Владелец",x:"Сделка создана"}]});
  await db.collection("team").add({t:"Сегодня к 18:00 две доставки, проверьте открытки",ts:t,by:U.uid,byName:"Владелец",role:"owner"});
  await db.collection("settings").doc("main").set({funnels:[funObj(FTPL[0]),funObj(FTPL[1])]},{merge:true});});
 await ow.waitForTimeout(2500);await ow.context().close();
 const C={home:"Главная. Сверху смена и «Нужно сделать», ниже следующий заказ и цифры дня. Любая строка и цифра нажимается.",
  orders:"Заказы. Сверху вкладки (Заказы, Воронка, Сборка, Доставка — у каждой должности свои). Поиск, дата, статусы. Нажмите на карточку — откроется заказ.",
  board:"Заказы → «Доска»: колонки по статусам. Кнопка на карточке — следующий шаг.",
  deals:"Заказы → «Воронка». Новые заявки из чатов сверху: «В воронку», «Создать заказ», «Отказ». Ниже сделки по этапам.",
  fl:"Заказы → «Сборка»: что собрать сейчас и что уже в работе.",
  cur:"Заказы → «Доставка»: доставки в пути и ожидающие курьера.",
  stock:"Склад: товары, рецепты букетов, закупка. «Поставка» — приход сразу многих позиций, «Списать» — на карточке позиции.",
  show:"Витрина: готовые букеты в магазине. «Продано», «Списать», отчёт за день.",
  gal:"Склад → «Фото»: фото букетов, их можно отправить клиенту в чате как каталог.",
  chats:"Чаты: сообщения клиентов из WhatsApp и Instagram. Внутри чата: ответ, шаблоны, «Создать заказ», «Добавить в воронку».",
  crm:"Клиенты: все, кто заказывал. В карточке клиента заказы, сделки, бонусы, кнопка «Чат в CRM».",
  sched:"График смен на неделю. Нажмите на день, чтобы попросить смену или выходной.",
  rep:"Отчёты смены: витрина, рабочее место, касса и чек-лист. Сдаются в конце смены.",
  st:"Статистика: кто сколько собрал и принял заказов за период.",
  tc:"Чат команды: сообщения всем сотрудникам.",
  ctrl:"Команда → «Сейчас»: итоги дня, что требует внимания, деньги по сотрудникам, важные изменения денег, сообщения команды, кто что делает.",
  team:"Команда → «Сотрудники»: создать сотрудника, роль, точка, доступ, пароль. При создании видно, какое меню он получит.",
  jr:"Команда → «Журнал»: все действия по времени, раздел «Важное: деньги» и журнал сервера.",
  fin:"Деньги → «Финансы»: выручка, расходы, заработок сотрудников, отчёт в Excel.",
  an:"Деньги → «Аналитика»: букеты, каналы, клиенты, часы, сотрудники.",
  set:"Настройки: разделы магазина, клиенты и оплата, команда и доступ, вид, уведомления, каналы связи.",
  look:"Настройки → «Вид»: язык, дизайн, цвет (у каждого свой цветок), размер интерфейса, мой экран.",
  me:"Профиль: моя работа и заработок, график, «Первая настройка», смена пароля и выход.",
  new:"Новый заказ: сначала телефон — знакомый клиент подставится сам. Итог и «Создать заказ» всегда внизу окна.",
  det:"Карточка заказа: позвонить, WhatsApp, 2ГИС, оплата, следующий шаг, комментарий, история.",
  ob:"Первая настройка: появляется при первом входе. Что важно в работе, меню, размер и цвет, уведомления."};
 const R=[["1-Florist","fl@x.kz","Флорист",["ob","home","orders","fl","det","show","stock","sched","rep","me"]],
  ["2-Pomoshnik","as@x.kz","Помощник флориста",["ob","home","orders","fl","show","stock","gal","sched","rep","me"]],
  ["3-Operator","op@x.kz","Оператор",["ob","home","new","orders","deals","chats","crm","show","det","rep","me"]],
  ["4-Kurer","co@x.kz","Курьер",["ob","home","orders","det","sched","me"]],
  ["5-Glavnyi-admin-Vladelec","tilegen615@gmail.com","Владелец",["home","fin","an","orders","deals","ctrl","jr","team","stock","chats","look","set"]],
  ["6-Administrator","adm@x.kz","Администратор",["ob","home","orders","board","deals","ctrl","team","chats","stock","show","jr","set"]]];
 const man=[];
 for(const [file,em,title,list] of R){const pg=await lg(em,{...devices["iPhone 13"]});await pg.waitForTimeout(3000);const shots=[];
  const have=await pg.evaluate(()=>(window.TALL||[]).map(t=>t[0]));
  for(const k of list){
   const go=async c=>{await pg.evaluate(()=>{try{modal("")}catch(e){}});await pg.evaluate(c);await pg.waitForTimeout(1300);await pg.evaluate(()=>document.querySelectorAll(".nfb,#toast").forEach(e=>e.remove()))};
   if(k==="ob"){await go(()=>{obOpen(0)})}
   else if(k==="new"){await go(()=>{tab="orders";draw();form()})}
   else if(k==="det"){await go(()=>{tab="orders";draw();const o=O.find(x=>+x.st<4)||O[0];if(o)shl().openOrder(o.id)})}
   else if(k==="board"){if(!have.includes("orders"))continue;await go(()=>{tab="orders";OBV="board";draw();scrollTo(0,0)})}
   else if(k==="look"){await go(()=>{tab="set";SETS="look";draw();scrollTo(0,0)})}
   else if(k==="set"){await go(()=>{tab="set";SETS="sec";draw();scrollTo(0,0)})}
   else{if(!have.includes(k))continue;await go(new Function('tab="'+k+'";'+(k==="orders"?'OBV="list";':'')+'draw();scrollTo(0,0)'))}
   const f=OUTP+"/"+file+"-"+k+".jpg";await pg.screenshot({path:f,type:"jpeg",quality:72,clip:{x:0,y:0,width:390,height:760}});shots.push([k,f])}
  man.push({file,title,shots});await pg.context().close()}
 fs.writeFileSync(OUTP+"/man.json",JSON.stringify({C,man}));
 console.log("снимков",man.reduce((q,m)=>q+m.shots.length,0),"errs",JSON.stringify(errs).slice(0,400));await br.close();srv.close();process.exit(0)})().catch(e=>{console.log("CRASH",e.message.slice(0,300));process.exit(1)});