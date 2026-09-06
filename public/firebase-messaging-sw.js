importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const params = new URL(self.location).searchParams;
const config = Object.fromEntries(params);

if (config.apiKey && config.projectId && config.appId && config.messagingSenderId) {
  firebase.initializeApp(config);
  firebase.messaging();
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
