import { h, Component } from 'preact';
import ScrollViewport from 'preact-scroll-viewport';
import EntryPreview from '../entry-preview';

export default class Entries extends Component {
  render({ entries }) {
    entries = entries || [];
    if(!entries.length){
      return (
        <h2 class="center-text">It's empty in here!</h2>
      );
    }
    return (
      <ScrollViewport class="list" rowHeight={this.rowHeight}>
        {entries.map(entry => <EntryPreview entry={entry}/>)}
      </ScrollViewport>
    );
  }
}
