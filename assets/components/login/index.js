import { h, Component } from 'preact';
import linkState from 'linkstate';
import fire from '../../js/fire';

export default class Login extends Component {
  state = {
    createUser: '',
    createPass: '',
    loginUser: '',
    loginPass: ''
  };

  join = () => {

  };

  login = () => {
    fire('login', {
      user: {
        username: this.state.loginUser,
        password: this.state.loginPass
      }
    })();
  };

  render() {
    return (
      <div class="login-page-wrapper">
        <h1 class="center-text">Journalize</h1>
        <h4 class="center-text">Private and public journal entries</h4>
          <form action="javscript:" onSubmit={this.join} class="pure-form pure-form-stacked full-width">
            <fieldset>
              <legend>Create an Account</legend>
              <input onInput={linkState(this, 'createUser')} placeholder="username" autocapitalize="off" class="needsclick"/>
              <input onInput={linkState(this, 'createPass')} type="password" placeholder="password" class="needsclick"/>
              <input type="submit" class="pure-button pure-button-primary"/>
            </fieldset>
          </form>
          <form action="javascript:" onSubmit={this.login} class="pure-form pure-form-stacked full-width">
            <fieldset>
              <legend>or Login</legend>
              <input onInput={linkState(this, 'loginUser')} placeholder="username" autocapitalize="off" class="needsclick"/>
              <input onInput={linkState(this, 'loginPass')} type="password" placeholder="password" class="needsclick"/>
              <input type="submit" class="pure-button pure-button-primary"/>
            </fieldset>
          </form>
      </div>
    );
  }
}
