import { h, Component, cloneElement } from 'preact';

let EL;
let STATE;
let ACTIONS;

export function fire (name, payload, e) {
  // if(!ACTIONS[name]) return;
  ACTIONS[name](EL, payload, e);
};

export class Provider extends Component {
  // Provider expects props.state to be a Proxy object.
  // The Proxy handles computed properties and local persistence.
  constructor(props) {
    super(props);
    EL = this;
    STATE = this.props.state;
    ACTIONS = this.props.actions;
    this.child = props.children[0];
    this.state = STATE;
  }

  set(delta, cb) {
    // This assignment triggers the state object's proxy trap
    Object.assign(STATE, delta);
    this.setState(STATE, cb);
  }

  render() {
    return cloneElement(this.child, STATE);
  }
}
