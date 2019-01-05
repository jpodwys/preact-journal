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

  render({config}) {
    return (
      <toast class={!!config ? 'show' : ''}>
        {config && config.type === 'text copied' &&
          <span class="toast-label">Entry copied to clipboard!</span>
        }
      </toast>
    );
  }
}
