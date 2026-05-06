import { createSwHarness, flush } from '../../test/sw-harness';

describe('service worker', () => {
  let h;
  beforeEach(() => { h = createSwHarness(); });

  describe('install', () => {
    it('caches the app shell on install', async () => {
      const event = h.makeInstallEvent();
      h.handlers.install(event);

      expect(event.waitUntil.calledOnce).to.be.true;
      await event.waitUntil.args[0][0];

      expect(h.cache.addAll.calledOnce).to.be.true;
      expect(h.cache.addAll.args[0][0]).to.deep.equal([
        '/', '/manifest.json', '/version', '/favicon.ico', '/icon-512.webp'
      ]);
    });
  });

  describe('fetch — early returns', () => {
    it('skips non-GET requests that do not target /version', () => {
      const event = h.makeFetchEvent('POST', 'http://x/api/user');
      h.handlers.fetch(event);
      expect(event.respondWith.called).to.be.false;
      expect(event.waitUntil.called).to.be.false;
    });

    it('processes a non-GET to a URL containing /version', () => {
      // The /version endpoint is the documented exception; e.g. POSTing a
      // version probe still flows through the handler.
      const event = h.makeFetchEvent('POST', 'http://x/version');
      h.handlers.fetch(event);
      expect(event.respondWith.called).to.be.true;
    });

    it('skips any GET to /api/*', () => {
      // /api requests must hit the network, not the cache, so the handler
      // bails before respondWith.
      const event = h.makeFetchEvent('GET', 'http://x/api/entries');
      h.handlers.fetch(event);
      expect(event.respondWith.called).to.be.false;
      expect(event.waitUntil.called).to.be.false;
    });
  });

  describe('fetch — view routes fall through to cached "/"', () => {
    ['/entries', '/search', '/entry/123'].forEach((urlPath) => {
      it(`GET ${urlPath} responds with the cached / asset`, async () => {
        const event = h.makeFetchEvent('GET', 'http://x' + urlPath);
        h.handlers.fetch(event);

        expect(event.respondWith.calledOnce).to.be.true;
        await event.respondWith.args[0][0];

        // First cache.match call is from fromCache; subsequent calls come
        // from update()'s /version probe. The first one is what we care
        // about for the view-route fallback.
        expect(h.cache.match.args[0][0]).to.equal('/');
      });
    });
  });

  describe('fetch — non-view URLs use the original request', () => {
    it('GET /style.css passes the request itself to cache.match', async () => {
      const event = h.makeFetchEvent('GET', 'http://x/style.css');
      h.handlers.fetch(event);

      await event.respondWith.args[0][0];
      const arg = h.cache.match.args[0][0];
      expect(arg).to.be.an('object');
      expect(arg.url).to.equal('http://x/style.css');
    });
  });

  describe('fetch — update() gating', () => {
    it('does not call update() for manifest URLs', () => {
      const event = h.makeFetchEvent('GET', 'http://x/manifest.json');
      h.handlers.fetch(event);
      expect(event.respondWith.called).to.be.true;
      expect(event.waitUntil.called).to.be.false;
    });

    it('does not call update() for icon URLs', () => {
      const event = h.makeFetchEvent('GET', 'http://x/icon-512.webp');
      h.handlers.fetch(event);
      expect(event.respondWith.called).to.be.true;
      expect(event.waitUntil.called).to.be.false;
    });

    it('calls update() for view URLs', () => {
      const event = h.makeFetchEvent('GET', 'http://x/entries');
      h.handlers.fetch(event);
      expect(event.waitUntil.calledOnce).to.be.true;
    });

    it('calls update() for arbitrary asset URLs', () => {
      const event = h.makeFetchEvent('GET', 'http://x/style.css');
      h.handlers.fetch(event);
      expect(event.waitUntil.calledOnce).to.be.true;
    });
  });

  describe('update() — version-driven re-cache', () => {
    function triggerUpdate () {
      const event = h.makeFetchEvent('GET', 'http://x/style.css');
      h.handlers.fetch(event);
      return event;
    }

    it('re-caches / and /version when the fetched version differs', async () => {
      h.store.set('/version', h.fakeResponse({ body: { version: 'old' } }));
      h.setFetchResponse('/version', h.fakeResponse({ body: { version: 'new' } }));
      h.setFetchResponse('/', h.fakeResponse({ status: 200, body: 'shell' }));

      triggerUpdate();
      await flush();

      expect(h.fetchSpy.calledWith('/version')).to.be.true;
      expect(h.fetchSpy.calledWith('/')).to.be.true;
      const putUrls = h.cache.put.args.map(a => a[0]);
      expect(putUrls).to.include('/version');
      expect(putUrls).to.include('/');
    });

    it('does not re-cache when the fetched version matches what is cached', async () => {
      h.store.set('/version', h.fakeResponse({ body: { version: 'same' } }));
      h.setFetchResponse('/version', h.fakeResponse({ body: { version: 'same' } }));

      triggerUpdate();
      await flush();

      expect(h.fetchSpy.calledWith('/version')).to.be.true;
      expect(h.fetchSpy.calledWith('/')).to.be.false;
      expect(h.cache.put.called).to.be.false;
    });

    it('skips the re-cache when fetching / returns a non-2xx', async () => {
      h.store.set('/version', h.fakeResponse({ body: { version: 'old' } }));
      h.setFetchResponse('/version', h.fakeResponse({ body: { version: 'new' } }));
      h.setFetchResponse('/', h.fakeResponse({ status: 500 }));

      triggerUpdate();
      await flush();

      expect(h.fetchSpy.calledWith('/')).to.be.true;
      // The early `if(res.status >= 300) return` guards both put calls.
      expect(h.cache.put.called).to.be.false;
    });
  });
});
