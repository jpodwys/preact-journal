import { h } from 'preact';

import Router from '../router';
import Header from '../header';
import Login from '../login';
import Entries from '../entries';
import Search from '../search';
import Entry from '../entry';
import DialogWrapper from '../dialog-wrapper';
import Toast from '../toast';
import { fire, useUnifire } from '../unifire';

export default () => {
  const [{ toast }] = useUnifire([ 'toast' ]);
  const toastClass = toast ? 'toast' : '';

  return (
    <div class={`app ${toastClass}`}>
      <Header/>
      <main>
        <Router onChange={(url) => fire('handleRouteChange', url)}>
          <Login path="/"/>
          <Entries path="/entries"/>
          <Search path="/search"/>
          <Entry path="/entry/:id"/>
        </Router>
      </main>
      <DialogWrapper/>
      <Toast/>
    </div>
  );
};
