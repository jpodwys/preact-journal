import { h, Component } from 'preact';
import ScrollViewport from '../virtual-scroll';
import EntryPreview from '../entry-preview';
import ZeroState from '../zero-state';
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
      return <ZeroState/>
    }
    document.body.scrollTop = scrollPosition;

    const renderer = (items) => {
      return items.map(entry => <EntryPreview entry={entry} filterText={filterText}/>)
    };

    return (
      <ScrollViewport
        class="entry-list"
        items={viewEntries}
        renderer={renderer}
        rowHeight={83}
        overscan={20}
        internalClass="fade-down">
      </ScrollViewport>
    );
  }
}
