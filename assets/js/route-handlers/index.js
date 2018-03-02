import fire from '../fire';
import { removeObjectByIndex } from '../utils';
import { route } from '../../components/router';

const handleRouteChange = function(url) {
  var view = url.lastIndexOf('/') > 0
    ? url.substr(0, url.lastIndexOf('/'))
    : url;
  if(view !== '/' && !this.state.loggedIn) return fire('route', {href: '/'});
  if(~url.indexOf('/new')) view = '/new';
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
