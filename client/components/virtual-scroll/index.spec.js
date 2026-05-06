import { h } from 'preact';
import { mount } from '../../../test/mount';
import ScrollViewport from './index';

describe('virtual-scroll', () => {
  let env;
  afterEach(() => { if(env) env.cleanup(); env = null; });

  function makeItems (n) {
    return Array.from({ length: n }, (_, i) => ({ id: i, text: `item ${i}` }));
  }

  // A small renderer that emits one labeled div per item.
  const renderer = items => items.map(i => h('div', { class: 'row', 'data-id': i.id }, i.text));

  it('renders the renderer output and reserves outer height for all items', () => {
    const items = makeItems(5);
    env = mount(h(ScrollViewport, {
      items,
      renderer,
      rowHeight: 50,
      internalClass: 'inner'
    }));

    // All 5 fit within the initial visible window (internal OVERSCAN buffer
    // of 20 rows + window height).
    const rows = env.host.querySelectorAll('.row');
    expect(rows.length).to.equal(5);
    expect(rows[0].textContent).to.equal('item 0');
    expect(rows[4].textContent).to.equal('item 4');

    // Outer container reserves the full virtual height so the page scrolls
    // as if every row were rendered.
    const outer = env.host.firstElementChild;
    expect(outer.style.height).to.equal('250px');

    // Inner container carries the requested class for animation hooks.
    const inner = outer.querySelector('.inner');
    expect(inner).to.exist;
    expect(inner.style.position).to.equal('relative');
  });

  it('reserves height proportional to items.length and rowHeight', () => {
    env = mount(h(ScrollViewport, {
      items: makeItems(100),
      renderer,
      rowHeight: 83
    }));
    expect(env.host.firstElementChild.style.height).to.equal((100 * 83) + 'px');
  });

  it('passes through extra props to the outer container', () => {
    env = mount(h(ScrollViewport, {
      items: makeItems(2),
      renderer,
      rowHeight: 40,
      class: 'entry-list'
    }));
    expect(env.host.querySelector('.entry-list')).to.exist;
  });

  it('cleans up the same window resize/scroll listeners that were installed on mount', () => {
    const addSpy = sinon.spy(window, 'addEventListener');
    env = mount(h(ScrollViewport, {
      items: makeItems(3),
      renderer,
      rowHeight: 30
    }));

    const resizeAdd = addSpy.args.find(a => a[0] === 'resize');
    const scrollAdd = addSpy.args.find(a => a[0] === 'scroll');
    expect(resizeAdd, 'resize listener installed on mount').to.exist;
    expect(scrollAdd, 'scroll listener installed on mount').to.exist;
    addSpy.restore();

    const removeSpy = sinon.spy(window, 'removeEventListener');
    env.cleanup();
    env = null;

    // Same handler reference must be passed to removeEventListener — otherwise
    // the listener stays attached and leaks across tests / route changes.
    expect(removeSpy.calledWith('resize', resizeAdd[1])).to.be.true;
    expect(removeSpy.calledWith('scroll', scrollAdd[1])).to.be.true;
    removeSpy.restore();
  });
});
