// Тексты автосообщений клиенту (чистые функции, без обращения к базе: их проверяют отдельным тестом)
const fill=(t,m)=>String(t).replace(/\{(shop|link)\}/g,(_,k)=>m[k]||"");
const TRK_DEF="Ваш заказ принят, спасибо, что выбрали {shop}! Следить за готовностью можно здесь: {link}";
const RDY_DEF="{shop}: ваш заказ готов, можно забирать.";
const RDY_DV_DEF="{shop}: ваш заказ готов, скоро передадим его курьеру.";
const REV_GIS_DEF="Спасибо, что выбрали {shop}! Если вам понравился букет, оставьте, пожалуйста, отзыв в 2ГИС: {link}";
const REV_SITE_DEF="Спасибо, что выбрали {shop}! Оцените, пожалуйста, букет — это займёт 10 секунд: {link}";
const gisOf=(sh,loc)=>{const u=sh.revUrl||{};return String(u[loc||"main"]||u.all||"").trim()};
// «Заказ принят»: ссылка, по которой клиент следит за заказом
const trackText=(sh,link)=>fill(sh.trkMsg||TRK_DEF,{shop:sh.name||"нас",link});
// «Заказ готов»: для доставки и для самовывоза свой текст
const readyText=(sh,o)=>{if(sh.rdyOff)return null;return fill((o.dv?sh.rdyMsgDv||RDY_DV_DEF:sh.rdyMsg||RDY_DEF),{shop:sh.name||"Мы",link:""}).trim()};
// Просьба об отзыве после выдачи. revMode: "gis" (по умолчанию) — сразу ссылка на 2ГИС; "site" — оценка на странице статуса;
// "off" — не просить. Если для точки не указана ссылка 2ГИС, просим оценить на странице статуса, как раньше.
const reviewPlan=(sh,o,siteLink)=>{
  const mode=sh.revOff?"off":(["gis","site","off"].includes(sh.revMode)?sh.revMode:"gis");
  if(mode==="off")return null;
  const g=gisOf(sh,o.loc);
  if(mode==="gis"&&/^https:\/\//.test(g))return{mode:"gis",text:fill(sh.revMsgGis||REV_GIS_DEF,{shop:sh.name||"нас",link:g})};
  return{mode:"site",text:fill(sh.revMsg||REV_SITE_DEF,{shop:sh.name||"нас",link:siteLink})};
};
module.exports={fill,TRK_DEF,RDY_DEF,RDY_DV_DEF,REV_GIS_DEF,REV_SITE_DEF,gisOf,trackText,readyText,reviewPlan};
