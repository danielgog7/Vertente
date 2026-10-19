// Vertente — service worker: funciona sem internet, atualiza-se sozinha e recebe prints partilhados do Strava.
const CACHE = 'vertente-v1';
const FICHEIROS = ['./', './index.html', './estilo.css', './ia-comum.js', './montanha.js', './app.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHEIROS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith('vertente-v') && k !== CACHE).map(k => caches.delete(k)))) // só as da Vertente: as outras apps partilham o endereço
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // Partilha: o Android envia o print (ou o GPX) por POST para ./partilha
  if (e.request.method === 'POST' && u.origin === location.origin && u.pathname.endsWith('/partilha')){
    e.respondWith((async () => {
      try {
        const f = (await e.request.formData()).get('ficheiro');
        if (f && f.size) await (await caches.open('vertente-partilha')).put('ficheiro', new Response(f, {headers: {'Content-Type': f.type || 'application/octet-stream', 'X-Nome': encodeURIComponent(f.name || '')}}));
      } catch(err){}
      return Response.redirect(new URL('./?partilha=1', self.registration.scope).href, 303);
    })());
    return;
  }
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // a IA passa direta
  e.respondWith(
    fetch(e.request.url, {cache: 'no-cache', credentials: 'same-origin'})
      .then(r => { if (r.ok){ const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); } return r; })
      .catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match('./index.html')))
  );
});
