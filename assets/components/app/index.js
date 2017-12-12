import { h, Component } from 'preact';
import { Router } from 'preact-router';

// import Header from '../header';
import Login from '../login';
import Entries from '../entries';
import EntryView from '../entry-view';

import freedux from '../../js/freedux';
import appState from '../../js/app-state';
import actions from '../../js/actions';
import fire from '../../js/fire';

export default class App extends Component {
  state = appState;
  
  componentWillMount() {
    freedux(this, actions);
  }

  /** Gets fired when the route changes.
   *  @param {Object} event   "change" event from [preact-router](http://git.io/preact-router)
   *  @param {string} event.url The newly routed URL
   */
  handleRoute = e => {
    // this.currentUrl = e.url;
    if(e && e.current && e.current.attributes && e.current.attributes.id){
      fire('setEntry', {id: e.current.attributes.id})();
    }
  };

  render(props, { loggedIn, loading, entry, entries }) {
    return (
      <div id="app">
        {/* <Header /> */}
        <Router onChange={this.handleRoute}>
          <Login path="/" loading={loading}/>
          <Entries path="/entries" loading={loading} entries={entries}/>
          <EntryView path="/entry/:id" loading={loading} entry={entry}/>
        </Router>
      </div>
    );
  }
}
