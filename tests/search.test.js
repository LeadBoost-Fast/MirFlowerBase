// Проверка умного поиска без браузера. Запуск: node tests/search.test.js
const fs=require("fs");const h=fs.readFileSync(require("path").join(__dirname,"..","src","app.js"),"utf8");
const a=h.indexOf("const sNrm=");const b=h.indexOf("function orders(){const QT=");
const code=h.slice(a,b);
const ST=["Новый","Собирается","Готов","В пути","Выдан","Отменён"];
const SF={c1:{name:"Бек курьер"}};
const api=new Function("SF","stL","esc",code+";return {sQuery,sHit,sHay,oHay,sEmpty}")(SF,o=>+o.st===4&&o.dv?"Доставлен":(ST[+o.st]||"?"),s=>String(s));
const {sQuery,sHit,oHay}=api;
const O=[
 {id:"abc12345",client:"Айгерим Ёлкина",phone:"+7 777 123 45 67",bn:"Белый ×51",comp:"Роза белая ×51, эвкалипт",addr:"15 мкр, дом 3, кв 12",note:"Открытка: с днём рождения",date:"2026-11-20",time:"15:00",st:1,dv:true,courier:"c1"},
 {id:"zzz99999",client:"Марат",phone:"8 706 707 36 22",bn:"Мандала ×31",comp:"Хризантема",addr:"",note:"",date:"2026-11-21",st:4,dv:false},
 {id:"qqq00001",client:"Живой клиент",phone:"",bn:"Лаванда",comp:"Лаванда ×7",st:4,dv:false,date:"2026-11-19"}];
let bad=0;
const t=(q,exp)=>{const T=sQuery(q);const r=O.filter(o=>sHit(T,oHay(o))).map(o=>o.client.split(" ")[0]);const ok=JSON.stringify(r)===JSON.stringify(exp);if(!ok)bad++;console.log((ok?"OK   ":"FAIL ")+JSON.stringify(q)+" → "+JSON.stringify(r)+(ok?"":" ожидалось "+JSON.stringify(exp)))};
t("",["Айгерим","Марат","Живой"]);
t("айгерим",["Айгерим"]);t("АЙГЕ",["Айгерим"]);t("елкина",["Айгерим"]);t("ёлкина",["Айгерим"]);
t("розы айгерим",[]);t("роза айгерим",["Айгерим"]);t("айгерим роза",["Айгерим"]);
t("777 123",["Айгерим"]);t("+7 777 123",["Айгерим"]);t("8 777 123 45 67",["Айгерим"]);t("77771234567",["Айгерим"]);t("123 45",["Айгерим"]);t("4567",["Айгерим"]);
t("706 707",["Марат"]);t("87067073622",["Марат"]);t("+7 706 707 36 22",["Марат"]);t("7067073622",["Марат"]);
t("20.11",["Айгерим"]);t("2026-11-21",["Марат"]);t("доставка",["Айгерим"]);t("самовывоз",["Марат","Живой"]);t("выдан",["Марат","Живой"]);t("собирается",["Айгерим"]);t("бек",["Айгерим"]);
t("мкр 15",["Айгерим"]);t("с днем рождения",["Айгерим"]);t("×51",["Айгерим"]);t("12345",["Айгерим"]);
t("лаванда 7",["Живой"]);t("xyz",[]);t("мандала хризантема",["Марат"]);
console.log("пустой запрос из пробелов:",sQuery("   ").length===0,"| ошибок:",bad);
