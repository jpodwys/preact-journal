export default function persist(el, state, cb) {
  el.setState(state, cb);
  if(state.setEntries){
    localStorage.setItem('entries', JSON.stringify(state.setEntries));
  }
}
