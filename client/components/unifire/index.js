import { h, Component, cloneElement } from 'preact';

let STATE;

function listen (el, actions) {
  Object.keys(actions).forEach(action => {
    document.addEventListener(action, (e) => {
      actions[action](el, e.detail[0], e.detail[1]);
    });
  });
};

function merge (obj, props) {
  for (let i in props) obj[i] = props[i];
  return obj;
};

export function fire (name, detail) {
	return (e) => {
	  const event = new CustomEvent(name, { detail: [ detail, e ] });
	  document.dispatchEvent(event);
	}
};

export class Provider extends Component {
  constructor(props) {
    super(props);
    this.state = {};
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
