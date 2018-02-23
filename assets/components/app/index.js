import { h, Component } from 'preact';
import { Router, route } from 'preact-router';

import Header from '../header';
import Login from '../login';
import Entries from '../entries';
import Entry from '../entry';
import FourOhFour from '../four-oh-four';

import freedux from '../../js/freedux';
import { getInitialState, getDeferredState } from '../../js/app-state';
import actions from '../../js/actions';
import fire from '../../js/fire';
import handleRouteChange from '../../js/route-handlers';
import persist from '../../js/persist';
let done = false;

export default class App extends Component {
  state = getInitialState();
  
  componentWillMount() {
    freedux(this, actions);
    fire('getEntries')();

    if(this.state.loggedIn && !done){
      let moreEntries = getDeferredState();
      if(moreEntries){
        persist(this, {entries: this.state.entries.concat(moreEntries)});
        done = true;
      }
    }

    // For debugging
    window.app = this;
    window.route = route;
  }

  componentWillUpdate(nextProps, nextState) {
    fire('getEntries')();
  }

  render(props, { view, loggedIn, loading, entryIndex, entry, entries, entryReady, viewEntries, filterText, showFilterInput, entryTextCopied }) {
    return (
      <div>
        <Header view={view} loggedIn={loggedIn} entry={entry} filterText={filterText} showFilterInput={showFilterInput} entryTextCopied={entryTextCopied}/>
        <main>
          <Router onChange={handleRouteChange.bind(this)}>
            <Login path="/" loggedIn={loggedIn} loading={loading}/>
            <Entries path="/entries" loggedIn={loggedIn} loading={loading} entries={viewEntries}/>
            <Entry path="/entry/:id" view={view} loggedIn={loggedIn} loading={loading} entryIndex={entryIndex} entry={entry} entryReady={entryReady}/>
            <FourOhFour default/>
          </Router>
        </main>
      </div>
    );
  }
}
