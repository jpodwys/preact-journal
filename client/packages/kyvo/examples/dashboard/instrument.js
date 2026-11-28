// Loaded BEFORE the app. Wraps requestAnimationFrame so every kyvo flush (the only rAF user) is timed,
// then forces layout so style+layout cost is attributed to the render that caused it. Also watches frame
// pacing, event-loop lateness and long tasks. Feeds both the on-page HUD and the automated benchmark.
(() => {
  const raf = window.requestAnimationFrame.bind(window);
  const RING = 240, ring = { flush: [], layout: [], frame: [], delay: [] };
  let cap = null;                                   // while measuring: arrays that keep everything
  const rec = (k, v) => { const r = ring[k]; r.push(v); if (r.length > RING) r.shift(); if (cap) cap[k].push(v); };
  window.__ring = ring;
  const T = { work: 0 };                            // cumulative flush+layout ms, for the HUD's busy %

  window.requestAnimationFrame = cb => raf(t => {
    const a = performance.now(); cb(t);
    const b = performance.now(); void document.body.offsetHeight;
    const c = performance.now();
    rec('flush', b - a); rec('layout', c - b); T.work += c - a;
  });

  // For frameworks that schedule their own renders (Preact): time a render callback exactly like a kyvo flush
  // (JS, then a forced layout). `__raf` is the real rAF, so a rAF-based scheduler is not timed twice.
  window.__raf = raf;
  window.__timeRender = fn => {
    const a = performance.now(); fn();
    const b = performance.now(); void document.body.offsetHeight;
    const c = performance.now();
    rec('flush', b - a); rec('layout', c - b); T.work += c - a;
  };

  let prev = 0;
  const loop = t => { if (prev) rec('frame', t - prev); prev = t; raf(loop); };
  raf(loop);
  let expect = performance.now() + 10;
  setInterval(() => { const n = performance.now(); rec('delay', Math.max(0, n - expect)); expect = n + 10; }, 10);

  let longTasks = [];
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) longTasks.push(e.duration); }).observe({ entryTypes: ['longtask'] }); } catch (e) {}

  const pct = (a, p) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const sum = a => a.reduce((x, y) => x + y, 0);
  const stats = a => ({ p50: pct(a, .5), p95: pct(a, .95), p99: pct(a, .99), max: a.length ? Math.max(...a) : 0, mean: a.length ? sum(a) / a.length : 0 });
  window.__stats = { pct, sum, stats };

  // Scroll driver: a continuous "fling" over the main grid, bouncing end to end.
  let drive = 0, dir = 1;
  const step = () => {
    const el = document.querySelector('.grid-scroll');
    if (drive && el) { el.scrollTop += dir * drive; if (el.scrollTop <= 0) dir = 1; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) dir = -1; }
    raf(step);
  };
  raf(step);
  window.__scrollDrive = px => { drive = px; };

  window.__measure = ms => new Promise(res => {
    const probe = window.__probe || { applyMs: 0, applies: 0, ticks: 0, writes: 0 };
    const p0 = { ...probe }, t0 = performance.now(), lt0 = longTasks.length;
    cap = { flush: [], layout: [], frame: [], delay: [] };
    setTimeout(() => {
      const c = cap; cap = null;
      const secs = (performance.now() - t0) / 1000, p1 = window.__probe || p0;
      const work = c.flush.map((f, k) => f + (c.layout[k] || 0));
      const lts = longTasks.slice(lt0), applyMs = p1.applyMs - p0.applyMs;
      res({
        seconds: +secs.toFixed(2), flushes: c.flush.length, flushPerSec: +(c.flush.length / secs).toFixed(1),
        flush: stats(c.flush), layout: stats(c.layout), work: stats(work),
        fps: +(c.frame.length / secs).toFixed(1), frame: stats(c.frame),
        dropped: +(100 * c.frame.filter(x => x > 25).length / Math.max(1, c.frame.length)).toFixed(1),
        delay: stats(c.delay), longTasks: lts.length, longTaskMs: +sum(lts).toFixed(0),
        ticksPerSec: Math.round((p1.ticks - p0.ticks) / secs), writesPerSec: +((p1.writes - p0.writes) / secs).toFixed(1),
        applyMsPerSec: +(applyMs / secs).toFixed(1),
        deriveMsPerSec: +(((p1.deriveMs || 0) - (p0.deriveMs || 0)) / secs).toFixed(1), renderMsPerSec: +(sum(work) / secs).toFixed(1),
        busyPct: +(100 * (sum(work) + applyMs) / (secs * 1000)).toFixed(1),
        heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
        domNodes: document.getElementsByTagName('*').length,
      });
    }, ms);
  });

  // ---------------------------------------------------------------- HUD
  window.__hud = () => {
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML = '<div class="hud-title"><span>Performance</span><span id="hud-mode"></span></div><div class="big">' +
      '<div><em>FPS</em><b id="h-fps">–</b></div><div><em>Render p95</em><b id="h-p95">–</b></div><div><em>Busy</em><b id="h-busy">–</b></div></div>' +
      '<canvas id="h-cv" width="544" height="88"></canvas><div class="meta"><span id="h-ticks"></span><span id="h-dom"></span></div>';
    document.body.appendChild(hud);
    hud.querySelector('.hud-title').onclick = () => { hud.classList.toggle('min'); };
    const cv = hud.querySelector('canvas'), g = cv.getContext('2d'), probe = () => window.__probe || { ticks: 0, applyMs: 0 };
    let last = { t: performance.now(), ticks: 0, applyMs: 0, work: 0 };
    const cls = (el, v, warn, bad) => { el.className = v >= bad ? 'bad' : v >= warn ? 'warn' : 'good'; };
    setInterval(() => {
      const now = performance.now(), secs = (now - last.t) / 1000, p = probe();
      const w = ring.flush.map((f, k) => f + (ring.layout[k] || 0)), fr = ring.frame.slice(-60);
      const fps = fr.length ? 1000 / (sum(fr) / fr.length) : 0, p95 = pct(w, .95);
      const busy = 100 * ((T.work - last.work) + (p.applyMs - last.applyMs)) / (now - last.t);
      const f = document.getElementById('h-fps'), r = document.getElementById('h-p95'), b = document.getElementById('h-busy');
      f.textContent = fps.toFixed(0); cls(f, 60 - fps, 8, 25);
      r.textContent = p95.toFixed(1) + 'ms'; cls(r, p95, 8, 16.7);
      b.textContent = busy.toFixed(0) + '%'; cls(b, busy, 50, 90);
      document.getElementById('h-ticks').textContent = Math.round((p.ticks - last.ticks) / secs).toLocaleString() + ' ticks/s';
      document.getElementById('h-dom').textContent = document.getElementsByTagName('*').length.toLocaleString() + ' nodes';
      last = { t: now, ticks: p.ticks, applyMs: p.applyMs, work: T.work };
      // flush+layout history with the 16.7 ms frame budget
      const W = cv.width, H = cv.height, max = Math.max(20, ...w);
      g.clearRect(0, 0, W, H);
      g.strokeStyle = 'rgba(251,191,36,.45)'; g.setLineDash([4, 4]); g.beginPath();
      const by = H - 16.7 / max * (H - 6) - 3; g.moveTo(0, by); g.lineTo(W, by); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(110,231,249,.85)';
      w.forEach((v, k) => { const bw = W / RING, bh = v / max * (H - 6); g.fillStyle = v > 16.7 ? '#fb7185' : 'rgba(110,231,249,.85)'; g.fillRect(k * bw, H - bh - 3, Math.max(1, bw - 1), bh); });
    }, 500);
  };
})();
