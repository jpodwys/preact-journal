import fire from '../fire';
import { removeObjectByIndex } from '../utils';

// Make sure new pages are always scrolled to the top
// while history entries maintain their scroll position.
let { pushState } = history;
history.pushState = (a, b, url) => {
  pushState.call(history, a, b, url);
  scrollTo(0, 0);
};

const handleRouteChange = function({view, url}) {
  // var view = e.url.lastIndexOf('/') > 0
  //   ? e.url.substr(0, e.url.lastIndexOf('/'))
  //   : e.url;
  // if(view !== '/' && !this.state.loggedIn) return route('/');
  // if(~e.url.indexOf('/new')) view = '/new';
  // this.setState({view: view});
  handleRoute.call(this, view, url);
  fire('linkstate', {key: 'toastConfig'})();
};

const handleRoute = function(view, url) {
  switch(view) {
    case '/':         handleLoginView.call(this, url);    break;
    case '/entries':  handleEntriesView.call(this, url);  break;
    case '/entry':    handleEntryView.call(this, url);    break;
    case '/new':      handleEntryView.call(this, url);    break;
  }
};

const handleLoginView = function(url) {
  if(this.state.loggedIn) fire('route', {href: '/entries'});
};

const handleEntriesView = function(url) {
  if(Array.isArray(this.state.entries)){
    var entry = this.state.entries[0];
    if(entry && entry.newEntry && !entry.text){
      this.setState({
        entries: removeObjectByIndex(0, this.state.entries)
      });
    }
  }
};

const handleEntryView = function(url) {
  var id;

  try {
    id = parseInt(url.substr(url.lastIndexOf('/') + 1));
  } catch(err) {/*Do nothing*/}

  if(!id) return;

  // This is a brand new entry
  if(id === 'new'){
    fire('newEntry')();
  } else {
    fire('setEntry', {id: id})();
  }
};

export default handleRouteChange;
