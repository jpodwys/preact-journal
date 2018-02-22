let version;
var CACHE = 'preact-journal';
 
self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function (cache) {
    cache.addAll(['/']);
  }));
});
 
self.addEventListener('fetch', function(e) {
  if(e.request.method !== 'GET') return
  if(e.request.url.indexOf('/api') > -1) return
  
  // All routes return the same payload. As such, cache only '/'
  // and return its cached value on all routes.
  var reqUrl
  var url = e.request.url
  if(~url.indexOf('/entries') || ~url.indexOf('/entry/')){
    reqUrl = '/';
  }

  e.respondWith(fromCache(reqUrl || e.request));

  e.waitUntil(
    update(e.request)
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
      return cache.put(request, response.clone()).then(function () {
        return response;
      });
    });
  });
}
 
function refresh(response) {
  return self.clients.matchAll().then(function (clients) {
    clients.forEach(function (client) {
      // var message = {
      //   // type: 'refresh',
      //   // url: response.url,
      //   eTag: response.headers.get('ETag')
      // };
      client.postMessage(response.headers.get('ETag'));
    });
  });
}
