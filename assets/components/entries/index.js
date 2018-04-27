import { h, Component } from 'preact';
import ScrollViewport from 'preact-scroll-viewport';
import EntryPreview from '../entry-preview';
import fire from '../../js/fire';
import debounce from '../../js/debounce';

export default class Entries extends Component {
  shouldComponentUpdate(np) {
    let op = this.props;
    return op.entries !== np.entries
      || op.scrollPosition === np.scrollPosition;
  }

  render({ entry, entries, scrollPosition }) {
    document.body.scrollTop = scrollPosition;
    entries = entries || [];
    if(!entries.length){
      return (
        <h2 class="center-text">It's empty in here!</h2>
      );
    }
    return (
      <ScrollViewport class="entry-list" rowHeight={84} overscan={20}>
        {entries.map(currentEntry => <EntryPreview entry={currentEntry} activeEntry={entry}/>)}
      </ScrollViewport>
    );
  }
}
