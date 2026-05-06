import { Provider, fire } from './index';

describe('unifire', () => {

  describe('Provider', () => {
    it('should have set, render, and setState methods', () => {
      const provider = new Provider({
        state: {},
        actions: {},
        children: []
      });

      expect(typeof provider.set).to.equal('function');
      expect(typeof provider.render).to.equal('function');
      expect(typeof provider.setState).to.equal('function');
    });

    it('should merge state when calling set', () => {
      const provider = new Provider({
        state: {},
        actions: {},
        children: []
      });

      provider.set({ a: 'z', b: 'b' });
      expect(provider.state.a).to.equal('z');
      expect(provider.state.b).to.equal('b');

      provider.set({ a: 'y', b: 'b' });
      expect(provider.state.a).to.equal('y');
      expect(provider.state.b).to.equal('b');
    });

  });

  describe('fire', () => {

    it('should execute the correct action with the correct arguments when calling fire', () => {
      const action1 = sinon.spy();
      const action2 = sinon.spy();
      const action3 = sinon.spy();
      const provider = new Provider({
        state: {},
        actions: { action1, action2 },
        children: []
      });
      const payload = {};
      const e = {};

      fire('action1', payload);
      fire('action2', payload, e);

      expect(action1.calledOnce).to.be.true;
      expect(action1.calledWithExactly(provider, payload, undefined)).to.be.true;
      expect(action2.calledOnce).to.be.true;
      expect(action2.calledWithExactly(provider, payload, e)).to.be.true;
      expect(action3.calledOnce).to.be.false;
    });

    it('throws when the named action is not registered', () => {
      // Locks the contract: a typo in fire('xxx') is a hard error rather
      // than a silent no-op. Catches stale action names early.
      new Provider({
        state: {},
        actions: { known: () => {} },
        children: []
      });
      expect(() => fire('unknown', {})).to.throw(TypeError);
    });

  });

});
