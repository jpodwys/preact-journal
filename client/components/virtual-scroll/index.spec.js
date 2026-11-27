import { h } from '../../packages/kyvo/core';
import { mount, waitFor, nextRender } from '../../../test/mount';
import ScrollViewport from './index';

describe('virtual-scroll', () => {
  let env, innerHeightDesc;
  const ROW = 50;
  const OVERSCAN = 20; // mirrors the component's internal constant

  beforeEach(() => { innerHeightDesc = Object.getOwnPropertyDescriptor(window, 'innerHeight'); });
  afterEach(() => {
    if(env) env.cleanup();
    env = null;
    if(innerHeightDesc) Object.defineProperty(window, 'innerHeight', innerHeightDesc);
    else delete window.innerHeight;
    window.scrollTo(0, 0);
  });

  const makeItems = n => Array.from({ length: n }, (_, i) => ({ id: i, text: `item ${i}` }));
  const renderer = items => items.map(i => h('div', { class: 'row', key: i.id }, i.text));
  const rows = () => env.host.querySelectorAll('.row');
  const outer = () => env.host.firstElementChild;
  const inner = () => outer().querySelector('.fade-down');

  const setInnerHeight = value =>
    Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => value });

  // Scroll the window so the list's top edge sits `offset` px above the viewport.
  function scrollListTo (offset) {
    const top = outer().getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + offset);
    window.dispatchEvent(new Event('scroll'));
  }

  const mountList = (n, rowHeight = ROW) =>
    mount(h(ScrollViewport, { items: makeItems(n), renderer, rowHeight }));

  // The first render does not know the viewport height yet; the mount-time measurement renders the real window.
  const measured = () => waitFor(() => expect(rows().length).to.equal(((innerHeight / ROW) | 0) + OVERSCAN + 1));
  const firstRowIs = text => waitFor(() => expect(rows()[0].textContent).to.equal(text));

  it('renders every row when they all fit in the initial window, inside a relative fade-down container', () => {
    env = mountList(5);
    expect(rows().length).to.equal(5);
    expect(rows()[0].textContent).to.equal('item 0');
    expect(rows()[4].textContent).to.equal('item 4');
    expect(inner()).to.exist;
    expect(inner().style.position).to.equal('relative');
  });

  it('reserves outer height proportional to items.length and rowHeight', () => {
    env = mountList(100, 83);
    expect(outer().style.height).to.equal((100 * 83) + 'px');
  });

  it('only renders the rows near the viewport (window height + overscan)', async () => {
    env = mountList(1000);
    await measured();
    expect(rows()[0].textContent).to.equal('item 0');
    expect(inner().style.top).to.equal('0px');
  });

  it('moves the window on scroll, aligned down to the overscan chunk', async () => {
    env = mountList(1000);
    await measured();
    const count = rows().length;

    scrollListTo(50 * ROW + 10); // row 50 -> start aligned to 40
    await firstRowIs('item 40');
    expect(inner().style.top).to.equal(40 * ROW + 'px');
    expect(rows().length, 'window size unchanged').to.equal(count);

    scrollListTo(59 * ROW + 10); // still inside the 40..59 chunk: no shift
    await nextRender();
    expect(rows()[0].textContent).to.equal('item 40');

    scrollListTo(60 * ROW + 10); // next chunk
    await firstRowIs('item 60');
    expect(inner().style.top).to.equal(60 * ROW + 'px');
  });

  it('clamps the offset at 0 when the list is below the top of the viewport', async () => {
    env = mountList(1000);
    await measured();
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event('scroll'));
    await nextRender();
    expect(rows()[0].textContent).to.equal('item 0');
    expect(inner().style.top).to.equal('0px');
  });

  it('grows the window on resize to a taller viewport', async () => {
    env = mountList(1000);
    await measured();
    setInnerHeight(2000);
    window.dispatchEvent(new Event('resize'));
    await waitFor(() => expect(rows().length).to.equal(2000 / ROW + OVERSCAN + 1));
  });

  it('adds passive capture scroll/resize listeners on mount and removes the same ones on unmount', () => {
    const addSpy = sinon.spy(window, 'addEventListener');
    let resizeAdd, scrollAdd;
    try {
      env = mountList(3, 30);
      resizeAdd = addSpy.args.find(a => a[0] === 'resize');
      scrollAdd = addSpy.args.find(a => a[0] === 'scroll');
    } finally { addSpy.restore(); }
    expect(resizeAdd, 'resize listener installed on mount').to.exist;
    expect(scrollAdd, 'scroll listener installed on mount').to.exist;
    expect(resizeAdd[2]).to.deep.equal({ passive: true, capture: true });
    expect(scrollAdd[2]).to.deep.equal({ passive: true, capture: true });

    const removeSpy = sinon.spy(window, 'removeEventListener');
    try {
      env.cleanup();
      env = null;
    } finally { removeSpy.restore(); }

    // Same handler and same capture flag, or the listener stays attached.
    const resizeRemove = removeSpy.args.find(a => a[0] === 'resize' && a[1] === resizeAdd[1]);
    const scrollRemove = removeSpy.args.find(a => a[0] === 'scroll' && a[1] === scrollAdd[1]);
    expect(resizeRemove, 'resize listener removed').to.exist;
    expect(scrollRemove, 'scroll listener removed').to.exist;
    expect(resizeRemove[2]).to.deep.equal({ passive: true, capture: true });
    expect(scrollRemove[2]).to.deep.equal({ passive: true, capture: true });
  });

  it('a scroll event after unmount is harmless', async () => {
    env = mountList(1000);
    await measured();
    env.cleanup();
    env = null;
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    await nextRender();
  });
});
