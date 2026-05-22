import { h } from 'preact';
import Icon from '../icon';
import { fire } from '../unifire';
import { route } from '../router';
import { getAccounts } from '../../js/utils';

const closeDialog = () => fire('linkstate', { key: 'dialogMode' });

const onLogout = () => {
  closeDialog();
  setTimeout(() => fire('linkstate', { key: 'dialogMode', val: 'modal:logout' }));
};

const onAdd = () => {
  closeDialog();
  route('/switch');
};

const onSwitch = (userId) => {
  var other = getAccounts().find(a => String(a.id) !== String(userId));
  if(!other) return;
  closeDialog();
  fire('switchAccount', String(other.id));
};

export default ({ dialogMode, dark, entry, view, userId, username }) => {
  if(!dialogMode) return;

  let markup, mode = dialogMode;
  if(dialogMode === 'menu'){
    var hasOtherAccount = getAccounts().filter(a => String(a.id) !== String(userId)).length > 0;
    // var notOnEntry = view !== '/entry' && view !== '/new';
    markup = (
      <ul class={`menu ${dark ? '' : 'dark-fill'}`}>
        <li class="menu-username">{username}</li>
        <li onclick={() => fire('toggleDarkMode')}>
          <Icon icon={dark ? 'sun' : 'moon'}/>
          <span>{dark ? 'Light' : 'Dark'}</span>
        </li>
        {/* {notOnEntry &&
          <li onclick={() => fire('toggleSort')}>
            <Icon icon="back" class={sort === 'desc' ? 'rotate90' : 'rotate270'}/>
            <span>{sort === 'desc' ? 'Oldest' : 'Latest'}</span>
          </li>
        } */}
        {/* {notOnEntry &&
          <li onclick={() => fire('exportEntries')}>
            <Icon icon="download"/>
            <span>Export</span>
          </li>
        } */}
        {hasOtherAccount
          ? <li onclick={() => onSwitch(userId)}>
              <Icon icon="people"/>
              <span>Switch</span>
            </li>
          : <li onclick={onAdd}>
              <Icon icon="person-add"/>
              <span>Add</span>
            </li>
        }
        <li onclick={onLogout}>
          <Icon icon="logout"/>
          <span>Logout</span>
        </li>
      </ul>
    );
  } else {
    const isDel = dialogMode.includes('delete');
    if(isDel && !entry) return;
    const message = isDel ? 'Delete this entry?' : 'Logout?';
    const confirmText = isDel ? 'Delete' : 'Logout';
    const onConfirm = isDel
      ? () => fire('deleteEntry', { id: entry.id })
      : () => fire('logout');
    markup = (
      <div>
        <div class="modal-message">{message}</div>
        <div>
          <button class="mdl-button" onclick={closeDialog}>Cancel</button>
          <button class="mdl-button" onclick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    );
    mode = 'modal';
  }

  return (
    <div>
      <div class={`modal-dialog modal-${mode} grow`}>{markup}</div>
      <div class={`modal-overlay modal-${mode} fade-in`} onclick={closeDialog}></div>
    </div>
  );
};
