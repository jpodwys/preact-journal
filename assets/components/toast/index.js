import { h, Component } from 'preact';
import Icon from '../icon';
import fire from '../../js/fire';

let timeout;

export default class Toast extends Component {
  componentDidUpdate(props) {
    if(timeout) clearTimeout(timeout);
    let config = this.props.toastConfig;
    if(!config) return;
    if(config.type === 'text copied'){
      timeout = setTimeout(function(){
        fire('linkstate', {key: 'toastConfig'})();
      }, 2000);
    }
  }

  handleDeleteEntry = () => {
    fire('deleteEntry', {id: this.props.toastConfig.data})();
    fire('linkstate', {key: 'toastConfig'})();
  }

  handleToggleDarkMode = () => {
    fire('linkstate', {key: 'dark', val: !this.props.toastConfig.data})();
    fire('linkstate', {key: 'toastConfig'})();
  }

  render({toastConfig}) {
    return (
      <toast class={!!toastConfig ? 'show' : ''}>
        {toastConfig && toastConfig.type === 'text copied' &&
          <span class="toast-label">Entry copied to clipboard!</span>
        }
        {toastConfig && toastConfig.type === 'confirm delete' &&
          <div>
            {/* <span class="toast-label left">Delete entry?</span>
            <span class="nav-set right">
              <button class="mdl-button" onclick={this.handleDeleteEntry}>Delete</button>
              <button class="mdl-button" onclick={fire('linkstate', {key: 'toastConfig'})}>Cancel</button>
            </span> */}
            <button class="mdl-button left" onclick={this.handleDeleteEntry}>Delete</button>
            <button class="mdl-button right" onclick={fire('linkstate', {key: 'toastConfig'})}>Cancel</button>
          </div>
        }
        {toastConfig && toastConfig.type === 'menu' &&
          <div>
            <button class="mdl-button left" onclick={fire('logout')}>Logout</button>
            <button class="mdl-button" onclick={this.handleToggleDarkMode}>{toastConfig.data ? 'Light' : 'Dark'}</button>
            <button class="mdl-button right" onclick={fire('linkstate', {key: 'toastConfig'})}>Cancel</button>
          </div>
        }
      </toast>
    );
  }
}
