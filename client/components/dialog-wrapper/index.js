import { h, Component } from 'preact';
import Dialog from '../dialog';
import { fire } from '../unifire';

export default class DialogWrapper extends Component {
  handleToggleDarkMode = () => {
    fire('linkstate', {key: 'dark', val: !this.props.dark})();
    fire('linkstate', {key: 'dialogMode'})();
  }

  handleDeleteEntry = () => {
    fire('deleteEntry', { id: this.props.entry.id })();
    fire('linkstate', {key: 'dialogMode'})();
  }

  render({ dialogMode, dark, entry }) {
    if(!dialogMode) return;

    const menu = (
      <ul>
        <li onclick={this.handleToggleDarkMode}>{dark ? 'Light' : 'Dark'}</li>
        <li onclick={fire('logout')}>Logout</li>
      </ul>
    );

    const modal = (
      <div>
        <div class="modal-message">Delete this entry?</div>
        <div>
          <button class="mdl-button" onclick={fire('linkstate', {key: 'dialogMode'})}>Cancel</button>
          <button class="mdl-button" onclick={this.handleDeleteEntry}>Delete</button>
        </div>
      </div>
    );

    let markup;
    if(dialogMode === 'menu'){
      markup = menu;
    } else if (dialogMode === 'modal'){
      markup = modal;
    }

    return (
      <Dialog dialogMode={dialogMode}>
        { markup }
      </Dialog>
    );
  }
};
