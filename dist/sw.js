var duplicateEntries = ['/entries', '/entry/new'];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open('preact-journal').then(function(cache) {
      return cache.addAll(['/', '/bundle.js', '/styles.css'])
    })
  )
})

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

  e.respondWith(
    caches.match(reqUrl || e.request)
    .then(response => response
      ? response
      : fetch(e.request)
    )
  )
})
