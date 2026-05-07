import { h, Component } from 'preact';
import ScrollViewport from '../virtual-scroll';
import EntryPreview from '../entry-preview';
import { fire } from '../unifire';
import debounce from '../../js/debounce';

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
    return this.props.viewEntries !== np.viewEntries;
  }

  render({ viewEntries = [], scrollPosition, filterText }) {
    if(!viewEntries.length){
      return <h2 class="center-text fade-up entry-text">It's empty in here!</h2>
    }
    document.body.scrollTop = scrollPosition;

    const renderer = (items) => {
      return items.map(entry => <EntryPreview entry={entry} filterText={filterText}/>)
    };

    return (
      <ScrollViewport
        items={viewEntries}
        renderer={renderer}
        rowHeight={83}>
      </ScrollViewport>
    );
  }
}
