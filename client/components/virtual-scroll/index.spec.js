import ScrollViewport from './index';
import { h } from 'preact';

describe('ScrollViewport', () => {
  const makeItems = n => Array.from({ length: n }, (_, i) => ({ id: i }));
  const renderer = items => items.map(item => h('div', { key: item.id }, item.id));

  describe('render', () => {
    it('should set estimated height based on rowHeight and item count', () => {
      const sv = new ScrollViewport();
      const result = sv.render(
        { items: makeItems(50), renderer, rowHeight: 40, overscan: 10 },
        { offset: 0, height: 0 }
      );
      expect(result.attributes.style.height).to.equal('2000px');
    });

    it('should use defaultRowHeight when rowHeight is not provided and computeRowHeight returns 0', () => {
      const sv = new ScrollViewport();
      const result = sv.render(
        { items: makeItems(10), renderer, defaultRowHeight: 25, overscan: 0 },
        { offset: 0, height: 0 }
      );
      expect(result.attributes.style.height).to.equal('250px');
    });

    it('should fall back to 100 when no height values are provided', () => {
      const sv = new ScrollViewport();
      const result = sv.render(
        { items: makeItems(5), renderer, overscan: 0 },
        { offset: 0, height: 0 }
      );
      expect(result.attributes.style.height).to.equal('500px');
    });

    it('should slice items based on offset and height', () => {
      const sv = new ScrollViewport();
      let rendered;
      const spyRenderer = items => { rendered = items; return items.map(i => h('div', null)); };
      sv.render(
        { items: makeItems(100), renderer: spyRenderer, rowHeight: 10, overscan: 0 },
        { offset: 50, height: 30 }
      );
      // start = (50/10)|0 = 5, visibleRowCount = (30/10)|0 = 3, end = 5+1+3 = 9
      expect(rendered).to.have.length(4);
      expect(rendered[0].id).to.equal(5);
      expect(rendered[3].id).to.equal(8);
    });

    it('should apply overscan by snapping start to a multiple of overscan', () => {
      const sv = new ScrollViewport();
      let rendered;
      const spyRenderer = items => { rendered = items; return items.map(i => h('div', null)); };
      sv.render(
        { items: makeItems(100), renderer: spyRenderer, rowHeight: 10, overscan: 5 },
        { offset: 70, height: 30 }
      );
      // start = (70/10)|0 = 7, snapped = 7 - (7%5) = 5
      // visibleRowCount = (30/10)|0 = 3, + overscan 5 = 8, end = 5+1+8 = 14
      expect(rendered[0].id).to.equal(5);
      expect(rendered).to.have.length(9);
    });

    it('should not go below 0 for start', () => {
      const sv = new ScrollViewport();
      let rendered;
      const spyRenderer = items => { rendered = items; return items.map(i => h('div', null)); };
      sv.render(
        { items: makeItems(100), renderer: spyRenderer, rowHeight: 10, overscan: 20 },
        { offset: 5, height: 30 }
      );
      expect(rendered[0].id).to.equal(0);
    });

    it('should pass internalClass to the inner div', () => {
      const sv = new ScrollViewport();
      const result = sv.render(
        { items: makeItems(1), renderer, rowHeight: 10, overscan: 0, internalClass: 'fade-down' },
        { offset: 0, height: 100 }
      );
      const innerDiv = result.children[0];
      expect(innerDiv.attributes.class).to.equal('fade-down');
    });

    it('should set relative position and top offset on the inner div', () => {
      const sv = new ScrollViewport();
      const result = sv.render(
        { items: makeItems(100), renderer, rowHeight: 10, overscan: 0 },
        { offset: 50, height: 30 }
      );
      const innerDiv = result.children[0];
      expect(innerDiv.attributes.style.position).to.equal('relative');
      expect(innerDiv.attributes.style.top).to.equal(50);
    });

    it('should spread extra props onto the outer div', () => {
      const sv = new ScrollViewport();
      const result = sv.render(
        { items: makeItems(1), renderer, rowHeight: 10, overscan: 0, class: 'my-list' },
        { offset: 0, height: 100 }
      );
      expect(result.attributes.class).to.equal('my-list');
    });

    it('should handle an empty items array', () => {
      const sv = new ScrollViewport();
      let rendered;
      const spyRenderer = items => { rendered = items; return []; };
      const result = sv.render(
        { items: [], renderer: spyRenderer, rowHeight: 10, overscan: 0 },
        { offset: 0, height: 100 }
      );
      expect(result.attributes.style.height).to.equal('0px');
      expect(rendered).to.have.length(0);
    });
  });

  describe('computeRowHeight', () => {
    it('should return cached height on subsequent calls', () => {
      const sv = new ScrollViewport();
      sv._height = 42;
      expect(sv.computeRowHeight()).to.equal(42);
    });

    it('should return 0 when base is not set', () => {
      const sv = new ScrollViewport();
      sv.base = null;
      expect(sv.computeRowHeight()).to.equal(0);
    });

    it('should measure and cache the first grandchild offsetHeight', () => {
      const sv = new ScrollViewport();
      sv.base = {
        firstElementChild: {
          firstElementChild: { offsetHeight: 83 }
        }
      };
      expect(sv.computeRowHeight()).to.equal(83);
      expect(sv._height).to.equal(83);
    });
  });

  describe('resized', () => {
    it('should call setState when height changes', () => {
      const sv = new ScrollViewport();
      sv.state = { height: 0 };
      sv.setState = sinon.spy();
      sv.resized();
      expect(sv.setState.calledOnce).to.be.true;
      expect(sv.setState.firstCall.args[0]).to.have.property('height');
    });

    it('should not call setState when height is unchanged', () => {
      const sv = new ScrollViewport();
      sv.state = { height: window.innerHeight };
      sv.setState = sinon.spy();
      sv.resized();
      expect(sv.setState.called).to.be.false;
    });
  });

  describe('scrolled', () => {
    it('should call setState with offset', () => {
      const sv = new ScrollViewport();
      sv.props = {};
      sv.base = { getBoundingClientRect: () => ({ top: -100 }) };
      sv.setState = sinon.spy();
      sv.scrolled();
      expect(sv.setState.calledOnce).to.be.true;
      expect(sv.setState.firstCall.args[0].offset).to.equal(100);
    });

    it('should clamp offset to 0 when element is below viewport top', () => {
      const sv = new ScrollViewport();
      sv.props = {};
      sv.base = { getBoundingClientRect: () => ({ top: 50 }) };
      sv.setState = sinon.spy();
      sv.scrolled();
      expect(sv.setState.firstCall.args[0].offset).to.equal(0);
    });

    it('should call forceUpdate when sync prop is true', () => {
      const sv = new ScrollViewport();
      sv.props = { sync: true };
      sv.base = { getBoundingClientRect: () => ({ top: 0 }) };
      sv.setState = sinon.spy();
      sv.forceUpdate = sinon.spy();
      sv.scrolled();
      expect(sv.forceUpdate.calledOnce).to.be.true;
    });
  });

  describe('lifecycle', () => {
    it('componentDidMount should add resize and scroll listeners', () => {
      const sv = new ScrollViewport();
      sv.state = { height: 0 };
      sv.props = {};
      sv.base = { getBoundingClientRect: () => ({ top: 0 }) };
      sv.setState = sinon.spy();
      const addSpy = sinon.spy(window, 'addEventListener');
      sv.componentDidMount();
      const events = addSpy.getCalls().map(c => c.args[0]);
      expect(events).to.include('resize');
      expect(events).to.include('scroll');
      addSpy.restore();
    });

    it('componentWillUnmount should remove resize and scroll listeners', () => {
      const sv = new ScrollViewport();
      const removeSpy = sinon.spy(window, 'removeEventListener');
      sv.componentWillUnmount();
      const events = removeSpy.getCalls().map(c => c.args[0]);
      expect(events).to.include('resize');
      expect(events).to.include('scroll');
      removeSpy.restore();
    });

    it('componentDidUpdate should call resized', () => {
      const sv = new ScrollViewport();
      sv.state = { height: 0 };
      sv.setState = sinon.spy();
      sv.componentDidUpdate();
      // resized was called, which calls setState if height changed
      expect(sv.setState.called).to.be.true;
    });
  });
});
