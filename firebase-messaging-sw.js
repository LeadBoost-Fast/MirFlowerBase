// Сервис-воркер для push-уведомлений (приходят, даже когда сайт закрыт)
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js","https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
firebase.initializeApp({apiKey:"AIzaSyCDxDJvmIOw8R0kP7bNbiBHYDAOqY_9cSQ",authDomain:"mirflowersbase.firebaseapp.com",projectId:"mirflowersbase",storageBucket:"mirflowersbase.firebasestorage.app",messagingSenderId:"142575786641",appId:"1:142575786641:web:de2d1b79b076894c29fd30"});
const m=firebase.messaging();
// Сервер шлёт только data-сообщения, показываем уведомление сами
m.onBackgroundMessage(p=>{const d=p.data||{};
  return self.registration.showNotification(d.title||"Mirflowers",{body:d.body||"",tag:d.tag||undefined,icon:"icon-192.png",badge:"icon-192.png",data:{url:d.url||"/"}})});
self.addEventListener("notificationclick",e=>{e.notification.close();let url=(e.notification.data&&e.notification.data.url)||"/";if(url.charAt(0)==="/")url=self.registration.scope+url.slice(1);
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(l=>{for(const c of l){if("focus" in c){c.postMessage({go:url});return c.focus()}}return clients.openWindow(url)}))});
