// Stamped by the build (sw() in gulpfile.js) so that every deploy's sw.js differs. The browser installs a changed
// worker on its own update check (it re-checks sw.js each time the page registers it), and installing re-fetches the shell below.
const VERSION = '';
const CACHE = 'preact-journal';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/', '/manifest.json'])));
});

self.addEventListener('fetch', e => {
  const { method, url } = e.request;
  if(method !== 'GET' || ~url.indexOf('/api')) return;

  // All view routes return the same payload. As such, cache only '/'
  // and return its cached value for all view routes.
  const view = ~url.indexOf('/entries') || ~url.indexOf('/search') || ~url.indexOf('/entry/');

  // Anything that is not cached (the icons, a deep link the shell does not know) goes to the network.
  e.respondWith(caches.open(CACHE).then(cache => cache.match(view ? '/' : e.request)).then(hit => hit || fetch(e.request)));
});
