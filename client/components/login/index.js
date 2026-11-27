import { h } from '../../packages/kyvo/core';
import { login } from '../../js/actions/user-actions';
import { route } from '../router';

const onLogin = e => {
  e.preventDefault();
  const form = e.currentTarget.elements;   // the form's own controls, by id
  login({ username: form.luser.value, password: form.lpass.value });
}

export default ({ cancelable, path }) => (
  <div class={`login-page-wrapper${cancelable ? ' fade-up' : ''}`}>
    <h1 class="center-text">Journalize</h1>
    <h4 class="center-text">Private journal entries</h4>
      <div class="login-form-wrapper">
        <form onsubmit={onLogin} class="full-width full-width--all">
          <fieldset>
            <legend>Login</legend>
            {/* Keyed by route: switching between "/" and "/switch" reuses this
                component, and the inputs must not keep the last typed values. */}
            <input id="luser" placeholder="username" autocapitalize="off" key={path + 'u'}/>
            <input id="lpass" type="password" placeholder="password" key={path + 'p'}/>
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
