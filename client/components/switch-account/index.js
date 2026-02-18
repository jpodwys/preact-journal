import { h } from 'preact';
import { fire } from '../unifire';
import { route } from '../router';
import { getAccounts } from '../../js/utils';

const close = () => fire('linkstate', { key: 'dialogMode' });

const onSwitch = (userId) => {
  close();
  fire('switchAccount', String(userId));
};

const onLogin = () => {
  close();
  route('/switch');
};

export default ({ userId }) => {
  var accounts = getAccounts().filter(a => String(a.id) !== String(userId));

  return (
    <div class="switch-account">
      <div class="modal-message">Switch Account</div>
      {accounts.length > 0 &&
        <ul class="switch-account-list">
          {accounts.map(a => (
            <div key={a.id} onclick={() => onSwitch(a.id)}>
              <button class="mdl-button full-width">
                {a.username}
              </button>
            </div>
          ))}
        </ul>
      }
      <div>
        <button class="mdl-button" onclick={onLogin}>Login</button>
        <button class="mdl-button" onclick={close}>Cancel</button>
      </div>
    </div>
  );
};
