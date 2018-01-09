import fire from '../fire';

export function handleRouteChange(e) {
  var view = e.url.length > 1
    ? e.url.substr(0, e.url.lastIndexOf('/'))
    : e.url;
  this.view = view;
  if(view !== '/entry' && view !== '/' && !this.state.loggedIn) return route('/');
  handleRoute.call(this, view, e);
}

const handleRoute = function(view, e) {
  switch(view) {
    case '/':         handleLoginView.call(this, e);    break;
    // case '/entries':  handleEntriesView(e);  break;
    case '/entry':    handleEntryView.call(this, e);    break;
  }
}

const handleLoginView = function(e) {
  if(this.state.loggedIn) route('/entries');
}

// handleEntriesView(e) {}

const handleEntryView = function(e) {
  var id;
  try { id = e.current.attributes.id; } catch(err) {/*Do nothing*/}
  if(!id) return;

  this.setState({entryId: id});
  fire('setEntry', {id: id})();
}
