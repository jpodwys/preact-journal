import { h, Component } from 'preact';
import VirtualList from 'preact-virtual-list';
import EntryPreview from '../entry-preview';
import fire from '../../js/fire';

export default class Entries extends Component {
  componentWillMount = () => {
    fire('getAllForUser')();
  };

  renderRow(entry) {
    return <EntryPreview entry={entry} />
  }

  render({ entries }) {
    return (
      <div style="margin:auto;max-width:850px;font-size:22px;line-height:32px;font-family:'Trebuchet MS', Helvetica, sans-serif
">
        <VirtualList data={entries} rowHeight={105} renderRow={this.renderRow} />
      </div>
    );
  }
}
