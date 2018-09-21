import cookie from './index';

describe('cookie', () => {

  const deleteCookie = (name) => {
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  };

  it('should return undefined when the cookie is not found', () => {
    expect(cookie.get('bogus')).to.be.undefined;
  });

  it('should return the correct value for an existing cookie', () => {
    document.cookie = 'logged_in=false;';
    document.cookie = 'role=user;';
    expect(cookie.get('logged_in')).to.equal('false');
    expect(cookie.get('role')).to.equal('user');
    deleteCookie('logged_in');
    deleteCookie('role');
  });
  
});
