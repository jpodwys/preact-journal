import fire from '../fire';
import { removeObjectByIndex } from '../utils';

// Make sure new pages are always scrolled to the top
// while history entries maintain their scroll position.
let { pushState } = history;
history.pushState = (a, b, url) => {
  pushState.call(history, a, b, url);
  scrollTo(0, 0);
};

export function handleRouteChange(e) {
  var view = e.url.lastIndexOf('/') > 0
    ? e.url.substr(0, e.url.lastIndexOf('/'))
    : e.url;
  if(view !== '/' && !this.state.loggedIn) return route('/');
  if(~e.url.indexOf('/new')) view = '/new';
  this.setState({view: view});
  handleRoute.call(this, view, e);
};

const handleRoute = function(view, e) {
  switch(view) {
    case '/':         handleLoginView.call(this, e);    break;
    case '/entries':  handleEntriesView.call(this, e);  break;
    case '/entry':    handleEntryView.call(this, e);    break;
    case '/new':      handleEntryView.call(this, e);    break;
  }
};

const handleLoginView = function(e) {
  if(this.state.loggedIn) route('/entries');
};

const handleEntriesView = function(e) {
  if(Array.isArray(this.state.entries)){
    var entry = this.state.entries[0];
    if(entry.newEntry && !entry.text){
      this.setState({
        entries: removeObjectByIndex(0, this.state.entries)
      });
    }
  }
};

const handleEntryView = function(e) {
  var id;
  try { id = e.current.attributes.id; } catch(err) {/*Do nothing*/}
  if(!id) return;

  // This is a brand new entry
  if(id === 'new'){
    fire('newEntry')();
  } else {
    fire('setEntry', {id: id})();
  }
};
