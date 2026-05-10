import { h, Component } from 'preact';
import ScrollViewport from '../virtual-scroll';
import EntryPreview from '../entry-preview';
import { fire } from '../unifire';
import debounce from '../../js/debounce';
import { ROW_HEIGHT } from '../../js/utils';

export default class Entries extends Component {
  componentDidMount() {
    document.body.onscroll = debounce(() => {
      fire('linkstate', { key: 'scrollPosition', val: document.body.scrollTop });
    }, 50);
  }

  componentWillUnmount() {
    document.body.onscroll = null;
  }

  shouldComponentUpdate(np) {
    return this.props.viewEntries !== np.viewEntries
      || this.props.lastViewedEntryId !== np.lastViewedEntryId;
  }

  render({ viewEntries = [], scrollPosition, filterText, lastViewedEntryId }) {
    if(!viewEntries.length){
      return <h2 class="center-text fade-up entry-text">It's empty in here!</h2>
    }
    document.body.scrollTop = scrollPosition;

    const renderer = (items) => {
      return items.map(entry => (
        <EntryPreview
          key={entry.id}
          entry={entry}
          filterText={filterText}
          justViewed={entry.id === lastViewedEntryId}/>
      ))
    };

    return (
      <ScrollViewport
        items={viewEntries}
        renderer={renderer}
        rowHeight={ROW_HEIGHT}>
      </ScrollViewport>
    );
  }
}
