// Waiting helpers. Nothing here knows how the app renders, except nextRender().
import fetchMock from 'fetch-mock';

// Captured at import, before any spec installs sinon's fake timers: polling must keep running on real time.
const realSetTimeout = window.setTimeout.bind(window);
const now = performance.now.bind(performance);

export const sleep = (ms = 0) => new Promise(r => realSetTimeout(r, ms));

// Call `callback` (sync or async) until it stops throwing, and resolve with what it returns. Rejects with its last
// error after `timeout` ms. Put every condition that must hold together in ONE callback.
export async function waitFor (callback, { timeout = 1000, interval = 10 } = {}) {
  const deadline = now() + timeout;
  for(;;) {
    try { return await callback(); }
    catch(e) {
      if(now() >= deadline) throw e;
      await sleep(interval);
    }
  }
}

// Wait for every in-flight fetch-mock response (and its .json()) plus the .then/.catch handlers that run after it.
// For assertions about what is true AFTER a request finished, when polling would already pass before it did
// (an optimistic write, or "nothing happened").
export async function networkIdle () {
  await fetchMock.flush(true);
  await sleep(10);
}

// Wait until anything written so far has been rendered (a microtask, then two frames). This is the one helper tied to
// the renderer. Use it only to assert that something did NOT change; to wait for a change, use waitFor or find*.
export async function nextRender () {
  await Promise.resolve();
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}
