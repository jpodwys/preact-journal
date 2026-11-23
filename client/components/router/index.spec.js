import { h, render } from '../../packages/kyvo/core';
import { mount, fireEvent, settle } from '../../../test/mount';
import Router, { route } from './index';

// Black-box: mount a Router with path-tagged children, drive the URL via
// route() / history / clicks, and assert which child rendered.
describe('Router', () => {
  let env, env2;
  const originalPathname = location.pathname;

  afterEach(() => {
    if(env2) env2.cleanup();
    if(env) env.cleanup();
    env = env2 = null;
    history.replaceState(null, null, originalPathname);
  });

  const Home = () => h('div', null, 'HOME-ROUTE');
  const Entries = () => h('div', null, 'ENTRIES-ROUTE');
  const Entry = () => h('div', null, 'ENTRY-ROUTE');

  function mountRouter (path, extraProps) {
    history.replaceState(null, null, path);
    return mount(h(Router, extraProps || null,
      h(Home, { path: '/' }),
      h(Entries, { path: '/entries' }),
      h(Entry, { path: '/entry/:id' })
    ));
  }

  describe('path matching', () => {
    it('renders the child whose path matches location.pathname', () => {
      env = mountRouter('/entries');
      expect(env.queryByText('ENTRIES-ROUTE')).to.exist;
      expect(env.queryByText('HOME-ROUTE')).to.be.null;
    });

    it('renders the root child for /', () => {
      env = mountRouter('/');
      expect(env.queryByText('HOME-ROUTE')).to.exist;
      expect(env.queryByText('ENTRIES-ROUTE')).to.be.null;
    });

    it('matches a :param path against a concrete URL', () => {
      env = mountRouter('/entry/42');
      expect(env.queryByText('ENTRY-ROUTE')).to.exist;
    });

    it('does not match a :param path when the segment is missing or extra segments differ', () => {
      env = mountRouter('/entry');
      expect(env.queryByText('ENTRY-ROUTE')).to.be.null;
      env.cleanup();
      env = mountRouter('/entries/7');
      expect(env.queryByText('ENTRIES-ROUTE')).to.be.null;
    });

    it('renders nothing when no child path matches', () => {
      env = mountRouter('/no-such-path');
      expect(env.queryByText('HOME-ROUTE')).to.be.null;
      expect(env.queryByText('ENTRIES-ROUTE')).to.be.null;
      expect(env.queryByText('ENTRY-ROUTE')).to.be.null;
    });
  });

  describe('route(url, replace)', () => {
    it('swaps the rendered child (on the next frame) and pushes a history entry', async () => {
      env = mountRouter('/');
      const before = history.length;

      route('/entries');
      expect(location.pathname).to.equal('/entries');
      expect(history.length).to.equal(before + 1);
      await settle();

      expect(env.queryByText('ENTRIES-ROUTE')).to.exist;
      expect(env.queryByText('HOME-ROUTE')).to.be.null;
    });

    it('replaces the current history entry when replace is true', async () => {
      env = mountRouter('/');
      const before = history.length;
      route('/entry/5', true);
      expect(location.pathname).to.equal('/entry/5');
      expect(history.length).to.equal(before);
      await settle();
      expect(env.queryByText('ENTRY-ROUTE')).to.exist;
    });

    it('scrolls to the top on push', () => {
      env = mountRouter('/');
      const scrollSpy = sinon.spy(window, 'scrollTo');
      try {
        route('/entries');
        expect(scrollSpy.calledWith(0, 0)).to.be.true;
      } finally { scrollSpy.restore(); }
    });

    it('calls onChange with the new URL', () => {
      const onChange = sinon.spy();
      env = mountRouter('/', { onChange });
      onChange.resetHistory();

      route('/entries');

      expect(onChange.calledOnce).to.be.true;
      expect(onChange.args[0][0]).to.equal('/entries');
    });

    it('calls the latest onChange prop after a re-render with a new callback', () => {
      const first = sinon.spy(), second = sinon.spy();
      env = mountRouter('/', { onChange: first });
      // Re-render the same root with a different onChange.
      render(h(Router, { onChange: second },
        h(Home, { path: '/' }),
        h(Entries, { path: '/entries' })
      ), env.host);
      first.resetHistory();
      route('/entries');
      expect(first.called).to.be.false;
      expect(second.calledWith('/entries')).to.be.true;
    });

    it('is a harmless history write when no Router is mounted', () => {
      history.replaceState(null, null, '/');
      route('/entries', true);
      expect(location.pathname).to.equal('/entries');
    });
  });

  it('calls onChange on mount with the current pathname', () => {
    const onChange = sinon.spy();
    env = mountRouter('/entries', { onChange });
    expect(onChange.calledOnce).to.be.true;
    expect(onChange.args[0][0]).to.equal('/entries');
  });

  it('renders from location.pathname, so a remounted Router needs no saved state', async () => {
    env = mountRouter('/');
    route('/entries');
    await settle();
    env.cleanup();
    history.replaceState(null, null, '/entry/1');
    env = mount(h(Router, null,
      h(Entries, { path: '/entries' }),
      h(Entry, { path: '/entry/:id' })
    ));
    expect(env.queryByText('ENTRY-ROUTE')).to.exist;
    expect(env.queryByText('ENTRIES-ROUTE')).to.be.null;
  });

  describe('popstate', () => {
    it('renders the child for the new location and calls onChange', async () => {
      const onChange = sinon.spy();
      env = mountRouter('/', { onChange });
      onChange.resetHistory();

      history.pushState(null, null, '/entry/9');
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(onChange.calledOnceWith('/entry/9')).to.be.true;
      await settle();

      expect(env.queryByText('ENTRY-ROUTE')).to.exist;
      expect(env.queryByText('HOME-ROUTE')).to.be.null;
    });
  });

  describe('document click interception', () => {
    // Bail-out paths leave the default action in place, which Karma's headless
    // Chrome treats as a real navigation (a page reload). Swallow the default
    // at the window (after the Router's document handler has decided) and
    // record whether the Router prevented it.
    let routerPrevented;
    const swallowDefault = e => { routerPrevented = e.defaultPrevented; e.preventDefault(); };
    beforeEach(() => { routerPrevented = undefined; window.addEventListener('click', swallowDefault); });
    afterEach(() => window.removeEventListener('click', swallowDefault));

    function addLink (attrs, text) {
      const link = document.createElement('a');
      Object.keys(attrs).forEach(k => link.setAttribute(k, attrs[k]));
      if(text) link.appendChild(text);
      env.host.appendChild(link);
      return link;
    }

    const click = (node, init) => {
      node.dispatchEvent(new MouseEvent('click', Object.assign({ bubbles: true, cancelable: true, button: 0 }, init)));
    };

    it('routes internal /-prefixed links and walks up to the enclosing <a>', async () => {
      env = mountRouter('/');
      const inner = document.createElement('span');
      inner.textContent = 'go';
      addLink({ href: '/entries' }, inner);

      fireEvent.click(inner);

      expect(routerPrevented).to.be.true;
      expect(location.pathname).to.equal('/entries');
      await settle();
      expect(env.queryByText('ENTRIES-ROUTE')).to.exist;
      expect(env.queryByText('HOME-ROUTE')).to.be.null;
    });

    it('routes links with target="_self"', () => {
      env = mountRouter('/');
      click(addLink({ href: '/entries', target: '_self' }));
      expect(routerPrevented).to.be.true;
      expect(location.pathname).to.equal('/entries');
    });

    ['ctrlKey', 'metaKey', 'shiftKey', 'altKey'].forEach(mod => {
      it(`does not route when ${mod} is held`, () => {
        env = mountRouter('/');
        click(addLink({ href: '/entries' }), { [mod]: true });
        expect(routerPrevented).to.be.false;
        expect(location.pathname).to.equal('/');
      });
    });

    it('does not route on a non-primary (middle) click', () => {
      env = mountRouter('/');
      click(addLink({ href: '/entries' }), { button: 1 });
      expect(routerPrevented).to.be.false;
      expect(location.pathname).to.equal('/');
    });

    it('does not route links with target="_blank"', () => {
      env = mountRouter('/');
      click(addLink({ href: '/entries', target: '_blank' }));
      expect(routerPrevented).to.be.false;
      expect(location.pathname).to.equal('/');
    });

    it('ignores clicks on links whose href does not start with /', () => {
      env = mountRouter('/');
      click(addLink({ href: 'https://example.com' }));
      expect(routerPrevented).to.be.false;
      expect(location.pathname).to.equal('/');
      expect(env.queryByText('HOME-ROUTE')).to.exist;
    });

    it('ignores clicks outside any link', () => {
      env = mountRouter('/');
      const span = document.createElement('span');
      env.host.appendChild(span);
      click(span);
      expect(routerPrevented).to.be.false;
      expect(location.pathname).to.equal('/');
    });
  });

  describe('listener cleanup', () => {
    it('stops intercepting clicks and handling popstate after it unmounts', async () => {
      const onChange = sinon.spy();
      env = mountRouter('/', { onChange });
      onChange.resetHistory();
      env.cleanup();
      env = null;

      const a = document.createElement('a');
      a.setAttribute('href', '/entries');
      document.body.appendChild(a);
      // Record whether anything intercepted the click, then stop the browser really following the link.
      let intercepted;
      document.addEventListener('click', e => { intercepted = e.defaultPrevented; e.preventDefault(); }, { once: true });
      fireEvent.click(a);
      a.remove();
      expect(intercepted, 'click no longer intercepted').to.be.false;
      expect(location.pathname).to.equal('/');

      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(onChange.called, 'popstate no longer reported').to.be.false;
    });

    it('route() after unmount is just a history write (no onChange, no errors)', () => {
      const onChange = sinon.spy();
      env = mountRouter('/', { onChange });
      onChange.resetHistory();
      env.cleanup();
      env = null;
      route('/entries', true);
      expect(location.pathname).to.equal('/entries');
      expect(onChange.called).to.be.false;
    });
  });
});
