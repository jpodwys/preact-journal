import { h } from 'preact';

import Router from '../router';
import Header from '../header';
import Login from '../login';
import Entries from '../entries';
import Entry from '../entry';
import Toast from '../toast';
import { fire } from '../unifire';

export default (props) => {
  const dark = props.dark ? 'dark' : '';
  const toast = props.toastConfig ? 'toast' : '';

  return (
    <div class={`app ${dark} ${toast}`}>
      <Header
        view={props.view}
        prevView={props.prevView}
        loggedIn={props.loggedIn}
        viewEntries={props.viewEntries}
        entry={props.entry}
        filter={props.filter}
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
};
