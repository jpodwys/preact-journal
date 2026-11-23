const { expect } = window.chai; // karma-chai global: a mangled bundle must not rewrite chai itself
import { h, render } from '../core.js';
import { listen, debounced } from '../helpers.js';
import { mount, frame } from './core.spec.js';

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
