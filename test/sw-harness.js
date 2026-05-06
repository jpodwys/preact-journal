// Loads sw.js source (injected at build time by webpack DefinePlugin in
// test/karma.conf.js) into a sandbox so we can drive its registered
// handlers with synthetic events. Production sw.js is unchanged — we run
// the actual file through `new Function(...)` with our own `self`,
// `caches`, and `fetch` stubs.

/* global SW_SOURCE */

export function createSwHarness () {
  const handlers = {};
  const self = {
    addEventListener: (name, fn) => { handlers[name] = fn; }
  };

  // In-memory cache: url string → fake response.
  const store = new Map();
  const cache = {
    addAll: sinon.spy(() => Promise.resolve()),
    match: sinon.spy((reqOrUrl) => {
      const url = typeof reqOrUrl === 'string' ? reqOrUrl : reqOrUrl.url;
      return Promise.resolve(store.get(url));
    }),
    put: sinon.spy((reqOrUrl, response) => {
      const url = typeof reqOrUrl === 'string' ? reqOrUrl : reqOrUrl.url;
      store.set(url, response);
      return Promise.resolve();
    })
  };
  const caches = {
    open: sinon.spy(() => Promise.resolve(cache))
  };

  const fetchResponses = new Map();
  const fetchSpy = sinon.spy((url) => {
    if(!fetchResponses.has(url)){
      return Promise.reject(new Error('No fetch mock configured for ' + url));
    }
    return Promise.resolve(fetchResponses.get(url));
  });

  function fakeResponse ({ status = 200, body = null } = {}) {
    return {
      status,
      // Real Response.clone() returns a fresh, independently-readable copy.
      // Returning a fresh fakeResponse each time models that.
      clone () { return fakeResponse({ status, body }); },
      json () { return Promise.resolve(body); }
    };
  }

  // Evaluate the real sw.js source with our fakes shadowing globals.
  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'fetch', SW_SOURCE)(self, caches, fetchSpy);

  return {
    handlers,
    cache,
    caches,
    store,
    fetchSpy,
    fakeResponse,
    setFetchResponse (url, response) { fetchResponses.set(url, response); },
    makeInstallEvent () {
      return { waitUntil: sinon.spy() };
    },
    makeFetchEvent (method, url) {
      return {
        request: { method, url },
        respondWith: sinon.spy(),
        waitUntil: sinon.spy()
      };
    }
  };
}

// update()'s inner `cache.match('/version').then(...)` chain isn't returned
// from the outer .then, so awaiting waitUntil's promise can resolve before
// the cache.put calls land. Drain a few ticks to let the chain settle.
export async function flush (ticks = 6) {
  for(let i = 0; i < ticks; i++){
    await new Promise(r => setTimeout(r, 0));
  }
}
