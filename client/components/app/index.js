import { h } from 'preact';

import Router from '../router';
import Header from '../header';
import Login from '../login';
import Entries from '../entries';
import Search from '../search';
import Entry from '../entry';
import DialogWrapper from '../dialog-wrapper';
import Toast from '../toast';
import { fire } from '../unifire';

export default (props) => {
  const toast = props.toast ? 'toast' : '';

  return (
    <div class={`app ${toast}`}>
      <Header
        view={props.view}
        loggedIn={props.loggedIn}
        viewEntries={props.viewEntries}
        entry={props.entry}
        filter={props.filter}
        filterText={props.filterText}/>
      <main>
        <Router onChange={fire('handleRouteChange')}>
          <Login path="/"/>
          <Entries path="/entries"
            scrollPosition={props.scrollPosition}
            viewEntries={props.viewEntries}
            filterText={props.filterText}/>
          <Search path="/search"
            filter={props.filter}
            filterText={props.filterText}
            scrollPosition={props.scrollPosition}
            viewEntries={props.viewEntries}/>
          <Entry path="/entry/:id"
            view={props.view}
            entry={props.entry}
            viewEntries={props.viewEntries}
            entryIndex={props.entryIndex}/>
        </Router>
      </main>
      <DialogWrapper
        dark={props.dark}
        entry={props.entry}
        dialogMode={props.dialogMode}/>
      <Toast toast={props.toast}/>
    </div>
  );
};
