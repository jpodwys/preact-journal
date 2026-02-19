import { h } from 'preact';
import Dialog from '../dialog';
import Icon from '../icon';
import { fire } from '../unifire';
import { route } from '../router';
import { getAccounts } from '../../js/utils';

const onLogout = () => {
  fire('linkstate', {
    key: 'dialogMode',
    cb: setTimeout(() => fire('linkstate', { key: 'dialogMode', val: 'modal:logout' }))
  });
};

const onAdd = () => {
  fire('linkstate', { key: 'dialogMode' });
  route('/switch');
};

const onSwitch = (userId) => {
  var other = getAccounts().find(a => String(a.id) !== String(userId));
  if(!other) return;
  fire('linkstate', { key: 'dialogMode' });
  fire('switchAccount', String(other.id));
};

const menu = (dark, view, sort, userId, username) => {
  var hasOtherAccount = getAccounts().filter(a => String(a.id) !== String(userId)).length > 0;

  return (
    <ul class={`menu ${dark ? '' : 'dark-fill'}`}>
      <li class="menu-username">{username}</li>
      <li onclick={() => fire('toggleDarkMode')}>
        <Icon icon={dark ? 'sun' : 'moon'}/>
        <span>{dark ? 'Light' : 'Dark'}</span>
      </li>
      {view !== '/entry' && view !== '/new' &&
        <li onclick={() => fire('toggleSort')}>
          <Icon icon="back" class={sort === 'desc' ? 'rotate90' : 'rotate270'}/>
          <span>{sort === 'desc' ? 'Oldest' : 'Latest'}</span>
        </li>
      }
      {view !== '/entry' && view !== '/new' &&
        <li onclick={() => fire('exportEntries')}>
          <Icon icon="download"/>
          <span>Export</span>
        </li>
      }
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
};

const modal = (message, confirmText, onConfirm) => (
  <div>
    <div class="modal-message">{message}</div>
    <div>
      <button class="mdl-button" onclick={() => fire('linkstate', { key: 'dialogMode' })}>Cancel</button>
      <button class="mdl-button" onclick={onConfirm}>{confirmText}</button>
    </div>
  </div>
);

const modalOptions = (modalType, entry) => {
  if(modalType === 'delete'){
    return {
      message: 'Delete this entry?',
      confirmText: 'Delete',
      onConfirm: () => fire('deleteEntry', { id: entry.id })
    }
  }
  if(modalType === 'logout'){
    return {
      message: 'Logout?',
      confirmText: 'Logout',
      onConfirm: () => fire('logout')
    }
  }
};

export default ({ dialogMode, dark, entry, view, sort, userId, username }) => {
  if(!dialogMode) return;

  let markup, mode = dialogMode;
  if(dialogMode === 'menu'){
    markup = menu(dark, view, sort, userId, username);
  } else {
    const modalType = dialogMode.split(':')[1];
    if(modalType === 'delete' && !entry) return;
    const { message, confirmText, onConfirm } = modalOptions(modalType, entry);
    markup = modal(message, confirmText, onConfirm);
    mode = 'modal';
  }

  return (
    <Dialog dialogMode={mode}>
      { markup }
    </Dialog>
  );
};
