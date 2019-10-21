import { h } from 'preact';
import { fire } from '../../components/unifire';

const getUser = prefix => ({
  username: document.getElementById(prefix + 'user').value,
  password: document.getElementById(prefix + 'pass').value
})

const join = e => {
  e.preventDefault();
  fire('createAccount', getUser('c'));
}

const login = e => {
  e.preventDefault();
  fire('login', getUser('l'));
}

export default () => {
  /**
   * For some reason, the input values are still there when this
   * component unrenders then re-renders. Using dynamic keys fixes
   * the problem. (Used componentWillUnmount before switching to a
   * functional component.)
   */
  const now = Date.now();
  return (
    <div class="login-page-wrapper">
      <h1 class="center-text">Journalize</h1>
      <h4 class="center-text">Private journal entries</h4>
        <div class="login-form-wrapper">
          <form onsubmit={join} class="full-width full-width--all">
            <fieldset>
              <legend>Create an Account</legend>
              <input id="cuser" placeholder="username" autocapitalize="off" key={now + 1}/>
              <input id="cpass" type="password" placeholder="password" key={now + 2}/>
              <input type="submit" value="Submit"/>
            </fieldset>
          </form>
          <form onsubmit={login} class="full-width full-width--all">
            <fieldset>
              <legend>or Login</legend>
              <input id="luser" placeholder="username" autocapitalize="off" key={now + 3}/>
              <input id="lpass" type="password" placeholder="password" key={now + 4}/>
              <input type="submit" value="Submit"/>
            </fieldset>
          </form>
        </div>
    </div>
  );
}
