import { h } from 'preact';
import Dialog from '../dialog';
import { fire } from '../unifire';

const onLogout = e => {
  e.stopPropagation();
  const cb = fire('linkstate', { key: 'dialogMode', val: 'modal:logout' });
  fire('linkstate', { key: 'dialogMode', cb })();
};

const menu = (dark) => (
  <ul>
    <li onclick={fire('toggleDarkMode')}>{dark ? 'Light' : 'Dark'}</li>
    <li onclick={onLogout}>Logout</li>
  </ul>
);

const modal = (message, confirmText, onConfirm) => (
  <div>
    <div class="modal-message">{message}</div>
    <div>
      <button class="mdl-button">Cancel</button>
      <button class="mdl-button" onclick={onConfirm}>{confirmText}</button>
    </div>
  </div>
);

const modalOptions = (modalType, entry) => {
  if(modalType === 'delete'){
    return {
      message: 'Delete this entry?',
      confirmText: 'Delete',
      onConfirm: fire('deleteEntry', { id: entry.id })
    }
  }
  if(modalType === 'logout'){
    return {
      message: 'Logout?',
      confirmText: 'Logout',
      onConfirm: fire('logout')
    }
  }
};

export default ({ dialogMode, dark, entry }) => {
  if(!dialogMode) return;

  let markup;
  if(dialogMode === 'menu'){
    markup = menu(dark);
  } else {
    const modalType = dialogMode.split(':')[1];
    if(modalType === 'delete' && !entry) return;
    const { message, confirmText, onConfirm } = modalOptions(modalType, entry);
    markup = modal(message, confirmText, onConfirm);
  }

  dialogMode = dialogMode.split(':')[0];

  return (
    <Dialog dialogMode={dialogMode}>
      { markup }
    </Dialog>
  );
};
