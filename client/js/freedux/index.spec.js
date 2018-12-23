// import freedux from './index';
// import fire from '../fire'

// describe('freedux', () => {
//   const noop = () => {};
//   const el = {};
//   const actions = {
//     create: noop,
//     read: noop,
//     update: noop,
//     delete: noop
//   };
//   const detail = { a: 'a', b: 'b' };
//   const payload = { detail: detail };
//   const e = { e: 'e' }
//   sinon.spy(document, 'addEventListener');
//   sinon.spy(actions, 'create');
//   sinon.spy(actions, 'read');
//   freedux(el, actions);

//   it('should create an event listener by the name of each passed action', () => {
//     expect(document.addEventListener.calledWith('create')).to.be.true;
//     expect(document.addEventListener.calledWith('read')).to.be.true;
//     expect(document.addEventListener.calledWith('update')).to.be.true;
//     expect(document.addEventListener.calledWith('delete')).to.be.true;
//   });

//   it('should call the action with the fired event name', () => {
//     fire('create')();
//     expect(actions.create.calledOnce).to.be.true;
//     expect(actions.create.calledWithExactly(el, undefined, undefined)).to.be.true;
//   });

//   it('should pass the correct data to the action', () => {
//     fire('read', payload)({ e: 'e' });
//     expect(actions.read.calledOnce).to.be.true;
//     expect(actions.read.calledWithExactly(el, payload, e)).to.be.true;
//   });
  
// });
