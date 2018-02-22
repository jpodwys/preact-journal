import { h, Component } from 'preact';
import EntryPreview from '../entry-preview';

export default class Entries extends Component {
  render({ entries }) {
    entries = entries || [];
    if(!entries.length){
      return (
        <h2>It's empty in here!</h2>
      );
    }
    return (
      <entry-list>
        {entries.map(entry => <EntryPreview entry={entry}/>)}
      </entry-list>
    );
  }
}
