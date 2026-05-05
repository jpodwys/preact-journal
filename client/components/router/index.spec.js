import { h } from 'preact';
import { mount } from '../../../test/mount';
import Router, { route } from './index';

// Black-box: mount a Router with path-tagged children, drive the URL via
// route() / history, and assert which child rendered.
describe('Router', () => {
  let env;
  const originalPathname = location.pathname;

  afterEach(() => {
    if(env) env.cleanup();
    env = null;
    history.replaceState(null, null, originalPathname);
  });

  // Stub leaf components that mark themselves with visible text so we can
  // identify the active route via the same getByText queries production
  // components are tested with.
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

  it('renders the child whose path matches location.pathname', () => {
    env = mountRouter('/entries');
    expect(env.queryByText('ENTRIES-ROUTE')).to.exist;
    expect(env.queryByText('HOME-ROUTE')).to.be.null;
  });

  it('renders the root child for /', () => {
    env = mountRouter('/');
    expect(env.queryByText('HOME-ROUTE')).to.exist;
  });

  it('matches a wildcard path against a concrete URL', () => {
    env = mountRouter('/entry/42');
    expect(env.queryByText('ENTRY-ROUTE')).to.exist;
  });

  it('renders nothing when no child path matches', () => {
    env = mountRouter('/no-such-path');
    expect(env.queryByText('HOME-ROUTE')).to.be.null;
    expect(env.queryByText('ENTRIES-ROUTE')).to.be.null;
    expect(env.queryByText('ENTRY-ROUTE')).to.be.null;
  });

  it('swaps the rendered child when route() updates the URL', () => {
    env = mountRouter('/');
    expect(env.queryByText('HOME-ROUTE')).to.exist;

    route('/entries');

    expect(env.queryByText('ENTRIES-ROUTE')).to.exist;
    expect(env.queryByText('HOME-ROUTE')).to.be.null;
  });

  it('fires the onChange prop with the new URL when route() is called', () => {
    const onChange = sinon.spy();
    env = mountRouter('/', { onChange });
    onChange.resetHistory();

    route('/entries');

    expect(onChange.calledOnce).to.be.true;
    expect(onChange.args[0][0]).to.equal('/entries');
  });

  it('fires onChange on initial mount with the current pathname', () => {
    const onChange = sinon.spy();
    env = mountRouter('/entries', { onChange });
    expect(onChange.calledWith('/entries')).to.be.true;
  });

  // Note: the legacy spec covered shouldComponentUpdate returning true when
  // the onChange prop changes between renders. There is no visible
  // black-box consequence (rendered output is URL-driven), and the harness
  // doesn't re-render with new props, so this case is intentionally not
  // covered here.
});
