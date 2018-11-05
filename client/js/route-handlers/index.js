import fire from '../fire';
import { removeObjectByIndex, getViewFromPathname } from '../utils';
import { route } from '../../components/router';

export default function handleRouteChange (url) {
  let view = getViewFromPathname(url);
  if(view !== '/' && !this.state.loggedIn) return route('/', true);
  this.set({ view });
  handleRoute.call(this, view, url);
  if(this.state.toastConfig) fire('linkstate', { key: 'toastConfig' })();
};

function handleRoute (view, url) {
  switch(view) {
    case '/':         handleLoginView.call(this);       break;
    case '/entries':  handleEntriesView.call(this);     break;
    case '/entry':    // Fallthrough 
    case '/new':      handleEntryView.call(this, url);  break;
    default:          route('/');                       break;
  }
};

function handleLoginView () {
  if(this.state.loggedIn) route('/entries', true);
};

function handleEntriesView () {
  if(Array.isArray(this.state.entries)){
    const entry = this.state.entries[0];
    if(entry && entry.newEntry && !entry.text){
      this.set({
        entries: removeObjectByIndex(0, this.state.entries)
      });
    }
  }
};

function handleEntryView (url) {
  const id = url.substr(url.lastIndexOf('/') + 1);
  if(id === 'new'){
    fire('newEntry')();
  } else {
    fire('setEntry', { id })();
  }
};
