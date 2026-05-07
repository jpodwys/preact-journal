import { h } from 'preact';

import Router from '../router';
import Header from '../header';
import Login from '../login';
import Entries from '../entries';
import Search from '../search';
import Entry from '../entry';
import DialogWrapper from '../dialog-wrapper';
import { fire } from '../unifire';

export default (props) => {
  return (
    <div>
      <Header {...props}/>
      <main>
        <Router onChange={(url) => fire('handleRouteChange', url)}>
          <Login path="/"/>
          <Login path="/switch" cancelable/>
          <Entries {...props} path="/entries"/>
          <Search {...props} path="/search"/>
          <Entry {...props} path="/entry/:id"/>
        </Router>
      </main>
      <DialogWrapper {...props}/>
    </div>
  );
};
