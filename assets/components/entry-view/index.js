import { h, Component } from 'preact';
import fire from '../../js/fire';
import FourOhFour from '../four-oh-four';

export default class EntryView extends Component {
  componentWillMount() {
    if(this.props.id) fire('setEntry', {id: this.props.id})();
  }

  render({ entry }) {
    if(!entry) return <FourOhFour/>
    return (
      <entry-view>
        <h1>
          {entry.date}
        </h1>
        <pre class="entry-text">{entry.text}</pre>
      </entry-view>
    );
  }
}
