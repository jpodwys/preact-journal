import { h } from '../../packages/kyvo/core';
import Icon from '../icon';
import { app, selected, loadAccounts } from '../../js/app-state';
import { route } from '../../js/route';
import { toggleDarkMode } from '../../js/actions/global-actions';
import { deleteEntry /* , toggleSort, exportEntries */ } from '../../js/actions/entry-actions';
import { logout, switchAccount } from '../../js/actions/user-actions';

const closeDialog = () => { app.dialogMode = ''; };

const onSwitch = (userId) => {
  var other = loadAccounts().find(a => String(a.id) !== String(userId));
  if(!other) return;
  closeDialog();
  switchAccount(String(other.id));
};

export default () => {
  const { dialogMode, dark, view, /* sort, */ userId, accounts } = app;
  if(!dialogMode) return;
  const [entry] = selected();

  let markup, mode = dialogMode;
  if(dialogMode === 'menu'){
    var hasOtherAccount = loadAccounts().some(a => String(a.id) !== String(userId));
    var notOnEntry = view !== '/entry' && view !== '/new';
    markup = (
      <ul class={`menu ${dark ? '' : 'dark-fill'}`}>
        <li class="menu-username">{accounts.find(a => a.active)?.username}</li>
        <li onclick={toggleDarkMode}>
          <Icon icon={dark ? 'sun' : 'moon'}/>
          <span>{dark ? 'Light' : 'Dark'}</span>
        </li>
        {/* Sort order is switched off to save download size: the list is always newest first. To restore it, search for
          "sort order is switched off" and "toggleSort", and uncomment the code and specs (the CSS has rotate90/270).
        {notOnEntry &&
          <li onclick={toggleSort}>
            <Icon icon="back" class={sort === 'desc' ? 'rotate90' : 'rotate270'}/>
            <span>{sort === 'desc' ? 'Oldest' : 'Latest'}</span>
          </li>
        }
        */}
        {/* Export is switched off to save download size (about 190 B). client/js/export-entries is kept.
          To restore it, uncomment this, its import above, the action in entry-actions, the `download` icon and the specs.
        {notOnEntry &&
          <li onclick={exportEntries}>
            <Icon icon="download"/>
            <span>Export</span>
          </li>
        }
        */}
        {hasOtherAccount
          ? <li onclick={() => onSwitch(userId)}>
              <Icon icon="people"/>
              <span>Switch</span>
            </li>
          : <li onclick={() => { closeDialog(); route('/switch'); }}>
              <Icon icon="person-add"/>
              <span>Add</span>
            </li>
        }
        <li onclick={() => { closeDialog(); setTimeout(() => { app.dialogMode = 'modal:logout'; }); }}>
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
      ? () => deleteEntry({ id: entry.id })
      : logout;
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
