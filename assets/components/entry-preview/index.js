import { h, Component } from 'preact';

export default class EntryPreview extends Component {
  render({ entry }) {
    if(entry.deleted || entry.newEntry && !entry.postPending) return '';
    return (
      <div class="list-item">
        <div class="first-row">
          <a
            class="entry-link"
            href={"/entry/" + entry.id}>
            {entry.date}
          </a>

          {/*<span>{ !entry.isPublic ? '🔐' : '🔓' }</span>✖*/}
        </div>

        <div class="second-row">
          <p class="entry-text">
            {/* {entry.text.length > 140 ? entry.text.substr(0, 140) + '...' : entry.text} */}
            {entry.text}
          </p>
        </div>
      </div>
    );
  }
}
