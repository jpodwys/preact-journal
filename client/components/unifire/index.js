import { h, Component, cloneElement } from 'preact';

let EL, STATE, ACTIONS;

export const fire = (name, payload, e) => ACTIONS[name](EL, payload, e);

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
    // This assignment triggers the state object's proxy trap.
    // Synchronous side effects triggered by the proxy object
    // yield reactive updates to STATE before this.setState runs.
    Object.assign(STATE, delta);
    this.setState(STATE, cb);
  }

  render() {
    return cloneElement(this.child, STATE);
  }
}
