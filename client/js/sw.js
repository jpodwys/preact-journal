const CACHE = 'preact-journal';
 
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => {
    cache.addAll(['/', '/manifest.json', '/version', '/favicon-16.ico', '/icon-512x512.png']);
  }));
});
 
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET' && !~e.request.url.indexOf('/version')) return
  if(~e.request.url.indexOf('/api')) return
  
  // All routes return the same payload. As such, cache only '/'
  // and return its cached value on all routes.
  let reqUrl;
  let url = e.request.url
  if(~url.indexOf('/entries') || ~url.indexOf('/entry/')){
    reqUrl = '/';
  }

  e.respondWith(fromCache(reqUrl || e.request));

  if(~url.indexOf('manifest') || ~url.indexOf('icon')) return;
  e.waitUntil(
    update(reqUrl || e.request)
    // .then(refresh)
  );
});
 
function fromCache(request) {
  return caches.open(CACHE).then(cache => {
    return cache.match(request);
  });
}
 
function update(request) {
  // Fetch app version number. If it differs from the one stored,
  // store the new one and fetch and store the new index.html
  return caches.open(CACHE).then(cache => {
    let versionRes;
    return fetch('/version')
      .then(res => {
        versionRes = res.clone();
        return res.json();
      })
      .then(version => {
        cache.match('/version')
          .then(res => res.json())
          .then(match => {
            if(version.version === match.version) return;
            cache.put('/version', versionRes.clone());
            return fetch('/').then(res => {
              if(res.status >= 300) return;
              return cache.put('/', res.clone()).then(() => {
                return res;
              });
            });
      });
    }).catch(err => console.log(err));
  });
}
 
// function refresh(response) {
//   if(!response) return;
//   return self.clients.matchAll().then(clients => {
//     clients.forEach(client => {
//       client.postMessage(response.headers.get('ETag'));
//     });
//   });
// }
