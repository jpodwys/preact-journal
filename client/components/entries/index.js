import { h, Component } from 'preact';
import ScrollViewport from 'preact-scroll-viewport';
import EntryPreview from '../entry-preview';
import fire from '../../js/fire';
import debounce from '../../js/debounce';

export default class Entries extends Component {
  componentDidMount() {
    document.body.onscroll = debounce(fire('scrollBody'), 50);
  }

  shouldComponentUpdate(np) {
    let op = this.props;
    return op.viewEntries !== np.viewEntries
      || op.scrollPosition === np.scrollPosition;
  }

  render({ viewEntries, scrollPosition }) {
    document.body.scrollTop = scrollPosition;
    viewEntries = viewEntries || [];
    if(!viewEntries.length){
      return (
        <h2 class="center-text fly">It's empty in here!</h2>
      );
    }
    return (
      <ScrollViewport class="entry-list fly" rowHeight={84} overscan={20}>
        {viewEntries.map(entry => <EntryPreview entry={entry}/>)}
      </ScrollViewport>
    );
  }
}
