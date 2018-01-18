export default function persist(el, state, cb) {
  el.setState(state, cb);
  if(state.entries){
    localStorage.setItem(JSON.stringify(state.entries));
  }
}
