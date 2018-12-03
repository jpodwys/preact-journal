import { h, Component } from 'preact';
import { fire } from '../unifire';

let timeout;

export default class Toast extends Component {
  componentDidUpdate() {
    if(timeout) clearTimeout(timeout);
    let config = this.props.config;
    if(!config) return;
    if(config.type === 'text copied'){
      timeout = setTimeout(function(){
        fire('linkstate', {key: 'toastConfig'})();
      }, 2000);
    }
  }

  handleDeleteEntry = () => {
    fire('deleteEntry', {id: this.props.config.data})();
    fire('linkstate', {key: 'toastConfig'})();
  }

  handleToggleDarkMode = () => {
    fire('linkstate', {key: 'dark', val: !this.props.config.data})();
    fire('linkstate', {key: 'toastConfig'})();
  }

  render({config}) {
    return (
      <toast class={!!config ? 'show' : ''}>
        {config && config.type === 'text copied' &&
          <span class="toast-label">Entry copied to clipboard!</span>
        }
        {config && config.type === 'confirm delete' &&
          <div>
            <button class="mdl-button left" onclick={this.handleDeleteEntry}>Delete</button>
            <button class="mdl-button right" onclick={fire('linkstate', {key: 'toastConfig'})}>Cancel</button>
          </div>
        }
        {config && config.type === 'menu' &&
          <div>
            <button class="mdl-button left" onclick={fire('logout')}>Logout</button>
            <button class="mdl-button" onclick={this.handleToggleDarkMode}>{config.data ? 'Light' : 'Dark'}</button>
            <button class="mdl-button right" onclick={fire('linkstate', {key: 'toastConfig'})}>Cancel</button>
          </div>
        }
      </toast>
    );
  }
}
