import { h, Component } from 'preact';
// import { Router, route } from 'preact-router';

import Switch from '../switch';
import Header from '../header';
import Login from '../login';
import Entries from '../entries';
import Entry from '../entry';
import Toast from '../toast';
import FourOhFour from '../four-oh-four';

import freedux from '../../js/freedux';
import getInitialState from '../../js/app-state';
import Router from '../../js/actions/router-actions';
import actions from '../../js/actions';
import fire from '../../js/fire';
import handleRouteChange from '../../js/route-handlers';

export default class App extends Component {
  state = getInitialState();
  
  componentWillMount() {
    let router = Router(handleRouteChange.bind(this));
    freedux(this, Object.assign(actions, router));
    fire('getEntries')();

    // For debugging
    window.app = this;
    // window.route = route;
  }

  componentWillUpdate(nextProps, nextState) {
    fire('getEntries')();
  }

  render(props, state) {
    return (
      <div>
        <Header
          view={state.view}
          loggedIn={state.loggedIn}
          entry={state.entry}
          filterText={state.filterText}
          showFilterInput={state.showFilterInput}/>
        <main>
          <Switch caseProp={'path'} caseVal={state.view}>
            <Login path="/" loggedIn={state.loggedIn}/>
            <Entries path="/entries"
              scrollPosition={state.scrollPosition}
              loggedIn={state.loggedIn}
              entries={state.viewEntries}/>
            <Entry path="/entry||/new"
              view={state.view}
              loggedIn={state.loggedIn}
              entryIndex={state.entryIndex}
              entry={state.entry} 
              entryReady={state.entryReady}/>
          </Switch>
          <Toast toastConfig={state.toastConfig}/>
        </main>
      </div>
    );
  }
}
