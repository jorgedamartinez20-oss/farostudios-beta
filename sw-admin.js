/* Faro Workspace · avisos push. Recibe el aviso del servidor y lo muestra como notificación del sistema. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data ? event.data.text() : '' }; }
  const titulo = d.title || 'Faro Workspace';
  event.waitUntil(self.registration.showNotification(titulo, {
    body: d.body || '',
    icon: 'admin-icon-192.png',
    badge: 'admin-icon-192.png',
    tag: d.tag || undefined,
    data: { url: d.url || 'admin.html' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || 'admin.html', self.registration.scope).href;
  event.waitUntil((async () => {
    const todas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of todas) {
      if (c.url.startsWith(new URL('admin.html', self.registration.scope).href) && 'focus' in c) return c.focus();
    }
    return self.clients.openWindow(destino);
  })());
});
