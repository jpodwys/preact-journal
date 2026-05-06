import { h } from 'preact';
import { mount, fireEvent } from '../../../test/mount';
import Entries from './index';

describe('entries', () => {
  let env;

  // In headless Chrome, document.scrollingElement is documentElement and
  // body.scrollTop assignments don't stick. Production reads/writes body
  // .scrollTop directly, so shim it for tests to observe both directions.
  let bodyScrollTop = 0;
  let originalScrollTop;
  before(() => {
    originalScrollTop = Object.getOwnPropertyDescriptor(
      Element.prototype, 'scrollTop'
    );
    Object.defineProperty(document.body, 'scrollTop', {
      configurable: true,
      get() { return bodyScrollTop; },
      set(v) { bodyScrollTop = v; }
    });
  });
  after(() => {
    delete document.body.scrollTop;
    if(originalScrollTop) {
      Object.defineProperty(Element.prototype, 'scrollTop', originalScrollTop);
    }
  });

  afterEach(() => {
    if(env) env.cleanup();
    env = null;
    bodyScrollTop = 0;
  });

  function mountEntries (state = {}, actions = {}) {
    return mount(h(Entries, null), {
      state: Object.assign({ viewEntries: [], scrollPosition: 0, filterText: '' }, state),
      actions
    });
  }

  it('renders the zero-state when there are no entries', () => {
    env = mountEntries();
    expect(env.getByText("It's empty in here!")).to.exist;
    expect(env.host.querySelector('.entry-list')).to.not.exist;
  });

  it('renders the entry list (no zero-state) when entries are present', () => {
    env = mountEntries({
      viewEntries: [
        { id: 1, date: '2024-01-01', text: 'first' },
        { id: 2, date: '2024-01-02', text: 'second' }
      ]
    });
    expect(env.queryByText("It's empty in here!")).to.be.null;
    expect(env.host.querySelector('.entry-list')).to.exist;
    // The first entry's date appears via the rendered EntryPreview.
    expect(env.getByText('2024-01-01')).to.exist;
  });

  it('installs and removes the body scroll listener across mount/unmount', () => {
    document.body.onscroll = null;
    env = mountEntries();
    expect(document.body.onscroll).to.be.a('function');
    env.cleanup();
    env = null;
    expect(document.body.onscroll).to.be.null;
  });

  it('applies state.scrollPosition to document.body.scrollTop on render', () => {
    env = mountEntries({
      viewEntries: [{ id: 1, date: '2024-01-01', text: 'a' }],
      scrollPosition: 250
    });
    expect(document.body.scrollTop).to.equal(250);
  });

  describe('body scroll listener', () => {
    let clock;
    beforeEach(() => { clock = sinon.useFakeTimers(); });
    afterEach(() => clock.restore());

    it('fires linkstate with the new scrollPosition after the 50ms debounce', () => {
      const linkstate = sinon.spy();
      env = mountEntries(
        { viewEntries: [{ id: 1, date: 'd', text: 't' }] },
        { linkstate }
      );

      document.body.scrollTop = 137;
      fireEvent(document.body, 'scroll');
      expect(linkstate.called).to.be.false;
      clock.tick(50);

      expect(linkstate.calledOnce).to.be.true;
      expect(linkstate.args[0][1]).to.deep.equal({
        key: 'scrollPosition',
        val: 137
      });
    });
  });
});
