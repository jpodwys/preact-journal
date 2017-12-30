import { h, Component } from 'preact';
import { route } from 'preact-router';
import EntryPreview from '../entry-preview';
import fire from '../../js/fire';
var fetched = false;

export default class Entries extends Component {
  componentWillMount = () => {
    if(!this.props.loggedIn) return route('/');
    if(fetched) return;
    var timestamp = localStorage.getItem('timestamp');
    if(timestamp){
      fire('syncForUser', {timestamp: timestamp})();
    } else {
      fire('getAllForUser')();
    }
    fetched = true;
  };

  render({ entries }) {
    return (
      <entry-list>
        {entries.map(entry => <EntryPreview entry={entry}/>)}
      </entry-list>
    );
  }
}
