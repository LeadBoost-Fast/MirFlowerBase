// Проверка генератора нового магазина: создаёт пробный магазин, собирает пакет и проверяет, что ничего от Mirflowers не осталось.
// Запуск: node tools/shop.test.mjs   (перед этим собрать сайт: node build/build.mjs)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."),T=path.join(ROOT,"tools/new-shop.mjs");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"shop-"));let bad=0;
const ok=(c,m)=>{console.log((c?"OK   ":"FAIL ")+m);if(!c)bad++};
const fbf=path.join(tmp,"fb.txt");
fs.writeFileSync(fbf,`const firebaseConfig = {
  apiKey: "AIzaFakeKeyForTest123",
  authDomain: "testshop-1.firebaseapp.com",
  projectId: "testshop-1",
  storageBucket: "testshop-1.firebasestorage.app",
  messagingSenderId: "111222333",
  appId: "1:111222333:web:abcdef"
};`);
const run=(...a)=>execFileSync("node",[T,...a],{encoding:"utf8"});
const slug="zztest",sd=path.join(ROOT,"shops",slug),out=path.join(tmp,"dist");
try{
  run("create",slug,"--name","Цветы «Тест»","--city","Алматы","--gis","almaty","--owner","Owner@Test.kz","--head","head@test.kz","--phone","+7 700 000 00 00","--fb",fbf,"--force");
  const cfg=fs.readFileSync(path.join(sd,"shop.config.js"),"utf8");
  ok(cfg.includes('ownerEmail:"owner@test.kz"')&&cfg.includes("wizard:true"),"настройки магазина созданы, почта в нижнем регистре, мастер включён");
  run("bundle",slug,"--out",out);
  const site=path.join(out,"site"),rd=p=>fs.readFileSync(path.join(site,p),"utf8");
  const idx=rd("index.html"),js=/assets\/app\.[0-9a-f]{8}\.js/.exec(idx);
  ok(js&&fs.existsSync(path.join(site,js[0])),"index.html ссылается на существующий скрипт");
  const app=js?rd(js[0]):"";
  ok(app.includes('projectId:"testshop-1"')&&!app.includes("mirflowersbase"),"в скрипте сайта ключи нового проекта, Mirflowers нет");
  for(const f of ["vitrina.html","status.html","firebase-messaging-sw.js"])ok(rd(f).includes('projectId:"testshop-1"')&&!rd(f).includes("mirflowersbase"),f+": ключи нового проекта");
  ok(rd("shop.config.js").includes("Цветы «Тест»"),"shop.config.js магазина");
  ok(JSON.parse(rd("manifest.json")).name==="Цветы «Тест» CRM","название приложения на телефоне");
  ok(rd("status.html").includes('id="shop">Цветы «Тест»<'),"страница статуса: название магазина");
  const rules=fs.readFileSync(path.join(out,"firestore.rules"),"utf8");
  ok(rules.includes("'owner@test.kz'")&&rules.includes("'head@test.kz'")&&!rules.includes("tilegen615")&&!rules.includes("nash0082008"),"правила Firestore: почты владельца этого магазина");
  for(const f of ["index.js","channels.js"]){const t=fs.readFileSync(path.join(out,"functions",f),"utf8");ok(t.includes('"owner@test.kz"')&&!t.includes("tilegen615"),"functions/"+f+": почты владельца этого магазина")}
  const fj=JSON.parse(fs.readFileSync(path.join(out,"firebase.json"),"utf8"));
  ok(fj.hosting.public==="site"&&!fj.emulators&&fj.functions&&fj.firestore,"firebase.json: сайт, правила, функции, без эмуляторов");
  ok(JSON.parse(fs.readFileSync(path.join(out,".firebaserc"),"utf8")).projects.default==="testshop-1",".firebaserc указывает на проект магазина");
  for(const f of ["index.js","channels.js","msgs.js"])execFileSync("node",["--check",path.join(out,"functions",f)]);
  execFileSync("node",["--check",path.join(site,js[0])]);ok(true,"скрипт сайта и функции без синтаксических ошибок");
  // чужой проект Mirflowers создать нельзя
  fs.writeFileSync(path.join(tmp,"old.txt"),fs.readFileSync(fbf,"utf8").replace('projectId: "testshop-1"','projectId: "mirflowersbase"'));
  let refused=false;try{run("create",slug+"2","--name","X","--city","Y","--owner","a@b.kz","--fb",path.join(tmp,"old.txt"))}catch(e){refused=/Mirflowers/.test(String(e.stderr))}
  ok(refused,"проект Mirflowers как проект нового магазина отклоняется");
}catch(e){ok(false,"сбой: "+(e.stderr||e.message).toString().slice(0,300))}
finally{fs.rmSync(sd,{recursive:true,force:true});fs.rmSync(path.join(ROOT,"shops",slug+"2"),{recursive:true,force:true});fs.rmSync(tmp,{recursive:true,force:true})}
console.log(bad?"ОШИБОК: "+bad:"Ошибок: 0");process.exit(bad?1:0);
