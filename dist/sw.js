self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('preact-journal')
    .then(cache => cache.addAll(['/index.js']))
  )
})

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
    .then(response => response
      ? response
      : fetch(event.request)
    )
  )
})
