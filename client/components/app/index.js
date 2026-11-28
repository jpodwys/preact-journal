import { h } from '../../packages/kyvo/core';

import Router from '../router';
import Header from '../header';
import Login from '../login';
import Entries from '../entries';
import Search from '../search';
import Entry from '../entry';
import DialogWrapper from '../dialog-wrapper';
import { handleRouteChange } from '../../js/actions/global-actions';
import shortcuts from '../../js/shortcuts';

export default (props, ctx) => {
  shortcuts(ctx);
  return (
    <div>
      <Header />
      <main>
        <Router onChange={handleRouteChange}>
          <Login path="/"/>
          <Login path="/switch" cancelable/>
          <Entries path="/entries"/>
          <Search path="/search"/>
          <Entry path="/entry/:id"/>
        </Router>
      </main>
      <DialogWrapper />
    </div>
  );
};
