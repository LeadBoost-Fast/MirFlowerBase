// Каналы связи: WhatsApp (Cloud API), Instagram (Messenger Platform), Telegram (бот).
// Входящие: webhook → chats/{канал_ключ} + msgs (формат тот же, что в chIn на сайте).
// Исходящие: сайт пишет msgs с dir:"out", st:"pending" → sendChannelMsg отправляет и ставит "sent" или "failed".
// Ключи лежат в secrets/channels (пишет владелец, с сайта читать нельзя, читает только сервер).
const {onCall,onRequest,HttpsError}=require("firebase-functions/v2/https");
const {onDocumentCreated}=require("firebase-functions/v2/firestore");
const admin=require("firebase-admin");
const {FieldValue:FV}=require("firebase-admin/firestore");
const crypto=require("crypto");
if(!admin.apps.length)admin.initializeApp();

const OPT={}; // тот же регион, что и в index.js
const TOP=["tilegen615@gmail.com","nash0082008@icloud.com"];
const G="https://graph.facebook.com/v21.0";
const CT={"Content-Type":"application/json"};
const db=()=>admin.firestore();

// ---------- вспомогательное ----------
async function secretsOf(k){const s=await db().doc("secrets/channels").get();return (s.exists&&s.data()[k])||{}}
async function isOn(k){const s=await db().doc("settings/main").get();return !!((((s.exists&&s.data())||{}).channels||{})[k]||{}).on}
async function jf(url,opt){const r=await fetch(url,opt);let j={};try{j=await r.json()}catch(e){}return{ok:r.ok,status:r.status,j:j||{}}}
const gerr=r=>{const e=r.j.error||{};return (e.message||r.j.description||("HTTP "+r.status))+(e.code?" ("+e.code+")":"")};
const safe=s=>String(s).replace(/[^A-Za-z0-9_-]/g,"_").slice(0,120);
const EXT={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/pdf":"pdf","audio/mp4":"m4a","audio/mpeg":"mp3","audio/ogg":"ogg","audio/aac":"aac","video/mp4":"mp4","application/msword":"doc","application/vnd.openxmlformats-officedocument.wordprocessingml.document":"docx","application/vnd.ms-excel":"xls","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"xlsx","text/plain":"txt","image/heic":"heic"};

// Сохраняем файл в Storage и отдаём постоянную ссылку с токеном (её открывают WhatsApp/Instagram/Telegram и сайт)
async function saveBuf(buf,ct,dir){
  const bucket=admin.storage().bucket(),token=crypto.randomUUID();
  const path=`chmedia/${safe(dir)}/${Date.now()}_${crypto.randomBytes(3).toString("hex")}.${EXT[ct]||"bin"}`;
  await bucket.file(path).save(buf,{contentType:ct,metadata:{metadata:{firebaseStorageDownloadTokens:token}}});
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}
async function saveDataUrl(u,dir){
  const m=/^data:([^;,]+);base64,([\s\S]*)$/.exec(u);if(!m)throw new Error("Неверный формат фото");
  return saveBuf(Buffer.from(m[2],"base64"),m[1],dir);
}
async function getBuf(url,headers){
  const r=await fetch(url,{headers});if(!r.ok)throw new Error("Не скачалось: HTTP "+r.status);
  return{buf:Buffer.from(await r.arrayBuffer()),ct:(r.headers.get("content-type")||"image/jpeg").split(";")[0]};
}

// Входящее сообщение: создаёт/обновляет диалог так же, как chIn на сайте. Повтор того же mid игнорируется
// Точка по номеру/аккаунту, на который написал клиент (settings/main.locCh = {точка: {wa, ig}})
async function bizLoc(ch,biz){if(!biz)return"";try{const s=await db().doc("settings/main").get(),m=((s.exists&&s.data())||{}).locCh||{};for(const k of Object.keys(m))if(m[k]&&String(m[k][ch]||"")===String(biz))return k}catch(e){}return""}
async function ingest(o){
  const ref=db().collection("chats").doc(o.ch+"_"+o.key),mref=ref.collection("msgs").doc("m_"+safe(o.mid||Date.now()+"_"+Math.random()));
  if((await mref.get()).exists)return;
  const ts=Date.now(),inc=n=>FV.increment(n),s=await ref.get();
  const base={last:o.text||(o.img?"📷 Фото":""),lastDir:"in",lastTs:ts,lastInTs:ts,unread:inc(1),nIn:inc(1),st:"open"};
  if(s.exists){
    const upd={...base},d=s.data();
    if(d.lastDir==="out")upd.unread=1; // оператор уже ответил — считаем заново только новые сообщения клиента
    if(o.biz&&!d.biz)upd.biz=String(o.biz);
    if(o.wi!==undefined){upd.wi=String(o.wi);if(o.biz)upd.biz=String(o.biz)} // отвечаем с того номера, на который клиент написал последним
    if(!d.loc&&o.loc0)upd.loc=o.loc0;
    else if(!d.loc&&o.biz){const lc=await bizLoc(o.ch,o.biz);if(lc)upd.loc=lc}
    if(o.name&&(!d.name||d.name==="Без имени"))upd.name=o.name;
    await ref.update(upd);
  }else{
    let name=o.name||"",handle=o.handle||"";
    if(o.prof){try{const p=await o.prof();name=name||p.name||p.username||"";handle=handle||p.username||""}catch(e){}}
    const lc=o.loc0||await bizLoc(o.ch,o.biz);
    await ref.set({...base,...(o.wi!==undefined?{wi:String(o.wi)}:{}),ch:o.ch,name:name||"Без имени",phone:o.phone||"",handle,ext:String(o.ext||o.key),biz:String(o.biz||""),loc:lc,resp:"",nOut:0,firstTs:ts,firstReplyTs:0,leadId:"",ts});
  }
  await mref.set({dir:"in",t:o.text||"",...(o.img?{img:o.img}:{}),...(o.aud?{aud:o.aud}:{}),...(o.x||{}),ts});
}

function sigOk(req,secret){
  const h=String(req.get("x-hub-signature-256")||"").replace(/^sha256=/,""),raw=req.rawBody;
  if(!raw||!h)return false;
  const x=crypto.createHmac("sha256",secret).update(raw).digest("hex");
  return x.length===h.length&&crypto.timingSafeEqual(Buffer.from(x),Buffer.from(h));
}
// Проверка webhook у Meta (GET): отвечаем challenge, если токен проверки совпал
function metaVerify(req,res,cfg){
  if(req.query["hub.mode"]==="subscribe"&&cfg.verify&&req.query["hub.verify_token"]===cfg.verify)return res.status(200).send(String(req.query["hub.challenge"]));
  return res.sendStatus(403);
}

// ================= WhatsApp =================
async function waMedia(c,id,key){
  const r=await jf(`${G}/${id}`,{headers:{Authorization:"Bearer "+c.token}});
  if(!r.ok||!r.j.url)throw new Error("media");
  const f=await getBuf(r.j.url,{Authorization:"Bearer "+c.token});
  return saveBuf(f.buf,f.ct,"wa_"+key);
}
exports.waHook=onRequest({...OPT,maxInstances:10},async(req,res)=>{
  const c=await secretsOf("wa");
  if(req.method==="GET")return metaVerify(req,res,c);
  if(req.method!=="POST")return res.sendStatus(405);
  if(c.secret&&!sigOk(req,c.secret))return res.sendStatus(403);
  if(!(await isOn("wa")))return res.sendStatus(200);
  try{
    for(const en of (req.body&&req.body.entry)||[])for(const ch of en.changes||[]){
      const v=ch.value||{},names={};
      (v.contacts||[]).forEach(x=>{names[x.wa_id]=(x.profile||{}).name});
      for(const m of v.messages||[]){
        const from=String(m.from||"").replace(/\D/g,"");if(!from)continue;
        let text="",img="";
        if(m.type==="text")text=(m.text||{}).body||"";
        else if(m.type==="image"){text=(m.image||{}).caption||"";try{img=await waMedia(c,m.image.id,from)}catch(e){text=(text?text+"\n":"")+"[Фото не загрузилось, откройте в WhatsApp]"}}
        else if(m.type==="button")text=(m.button||{}).text||"";
        else if(m.type==="interactive"){const i=m.interactive||{};text=(i.button_reply||i.list_reply||{}).title||"[ответ]"}
        else if(m.type==="location")text="📍 Геопозиция: "+((m.location||{}).latitude)+", "+((m.location||{}).longitude);
        else if(m.type==="audio")text="🎤 Голосовое сообщение (откройте в WhatsApp)";
        else if(m.type==="sticker")text="🙂 Стикер";
        else text="["+m.type+"] откройте в WhatsApp";
        await ingest({ch:"wa",key:from,ext:from,phone:"+"+from,name:names[from]||"",text,img,mid:m.id,biz:(v.metadata||{}).phone_number_id||""});
      }
    }
  }catch(e){console.error("waHook",e)}
  res.sendStatus(200);
});

// ================= WhatsApp по QR-коду через Evolution API =================
const topOnly=req=>{
  if(!req.auth)throw new HttpsError("unauthenticated","Войдите в систему");
  if(!TOP.includes(String(req.auth.token.email||"").toLowerCase()))throw new HttpsError("permission-denied","Только владелец и главный админ");
};
// Несколько номеров WhatsApp (у каждой точки свой): номер "" — основной (secrets.wa / settings.channels.wa), остальные — secrets.waI[id] / settings.channels.waI[id]
const iidOf=x=>String(x||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,40);
async function cfgOf(i){const s=await db().doc("secrets/channels").get(),d=(s.exists&&s.data())||{},c=(i?(d.waI||{})[i]:d.wa)||{};
  if(c.mode==="green"||c.mode==="waha")c.mode="evo"; // Green API и WAHA убраны — остался только Evolution API
  if(!c.evurl){ // у номера нет своего адреса Evolution — берём у другого номера (сервер один на оба номера)
    const src=[d.wa||{},...Object.values(d.waI||{})].find(x=>x&&x.evurl);
    if(src){c.evurl=src.evurl;if(!c.evkey)c.evkey=src.evkey;if(!c.mode)c.mode="evo"}}
  return c}
async function setOf(i){const s=await db().doc("settings/main").get(),c=(((s.exists&&s.data())||{}).channels)||{};return (i?(c.waI||{})[i]:c.wa)||{}}
const waState=(st,i)=>db().doc("settings/main").set({channels:i?{waI:{[i]:{state:String(st||""),stateAt:Date.now()}}}:{wa:{state:String(st||""),stateAt:Date.now()}}},{merge:true});
async function greenCfg(i){ // имя осталось от прежней версии: настройки номера для Evolution API
  const c=await cfgOf(i);
  if(!c.evurl)throw new HttpsError("failed-precondition","Сначала сохраните адрес сервера Evolution API");
  c.mode="evo";return c;
}
// ---------- Evolution API (свой сервер, бесплатная программа; несколько номеров на одном сервере, фото отправляются) ----------
const eBase=c=>String(c.evurl||"").trim().replace(/\/+$/,""),eName=i=>"mirflowers"+(i?"_"+i:"");
async function eCall(c,method,path,body){
  const h={Accept:"application/json",apikey:String(c.evkey||"").trim(),...(body!==undefined?CT:{})};
  const r=await jf(eBase(c)+path,{method,headers:h,...(body!==undefined?{body:JSON.stringify(body)}:{})});
  if(!r.ok){const m=r.j.response&&r.j.response.message;const e=new Error("Evolution API: "+(Array.isArray(m)?m.join(", "):m||r.j.message||r.j.error||("HTTP "+r.status)));e.status=r.status;throw e}
  return r.j;
}
const EST={open:"authorized",close:"notAuthorized",connecting:"starting"};
async function eState(c,i){try{const j=await eCall(c,"GET","/instance/connectionState/"+eName(i));const st=(j.instance&&j.instance.state)||j.state||"";return EST[st]||st||"notAuthorized"}catch(e){if(e.status===404)return"stopped";throw e}}
const EVENTS=["MESSAGES_UPSERT","CONNECTION_UPDATE"];
// Исходящее, отправленное с самого телефона: тоже показываем в CRM
async function ingestOut(o){
  const ref=db().collection("chats").doc(o.ch+"_"+o.key),mref=ref.collection("msgs").doc("m_"+safe(o.mid||Date.now()+"_"+Math.random()));
  if((await mref.get()).exists)return;
  const ts=Date.now(),s=await ref.get(),base={last:o.text||(o.img?"Фото":""),lastDir:"out",lastTs:ts};
  if(s.exists)await ref.update({...base,unread:0,nOut:FV.increment(1)}); // оператор ответил с телефона — чат прочитан
  else await ref.set({...base,...(o.wi!==undefined?{wi:String(o.wi)}:{}),ch:o.ch,name:o.name||"Без имени",phone:o.phone||"",handle:"",ext:String(o.key),biz:"",loc:o.loc0||"",resp:"",nIn:0,nOut:1,unread:0,firstTs:ts,firstReplyTs:0,leadId:"",st:"open",ts});
  await mref.set({dir:"out",t:o.text||"",...(o.img?{img:o.img}:{}),...(o.aud?{aud:o.aud}:{}),...(o.x||{}),ts,st:"sent",sentAt:ts,via:"phone"});
}
// Уведомления Evolution API: messages.upsert (входящие и с телефона), connection.update
// Цитата: клиент ответил на конкретное сообщение (например, выбрал одно из присланных фото).
// Ищем исходное у себя (по id), иначе берём текст/миниатюру из самой цитаты
async function quoteOf(msg,m,key){
  let ci=m.contextInfo||null;
  if(!ci)for(const v of Object.values(msg||{}))if(v&&typeof v==="object"&&v.contextInfo){ci=v.contextInfo;break}
  if(!ci||!ci.stanzaId&&!ci.quotedMessage)return null;
  const id=String(ci.stanzaId||""),qm=ci.quotedMessage||{};
  if(id){try{
    const a=await db().collection("chats").doc("wa_"+key).collection("msgs").doc("m_"+safe(id)).get();
    if(a.exists){const y=a.data();return{t:String(y.t||"").slice(0,300),img:y.img||"",dir:y.dir||""}}
    const w=await db().doc("waSent/"+safe(id)).get();
    if(w.exists&&(w.data().t||w.data().img))return{t:String(w.data().t||""),img:w.data().img||"",dir:"out"};
  }catch(e){}}
  const qi=qm.imageMessage||qm.videoMessage||null,th=qi&&qi.jpegThumbnail;let img="";
  if(th){try{const b=typeof th==="string"?th:Buffer.from(Object.values(th)).toString("base64");if(b.length<60000)img="data:image/jpeg;base64,"+b}catch(e){}}
  const t=String(qm.conversation||(qm.extendedTextMessage||{}).text||(qi&&qi.caption)||(qm.documentMessage?"Файл: "+(qm.documentMessage.fileName||""):"")||(qm.audioMessage?"Голосовое сообщение":"")||(qi&&!img?"Фото":"")).slice(0,300);
  return t||img?{t,img,dir:ci.participant?"":"out"}:null;
}
exports.waEvoHook=onRequest({...OPT,maxInstances:10,minInstances:1,invoker:"public"},async(req,res)=>{
  if(req.method!=="POST")return res.sendStatus(405);
  const wi=iidOf(req.query.i),c=await cfgOf(wi),tok=String(c.gHook||"");
  if(!tok||req.query.k!==tok)return res.sendStatus(403);
  const b=req.body||{},ev=String(b.event||"").toLowerCase().replace(/_/g,"."),d=b.data||{};
  try{
    if(ev==="connection.update"){const st=d.state||"";await waState(EST[st]||st,wi);return res.sendStatus(200)}
    if(ev!=="messages.upsert")return res.sendStatus(200);
    const ws=await setOf(wi);if(!ws.on)return res.sendStatus(200);
    const list=Array.isArray(d)?d:(Array.isArray(d.messages)?d.messages:[d]);
    for(const m of list){
      const k=m.key||{},fromMe=!!k.fromMe;let jid=String(k.remoteJid||"");
      if(/@lid$/.test(jid)&&(k.remoteJidAlt||k.senderPn))jid=String(k.remoteJidAlt||k.senderPn);
      if(!/@(s\.whatsapp\.net|c\.us|lid)$/.test(jid))continue; // группы и статусы не берём
      const digits=jid.replace(/@.*/,"").replace(/\D/g,"");if(!digits)continue;
      const lid=/@lid$/.test(jid),key=lid?"lid"+digits:digits,sid=String(k.id||"");
      const msg=m.message||{},raw={key:k,message:Object.fromEntries(Object.entries(msg).filter(([x])=>x!=="base64"))},im=msg.imageMessage,ty=String(m.messageType||Object.keys(msg)[0]||"");
      let text=String(msg.conversation||(msg.extendedTextMessage||{}).text||(im&&im.caption)||((msg.videoMessage||{}).caption)||""),img="";
      if(im){try{let b64=String(msg.base64||m.base64||"");if(!b64){const r=await eCall(c,"POST","/chat/getBase64FromMediaMessage/"+eName(wi),{message:raw});b64=String(r.base64||"")}
        if(b64)img=await saveBuf(Buffer.from(b64.replace(/^data:[^,]*,/,""),"base64"),String(im.mimetype||"image/jpeg").split(";")[0],"wa_"+key);else text=(text?text+"\n":"")+"[Фото, откройте в WhatsApp]"}catch(e){text=(text?text+"\n":"")+"[Фото не загрузилось, откройте в WhatsApp]"}}
      let aud="",x=null;
      if(!im&&msg.audioMessage){ // голосовое: просим сервер перекодировать в mp4 — так оно играет на iPhone
        try{const r=await eCall(c,"POST","/chat/getBase64FromMediaMessage/"+eName(wi),{message:raw,convertToMp4:true});const b64=String(r.base64||"").replace(/^data:[^,]*,/,"");
          if(b64){aud=await saveBuf(Buffer.from(b64,"base64"),/mp4|m4a/.test(String(r.mimetype||"audio/mp4"))?"audio/mp4":String(r.mimetype||"audio/mp4").split(";")[0],"wa_"+key);text="Голосовое сообщение"}
        }catch(e){console.error("evo audio",e)}
        if(!aud){const b0=String(msg.base64||m.base64||"").replace(/^data:[^,]*,/,"");if(b0){try{aud=await saveBuf(Buffer.from(b0,"base64"),String((msg.audioMessage||{}).mimetype||"audio/ogg").split(";")[0],"wa_"+key);text="Голосовое сообщение"}catch(e){}}}
        if(!aud)text="Голосовое сообщение (откройте в WhatsApp)"}
      else if(msg.videoMessage||msg.documentMessage||msg.documentWithCaptionMessage){ // файлы и видео сохраняем у себя — открываются прямо из чата
        const dm=msg.documentMessage||((msg.documentWithCaptionMessage||{}).message||{}).documentMessage||msg.videoMessage||{},isV=!!msg.videoMessage,nm0=String(dm.fileName||(isV?"видео.mp4":"файл"));
        try{if((+dm.fileLength||0)>25*1048576)throw new Error("big");let r={base64:String(msg.base64||m.base64||""),mimetype:dm.mimetype};if(!r.base64)r=await eCall(c,"POST","/chat/getBase64FromMediaMessage/"+eName(wi),{message:raw});const b64=String(r.base64||"").replace(/^data:[^,]*,/,"");
          if(b64){const ct=String(dm.mimetype||r.mimetype||(isV?"video/mp4":"application/octet-stream")).split(";")[0],u=await saveBuf(Buffer.from(b64,"base64"),ct,"wa_"+key);x=isV?{vid:u}:{file:{url:u,name:nm0}};text=(isV?"Видео":"Файл: "+nm0)+(dm.caption?"\n"+dm.caption:"")}
        }catch(e){if(e.message!=="big")console.error("evo file",e)}
        if(!x)text=(isV?"Видео":"Файл: "+nm0)+" (откройте в WhatsApp)"+(dm.caption?"\n"+dm.caption:"")}
      else if(msg.locationMessage){const l=msg.locationMessage;text="Геопозиция: "+l.degreesLatitude+", "+l.degreesLongitude}
      else if(msg.contactMessage)text="Контакт: "+((msg.contactMessage||{}).displayName||"");
      else if(msg.stickerMessage)text="Стикер";
      if(!text&&!img)continue; // реакции, служебные
      if(/откройте в WhatsApp/.test(text)){try{const w=JSON.stringify(raw);if(w.length<20000)x={...(x||{}),wraw:w}}catch(e){}} // чтобы потом можно было скачать кнопкой «Загрузить»
      try{const q=await quoteOf(msg,m,key);if(q)x={...(x||{}),q}}catch(e){console.error("evo quote",e)}
      if(fromMe){ // свой ответ из CRM приходит обратно — второй раз не записываем
        const ours=async()=>{if(sid&&(await db().doc("waSent/"+safe(sid)).get()).exists)return true;const q=await db().collection("chats").doc("wa_"+key).collection("msgs").where("ts",">",Date.now()-180000).get();return q.docs.some(x=>{const y=x.data();return y.dir==="out"&&y.via!=="phone"&&String(y.t||"").trim()===text.trim()})};
        if(await ours())continue;await new Promise(r=>setTimeout(r,2500));if(await ours())continue;
        await ingestOut({ch:"wa",key,phone:lid?"":"+"+digits,name:"",text,img,aud,x,mid:sid,wi,loc0:ws.loc||""});
      }else{await ingest({ch:"wa",key,ext:jid,phone:lid?"":"+"+digits,name:String(m.pushName||""),text,img,aud,x,mid:sid,wi,loc0:ws.loc||"",biz:String(b.sender||"").replace(/@.*/,"").replace(/\D/g,"")});
        // фото клиента на аватарку: раз в неделю берём с WhatsApp и сохраняем у себя (ссылки WhatsApp быстро протухают)
        try{const cref=db().collection("chats").doc("wa_"+key),cd=(await cref.get()).data()||{};if(!cd.avaAt||Date.now()-cd.avaAt>7*864e5){await cref.update({avaAt:Date.now()});
          const r=await eCall(c,"POST","/chat/fetchProfilePictureUrl/"+eName(wi),{number:lid?jid:digits});const u=r.profilePictureUrl||r.profilePicUrl||"";
          if(u){const f=await getBuf(u);await cref.update({ava:await saveBuf(f.buf,f.ct,"ava_"+key)})}}}catch(e){console.error("evo avatar",e)}}
    }
  }catch(e){console.error("waEvoHook",e)}
  res.sendStatus(200);
});
// Старое сообщение без файла («откройте в WhatsApp»): по кнопке на сайте пробуем скачать файл с сервера Evolution по id сообщения
exports.chMediaFetch=onCall({...OPT,timeoutSeconds:120},async req=>{
  if(!req.auth)throw new HttpsError("unauthenticated","Войдите в систему");
  const st=await db().doc("staff/"+req.auth.uid).get(),sd=st.exists?st.data():{};
  if(!sd.active||!["admin","operator","florist","assistant"].includes(sd.role))throw new HttpsError("permission-denied","Нет доступа");
  const cid=String((req.data&&req.data.cid)||""),mid=String((req.data&&req.data.mid)||"");
  if(!/^wa_[A-Za-z0-9_-]+$/.test(cid)||!/^m_[A-Za-z0-9_-]+$/.test(mid))throw new HttpsError("invalid-argument","Неверное сообщение");
  const cref=db().doc("chats/"+cid),ch=await cref.get();if(!ch.exists)throw new HttpsError("not-found","Чат не найден");
  const mref=cref.collection("msgs").doc(mid),ms=await mref.get();if(!ms.exists)throw new HttpsError("not-found","Сообщение не найдено");
  const m=ms.data(),t=String(m.t||""),wi=iidOf(ch.data().wi),c=await cfgOf(wi);
  if(!c.evurl)throw new HttpsError("failed-precondition","Не найден адрес сервера Evolution API — проверьте подключение WhatsApp в настройках");
  const kind=/^Файл: /.test(t)?"file":/^Видео/.test(t)?"vid":/^Голосовое/.test(t)?"aud":/\[Фото/.test(t)?"img":"";
  if(!kind)throw new HttpsError("failed-precondition","В этом сообщении нет файла");
  let r;try{r=await eCall(c,"POST","/chat/getBase64FromMediaMessage/"+eName(wi),{message:(()=>{try{if(m.wraw)return JSON.parse(m.wraw)}catch(e){}return{key:{id:mid.slice(2),remoteJid:String(ch.data().ext||""),fromMe:m.dir==="out"}}})(),...(kind==="aud"?{convertToMp4:true}:{})})}
  catch(e){throw new HttpsError("not-found","Файл уже недоступен на сервере WhatsApp. Откройте его в WhatsApp на телефоне")}
  const b64=String((r&&r.base64)||"").replace(/^data:[^,]*,/,"");if(!b64)throw new HttpsError("not-found","Файл уже недоступен на сервере WhatsApp. Откройте его в WhatsApp на телефоне");
  const buf=Buffer.from(b64,"base64");if(buf.length>25*1048576)throw new HttpsError("failed-precondition","Файл больше 25 МБ — откройте в WhatsApp");
  let ct=String((r&&r.mimetype)||"").split(";")[0];
  if(kind==="aud")ct=/mp4|m4a/.test(ct||"audio/mp4")?"audio/mp4":ct;
  if(!ct)ct=kind==="file"?"application/pdf":kind==="vid"?"video/mp4":kind==="img"?"image/jpeg":"audio/mp4";
  const u=await saveBuf(buf,ct,cid),clean=t.replace(/ ?\(откройте в WhatsApp\)/,"").replace(/\n?\[Фото[^\]]*\]/,"");
  const upd=kind==="file"?{file:{url:u,name:(/^Файл: (.+)/.exec(clean.split("\n")[0])||[])[1]||"файл"}}:kind==="vid"?{vid:u}:kind==="aud"?{aud:u}:{img:u};
  await mref.update({...upd,t:clean||(kind==="img"?"":t),wraw:FV.delete()});
  return{ok:true,url:u};
});
// Подключение номера к Evolution API: создаёт инстанс и включает уведомления на наш адрес
exports.waGreenSetup=onCall(OPT,async req=>{
  topOnly(req);
  const url=String((req.data&&req.data.url)||"");let host="";try{host=new URL(url).hostname}catch(e){}
  if(!/^https:\/\//.test(url)||!/(cloudfunctions\.net|run\.app)$/.test(host))throw new HttpsError("invalid-argument","Неверный адрес webhook");
  const wi=iidOf(req.data&&req.data.i),c=await greenCfg(wi);
  let tok=c.gHook;if(!tok){tok=crypto.randomBytes(16).toString("hex");await db().doc("secrets/channels").set(wi?{waI:{[wi]:{gHook:tok}}}:{wa:{gHook:tok}},{merge:true})}
  if(c.mode==="evo"){
    const hook=url.replace(/waGreenHook$/,"waEvoHook")+"?k="+tok+(wi?"&i="+wi:""),wh={enabled:true,url:hook,byEvents:false,base64:true,events:EVENTS};
    try{
      try{await eCall(c,"POST","/instance/create",{instanceName:eName(wi),integration:"WHATSAPP-BAILEYS",qrcode:true,webhook:wh})}
      catch(e){if(![400,403,409].includes(e.status))throw e;await eCall(c,"POST","/webhook/set/"+eName(wi),{webhook:wh})} // номер уже создан — обновляем адрес уведомлений
      const st=await eState(c,wi);await waState(st,wi);return{state:st};
    }catch(e){throw new HttpsError("internal",String(e.message||e))}
  }
  throw new HttpsError("failed-precondition","Сначала сохраните адрес сервера Evolution API");
});
// QR-код для привязки телефона (обновляется каждые ~20 секунд, сайт спрашивает заново)
exports.waGreenQr=onCall(OPT,async req=>{
  topOnly(req);const wi=iidOf(req.data&&req.data.i),c=await greenCfg(wi);
  if(c.mode==="evo"){
    try{
      const st=await eState(c,wi);if(st==="authorized"){await waState(st,wi);return{state:st}}
      const j=await eCall(c,"GET","/instance/connect/"+eName(wi));const b=String(j.base64||(j.qrcode&&j.qrcode.base64)||"").replace(/^data:image\/\w+;base64,/,"");
      return{state:st,qr:b,msg:b?"":"QR-код ещё не готов, подождите"};
    }catch(e){throw new HttpsError("internal",String(e.message||e))}
  }
  throw new HttpsError("failed-precondition","Сначала сохраните адрес сервера Evolution API");
});
// Привязка без камеры: код для входа по номеру телефона (WhatsApp → Связанные устройства → Привязать по номеру телефона)
exports.waGreenCode=onCall(OPT,async req=>{
  topOnly(req);const c=await greenCfg(iidOf(req.data&&req.data.i));
  let ph=String((req.data&&req.data.phone)||"").replace(/\D/g,"");if(/^8\d{10}$/.test(ph))ph="7"+ph.slice(1);
  if(!/^\d{10,15}$/.test(ph))throw new HttpsError("invalid-argument","Введите номер магазина полностью, например 77011234567");
  try{
    let code="";
    {const r=await eCall(c,"GET","/instance/connect/"+eName(iidOf(req.data&&req.data.i))+"?number="+ph);code=String(r.pairingCode||r.code&&String(r.code).length<=12&&r.code||"")}
    if(!code)throw new Error("Код не получен, попробуйте ещё раз через минуту");
    return{code};
  }catch(e){throw new HttpsError("internal",String(e.message||e))}
});
// Отвязать телефон
exports.waGreenLogout=onCall(OPT,async req=>{
  topOnly(req);const wi=iidOf(req.data&&req.data.i),c=await greenCfg(wi);
  try{await eCall(c,"DELETE","/instance/logout/"+eName(wi));await waState("notAuthorized",wi);return{ok:true}}catch(e){throw new HttpsError("internal",String(e.message||e))}
});

// ================= Instagram =================
exports.igHook=onRequest({...OPT,maxInstances:10},async(req,res)=>{
  const c=await secretsOf("ig");
  if(req.method==="GET")return metaVerify(req,res,c);
  if(req.method!=="POST")return res.sendStatus(405);
  if(c.secret&&!sigOk(req,c.secret))return res.sendStatus(403);
  if(!(await isOn("ig")))return res.sendStatus(200);
  try{
    const base=/^IG/.test(c.token||"")?"https://graph.instagram.com/v21.0":G;
    for(const en of (req.body&&req.body.entry)||[])for(const ev of en.messaging||[]){
      const m=ev.message;if(!m||m.is_echo)continue;
      const from=String((ev.sender||{}).id||"");if(!from)continue;
      let text=m.text||"",img="";
      for(const a of m.attachments||[]){
        const u=(a.payload||{}).url;
        if(a.type==="image"&&u&&!img){try{const f=await getBuf(u);img=await saveBuf(f.buf,f.ct,"ig_"+from)}catch(e){text=(text?text+"\n":"")+"[Фото не загрузилось, откройте в Instagram]"}}
        else if(a.type==="audio")text=(text?text+"\n":"")+"🎤 Голосовое сообщение (откройте в Instagram)";
        else if(a.type==="video"||a.type==="reel")text=(text?text+"\n":"")+"🎬 Видео (откройте в Instagram)";
        else if(a.type==="share"||a.type==="story_mention"||a.type==="ig_reel")text=(text?text+"\n":"")+"🔗 Публикация или история"+(u?": "+u:"");
        else if(a.type!=="image")text=(text?text+"\n":"")+"📎 Вложение (откройте в Instagram)";
      }
      await ingest({ch:"ig",key:from,ext:from,text,img,mid:m.mid,biz:String((ev.recipient||{}).id||en.id||""),
        prof:async()=>{const r=await jf(`${base}/${from}?fields=name,username&access_token=${encodeURIComponent(c.token)}`);return r.j||{}}});
    }
  }catch(e){console.error("igHook",e)}
  res.sendStatus(200);
});

// ================= Telegram =================
exports.tgHook=onRequest({...OPT,maxInstances:10,invoker:"public"},async(req,res)=>{
  if(req.method!=="POST")return res.sendStatus(405);
  const c=await secretsOf("tg");
  if(!c.secret||req.get("x-telegram-bot-api-secret-token")!==c.secret)return res.sendStatus(403);
  if(!(await isOn("tg")))return res.sendStatus(200);
  try{
    const u=req.body||{},m=u.message;
    if(m&&m.chat&&m.chat.type==="private"&&m.from&&!m.from.is_bot){
      const id=String(m.chat.id);let text=m.text||m.caption||"",img="";
      const add=s=>{text=(text?text+"\n":"")+s};
      if(m.photo&&m.photo.length){
        try{
          const f=await jf(`https://api.telegram.org/bot${c.token}/getFile?file_id=${encodeURIComponent(m.photo[m.photo.length-1].file_id)}`);
          if(!f.j.ok)throw new Error("getFile");
          const b=await getBuf(`https://api.telegram.org/file/bot${c.token}/${f.j.result.file_path}`);
          img=await saveBuf(b.buf,"image/jpeg","tg_"+id);
        }catch(e){add("[Фото не загрузилось, откройте в Telegram]")}
      }else if(m.voice||m.audio)add("🎤 Голосовое сообщение (откройте в Telegram)");
      else if(m.video||m.video_note)add("🎬 Видео (откройте в Telegram)");
      else if(m.sticker)add("🙂 Стикер "+(m.sticker.emoji||""));
      else if(m.document)add("📎 Файл: "+(m.document.file_name||"документ")+" (откройте в Telegram)");
      else if(m.location)add("📍 Геопозиция: "+m.location.latitude+", "+m.location.longitude);
      else if(m.contact)add("📞 Контакт: "+[m.contact.first_name,m.contact.phone_number].filter(Boolean).join(" "));
      const name=[m.from.first_name,m.from.last_name].filter(Boolean).join(" ");
      await ingest({ch:"tg",key:id,ext:id,name,handle:m.from.username||"",text,img,mid:u.update_id!=null?"u"+u.update_id:"m"+id+"_"+m.message_id});
    }
  }catch(e){console.error("tgHook",e)}
  res.sendStatus(200);
});

// Подключение Telegram: регистрирует webhook у бота (вызывает сайт при сохранении канала)
exports.tgSetup=onCall(OPT,async req=>{
  if(!req.auth)throw new HttpsError("unauthenticated","Войдите в систему");
  if(!TOP.includes(String(req.auth.token.email||"").toLowerCase()))throw new HttpsError("permission-denied","Только владелец и главный админ");
  const url=String((req.data&&req.data.url)||"");
  let host="";try{host=new URL(url).hostname}catch(e){}
  if(!/^https:\/\//.test(url)||!/(cloudfunctions\.net|run\.app)$/.test(host))throw new HttpsError("invalid-argument","Неверный адрес webhook");
  const c=await secretsOf("tg");
  if(!c.token)throw new HttpsError("failed-precondition","Сначала сохраните токен бота");
  let secret=c.secret;
  if(!secret){secret=crypto.randomBytes(16).toString("hex");await db().doc("secrets/channels").set({tg:{secret}},{merge:true})}
  if(!/^[A-Za-z0-9_-]{1,256}$/.test(secret))throw new HttpsError("invalid-argument","Секрет webhook: только латинские буквы, цифры, _ и -");
  const r=await jf(`https://api.telegram.org/bot${c.token}/setWebhook`,{method:"POST",headers:CT,body:JSON.stringify({url,secret_token:secret,allowed_updates:["message"],drop_pending_updates:false})});
  if(!r.ok||!r.j.ok)throw new HttpsError("internal","Telegram: "+(r.j.description||("HTTP "+r.status)));
  return{ok:true};
});

// ================= Отправка ответов =================
const SEND={
  async wa(c,to,t,img,chat){
    {const ci=await cfgOf(iidOf(chat&&chat.wi));if(ci.mode==="evo")c=ci} // номер точки (Evolution API); иначе — официальный Meta
    if(c.mode==="evo"){
      if(!c.evurl)throw new Error("Не задан адрес сервера Evolution API");
      const ext=String((chat&&chat.ext)||""),number=/@lid$/.test(ext)?ext:String(to).replace(/\D/g,""),inst=eName(iidOf(chat&&chat.wi));
      const remember=async r=>{const id=String((r&&r.key&&r.key.id)||"");if(id)await db().doc("waSent/"+safe(id)).set({ts:Date.now(),t:String(t||"").slice(0,300),img:img||""})}; // t/img — чтобы показать цитату, если клиент ответит на это сообщение
      if(img)await remember(await eCall(c,"POST","/message/sendMedia/"+inst,{number,mediatype:"image",mimetype:"image/jpeg",media:img,fileName:"photo.jpg",...(t?{caption:t.slice(0,1000)}:{})}));
      else await remember(await eCall(c,"POST","/message/sendText/"+inst,{number,text:t.slice(0,4000)}));
      return;
    }
    // отвечаем с того же номера, на который написал клиент (у точки может быть свой номер)
    const pid=(chat&&chat.biz)||c.phoneId;
    if(!c.token||!pid)throw new Error("Не заданы токен или Phone number ID");
    const body=img?{messaging_product:"whatsapp",to,type:"image",image:{link:img,...(t?{caption:t.slice(0,1000)}:{})}}
      :{messaging_product:"whatsapp",to,type:"text",text:{body:t.slice(0,4000),preview_url:true}};
    const r=await jf(`${G}/${pid}/messages`,{method:"POST",headers:{...CT,Authorization:"Bearer "+c.token},body:JSON.stringify(body)});
    if(!r.ok){const code=r.j.error&&r.j.error.code;throw new Error(code===131047?"WhatsApp: прошло больше 24 часов с последнего сообщения клиента, нужен одобренный шаблон":gerr(r))}
  },
  async ig(c,to,t,img){
    if(!c.token)throw new Error("Не задан токен Instagram");
    const base=/^IG/.test(c.token)?"https://graph.instagram.com/v21.0":G,url=`${base}/me/messages?access_token=${encodeURIComponent(c.token)}`;
    const post=async message=>{const r=await jf(url,{method:"POST",headers:CT,body:JSON.stringify({recipient:{id:to},message})});if(!r.ok)throw new Error(gerr(r))};
    if(img)await post({attachment:{type:"image",payload:{url:img}}});
    if(t)await post({text:t.slice(0,900)});
  },
  async tg(c,to,t,img){
    if(!c.token)throw new Error("Не задан токен бота");
    const api=m=>`https://api.telegram.org/bot${c.token}/${m}`;
    const r=img?await jf(api("sendPhoto"),{method:"POST",headers:CT,body:JSON.stringify({chat_id:to,photo:img,...(t?{caption:t.slice(0,1000)}:{})})})
      :await jf(api("sendMessage"),{method:"POST",headers:CT,body:JSON.stringify({chat_id:to,text:t.slice(0,4000)})});
    if(!r.ok||!r.j.ok)throw new Error("Telegram: "+(r.j.description||("HTTP "+r.status)));
  }
};

// Новое исходящее сообщение из CRM (st:"pending") → отправка в канал
exports.sendChannelMsg=onDocumentCreated({...OPT,minInstances:1,document:"chats/{cid}/msgs/{mid}",timeoutSeconds:90},async e=>{
  const first=e.data&&e.data.data();
  if(!first||first.dir!=="out"||first.st!=="pending")return;
  const cid=e.params.cid,ref=e.data.ref,chat=await db().doc("chats/"+cid).get();
  if(!chat.exists)return;
  const c=chat.data(),k=c.ch;
  if(!SEND[k])return;
  if(!(k==="wa"&&c.wi?!!(await setOf(iidOf(c.wi))).on:await isOn(k)))return; // канал выключен: сообщение остаётся «не отправлено», сайт покажет это
  // защита от повторного запуска: забираем сообщение себе
  const got=await db().runTransaction(async t=>{const s=await t.get(ref);if(!s.exists||s.data().st!=="pending")return null;t.update(ref,{st:"sending"});return s.data()});
  if(!got)return;
  try{
    let img=got.img||"";
    if(img.slice(0,5)==="data:")img=await saveDataUrl(img,k+"_"+cid);
    const text=String(got.t||"");
    if(!text&&!img)throw new Error("Пустое сообщение");
    const to=k==="wa"?((c.phone||"").replace(/\D/g,"")||cid.slice(3)):String(c.ext||cid.slice(k.length+1));
    await SEND[k](await secretsOf(k),to,text,img,c);
    await ref.update({st:"sent",sentAt:Date.now()});
  }catch(err){
    console.error("sendChannelMsg",k,err);
    await ref.update({st:"failed",err:String(err.message||err).slice(0,300)});
  }
});
