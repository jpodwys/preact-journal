import { h, Component } from 'preact';
import { route } from 'preact-router';
import EntryPreview from '../entry-preview';

export default class Entries extends Component {
  // componentWillMount = () => {
  //   if(!this.props.loggedIn) return route('/');
  // };

  render({ entries }) {
    entries = entries || [];
    return (
      <entry-list>
        {entries.map(entry => <EntryPreview entry={entry}/>)}
      </entry-list>
    );
  }
}
