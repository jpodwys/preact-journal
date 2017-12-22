import { h, Component } from 'preact';

export default class EntryPreview extends Component {
  render({ entry }) {
    return (
      <div class="entry-preview">
        <a
          class="entry-link"
          href={"/entry/" + entry.id}>
          {entry.date}
        </a>
        <span>{ !entry.isPublic ? '🔐' : '🔓' }</span>✖
        <p class="entry-text">
          {entry.text.length > 140 ? entry.text.substr(0, 140) + '...' : entry.text}
        </p>
      </div>
    );
  }
}