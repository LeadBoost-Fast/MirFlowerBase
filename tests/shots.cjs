// Снимки экранов для страницы продажи (sell.html): чистые данные, без тестовых названий. Запуск: node tests/shots.cjs (эмуляторы как для site.cjs), результат в tests/out/shots/
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
 const shot=async(pg,name,prep)=>{await pg.evaluate(()=>{document.querySelectorAll(".nfb,#toast").forEach(e=>e.remove())});await prep();await pg.waitForTimeout(900);await pg.evaluate(()=>{document.querySelectorAll(".nfb,#toast").forEach(e=>e.remove());const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode())if(/@/.test(n.nodeValue))n.nodeValue=n.nodeValue.replace(/[\w.+-]+@[\w.-]+/g,"owner@example.kz")});await pg.screenshot({path:OUT+"/shots/"+name+".png"})};
 await ow.waitForTimeout(6500);
 await shot(ow,"home",async()=>{await ow.evaluate(()=>{tab="home";draw();scrollTo(0,0)})});
 await shot(ow,"orders",async()=>{await ow.evaluate(()=>{tab="orders";draw();scrollTo(0,430)})});
 await shot(ow,"studio",async()=>{await ow.evaluate(()=>{tab="set";SETS="sec";draw();stOpen("orders","all")});await ow.waitForTimeout(700);await ow.evaluate(()=>{const f=document.querySelector(".st-frame");if(f)f.scrollTop=60})});
 await ow.evaluate(()=>modal(""));await ow.waitForTimeout(400);
 await shot(ow,"live",async()=>{await ow.evaluate(()=>{tab="live";draw();scrollTo(0,380)})});
 await shot(ow,"funnels",async()=>{await ow.evaluate(async()=>{await db.collection("settings").doc("main").set({funnels:[funObj(FTPL[0]),funObj(FTPL[1]),funObj(FTPL[2])]},{merge:true});});await ow.waitForTimeout(800);await ow.evaluate(()=>{FSEL="sales";tab="deals";draw();scrollTo(0,0)})});
 console.log("готово");await br.close();srv.close();process.exit(0)})().catch(e=>{console.log("CRASH",e.message.slice(0,300));process.exit(1)});
