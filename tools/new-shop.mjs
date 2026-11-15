// Новый магазин на этой системе (вариант «копия на магазин»). Две команды:
//   node tools/new-shop.mjs create <slug> --name "Название" --city "Город" --gis almaty --owner почта [--head почта] [--phone "+7 ..."] --fb файл.txt
//       создаёт shops/<slug>/ (настройки магазина и ключи Firebase-проекта этого магазина)
//   node tools/new-shop.mjs bundle <slug>
//       собирает всё готовое к выкладке в dist/<slug>/ (сайт, правила, функции, firebase.json)
// <slug>: маленькие латинские буквы и цифры, например almaty1. Файл --fb: настройки веб-приложения из консоли Firebase
// (Project settings → Your apps → Config), можно целиком скопировать как есть.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const R=(...p)=>path.join(ROOT,...p);
const KEYS=["apiKey","authDomain","projectId","storageBucket","messagingSenderId","appId"];
const OLD_PROJECT="mirflowersbase",OLD_OWNER="tilegen615@gmail.com",OLD_HEAD="nash0082008@icloud.com";
const die=m=>{console.error("Ошибка: "+m);process.exit(1)};
const args=(a=>{const o={_:[]};for(let i=0;i<a.length;i++){if(a[i].startsWith("--")){o[a[i].slice(2)]=a[i+1]&&!a[i+1].startsWith("--")?a[++i]:"1"}else o._.push(a[i])}return o})(process.argv.slice(2));
const hash=s=>crypto.createHash("sha256").update(s).digest("hex").slice(0,8);
const jsq=s=>JSON.stringify(String(s)); // безопасно вставить строку в JS
const okSlug=s=>/^[a-z0-9]{2,20}$/.test(s||"");
const okMail=s=>/^[^\s@'"\\]+@[^\s@'"\\]+\.[^\s@'"\\]+$/.test(s||"");

export function parseFb(text){
  const c={};
  for(const k of KEYS){const m=new RegExp("[\"']?"+k+"[\"']?\\s*:\\s*[\"']([^\"']+)[\"']").exec(text);if(!m)throw new Error("в настройках Firebase нет поля "+k);c[k]=m[1]}
  if(!/^[a-z0-9-]+$/.test(c.projectId))throw new Error("странное название проекта: "+c.projectId);
  return c;
}

function create(slug){
  if(!okSlug(slug))die("slug: латинские буквы и цифры, 2–20 символов (например almaty1)");
  const dir=R("shops",slug);if(fs.existsSync(dir)&&!args.force)die("shops/"+slug+" уже есть (--force, чтобы перезаписать)");
  for(const k of ["name","city","owner","fb"])if(!args[k])die("не задано --"+k);
  if(!okMail(args.owner)||(args.head&&!okMail(args.head)))die("почта владельца выглядит неверно");
  let fb;try{fb=parseFb(fs.readFileSync(args.fb,"utf8"))}catch(e){die(e.message)}
  if(fb.projectId===OLD_PROJECT)die("это проект Mirflowers: нужен отдельный проект Firebase магазина");
  fs.mkdirSync(dir,{recursive:true});
  const gis=args.gis||"almaty";
  const legal=`{owner:"",bin:"",email:${jsq(args.owner)},phone:${jsq(args.phone||"")},address:"",storage:""}`;
  fs.writeFileSync(path.join(dir,"shop.config.js"),`/* Настройки магазина «${args.name.replace(/\*\//g,"")}». Реквизиты (legal) заполнить до публикации страниц privacy.html, terms.html, data-deletion.html. */
window.SHOP_CFG={
 name:${jsq(args.name)},
 city:${jsq(args.city)},gisCity:${jsq(gis)},mapCenter:[${+args.lat||43.2389},${+args.lng||76.8897}],
 ownerEmail:${jsq(args.owner.toLowerCase())},headEmail:${jsq((args.head||args.owner).toLowerCase())},
 mainLoc:"",
 legal:${legal},
 links:[],
 wizard:true /* при первом входе владельца открывается мастер настройки магазина */
};
`);
  fs.writeFileSync(path.join(dir,"firebase-config.json"),JSON.stringify(fb,null,2)+"\n");
  console.log("Создано shops/"+slug+"/ (shop.config.js, firebase-config.json).\nДальше:\n 1. Откройте shops/"+slug+"/shop.config.js: заполните legal (реквизиты), mapCenter и ссылки.\n 2. Свои иконки: положите icon-180.png, icon-192.png, icon-512.png в shops/"+slug+"/ (иначе будут от Mirflowers).\n 3. Проверка: node tools/new-shop.mjs bundle "+slug+"\n 4. Выкладка: GitHub → Actions → «Deploy shop» → Run workflow, shop="+slug+" (нужен секрет FIREBASE_SA_"+slug.toUpperCase()+").");
}

const cp=(a,b)=>{fs.mkdirSync(path.dirname(b),{recursive:true});fs.copyFileSync(a,b)};
function copyDir(a,b,skip=()=>false){fs.mkdirSync(b,{recursive:true});for(const n of fs.readdirSync(a)){if(skip(n))continue;const s=path.join(a,n),d=path.join(b,n);fs.statSync(s).isDirectory()?copyDir(s,d,skip):fs.copyFileSync(s,d)}}

export function bundle(slug,out){
  if(!okSlug(slug))die("slug неверный");
  const sd=R("shops",slug);if(!fs.existsSync(sd))die("нет shops/"+slug+" (сначала create)");
  const fb=JSON.parse(fs.readFileSync(path.join(sd,"firebase-config.json"),"utf8"));
  const cfgTxt=fs.readFileSync(path.join(sd,"shop.config.js"),"utf8");
  const sandbox={};new Function("window",cfgTxt)(sandbox);const C=sandbox.SHOP_CFG||die("в shop.config.js нет SHOP_CFG");
  const owner=String(C.ownerEmail||"").toLowerCase(),head=String(C.headEmail||owner).toLowerCase();
  if(!okMail(owner)||!okMail(head))die("в shop.config.js неверные почты ownerEmail/headEmail");
  const dist=out||R("dist",slug),site=path.join(dist,"site");
  fs.rmSync(dist,{recursive:true,force:true});fs.mkdirSync(site,{recursive:true});
  const FBLIT=/\{apiKey:"[^"]+",authDomain:"[^"]+",projectId:"[^"]+",storageBucket:"[^"]+",messagingSenderId:"[^"]+",appId:"[^"]+"\}/g;
  const newLit=`{apiKey:${jsq(fb.apiKey)},authDomain:${jsq(fb.authDomain)},projectId:${jsq(fb.projectId)},storageBucket:${jsq(fb.storageBucket)},messagingSenderId:${jsq(fb.messagingSenderId)},appId:${jsq(fb.appId)}}`;
  const name=String(C.name||"Магазин");
  const rd=p=>fs.readFileSync(R(p),"utf8"),wr=(p,t)=>{fs.mkdirSync(path.dirname(path.join(site,p)),{recursive:true});fs.writeFileSync(path.join(site,p),t)};
  let n=0;const swap=t=>t.replace(FBLIT,()=>{n++;return newLit});
  // страница и скрипты
  let page=rd("index.html");const m=/assets\/app\.([0-9a-f]{8})\.js/.exec(page);if(!m)die("в index.html нет скрипта (сначала node build/build.mjs)");
  const appOld="assets/app."+m[1]+".js";let app=swap(rd(appOld));
  const appName="assets/app."+hash(app)+".js";page=page.split(appOld).join(appName).replace(/<h1>База флористики<\/h1>/g,()=>"<h1>"+name.replace(/[<&]/g,"")+"</h1>");
  wr(appName,app);wr("index.html",page);
  const css=/assets\/app\.[0-9a-f]{8}\.css/.exec(page);if(css)wr(css[0],rd(css[0]));
  for(const f of fs.readdirSync(ROOT).filter(f=>/^d-[a-z]+\.js$/.test(f)))wr(f,rd(f).split('SH.name||"База флористики"').join('SH.name||(window.SHOP_CFG||{}).name||""'));
  wr("shop.config.js",cfgTxt);
  wr("vitrina.html",swap(rd("vitrina.html")));
  wr("status.html",swap(rd("status.html")).replace('d.shop||"Mirflowers"',()=>"d.shop||"+jsq(name)).replace('id="shop">Mirflowers<',()=>'id="shop">'+name.replace(/[<&"]/g,"")+"<"));
  wr("firebase-messaging-sw.js",swap(rd("firebase-messaging-sw.js")).replace('d.title||"Mirflowers"',()=>"d.title||"+jsq(name)));
  for(const f of ["privacy.html","terms.html","data-deletion.html"])wr(f,rd(f));
  const mf=JSON.parse(rd("manifest.json"));mf.name=name+" CRM";mf.short_name=name.slice(0,12);wr("manifest.json",JSON.stringify(mf,null,2)+"\n");
  for(const ic of ["icon-180.png","icon-192.png","icon-512.png"])cp(fs.existsSync(path.join(sd,ic))?path.join(sd,ic):R(ic),path.join(site,ic));
  if(n<4)die("ключи Firebase заменились не везде ("+n+" из 4): сборка изменилась, нужно поправить tools/new-shop.mjs");
  // правила и функции с почтами владельца этого магазина
  const sub=t=>t.split(OLD_OWNER).join(owner).split(OLD_HEAD).join(head);
  fs.writeFileSync(path.join(dist,"firestore.rules"),sub(rd("firestore.rules")));
  cp(R("storage.rules"),path.join(dist,"storage.rules"));
  copyDir(R("functions"),path.join(dist,"functions"),x=>x==="node_modules"||x.endsWith(".log"));
  for(const f of ["index.js","channels.js"]){const p=path.join(dist,"functions",f);fs.writeFileSync(p,sub(fs.readFileSync(p,"utf8")))}
  const fj=JSON.parse(rd("firebase.json"));delete fj.emulators;
  fj.hosting={public:"site",ignore:["firebase.json","**/.*"],headers:[{source:"**/*.@(js|css|png)",headers:[{key:"Cache-Control",value:"public, max-age=31536000, immutable"}]},{source:"{index.html,firebase-messaging-sw.js,shop.config.js,*.html}",headers:[{key:"Cache-Control",value:"no-cache"}]}]};
  fs.writeFileSync(path.join(dist,"firebase.json"),JSON.stringify(fj,null,2)+"\n");
  fs.writeFileSync(path.join(dist,".firebaserc"),JSON.stringify({projects:{default:fb.projectId}},null,2)+"\n");
  // защита от забытого Mirflowers
  const left=[];(function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory()){if(f!=="node_modules")walk(p)}else if(/\.(js|html|json|rules|md)$/.test(f)&&!/package-lock/.test(f)){const t=fs.readFileSync(p,"utf8");for(const s of [OLD_PROJECT,OLD_OWNER,OLD_HEAD])if(t.includes(s))left.push(path.relative(dist,p)+": "+s)}}})(dist);
  if(left.length)die("в сборке остались данные Mirflowers:\n "+left.join("\n "));
  console.log("Готово: "+dist+"\n сайт: site/, правила, функции, firebase.json, .firebaserc (проект "+fb.projectId+")\n Выкладка: cd "+dist+" && firebase deploy --only hosting,firestore:rules,functions,storage\n Адрес сайта после выкладки: https://"+fb.projectId+".web.app");
  return {dist,site,fb,owner,head,name};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const [cmd,slug]=args._;
  if(cmd==="create")create(slug);else if(cmd==="bundle")bundle(slug,args.out);else die("команды: create <slug> ... | bundle <slug>");
}
