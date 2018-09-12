import debounce from './index';

describe('debounce', () => {

  it('should return a function', () => {
    expect(typeof debounce()).to.equal('function');
  });
  
});
