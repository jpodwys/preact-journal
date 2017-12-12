import { h, Component } from 'preact';
import { Router } from 'preact-router';

// import Header from '../header';
import Login from '../login';
import Entries from '../entries';

import freedux from '../../js/freedux';
import appState from '../../js/app-state';
import actions from '../../js/actions';

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
    this.currentUrl = e.url;
  };

  render(props, { loading, items, entries }) {
    return (
      <div id="app">
        {/* <Header /> */}
        <Router onChange={this.handleRoute}>
          <Login path="/" loading={loading} items={items}/>
          <Entries path="/entries" loading={loading} entries={entries}/>
        </Router>
      </div>
    );
  }
}
