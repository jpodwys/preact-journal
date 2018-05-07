import { h, Component } from 'preact';
import ScrollViewport from 'preact-scroll-viewport';
import Transition from '../transition';
import EntryPreview from '../entry-preview';
import fire from '../../js/fire';
import debounce from '../../js/debounce';

export default class Entries extends Component {
  componentDidMount() {
    document.body.onscroll = debounce(fire('scrollBody'), 50);
  }

  shouldComponentUpdate(np) {
    let op = this.props;
    return op.entries !== np.entries
      || op.scrollPosition === np.scrollPosition;
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
      <Transition className="fly">
        <ScrollViewport class="entry-list" rowHeight={84} overscan={20}>
          {entries.map(entry => <EntryPreview entry={entry}/>)}
        </ScrollViewport>
      </Transition>
    );
  }
}
