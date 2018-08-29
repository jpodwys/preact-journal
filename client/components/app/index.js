import { h, Component } from 'preact';

import Router from '../router';
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
import { merge } from '../../js/utils';

// Make sure new pages are always scrolled to the top
// while history entries maintain their scroll position.
let { pushState } = history;
history.pushState = (a, b, url) => {
  pushState.call(history, a, b, url);
  scrollTo(0, 0);
};

export default class App extends Component {
  realState = this.state = getInitialState();
  
  componentWillMount() {
    freedux(this, actions);
    fire('getEntries')();
    // window.app = this;
  }

  componentDidMount() {
    swipe.listen(document, 'mousedown touchstart', swipe.swipeStart);
    swipe.listen(document, 'mouseup touchend', swipe.swipeEnd);
    arrow(document);
  }

  componentWillUpdate() {
    fire('getEntries')();
  }

  set(delta, cb) {
    merge(this.realState, delta);
    this.setState(this.realState, cb);
    this.state = this.realState;
  }

  render(props, state) {
    const dark = state.dark ? 'dark' : '';
    const toast = state.toastConfig ? 'toast' : '';
    
    return (
      <div class={`app ${dark} ${toast}`}>
        <Header
          view={state.view}
          loggedIn={state.loggedIn}
          viewEntries={state.viewEntries}
          entry={state.entry}
          filterText={state.filterText}
          showFilterInput={state.showFilterInput}
          dark={state.dark}/>
        <main>
          <Router onChange={handleRouteChange.bind(this)}>
            <Login path="/"/>
            <Entries path="/entries"
              scrollPosition={state.scrollPosition}
              entries={state.viewEntries}/>
            <Entry path="/entry/:id"
              view={state.view}
              entry={state.entry}
              viewEntries={state.viewEntries}
              entryIndex={state.entryIndex}/>
          </Router>
          <Toast config={state.toastConfig}/>
        </main>
      </div>
    );
  }
}
