import { h, Component } from 'preact';
import fire from '../../js/fire';

export default class Login extends Component {
  componentWillUnmount() {
    this.base.querySelector('#cusername').value = '';
    this.base.querySelector('#cpassword').value = '';
    this.base.querySelector('#lusername').value = '';
    this.base.querySelector('#lpassword').value = '';
  }

  getUser = prefix => ({
    // user: {
      username: this.base.querySelector('#' + prefix + 'username').value,
      password: this.base.querySelector('#' + prefix + 'password').value
    // }
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
            <form action="/api/user" method="POST" onsubmit={this.join} class="full-width full-width--all">
              <fieldset>
                <legend>Create an Account</legend>
                <input id="cusername" placeholder="username" autocapitalize="off"/>
                <input id="cpassword" type="password" placeholder="password"/>
                <input type="submit"/>
              </fieldset>
            </form>
            <form action="/api/user/login" method="POST" onsubmit={this.login} class="full-width full-width--all">
              <fieldset>
                <legend>or Login</legend>
                <input id="lusername" placeholder="username" autocapitalize="off"/>
                <input id="lpassword" type="password" placeholder="password"/>
                <input type="submit"/>
              </fieldset>
            </form>
          </div>
      </div>
    );
  }
}
