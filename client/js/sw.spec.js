import { createSwHarness } from '../../test/sw-harness';

describe('service worker', () => {
  let h;
  beforeEach(() => { h = createSwHarness(); });

  describe('install', () => {
    it('caches only the app shell on install, and waits for it', async () => {
      const event = h.makeInstallEvent();
      h.handlers.install(event);

      expect(event.waitUntil.calledOnce).to.be.true;
      await event.waitUntil.args[0][0];

      expect(h.cache.addAll.calledOnce).to.be.true;
      // The icons are deliberately not here: they are not needed to run, and
      // precaching them downloaded about twice the page on every first visit.
      expect(h.cache.addAll.args[0][0]).to.deep.equal(['/', '/manifest.json']);
    });

    it('fails the install when the shell cannot be cached (no worker with an empty cache)', async () => {
      h.cache.addAll = sinon.spy(() => Promise.reject(new Error('offline')));
      const event = h.makeInstallEvent();
      h.handlers.install(event);

      let failed = false;
      await event.waitUntil.args[0][0].catch(() => { failed = true; });
      expect(failed).to.be.true;
    });
  });

  describe('fetch — early returns', () => {
    it('skips every non-GET request', () => {
      ['POST', 'PATCH', 'DELETE'].forEach(method => {
        const event = h.makeFetchEvent(method, 'http://x/anything');
        h.handlers.fetch(event);
        expect(event.respondWith.called).to.be.false;
      });
    });

    it('skips any GET to /api/*', () => {
      // /api requests must hit the network, not the cache, so the handler
      // bails before respondWith.
      const event = h.makeFetchEvent('GET', 'http://x/api/entries');
      h.handlers.fetch(event);
      expect(event.respondWith.called).to.be.false;
    });

    it('no longer asks the server for a /version, and has nothing to wait on', () => {
      const event = h.makeFetchEvent('GET', 'http://x/entries');
      h.handlers.fetch(event);
      expect(event.waitUntil.called).to.be.false;
      expect(h.fetchSpy.called).to.be.false;
    });
  });

  describe('fetch — view routes fall through to cached "/"', () => {
    ['/entries', '/search', '/entry/123'].forEach((urlPath) => {
      it(`GET ${urlPath} responds with the cached / asset`, async () => {
        const cached = h.fakeResponse({ body: 'shell' });
        h.store.set('/', cached);
        const event = h.makeFetchEvent('GET', 'http://x' + urlPath);
        h.handlers.fetch(event);

        expect(event.respondWith.calledOnce).to.be.true;
        expect(await event.respondWith.args[0][0]).to.equal(cached);
        expect(h.cache.match.calledWith('/')).to.be.true;
        expect(h.fetchSpy.called).to.be.false;
      });
    });
  });

  describe('fetch — other URLs', () => {
    it('GET of a cached URL passes the request itself to cache.match and does not touch the network', async () => {
      const cached = h.fakeResponse({ body: 'manifest' });
      h.store.set('http://x/manifest.json', cached);
      const event = h.makeFetchEvent('GET', 'http://x/manifest.json');
      h.handlers.fetch(event);

      expect(await event.respondWith.args[0][0]).to.equal(cached);
      expect(h.cache.match.calledWith(sinon.match({ url: 'http://x/manifest.json' }))).to.be.true;
      expect(h.fetchSpy.called).to.be.false;
    });

    it('GET of a URL that is not cached (an icon) falls back to the network', async () => {
      const fromNetwork = h.fakeResponse({ body: 'icon' });
      h.setFetchResponse('http://x/icon-512.webp', fromNetwork);
      const event = h.makeFetchEvent('GET', 'http://x/icon-512.webp');
      h.handlers.fetch(event);

      expect(await event.respondWith.args[0][0]).to.equal(fromNetwork);
      expect(h.fetchSpy.calledOnce).to.be.true;
    });
  });
});
