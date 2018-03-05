import fire from '../fire';
import { removeObjectByIndex, getViewFromHref } from '../utils';
import { route } from '../../components/router';

const handleRouteChange = function(url) {
  let view = getViewFromHref(url);
  if(view !== '/' && !this.state.loggedIn) return fire('route', {href: '/'});
  this.setState({view: view});
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
  if(this.state.loggedIn) route('/entries');
};

const handleEntriesView = function(url) {
  if(Array.isArray(this.state.entries)){
    let entry = this.state.entries[0];
    if(entry && entry.newEntry && !entry.text){
      this.setState({
        entries: removeObjectByIndex(0, this.state.entries)
      });
    }
  }
};

const handleEntryView = function(url) {
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

export default handleRouteChange;
