let version;
let CACHE = 'preact-journal';
 
self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function (cache) {
    cache.addAll(['/', '/manifest.json', '/favicon.ico']);
  }));
});
 
self.addEventListener('fetch', function(e) {
  if(e.request.method !== 'GET') return
  if(~e.request.url.indexOf('/api')) return
  
  // All routes return the same payload. As such, cache only '/'
  // and return its cached value on all routes.
  let reqUrl;
  let url = e.request.url
  if(~url.indexOf('/entries') || ~url.indexOf('/entry/')){
    reqUrl = '/';
  }

  e.respondWith(fromCache(reqUrl || e.request));

  if(~url.indexOf('manifest')) return;
  e.waitUntil(
    update(reqUrl || e.request)
    .then(refresh)
  );
});
 
function fromCache(request) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request);
  });
}
 
function update(request) {
  return caches.open(CACHE).then(function (cache) {
    return fetch(request).then(function (response) {
      if(response.status >= 300) return;
      return cache.put(request, response.clone()).then(function () {
        return response;
      });
    });
  });
}
 
function refresh(response) {
  if(!response) return;
  return self.clients.matchAll().then(function (clients) {
    clients.forEach(function (client) {
      client.postMessage(response.headers.get('ETag'));
    });
  });
}
