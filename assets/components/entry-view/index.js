import { h, Component } from 'preact';
import fire from '../../js/fire';

export default class EntryView extends Component {
  render({ entry }) {
    return (
      <div>
        {entry.text}
      </div>
    );
  }
}
