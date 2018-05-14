import { h, Component } from 'preact';

import { Router, route } from '../router';
import Header from '../header';
import Login from '../login';
import Entries from '../entries';
import Entry from '../entry';
import Toast from '../toast';

import freedux from '../../js/freedux';
import getInitialState from '../../js/app-state';
import actions from '../../js/actions';
import fire from '../../js/fire';
import handleRouteChange from '../../js/route-handlers';
import swipe from '../../js/swipe';
import arrow from '../../js/arrow';

// Make sure new pages are always scrolled to the top
// while history entries maintain their scroll position.
let { pushState } = history;
history.pushState = (a, b, url) => {
  pushState.call(history, a, b, url);
  scrollTo(0, 0);
};

export default class App extends Component {
  state = getInitialState();
  
  componentWillMount() {
    freedux(this, actions);
    fire('getEntries')();

    // For debugging
    // window.app = this;
    // window.fire = fire;
    // window.state = this.state;
    // window.route = route;
  }

  componentDidMount() {
    swipe.listen(document, 'mousedown touchstart', swipe.swipeStart);
    swipe.listen(document, 'mouseup touchend', swipe.swipeEnd);
    arrow(document);
  }

  componentWillUpdate() {
    fire('getEntries')();
  }

  render(props, state) {
    return (
      <div class={!!state.dark ? 'app dark' : 'app'}>
        <Header
          view={state.view}
          loggedIn={state.loggedIn}
          entry={state.entry}
          filterText={state.filterText}
          showFilterInput={state.showFilterInput}
          dark={state.dark}/>
        <main>
          <Router onChange={handleRouteChange.bind(this)}>
            <Login path="/" loggedIn={state.loggedIn}/>
            <Entries path="/entries"
              scrollPosition={state.scrollPosition}
              loggedIn={state.loggedIn}
              entries={state.viewEntries}/>
            <Entry path="/entry/:id"
              loggedIn={state.loggedIn}
              view={state.view}
              entry={state.entry}
              viewEntries={state.viewEntries}
              entryIndex={state.entryIndex}/>
          </Router>
          <Toast toastConfig={state.toastConfig}/>
        </main>
      </div>
    );
  }
}
