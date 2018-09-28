import { h, Component } from 'preact';
import ScrollViewport from 'preact-scroll-viewport';
import EntryPreview from '../entry-preview';
import fire from '../../js/fire';
import debounce from '../../js/debounce';

export default class Entries extends Component {
  componentDidMount() {
    document.body.onscroll = debounce(() => {
      fire('linkstate', {key: 'scrollPosition', val: document.body.scrollTop})();
    }, 50);
    setTimeout(fire('removeSlideInProp'), 500);
  }

  componentWillUnmount() {
    document.body.onscroll = null;
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
        <h2 class="center-text fade-up">It's empty in here!</h2>
      );
    }
    return (
      <ScrollViewport class="entry-list fade-down" rowHeight={84} overscan={20}>
        {viewEntries.map(entry => <EntryPreview entry={entry}/>)}
      </ScrollViewport>
    );
  }
}
