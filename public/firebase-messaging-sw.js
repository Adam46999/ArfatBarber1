self.addEventListener("notificationclick",e=>{e.stopImmediatePropagation();e.notification.close();const d=e.notification?.data?.FCM_MSG?.data||e.notification?.data||{};const p=typeof d.url==="string"&&d.url.startsWith("/")&&!d.url.startsWith("//")?d.url:"/";const u=new URL(p,self.location.origin).href;e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(async ws=>{for(const w of ws){try{if(new URL(w.url).origin===self.location.origin){if("navigate"in w)await w.navigate(u);return w.focus();}}catch{}}return clients.openWindow(u);}));});
/* global importScripts, firebase */
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCRpZf2RKFWk7aT8rF5CEEDVkjblJg5uC8",
  authDomain: "arfatbarber.firebaseapp.com",
  projectId: "arfatbarber",
  storageBucket: "arfatbarber.appspot.com",
  messagingSenderId: "275175753990",
  appId: "1:275175753990:web:20bd913d8fef6da6c37687"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/barber-logo.png' // أيقونة اختيارية
  });
});
