import { h, Component } from 'preact';
import Icon from '../icon';
import fire from '../../js/fire';
import copyText from '../../js/copy-text';

export default class EntryPreview extends Component {
  copy = () => {
    copyText(this.props.entry.date + ' ' + this.props.entry.text);
  }

  getText(entry) {
    return entry.previewText || entry.text;
  }

  render({ entry }) {
    const fadeRight = entry.slideIn ? 'fade-right' : '';
    if(fadeRight) setTimeout(fire('removeSlideInProp'), 450);

    return (
      <div class={`entry-preview ${fadeRight}`}>
        <a href={"/entry/" + entry.id}>
          <div class="list-item">
            <div class="first-row">
              <span
                class="entry-link">
                {entry.date}
              </span>
        
            </div>

            <div class="second-row">
              {this.getText(entry)}
            </div>
          </div>
        </a>

        <span class="nav-set right dark-fill entry-preview--icons">
          <Icon icon="copy" key={entry.id + 'copy'} onclick={this.copy}/>
          <Icon icon="delete" key="delete" onclick={fire('linkstate', {key: 'toastConfig', val: {type: 'confirm delete', data: entry.id}})}/>
        </span>
      </div>
    );
  }
}
