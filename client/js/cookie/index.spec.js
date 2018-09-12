import cookie from './index';

describe('cookie', () => {
  document.cookie = 'logged_in=false;';
  document.cookie = 'role=user;';

  it('should return undefined when the cookie is not found', () => {
    expect(cookie.get('bogus')).to.be.undefined;
  });

  it('should return the correct value for an existing cookie', () => {
    expect(cookie.get('logged_in')).to.equal('false');
    expect(cookie.get('role')).to.equal('user');
  });
  
});
