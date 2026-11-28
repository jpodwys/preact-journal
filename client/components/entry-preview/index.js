import { h } from '../../packages/kyvo/core';
import Icon from '../icon';
import { showConfirmDeleteEntryModal, toggleFavorite } from '../../js/actions/entry-actions';

const getEntryText = (entry, filterText) => {
  const { previewText: p, text } = entry, start = p && p.toLowerCase().indexOf(filterText.toLowerCase());
  return (
    <div class="second-row">
      {p ? [p.substr(0, start), <span class="highlight">{p.substr(start, filterText.length)}</span>, p.substr(start + filterText.length)] : text}
    </div>
  );
};

export default ({ entry, filterText, fresh }) => {
  const favoriteIcon = entry && entry.favorited ? 'star-filled' : 'star-empty';
  const fadeRight = fresh ? 'fade-right' : '';

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
          role="button"
          aria-label="Delete entry"
          onclick={() => showConfirmDeleteEntryModal({ entry })}/>
        {navigator.share && <Icon icon="share"
          class="hide-icon"
          key={entry.id + 'sharre'}
          role="button"
          aria-label="Share entry"
          onclick={() => navigator.share({ text: entry.date + ' ' + entry.text })}/>}
        <Icon icon={favoriteIcon}
          class={entry.favorited ? '' : 'hide-icon'}
          key={entry.id + 'favorite'}
          role="button"
          aria-label="Toggle favorite"
          onclick={() => toggleFavorite({ id: entry.id, favorited: !entry.favorited })}/>
      </span>
    </div>
  );
}
