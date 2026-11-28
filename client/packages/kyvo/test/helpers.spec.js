const { expect } = window.chai; // karma-chai global: a mangled bundle must not rewrite chai itself
import { h, render } from '../core.js';
import { listen, debounced, lazy, effect } from '../helpers.js';
import { mount, frame } from './core.spec.js';
import { store } from '../core.js';

const wait = ms => new Promise(r => setTimeout(r, ms));

describe('listen()', () => {
  it('adds the listener on mount and removes it on unmount', () => {
    const got = [];
    const C = (p, ctx) => { listen(ctx, window, 'ping', () => got.push(1)); return <p />; };
    const host = mount(<C />);
    window.dispatchEvent(new Event('ping'));
    expect(got).to.deep.equal([1]);
    render(null, host);
    window.dispatchEvent(new Event('ping'));
    expect(got).to.deep.equal([1]);
  });

  it('registers once even though the body calls it every render', () => {
    const got = [];
    const C = (p, ctx) => { listen(ctx, window, 'ping', () => got.push(1)); return <p />; };
    const host = mount(<C />);
    render(<C />, host);
    render(<C />, host);
    window.dispatchEvent(new Event('ping'));
    expect(got.length).to.equal(1);
  });

  it('passes the event and sees current props via props.x', () => {
    const got = [];
    const C = (props, ctx) => {
      listen(ctx, window, 'ping', e => got.push([e.type, props.label]));
      return <p />;
    };
    const host = mount(<C label="a" />);
    render(<C label="b" />, host);
    window.dispatchEvent(new Event('ping'));
    expect(got).to.deep.equal([['ping', 'b']]);
  });

  it('passes options to add and remove (capture)', () => {
    const got = [];
    const C = (p, ctx) => { listen(ctx, window, 'ping', () => got.push(1), { capture: true }); return <p />; };
    const host = mount(<C />);
    window.dispatchEvent(new Event('ping'));
    render(null, host);
    window.dispatchEvent(new Event('ping'));
    expect(got).to.deep.equal([1]);
  });

  it('several listens in one component all register and all clean up', () => {
    const got = [];
    const C = (p, ctx) => {
      listen(ctx, window, 'a-evt', () => got.push('a'));
      listen(ctx, window, 'b-evt', () => got.push('b'));
      return <p />;
    };
    const host = mount(<C />);
    window.dispatchEvent(new Event('a-evt'));
    window.dispatchEvent(new Event('b-evt'));
    render(null, host);
    window.dispatchEvent(new Event('a-evt'));
    window.dispatchEvent(new Event('b-evt'));
    expect(got).to.deep.equal(['a', 'b']);
  });
});

describe('debounced()', () => {
  it('collapses rapid calls into one call after the delay', async () => {
    const calls = [];
    let trigger;
    const C = (p, ctx) => { trigger = debounced(ctx, () => calls.push(1), 20); return <p />; };
    mount(<C />);
    trigger(); trigger(); trigger();
    expect(calls.length).to.equal(0);
    await wait(60);
    expect(calls.length).to.equal(1);
  });

  it('calls the latest fn passed on the most recent render', async () => {
    const calls = [];
    let trigger;
    const C = ({ tag }, ctx) => { trigger = debounced(ctx, () => calls.push(tag), 20); return <p />; };
    const host = mount(<C tag="a" />);
    trigger();
    render(<C tag="b" />, host);
    await wait(60);
    expect(calls).to.deep.equal(['b']);
  });

  it('passes the most recent call\'s arguments to fn', async () => {
    const got = [];
    let trigger;
    const C = (p, ctx) => { trigger = debounced(ctx, (...a) => got.push(a), 20); return <p />; };
    mount(<C />);
    trigger(1); trigger(2, 'x');
    await wait(60);
    expect(got).to.deep.equal([[2, 'x']]);
  });

  it('never causes a render by itself', async () => {
    let renders = 0, trigger;
    const C = (p, ctx) => { renders++; trigger = debounced(ctx, () => {}, 10); return <p />; };
    mount(<C />);
    trigger();
    await wait(40);
    await frame();
    expect(renders).to.equal(1);
  });

  it('runs a pending call on unmount, once, so it is never lost', async () => {
    const calls = [];
    let trigger;
    const C = (p, ctx) => { trigger = debounced(ctx, (...a) => calls.push(a), 20); return <p />; };
    const host = mount(<C />);
    trigger(1); trigger(2);
    render(null, host);
    expect(calls).to.deep.equal([[2]]);
    await wait(60);
    expect(calls).to.deep.equal([[2]]);   // and the timer does not run it a second time
  });

  it('two uses in one component are independent when given keys', async () => {
    const calls = [];
    let t1, t2;
    const C = (p, ctx) => {
      t1 = debounced(ctx, () => calls.push('one'), 20, 'one');
      t2 = debounced(ctx, () => calls.push('two'), 20, 'two');
      return <p />;
    };
    mount(<C />);
    t1(); t2();
    await wait(60);
    expect(calls.sort()).to.deep.equal(['one', 'two']);
  });

  it('a trigger keeps the same identity across renders', () => {
    const seen = [];
    const C = (p, ctx) => { seen.push(debounced(ctx, () => {}, 10)); return <p />; };
    const host = mount(<C />);
    render(<C />, host);
    expect(seen[0]).to.equal(seen[1]);
  });
});

describe('debounced(): unmounting', () => {
  it('does nothing on unmount when nothing is pending', () => {
    const calls = [];
    const C = (p, ctx) => { debounced(ctx, () => calls.push(1), 20); return <p />; };
    const host = mount(<C />);
    render(null, host);
    expect(calls.length).to.equal(0);
  });

  it('uses the latest fn when it runs the pending call on unmount', () => {
    const calls = [];
    let trigger;
    const C = ({ tag }, ctx) => { trigger = debounced(ctx, () => calls.push(tag), 20); return <p />; };
    const host = mount(<C tag="a" />);
    trigger();
    render(<C tag="b" />, host);
    render(null, host);
    expect(calls).to.deep.equal(['b']);
  });

  it('runs every key\'s pending call on unmount, including a key first used on a later render', async () => {
    const calls = [];
    let one, two, dynamic;
    const C = ({ id }, ctx) => {
      one = debounced(ctx, () => calls.push('one'), 20, 'one');
      two = debounced(ctx, () => calls.push('two'), 20, 'two');
      dynamic = debounced(ctx, () => calls.push('id' + id), 20, String(id));   // same call count; the key changes
      return <p />;
    };
    const host = mount(<C id={1} />);
    render(<C id={2} />, host);          // key '2' did not exist when the component mounted
    one(); two(); dynamic();
    render(null, host);
    expect(calls.sort()).to.deep.equal(['id2', 'one', 'two']);
    await wait(60);
    expect(calls.length).to.equal(3);
  });

  it('keys keep separate pending calls, so a second key never replaces the first', async () => {
    const calls = [];
    let a, b;
    const C = (p, ctx) => {
      a = debounced(ctx, v => calls.push('a' + v), 20, 'a');
      b = debounced(ctx, v => calls.push('b' + v), 20, 'b');
      return <p />;
    };
    mount(<C />);
    a(1); b(2);
    await wait(60);
    expect(calls.sort()).to.deep.equal(['a1', 'b2']);
  });

  it('exposes no flush or cancel: the trigger is just a function', () => {
    let trigger;
    const C = (p, ctx) => { trigger = debounced(ctx, () => {}, 20); return <p />; };
    mount(<C />);
    expect(Object.keys(trigger)).to.deep.equal([]);
  });
});

describe('lazy()', () => {
  // A load that a spec settles by hand, and counts.
  const deferred = () => { const d = { calls: 0 }; d.load = () => { d.calls++; return new Promise((res, rej) => { d.res = res; d.rej = rej; }); }; return d; };
  const Page = ({ id, children }) => <section data-id={id}>{children}</section>;

  it('renders Loading, then the loaded component with the same props and children', async () => {
    const d = deferred();
    const L = lazy(d.load, () => <p>loading</p>);
    const host = mount(<L id="7"><b>kid</b></L>);
    expect(host.textContent).to.equal('loading');
    d.res({ default: Page });
    await frame();
    expect(host.querySelector('section').dataset.id).to.equal('7');
    expect(host.querySelector('section b').textContent).to.equal('kid');
  });

  it('takes the component itself as well as a module with a default export', async () => {
    const host = mount(<div />);
    const L = lazy(() => Promise.resolve(Page));
    render(<L id="1" />, host);
    await frame();
    expect(host.querySelector('section')).to.exist;
  });

  it('renders nothing while loading when there is no Loading component', () => {
    const d = deferred();
    const L = lazy(d.load);
    const host = mount(<L />);
    expect(host.textContent).to.equal('');
  });

  it('loads once however many instances there are, and wakes every one of them', async () => {
    const d = deferred();
    const L = lazy(d.load, () => <p>loading</p>);
    const host = mount(<div><L id="a" /><L id="b" /></div>);
    d.res({ default: Page });
    await frame();
    expect(d.calls).to.equal(1);
    expect(host.querySelectorAll('section').length).to.equal(2);
  });

  it('renders a later instance straight away, with no Loading frame', async () => {
    const L = lazy(() => Promise.resolve({ default: Page }), () => <p>loading</p>);
    mount(<L id="1" />);
    await frame();
    const host = mount(<L id="2" />);
    expect(host.querySelector('section').dataset.id).to.equal('2');
    expect(host.textContent).to.not.include('loading');
  });

  it('passes updated props through on a re-render', async () => {
    const L = lazy(() => Promise.resolve({ default: Page }));
    const host = mount(<L id="1" />);
    await frame();
    render(<L id="2" />, host);
    expect(host.querySelector('section').dataset.id).to.equal('2');
  });

  it('a keyed instance remounts the loaded component without loading again', async () => {
    let n = 0;
    const L = lazy(() => { n++; return Promise.resolve({ default: Page }); });
    const host = mount(<L key="a" id="1" />);
    await frame();
    render(<L key="b" id="2" />, host);
    expect(host.querySelector('section').dataset.id).to.equal('2');
    expect(n).to.equal(1);
  });

  it('shows Failed with the error, and does not try again by itself', async () => {
    const d = deferred();
    const boom = new Error('offline');
    let seen;
    const L = lazy(d.load, null, p => { seen = p; return <p role="alert">failed</p>; });
    const host = mount(<L />);
    d.rej(boom);
    await frame();
    expect(host.querySelector('[role=alert]')).to.exist;
    expect(seen.error).to.equal(boom);
    render(<L />, host);                 // more renders, still one attempt
    await frame();
    expect(d.calls).to.equal(1);
  });

  it('retry() loads again and then renders the component', async () => {
    let fail = true, calls = 0, retry;
    const L = lazy(() => { calls++; return fail ? Promise.reject(new Error('x')) : Promise.resolve({ default: Page }); },
      () => <p>loading</p>, p => { retry = p.retry; return <p role="alert">failed</p>; });
    const host = mount(<L id="9" />);
    await frame();
    expect(host.querySelector('[role=alert]')).to.exist;
    fail = false;
    retry();
    await frame();
    expect(calls).to.equal(2);
    expect(host.querySelector('section').dataset.id).to.equal('9');
  });

  it('treats a load that throws synchronously as a failure', async () => {
    const L = lazy(() => { throw new Error('sync'); }, null, () => <p role="alert">failed</p>);
    const host = mount(<L />);
    await frame();
    expect(host.querySelector('[role=alert]')).to.exist;
  });

  it('preload() starts the load before any render and returns the promise', async () => {
    const d = deferred();
    const L = lazy(d.load, () => <p>loading</p>);
    const p = L.preload();
    expect(d.calls).to.equal(1);
    d.res({ default: Page });
    await p;
    const host = mount(<L id="3" />);
    expect(host.querySelector('section').dataset.id).to.equal('3');
    expect(d.calls).to.equal(1);
  });

  it('an instance unmounted before the load settles does not break the others', async () => {
    const d = deferred();
    const L = lazy(d.load, () => <p>loading</p>);
    const gone = mount(<L id="gone" />);
    const kept = mount(<L id="kept" />);
    render(null, gone);
    d.res({ default: Page });
    await frame();
    expect(kept.querySelector('section').dataset.id).to.equal('kept');
  });
});

const devOnly = (typeof __DEV__ === 'undefined' || __DEV__) ? it : it.skip;
const tick = () => new Promise(r => queueMicrotask(r));

describe('effect()', () => {
  let log;
  beforeEach(() => { log = []; });
  const C = (props, ctx) => {
    effect(ctx, () => {
      const id = props.id;
      log.push('run ' + id);
      return () => log.push('undo ' + id);
    }, [props.id]);
    return <p>{props.id}</p>;
  };

  it('runs after commit, with the element attached', () => {
    let seen;
    const E = (props, ctx) => {
      effect(ctx, () => { seen = ctx.el && ctx.el.isConnected; }, []);
      return <p ref={el => { ctx.el = el; }} />;
    };
    mount(<E />);
    expect(seen).to.equal(true);
  });

  it('does not rerun while the deps are the same', async () => {
    const host = mount(<C id={1} />);
    render(<C id={1} />, host);
    await tick();
    expect(log).to.deep.equal(['run 1']);
  });

  it('cleans up, then reruns, after the DOM shows the new value', async () => {
    const E = (props, ctx) => {
      effect(ctx, () => { log.push('dom ' + document.querySelector('#e').textContent); return () => log.push('undo'); }, [props.id]);
      return <p id="e">{props.id}</p>;
    };
    const host = mount(<E id={1} />);
    render(<E id={2} />, host);
    expect(log).to.deep.equal(['dom 1']);
    await tick();
    expect(log).to.deep.equal(['dom 1', 'undo', 'dom 2']);
  });

  it('runs once for several changes before it gets to run, with the latest values', async () => {
    const host = mount(<C id={1} />);
    render(<C id={2} />, host);
    render(<C id={3} />, host);
    await tick();
    expect(log).to.deep.equal(['run 1', 'undo 1', 'run 3']);
  });

  it('cleans up on unmount, and a rerun still waiting never happens', async () => {
    const host = mount(<C id={1} />);
    render(<C id={2} />, host);
    render(null, host);
    await tick();
    expect(log).to.deep.equal(['run 1', 'undo 1']);
  });

  it('[] runs once; NaN deps count as unchanged; a different length counts as changed', async () => {
    const E = (props, ctx) => {
      effect(ctx, () => { log.push('once'); }, []);
      effect(ctx, () => { log.push('list ' + props.list.length); }, props.list, 'list');
      return <p />;
    };
    const host = mount(<E list={[NaN]} />);
    render(<E list={[NaN]} />, host);
    await tick();
    render(<E list={[NaN, 1]} />, host);
    await tick();
    expect(log).to.deep.equal(['once', 'list 1', 'list 2']);
  });

  it('follows store values as well as props, on the scheduled render', async () => {
    const s = store({ user: 'a', other: 0 });
    const E = (props, ctx) => {
      effect(ctx, () => { log.push(s.user); }, [s.user]);
      return <p />;
    };
    mount(<E />);
    s.other = 1;
    await frame();
    s.user = 'b';
    await frame();
    expect(log).to.deep.equal(['a', 'b']);
  });

  it('ignores a returned value that is not a function', async () => {
    const E = (props, ctx) => { effect(ctx, async () => {}, [props.id]); return <p />; };
    const host = mount(<E id={1} />);
    render(<E id={2} />, host);
    await tick();
    expect(() => render(null, host)).to.not.throw();
  });

  it('does not call a cleanup twice when the rerun throws', async () => {
    const errors = [], prev = window.onerror;
    window.onerror = m => { errors.push(m); return true; };
    const E = (props, ctx) => {
      effect(ctx, () => { if (props.id > 1) throw new Error('boom'); return () => log.push('undo'); }, [props.id]);
      return <p />;
    };
    const host = mount(<E id={1} />);
    render(<E id={2} />, host);
    await new Promise(r => setTimeout(r, 30));
    window.onerror = prev;
    render(null, host);
    expect(log).to.deep.equal(['undo']);
    expect(errors.length).to.equal(1);
  });

  devOnly('throws when two effects share a name, which would silently overwrite each other', () => {
    const E = (props, ctx) => {
      effect(ctx, () => {}, [1]);
      effect(ctx, () => {}, [2]);
      return <p />;
    };
    expect(() => mount(<E />)).to.throw(/slot already used/);
  });
});
