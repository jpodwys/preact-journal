import { h, Component } from 'preact';
import { Router, route } from 'preact-router';
import dlv from 'dlv';

// import Header from '../header';
import Login from '../login';
import Entries from '../entries';
import EntryView from '../entry-view';
import FourOhFour from '../four-oh-four';

import freedux from '../../js/freedux';
import appState from '../../js/app-state';
import actions from '../../js/actions';
import fire from '../../js/fire';

export default class App extends Component {
  state = appState;
  
  componentWillMount() {
    freedux(this, actions);
  }

  // handleRouteChange = e => {
  //   var view = e.url.length > 1
  //     ? e.url.substring(0, e.url.lastIndexOf('/'))
  //     : e.url;
  //   this.handleRoute(view, e);
  // }

  // handleRoute(view, e) {
  //   switch(view) {
  //     case '/':         this.handleLoginView(e);    break;
  //     case '/entries':  this.handleEntriesView(e);  break;
  //     case '/entry':    this.handleEntryView(e);    break;
  //   }
  // }

  // handleLoginView(e) {
  //   if(this.state.loggedIn) route('/entries');
  // }

  // handleEntriesView(e) {
  //   if(!this.state.loggedIn) route('/');
  // }

  // handleEntryView(e) {
  //   var id = dlv(e, 'current.attributes.id');
  //   if(id) fire('setEntry', {id: id})();
  // }

  render(props, { loggedIn, loading, entry, entries }) {
    return (
      <div id="app">
        {/* <Header /> */}
        <Router /*onChange={this.handleRouteChange}*/>
          <Login path="/" loggedIn={loggedIn} loading={loading}/>
          <Entries path="/entries" loggedIn={loggedIn} loading={loading} entries={entries}/>
          <EntryView path="/entry/:id" loggedIn={loggedIn} loading={loading} entry={entry}/>
          <FourOhFour default/>
        </Router>
      </div>
    );
  }
}
