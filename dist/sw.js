self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('preact-journal')
    .then(cache => cache.addAll(['/index.html', '/bundle.js', '/styles.css']))
  )
})

self.addEventListener('fetch', function(event) {
  if(event.request.url.indexOf('/api') > -1) return;
  event.respondWith(
    caches.match(event.request)
    .then(response => response
      ? response
      : fetch(event.request)
    )
  )
})
