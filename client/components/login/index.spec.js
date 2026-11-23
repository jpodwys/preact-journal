import { h } from '../../packages/kyvo/core';
import fetchMock from 'fetch-mock';
import { clear as idbClear } from 'idb-keyval';
import { mount, fireEvent, settle } from '../../../test/mount';
import { app } from '../../js/app-state';
import { mockLogin, mockGetAllEntries, lastBody } from '../../../test/api-mocks';
import Router from '../router';
import Login from './index';

describe('login', () => {
  let env;
  const originalPathname = location.pathname;

  beforeEach(async () => {
    localStorage.clear();
    await idbClear();
    mockLogin();
    mockGetAllEntries();
    history.replaceState(null, null, '/');
  });

  afterEach(async () => {
    if(env) env.cleanup();
    env = null;
    await settle();
    fetchMock.restore();
    localStorage.clear();
    await idbClear();
    history.replaceState(null, null, originalPathname);
  });

  const typeCredentials = (username, password) => {
    fireEvent.input(env.getByRole('textbox'), username);
    fireEvent.input(env.host.querySelector('#lpass'), password);
  };

  it('submits the typed username and password to /api/user/login', () => {
    env = mount(h(Login, { path: '/' }));
    typeCredentials('alice', 'pass1');
    // fireEvent.click on a submit input does not cascade into a form submit;
    // submit the form directly to express the user's intent.
    fireEvent.submit(env.getByRole('form'));

    expect(fetchMock.called('/api/user/login')).to.be.true;
    expect(fetchMock.lastOptions('/api/user/login').method).to.equal('POST');
    expect(lastBody('/api/user/login')).to.deep.equal({ username: 'alice', password: 'pass1' });
  });

  it('a successful login activates the account in the store and routes to /entries', async () => {
    env = mount(h(Login, { path: '/' }));
    typeCredentials('alice', 'pass1');
    fireEvent.submit(env.getByRole('form'));
    await new Promise(r => setTimeout(r, 50));
    expect(app.loggedIn).to.be.true;
    expect(app.userId).to.equal('99');
    expect(app.username).to.equal('alice');
    expect(location.pathname).to.equal('/entries');
  });

  it('renders the Cancel button only when cancelable is true', () => {
    env = mount(h(Login, { cancelable: false, path: '/' }));
    expect(env.queryByText('Cancel')).to.be.null;
    expect(env.host.firstElementChild.classList.contains('fade-up')).to.be.false;
    env.cleanup();

    env = mount(h(Login, { cancelable: true, path: '/switch' }));
    expect(env.getByText('Cancel')).to.exist;
    expect(env.host.firstElementChild.classList.contains('fade-up')).to.be.true;
  });

  it('clicking Cancel routes to /entries', () => {
    env = mount(h(Login, { cancelable: true, path: '/switch' }));
    const before = history.length;
    fireEvent.click(env.getByText('Cancel'));
    expect(location.pathname).to.equal('/entries');
    expect(history.length, 'pushed, not replaced').to.equal(before + 1);
  });

  // New: inputs are keyed by path, so switching between "/" and "/switch"
  // (the same Login component under the Router) starts with empty fields.
  it('clears typed credentials when the route switches between / and /switch', async () => {
    env = mount(h(Router, null,
      h(Login, { path: '/' }),
      h(Login, { path: '/switch', cancelable: true })
    ));
    typeCredentials('alice', 'secret');
    const firstInput = env.getByRole('textbox');

    history.pushState(null, null, '/switch');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await settle();

    expect(env.getByText('Cancel'), 'switched to the cancelable login').to.exist;
    const user = env.getByRole('textbox');
    expect(user).to.not.equal(firstInput);
    expect(user.value).to.equal('');
    expect(env.host.querySelector('#lpass').value).to.equal('');
  });
});
