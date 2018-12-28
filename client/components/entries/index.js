import { h, Component } from 'preact';
import ScrollViewport from 'preact-scroll-viewport';
import EntryPreview from '../entry-preview';
import { fire } from '../unifire';
import debounce from '../../js/debounce';

export default class Entries extends Component {
  componentDidMount() {
    document.body.onscroll = debounce(() => {
      fire('linkstate', { key: 'scrollPosition', val: document.body.scrollTop })();
    }, 50);
  }
  
  componentWillUnmount() {
    document.body.onscroll = null;
  }

  /**
   * Only render if viewEntries has changed
   * or if scroll position has not changed.
   * The scroll position condition is
   * necessary becasue app.js wraps pushState
   * so that it scrolls each pushState to the
   * top of the screen. However, I don't want
   * that to happen when navigating to /entries.
   */
  shouldComponentUpdate(np) {
    const op = this.props;
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
      <ScrollViewport class="entry-list fade-down" rowHeight={83} overscan={20}>
        {viewEntries.map(entry => <EntryPreview entry={entry}/>)}
      </ScrollViewport>
    );
  }
}
