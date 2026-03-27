const CACHE_NAME = 'glow-v4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/app.js',
  './js/auth.js',
  './js/ui.js',
  './js/store.js',
  './js/firebase-init.js',
  './js/firebase-config.js',
  './js/i18n.js',
  './js/notify.js',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Receive push payloads from Firebase Cloud Messaging (FCM)
// To enable cross-device barber notifications, set up FCM in your Firebase project
// and send push messages from Firebase Functions or your backend.
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'The Barber Shop';
  const body  = data.body  || 'You have a new notification';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  './icons/icon.svg',
      badge: './icons/icon.svg',
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('./'));
});
