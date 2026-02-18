import { h } from 'preact';
import { fire } from '../unifire';

function getAccounts () {
  try {
    return JSON.parse(localStorage.getItem('accounts')) || [];
  } catch(e) {
    return [];
  }
}

const close = () => fire('linkstate', { key: 'dialogMode' });

const onSwitch = (userId) => {
  close();
  fire('switchAccount', String(userId));
};

const prefillUsername = (username) => {
  var input = document.getElementById('suser');
  if(input) input.value = username;
};

const onLogin = (e) => {
  e.preventDefault();
  var username = document.getElementById('suser').value;
  var password = document.getElementById('spass').value;
  close();
  fire('login', { username, password });
};

export default ({ userId }) => {
  var accounts = getAccounts().filter(a => String(a.id) !== String(userId));
  var now = Date.now();

  return (
    <div class="switch-account">
      <div class="modal-message">Switch Account</div>
      {accounts.length > 0 &&
        <ul class="switch-account-list">
          {accounts.map(a => (
            <li key={a.id} onclick={() => a.expired ? prefillUsername(a.username) : onSwitch(a.id)}>
              <button class="mdl-button full-width">
                {a.expired
                  ? <em>{a.username}</em>
                  : a.username
                }
              </button>
            </li>
          ))}
        </ul>
      }
      <form onsubmit={onLogin} class="switch-account-form">
        <div class="modal-message">Add Account</div>
        <input id="suser" placeholder="username" autocapitalize="off" key={now + 1}/>
        <input id="spass" type="password" placeholder="password" key={now + 2}/>
        <input type="submit" value="Login" class="mdl-button"/>
      </form>
      <div>
        <button class="mdl-button" onclick={close}>Cancel</button>
      </div>
    </div>
  );
};
