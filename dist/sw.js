self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open('preact-journal').then(function(cache) {
      return cache.addAll(['/', '/entries', '/entry/new', '/bundle.js', '/styles.css']);
    })
  );
});

self.addEventListener('fetch', function(e) {
  if(e.request.url.indexOf('/api') > -1) return;
  e.respondWith(
    caches.match(e.request)
    .then(response => response
      ? response
      : fetch(e.request)
    )
  )
})
