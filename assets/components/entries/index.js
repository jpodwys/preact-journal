import { h, Component } from 'preact';
import EntryPreview from '../entry-preview';

export default class Entries extends Component {
  render({ entries }) {
    entries = entries || [];
    return (
      <entry-list>
        {entries.map(entry => <EntryPreview entry={entry}/>)}
      </entry-list>
    );
  }
}
