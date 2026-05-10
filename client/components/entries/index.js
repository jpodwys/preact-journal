import { h, Component } from 'preact';
import ScrollViewport from '../virtual-scroll';
import EntryPreview from '../entry-preview';

export default class Entries extends Component {
  shouldComponentUpdate(np) {
    return this.props.viewEntries !== np.viewEntries;
  }

  render({ viewEntries = [], filterText }) {
    if(!viewEntries.length){
      return <h2 class="center-text fade-up entry-text">It's empty in here!</h2>
    }

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
