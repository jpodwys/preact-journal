import { h, Component } from 'preact';
import { route } from 'preact-router';
import EntryPreview from '../entry-preview';
import fire from '../../js/fire';

export default class Entries extends Component {
  componentWillMount = () => {
    if(!this.props.loggedIn) return route('/');
    fire('getAllForUser')();
  };

  renderRow(entry) {
    return (
      <div class="entry-preview">
        <a class="entry-link" href={"/entry/" + entry.id}>{entry.date}</a>
        <p class="entry-text">{entry.text.substr(0, 140)}</p>
      </div>
    );
  }

  render({ entries }) {
    return (
      <entry-list>
        {entries.map(this.renderRow)}
      </entry-list>
    );
  }
}
