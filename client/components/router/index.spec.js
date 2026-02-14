import Router, { route } from './index';
import { h } from 'preact';

describe('Router', () => {
  const originalPathname = location.pathname;

  afterEach(() => {
    history.replaceState(null, null, originalPathname);
  });

  describe('matchUrlWithWildCards', () => {
    let router;

    beforeEach(() => {
      router = new Router();
    });

    it('should match an exact path', () => {
      expect(router.matchUrlWithWildCards('/entries', '/entries')).to.be.true;
    });

    it('should match a wildcard segment', () => {
      expect(router.matchUrlWithWildCards('/entry/:id', '/entry/123')).to.be.true;
    });

    it('should not match when path has more segments than url', () => {
      expect(router.matchUrlWithWildCards('/entry/:id/edit', '/entry/123')).to.be.false;
    });

    it('should not match when segments differ and there is no wildcard', () => {
      expect(router.matchUrlWithWildCards('/entries', '/search')).to.be.false;
    });

    it('should match root path', () => {
      expect(router.matchUrlWithWildCards('/', '/')).to.be.true;
    });

    it('should match when url has more segments with wildcards', () => {
      expect(router.matchUrlWithWildCards('/entry/:id', '/entry/123')).to.be.true;
    });

    it('should not match when url has more segments than path', () => {
      expect(router.matchUrlWithWildCards('/entry', '/entry/123/edit')).to.be.false;
    });
  });

  describe('matchPath', () => {
    let router;
    const children = [
      { attributes: { path: '/' } },
      { attributes: { path: '/entries' } },
      { attributes: { path: '/entry/:id' } }
    ];

    beforeEach(() => {
      router = new Router();
    });

    it('should match exact paths', () => {
      const result = router.matchPath('/entries', children);
      expect(result).to.have.length(1);
      expect(result[0].attributes.path).to.equal('/entries');
    });

    it('should match wildcard paths', () => {
      const result = router.matchPath('/entry/42', children);
      expect(result).to.have.length(1);
      expect(result[0].attributes.path).to.equal('/entry/:id');
    });

    it('should return root for /', () => {
      const result = router.matchPath('/', children);
      expect(result.length).to.be.greaterThan(0);
      expect(result[0].attributes.path).to.equal('/');
    });

    it('should return empty for unmatched paths', () => {
      const result = router.matchPath('/unknown', children);
      expect(result).to.have.length(0);
    });
  });

  describe('render', () => {
    it('should render the first matching child', () => {
      const router = new Router();
      const childA = h('div', { path: '/' }, 'home');
      const childB = h('div', { path: '/entries' }, 'entries');
      const result = router.render({ children: [childA, childB] }, { url: '/entries' });
      expect(result).to.equal(childB);
    });

    it('should return undefined for unmatched url', () => {
      const router = new Router();
      const childA = h('div', { path: '/' }, 'home');
      const result = router.render({ children: [childA] }, { url: '/nonexistent' });
      expect(result).to.be.undefined;
    });
  });

  describe('route', () => {
    it('should update the URL via pushState', () => {
      route('/context.html#test-push', true);
      expect(location.pathname).to.contain('context.html');
    });

    it('should call onChange when ONCHANGE is set', () => {
      const onChange = sinon.spy();
      const router = new Router();
      router.props = { onChange, children: [] };
      router.componentWillMount();
      onChange.resetHistory();

      route('/context.html#test-onchange', true);
      expect(onChange.calledWith('/context.html#test-onchange')).to.be.true;
    });
  });

  describe('shouldComponentUpdate', () => {
    it('should return true when url changes', () => {
      const router = new Router();
      router.state = { url: '/old' };
      expect(router.shouldComponentUpdate({}, { url: '/new' })).to.be.true;
    });

    it('should return false when url is the same', () => {
      const router = new Router();
      router.state = { url: '/same' };
      expect(router.shouldComponentUpdate({}, { url: '/same' })).to.be.false;
    });
  });

  describe('componentWillMount', () => {
    it('should set document.onclick and window.onpopstate', () => {
      const router = new Router();
      router.props = { children: [] };
      router.componentWillMount();
      expect(document.onclick).to.be.a('function');
      expect(window.onpopstate).to.be.a('function');
    });

    it('should call onChange with current pathname when provided', () => {
      const onChange = sinon.spy();
      const router = new Router();
      router.props = { onChange, children: [] };
      router.componentWillMount();
      expect(onChange.calledOnce).to.be.true;
    });

    it('should not call onChange when not provided', () => {
      const router = new Router();
      router.props = { children: [] };
      router.componentWillMount();
      // No error thrown means it handled the missing onChange
    });
  });
});
