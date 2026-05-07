import { h } from 'preact';
import { fire } from '../../components/unifire';
import { route } from '../../components/router';

const getUser = prefix => ({
  username: document.getElementById(prefix + 'user').value,
  password: document.getElementById(prefix + 'pass').value
})

const login = e => {
  e.preventDefault();
  fire('login', getUser('l'));
}

export default ({ cancelable }) => {
  /**
   * For some reason, the input values are still there when this
   * component unrenders then re-renders. Using dynamic keys fixes
   * the problem. (Used componentWillUnmount before switching to a
   * functional component.)
   */
  const now = Date.now();
  return (
    <div class={`login-page-wrapper${cancelable ? ' fade-up' : ''}`}>
      <h1 class="center-text">Journalize</h1>
      <h4 class="center-text">Private journal entries</h4>
        <div class="login-form-wrapper">
          <form onsubmit={login} class="full-width full-width--all">
            <fieldset>
              <legend>Login</legend>
              <input id="luser" placeholder="username" autocapitalize="off" key={now + 3}/>
              <input id="lpass" type="password" placeholder="password" key={now + 4}/>
              <input type="submit" value="Submit"/>
            </fieldset>
          </form>
          {cancelable &&
            <button class="login-cancel mdl-button full-width" onclick={() => route('/entries')}>
              Cancel
            </button>
          }
        </div>
    </div>
  );
}
