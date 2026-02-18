import { h } from 'preact';
import Dialog from '../dialog';
import Icon from '../icon';
import SwitchAccount from '../switch-account';
import { fire } from '../unifire';
import { route } from '../router';

const onLogout = () => {
  fire('linkstate', {
    key: 'dialogMode',
    cb: setTimeout(() => fire('linkstate', { key: 'dialogMode', val: 'modal:logout' }))
  });
};

function getOtherAccounts (userId) {
  try {
    var accounts = JSON.parse(localStorage.getItem('accounts')) || [];
    return accounts.filter(a => String(a.id) !== String(userId));
  } catch(e) {
    return [];
  }
}

const onSwitch = (userId) => {
  if(getOtherAccounts(userId).length > 0) {
    fire('linkstate', {
      key: 'dialogMode',
      cb: setTimeout(() => fire('linkstate', { key: 'dialogMode', val: 'modal:switch' }))
    });
  } else {
    fire('linkstate', { key: 'dialogMode' });
    route('/switch');
  }
};

const menu = (dark, view, sort, userId) => (
  <ul class={`menu ${dark ? '' : 'dark-fill'}`}>
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
    <li onclick={() => onSwitch(userId)}>
      <Icon icon="people"/>
      <span>Switch</span>
    </li>
    <li onclick={onLogout}>
      <Icon icon="logout"/>
      <span>Logout</span>
    </li>
  </ul>
);

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

export default ({ dialogMode, dark, entry, view, sort, userId }) => {
  if(!dialogMode) return;

  let markup, mode = dialogMode;
  if(dialogMode === 'menu'){
    markup = menu(dark, view, sort, userId);
  } else {
    const modalType = dialogMode.split(':')[1];
    if(modalType === 'switch') {
      markup = <SwitchAccount userId={userId}/>;
      mode = 'modal';
    } else {
      if(modalType === 'delete' && !entry) return;
      const { message, confirmText, onConfirm } = modalOptions(modalType, entry);
      markup = modal(message, confirmText, onConfirm);
      mode = 'modal';
    }
  }

  return (
    <Dialog dialogMode={mode}>
      { markup }
    </Dialog>
  );
};
