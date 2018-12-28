import { h, Component } from 'preact';
import { fire } from '../../components/unifire';

export default class Login extends Component {
  componentWillUnmount() {
    ['cuser', 'cpass', 'luser', 'lpass'].forEach(selector => {
      this.base.querySelector('#' + selector).value = '';
    });
  }

  getUser = prefix => ({
    username: this.base.querySelector('#' + prefix + 'user').value,
    password: this.base.querySelector('#' + prefix + 'pass').value
  })

  join = e => {
    e.preventDefault();
    fire('createAccount', this.getUser('c'))();
  }

  login = e => {
    e.preventDefault();
    fire('login', this.getUser('l'))();
  }

  render() {
    return (
      <div class="login-page-wrapper">
        <h1 class="center-text">Journalize</h1>
        <h4 class="center-text">Private journal entries</h4>
          <div class="login-form-wrapper">
            <form onsubmit={this.join} class="full-width full-width--all">
              <fieldset>
                <legend>Create an Account</legend>
                <input id="cuser" placeholder="username" autocapitalize="off"/>
                <input id="cpass" type="password" placeholder="password"/>
                <input type="submit" value="Submit"/>
              </fieldset>
            </form>
            <form onsubmit={this.login} class="full-width full-width--all">
              <fieldset>
                <legend>or Login</legend>
                <input id="luser" placeholder="username" autocapitalize="off"/>
                <input id="lpass" type="password" placeholder="password"/>
                <input type="submit" value="Submit"/>
              </fieldset>
            </form>
          </div>
      </div>
    );
  }
}
