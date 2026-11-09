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
const EXT={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/pdf":"pdf"};

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
    if(o.biz&&!d.biz)upd.biz=String(o.biz);
    if(!d.loc&&o.biz){const lc=await bizLoc(o.ch,o.biz);if(lc)upd.loc=lc}
    if(o.name&&(!d.name||d.name==="Без имени"))upd.name=o.name;
    await ref.update(upd);
  }else{
    let name=o.name||"",handle=o.handle||"";
    if(o.prof){try{const p=await o.prof();name=name||p.name||p.username||"";handle=handle||p.username||""}catch(e){}}
    const lc=await bizLoc(o.ch,o.biz);
    await ref.set({...base,ch:o.ch,name:name||"Без имени",phone:o.phone||"",handle,ext:String(o.ext||o.key),biz:String(o.biz||""),loc:lc,resp:"",nOut:0,firstTs:ts,firstReplyTs:0,leadId:"",ts});
  }
  await mref.set({dir:"in",t:o.text||"",...(o.img?{img:o.img}:{}),ts});
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

// ================= WhatsApp по QR-коду (Green API) =================
// Номер остаётся в телефоне (как WhatsApp Web). Ключи: secrets/channels.wa = {mode:"green", gid, gtok, gurl, gHook}
const gBase=c=>String(c.gurl||"https://api.green-api.com").trim().replace(/\/+$/,"")+"/waInstance"+String(c.gid||"").trim();
async function gCall(c,m,body){
  const r=await jf(gBase(c)+"/"+m+"/"+String(c.gtok||"").trim(),body===undefined?{}:{method:"POST",headers:CT,body:JSON.stringify(body)});
  if(!r.ok)throw new Error("Green API: "+(r.j.message||r.j.error||("HTTP "+r.status)));
  return r.j;
}
const topOnly=req=>{
  if(!req.auth)throw new HttpsError("unauthenticated","Войдите в систему");
  if(!TOP.includes(String(req.auth.token.email||"").toLowerCase()))throw new HttpsError("permission-denied","Только владелец и главный админ");
};
const waState=st=>db().doc("settings/main").set({channels:{wa:{state:String(st||""),stateAt:Date.now()}}},{merge:true});
async function greenCfg(){
  const c=await secretsOf("wa");
  if(c.mode==="waha"){if(!c.wurl)throw new HttpsError("failed-precondition","Сначала сохраните адрес сервера WAHA");return c}
  if(c.mode!=="green"||!c.gid||!c.gtok)throw new HttpsError("failed-precondition","Сначала сохраните ID инстанса и токен Green API");
  return c;
}
// ---------- WAHA (свой сервер с бесплатной программой WAHA, сессия "default") ----------
const WS="default",wBase=c=>String(c.wurl||"").trim().replace(/\/+$/,"");
async function wCall(c,method,path,body){
  const h={Accept:"application/json",...(c.wkey?{"X-Api-Key":String(c.wkey).trim()}:{}),...(body!==undefined?CT:{})};
  const r=await jf(wBase(c)+path,{method,headers:h,...(body!==undefined?{body:JSON.stringify(body)}:{})});
  if(!r.ok){const e=new Error("WAHA: "+(r.j.message||r.j.error||("HTTP "+r.status)));e.status=r.status;throw e}
  return r.j;
}
const WST={WORKING:"authorized",SCAN_QR_CODE:"notAuthorized",STARTING:"starting",STOPPED:"stopped",FAILED:"failed"};
async function wStatus(c){try{const j=await wCall(c,"GET","/api/sessions/"+WS);return WST[j.status]||String(j.status||"")}catch(e){if(e.status===404)return"stopped";throw e}}
const shortId=id=>String(id&&(id._serialized||id.id)||id||"").split("_").pop();
// Исходящее, отправленное с самого телефона: тоже показываем в CRM
async function ingestOut(o){
  const ref=db().collection("chats").doc(o.ch+"_"+o.key),mref=ref.collection("msgs").doc("m_"+safe(o.mid||Date.now()+"_"+Math.random()));
  if((await mref.get()).exists)return;
  const ts=Date.now(),s=await ref.get(),base={last:o.text||(o.img?"Фото":""),lastDir:"out",lastTs:ts};
  if(s.exists)await ref.update({...base,nOut:FV.increment(1)});
  else await ref.set({...base,ch:o.ch,name:o.name||"Без имени",phone:o.phone||"",handle:"",ext:String(o.key),biz:"",loc:"",resp:"",nIn:0,nOut:1,unread:0,firstTs:ts,firstReplyTs:0,leadId:"",st:"open",ts});
  await mref.set({dir:"out",t:o.text||"",...(o.img?{img:o.img}:{}),ts,st:"sent",sentAt:ts,via:"phone"});
}
exports.waGreenHook=onRequest({...OPT,maxInstances:10,invoker:"public"},async(req,res)=>{
  if(req.method!=="POST")return res.sendStatus(405);
  const c=await secretsOf("wa"),tok=String(c.gHook||""),auth=String(req.get("authorization")||"");
  if(!tok||!(req.query.k===tok||auth==="Bearer "+tok||auth===tok))return res.sendStatus(403);
  const b=req.body||{};
  try{
    if(b.typeWebhook==="stateInstanceChanged"){await waState(b.stateInstance);return res.sendStatus(200)}
    if(b.typeWebhook!=="incomingMessageReceived"&&b.typeWebhook!=="outgoingMessageReceived")return res.sendStatus(200);
    if(!(await isOn("wa")))return res.sendStatus(200);
    const sd=b.senderData||{},chatId=String(sd.chatId||"");
    if(!/@c\.us$/.test(chatId))return res.sendStatus(200); // группы и рассылки не берём
    const ph=chatId.replace(/\D/g,"");if(!ph)return res.sendStatus(200);
    const md=b.messageData||{},tm=md.typeMessage,fd=md.fileMessageData||{};let text="",img="";
    const add=x=>{text=(text?text+"\n":"")+x};
    if(tm==="textMessage")text=(md.textMessageData||{}).textMessage||"";
    else if(tm==="extendedTextMessage"||tm==="quotedMessage")text=(md.extendedTextMessageData||{}).text||"";
    else if(tm==="imageMessage"){text=fd.caption||"";if(fd.downloadUrl){try{const f=await getBuf(fd.downloadUrl);img=await saveBuf(f.buf,f.ct,"wa_"+ph)}catch(e){add("[Фото не загрузилось, откройте в WhatsApp]")}}}
    else if(tm==="audioMessage")text="Голосовое сообщение (откройте в WhatsApp)";
    else if(tm==="videoMessage"){text="Видео (откройте в WhatsApp)";if(fd.caption)add(fd.caption)}
    else if(tm==="documentMessage")text="Файл: "+(fd.fileName||"документ")+" (откройте в WhatsApp)";
    else if(tm==="locationMessage"){const l=md.locationMessageData||{};text="Геопозиция: "+l.latitude+", "+l.longitude}
    else if(tm==="contactMessage")text="Контакт: "+((md.contactMessageData||{}).displayName||"");
    else if(tm==="stickerMessage")text="Стикер";
    else if(tm==="reactionMessage"||tm==="deletedMessage"||tm==="editedMessage")return res.sendStatus(200);
    else text="Сообщение ("+(tm||"другое")+"), откройте в WhatsApp";
    const biz=String((b.instanceData||{}).wid||"").replace(/\D/g,"");
    if(b.typeWebhook==="incomingMessageReceived")await ingest({ch:"wa",key:ph,ext:ph,phone:"+"+ph,name:sd.senderName||sd.chatName||"",text,img,mid:b.idMessage,biz});
    else await ingestOut({ch:"wa",key:ph,phone:"+"+ph,name:sd.chatName||"",text,img,mid:b.idMessage});
  }catch(e){console.error("waGreenHook",e)}
  res.sendStatus(200);
});
// Уведомления от WAHA: message.any (входящие и написанные с телефона), session.status
exports.waWahaHook=onRequest({...OPT,maxInstances:10,invoker:"public"},async(req,res)=>{
  if(req.method!=="POST")return res.sendStatus(405);
  const c=await secretsOf("wa"),tok=String(c.gHook||"");
  if(!tok||req.query.k!==tok)return res.sendStatus(403);
  const b=req.body||{},p=b.payload||{};
  try{
    if(b.event==="session.status"){await waState(WST[p.status]||String(p.status||""));return res.sendStatus(200)}
    if(b.event!=="message.any"&&b.event!=="message")return res.sendStatus(200);
    if(!(await isOn("wa")))return res.sendStatus(200);
    const fromMe=!!p.fromMe,peer=String(fromMe?p.to:p.from||"");
    if(!/@(c\.us|s\.whatsapp\.net|lid)$/.test(peer))return res.sendStatus(200); // группы, статусы, рассылки не берём
    const digits=peer.replace(/@.*/,"").replace(/\D/g,"");if(!digits)return res.sendStatus(200);
    const lid=/@lid$/.test(peer),key=lid?"lid"+digits:digits;
    const sid=shortId(p.id);
    let text=String(p.body||""),img="";
    if(fromMe){ // ответ, отправленный из CRM, приходит обратно — второй раз не записываем
      const ours=async()=>{if(sid&&(await db().doc("waSent/"+safe(sid)).get()).exists)return true;
        const q=await db().collection("chats").doc("wa_"+key).collection("msgs").where("ts",">",Date.now()-180000).get();
        return q.docs.some(d=>{const x=d.data();return x.dir==="out"&&x.via!=="phone"&&String(x.t||"").trim()===text.trim()})};
      if(await ours())return res.sendStatus(200);
      await new Promise(r=>setTimeout(r,2500));if(await ours())return res.sendStatus(200);
    }
    if(p.hasMedia){
      const m=p.media||{},mt=String(m.mimetype||"");
      if(m.url&&/^image\//.test(mt)){try{const f=await getBuf(m.url,c.wkey?{"X-Api-Key":String(c.wkey).trim()}:{});img=await saveBuf(f.buf,f.ct,"wa_"+key)}catch(e){text=(text?text+"\n":"")+"[Фото не загрузилось, откройте в WhatsApp]"}}
      else if(/^audio\//.test(mt)||p.type==="ptt")text="Голосовое сообщение (откройте в WhatsApp)";
      else if(/^video\//.test(mt))text="Видео (откройте в WhatsApp)"+(text?"\n"+text:"");
      else if(!m.url&&!text)text="Фото или файл (откройте в WhatsApp)";
      else if(!/^image\//.test(mt))text="Файл"+(m.filename?": "+m.filename:"")+" (откройте в WhatsApp)"+(text?"\n"+text:"");
    }
    if(!text&&!img)return res.sendStatus(200); // реакции, служебные
    const name=String((p._data&&(p._data.notifyName||p._data.pushName))||"");
    if(fromMe)await ingestOut({ch:"wa",key,phone:lid?"":"+"+digits,name:"",text,img,mid:sid||p.id});
    else await ingest({ch:"wa",key,ext:peer,phone:lid?"":"+"+digits,name,text,img,mid:sid||p.id,biz:String((b.me&&b.me.id)||"").replace(/@.*/,"").replace(/\D/g,"")});
  }catch(e){console.error("waWahaHook",e)}
  res.sendStatus(200);
});
// Подключение: включает уведомления Green API на наш адрес
exports.waGreenSetup=onCall(OPT,async req=>{
  topOnly(req);
  const url=String((req.data&&req.data.url)||"");let host="";try{host=new URL(url).hostname}catch(e){}
  if(!/^https:\/\//.test(url)||!/(cloudfunctions\.net|run\.app)$/.test(host))throw new HttpsError("invalid-argument","Неверный адрес webhook");
  const c=await greenCfg();
  let tok=c.gHook;if(!tok){tok=crypto.randomBytes(16).toString("hex");await db().doc("secrets/channels").set({wa:{gHook:tok}},{merge:true})}
  if(c.mode==="waha"){
    const hook=url.replace(/waGreenHook$/,"waWahaHook")+"?k="+tok,config={webhooks:[{url:hook,events:["message.any","session.status"]}]};
    try{
      try{await wCall(c,"PUT","/api/sessions/"+WS,{name:WS,config})}
      catch(e){if(e.status!==404)throw e;await wCall(c,"POST","/api/sessions",{name:WS,start:true,config})}
      await wCall(c,"POST","/api/sessions/"+WS+"/start").catch(()=>{});
      const st=await wStatus(c);await waState(st);return{state:st};
    }catch(e){throw new HttpsError("internal",String(e.message||e))}
  }
  try{
    await gCall(c,"setSettings",{webhookUrl:url+"?k="+tok,webhookUrlToken:tok,incomingWebhook:"yes",outgoingMessageWebhook:"yes",outgoingAPIMessageWebhook:"no",stateWebhook:"yes",outgoingWebhook:"no"});
    const st=await gCall(c,"getStateInstance");await waState(st.stateInstance);
    return{state:st.stateInstance||""};
  }catch(e){throw new HttpsError("internal",String(e.message||e))}
});
// QR-код для привязки телефона (обновляется каждые ~20 секунд, сайт спрашивает заново)
exports.waGreenQr=onCall(OPT,async req=>{
  topOnly(req);const c=await greenCfg();
  if(c.mode==="waha"){
    try{
      const st=await wStatus(c);if(st==="authorized"){await waState(st);return{state:st}}
      if(st==="stopped")await wCall(c,"POST","/api/sessions/"+WS+"/start").catch(()=>{});
      if(st!=="notAuthorized")return{state:st,qr:"",msg:"Сервер запускает WhatsApp, подождите…"};
      const q=await wCall(c,"GET","/api/"+WS+"/auth/qr?format=image");
      return{state:st,qr:String(q.data||""),msg:q.data?"":"QR-код ещё не готов"};
    }catch(e){throw new HttpsError("internal",String(e.message||e))}
  }
  try{
    const st=await gCall(c,"getStateInstance").catch(()=>({}));
    if(st.stateInstance==="authorized"){await waState("authorized");return{state:"authorized"}}
    const q=await gCall(c,"qr");
    if(q.type==="alreadyLogged"){await waState("authorized");return{state:"authorized"}}
    return{state:st.stateInstance||"",qr:q.type==="qrCode"?String(q.message||""):"",msg:q.type==="error"?String(q.message||""):""};
  }catch(e){throw new HttpsError("internal",String(e.message||e))}
});
// Отвязать телефон
exports.waGreenLogout=onCall(OPT,async req=>{
  topOnly(req);const c=await greenCfg();
  try{if(c.mode==="waha")await wCall(c,"POST","/api/sessions/"+WS+"/logout");else await gCall(c,"logout");await waState("notAuthorized");return{ok:true}}catch(e){throw new HttpsError("internal",String(e.message||e))}
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
    if(c.mode==="waha"){
      if(!c.wurl)throw new Error("Не задан адрес сервера WAHA");
      const ext=String((chat&&chat.ext)||""),chatId=/@/.test(ext)?ext:String(to).replace(/\D/g,"")+"@c.us";
      const remember=async r=>{const id=shortId(r&&(r.id||(r.key&&r.key.id)));if(id)await db().doc("waSent/"+safe(id)).set({ts:Date.now()})};
      if(img){
        try{await remember(await wCall(c,"POST","/api/sendImage",{session:WS,chatId,file:{mimetype:"image/jpeg",url:img,filename:"photo.jpg"},...(t?{caption:t.slice(0,1000)}:{})}))}
        catch(e){await remember(await wCall(c,"POST","/api/sendText",{session:WS,chatId,text:(t?t.slice(0,3000)+"\n":"")+img}))} // бесплатная WAHA может не уметь фото: отправляем ссылку
      }else await remember(await wCall(c,"POST","/api/sendText",{session:WS,chatId,text:t.slice(0,4000)}));
      return;
    }
    if(c.mode==="green"){
      if(!c.gid||!c.gtok)throw new Error("Не заданы ID инстанса и токен Green API");
      const chatId=String(to).replace(/\D/g,"")+"@c.us";
      if(img)await gCall(c,"sendFileByUrl",{chatId,urlFile:img,fileName:"photo.jpg",...(t?{caption:t.slice(0,1000)}:{})});
      else await gCall(c,"sendMessage",{chatId,message:t.slice(0,4000)});
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
exports.sendChannelMsg=onDocumentCreated({...OPT,document:"chats/{cid}/msgs/{mid}",timeoutSeconds:90},async e=>{
  const first=e.data&&e.data.data();
  if(!first||first.dir!=="out"||first.st!=="pending")return;
  const cid=e.params.cid,ref=e.data.ref,chat=await db().doc("chats/"+cid).get();
  if(!chat.exists)return;
  const c=chat.data(),k=c.ch;
  if(!SEND[k])return;
  if(!(await isOn(k)))return; // канал выключен: сообщение остаётся «не отправлено», сайт покажет это
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
