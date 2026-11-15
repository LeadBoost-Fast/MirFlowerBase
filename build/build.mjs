// Сборка сайта: берёт исходники из src/, сжимает и кладёт готовое в корень (его раздаёт GitHub Pages).
// Запуск: node build/build.mjs            (собрать)
//         node build/build.mjs --check    (проверить, что готовые файлы соответствуют исходникам)
//         NO_MIN=1 node build/build.mjs   (собрать без сжатия, для отладки)
import {transform} from "esbuild";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SRC=p=>path.join(ROOT,"src",p),OUT=p=>path.join(ROOT,p);
const CHECK=process.argv.includes("--check"),MIN=process.env.NO_MIN!=="1",IDS=process.env.NO_IDS!=="1";
const LAZY=["d-cosmos.js","d-command.js","d-atlas.js","d-kk.js","d-help.js"];
const hash=s=>crypto.createHash("sha256").update(s).digest("hex").slice(0,8);
const kb=n=>(n/1024).toFixed(0).padStart(5)+" КБ";

async function js(code){
  if(!MIN)return code;
  // идентификаторы верхнего уровня esbuild в обычном скрипте не трогает, поэтому глобальные имена (draw, db, S и другие) остаются
  const r=await transform(code,{loader:"js",minifyWhitespace:true,minifySyntax:true,minifyIdentifiers:IDS,charset:"utf8",legalComments:"none"});
  return r.code;
}
async function css(code){
  if(!MIN)return code;
  const r=await transform(code,{loader:"css",minify:true,charset:"utf8",legalComments:"none"});
  return r.code;
}

const files=new Map(); // путь относительно корня -> содержимое
const appJs=await js(fs.readFileSync(SRC("app.js"),"utf8")),appCss=await css(fs.readFileSync(SRC("app.css"),"utf8"));
const jsName="assets/app."+hash(appJs)+".js",cssName="assets/app."+hash(appCss)+".css";
files.set(jsName,appJs);files.set(cssName,appCss);
let page=fs.readFileSync(SRC("index.template.html"),"utf8");
if(!page.includes("{{APP_JS}}")||!page.includes("{{APP_CSS}}"))throw new Error("в шаблоне нет меток {{APP_JS}} и {{APP_CSS}}");
page=page.replace("{{APP_JS}}",jsName).replace("{{APP_CSS}}",cssName);
files.set("index.html",page);
for(const f of LAZY)files.set(f,await js(fs.readFileSync(SRC(f),"utf8")));

if(CHECK){
  let bad=0;
  for(const [f,c] of files){let cur="";try{cur=fs.readFileSync(OUT(f),"utf8")}catch(e){}if(cur!==c){bad++;console.log("НЕ СОВПАДАЕТ:",f)}}
  const old=fs.existsSync(OUT("assets"))?fs.readdirSync(OUT("assets")).filter(n=>/^app\..*\.(js|css)$/.test(n)&&!files.has("assets/"+n)):[];
  old.forEach(n=>{bad++;console.log("ЛИШНИЙ ФАЙЛ:","assets/"+n)});
  console.log(bad?"Готовые файлы не соответствуют src/. Запустите: node build/build.mjs":"Готовые файлы соответствуют исходникам.");
  process.exit(bad?1:0);
}

fs.mkdirSync(OUT("assets"),{recursive:true});
for(const n of fs.readdirSync(OUT("assets")))if(/^app\..*\.(js|css)$/.test(n)&&!files.has("assets/"+n))fs.unlinkSync(OUT("assets/"+n));
for(const [f,c] of files)fs.writeFileSync(OUT(f),c);

console.log(MIN?"Собрано со сжатием.":"Собрано БЕЗ сжатия (NO_MIN=1).");
let tr=0,trg=0,trb=0;
for(const [f,c] of files){const b=Buffer.from(c,"utf8"),g=zlib.gzipSync(b,{level:9}).length,br=zlib.brotliCompressSync(b).length;
  console.log(f.padEnd(26),"сырой",kb(b.length),"| gzip",kb(g),"| brotli",kb(br));
  if(f==="index.html"||f.startsWith("assets/")){tr+=b.length;trg+=g;trb+=br}}
console.log("Первая загрузка (страница, скрипт, стили):".padEnd(26),"сырой",kb(tr),"| gzip",kb(trg),"| brotli",kb(trb));
