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
    return (
      <div class="entry-preview">
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
          {entry.favorited === 1 &&
            <Icon icon="star-filled" key={entry.id + 'star'} onclick={fire('toggleFavorite', {id: entry.id, favorited: entry.favorited})}/>
          }
          {entry.favorited === 0 &&
            <Icon icon="star-empty" key={entry.id + 'star'} onclick={fire('toggleFavorite', {id: entry.id, favorited: entry.favorited})}/>
          }
          {/* <Icon icon="delete" key="delete" onclick={fire('linkstate', {key: 'toastConfig', val: {type: 'confirm delete', data: entry.id}})}/> */}
        </span>
      </div>
    );
  }
}
