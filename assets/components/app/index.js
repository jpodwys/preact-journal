import { h, Component } from 'preact';
import { Router, route } from 'preact-router';

// import Header from '../header';
import Login from '../login';
import Entries from '../entries';
import Entry from '../entry';
import NewEntry from '../new-entry';
import FourOhFour from '../four-oh-four';

import freedux from '../../js/freedux';
import appState from '../../js/app-state';
import actions from '../../js/actions';
import fire from '../../js/fire';

var fetched = false;
var findObjectIndexById = function(id, list) {
  return list.map(function(obj){ return obj.id; }).indexOf(id);
};

export default class App extends Component {
  state = appState;
  
  componentWillMount() {
    freedux(this, actions);
    this.fetchData();
    window.app = this;
    window.app.route = route;
  }

  fetchData() {
    if(!this.state.loggedIn) return;
    if(fetched) return;
    fetched = true;
    var timestamp = localStorage.getItem('timestamp');
    if(timestamp){
      fire('syncForUser', {timestamp: timestamp})();
    } else {
      fire('getAllForUser')();
    }
  }

  handleRouteChange = e => {
    var route = e.url.length > 1
      ? e.url.substring(0, e.url.lastIndexOf('/'))
      : e.url;
    this.route = route;
    if(route !== '/entry' && route !== '/' && !this.state.loggedIn) return route('/');
    this.handleRoute(route, e);
  }

  handleRoute(route, e) {
    switch(route) {
      case '/':         this.handleLoginView(e);    break;
      // case '/entries':  this.handleEntriesView(e);  break;
      case '/entry':    this.handleEntryView(e);    break;
    }
  }

  handleLoginView(e) {
    if(this.state.loggedIn) route('/entries');
  }

  // handleEntriesView(e) {}

  handleEntryView = e => {
    var id;
    try { id = e.current.attributes.id; } catch(err) {/*Do nothing*/}
    if(!id) return;

    this.setState({entryId: id});
    fire('setEntry', {id: id})();

    // var state = { entryId: id };
    // if(this.state.entries){
    //   var entryIndex = findObjectIndexById(parseInt(id, 10), this.state.entries);
    //   if(entryIndex > -1){
    //     state.entryIndex = entryIndex;
    //     state.entry = this.state.entries[entryIndex];
    //     state.entryReady = true;
    //   }
    // }
    // this.setState(state);
  }

  render(props, { loggedIn, loading, entryIndex, entry, entries, entryReady }) {
    return (
      <div id="main-wrapper">
        <div id="view-wrapper">
          <main id="main">
            {/* <Header /> */}
            <Router onChange={this.handleRouteChange}>
              <Login path="/" loggedIn={loggedIn} loading={loading}/>
              <Entries path="/entries" loggedIn={loggedIn} loading={loading} entries={entries}/>
              <NewEntry path="/entry/new" loggedIn={loggedIn} loading={loading} />
              <Entry path="/entry/:id" loggedIn={loggedIn} loading={loading} entryIndex={entryIndex} entry={entry} entryReady={entryReady}/>
              <FourOhFour default/>
            </Router>
          </main>
        </div>
      </div>
    );
  }
}
