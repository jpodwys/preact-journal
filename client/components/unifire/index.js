import { h, Component, cloneElement } from 'preact';

let STATE;
const NAME = 'UNIFIRE';

function listen (el, actions) {
  document.addEventListener(NAME, e => {
    // Array destructuring adds .19kb to the bundle.
    // Doing it the less attractive way for now.
    const d = e.detail;
    // This line needs to be here due to how unifre and unit
    // tests currently work.
    if(!actions[d[0]]) return;
    actions[d[0]](el, d[1], d[2]);
  });
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
    window.state = STATE = this.props.state;
    this.child = props.children[0];
    listen(this, this.props.actions);
    this.setState(STATE);
  }

  set(delta, cb) {
    Object.assign(STATE, delta);
    this.setState(STATE, cb);
  }

  render() {
    return cloneElement(this.child, STATE);
  }
}
