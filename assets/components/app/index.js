import { h, Component } from 'preact';
import { Router, route } from 'preact-router';

import Header from '../header';
import Login from '../login';
import Entries from '../entries';
import Entry from '../entry';
// import NewEntry from '../new-entry';
import FourOhFour from '../four-oh-four';

import freedux from '../../js/freedux';
import setInitialState from '../../js/app-state';
import actions from '../../js/actions';
import fire from '../../js/fire';
import { handleRouteChange } from '../../js/route-handlers';

var fetched = false;

export default class App extends Component {
  state = setInitialState();
  // constructor(props) {
  //   super(props);
  //   this.state = setInitialState();
  // }
  
  componentWillMount() {
    freedux(this, actions);
    fire('fetchData')();

    //For debugging
    window.app = this;
    window.route = route;
  }

  componentWillUpdate(nextProps, nextState) {
    fire('fetchData')();
  }

  render(props, { loggedIn, loading, entryIndex, entry, entries, entryReady }) {
    return (
      <div id="main-wrapper">
        <div id="view-wrapper">
          <main id="main">
            <Header />
            <Router onChange={handleRouteChange.bind(this)}>
              <Login path="/" loggedIn={loggedIn} loading={loading}/>
              <Entries path="/entries" loggedIn={loggedIn} loading={loading} entries={entries}/>
              {/* <NewEntry path="/entry/new" loggedIn={loggedIn} loading={loading} /> */}
              <Entry path="/entry/:id" loggedIn={loggedIn} loading={loading} entryIndex={entryIndex} entry={entry} entryReady={entryReady}/>
              <FourOhFour default/>
            </Router>
          </main>
        </div>
      </div>
    );
  }
}
