import { h } from 'preact';
import Icon from '../icon';
import { fire } from '../unifire';
import copyText from '../../js/copy-text';

const copy = ({ date, text }) => copyText(date + ' ' + text);

const getText = ({ previewText, text }) => previewText || text;

export default ({ entry }) => {
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

          <div class="second-row">
            {getText(entry)}
          </div>
        </div>
      </a>

      <span class="nav-set right dark-fill entry-preview--icons">
        <Icon icon="copy" key={entry.id + 'copy'} onclick={() => copy(entry)}/>
        <Icon icon={favoriteIcon} onclick={fire('toggleFavorite', { id: entry.id, favorited: !entry.favorited })}/>
      </span>
    </div>
  );
}
