const {onCall,onRequest,HttpsError}=require("firebase-functions/v2/https");
const {defineSecret}=require("firebase-functions/params");
const {onDocumentCreated,onDocumentUpdated}=require("firebase-functions/v2/firestore");
const {onSchedule}=require("firebase-functions/v2/scheduler");
const admin=require("firebase-admin");
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
// Если при деплое ошибка региона, укажите регион базы Firestore, например OPT={region:"europe-west1"}
const OPT={};
const TZ="Asia/Aqtau",OPS=["admin","operator","florist","assistant"],ALLW=["admin","operator","florist","assistant"];

// type: ord | ready | courier | lead | chat | rep | remind (сотрудник может отключить любой тип)
// who({uid,role,top}) решает, кому отправить; exclude — кому не слать (автор действия)
async function push(type,who,msg,exclude){
  const db=admin.firestore();
  const [st,tk]=await Promise.all([db.collection("staff").get(),db.collection("pushTokens").get()]);
  const S={};st.forEach(d=>S[d.id]=d.data());
  const toks=[];
  tk.forEach(d=>{const t=d.data(),p=S[t.uid];
    if(!p||p.active!==true||t.uid===exclude)return;
    if(t.ev&&t.ev[type]===false)return;
    const top=TOP.includes(String(p.email||"").toLowerCase());
    if(who({uid:t.uid,role:p.role,top}))toks.push(d.id)});
  if(!toks.length)return 0;
  const data={title:String(msg.title||"Mirflowers"),body:String(msg.body||"").slice(0,200),tag:String(msg.tag||type),url:String(msg.url||"/")};
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
  await push("ord",u=>u.top||ALLW.includes(u.role),{title:"🌸 Новый заказ",body:[o.bn||"Букет",o.client,((o.date||"")+" "+(o.time||"")).trim()].filter(Boolean).join(" · "),tag:"ord_"+e.params.id,url:"/?o="+e.params.id},o.by);
});

// Статусы заказа: готов к приёмке, переделка, назначена доставка
exports.pushOrderChange=onDocumentUpdated({...OPT,document:"orders/{id}"},async e=>{
  const a=e.data.before.data(),b=e.data.after.data(),id=e.params.id,name=b.bn||"Букет";
  if(b.rv==="wait"&&a.rv!=="wait")
    await push("ready",u=>isOpsOrTop(u),{title:"✅ Заказ готов, нужна приёмка",body:name+(b.client?" · "+b.client:""),tag:"rv_"+id,url:"/?o="+id},b.asm||b.by);
  if(b.rv==="redo"&&a.rv!=="redo"&&b.asm)
    await push("ready",u=>u.uid===b.asm,{title:"↩ Заказ на переделку",body:name+(b.redoNote?": "+b.redoNote:""),tag:"redo_"+id,url:"/?o="+id});
  if(b.xfSt==="wait"&&a.xfSt!=="wait"&&b.xfTo)
    await push("ord",u=>u.uid===b.xfTo,{title:"🔁 Передача заказа",body:name+" · передаёт "+(b.xfFrom||"флорист")+", ответь в течение минуты",tag:"xf_"+id,url:"/?o="+id},b.xfFrom);
  if(b.courier&&b.courier!==a.courier)
    await push("courier",u=>u.uid===b.courier,{title:"🚚 Вам назначена доставка",body:[name,b.addr,b.time].filter(Boolean).join(" · "),tag:"cur_"+id,url:"/?o="+id});
  if(a.courier&&!b.courier&&b.cRelAt&&b.cRelAt!==a.cRelAt)
    await push("ord",u=>isOpsOrTop(u),{title:"🚚 Курьер отказался от доставки",body:name+(b.cRelNote?": "+b.cRelNote:""),tag:"crel_"+id,url:"/?o="+id},a.courier);
});

// Новая заявка
exports.pushNewLead=onDocumentCreated({...OPT,document:"leads/{id}"},async e=>{
  const l=e.data&&e.data.data();if(!l)return;
  await push("lead",isOpsOrTop,{title:"✉ Новая заявка",body:[l.name||l.client,l.phone,l.note||l.text].filter(Boolean).join(" · "),tag:"lead_"+e.params.id,url:"/?tab=leads"},l.by);
});

// Новое сообщение клиента в чате
exports.pushClientMsg=onDocumentCreated({...OPT,document:"chats/{cid}/msgs/{mid}"},async e=>{
  const m=e.data&&e.data.data();if(!m||m.dir!=="in")return;
  const c=await admin.firestore().doc("chats/"+e.params.cid).get(),name=(c.exists&&(c.data().name||c.data().phone))||"Клиент";
  await push("chat",isOpsOrTop,{title:"💬 "+name,body:m.t||(m.img?"📷 Фото":"Новое сообщение"),tag:"chat_"+e.params.cid,url:"/?tab=chats"});
});

// Новый отчёт сотрудника: админам и владельцам
exports.pushNewReport=onDocumentCreated({...OPT,document:"reports/{id}"},async e=>{
  const r=e.data&&e.data.data();if(!r)return;
  const T={show:"Витрина",desk:"Рабочее место",op:"Смена оператора"};
  const bad=r.type==="desk"?r.cl==="dirty":r.type==="show"?r.fresh==="bad"||r.fresh==="mid":Array.isArray(r.ck)&&r.ck.some(x=>!x);
  await push("rep",u=>u.top||u.role==="admin",{title:(bad?"⚠ ":"📋 ")+"Отчёт: "+(T[r.type]||r.type),body:(r.byName||"")+(bad?" · есть замечания":""),tag:"rep_"+e.params.id,url:"/?tab=rep"},r.by);
});

// Каждый вечер напоминание тем, кто работал по графику и не сдал отчёт
exports.pushReportReminder=onSchedule({...OPT,schedule:"0 20 * * *",timeZone:TZ},async()=>{
  const db=admin.firestore(),today=new Date().toLocaleDateString("sv-SE",{timeZone:TZ});
  const sh=await db.collection("shifts").where("date","==",today).get();
  const work=new Set();sh.forEach(d=>{const x=d.data();if(x.t==="work"&&x.uid)work.add(x.uid)});
  if(!work.size)return;
  const rp=await db.collection("reports").where("date","==",today).get();
  const done=new Set();rp.forEach(d=>done.add(d.data().by));
  const miss=new Set([...work].filter(u=>!done.has(u)));
  if(miss.size)await push("remind",u=>miss.has(u.uid)&&["florist","operator","assistant"].includes(u.role),{title:"📋 Сдайте отчёт за смену",body:"Витрина, рабочее место или смена оператора",url:"/?tab=rep",tag:"remind_"+today});
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
  const a=e.data.before.data(),b=e.data.after.data(),m=+b.min||0,qa=+a.qty||0,qb=+b.qty||0;
  if(!(qa>m&&qb<=m))return;
  const out=qb<=0,u=b.unit||"";
  await push("stock",x=>x.top||ALLW.includes(x.role),{title:out?"❗ Закончилось: "+b.name:"⚠ Заканчивается: "+b.name,body:out?"На складе 0 "+u:"Осталось "+qb+" "+u+(m?", минимум "+m:""),tag:"stock_"+e.params.id});
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
