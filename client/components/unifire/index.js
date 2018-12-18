import { h, Component, cloneElement } from 'preact';

let STATE;
const NAME = 'UNIFIRE';

function listen (el, actions) {
  document.addEventListener(NAME, e => {
    // Array destructuring adds .19kb to the bundle.
    // Doing it the less attractive way for now.
    const d = e.detail;
    actions[d[0]](el, d[1], d[2]);
  });
};

function merge (obj, props) {
  for (let i in props) obj[i] = props[i];
};

export function fire (name, detail) {
  return (e) => {
    const event = new CustomEvent(NAME, { detail: [ name, detail, e ] });
    document.dispatchEvent(event);
  }
};

export class Provider extends Component {
  // Provider expects props.state to be a Proxy object.
  // The Proxy handles computed properties and local persistence.
  constructor(props) {
    super(props);
    STATE = this.props.state;
    this.child = props.children[0];
    listen(this, this.props.actions);
    this.setState(STATE);
  }

  set(delta, cb) {
    merge(STATE, delta);
    this.setState(STATE, cb);
  }

  reset(state) {
    STATE = state;
    this.setState(STATE);
  }

  render() {
    return cloneElement(this.child, STATE);
  }
}
