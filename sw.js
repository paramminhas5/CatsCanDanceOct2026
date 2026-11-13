/* Cats Can Dance: keeps your tickets and the core pages working without signal. */
const C='ccd-v18',CORE=['pages/home.html','pages/ticket.html','pages/nights.html','ds.css','tokens.css','ds.js','ds-product.js','object.js','data.js','assets/img/logo.png','assets/fonts/outfit.woff2','assets/fonts/anybody.woff2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE.map(p=>new URL(p,self.registration.scope).href))).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp)).catch(()=>{});return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})))});
