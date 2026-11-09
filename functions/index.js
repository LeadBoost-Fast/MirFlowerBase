// Регион всех функций — там же, где база Firestore (asia-southeast1, Сингапур). Раньше функции стояли
// в us-central1 (США), и каждый вызов ходил США ↔ Сингапур. Менять вместе с FNR в index.html.
const {setGlobalOptions}=require("firebase-functions/v2");
// maxInstances и cpu: по умолчанию каждая функция резервирует до 100 копий по 1 vCPU, и в новом регионе
// деплой упирался в квоту «total allowable CPU per project per region». Для push, копий и коротких запросов
// 10 копий и облегчённого процессора (gcf_gen1, как у функций 1-го поколения) хватает с запасом.
setGlobalOptions({region:"asia-southeast1",maxInstances:10,cpu:"gcf_gen1"});
const {onCall,onRequest,HttpsError}=require("firebase-functions/v2/https");
const {defineSecret}=require("firebase-functions/params");
const {onDocumentCreated,onDocumentUpdated}=require("firebase-functions/v2/firestore");
const {onSchedule}=require("firebase-functions/v2/scheduler");
const admin=require("firebase-admin");
const {FieldValue:FV}=require("firebase-admin/firestore");
const {FieldPath}=require("firebase-admin/firestore");
const KEY=defineSecret("ANTHROPIC_API_KEY");
admin.initializeApp();
const TOP=["tilegen615@gmail.com","nash0082008@icloud.com"];

// Проверка: кто вызывает и можно ли ему трогать этого сотрудника
async function check(req,uid){
  if(!req.auth)throw new HttpsError("unauthenticated","Войдите в систему");
  if(!uid)throw new HttpsError("invalid-argument","Не указан сотрудник");
  const db=admin.firestore();
  const me=await db.doc("staff/"+req.auth.uid).get();
  if(!me.exists||me.data().active!==true)throw new HttpsError("permission-denied","Нет доступа");
  const top=TOP.includes(String(req.auth.token.email||"").toLowerCase());
  if(!top&&me.data().role!=="admin")throw new HttpsError("permission-denied","Нужна роль администратора");
  const t=await db.doc("staff/"+uid).get();
  const tm=String((t.exists&&t.data().email)||"").toLowerCase();
  if(TOP.includes(tm)&&uid!==req.auth.uid)throw new HttpsError("permission-denied","Владельца и главного админа менять нельзя");
  if(!top&&t.exists&&t.data().role==="admin")throw new HttpsError("permission-denied","Админов меняет только владелец");
}

exports.deleteStaff=onCall(async req=>{
  const uid=String(req.data&&req.data.uid||"");
  await check(req,uid);
  if(uid===req.auth.uid)throw new HttpsError("failed-precondition","Себя удалить нельзя");
  try{await admin.auth().deleteUser(uid)}catch(e){if(e.code!=="auth/user-not-found")throw new HttpsError("internal",e.message)}
  const db=admin.firestore();
  await db.doc("staff/"+uid).delete();
  await db.doc("presence/"+uid).delete().catch(()=>{});
  const sh=await db.collection("shifts").where("uid","==",uid).get();
  for(let i=0;i<sh.docs.length;i+=400){const b=db.batch();sh.docs.slice(i,i+400).forEach(d=>b.delete(d.ref));await b.commit()}
  return{ok:true};
});

exports.setStaffPassword=onCall(async req=>{
  const uid=String(req.data&&req.data.uid||""),pw=String(req.data&&req.data.password||"");
  await check(req,uid);
  if(pw.length<6)throw new HttpsError("invalid-argument","Пароль короче 6 символов");
  await admin.auth().updateUser(uid,{password:pw});
  return{ok:true};
});

// ИИ-подсказка ответа клиенту. Оператор видит черновик и сам нажимает «Отправить»
exports.aiReply=onCall({secrets:[KEY]},async req=>{
  if(!req.auth)throw new HttpsError("unauthenticated","Войдите в систему");
  const me=await admin.firestore().doc("staff/"+req.auth.uid).get();
  if(!me.exists||me.data().active!==true||!["admin","operator","florist","assistant"].includes(me.data().role))throw new HttpsError("permission-denied","Нет доступа");
  const d=req.data||{},sh=d.shop||{};
  const sys=`Ты помощник цветочного магазина ${sh.name||""}. Напиши один ответ клиенту: коротко, по делу, без приветствия и лишних слов, с 1-2 уместными смайликами. Не выдумывай цены, состав и наличие: если не знаешь, напиши, что уточнишь у флориста. Данные магазина: адрес ${sh.addr||"—"}, телефон ${sh.phone||"—"}, часы ${sh.hours||"—"}. Верни только текст ответа.`;
  const m=[];
  for(const x of (d.msgs||[]).slice(-12)){const role=x.d==="in"?"user":"assistant",t=String(x.t||"").slice(0,1000)||"…";if(m.length&&m[m.length-1].role===role)m[m.length-1].content+="\n"+t;else m.push({role,content:t})}
  while(m.length&&m[0].role!=="user")m.shift();
  if(!m.length||m[m.length-1].role!=="user")throw new HttpsError("failed-precondition","Нет нового сообщения от клиента");
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":KEY.value(),"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:"claude-haiku-5-5",max_tokens:300,system:sys,messages:m})});
  if(!r.ok)throw new HttpsError("internal","ИИ недоступен: "+r.status);
  const j=await r.json();
  return{text:((j.content||[]).map(c=>c.text||"").join("")).trim()};
});

// ================= PUSH-УВЕДОМЛЕНИЯ =================
// Регион задан выше через setGlobalOptions; OPT оставлен для частных настроек функций
const OPT={};
const TZ="Asia/Aqtau",OPS=["admin","operator","florist","assistant"],ALLW=["admin","operator","florist","assistant"];

// type: ord | ready | courier | lead | chat | rep | remind (сотрудник может отключить любой тип)
// who({uid,role,top}) решает, кому отправить; exclude — кому не слать (автор действия)
async function push(type,who,msg,exclude){
  const db=admin.firestore();
  const [st,tk]=await Promise.all([db.collection("staff").get(),db.collection("pushTokens").get()]);
  const S={};st.forEach(d=>S[d.id]=d.data());
  // сотрудникам push только во время смены (settings.pushShiftOnly, по умолчанию включено); владельцам — всегда
  let onShift=null;
  if(type!=="test"){try{const sm=await db.doc("settings/main").get();if(!sm.exists||sm.data().pushShiftOnly!==false){onShift=new Map();const ls=await db.collection("shiftLog").where("start",">=",Date.now()-20*36e5).get();ls.forEach(d=>{const x=d.data();if(x.uid&&!x.end)onShift.set(x.uid,x.loc||"")})}}catch(e){console.error("push shift",e);onShift=null}}
  const toks=[];
  tk.forEach(d=>{const t=d.data(),p=S[t.uid];
    if(!p||p.active!==true||t.uid===exclude)return;
    if(t.ev&&t.ev[type]===false)return;
    const top=TOP.includes(String(p.email||"").toLowerCase());
    if(onShift&&!top&&p.role!=="owner"&&!onShift.has(t.uid))return;
    // точки раздельные: сотрудник получает только события своей точки (точка смены, иначе закреплённая); владельцы и курьеры — все
    if(msg.loc&&!top&&p.role!=="owner"&&p.role!=="courier"){const pl=(onShift&&onShift.get(t.uid))||p.loc||"";if(pl&&pl!==msg.loc)return}
    // владельцам — только важное (msg.imp): плохой отзыв, запрос на отмену/скидку, отказ курьера, товар закончился, отчёт с замечаниями
    if((top||p.role==="owner")&&type!=="test"&&!msg.imp)return;
    if(who({uid:t.uid,role:p.role,top}))toks.push(d.id)});
  if(!toks.length)return 0;
  // без смайликов: на заблокированном экране — строгий текст
  const EMO=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{2604}\u{2607}-\u{27BF}\u{2B50}\u{FE0F}\u{21A9}\u{1F501}]/gu,clean=t=>String(t||"").replace(EMO,"").replace(/\s{2,}/g," ").trim();
  const data={title:clean(msg.title||"Mirflowers")||"Mirflowers",body:clean(msg.body).slice(0,200),tag:String(msg.tag||type),url:String(msg.url||"/")};
  let sent=0;
  for(let i=0;i<toks.length;i+=500){
    const part=toks.slice(i,i+500);
    const r=await admin.messaging().sendEachForMulticast({tokens:part,data,webpush:{headers:{Urgency:"high",TTL:"3600"}}});
    sent+=r.successCount;
    const dead=[];
    r.responses.forEach((x,k)=>{if(!x.success&&x.error&&["messaging/registration-token-not-registered","messaging/invalid-registration-token","messaging/invalid-argument"].includes(x.error.code))dead.push(part[k])});
    if(dead.length){const b=db.batch();dead.forEach(t=>b.delete(db.collection("pushTokens").doc(t)));await b.commit()}
  }
  return sent;
}
const isOpsOrTop=u=>u.top||OPS.includes(u.role);

// Новый заказ: всем, кто работает с заказами
exports.pushNewOrder=onDocumentCreated({...OPT,document:"orders/{id}"},async e=>{
  const o=e.data&&e.data.data();if(!o)return;
  await push("ord",u=>u.top||ALLW.includes(u.role),{loc:o.loc||"main",title:"🌸 Новый заказ",body:[o.bn||"Букет",o.client,((o.date||"")+" "+(o.time||"")).trim()].filter(Boolean).join(" · "),tag:"ord_"+e.params.id,url:"/?o="+e.params.id},o.by);
});

// Статусы заказа: готов к приёмке, переделка, назначена доставка
exports.pushOrderChange=onDocumentUpdated({...OPT,document:"orders/{id}"},async e=>{
  const a=e.data.before.data(),b=e.data.after.data(),id=e.params.id,name=b.bn||"Букет";
  if(b.rv==="wait"&&a.rv!=="wait")
    await push("ready",u=>isOpsOrTop(u),{loc:b.loc||"main",title:"✅ Заказ готов, нужна приёмка",body:name+(b.client?" · "+b.client:""),tag:"rv_"+id,url:"/?o="+id},b.asm||b.by);
  if(b.rv==="redo"&&a.rv!=="redo"&&b.asm)
    await push("ready",u=>u.uid===b.asm,{title:"↩ Заказ на переделку",body:name+(b.redoNote?": "+b.redoNote:""),tag:"redo_"+id,url:"/?o="+id});
  if(b.xfSt==="wait"&&a.xfSt!=="wait"&&b.xfTo)
    await push("ord",u=>u.uid===b.xfTo,{title:"🔁 Передача заказа",body:name+" · передаёт "+(b.xfFrom||"флорист")+", ответь в течение минуты",tag:"xf_"+id,url:"/?o="+id},b.xfFrom);
  // выставили на доставку — всем курьерам на смене
  if(b.dv&&b.dvPost&&!a.dvPost&&!b.courier)
    await push("courier",u=>u.role==="courier",{title:"🚚 Новая доставка",body:[name,b.time?"к "+b.time:"",b.addr].filter(Boolean).join(" · "),tag:"dvp_"+id,url:"/?o="+id});
  if(b.courier&&b.courier!==a.courier)
    await push("courier",u=>u.uid===b.courier,{title:"🚚 Вам назначена доставка",body:[name,b.addr,b.time].filter(Boolean).join(" · "),tag:"cur_"+id,url:"/?o="+id});
  if(b.rqK&&b.rqT&&b.rqT!==a.rqT)
    await push("ord",u=>ALLW.includes(u.role),{loc:b.loc||"main",title:b.rqK==="cx"?"⚠ Запрос на отмену заказа":"⚠ Запрос на скидку",body:[name,b.rqK==="p"&&b.rqP?"цена до "+b.rqP+" ₸":"",b.rqWhy,b.rqN].filter(Boolean).join(" · "),tag:"rq_"+id,url:"/?o="+id},b.rqBy);
  if(a.courier&&!b.courier&&b.cRelAt&&b.cRelAt!==a.cRelAt)
    await push("ord",u=>isOpsOrTop(u),{loc:b.loc||"main",title:"🚚 Курьер отказался от доставки",body:name+(b.cRelNote?": "+b.cRelNote:""),tag:"crel_"+id,url:"/?o="+id},a.courier);
});

// Новая заявка
exports.pushNewLead=onDocumentCreated({...OPT,document:"leads/{id}"},async e=>{
  const l=e.data&&e.data.data();if(!l)return;
  await push("lead",isOpsOrTop,{loc:l.loc||"",title:"✉ Новая заявка",body:[l.name||l.client,l.phone,l.note||l.text].filter(Boolean).join(" · "),tag:"lead_"+e.params.id,url:"/?tab=leads"},l.by);
});

// Новое сообщение клиента в чате
exports.pushClientMsg=onDocumentCreated({...OPT,document:"chats/{cid}/msgs/{mid}"},async e=>{
  const m=e.data&&e.data.data();if(!m||m.dir!=="in")return;
  const c=await admin.firestore().doc("chats/"+e.params.cid).get(),cd=c.exists?c.data():{},name=cd.name||cd.phone||"Клиент",mu=cd.mu||{},now=Date.now();
  // откуда: точка чата (если указана), иначе канал
  let from=({wa:"WhatsApp",ig:"Instagram",tg:"Telegram",gis:"2ГИС"})[cd.ch]||"";
  if(cd.loc){try{const l=await admin.firestore().doc("locations/"+cd.loc).get();if(l.exists&&l.data().name)from=l.data().name+(from?" · "+from:"")}catch(x){}}
  // кто выключил уведомления этого чата на время — тому не шлём
  await push("chat",u=>isOpsOrTop(u)&&!((+mu[u.uid]||0)>now),{loc:cd.loc||"main",title:"💬 "+name+(from?" · "+from:""),body:m.t||(m.img?"📷 Фото":"Новое сообщение"),tag:"chat_"+e.params.cid,url:"/?tab=chats"});
});

// Новый отчёт сотрудника: админам и владельцам
exports.pushNewReport=onDocumentCreated({...OPT,document:"reports/{id}"},async e=>{
  const r=e.data&&e.data.data();if(!r)return;
  const T={show:"Витрина",desk:"Рабочее место",op:"Смена оператора",wo:"Списание — проверьте и примите"};
  const bad=r.type==="desk"?r.cl==="dirty":r.type==="show"?r.fresh==="bad"||r.fresh==="mid":Array.isArray(r.ck)&&r.ck.some(x=>!x);
  await push("rep",u=>u.top||u.role==="admin",{loc:r.loc||"main",title:r.type==="op"&&r.kas==="bad"?"❗ Касса не сходится":(bad?"⚠ ":"📋 ")+"Отчёт: "+(T[r.type]||r.type),body:(r.byName||"")+(r.type==="op"&&r.kas==="bad"?(r.kasd?" · расхождение "+r.kasd+" ₸":"")+(r.note?" · "+String(r.note).slice(0,80):""):(bad?" · есть замечания":"")),imp:r.type==="op"&&r.kas==="bad",tag:"rep_"+e.params.id,url:"/?tab=rep"},r.by);
});

// Напоминание об отчётах: через 30 минут после времени показа отчётов (settings.rpAt, по умолчанию 23:00 → 23:30, время Актау).
// Кому: тем, кто сейчас на смене (shiftLog без end), если на их точке за рабочий день (сейчас − 4 ч) не сданы их отчёты.
const RPW={assistant:["show","desk"],florist:["desk","op"],operator:["op","desk"]},RPN={show:"Витрина",desk:"Рабочее место",op:"Смена: касса"};
exports.pushReportReminder=onSchedule({...OPT,schedule:"*/30 * * * *",timeZone:TZ},async()=>{
  const db=admin.firestore(),now=Date.now(),s=await db.doc("settings/main").get(),sh=s.exists?s.data():{};
  const [h,m]=String(sh.rpAt||"23:00").split(":").map(Number),tgt=((h*60+(m||0)+30)%1440);
  const loc=new Date(now).toLocaleTimeString("ru-RU",{timeZone:TZ,hour:"2-digit",minute:"2-digit",hour12:false}).split(":").map(Number),cur=loc[0]*60+loc[1];
  if(((cur-tgt+1440)%1440)>=30)return; // запускается раз в 30 минут — шлём только в слоте сразу после rpAt + 30 мин
  const day=new Date(now-4*36e5).toLocaleDateString("sv-SE",{timeZone:TZ});
  const [ls,st,dn]=await Promise.all([db.collection("shiftLog").where("start",">=",now-20*36e5).get(),db.collection("staff").get(),db.collection("rpDone").where("date","==",day).get()]);
  const done=new Set();dn.forEach(d=>done.add(d.id));const role={};st.forEach(d=>role[d.id]=d.data().role);
  const miss={};ls.forEach(d=>{const x=d.data();if(!x.uid||x.end)return;const t=(RPW[role[x.uid]]||[]).filter(k=>!done.has(day+"_"+(x.loc||"main")+"_"+k));if(t.length)miss[x.uid]=t});
  for(const uid of Object.keys(miss))await push("remind",u=>u.uid===uid,{title:"📋 Сдайте отчёт за смену",body:"Не сдано: "+miss[uid].map(k=>RPN[k]).join(", ")+". Если есть что списать — сдайте «Списание»",url:"/?tab=rep",tag:"remind_"+day});
});

// Проверка: прислать push самому себе
exports.pushTest=onCall({...OPT,invoker:"public"},async req=>{
  if(!req.auth)throw new HttpsError("unauthenticated","Войдите в систему");
  let n;
  try{n=await push("test",u=>u.uid===req.auth.uid,{title:"🔔 Проверка уведомлений",body:"Всё работает: push приходят на это устройство",tag:"test"})}
  catch(err){console.error("pushTest",err);const m=String(err&&(err.code||"")+" "+(err.message||err));
    throw new HttpsError("internal",/SERVICE_DISABLED|has not been used|is disabled/i.test(m)?"Не включён сервис Firebase Cloud Messaging API в Google Cloud":"Push не отправлен: "+m.slice(0,250))}
  if(!n)throw new HttpsError("failed-precondition","Нет активных устройств. Включите push в Профиле");
  return{ok:true,sent:n};
});

// ================= ОСТАТКИ: «ЗАКАНЧИВАЕТСЯ» =================
// Срабатывает один раз, когда остаток опускается до минимума (или ниже) с уровня выше минимума
exports.pushLowStock=onDocumentUpdated({...OPT,document:"inventory/{id}"},async e=>{
  const a=e.data.before.data(),b=e.data.after.data(),m=+b.min||0;
  // склады по точкам: проверяем остаток каждой точки отдельно, уведомление — сотрудникам этой точки
  const keys=b.qs?Object.keys(b.qs):[""];
  for(const k of keys){
  const qa=k?(+(((a.qs||{})[k])??(k==="main"?a.qty:0))||0):(+a.qty||0),qb=k?(+b.qs[k]||0):(+b.qty||0);
  if(!(qa>m&&qb<=m))continue;
  const out=qb<=0,u=b.unit||"";
  await push("stock",x=>x.top||ALLW.includes(x.role),{...(k?{loc:k}:{}),imp:out,title:out?"❗ Закончилось: "+b.name:"⚠ Заканчивается: "+b.name,body:out?"На складе 0 "+u:"Осталось "+qb+" "+u+(m?", минимум "+m:""),tag:"stock_"+e.params.id});
  }
});

// ================= СТРАНИЦА СТАТУСА ДЛЯ КЛИЕНТА =================
// Ссылка /s/<токен> → status.html → /api/status?t=<токен>. Отдаёт только безопасные поля, без имени, телефона, адреса и цен
exports.orderStatus=onRequest({...OPT,maxInstances:5},async(req,res)=>{
  res.set("Cache-Control","no-store");
  const t=String(req.query.t||"");
  if(!/^[a-f0-9]{24}$/.test(t))return res.status(404).json({error:"not_found"});
  const db=admin.firestore();
  const q=await db.collection("orders").where("pub","==",t).limit(1).get();
  if(q.empty)return res.status(404).json({error:"not_found"});
  const o=q.docs[0].data(),s=await db.doc("settings/main").get(),sh=s.exists?s.data():{};
  res.json({shop:sh.name||"",phone:sh.phone||"",bn:o.bn||"",st:+o.st||0,dv:!!o.dv,date:o.date||"",time:o.time||""});
});

// ================= АВТОКОПИЯ =================
// Каждую ночь пишет JSON в Cloud Storage (бакет по умолчанию): backups/ГГГГ-ММ-ДД/<коллекция>.json, хранит 14 дней
const BK_COLS=["orders","customers","inventory","stockMovements","showcase","bouquets","leads","deals","reports","builds","shifts","staff","activityLogs","chats","expenses","invcost","settings","locations","team"];
const BK_DAYS=14;
const ser=function(k,v){const r=this[k];return r&&typeof r.toMillis==="function"?{ts:r.toMillis()}:v};
async function runBackup(){
  const db=admin.firestore(),bucket=admin.storage().bucket(),day=new Date().toLocaleDateString("sv-SE",{timeZone:TZ});
  let files=0;
  try{
    for(const col of BK_COLS){
      let last=null,part=0;
      for(;;){
        let q=db.collection(col).orderBy(FieldPath.documentId()).limit(200);
        if(last)q=q.startAfter(last);
        const s=await q.get();
        if(s.empty)break;
        const out=[];
        for(const d of s.docs){
          const x={id:d.id,...d.data()};
          if(col==="chats"){const m=await d.ref.collection("msgs").get();x.msgs=m.docs.map(y=>({id:y.id,...y.data()}))}
          out.push(x);
        }
        part++;
        await bucket.file(`backups/${day}/${col}${part>1?"-"+part:""}.json`).save(JSON.stringify(out,ser),{contentType:"application/json"});
        files++;last=s.docs[s.docs.length-1];
        if(s.size<200)break;
      }
    }
    // удаляем копии старше BK_DAYS дней
    const [all]=await bucket.getFiles({prefix:"backups/"}),lim=Date.now()-BK_DAYS*864e5;
    for(const f of all){const m=f.name.match(/^backups\/(\d{4}-\d{2}-\d{2})\//);if(m&&Date.parse(m[1])<lim)await f.delete().catch(()=>{})}
    await db.doc("settings/main").set({lastBackup:{at:Date.now(),ok:true,files}},{merge:true});
    return files;
  }catch(err){
    await db.doc("settings/main").set({lastBackup:{at:Date.now(),ok:false,err:String(err.message||err).slice(0,200)}},{merge:true}).catch(()=>{});
    throw err;
  }
}
exports.dailyBackup=onSchedule({...OPT,schedule:"0 3 * * *",timeZone:TZ,memory:"1GiB",timeoutSeconds:540},async()=>{await runBackup()});
exports.backupNow=onCall({...OPT,memory:"1GiB",timeoutSeconds:540},async req=>{
  if(!req.auth)throw new HttpsError("unauthenticated","Войдите в систему");
  if(!TOP.includes(String(req.auth.token.email||"").toLowerCase()))throw new HttpsError("permission-denied","Только владелец и главный админ");
  try{return{ok:true,files:await runBackup()}}catch(err){throw new HttpsError("internal","Копия не сохранена: "+(err.message||err))}
});

// WhatsApp, Instagram, Telegram
Object.assign(exports,require("./channels"));

// ================= ОТЗЫВ ПОСЛЕ ДОСТАВКИ =================
// Заказ стал «Выдан/Доставлен» → через час (rvAskAt) в чат клиента уходит просьба оценить букет со ссылкой на
// status.html. Оценку клиент ставит там: создаётся reviews/{токен}; сервер переносит её в заказ (rate),
// плохую (1–3) сразу шлёт push админам и владельцу. Заказы без чата (покупатель с улицы) пропускаются.
const crypto=require("crypto");
const SITE_DEF="https://leadboost-fast.github.io/MirFlowerBase/";
const RV_DELAY=60*60*1000;
async function pubDoc(db,ref,o,sh){
  let k=String(o.pub||"");
  if(!/^[a-f0-9]{24}$/.test(k)){k=crypto.randomBytes(12).toString("hex");await ref.update({pub:k})}
  const rev=((sh.revUrl||{})[o.loc||"main"])||((sh.revUrl||{}).all)||"";
  await db.doc("pubOrders/"+k).set({bn:o.bn||"",st:+o.st||0,dv:!!o.dv,date:o.date||"",time:o.time||"",shop:sh.name||"",phone:sh.phone||"",rev,ts:Date.now()},{merge:true});
  return k;
}
async function chatOf(db,o){
  const ids=[o.chat,o.pk||String(o.phone||"").replace(/\D/g,"")?"wa_"+(o.pk||String(o.phone||"").replace(/\D/g,"")):""].filter(Boolean);
  for(const id of ids){const c=await db.doc("chats/"+id).get();if(c.exists){const d=c.data();if(d.grp&&d.grp!==id){const g=await db.doc("chats/"+d.grp).get();if(g.exists)return g}return c}}
  return null;
}
exports.reviewArm=onDocumentUpdated({...OPT,document:"orders/{id}"},async e=>{
  const a=e.data.before.data(),b=e.data.after.data();
  if(!(+b.st===4&&+a.st!==4)||b.rate||b.rvAsked||b.rvAskAt)return;
  await e.data.after.ref.update({rvAskAt:Date.now()+RV_DELAY});
});
exports.reviewAsk=onSchedule({...OPT,schedule:"*/15 * * * *",timeZone:TZ},async()=>{
  const db=admin.firestore(),now=Date.now(),q=await db.collection("orders").where("rvAskAt","<=",now).limit(40).get();
  if(q.empty)return;
  const s=await db.doc("settings/main").get(),sh=s.exists?s.data():{};
  const del=FV.delete();
  for(const d of q.docs){const o=d.data();
    try{
      if(sh.revOff||+o.st!==4||o.rate){await d.ref.update({rvAskAt:del,rvAsked:"skip"});continue}
      const c=await chatOf(db,o);
      if(!c){await d.ref.update({rvAskAt:del,rvAsked:"nochat"});continue}
      const cd=c.data();
      // WhatsApp и Instagram разрешают писать первыми только 24 часа после последнего сообщения клиента
      if(["wa","ig"].includes(cd.ch)&&cd.lastInTs&&now-cd.lastInTs>23.5*36e5){await d.ref.update({rvAskAt:del,rvAsked:"window"});continue}
      if(cd.ch==="gis"){await d.ref.update({rvAskAt:del,rvAsked:"nochat"});continue}
      const k=await pubDoc(db,d.ref,o,sh),link=String(sh.siteUrl||SITE_DEF).replace(/\/?$/,"/")+"status.html?t="+k;
      const t=String(sh.revMsg||"Спасибо, что выбрали {shop}! Оцените, пожалуйста, букет — это займёт 10 секунд: {link}").replace("{shop}",sh.name||"нас").replace("{link}",link);
      const b=db.batch(),ts=Date.now();
      b.set(c.ref.collection("msgs").doc(),{dir:"out",t,ts,by:"",byName:"Авто: отзыв",st:"pending",auto:"review",oid:d.id});
      b.update(c.ref,{last:t,lastDir:"out",lastTs:ts});
      b.update(d.ref,{rvAskAt:del,rvAsked:ts,pub:k});
      await b.commit();
    }catch(err){console.error("reviewAsk",d.id,err);await d.ref.update({rvAskAt:del,rvAsked:"err"}).catch(()=>{})}
  }
});
exports.reviewIn=onDocumentCreated({...OPT,document:"reviews/{tok}"},async e=>{
  const r=e.data&&e.data.data();if(!r)return;
  const db=admin.firestore(),q=await db.collection("orders").where("pub","==",e.params.tok).limit(1).get();
  if(q.empty)return;
  const od=q.docs[0],o=od.data(),s=Math.max(1,Math.min(5,Math.round(+r.s||0))),c=String(r.c||"").slice(0,500);
  await od.ref.update({rate:{s,c,at:Date.now()}});
  if(s<=3)await push("ord",u=>u.top||u.role==="admin",{imp:true,title:"⚠ Плохой отзыв: "+"★".repeat(s)+"☆".repeat(5-s),body:[o.bn||"Букет",o.client,c].filter(Boolean).join(" · "),tag:"rate_"+od.id,url:"/?o="+od.id});
});
