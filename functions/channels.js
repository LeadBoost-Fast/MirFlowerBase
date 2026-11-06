// Каналы связи: WhatsApp (Cloud API), Instagram (API with Instagram Login), Telegram (Bot API).
//
// Входящие: webhook (waHook / igHook / tgHook) пишет диалог в chats/{ch}_{id} и сообщение в chats/{cid}/msgs,
//   в том же формате, что и тестовые сообщения сайта (chIn в index.html).
// Исходящие: сайт кладёт сообщение {dir:"out", st:"pending"}; sendChannelMsg отправляет его через API
//   и ставит st:"sent" или st:"failed" с причиной в поле err.
// Ключи лежат в secrets/channels (сайт пишет, но прочитать не может), включён ли канал: settings/main.channels.
const {onCall,onRequest,HttpsError}=require("firebase-functions/v2/https");
const {onDocumentCreated}=require("firebase-functions/v2/firestore");
const admin=require("firebase-admin");
const crypto=require("crypto");

// Регион функций с триггерами базы. Если при деплое ошибка региона, укажите регион базы Firestore,
// например OPT={region:"europe-west1"}, то же самое в index.js
const OPT={};
const TOP=["tilegen615@gmail.com","nash0082008@icloud.com"];
const GRAPH="https://graph.facebook.com/v21.0",IGRAPH="https://graph.instagram.com/v21.0";

const db=()=>admin.firestore();
async function keys(ch){const s=await db().doc("secrets/channels").get();return (s.exists&&s.data()[ch])||{}}
async function isOn(ch){const s=await db().doc("settings/main").get();return !!(s.exists&&((s.data().channels||{})[ch]||{}).on)}
const dg=x=>String(x||"").replace(/\D/g,"");
const cut=(t,n)=>String(t||"").slice(0,n);

// Проверка подписи Meta (X-Hub-Signature-256), если в CRM указан App Secret
function metaSigOk(req,secret){
  if(!secret)return true;
  const sig=String(req.get("x-hub-signature-256")||"");
  if(!sig.startsWith("sha256=")||!req.rawBody)return false;
  const exp="sha256="+crypto.createHmac("sha256",secret).update(req.rawBody).digest("hex");
  const a=Buffer.from(sig),b=Buffer.from(exp);
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
}

// Подтверждение адреса webhook при «Verify and save» в Meta
function metaVerify(req,res,k){
  if(req.query["hub.mode"]==="subscribe"&&k.verify&&req.query["hub.verify_token"]===k.verify)return res.status(200).send(String(req.query["hub.challenge"]||""));
  return res.status(403).send("verify token mismatch");
}

// Входящее сообщение → диалог + сообщение. mid: id сообщения в канале (защита от повторной доставки)
async function incoming(o){
  const cid=o.ch+"_"+o.key,ref=db().collection("chats").doc(cid),ts=Date.now(),inc=admin.firestore.FieldValue.increment;
  const mk=cut(String(o.mid||"").replace(/[\/.#$\[\]]/g,"_"),300),mref=mk?ref.collection("msgs").doc(mk):ref.collection("msgs").doc();
  await db().runTransaction(async t=>{
    const [c,m]=await Promise.all([t.get(ref),t.get(mref)]);
    if(m.exists)return; // уже записано
    const base={last:cut(o.t,500),lastDir:"in",lastTs:ts,unread:inc(1),nIn:inc(1),st:"open"};
    if(c.exists){const up={...base};if(o.name&&(!c.data().name||c.data().name==="Без имени"))up.name=o.name;if(o.extId)up.extId=String(o.extId);t.update(ref,up)}
    else t.set(ref,{...base,ch:o.ch,name:o.name||"Без имени",phone:o.phone||"",handle:o.handle||"",extId:String(o.extId||""),loc:"",resp:"",nOut:0,firstTs:ts,firstReplyTs:0,leadId:"",ts});
    t.set(mref,{dir:"in",t:cut(o.t,4000),ts,...(o.img?{img:o.img}:{}),ext:true});
  });
}

// ================= WhatsApp =================
const waText=m=>m.type==="text"?(m.text&&m.text.body)||"":
  m.type==="image"?"📷 Фото"+(m.image&&m.image.caption?": "+m.image.caption:""):
  m.type==="video"?"🎬 Видео"+(m.video&&m.video.caption?": "+m.video.caption:""):
  m.type==="audio"?"🎤 Голосовое сообщение":m.type==="document"?"📎 Файл"+(m.document&&m.document.filename?": "+m.document.filename:""):
  m.type==="sticker"?"Стикер":m.type==="location"?"📍 Геолокация"+(m.location?": https://maps.google.com/?q="+m.location.latitude+","+m.location.longitude:""):
  m.type==="contacts"?"👤 Контакт":m.type==="button"?(m.button&&m.button.text)||"":
  m.type==="interactive"?((m.interactive&&(m.interactive.button_reply||m.interactive.list_reply)||{}).title||""):
  m.type==="reaction"?"":"Сообщение ("+m.type+")";

exports.waHook=onRequest({maxInstances:10},async(req,res)=>{
  const k=await keys("wa");
  if(req.method==="GET")return metaVerify(req,res,k);
  if(req.method!=="POST")return res.status(405).send("");
  if(!metaSigOk(req,k.secret))return res.status(401).send("bad signature");
  if(!(await isOn("wa")))return res.status(200).send("off");
  try{
    for(const e of (req.body&&req.body.entry)||[])for(const ch of e.changes||[]){
      const v=ch.value||{};if(ch.field&&ch.field!=="messages")continue;
      if(k.phoneId&&v.metadata&&v.metadata.phone_number_id&&String(v.metadata.phone_number_id)!==String(k.phoneId))continue;
      const names={};(v.contacts||[]).forEach(c=>names[c.wa_id]=c.profile&&c.profile.name);
      for(const m of v.messages||[]){
        const t=waText(m);if(!t)continue;
        const ph=dg(m.from);
        await incoming({ch:"wa",key:ph,mid:m.id,t,name:names[m.from]||"",phone:"+"+ph,extId:ph});
      }
      // статусы доставки исходящих: отмечаем, если WhatsApp не смог доставить
      for(const s of v.statuses||[]){
        if(s.status!=="failed")continue;
        const x=await db().doc("waOut/"+String(s.id).replace(/\//g,"_")).get();
        if(x.exists&&x.data().path){const er=(s.errors||[])[0]||{};await db().doc(x.data().path).update({st:"failed",err:cut(waErr(er.code,er.title||er.message),300)}).catch(()=>{})}
      }
    }
  }catch(err){console.error("waHook",err)}
  res.status(200).send("ok"); // Meta повторяет доставку, если ответ не 200
});

const waErr=(code,msg)=>+code===131047?"Прошло больше 24 часов после последнего сообщения клиента. WhatsApp разрешает писать только по одобренному шаблону":
  +code===131026?"Клиент не может получить сообщение (нет WhatsApp или старая версия)":
  +code===190?"Токен WhatsApp недействителен: вставьте постоянный токен заново":
  (msg||"ошибка WhatsApp")+(code?" ("+code+")":"");

async function waSend(k,to,t,img){
  if(!k.token||!k.phoneId)throw new Error("Не заданы токен или Phone number ID WhatsApp");
  const body=img?{messaging_product:"whatsapp",to,type:"image",image:{link:img,...(t?{caption:cut(t,1024)}:{})}}:
    {messaging_product:"whatsapp",to,type:"text",text:{body:cut(t,4096),preview_url:true}};
  const r=await fetch(GRAPH+"/"+encodeURIComponent(k.phoneId)+"/messages",{method:"POST",headers:{"Authorization":"Bearer "+k.token,"Content-Type":"application/json"},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.error){const e=j.error||{};throw new Error(waErr(e.code,e.error_data&&e.error_data.details||e.message||("HTTP "+r.status)))}
  return (j.messages&&j.messages[0]&&j.messages[0].id)||"";
}

// ================= Instagram =================
exports.igHook=onRequest({maxInstances:10},async(req,res)=>{
  const k=await keys("ig");
  if(req.method==="GET")return metaVerify(req,res,k);
  if(req.method!=="POST")return res.status(405).send("");
  if(!metaSigOk(req,k.secret))return res.status(401).send("bad signature");
  if(!(await isOn("ig")))return res.status(200).send("off");
  try{
    const b=req.body||{};
    for(const e of b.entry||[]){
      const me=String(e.id||"");
      const evs=[...(e.messaging||[]),...((e.changes||[]).filter(c=>c.field==="messages").map(c=>c.value))];
      for(const ev of evs){
        const m=ev&&ev.message;if(!m||m.is_echo||m.is_deleted)continue;
        const from=String(ev.sender&&ev.sender.id||"");if(!from||from===me)continue;
        let t=m.text||"";
        const att=(m.attachments||[])[0];
        if(!t&&att)t=att.type==="image"?"📷 Фото":att.type==="video"?"🎬 Видео":att.type==="audio"?"🎤 Голосовое сообщение":att.type==="story_mention"?"Отметил(а) магазин в истории":att.type==="share"?"Поделился(ась) публикацией":"Вложение";
        if(!t)continue;
        const p=await igProfile(k,from);
        await incoming({ch:"ig",key:from,mid:m.mid,t,name:p.name||p.username||"",handle:p.username||"",extId:from,img:att&&att.type==="image"&&att.payload&&att.payload.url||""});
      }
    }
  }catch(err){console.error("igHook",err)}
  res.status(200).send("ok");
});

async function igProfile(k,id){
  if(!k.token)return{};
  try{const r=await fetch(IGRAPH+"/"+encodeURIComponent(id)+"?fields=name,username",{headers:{"Authorization":"Bearer "+k.token}});return r.ok?await r.json():{}}catch(e){return{}}
}

const igErr=e=>+e.code===190?"Токен Instagram истёк или недействителен: создайте новый (шаг 9.1) и вставьте в CRM":
  +e.code===10||+e.error_subcode===2534022?"Прошло больше 24 часов после последнего сообщения клиента, Instagram не разрешает ответить":
  (e.message||"ошибка Instagram")+(e.code?" ("+e.code+")":"");

async function igSend(k,to,t,img){
  if(!k.token)throw new Error("Не задан токен Instagram");
  const send=async message=>{
    const r=await fetch(IGRAPH+"/me/messages",{method:"POST",headers:{"Authorization":"Bearer "+k.token,"Content-Type":"application/json"},body:JSON.stringify({recipient:{id:to},message})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||j.error)throw new Error(igErr(j.error||{message:"HTTP "+r.status}));
    return j.message_id||"";
  };
  let id="";
  if(img)id=await send({attachment:{type:"image",payload:{url:img}}});
  if(t)id=await send({text:cut(t,1000)});
  return id;
}

// ================= Telegram =================
exports.tgHook=onRequest({maxInstances:10},async(req,res)=>{
  if(req.method!=="POST")return res.status(405).send("");
  const k=await keys("tg");
  if(k.secret&&req.get("x-telegram-bot-api-secret-token")!==k.secret)return res.status(401).send("bad secret");
  if(!(await isOn("tg")))return res.status(200).send("off");
  try{
    const u=req.body||{},m=u.message||u.business_message;
    if(m&&m.chat&&m.chat.type==="private"&&!(m.from&&m.from.is_bot)){
      let t=m.text||m.caption||"";
      if(m.photo)t="📷 Фото"+(t?": "+t:"");
      else if(m.voice)t="🎤 Голосовое сообщение";
      else if(m.video)t="🎬 Видео"+(t?": "+t:"");
      else if(m.document)t="📎 Файл"+(m.document.file_name?": "+m.document.file_name:"");
      else if(m.sticker)t="Стикер "+(m.sticker.emoji||"");
      else if(m.location)t="📍 Геолокация: https://maps.google.com/?q="+m.location.latitude+","+m.location.longitude;
      else if(m.contact)t="👤 Контакт: "+[m.contact.first_name,m.contact.phone_number].filter(Boolean).join(" ");
      if(t==="/start")t="👋 Клиент открыл чат с ботом";
      if(t){
        const f=m.from||{},cid=String(m.chat.id);
        await incoming({ch:"tg",key:cid,mid:"tg"+cid+"_"+m.message_id,t,name:[f.first_name,f.last_name].filter(Boolean).join(" "),handle:f.username||"",
          phone:m.contact&&m.contact.user_id===f.id?"+"+dg(m.contact.phone_number):"",extId:cid});
      }
    }
  }catch(err){console.error("tgHook",err)}
  res.status(200).send("ok");
});

async function tgApi(token,method,body){
  const r=await fetch("https://api.telegram.org/bot"+token+"/"+method,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!j.ok){
    const d=String(j.description||"HTTP "+r.status);
    throw new Error(r.status===401||/unauthorized/i.test(d)?"Неверный токен бота: скопируйте его из @BotFather заново":
      /blocked by the user/i.test(d)?"Клиент заблокировал бота":/chat not found/i.test(d)?"Клиент ещё не писал боту":d);
  }
  return j.result;
}

async function tgSend(k,to,t,img){
  if(!k.token)throw new Error("Не задан токен бота Telegram");
  const r=img?await tgApi(k.token,"sendPhoto",{chat_id:to,photo:img,...(t?{caption:cut(t,1024)}:{})}):await tgApi(k.token,"sendMessage",{chat_id:to,text:cut(t,4096)});
  return r&&r.message_id?String(r.message_id):"";
}

// Кнопка «Сохранить и подключить»: регистрирует адрес tgHook у бота
exports.tgSetup=onCall(async req=>{
  if(!req.auth)throw new HttpsError("unauthenticated","Войдите в систему");
  if(!TOP.includes(String(req.auth.token.email||"").toLowerCase()))throw new HttpsError("permission-denied","Только владелец и главный админ");
  const url=String(req.data&&req.data.url||"");
  if(!/^https:\/\/[a-z0-9.-]+\/tgHook$/i.test(url))throw new HttpsError("invalid-argument","Неверный адрес webhook");
  const k=await keys("tg");
  if(!k.token)throw new HttpsError("failed-precondition","Сначала вставьте токен бота");
  let secret=String(k.secret||"");
  if(!/^[A-Za-z0-9_-]{1,256}$/.test(secret)){
    secret=crypto.randomBytes(16).toString("hex");
    await db().doc("secrets/channels").set({tg:{secret}},{merge:true});
  }
  try{
    const me=await tgApi(k.token,"getMe",{});
    await tgApi(k.token,"setWebhook",{url,secret_token:secret,allowed_updates:["message","business_message"],drop_pending_updates:false});
    await db().doc("settings/main").set({channels:{tg:{bot:me.username||""}}},{merge:true});
    return{ok:true,bot:me.username||""};
  }catch(err){throw new HttpsError("failed-precondition",String(err.message||err))}
});

// ================= Отправка исходящих =================
exports.sendChannelMsg=onDocumentCreated({...OPT,document:"chats/{cid}/msgs/{mid}",retry:false},async e=>{
  const m=e.data&&e.data.data();if(!m||m.dir!=="out"||m.st!=="pending")return;
  const cid=e.params.cid,ch=cid.split("_")[0];
  if(!["wa","ig","tg"].includes(ch))return;
  const ref=e.data.ref;
  if(!(await isOn(ch)))return; // канал выключен: сайт показывает «не отправлено: канал не подключён»
  try{
    const cs=await db().doc("chats/"+cid).get(),c=cs.exists?cs.data():{},k=await keys(ch),suf=cid.slice(ch.length+1);
    const img=typeof m.img==="string"&&/^https:\/\//.test(m.img)?m.img:"";
    const t=String(m.t||"");
    if(!t&&!img)throw new Error("Пустое сообщение");
    let id="";
    if(ch==="wa"){const to=dg(c.extId)||dg(c.phone)||dg(suf);if(!to)throw new Error("Нет номера клиента");id=await waSend(k,to,t,img)}
    else if(ch==="ig"){const to=String(c.extId||suf);if(!/^\d+$/.test(to))throw new Error("Это тестовый диалог: в Instagram такого клиента нет");id=await igSend(k,to,t,img)}
    else{const to=String(c.extId||suf);if(!/^-?\d+$/.test(to))throw new Error("Это тестовый диалог: в Telegram такого клиента нет");id=await tgSend(k,to,t,img)}
    await ref.update({st:"sent",sentAt:Date.now(),...(id?{extMid:id}:{})});
    // для WhatsApp запоминаем, какое это сообщение: если доставка не удастся, waHook отметит его ошибкой
    if(ch==="wa"&&id)await db().doc("waOut/"+id.replace(/\//g,"_")).set({path:ref.path,ts:Date.now()}).catch(()=>{});
  }catch(err){
    await ref.update({st:"failed",err:cut(err.message||err,300)}).catch(()=>{});
  }
});
