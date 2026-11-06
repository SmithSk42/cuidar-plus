const CACHE='cuidar-pagina-offline-v1';
self.addEventListener('install',evento=>evento.waitUntil(caches.open(CACHE).then(c=>c.add('/offline.html')).then(()=>self.skipWaiting())));
self.addEventListener('activate',evento=>evento.waitUntil(self.clients.claim()));
self.addEventListener('fetch',evento=>{
  if(evento.request.method!=='GET'||evento.request.mode!=='navigate')return;
  const url=new URL(evento.request.url);
  if(url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  evento.respondWith(fetch(evento.request).catch(()=>caches.match('/offline.html')));
});
