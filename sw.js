// ═══════════════════════════════════════════════════
// AKIMEL — Service Worker
// Versión: 2.0 — Push Notifications + Offline cache
// ═══════════════════════════════════════════════════

const CACHE_NAME = 'akimel-v2';
const ASSETS = ['/index.html', '/manifest.json', '/icon-192.png'];

// ── INSTALL: cachear assets principales ──
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// ── ACTIVATE: limpiar caches viejos ──
self.addEventListener('activate', event => {
  console.log('[SW] Activado');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH: strategy network-first con fallback a cache ──
self.addEventListener('fetch', event => {
  // Solo cachear peticiones GET del mismo origen
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(res => {
        // Guardar copia fresca en cache
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── PUSH: recibir notificación push del servidor ──
// (Para uso futuro con servidor de push propio o Firebase Cloud Messaging)
self.addEventListener('push', event => {
  console.log('[SW] Push recibido');
  let data = { titulo: '🛝 Akimel', body: 'Nuevo arriendo registrado' };
  try {
    if(event.data) data = { ...data, ...event.data.json() };
  } catch(e) {}

  event.waitUntil(
    self.registration.showNotification(data.titulo || '🛝 Akimel', {
      body:    data.body || '',
      icon:    '/icon-192.png',
      badge:   '/icon-192.png',
      tag:     data.tag || 'akimel-notif',
      renotify: true,
      data:    data,
    })
  );
});

// ── NOTIFICATIONCLICK: abrir la app al tocar la notificación ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Si ya hay una ventana abierta, enfocarla
      for(const client of windowClients){
        if(client.url.includes(self.location.origin) && 'focus' in client){
          return client.focus();
        }
      }
      // Si no, abrir una nueva
      if(clients.openWindow) return clients.openWindow('/');
    })
  );
});

// ── MESSAGE: comunicación con la página principal ──
self.addEventListener('message', event => {
  if(event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if(event.data?.type === 'SHOW_NOTIF'){
    // La página puede pedirle al SW que muestre una notif nativa
    const { titulo, body, tag } = event.data;
    self.registration.showNotification(titulo || '🛝 Akimel', {
      body:    body || '',
      icon:    '/icon-192.png',
      badge:   '/icon-192.png',
      tag:     tag || 'akimel-notif',
      renotify: true,
    });
  }
});
