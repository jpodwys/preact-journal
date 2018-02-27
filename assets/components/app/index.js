import { h, Component } from 'preact';
import { Router, route } from 'preact-router';

import Header from '../header';
import Login from '../login';
import Entries from '../entries';
import Entry from '../entry';
import Toast from '../toast';
import FourOhFour from '../four-oh-four';

import freedux from '../../js/freedux';
import getInitialState from '../../js/app-state';
import actions from '../../js/actions';
import fire from '../../js/fire';
import handleRouteChange from '../../js/route-handlers';

export default class App extends Component {
  state = getInitialState();
  
  componentWillMount() {
    freedux(this, actions);
    fire('getEntries')();

    // For debugging
    window.app = this;
    window.route = route;
  }

  componentWillUpdate(nextProps, nextState) {
    fire('getEntries')();
  }

  render(props, { scrollPosition, view, loggedIn, entryIndex, entry, entries, entryReady, viewEntries, filterText, showFilterInput, toastConfig}) {
    return (
      <div>
        <Header view={view} loggedIn={loggedIn} entry={entry} filterText={filterText} showFilterInput={showFilterInput}/>
        <main>
          <Router onChange={handleRouteChange.bind(this)}>
            <Login path="/" loggedIn={loggedIn}/>
            <Entries path="/entries" scrollPosition={scrollPosition} loggedIn={loggedIn} entries={viewEntries}/>
            <Entry path="/entry/:id" view={view} loggedIn={loggedIn} entryIndex={entryIndex} entry={entry} entryReady={entryReady}/>
            <FourOhFour default/>
          </Router>
          <Toast toastConfig={toastConfig}/>
        </main>
      </div>
    );
  }
}
