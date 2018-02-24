import { h, Component } from 'preact';
import Icon from '../Icon';
import fire from '../../js/fire';

let timeout;

export default class Toast extends Component {
  componentDidUpdate(props, state) {
    if(timeout) clearTimeout(timeout);
    let config = this.props.toastConfig;
    if(!config) return;
    if(config.type === 'text copied'){
      timeout = setTimeout(function(){
        fire('linkstate', {key: 'toastConfig'})();
      }, 2000);
    }
  }

  handleDeleteEntry = (e) => {
    fire('deleteEntry', {id: this.props.toastConfig.data})();
    fire('linkstate', {key: 'toastConfig'})();
  }

  render({toastConfig}) {
    return (
      <toast class={!!toastConfig ? 'show' : ''}>
        {toastConfig && toastConfig.type === 'text copied' &&
          <span class="toast-label">Entry copied to clipboard!</span>
        }
        {toastConfig && toastConfig.type === 'confirm delete' &&
          <span>
            <span class="toast-label left">Delete entry?</span>
            <span class="nav-set right">
              <button class="mdl-button" onclick={fire('linkstate', {key: 'toastConfig'})}>Cancel</button>
              <button class="mdl-button" onclick={this.handleDeleteEntry}>Delete</button>
            </span>
          </span>
        }
      </toast>
    );
  }
}
