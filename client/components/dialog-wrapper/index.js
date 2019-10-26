import { h } from 'preact';
import { memo } from 'preact/compat';
import Dialog from '../dialog';
import { fire, useUnifire } from '../unifire';

const onLogout = () => {
  fire('linkstate', {
    key: 'dialogMode',
    cb: setTimeout(() => fire('linkstate', { key: 'dialogMode', val: 'modal:logout' }))
  });
};

const menu = (dark) => (
  <ul>
    <li onclick={() => fire('toggleDarkMode')}>{dark ? 'Light' : 'Dark'}</li>
    <li onclick={onLogout}>Logout</li>
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

const shouldUpdate = (prev, next) => prev.dialogMode !== next.dialogMode;

const DialogWrapper = () => {
  console.log('Render:dialog-wrapper');
  const [{ dialogMode, dark, entry }] = useUnifire([ 'dialogMode', 'dark', 'entry' ], shouldUpdate);
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

  const mode = dialogMode.split(':')[0];

  return (
    <Dialog dialogMode={mode}>
      { markup }
    </Dialog>
  );
};

export default memo(DialogWrapper);
