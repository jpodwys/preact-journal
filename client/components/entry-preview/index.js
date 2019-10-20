import { h } from 'preact';
import Icon from '../icon';
import { fire } from '../unifire';
import copyText from '../../js/copy-text';

const getEntryText = (entry, filterText) => {
  if(!entry.previewText){
    return (
      <div class="second-row">
        {entry.text}
      </div>
    );
  } else {
    const preview = entry.previewText;
    const text = entry.previewText.toLowerCase();
    const query = filterText.toLowerCase();
    const start = text.indexOf(query);
    return (
      <div class="second-row">
        {preview.substr(0, start)}
        <span class="highlight">{preview.substr(start, filterText.length)}</span>
        {preview.substr(start + query.length)}
      </div>
    );
  }
};

export default ({ entry, filterText }) => {
  const favoriteIcon = entry && entry.favorited ? 'star-filled' : 'star-empty';
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

          {getEntryText(entry, filterText)}
        </div>
      </a>

      <span class="nav-set dark-fill entry-preview--icons">
        <Icon icon="delete"
          class="hide-icon"
          key={entry.id + 'delete'}
          onclick={fire('showConfirmDeleteEntryModal', { entry })}/>
        <Icon icon="share"
          class="hide-icon"
          key={entry.id + 'sharre'}
          onclick={() => copyText(entry.date + ' ' + entry.text)}/>
        <Icon icon={favoriteIcon}
          class={entry.favorited ? '' : 'hide-icon'}
          key={entry.id + 'favorite'}
          onclick={fire('toggleFavorite', { id: entry.id, favorited: !entry.favorited })}/>
      </span>
    </div>
  );
}
