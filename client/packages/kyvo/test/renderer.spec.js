const { expect } = window.chai; // karma-chai global: a mangled bundle must not rewrite chai itself
import { h, render } from '../core.js';
import { mount, frame, devOnly } from './core.spec.js';

// Behaviours adopted from reading Preact 11's renderer (see PREACT11-IDEAS.md): handler table, per-key style diff, moveBefore,
// value/checked after children, list/form as attributes. (Lazy positional child matching was tried and removed: +102 B for a 10-15% gain.)

// Counts the DOM calls a render makes on `el`.
const spy = (el, names) => {
  const n = {}, orig = {};
  for (const k of names) { n[k] = 0; orig[k] = el[k]; if (orig[k]) el[k] = function (...a) { n[k]++; return orig[k].apply(this, a); }; }
  return n;
};

describe('event handlers', () => {
  it('swapping the handler on every render adds and removes no listeners, and the latest one runs', () => {
    const calls = [];
    const host = mount(<button onclick={() => calls.push(0)} />);
    const btn = host.firstChild, n = spy(btn, ['addEventListener', 'removeEventListener']);
    for (let i = 1; i <= 20; i++) render(<button onclick={() => calls.push(i)} />, host);
    btn.click();
    expect(calls).to.deep.equal([20]);
    expect(n.addEventListener + n.removeEventListener).to.equal(0);
  });

  it('a handler set to null stops being called, and a later handler works again', () => {
    const calls = [];
    const host = mount(<button onclick={() => calls.push('a')} />);
    render(<button onclick={null} />, host);
    host.firstChild.click();
    expect(calls).to.deep.equal([]);
    render(<button onclick={() => calls.push('b')} />, host);
    host.firstChild.click();
    expect(calls).to.deep.equal(['b']);
  });

  it('two events on one element keep separate handlers', () => {
    const calls = [];
    const host = mount(<button onclick={() => calls.push('click')} onmouseover={() => calls.push('over')} />);
    render(<button onclick={() => calls.push('click2')} onmouseover={() => calls.push('over2')} />, host);
    host.firstChild.dispatchEvent(new Event('mouseover'));
    host.firstChild.click();
    expect(calls).to.deep.equal(['over2', 'click2']);
  });
});

describe('style objects', () => {
  it('only keys whose value changed are written (a value changed from outside is left alone)', () => {
    const host = mount(<div style={{ color: 'red', width: '1px' }} />);
    const el = host.firstChild;
    el.style.color = 'blue';
    render(<div style={{ color: 'red', width: '2px' }} />, host);
    expect(el.style.color).to.equal('blue');
    expect(el.style.width).to.equal('2px');
  });

  it('removed keys are cleared', () => {
    const host = mount(<div style={{ color: 'red', width: '1px' }} />);
    render(<div style={{ width: '1px' }} />, host);
    expect(host.firstChild.style.color).to.equal('');
    expect(host.firstChild.style.width).to.equal('1px');
  });

  it('CSS custom properties work in a style object and can change and be removed', () => {
    const host = mount(<div style={{ '--x': '3px' }} />);
    expect(host.firstChild.style.getPropertyValue('--x')).to.equal('3px');
    render(<div style={{ '--x': '4px' }} />, host);
    expect(host.firstChild.style.getPropertyValue('--x')).to.equal('4px');
    render(<div style={{}} />, host);
    expect(host.firstChild.style.getPropertyValue('--x')).to.equal('');
  });

  it('moving between string, object and nothing still lands on the right style', () => {
    const host = mount(<div style="color: red" />);
    render(<div style={{ width: '2px' }} />, host);
    expect(host.firstChild.style.color).to.equal('');
    expect(host.firstChild.style.width).to.equal('2px');
    render(<div style="color: green" />, host);
    expect(host.firstChild.style.width).to.equal('');
    expect(host.firstChild.style.color).to.equal('green');
    render(<div />, host);
    expect(host.firstChild.getAttribute('style') || '').to.equal('');
  });
});

describe('matching children by position and key', () => {
  const li = keys => <ul>{keys.map(k => <li key={k}>{k}</li>)}</ul>;
  const nodes = host => [...host.querySelectorAll('li')];
  const text = host => nodes(host).map(n => n.textContent).join(',');

  it('appending keeps every existing node and adds the new ones in order', () => {
    const host = mount(li([1, 2, 3]));
    const [a, b, c] = nodes(host);
    render(li([1, 2, 3, 4, 5]), host);
    expect(text(host)).to.equal('1,2,3,4,5');
    expect(nodes(host).slice(0, 3)).to.deep.equal([a, b, c]);
  });

  it('removing from the end, the middle and the front keeps the survivors', () => {
    const host = mount(li([1, 2, 3, 4, 5]));
    const n = nodes(host);
    render(li([1, 2, 3, 4]), host);
    render(li([1, 2, 4]), host);
    render(li([2, 4]), host);
    expect(text(host)).to.equal('2,4');
    expect(nodes(host)).to.deep.equal([n[1], n[3]]);
  });

  it('inserting at the front and in the middle keeps existing nodes', () => {
    const host = mount(li([2, 3, 4]));
    const [b, c, d] = nodes(host);
    render(li([1, 2, 3, 4]), host);
    render(li([1, 2, 99, 3, 4]), host);
    expect(text(host)).to.equal('1,2,99,3,4');
    const now = nodes(host);
    expect([now[1], now[3], now[4]]).to.deep.equal([b, c, d]);
  });

  it('moving the first child to the end, and the last to the front, keeps every node', () => {
    const host = mount(li([1, 2, 3, 4]));
    const n = nodes(host);
    render(li([2, 3, 4, 1]), host);
    expect(nodes(host)).to.deep.equal([n[1], n[2], n[3], n[0]]);
    render(li([1, 2, 3, 4]), host);
    expect(nodes(host)).to.deep.equal(n);
  });

  it('swapping two children and reversing keep every node', () => {
    const host = mount(li([1, 2, 3, 4, 5]));
    const n = nodes(host);
    render(li([1, 4, 3, 2, 5]), host);
    expect(nodes(host)).to.deep.equal([n[0], n[3], n[2], n[1], n[4]]);
    render(li([5, 2, 3, 4, 1]), host);
    expect(nodes(host)).to.deep.equal([n[4], n[1], n[2], n[3], n[0]]);
  });

  it('a new child is inserted with exactly one DOM insertion', () => {
    const host = mount(<ul><li key={2}>2</li><li key={3}>3</li></ul>);
    const ul = host.firstChild, n = spy(ul, ['insertBefore', 'moveBefore', 'appendChild']);
    render(<ul><li key={1}>1</li><li key={2}>2</li><li key={3}>3</li></ul>, host);
    expect(n.insertBefore + n.moveBefore + n.appendChild).to.equal(1);
  });

  it('a key moving to a different position does not take over another child that already matched by position', () => {
    const host = mount(<ul><li key="a">a</li><li key="b">b</li><li key="c">c</li></ul>);
    const [a, b, c] = nodes(host);
    render(<ul><li key="b">b</li><li key="a">a</li><li key="c">c</li></ul>, host);
    expect(nodes(host)).to.deep.equal([b, a, c]);
  });

  devOnly('dev: duplicate keys throw and name the key, on mount and on update', () => {
    expect(() => mount(li([1, 1, 2]))).to.throw(/duplicate key "1"/);
    const host = mount(li([1, 2]));
    expect(() => render(li([2, 1, 1]), host)).to.throw(/duplicate key "1"/);
  });

  it('keyed and unkeyed children mixed through reorders, inserts and removals', () => {
    const view = parts => <div>{parts.map(p => (typeof p == 'number' ? <i key={p}>{p}</i> : <b>{p}</b>))}</div>;
    const host = mount(view([1, 'x', 2, 'y']));
    render(view(['x', 2, 1, 'y', 3]), host);
    expect(host.firstChild.textContent).to.equal('x21y3');
    render(view([3, 'x']), host);
    expect(host.firstChild.textContent).to.equal('3x');
  });

  it('a child that throws mid-list leaves the next render correct', () => {
    const Bad = () => { throw new Error('boom'); };
    const host = mount(li([1, 2, 3]));
    expect(() => render(<ul><li key={3}>3</li><Bad key={9} /><li key={1}>1</li></ul>, host)).to.throw('boom');
    render(li([1, 2, 3]), host);
    expect(text(host)).to.equal('1,2,3');
    render(li([3, 2, 1]), host);
    expect(text(host)).to.equal('3,2,1');
  });

  it('a long random walk of edits always matches the expected order', () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    let keys = Array.from({ length: 40 }, (_, i) => i), next = 100;
    const host = mount(li(keys));
    for (let step = 0; step < 200; step++) {
      const op = rnd();
      if (op < 0.25) keys = keys.slice().sort(() => rnd() - 0.5);
      else if (op < 0.5 && keys.length > 3) keys = keys.filter(() => rnd() > 0.15);
      else if (op < 0.75) keys = keys.concat([next++, next++]);
      else { const k = keys.slice(); const i = (rnd() * k.length) | 0, j = (rnd() * k.length) | 0; [k[i], k[j]] = [k[j], k[i]]; keys = k; }
      render(li(keys), host);
      expect(text(host)).to.equal(keys.join(','));
    }
  });
});

describe('a conditional child holds its position', () => {
  let mounts;
  const Field = (props, ctx) => { ctx.mount(() => { mounts++; }); return <input />; };
  beforeEach(() => { mounts = 0; });

  for (const off of [false, null, undefined, true]) {
    it(`${off} -> element -> ${off} before a component keeps its node, typed value and focus`, () => {
      const view = on => <form>{on ? <p>Error</p> : off}<Field /></form>;
      const host = mount(view(false));
      const input = host.querySelector('input');
      input.value = 'typed';
      input.focus();
      for (const on of [true, false, true]) {
        render(view(on), host);
        expect(host.querySelector('input')).to.equal(input);
        expect(host.firstChild.textContent).to.equal(on ? 'Error' : '');
        expect(host.firstChild.lastChild).to.equal(input);
      }
      expect([input.value, document.activeElement === input, mounts]).to.deep.equal(['typed', true, 1]);
    });
  }

  it('several conditionals toggle independently without disturbing unkeyed siblings', () => {
    const view = (a, b) => <div>{a && <p>a</p>}<i />{b && <p>b</p>}<i /></div>;
    const host = mount(view(false, false));
    const kept = [...host.querySelectorAll('i')];
    for (const [a, b] of [[true, false], [true, true], [false, true], [false, false]]) {
      render(view(a, b), host);
      expect([...host.querySelectorAll('i')]).to.deep.equal(kept);
      expect(host.textContent).to.equal((a ? 'a' : '') + (b ? 'b' : ''));
      expect(host.firstChild.childNodes.length).to.equal(4);
    }
  });

  it('a placeholder deleted by a contenteditable edit can still be replaced', () => {
    const view = on => <div contenteditable>{on && <b>x</b>}</div>;
    const host = mount(view(false));
    host.firstChild.textContent = 'typed'; // what an edit does: every child node goes, the placeholder included
    expect(() => render(view(true), host)).to.not.throw();
    expect(host.firstChild.textContent).to.equal('xtyped');
  });
});

describe('a changed key replaces what is there, with or without an element around it', () => {
  let log;
  const Item = (props, ctx) => {
    const s = ctx.state({ n: 0 });
    ctx.mount(() => { log.push('+' + props.id); const id = props.id; return () => log.push('-' + id); });
    return <button onclick={() => s.n++}>{props.id}:{s.n}</button>;
  };
  const Direct = ({ id }) => <Item key={id} id={id} />;
  beforeEach(() => { log = []; });

  const click = async host => { host.querySelector('button').click(); await frame(); };
  const check = async view => {
    const host = mount(view(1));
    await click(host);
    const first = host.querySelector('button');
    render(view(1), host);                       // same key: same instance
    expect(host.querySelector('button')).to.equal(first);
    expect(first.textContent).to.equal('1:1');
    render(view(2), host);                       // new key: cleanup, fresh state, new node
    expect(host.querySelector('button')).to.not.equal(first);
    expect(host.textContent).to.equal('2:0');
    expect(log).to.deep.equal(['+1', '-1', '+2']);
  };

  it('a keyed component returned by a component', () => check(id => <Direct id={id} />));
  it('through a chain of components', () => {
    const Outer = ({ id }) => <Direct id={id} />;
    return check(id => <Outer id={id} />);
  });
  it('a keyed component passed straight to render()', () => check(id => <Item key={id} id={id} />));

  it('a keyed element returned by a component, or passed to render()', () => {
    const P = ({ id }) => <p key={id} />;
    for (const view of [id => <P id={id} />, id => <p key={id} />]) {
      const host = mount(view(1));
      const first = host.firstChild;
      render(view(1), host);
      expect(host.firstChild).to.equal(first);
      render(view(2), host);
      expect(host.firstChild).to.not.equal(first);
      expect(host.childNodes.length).to.equal(1);
    }
  });

  it('the replacement goes where the old node was', () => {
    const view = id => <div><i /><Direct id={id} /><b /></div>;
    const host = mount(view(1));
    render(view(2), host);
    expect([...host.firstChild.childNodes].map(n => n.nodeName)).to.deep.equal(['I', 'BUTTON', 'B']);
  });

  it('no key, a missing key and a null key all keep the instance', () => {
    const P = props => <Item {...props.k} id="x" />;
    const host = mount(<P k={{}} />);
    const first = host.firstChild;
    for (const k of [{}, { key: null }, { key: undefined }, {}]) {
      render(<P k={k} />, host);
      expect(host.firstChild).to.equal(first);
    }
    expect(log).to.deep.equal(['+x']);
  });

  it('a NaN key does not replace on every render', () => {
    const host = mount(<Direct id={NaN} />);
    const first = host.firstChild;
    render(<Direct id={NaN} />, host);
    expect(host.firstChild).to.equal(first);
  });
});

describe('moving children', () => {
  it('a focused input in a moved row keeps focus (needs Element.moveBefore)', function () {
    if (!Element.prototype.moveBefore) return this.skip();
    const rows = order => <div>{order.map(k => <p key={k}><input id={'i' + k} /></p>)}</div>;
    const host = mount(rows([1, 2, 3]));
    host.querySelector('#i2').focus();
    render(rows([2, 3, 1]), host);
    expect(document.activeElement).to.equal(host.querySelector('#i2'));
  });
});

describe('value and checked are applied after the children', () => {
  it('a select shows its initial value', () => {
    const host = mount(<select value="b"><option value="a">a</option><option value="b">b</option></select>);
    expect(host.firstChild.value).to.equal('b');
  });

  it('a select follows a changed value, including a value whose option was just added', () => {
    const view = (v, opts) => <select value={v}>{opts.map(o => <option value={o}>{o}</option>)}</select>;
    const host = mount(view('a', ['a', 'b']));
    render(view('c', ['a', 'b', 'c']), host);
    expect(host.firstChild.value).to.equal('c');
  });

  it('a range input keeps a value above the default max when max is listed after value', () => {
    const host = mount(<input type="range" value="150" max="200" />);
    expect(host.firstChild.value).to.equal('150');
  });

  it('a checkbox follows checked, and an unrelated re-render does not undo a user toggle', () => {
    const host = mount(<input type="checkbox" checked={false} />);
    host.firstChild.checked = true;
    render(<input type="checkbox" checked={false} class="x" />, host);
    expect(host.firstChild.checked).to.equal(true);
    render(<input type="checkbox" checked={true} class="x" />, host);
    expect(host.firstChild.checked).to.equal(true);
  });
});

describe('attributes with read-only properties', () => {
  it('list on an input and form on a button are set as attributes and removed again', () => {
    const host = mount(<div><input list="dl" /><button form="f" /></div>);
    expect(host.querySelector('input').getAttribute('list')).to.equal('dl');
    expect(host.querySelector('button').getAttribute('form')).to.equal('f');
    render(<div><input /><button /></div>, host);
    expect(host.querySelector('input').hasAttribute('list')).to.equal(false);
    expect(host.querySelector('button').hasAttribute('form')).to.equal(false);
  });
});
