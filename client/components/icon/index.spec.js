import { h } from '../../packages/kyvo/core';
import { mount, fireEvent } from '../../../test/mount';
import Icon from './index';

describe('icon', () => {
  let env;
  afterEach(() => { if(env) env.cleanup(); env = null; });

  it('renders an svg with the path data for a known icon', () => {
    env = mount(h(Icon, { icon: 'back' }));
    const svg = env.host.querySelector('svg');
    expect(svg).to.exist;
    expect(svg.getAttribute('icon')).to.equal('back');
    const path = svg.querySelector('path');
    expect(path).to.exist;
    expect(path.getAttribute('d')).to.have.length.greaterThan(0);
  });

  it('creates the svg and path in the SVG namespace', () => {
    env = mount(h(Icon, { icon: 'back' }));
    const ns = 'http://www.w3.org/2000/svg';
    expect(env.host.querySelector('svg').namespaceURI).to.equal(ns);
    expect(env.host.querySelector('path').namespaceURI).to.equal(ns);
  });

  it('spreads arbitrary props onto the svg (class, custom attrs, role/aria-label)', () => {
    env = mount(h(Icon, { icon: 'menu', class: 'foo bar', 'data-test': 'baz', role: 'button', 'aria-label': 'Menu' }));
    const svg = env.getByRole('button', { name: 'Menu' });
    expect(svg.getAttribute('class')).to.equal('foo bar');
    expect(svg.getAttribute('data-test')).to.equal('baz');
  });

  it('forwards onclick events', () => {
    const onclick = sinon.spy();
    env = mount(h(Icon, { icon: 'clear', onclick }));
    fireEvent.click(env.host.querySelector('svg'));
    expect(onclick.calledOnce).to.be.true;
  });

  it('renders an empty path when given an unknown icon name', () => {
    env = mount(h(Icon, { icon: 'nope-not-real' }));
    const path = env.host.querySelector('path');
    expect(path).to.exist;
    expect(path.getAttribute('d')).to.satisfy(d => d == null || d === '');
  });
});
