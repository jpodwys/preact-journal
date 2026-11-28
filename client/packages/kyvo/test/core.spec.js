const { expect } = window.chai; // karma-chai global: a mangled bundle must not rewrite chai itself
import { h, render, store, watch } from '../core.js';

// ---------------------------------------------------------------- harness
// Renders are deferred to requestAnimationFrame, and our rAF callback is
// registered before the test's, so awaiting two frames guarantees the flush ran.
export const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

export const devOnly = (typeof __DEV__ === 'undefined' || __DEV__) ? it : it.skip;

let hosts = [];
export function mount(vnode) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host); // tracked first so a throwing render is still cleaned up
  render(vnode, host);
  return host;
}
afterEach(async () => {
  for (const host of hosts) { try { render(null, host); } catch (e) {} host.remove(); }
  hosts = [];
  await frame(); // let any render scheduled by this test drain before the next one
});

// Errors thrown inside a rAF callback arrive on window.onerror, not at the caller.
export function captureErrors() {
  const errs = [], prev = window.onerror;
  window.onerror = (msg, src, line, col, err) => { errs.push(err || new Error(msg)); return true; };
  return { errs, restore: () => { window.onerror = prev; } };
}

describe('h()', () => {
  it('creates a vnode with type, props and children', () => {
    const v = h('div', { id: 'x' }, 'hello');
    expect(v.type).to.equal('div');
    expect(v.props.id).to.equal('x');
    expect(v.props.children).to.deep.equal(['hello']);
  });
  it('flattens nested arrays', () => {
    expect(h('div', null, [1, [2, 3], 4]).props.children).to.deep.equal([1, 2, 3, 4]);
  });
  it('turns null, undefined, true, false into empty strings that hold their position; keeps 0', () => {
    expect(h('p', null, true, false, null, undefined, 'ok', 0, '').props.children).to.deep.equal(['', '', '', '', 'ok', 0, '']);
  });
  it('exposes key on the vnode', () => {
    expect(h('li', { key: 'a' }).key).to.equal('a');
  });
});

describe('render(): renderer contract', () => {
  it('creates elements, attributes and text', () => {
    const host = mount(<div id="a" title="t">hi <b>there</b></div>);
    const div = host.firstChild;
    expect(div.id).to.equal('a');
    expect(div.getAttribute('title')).to.equal('t');
    expect(div.textContent).to.equal('hi there');
  });

  it('updates text in place without replacing the text node', () => {
    const host = mount(<p>one</p>);
    const text = host.firstChild.firstChild;
    render(<p>two</p>, host);
    expect(host.firstChild.firstChild).to.equal(text);
    expect(text.nodeValue).to.equal('two');
  });

  it('leaves text the user edited alone until the virtual text changes (contenteditable)', () => {
    const host = mount(<p>{'a'}</p>);
    const node = host.firstChild.firstChild;
    node.nodeValue = 'typed';
    render(<p>{'a'}</p>, host);
    expect(node.nodeValue).to.equal('typed');
    render(<p>{'b'}</p>, host);
    expect(node.nodeValue).to.equal('b');
  });

  it('does not resurrect a child node the user replaced (contenteditable)', () => {
    const host = mount(<div>{'a'}</div>);
    host.firstChild.textContent = 'typed'; // the browser swaps in a new text node
    render(<div>{'a'}</div>, host);
    expect(host.firstChild.textContent).to.equal('typed');
    render(<div>{'a'}<b /></div>, host);
    expect(host.firstChild.textContent).to.equal('typed');
  });

  it('leaves attributes the user changed alone until the virtual value changes', () => {
    const host = mount(<input value="a" />);
    const input = host.firstChild;
    input.value = 'typed';
    render(<input value="a" />, host);
    expect(input.value).to.equal('typed');
    render(<input value="b" />, host);
    expect(input.value).to.equal('b');
  });

  it('sets class, string style and object style, and clears removed style keys', () => {
    const host = mount(<div class="a" style="color: red" />);
    expect(host.firstChild.className).to.equal('a');
    expect(host.firstChild.style.color).to.equal('red');
    render(<div class="b" style={{ marginTop: '2px', color: 'blue' }} />, host);
    expect(host.firstChild.className).to.equal('b');
    expect(host.firstChild.style.marginTop).to.equal('2px');
    render(<div style={{ color: 'blue' }} />, host);
    expect(host.firstChild.style.marginTop).to.equal('');
  });

  it('handles boolean attributes and value/checked as properties', () => {
    const host = mount(<div><input disabled value="v" /><input type="checkbox" checked /></div>);
    const [a, b] = host.querySelectorAll('input');
    expect(a.disabled).to.equal(true);
    expect(a.value).to.equal('v');
    expect(b.checked).to.equal(true);
    render(<div><input value="w" /><input type="checkbox" /></div>, host);
    expect(a.disabled).to.equal(false);
    expect(a.hasAttribute('disabled')).to.equal(false);
    expect(a.value).to.equal('w');
    expect(b.checked).to.equal(false);
  });

  it('removes attributes that disappear between renders', () => {
    const host = mount(<div id="a" title="t" />);
    render(<div id="a" />, host);
    expect(host.firstChild.hasAttribute('title')).to.equal(false);
  });

  it('replaces (never duplicates) event listeners across renders', () => {
    const calls = [];
    const host = mount(<button onclick={() => calls.push('a')} />);
    render(<button onclick={() => calls.push('b')} />, host);
    host.firstChild.click();
    expect(calls).to.deep.equal(['b']);
    render(<button />, host);
    host.firstChild.click();
    expect(calls).to.deep.equal(['b']);
  });

  it('creates svg elements in the svg namespace and sets class via attribute', () => {
    const host = mount(<svg class="icon"><path d="M0 0" /></svg>);
    const svg = host.firstChild;
    expect(svg.namespaceURI).to.equal('http://www.w3.org/2000/svg');
    expect(svg.firstChild.namespaceURI).to.equal('http://www.w3.org/2000/svg');
    expect(svg.getAttribute('class')).to.equal('icon');
  });

  it('renders null/false children as nothing and swaps them in and out', () => {
    const host = mount(<div>{false}<i /></div>);
    expect(host.querySelectorAll('i').length).to.equal(1);
    render(<div><b />{null}<i /></div>, host);
    expect(host.querySelectorAll('b').length).to.equal(1);
    render(<div>{false}<i /></div>, host);
    expect(host.querySelectorAll('b').length).to.equal(0);
  });

  it('replaces a node when the type changes', () => {
    const host = mount(<div><p>x</p></div>);
    const old = host.querySelector('p');
    render(<div><span>x</span></div>, host);
    expect(host.querySelector('p')).to.equal(null);
    expect(host.querySelector('span')).to.not.equal(old);
  });

  it('keyed children keep their DOM nodes when reordered, added and removed', () => {
    const list = (keys) => <ul>{keys.map(k => <li key={k}>{k}</li>)}</ul>;
    const host = mount(list(['a', 'b', 'c']));
    const [a, b, c] = host.querySelectorAll('li');
    render(list(['c', 'a', 'd']), host);
    const lis = host.querySelectorAll('li');
    expect(lis.length).to.equal(3);
    expect(lis[0]).to.equal(c);
    expect(lis[1]).to.equal(a);
    expect(lis[2].textContent).to.equal('d');
    expect(b.isConnected).to.equal(false);
  });

  it('handles mixed keyed and unkeyed siblings in one list', () => {
    const host = mount(<div><i key="k">k</i><b>u</b></div>);
    render(<div><b>u2</b><i key="k">k</i></div>, host);
    expect(host.textContent).to.equal('u2k');
  });

  it('calls function components with (props, ctx)', () => {
    let args;
    const C = (...a) => { args = a; return <p />; };
    mount(<C n={1} />);
    expect(args[0].n).to.equal(1);
    expect(args[1]).to.be.an('object');
  });

  it('calls refs after commit, so the element is attached (focus works)', () => {
    let attached, focused;
    const host = mount(<input ref={el => { attached = document.body.contains(el); el.focus(); focused = document.activeElement === el; }} />);
    expect(attached).to.equal(true);
    expect(focused).to.equal(true);
  });

  it('runs callback refs: element on create, null on removal, swap on identity change', () => {
    const log = [];
    const r1 = el => log.push(['r1', el && el.tagName]);
    const r2 = el => log.push(['r2', el && el.tagName]);
    const host = mount(<div ref={r1} />);
    expect(log).to.deep.equal([['r1', 'DIV']]);
    render(<div ref={r2} />, host);
    expect(log.slice(1)).to.deep.equal([['r1', null], ['r2', 'DIV']]);
    render(null, host);
    expect(log[log.length - 1]).to.deep.equal(['r2', null]);
  });
});

describe('store()', () => {
  it('reads and writes like a plain object', () => {
    const s = store({ a: 1 });
    s.a = 2;
    expect(s.a).to.equal(2);
    expect(Object.keys(s)).to.deep.equal(['a']);
  });

  it('returns assigned values by identity (shallow, nothing wrapped)', () => {
    const s = store({});
    const arr = [{ id: 1 }];
    s.arr = arr;
    expect(s.arr).to.equal(arr);
    expect(structuredClone(s.arr)).to.deep.equal([{ id: 1 }]); // safe to hand to IndexedDB
  });

  it('a write renders on the next frame, never synchronously', async () => {
    const s = store({ n: 0 });
    let calls = 0;
    const App = () => { calls++; return <p>{s.n}</p>; };
    const host = mount(<App />);
    expect(calls).to.equal(1);
    s.n = 1;
    expect(calls).to.equal(1);
    expect(host.textContent).to.equal('0');
    await frame();
    expect(calls).to.equal(2);
    expect(host.textContent).to.equal('1');
  });

  it('coalesces many writes in one tick into one render', async () => {
    const s = store({ a: 0, b: 0 });
    let calls = 0;
    const App = () => { calls++; return <p>{s.a},{s.b}</p>; };
    const host = mount(<App />);
    s.a = 1; s.b = 1; s.a = 2; s.b = 2;
    await frame();
    expect(calls).to.equal(2);
    expect(host.textContent).to.equal('2,2');
  });

  it('writes to different stores and ctx.state in one tick share one render', async () => {
    const s1 = store({ n: 0 }), s2 = store({ n: 0 });
    let calls = 0, local;
    const App = (p, ctx) => { calls++; local = ctx.state({ n: 0 }); return <p>{s1.n}{s2.n}{local.n}</p>; };
    const host = mount(<App />);
    s1.n = 1; s2.n = 1; local.n = 1;
    await frame();
    expect(calls).to.equal(2);
    expect(host.textContent).to.equal('111');
  });

  it('an unchanged write (Object.is) schedules nothing, including NaN', async () => {
    const s = store({ n: 1, x: NaN });
    let calls = 0;
    mount(<p>{(calls++, s.n)}</p>);
    s.n = 1; s.x = NaN;
    await frame();
    expect(calls).to.equal(1);
  });

  it('any component in the tree reads a store with no wiring', async () => {
    const app = store({ name: 'a' });
    const Leaf = () => <i>{app.name}</i>;
    const Mid = () => <div><Leaf /></div>;
    const Top = () => <section><Mid /></section>;
    const host = mount(<Top />);
    expect(host.textContent).to.equal('a');
    app.name = 'b';
    await frame();
    expect(host.textContent).to.equal('b');
  });

  it('re-runs every component on a render, even with identical props (brute force)', async () => {
    const s = store({ n: 0 });
    let childCalls = 0;
    const Child = () => { childCalls++; return <i />; };
    const Top = () => <div>{s.n}<Child same="x" /></div>;
    mount(<Top />);
    s.n = 1;
    await frame();
    expect(childCalls).to.equal(2);
  });

  it('a write with nothing rendered is a harmless no-op', async () => {
    const s = store({ a: 1 });
    s.a = 2;
    await frame();
    expect(s.a).to.equal(2);
  });

  it('a write after render(null, host) does not resurrect the tree', async () => {
    const s = store({ n: 0 });
    let calls = 0;
    const host = mount(<p>{(calls++, s.n)}</p>);
    render(null, host);
    s.n = 1;
    await frame();
    expect(calls).to.equal(1);
    expect(host.textContent).to.equal('');
  });
});

describe('watch()', () => {
  it('fires (key, next, prev) once per changed write, in registration order', () => {
    const s = store({ a: 1 });
    const log = [];
    watch(s, (k, n, p) => log.push(['first', k, n, p]));
    watch(s, (k, n, p) => log.push(['second', k, n, p]));
    s.a = 2;
    s.a = 2; // unchanged: ignored
    s.b = 'x';
    expect(log).to.deep.equal([
      ['first', 'a', 2, 1], ['second', 'a', 2, 1],
      ['first', 'b', 'x', undefined], ['second', 'b', 'x', undefined],
    ]);
  });

  it('runs synchronously, after the store already holds the new value', () => {
    const s = store({ a: 1 });
    let seen;
    watch(s, () => { seen = s.a; });
    s.a = 5;
    expect(seen).to.equal(5);
  });

  it('may write back to the store, and re-entrancy ends when a write is unchanged', () => {
    const s = store({ n: 0 });
    const log = [];
    watch(s, (k, next) => { log.push(next); if (next > 10) s.n = 10; });
    s.n = 50;
    expect(s.n).to.equal(10);
    expect(log).to.deep.equal([50, 10]);
  });

  it('is per store', () => {
    const a = store({ x: 0 }), b = store({ x: 0 });
    let hits = 0;
    watch(a, () => hits++);
    b.x = 1;
    expect(hits).to.equal(0);
  });
});

describe('dev: deep freeze on assignment', () => {

  devOnly('freezes assigned arrays so in-place mutation throws a TypeError', () => {
    const s = store({});
    s.items = [1];
    expect(() => s.items.push(2)).to.throw(TypeError);
  });

  devOnly('freezes nested plain objects and arrays', () => {
    const s = store({});
    s.user = { name: 'a', tags: ['x'] };
    expect(() => { 'use strict'; s.user.name = 'b'; }).to.throw(TypeError);
    expect(() => s.user.tags.push('y')).to.throw(TypeError);
  });

  it('allows replacing values', () => {
    const s = store({ items: [1] });
    s.items = [...s.items, 2];
    expect(s.items).to.deep.equal([1, 2]);
  });

  it('never freezes non-plain objects (DOM nodes, Date, Map, class instances)', () => {
    class Thing { constructor() { this.v = 1; } }
    const s = store({});
    const el = document.createElement('i');
    s.el = el; s.when = new Date(0); s.map = new Map(); s.thing = new Thing();
    el.id = 'ok'; s.when.setFullYear(2000); s.map.set('k', 1); s.thing.v = 2;
    expect(el.id).to.equal('ok');
    expect(s.thing.v).to.equal(2);
  });

  it('copes with cycles, primitives and already-frozen values', () => {
    const s = store({});
    const a = {}; a.self = a;
    s.a = a; s.n = 1; s.str = 'x'; s.nil = null; s.f = Object.freeze({ k: 1 });
    expect(s.a.self).to.equal(a);
  });

  devOnly('also applies to ctx.state', () => {
    let local;
    const C = (p, ctx) => { local = ctx.state({}); return <p />; };
    mount(<C />);
    local.list = [1];
    expect(() => local.list.push(2)).to.throw(TypeError);
  });
});

describe('ctx', () => {
  it('is one persistent object across renders and accepts non-reactive fields', async () => {
    const seen = [];
    let calls = 0;
    const C = (p, ctx) => { calls++; seen.push(ctx); ctx.counter = (ctx.counter || 0) + 1; return <p>{ctx.counter}</p>; };
    const host = mount(<C />);
    render(<C />, host);
    expect(seen[0]).to.equal(seen[1]);
    expect(host.textContent).to.equal('2');
    seen[0].anything = 'x';
    await frame();
    expect(calls).to.equal(2); // writing ctx fields never renders
  });

  it('is separate for separate instances', () => {
    const seen = [];
    const C = (p, ctx) => { seen.push(ctx); return <p />; };
    mount(<div><C /><C /></div>);
    expect(seen[0]).to.not.equal(seen[1]);
  });
});

describe('ctx.state()', () => {
  it('persists across renders and ignores later init values', async () => {
    const C = (props, ctx) => {
      const s = ctx.state({ n: props.start });
      return <button onclick={() => s.n++}>{s.n}</button>;
    };
    const host = mount(<C start={5} />);
    expect(host.textContent).to.equal('5');
    host.querySelector('button').click();
    await frame();
    expect(host.textContent).to.equal('6');
    render(<C start={99} />, host);
    expect(host.textContent).to.equal('6');
  });

  it('accepts a lazy initializer that runs once', () => {
    let inits = 0;
    const C = (p, ctx) => { const s = ctx.state(() => (inits++, { n: 1 })); return <p>{s.n}</p>; };
    const host = mount(<C />);
    render(<C />, host);
    render(<C />, host);
    expect(inits).to.equal(1);
  });

  it('a write from an event handler renders once', async () => {
    let calls = 0;
    const C = (p, ctx) => { calls++; const s = ctx.state({ a: 0, b: 0 }); return <button onclick={() => { s.a++; s.b++; }}>{s.a + s.b}</button>; };
    const host = mount(<C />);
    host.querySelector('button').click();
    await frame();
    expect(calls).to.equal(2);
    expect(host.textContent).to.equal('2');
  });

  it('a write during the owner\'s own render does not schedule another render', async () => {
    let calls = 0;
    const C = ({ id }, ctx) => {
      calls++;
      const s = ctx.state({ id: null, text: '' });
      if (s.id !== id) { s.id = id; s.text = 't' + id; }
      return <p>{s.text}</p>;
    };
    const host = mount(<C id={1} />);
    await frame();
    expect(calls).to.equal(1);
    expect(host.textContent).to.equal('t1');
    render(<C id={2} />, host);
    await frame();
    expect(calls).to.equal(2);
    expect(host.textContent).to.equal('t2');
  });

  it('keeps separate state per instance', async () => {
    const C = ({ label }, ctx) => {
      const s = ctx.state({ n: 0 });
      return <button class={label} onclick={() => s.n++}>{s.n}</button>;
    };
    const host = mount(<div><C label="a" /><C label="b" /></div>);
    host.querySelector('.a').click();
    await frame();
    expect(host.querySelector('.a').textContent).to.equal('1');
    expect(host.querySelector('.b').textContent).to.equal('0');
  });

  it('state follows keys when a keyed list is reordered', async () => {
    const Item = ({ id }, ctx) => {
      const s = ctx.state({ n: 0 });
      return <button class={id} onclick={() => s.n++}>{id}{s.n}</button>;
    };
    const list = ids => <div>{ids.map(id => <Item key={id} id={id} />)}</div>;
    const host = mount(list(['a', 'b']));
    host.querySelector('.a').click();
    await frame();
    render(list(['b', 'a']), host);
    expect(host.firstChild.firstChild.className).to.equal('b');
    expect(host.querySelector('.a').textContent).to.equal('a1');
    expect(host.querySelector('.b').textContent).to.equal('b0');
  });

  it('keyed slots are independent of each other and of the default slot', async () => {
    const K1 = Symbol('k1');
    let main, one, two;
    const C = (p, ctx) => {
      main = ctx.state({ v: 'm' });
      one = ctx.state({ v: 'one' }, K1);
      two = ctx.state({ v: 'two' }, 'k2');
      return <p>{main.v}{one.v}{two.v}</p>;
    };
    const host = mount(<C />);
    one.v = 'ONE';
    await frame();
    expect(host.textContent).to.equal('mONEtwo');
    render(<C />, host); // slots persist across renders
    expect(host.textContent).to.equal('mONEtwo');
  });

  it('a conditional call is fine: slots are found by key, not by order', () => {
    let s;
    const C = ({ on }, ctx) => { if (on) { s = ctx.state({ n: 1 }); s.n++; } return <p>{on ? s.n : '-'}</p>; };
    const host = mount(<C on={true} />);
    expect(host.textContent).to.equal('2');
    render(<C on={false} />, host);
    expect(host.textContent).to.equal('-');
    render(<C on={true} />, host);
    expect(host.textContent).to.equal('3'); // state survived, incremented again
  });

  devOnly('dev: claiming the default slot twice in one render throws', () => {
    const C = (p, ctx) => { ctx.state({}); ctx.state({}); return <p />; };
    expect(() => mount(<C />)).to.throw(/ctx\.state/);
  });

  devOnly('dev: claiming the same key twice in one render throws; different keys are fine', () => {
    const Bad = (p, ctx) => { ctx.state({}, 'k'); ctx.state({}, 'k'); return <p />; };
    const Good = (p, ctx) => { ctx.state({}, 'a'); ctx.state({}, 'b'); return <p />; };
    expect(() => mount(<Bad />)).to.throw(/ctx\.state/);
    expect(() => mount(<Good />)).to.not.throw();
  });

  it('writes to the state of an unmounted instance are silent no-ops', async () => {
    let calls = 0, s;
    const C = (p, ctx) => { calls++; s = ctx.state({ n: 0 }); return <p>{s.n}</p>; };
    const host = mount(<C />);
    render(null, host);
    expect(() => { s.n = 5; }).to.not.throw();
    await frame();
    expect(calls).to.equal(1);
  });
});

describe('props (live object)', () => {
  it('is one object per instance, updated in place', () => {
    const seen = [];
    const C = (props) => { seen.push(props); return <p>{props.label}</p>; };
    const host = mount(<C label="a" />);
    render(<C label="b" />, host);
    expect(seen[0]).to.equal(seen[1]);
    expect(seen[1].label).to.equal('b');
    expect(host.textContent).to.equal('b');
  });

  it('deletes props that disappeared', () => {
    let props;
    const C = (p) => { props = p; return <p />; };
    const host = mount(<C label="a" extra="x" />);
    render(<C label="b" />, host);
    expect('extra' in props).to.equal(false);
  });

  it('includes children and updates them', () => {
    const C = ({ children }) => <div>{children}</div>;
    const host = mount(<C><i>1</i></C>);
    render(<C><i>2</i><b>3</b></C>, host);
    expect(host.textContent).to.equal('23');
  });

  it('a long-lived callback reading props.x sees the latest value', () => {
    const got = [];
    const C = (props, ctx) => {
      ctx.mount(() => {
        const fn = () => got.push(props.label);
        window.addEventListener('ping', fn);
        return () => window.removeEventListener('ping', fn);
      });
      return <p />;
    };
    const host = mount(<C label="a" />);
    render(<C label="b" />, host);
    window.dispatchEvent(new Event('ping'));
    expect(got).to.deep.equal(['b']);
  });

  it('documented rule: a destructured name in a long-lived callback is a stale snapshot', () => {
    const got = [];
    const C = ({ label }, ctx) => {
      ctx.mount(() => {
        const fn = () => got.push(label);
        window.addEventListener('ping', fn);
        return () => window.removeEventListener('ping', fn);
      });
      return <p />;
    };
    const host = mount(<C label="a" />);
    render(<C label="b" />, host);
    window.dispatchEvent(new Event('ping'));
    expect(got).to.deep.equal(['a']);
  });
});

describe('ctx.mount()', () => {
  it('runs once, after the first commit, with the DOM attached', () => {
    const log = [];
    const C = (p, ctx) => {
      ctx.mount(() => { log.push(!!document.getElementById('m1')); });
      return <p id="m1" />;
    };
    const host = mount(<C />);
    render(<C />, host);
    render(<C />, host);
    expect(log).to.deep.equal([true]);
  });

  it('runs cleanups on unmount, in registration order', () => {
    const log = [];
    const C = (p, ctx) => {
      ctx.mount(() => () => log.push(1));
      ctx.mount(() => () => log.push(2));
      return <p />;
    };
    const host = mount(<C />);
    expect(log).to.deep.equal([]);
    render(null, host);
    expect(log).to.deep.equal([1, 2]);
  });

  it('ignores a non-function return value', () => {
    const C = (p, ctx) => { ctx.mount(() => 42); return <p />; };
    const host = mount(<C />);
    expect(() => render(null, host)).to.not.throw();
  });

  it('unmounting an ancestor runs descendant cleanups, including when the type changes', () => {
    const log = [];
    const Child = (p, ctx) => { ctx.mount(() => () => log.push('child')); return <i />; };
    const Parent = () => <div><Child /></div>;
    const host = mount(<Parent />);
    render(<section />, host);
    expect(log).to.deep.equal(['child']);
  });

  it('removing a keyed item runs its cleanup', () => {
    const log = [];
    const Item = ({ id }, ctx) => { ctx.mount(() => () => log.push(id)); return <i />; };
    const list = ids => <div>{ids.map(id => <Item key={id} id={id} />)}</div>;
    const host = mount(list(['a', 'b']));
    render(list(['a']), host);
    expect(log).to.deep.equal(['b']);
  });

  it('repeated unconditional calls on later renders are ignored, not an error', () => {
    let runs = 0;
    const C = (p, ctx) => { ctx.mount(() => { runs++; }); return <p />; };
    const host = mount(<C />);
    expect(() => { render(<C />, host); render(<C />, host); }).to.not.throw();
    expect(runs).to.equal(1);
  });

  devOnly('dev: registering more mounts than the first render did throws', () => {
    const C = ({ late }, ctx) => { ctx.mount(() => {}); if (late) ctx.mount(() => {}); return <p />; };
    const host = mount(<C late={false} />);
    expect(() => render(<C late={true} />, host)).to.throw(/ctx\.mount/);
  });

  it('components first mounted by a state-triggered render still run their mounts', async () => {
    const s = store({ show: false });
    let ran = 0;
    const Child = (p, ctx) => { ctx.mount(() => { ran++; }); return <i />; };
    const App = () => <div>{s.show && <Child />}</div>;
    mount(<App />);
    expect(ran).to.equal(0);
    s.show = true;
    await frame();
    expect(ran).to.equal(1);
  });

  it('a throwing mount does not stop the others; the first error is rethrown', () => {
    const ran = [];
    const C = (p, ctx) => {
      ctx.mount(() => { ran.push(1); throw new Error('boom'); });
      ctx.mount(() => { ran.push(2); });
      return <p />;
    };
    expect(() => mount(<C />)).to.throw('boom');
    expect(ran).to.deep.equal([1, 2]);
  });

  it('a throwing mount in a state-triggered render does not drop the rest either', async () => {
    const s = store({ show: false });
    const ran = [];
    const Child = (p, ctx) => {
      ctx.mount(() => { ran.push(1); throw new Error('boom'); });
      ctx.mount(() => { ran.push(2); });
      return <i />;
    };
    const App = () => <div>{s.show && <Child />}</div>;
    mount(<App />);
    const cap = captureErrors();
    s.show = true;
    await frame();
    cap.restore();
    expect(ran).to.deep.equal([1, 2]);
    expect(cap.errs.length).to.equal(1);
  });

  it('a throwing render does not wedge later mounts, and drops its half-queued ones', () => {
    const ran = [];
    const Ok = (p, ctx) => { ctx.mount(() => { ran.push('from-failed-render'); }); return <i />; };
    const Bad = () => { throw new Error('render failed'); };
    expect(() => mount(<div><Ok /><Bad /></div>)).to.throw('render failed');
    const Good = (p, ctx) => { ctx.mount(() => { ran.push('good'); }); return <p />; };
    mount(<Good />);
    expect(ran).to.deep.equal(['good']);
  });
});

describe('dev: render-loop check', () => {
  devOnly('throws after 25 consecutive render-triggered re-renders, naming the key', async function () {
    this.timeout(8000);
    const g = store({ n: 0 });
    const C = () => { g.n = g.n + 1; return <p>{g.n}</p>; };
    const cap = captureErrors();
    mount(<C />);
    for (let i = 0; i < 60 && !cap.errs.length; i++) await frame();
    cap.restore();
    expect(cap.errs.length).to.be.greaterThan(0);
    expect(cap.errs[0].message).to.match(/render loop/);
    expect(cap.errs[0].message).to.match(/"n"/);
  });

  devOnly('recovers: later writes still render after a loop error', async function () {
    this.timeout(8000);
    const g = store({ n: 0 });
    const C = () => { g.n = g.n + 1; return <p>{g.n}</p>; };
    const cap = captureErrors();
    const host = mount(<C />);
    for (let i = 0; i < 60 && !cap.errs.length; i++) await frame();
    cap.restore();
    render(null, host);
    const s = store({ v: 'a' });
    let calls = 0;
    const D = () => { calls++; return <p>{s.v}</p>; };
    const host3 = mount(<D />);
    s.v = 'b';
    await frame();
    expect(host3.textContent).to.equal('b');
    expect(calls).to.equal(2);
  });

  it('a render-time write that converges is not an error', async () => {
    const g = store({ n: 0 });
    const C = () => { if (g.n < 3) g.n = g.n + 1; return <p>{g.n}</p>; };
    const cap = captureErrors();
    const host = mount(<C />);
    for (let i = 0; i < 6; i++) await frame();
    cap.restore();
    expect(cap.errs.length).to.equal(0);
    expect(host.textContent).to.equal('3');
  });

  devOnly('a component writing its own ctx.state during render never counts as a loop', async () => {
    const C = (p, ctx) => { const s = ctx.state({ n: 0 }); s.n = s.n + 1; return <p>{s.n}</p>; };
    const cap = captureErrors();
    mount(<C />);
    for (let i = 0; i < 4; i++) await frame();
    cap.restore();
    expect(cap.errs.length).to.equal(0);
  });
});
