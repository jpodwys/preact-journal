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

  // Stub leaf components that mark themselves so we can identify the active route.
  const Home = () => h('div', { 'data-route': 'home' }, 'home');
  const Entries = () => h('div', { 'data-route': 'entries' }, 'entries');
  const Entry = (props) => h('div', { 'data-route': 'entry', 'data-id': props.id || '' });

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
    expect(env.host.querySelector('[data-route="entries"]')).to.exist;
    expect(env.host.querySelector('[data-route="home"]')).to.not.exist;
  });

  it('renders the root child for /', () => {
    env = mountRouter('/');
    expect(env.host.querySelector('[data-route="home"]')).to.exist;
  });

  it('matches a wildcard path against a concrete URL', () => {
    env = mountRouter('/entry/42');
    expect(env.host.querySelector('[data-route="entry"]')).to.exist;
  });

  it('renders nothing when no child path matches', () => {
    env = mountRouter('/no-such-path');
    expect(env.host.querySelector('[data-route]')).to.not.exist;
  });

  it('swaps the rendered child when route() updates the URL', () => {
    env = mountRouter('/');
    expect(env.host.querySelector('[data-route="home"]')).to.exist;

    route('/entries');

    expect(env.host.querySelector('[data-route="entries"]')).to.exist;
    expect(env.host.querySelector('[data-route="home"]')).to.not.exist;
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
});
