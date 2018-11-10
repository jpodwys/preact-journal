const CACHE = 'preact-journal';
 
self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function (cache) {
    cache.addAll(['/', '/manifest.json', '/version', '/favicon-16.ico', '/icon-512x512.png']);
  }));
});
 
self.addEventListener('fetch', function(e) {
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
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request);
  });
}
 
function update(request) {
  // Fetch new static json asset with the version number
  // If it differs from the one stored, store the new one and fetch and store the new index.html
  return caches.open(CACHE).then(function (cache) {
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
            console.log('version', version);
            console.log('match', match);
            if(version.version === match.version) return;
            cache.put('/version', versionRes.clone());
            return fetch('/').then(function (res) {
              if(res.status >= 300) return;
              return cache.put('/', res.clone()).then(function () {
                return res;
              });
            });
            // return fetch(request).then(function (res) {
            //   if(res.status >= 300) return;
            //   return cache.put(request, res.clone()).then(function () {
            //     return res;
            //   });
            // });
      });
    }).catch(err => console.log(err));
  });

  // return caches.open(CACHE).then(function (cache) {
    // return fetch(request).then(function (response) {
    //   if(response.status >= 300) return;
    //   return cache.put(request, response.clone()).then(function () {
    //     return response;
    //   });
    // });
  // });
}
 
// function refresh(response) {
//   if(!response) return;
//   return self.clients.matchAll().then(function (clients) {
//     clients.forEach(function (client) {
//       client.postMessage(response.headers.get('ETag'));
//     });
//   });
// }
