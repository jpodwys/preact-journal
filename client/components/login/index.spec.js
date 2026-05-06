import { h } from 'preact';
import fetchMock from 'fetch-mock';
import { mount, fireEvent } from '../../../test/mount';
import Login from './index';
import User from '../../js/services/user-service';
import { mockLogin } from '../../../test/api-mocks';

describe('login', () => {
  let env;

  beforeEach(() => {
    localStorage.clear();
    mockLogin();
  });

  afterEach(() => {
    if(env) env.cleanup();
    env = null;
    fetchMock.restore();
  });

  it('submits the typed username and password to /api/user/login', () => {
    env = mount(h(Login, null), {
      state: { cancelable: false },
      // Slim login action: routes the form's intent to the real network
      // helper so fetch-mock can catch it. Full chain lives in user-actions.
      actions: { login: (el, user) => User.login(user) }
    });

    fireEvent.input(env.host.querySelector('#luser'), 'alice');
    fireEvent.input(env.host.querySelector('#lpass'), 'pass1');
    // fireEvent.click on a submit input dispatches a synthetic click that
    // doesn't cascade into a form submit (matches RTL semantics). Submit
    // the form directly to express the user's intent.
    fireEvent.submit(env.getByRole('form'));

    expect(fetchMock.called('/api/user/login')).to.be.true;
    const opts = fetchMock.lastOptions('/api/user/login');
    expect(opts.method).to.equal('POST');
    expect(JSON.parse(opts.body)).to.deep.equal({
      username: 'alice',
      password: 'pass1'
    });
  });

  it('renders the Cancel button only when cancelable is true', () => {
    env = mount(h(Login, null), { state: { cancelable: false } });
    expect(env.queryByText('Cancel')).to.be.null;
    env.cleanup();

    env = mount(h(Login, null), { state: { cancelable: true } });
    expect(env.getByText('Cancel')).to.exist;
  });

  it('clicking Cancel routes to /entries', () => {
    // route() ultimately calls history.pushState (wrapped by Router at
    // module load to also scrollTo(0, 0)). The spy lands on the wrapper.
    const pushSpy = sinon.spy(history, 'pushState');
    env = mount(h(Login, null), { state: { cancelable: true } });
    fireEvent.click(env.getByText('Cancel'));
    expect(pushSpy.calledOnce).to.be.true;
    expect(pushSpy.args[0][2]).to.equal('/entries');
    pushSpy.restore();
  });
});
