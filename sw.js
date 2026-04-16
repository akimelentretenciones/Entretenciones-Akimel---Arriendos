// ═══════════════════════════════════════════════════
// AKIMEL — Service Worker v4
// ═══════════════════════════════════════════════════
const CACHE_NAME = 'akimel-v4';
const ASSETS = ['/índice.html', '/manifest.json', '/icono-192.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// Android/Chrome: mostrar notif via SW (funciona en segundo plano)
self.addEventListener('message', event => {
  if(event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if(event.data?.type === 'SHOW_NOTIF'){
    const { titulo, body, tag } = event.data;
    self.registration.showNotification(titulo || '🛝 Akimel', {
      body:     body || '',
      icon:     '/icono-192.png',
      badge:    '/icono-192.png',
      tag:      tag || 'akimel-notif',
      renotify: true,
      vibrate:  [200, 100, 200],
    });
  }
});

// Al tocar la notificación: abrir/enfocar la app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for(const client of list){
        if(client.url.includes(self.location.origin) && 'focus' in client)
          return client.focus();
      }
      if(clients.openWindow) return clients.openWindow('/');
    })
  );
});
