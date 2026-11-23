import { h } from '../../packages/kyvo/core';
import shortcuts from './index';
import { app, resetState, viewEntries } from '../app-state';
import { mount } from '../../../test/mount';

// `fire('shiftEntry')` is gone: arrow calls the real shiftEntry(count), which
// routes to the neighboring entry. With no Router mounted, route() only
// rewrites history, so location.pathname is the observable effect.
describe('shortcuts: arrow', () => {
  const LEFT = 37;
  const RIGHT = 39;
  const ENTER = 13;
  const SPACE = 32;
  const ID = 'bogus-id';
  const entries = [
    { id: 1, date: '2024-01-03', text: 'newest' },
    { id: 2, date: '2024-01-02', text: 'middle' },
    { id: 3, date: '2024-01-01', text: 'oldest' }
  ];

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

  function emit(keyCode) {
    const e = new Event('keydown');
    e.keyCode = keyCode;
    document.dispatchEvent(e);
  }

  // Viewing the middle entry of three (viewEntries is computed from entries).
  function viewEntry(id) {
    history.replaceState(null, '', '/entry/' + id);
    Object.assign(app, { view: '/entry', entries });
    app.entry = viewEntries().find(e => e.id === id);
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
    viewEntry(2);
  });

  afterEach(() => {
    removeEl();
    resetState();
    history.replaceState(null, '', '/');
  });

  it('should do nothing when the key pressed is not left or right', () => {
    emit(ENTER);
    emit(SPACE);
    expect(location.pathname).to.equal('/entry/2');
  });

  it('should do nothing when document.activeElement is an input', () => {
    appendAndFocus('input');
    emit(LEFT);
    emit(RIGHT);
    expect(location.pathname).to.equal('/entry/2');
  });

  it('should do nothing when document.activeElement is a textarea', () => {
    appendAndFocus('textarea');
    emit(LEFT);
    emit(RIGHT);
    expect(location.pathname).to.equal('/entry/2');
  });

  it('should do nothing when document.activeElement has the contenteditable attribute', () => {
    const el = appendAndFocus('div', 'contentEditable');
    expect(document.activeElement).to.equal(el);
    emit(LEFT);
    emit(RIGHT);
    expect(location.pathname).to.equal('/entry/2');
  });

  it('should route to the previous (newer) entry when left is pressed', () => {
    appendAndFocus('div');
    emit(LEFT);
    expect(location.pathname).to.equal('/entry/1');
  });

  it('should route to the next (older) entry when right is pressed', () => {
    appendAndFocus('div');
    emit(RIGHT);
    expect(location.pathname).to.equal('/entry/3');
  });

  it('should replace the history entry rather than push a new one', () => {
    const length = history.length;
    emit(RIGHT);
    expect(location.pathname).to.equal('/entry/3');
    expect(history.length).to.equal(length);
  });

  it('should do nothing at the edge of the list', () => {
    viewEntry(1);
    emit(LEFT);
    expect(location.pathname).to.equal('/entry/1');
  });

  it('should do nothing outside the /entry view', () => {
    history.replaceState(null, '', '/entries');
    app.view = '/entries';
    emit(RIGHT);
    expect(location.pathname).to.equal('/entries');
  });
});
