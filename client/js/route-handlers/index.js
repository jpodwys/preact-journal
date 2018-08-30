import fire from '../fire';
import { removeObjectByIndex, getViewFromHref } from '../utils';
import { route } from '../../components/router';

export default function handleRouteChange (url) {
  let view = getViewFromHref(url);
  if(view !== '/' && !this.state.loggedIn) route('/', true);
  this.set({view: view});
  handleRoute.call(this, view, url);
  if(this.state.toastConfig) fire('linkstate', {key: 'toastConfig'})();
};

function handleRoute (view, url) {
  switch(view) {
    case '/':         handleLoginView.call(this, url);    break;
    case '/entries':  handleEntriesView.call(this, url);  break;
    case '/entry':    // Fallthrough 
    case '/new':      handleEntryView.call(this, url);    break;
    default:          route('/');                         break;
  }
};

function handleLoginView (url) {
  if(this.state.loggedIn) route('/entries', true);
};

function handleEntriesView (url) {
  if(Array.isArray(this.state.entries)){
    let entry = this.state.entries[0];
    if(entry && entry.newEntry && !entry.text){
      this.set({
        entries: removeObjectByIndex(0, this.state.entries)
      });
    }
  }
};

function handleEntryView (url) {
  if(!url) return;

  let id = url.substr(url.lastIndexOf('/') + 1);
  if(!id) return;

  // This is a brand new entry
  if(id === 'new'){
    fire('newEntry')();
  } else {
    fire('setEntry', {id: id})();
  }
};
