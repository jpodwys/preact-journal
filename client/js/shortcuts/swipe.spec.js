import { h } from '../../packages/kyvo/core';
import shortcuts from './index';
import { app, resetState, viewEntries } from '../app-state';
import { mount } from '../../../test/mount';

// `fire('shiftEntry')` is gone: swipe calls the real shiftEntry(count), which
// routes to the neighboring entry. With no Router mounted, route() only
// rewrites history, so location.pathname is the observable effect.
describe('shortcuts: swipe', () => {
  const ID = 'bogus-id';
  const entries = [
    { id: 1, date: '2024-01-03', text: 'newest' },
    { id: 2, date: '2024-01-02', text: 'middle' },
    { id: 3, date: '2024-01-01', text: 'oldest' }
  ];
  let now;

  function appendAndFocus(type, attr) {
    const el = document.createElement(type);
    el.id = ID;
    if(attr) el[attr] = true;
    document.body.appendChild(el).focus();
    return el;
  }

  function removeEl() {
    const el = document.getElementById(ID);
    if(el) el.remove();
  }

  function emit(name, x, y) {
    const e = new Event(name);
    e.pageX = x;
    e.pageY = y;
    document.dispatchEvent(e);
  }

  // Installed the way App does it: a component calls shortcuts(ctx); unmounting removes the listeners.
  let env;
  before(() => {
    env = mount(h((props, ctx) => { shortcuts(ctx); return h('div'); }));
  });
  after(() => env.cleanup());

  beforeEach(() => {
    localStorage.clear();
    resetState();
    history.replaceState(null, '', '/entry/2');
    Object.assign(app, { view: '/entry', entries });
    app.entry = viewEntries()[1];
    // Control the clock the swipe duration is measured with.
    now = 1e6;
    sinon.stub(Date, 'now').callsFake(() => now);
  });

  afterEach(() => {
    Date.now.restore();
    removeEl();
    resetState();
    history.replaceState(null, '', '/');
  });

  it('should do nothing when the swipe\'s x distance is below 30px', () => {
    emit('touchstart', 0, 0);
    emit('touchend', 29, 0);
    expect(location.pathname).to.equal('/entry/2');
  });

  it('should do nothing when the swipe\'s y distance is 20px or more', () => {
    emit('touchstart', 0, 0);
    emit('touchend', 30, 20);
    expect(location.pathname).to.equal('/entry/2');
  });

  // The original focus-guard tests used a swipe that was invalid anyway
  // (dy = 21); these use a valid one so the guard is what is being tested.
  it('should do nothing when document.activeElement is an input', () => {
    appendAndFocus('input');
    emit('touchstart', 0, 0);
    emit('touchend', 30, 0);
    expect(location.pathname).to.equal('/entry/2');
  });

  it('should do nothing when document.activeElement is a textarea', () => {
    appendAndFocus('textarea');
    emit('touchstart', 0, 0);
    emit('touchend', 30, 0);
    expect(location.pathname).to.equal('/entry/2');
  });

  it('should do nothing when document.activeElement has the contenteditable attribute', () => {
    const el = appendAndFocus('div', 'contentEditable');
    expect(document.activeElement).to.equal(el);
    emit('touchstart', 0, 0);
    emit('touchend', 30, 0);
    expect(location.pathname).to.equal('/entry/2');
  });

  it('should do nothing when the swipe ends more than 1000ms after starting', () => {
    emit('touchstart', 0, 0);
    now += 1001;
    emit('touchend', 30, 0);
    expect(location.pathname).to.equal('/entry/2');
  });

  it('should still count a swipe that ends exactly 1000ms after starting', () => {
    emit('touchstart', 0, 0);
    now += 1000;
    emit('touchend', 30, 0);
    expect(location.pathname).to.equal('/entry/1');
  });

  it('should route to the previous (newer) entry when swiping to the right', () => {
    emit('touchstart', 0, 0);
    now += 100;
    emit('touchend', 30, 19);
    expect(location.pathname).to.equal('/entry/1');
  });

  it('should route to the next (older) entry when swiping to the left', () => {
    emit('touchstart', 30, 0);
    now += 100;
    emit('touchend', 0, 19);
    expect(location.pathname).to.equal('/entry/3');
  });

  it('should read coordinates from changedTouches on real touch events', () => {
    const touch = (name, x) => {
      const e = new Event(name);
      e.changedTouches = [{ pageX: x, pageY: 0 }];
      document.dispatchEvent(e);
    };
    touch('touchstart', 100);
    touch('touchend', 0);
    expect(location.pathname).to.equal('/entry/3');
  });

  it('should do nothing outside the /entry view', () => {
    history.replaceState(null, '', '/entries');
    app.view = '/entries';
    emit('touchstart', 30, 0);
    emit('touchend', 0, 0);
    expect(location.pathname).to.equal('/entries');
  });
});
