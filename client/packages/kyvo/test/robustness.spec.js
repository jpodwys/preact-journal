const { expect } = window.chai; // karma-chai global: a mangled bundle must not rewrite chai itself
import { h, render, store, watch } from '../core.js';
import { mount, frame, captureErrors, devOnly } from './core.spec.js';

// Seeded PRNG so a failing fuzz run is reproducible.
const rng = seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

describe('keys and identity', () => {
  const list = keys => <ul>{keys.map(k => <li key={k}>{k}</li>)}</ul>;

  it('numeric keys, including 0, keep their nodes across reorders', () => {
    const host = mount(list([0, 1, 2]));
    const [a, b, c] = host.querySelectorAll('li');
    render(list([2, 0, 1]), host);
    const lis = host.querySelectorAll('li');
    expect([lis[0], lis[1], lis[2]]).to.deep.equal([c, a, b]);
    expect(host.textContent).to.equal('201');
  });

  it('number and string keys are different keys', () => {
    const host = mount(list([1, '1']));
    const [n, s] = host.querySelectorAll('li');
    render(list(['1', 1]), host);
    const lis = host.querySelectorAll('li');
    expect(lis[0]).to.equal(s);
    expect(lis[1]).to.equal(n);
  });

  it('keyed and unkeyed siblings coexist; an unkeyed child is matched by position', () => {
    const host = mount(<div><i key="k">k</i><b>one</b><b>two</b></div>);
    const [i, b1] = [host.querySelector('i'), host.querySelector('b')];
    render(<div><i key="k">k</i><b>ONE</b><b>TWO</b></div>, host);
    expect(host.querySelector('i')).to.equal(i);
    expect(host.querySelector('b')).to.equal(b1);
    expect(host.textContent).to.equal('kONETWO');
  });

  it('the same component type at the same position is reused (state survives)', async () => {
    let s;
    const C = ({ label }, ctx) => { s = ctx.state({ n: 0 }); return <p>{label}{s.n}</p>; };
    const host = mount(<div><C label="a" /></div>);
    s.n = 5;
    await frame();
    render(<div><C label="b" /></div>, host);
    expect(host.textContent).to.equal('b5');
  });

  it('changing the key remounts: state resets and the old instance cleans up', () => {
    const log = [];
    const C = ({ label }, ctx) => {
      const s = ctx.state({ n: label });
      ctx.mount(() => () => log.push('cleanup ' + label));
      return <p>{s.n}</p>;
    };
    const host = mount(<div><C key="a" label="a" /></div>);
    render(<div><C key="b" label="b" /></div>, host);
    expect(host.textContent).to.equal('b');
    expect(log).to.deep.equal(['cleanup a']);
  });
});

describe('what a component may return', () => {
  it('null, undefined, false and \'\' render nothing; 0 renders "0"', () => {
    for (const out of [null, undefined, false, '']) {
      const C = () => out;
      const host = mount(<div><C /></div>);
      expect(host.textContent).to.equal('');
    }
    const Z = () => 0;
    expect(mount(<div><Z /></div>).textContent).to.equal('0');
  });

  it('swaps between nothing, text and elements without leaking nodes', () => {
    const C = ({ v }) => v;
    const host = mount(<div><C v={null} /></div>);
    for (const v of [<b>x</b>, 'text', null, 7, <i>y</i>, null]) {
      render(<div><C v={v} /></div>, host);
    }
    expect(host.firstChild.childNodes.length).to.equal(1);
    expect(host.textContent).to.equal('');
  });

  it('a component may return another component', () => {
    const Inner = ({ n }) => <i>{n}</i>;
    const Outer = ({ n }) => <Inner n={n} />;
    const host = mount(<div><Outer n={1} /></div>);
    render(<div><Outer n={2} /></div>, host);
    expect(host.textContent).to.equal('2');
    expect(host.querySelectorAll('i').length).to.equal(1);
  });
});

describe('a render that throws', () => {
  it('on update leaves the framework usable and reports the error to the caller', () => {
    const Bad = ({ bad }) => { if (bad) throw new Error('boom'); return <p>ok</p>; };
    const host = mount(<div><Bad bad={false} /></div>);
    expect(() => render(<div><Bad bad={true} /></div>, host)).to.throw('boom');
    render(<div><Bad bad={false} /></div>, host);
    expect(host.textContent).to.equal('ok');
  });

  it('does not leave own-render suppression stuck: a state write right after a failed render still renders', async () => {
    let s, bad = false;
    const C = (p, ctx) => {
      s = ctx.state({ n: 0 });
      if (bad) throw new Error('boom');
      return <p>{s.n}</p>;
    };
    const host = mount(<C />);
    bad = true;
    expect(() => render(<C />, host)).to.throw('boom');
    bad = false;
    // No successful render has happened since the throw; only the write can recover the UI.
    s.n = 9;
    await frame();
    expect(host.textContent).to.equal('9');
  });

  it('a flush that throws does not stop later writes from rendering', async () => {
    const g = store({ bad: false, n: 0 });
    const C = () => { if (g.bad) throw new Error('boom'); return <p>{g.n}</p>; };
    const host = mount(<C />);
    const cap = captureErrors();
    g.bad = true;
    await frame();
    cap.restore();
    expect(cap.errs.length).to.equal(1);
    g.bad = false;
    g.n = 3;
    await frame();
    expect(host.textContent).to.equal('3');
  });
});

describe('mount and cleanup ordering', () => {
  it('mount callbacks run parent-first, only after the whole tree is attached', () => {
    const log = [];
    const Child = (p, ctx) => { ctx.mount(() => { log.push('child'); }); return <i id="rc" />; };
    const Parent = (p, ctx) => {
      ctx.mount(() => { log.push('parent sees child: ' + !!document.getElementById('rc')); });
      return <div><Child /></div>;
    };
    mount(<Parent />);
    expect(log).to.deep.equal(['parent sees child: true', 'child']);
  });

  it('cleanups run parent-first on unmount', () => {
    const log = [];
    const Child = (p, ctx) => { ctx.mount(() => () => log.push('child')); return <i />; };
    const Parent = (p, ctx) => { ctx.mount(() => () => log.push('parent')); return <div><Child /></div>; };
    const host = mount(<Parent />);
    render(null, host);
    expect(log).to.deep.equal(['parent', 'child']);
  });

  it('a component\'s mount sees the element its own ref captured', () => {
    let seen;
    const C = (p, ctx) => {
      ctx.mount(() => { seen = ctx.el && ctx.el.tagName; });
      return <div ref={el => { ctx.el = el; }} />;
    };
    mount(<C />);
    expect(seen).to.equal('DIV');
  });

  it('every ref runs before any mount callback (refs in tree order, then mounts in tree order)', () => {
    const log = [];
    const Child = (p, ctx) => { ctx.mount(() => log.push('child mount')); return <i ref={() => log.push('child ref')} />; };
    const Parent = (p, ctx) => { ctx.mount(() => log.push('parent mount')); return <div ref={() => log.push('parent ref')}><Child /></div>; };
    mount(<Parent />);
    expect(log).to.deep.equal(['parent ref', 'child ref', 'parent mount', 'child mount']);
  });

  it('a throwing ref does not stop the other refs or the mount callbacks; the first error is rethrown', () => {
    const log = [];
    const C = (p, ctx) => {
      ctx.mount(() => log.push('mount'));
      return <div ref={() => { log.push('ref 1'); throw new Error('ref boom'); }}><i ref={() => log.push('ref 2')} /></div>;
    };
    expect(() => mount(<C />)).to.throw('ref boom');
    expect(log).to.deep.equal(['ref 1', 'ref 2', 'mount']);
  });

  it('a render that throws drops the refs it had queued as well as its mounts', () => {
    const log = [];
    const Bad = () => { throw new Error('render failed'); };
    expect(() => mount(<div ref={() => log.push('stale ref')}><Bad /></div>)).to.throw('render failed');
    mount(<p ref={() => log.push('good ref')} />);
    expect(log).to.deep.equal(['good ref']);
  });

  it('refs are cleared when an ancestor unmounts', () => {
    const log = [];
    const host = mount(<div><span ref={el => log.push(el && el.tagName)} /></div>);
    render(null, host);
    expect(log).to.deep.equal(['SPAN', null]);
  });

  it('a write from a mount callback schedules exactly one more render', async () => {
    const g = store({ n: 0 });
    let calls = 0;
    const C = (p, ctx) => { calls++; ctx.mount(() => { g.n = 1; g.n = 2; }); return <p>{g.n}</p>; };
    const host = mount(<C />);
    await frame();
    expect(calls).to.equal(2);
    expect(host.textContent).to.equal('2');
  });
});

describe('store details', () => {
  it('watch works on ctx.state stores', () => {
    const log = [];
    let s;
    const C = (p, ctx) => { s = ctx.state({ a: 1 }); return <p />; };
    mount(<C />);
    watch(s, (k, n, p) => log.push([k, n, p]));
    s.a = 2;
    expect(log).to.deep.equal([['a', 2, 1]]);
  });

  it('Object.assign writes every key through the trap, in order, with one render', async () => {
    const g = store({ a: 0, b: 0, c: 0 });
    const log = [];
    watch(g, k => log.push(k));
    let calls = 0;
    const C = () => { calls++; return <p>{g.a + g.b + g.c}</p>; };
    const host = mount(<C />);
    Object.assign(g, { a: 1, b: 2, c: 3 });
    await frame();
    expect(log).to.deep.equal(['a', 'b', 'c']);
    expect(calls).to.equal(2);
    expect(host.textContent).to.equal('6');
  });

  it('symbol keys and new keys work', async () => {
    const sym = Symbol('s');
    const g = store({});
    const C = () => <p>{String(g[sym])}{String(g.fresh)}</p>;
    const host = mount(<C />);
    g[sym] = 'x';
    g.fresh = 'y';
    await frame();
    expect(host.textContent).to.equal('xy');
  });

  it('a write to a different store than the one rendered still renders the root', async () => {
    const a = store({ n: 0 }), b = store({ n: 0 });
    const C = () => <p>{a.n + b.n}</p>;
    const host = mount(<C />);
    b.n = 4;
    await frame();
    expect(host.textContent).to.equal('4');
  });
});

describe('DOM details', () => {
  it('setting a handler to null removes it; an unchanged handler is not re-added', () => {
    const adds = [];
    const orig = Element.prototype.addEventListener;
    Element.prototype.addEventListener = function (t, ...r) { adds.push(t); return orig.call(this, t, ...r); };
    try {
      const calls = [];
      const fn = () => calls.push(1);
      const host = mount(<button onclick={fn} />);
      render(<button onclick={fn} />, host);
      expect(adds.filter(t => t == 'click').length).to.equal(1);
      render(<button onclick={null} />, host);
      host.firstChild.click();
      expect(calls.length).to.equal(0);
    } finally { Element.prototype.addEventListener = orig; }
  });

  it('style moves between string, object and nothing', () => {
    const host = mount(<div style="color: red" />);
    render(<div style={{ color: 'blue', marginTop: '3px' }} />, host);
    expect(host.firstChild.style.color).to.equal('blue');
    render(<div style="color: green" />, host);
    expect(host.firstChild.style.color).to.equal('green');
    render(<div />, host);
    expect(host.firstChild.style.color).to.equal('');
  });

  it('rendering into a host with foreign children leaves them alone', () => {
    const host = document.createElement('div');
    host.innerHTML = '<script></script><span id="foreign"></span>';
    document.body.appendChild(host);
    render(<p>mine</p>, host);
    expect(host.querySelector('#foreign')).to.not.equal(null);
    expect(host.textContent).to.equal('mine');
    render(null, host);
    expect(host.querySelector('#foreign')).to.not.equal(null);
    host.remove();
  });

  it('numbers, 0 and empty strings render as text children', () => {
    const host = mount(<p>{0}{''}{1.5}</p>);
    expect(host.textContent).to.equal('01.5');
  });
});

describe('render-loop guard boundary', () => {
  it('a render-time write that settles after a few passes is fine; the count resets', async function () {
    this.timeout(8000);
    const g = store({ n: 0 });
    const C = () => { if (g.n < 10) g.n = g.n + 1; return <p>{g.n}</p>; };
    const cap = captureErrors();
    const host = mount(<C />);
    for (let i = 0; i < 14; i++) await frame();
    expect(host.textContent).to.equal('10');
    g.n = 0; // starts a fresh chain, which must not inherit the old count
    for (let i = 0; i < 14; i++) await frame();
    cap.restore();
    expect(cap.errs.length).to.equal(0);
    expect(host.textContent).to.equal('10');
  });
});

describe('randomized keyed diff (seeded fuzz)', () => {
  it('matches the expected DOM and keeps per-key state through 300 random edits', async function () {
    this.timeout(20000);
    const rand = rng(12345);
    const Item = ({ id }, ctx) => {
      const s = ctx.state({ seen: id });
      return <li data-id={id}>{id}:{s.seen}</li>;
    };
    let items = [];
    const view = () => (
      <ul>{items.map(it => it.key == null ? <b>{it.text}</b> : <Item key={it.key} id={it.key} />)}</ul>
    );
    const host = mount(view());
    const nodes = new Map();
    let nextId = 0;
    for (let step = 0; step < 300; step++) {
      const next = items.filter(() => rand() > 0.15);              // removals
      while (rand() > 0.5) next.splice(Math.floor(rand() * (next.length + 1)), 0,
        rand() > 0.2 ? { key: nextId++ } : { text: 'u' + step });  // inserts (keyed + unkeyed)
      for (let i = next.length - 1; i > 0; i--) {                  // shuffle some
        if (rand() > 0.7) { const j = Math.floor(rand() * (i + 1)); [next[i], next[j]] = [next[j], next[i]]; }
      }
      items = next;
      render(view(), host);
      const expected = items.map(it => it.key == null ? it.text : it.key + ':' + it.key).join(',');
      const actual = Array.from(host.firstChild.childNodes).map(n => n.textContent).join(',');
      expect(actual, 'step ' + step).to.equal(expected);
      // keyed items keep the same DOM node for their whole life
      for (const it of items) {
        if (it.key == null) continue;
        const node = host.querySelector(`[data-id="${it.key}"]`);
        if (nodes.has(it.key)) expect(node, 'node identity for key ' + it.key).to.equal(nodes.get(it.key));
        else nodes.set(it.key, node);
      }
    }
  });
});

describe('dev-only', () => {
  devOnly('a render-time write in a loop reports the key (sanity that the dev guard is the only thing stripped)', async function () {
    this.timeout(8000);
    const g = store({ k: 0 });
    const C = () => { g.k = g.k + 1; return <p />; };
    const cap = captureErrors();
    mount(<C />);
    for (let i = 0; i < 60 && !cap.errs.length; i++) await frame();
    cap.restore();
    expect(cap.errs[0] && cap.errs[0].message).to.match(/"k"/);
  });
});

describe('objects h() did not build', () => {
  // What a server could send where the app expects a string.
  const forged = () => JSON.parse('{"type":"div","props":{"innerHTML":"<b>forged</b>","children":[]}}');

  it('is not rendered as a child, however deeply it is nested in arrays', () => {
    const host = mount(<p>a{forged()}{[[forged()]]}b</p>);
    expect(host.innerHTML).to.equal('<p>ab</p>');
  });

  it('is not rendered when a component returns it', () => {
    const C = () => forged();
    const host = mount(<p><C /></p>);
    expect(host.innerHTML).to.equal('<p></p>');
  });

  it('does not patch an element of the same type on a later render', () => {
    const host = mount(<p><div>real</div></p>);
    render(<p>{forged()}</p>, host);
    expect(host.innerHTML).to.equal('<p></p>');
    const C = ({ out }) => out;
    render(<p><C out={<div>real</div>} /></p>, host);
    render(<p><C out={forged()} /></p>, host);
    expect(host.innerHTML).to.equal('<p></p>');
  });

  it('leaves 0, empty strings and vnodes passed through as before', () => {
    const Pass = ({ children }) => <i>{children}</i>;
    const Zero = () => 0;
    const host = mount(<p><Pass>{0}{''}<b>x</b>{null}{undefined}{true}</Pass><Zero /></p>);
    expect(host.innerHTML).to.equal('<p><i>0<b>x</b></i>0</p>');
  });
});
