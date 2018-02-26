import { h, Component } from 'preact';
import ScrollViewport from 'preact-scroll-viewport';
import EntryPreview from '../entry-preview';
import fire from '../../js/fire';
import debounce from '../../js/debounce';

export default class Entries extends Component {
  componentDidMount() {
    document.body.onscroll = function(){
      debounce(
        fire('linkstate', {key: 'scrollPosition', val: document.body.scrollTop})(),
        200
      );
    }
  }

  render({ entries, scrollPosition }) {
    document.body.scrollTop = scrollPosition;
    entries = entries || [];
    if(!entries.length){
      return (
        <h2 class="center-text">It's empty in here!</h2>
      );
    }
    return (
      <ScrollViewport class="entry-list" rowHeight={64} overscan={20}>
        {entries.map(entry => <EntryPreview entry={entry}/>)}
      </ScrollViewport>
    );
  }
}
