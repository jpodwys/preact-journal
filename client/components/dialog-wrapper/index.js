import { h } from 'preact';
import Dialog from '../dialog';
import Icon from '../icon';
import { fire } from '../unifire';

const onLogout = () => {
  fire('linkstate', {
    key: 'dialogMode',
    cb: setTimeout(() => fire('linkstate', { key: 'dialogMode', val: 'modal:logout' }))
  });
};

const menu = (dark, sort) => (
  <ul class="search-suggestions dark-fill">
    <li onclick={() => fire('toggleDarkMode')}>
      <Icon icon={dark ? 'sun' : 'moon'}/>
      <span>{dark ? 'Light' : 'Dark'}</span>
    </li>
    <li onclick={() => fire('toggleSort')}>
      <Icon icon="back" class={sort === 'desc' ? 'rotate90' : 'rotate270'}/>
      <span>{sort === 'desc' ? 'Ascending' : 'Descending'}</span>
    </li>
    <li onclick={() => fire('exportEntries')}>
      <Icon icon="download"/>
      <span>Export</span>
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

export default ({ dialogMode, dark, entry, sort }) => {
  if(!dialogMode) return;

  let markup;
  if(dialogMode === 'menu'){
    markup = menu(dark, sort);
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
