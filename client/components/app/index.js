import { h, Component } from 'preact';

import Router from '../router';
import Header from '../header';
import Login from '../login';
import Entries from '../entries';
import Entry from '../entry';
import Toast from '../toast';
import { fire } from '../unifire';

import swipe from '../../js/swipe';
import arrow from '../../js/arrow';

// Make sure new pages are always scrolled to the top
// while history entries maintain their scroll position.
const { pushState } = history;
history.pushState = (a, b, url) => {
  pushState.call(history, a, b, url);
  scrollTo(0, 0);
};

export default class App extends Component {
  componentDidMount() {
    swipe.listen(document, 'mousedown touchstart', swipe.swipeStart);
    swipe.listen(document, 'mouseup touchend', swipe.swipeEnd);
    arrow(document);
  }

  componentWillUpdate() {
    // THIS SEEMS WASTEFUL. I ONLY NEED THIS WHEN STATE.LOGGEDIN CHANGES.
    fire('getEntries')();
  }

  render(props) {
    const dark = props.dark ? 'dark' : '';
    const toast = props.toastConfig ? 'toast' : '';
    
    return (
      <div class={`app ${dark} ${toast}`}>
        <Header
          view={props.view}
          loggedIn={props.loggedIn}
          viewEntries={props.viewEntries}
          entry={props.entry}
          filterText={props.filterText}
          showFilterInput={props.showFilterInput}
          dark={props.dark}/>
        <main>
          <Router onChange={fire('handleRouteChange')}>
            <Login path="/"/>
            <Entries path="/entries"
              scrollPosition={props.scrollPosition}
              viewEntries={props.viewEntries}/>
            <Entry path="/entry/:id"
              view={props.view}
              entry={props.entry}
              viewEntries={props.viewEntries}
              entryIndex={props.entryIndex}/>
          </Router>
          <Toast config={props.toastConfig}/>
        </main>
      </div>
    );
  }
}
