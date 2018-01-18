import { h, Component } from 'preact';
import fire from '../../js/fire';

export default class Login extends Component {
  join = (e) => {

  }

  login = (e) => {
    e.preventDefault();
    
    fire('login', {
      user: {
        username: this.base.querySelector('#lusername').innerText,
        password: this.base.querySelector('#lpassword').innerText
      }
    })();
  }

  render() {
    return (
      <div class="login-page-wrapper">
        <h1 class="center-text">Journalize</h1>
        <h4 class="center-text">Private and public journal entries</h4>
          <form action="javscript:" onSubmit={this.join} class="join-form pure-form pure-form-stacked full-width">
            <fieldset>
              <legend>Create an Account</legend>
              <input placeholder="username" autocapitalize="off" class="needsclick"/>
              <input type="password" placeholder="password" class="needsclick"/>
              <input type="submit" class="pure-button pure-button-primary"/>
            </fieldset>
          </form>
          <form action="javascript:" onSubmit={this.login} class="login-form pure-form pure-form-stacked full-width">
            <fieldset>
              <legend>or Login</legend>
              <input id="lusername" placeholder="username" autocapitalize="off" class="needsclick"/>
              <input id="lpassword" type="password" placeholder="password" class="needsclick"/>
              <input type="submit" class="pure-button pure-button-primary"/>
            </fieldset>
          </form>
      </div>
    );
  }
}
