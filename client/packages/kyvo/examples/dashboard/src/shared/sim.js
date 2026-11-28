// A simulated exchange. No network: ticks are pre-generated into typed arrays (like a binary
// websocket protocol) and replayed at a wall-clock rate, so the "server" costs the page almost
// nothing and every run sees exactly the same market. Prices are random walks driven by returns,
// so a replay that wraps around just keeps walking.

export const SECTORS = ['Tech', 'Health', 'Finance', 'Energy', 'Industrials', 'Consumer', 'Utilities', 'Materials', 'RealEstate', 'Telecom', 'Staples'];

function prng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const symbolFor = i => { let s = ''; let n = i; for (let k = 0; k < 4; k++) { s = L[n % 26] + s; n = Math.floor(n / 26); } return s + (i >= 26 ** 4 ? i : ''); };

// The static reference data a real app would fetch once at startup.
export function makeUniverse(N, seed = 1) {
  const r = prng(seed), out = [];
  for (let i = 0; i < N; i++) {
    const sym = symbolFor(i);
    const price = Math.round((5 + r() ** 3 * 495) * 100) / 100;
    out.push({
      i, sym, symL: sym.toLowerCase(), name: `${sym} ${['Holdings', 'Systems', 'Group', 'Labs', 'Partners', 'Corp'][i % 6]}`,
      nameL: `${sym} ${['Holdings', 'Systems', 'Group', 'Labs', 'Partners', 'Corp'][i % 6]}`.toLowerCase(),
      sector: SECTORS[Math.floor(r() * SECTORS.length)], price, cap: Math.round(price * (1 + r() * 900)),
    });
  }
  return out;
}

// Symbol popularity is skewed (u^2): low indexes tick far more than the tail, like a real market.
export function makeTicks(N, count, seed = 7) {
  const r = prng(seed);
  const idx = new Uint32Array(count), ret = new Float32Array(count), size = new Uint16Array(count);
  for (let k = 0; k < count; k++) {
    idx[k] = Math.min(N - 1, Math.floor(N * r() ** 2));
    ret[k] = (r() + r() + r() - 1.5) * 0.0016;
    size[k] = 1 + Math.floor(r() * 500);
  }
  return { idx, ret, size, count };
}

// Delivers `rate` ticks/second as messages (a message = a subarray view of the tick arrays, one
// per timer fire). Tick counts come from elapsed wall-clock time, so a busy main thread delays
// delivery but never loses throughput (like a socket buffer). Returns { stop, sent }.
export function feed(ticks, rate, onMessage, intervalMs = 8) {
  let cursor = 0, last = performance.now(), carry = 0, sent = 0;
  const id = setInterval(() => {
    const now = performance.now();
    carry += (now - last) * rate / 1000; last = now;
    let n = Math.floor(carry); carry -= n;
    while (n > 0) {
      const take = Math.min(n, ticks.count - cursor);
      onMessage({ idx: ticks.idx.subarray(cursor, cursor + take), ret: ticks.ret.subarray(cursor, cursor + take), size: ticks.size.subarray(cursor, cursor + take), t: now });
      cursor = (cursor + take) % ticks.count; n -= take; sent += take;
    }
  }, intervalMs);
  return { stop: () => clearInterval(id), get sent() { return sent; } };
}

// A fake level-2 order book around `mid`: `levels` price levels a side with random sizes.
export function makeBook(mid, levels, r = Math.random) {
  const step = Math.max(0.01, Math.round(mid * 0.0005 * 100) / 100), bids = [], asks = [];
  for (let k = 0; k < levels; k++) {
    bids.push({ px: Math.round((mid - step * (k + 1)) * 100) / 100, sz: 100 + Math.floor(r() * 5000) });
    asks.push({ px: Math.round((mid + step * (k + 1)) * 100) / 100, sz: 100 + Math.floor(r() * 5000) });
  }
  return { bids, asks };
}
