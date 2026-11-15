// Обход всего сайта: каждая роль, телефон и ноутбук, каждый раздел и подраздел настроек. Ищет пустые экраны, «undefined/NaN», горизонтальную прокрутку и ошибки в консоли. Запуск: node tests/walk.cjs (эмуляторы как для site.cjs)
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
 const lg=async(e,vp)=>{const ctx=await br.newContext({...(vp||devices["iPhone 13"])}),pg=await ctx.newPage();pg.on("pageerror",x=>errs.push(e+": "+x.message));pg.on("dialog",d=>d.accept());await ctx.route("https://example.com/**",r=>r.fulfill({body:PNG,contentType:"image/png"}));
  await pg.goto("http://127.0.0.1:5078/");await pg.waitForTimeout(1200);await pg.locator('input[type=email]').first().fill(e);await pg.locator('input[type=password]').first().fill("secret12");await pg.locator('button:has-text("Войти")').first().tap();await pg.waitForFunction(()=>typeof S!=="undefined"&&S,null,{timeout:20000});await pg.waitForTimeout(2000);await pg.evaluate(()=>{locSave("main")});return pg};
 const doc=async()=>{const r=await fetch(FS+"/pubShop/main",{headers:{Authorization:"Bearer owner"}});return r.status===200?await r.json():null};
 fs.mkdirSync(OUT+"/walk",{recursive:true});
 const ROLES=[["tilegen615@gmail.com","owner"],["adm@x.kz","admin"],["op@x.kz","operator"],["fl@x.kz","florist"],["co@x.kz","courier"]],DEV=[["phone",devices["iPhone 13"]],["laptop",{viewport:{width:1366,height:800}}]],bad=[];let checks=0;
 await put("orders","w1",{client:"Алия",phone:"+7 700 111 22 33",bn:"Розы",st:1,loc:"main",by:"x",date:new Date().toLocaleDateString("sv-SE"),ts:Date.now(),sum:15000});
 for(const [dn,dv] of DEV)for(const [em,rn] of ROLES){
  const pg=await lg(em,dv);
  const ids=await pg.evaluate(()=>[...new Set([...(window.HPL||[]).map(t=>t[0]),...(typeof MORE!=="undefined"?MORE.map(t=>t[0]):[])])]);
  const steps=ids.map(id=>[id,id,null]);
  if(rn==="owner"||rn==="admin")["look","notif","shop","pay","fx","pts","tech"].forEach(s=>steps.push(["set","set/"+s,s]));
  for(const [id,name,sub] of steps){
   await pg.evaluate(([id,sub])=>{tab=id;if(sub)SETS=sub;draw()},[id,sub]);await pg.waitForTimeout(450);
   const r=await pg.evaluate(()=>{const v=document.querySelector("#v")||document.body,t=v.textContent.trim();return{len:t.length,ow:document.documentElement.scrollWidth-window.innerWidth,bad:(t.match(/undefined|NaN|\[object|null\b/)||[""])[0]}});
   checks++;const tag=dn+"/"+rn+"/"+name;
   if(r.len<12)bad.push(tag+": пустой экран");
   if(r.bad)bad.push(tag+": в тексте «"+r.bad+"»");
   if(r.ow>2)bad.push(tag+": горизонтальная прокрутка +"+r.ow+"px");
   await pg.screenshot({path:OUT+"/walk/"+dn+"-"+rn+"-"+name.replace("/","_")+".png"})}
  await pg.context().close()}
 N.push("проверено экранов: "+checks);bad.forEach(b=>N.push("FAIL "+b));if(!bad.length)N.push("OK   пустых экранов, «undefined/NaN» и горизонтальной прокрутки нет");
 console.log(N.join("\n"));console.log("ERRS",errs.length,errs.slice(0,8).join(" || "));await br.close();srv.close();process.exit(0)})().catch(e=>{console.log((globalThis.N||[]).join("\n"));console.log("ERRS-AT-CRASH",(globalThis.E||[]).join(" || "));console.log("CRASH",e.message.slice(0,300));process.exit(1)});
