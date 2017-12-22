import { h, Component } from 'preact';
import { Router, route } from 'preact-router';

// import Header from '../header';
import Login from '../login';
import Entries from '../entries';
import Entry from '../entry';
import FourOhFour from '../four-oh-four';

import freedux from '../../js/freedux';
import appState from '../../js/app-state';
import actions from '../../js/actions';

export default class App extends Component {
  state = appState;
  
  componentWillMount() {
    window.app = this;
    freedux(this, actions);
  }

  render(props, { loggedIn, loading, entryIndex, entry, entries }) {
    return (
      <div id="main-wrapper">
        <main id="app">
          {/* <Header /> */}
          <Router>
            <Login path="/" loggedIn={loggedIn} loading={loading}/>
            <Entries path="/entries" loggedIn={loggedIn} loading={loading} entries={entries}/>
            <Entry path="/entry/:id" loggedIn={loggedIn} loading={loading} entryIndex={entryIndex} entry={entry}/>
            <FourOhFour default/>
          </Router>
        </main>
      </div>
    );
  }
}
