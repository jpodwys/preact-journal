import { h, Component, cloneElement, toChildArray } from 'preact';
import { useLayoutEffect, useEffect, useState, useMemo } from 'preact/hooks';
import { removeObjectByIndex } from '../../js/utils';

let EL;
let STATE;
let ACTIONS;
const SUBSCRIBERS = [];

export function fire (name, payload, e) {
  ACTIONS[name](EL, payload, e);
};

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useUnifire (...keys) {
  const [ blank, setState ] = useState({});

  useIsomorphicLayoutEffect(() => {
    const cb = changed => {
      const changeInKeys = keys.some(key => changed.includes(key));
      if (changeInKeys) setState({});
    }
    SUBSCRIBERS.push(cb);
    return () => {
      const index = SUBSCRIBERS.indexOf(cb);
      if(index > -1) removeObjectByIndex(index, SUBSCRIBERS);
    }
  }, [])

  return useMemo(() => {
    const data = {};
    keys.forEach(key => data[key] = STATE[key]);
    return [ fire, data ];
  }, [ blank ])
};

export class Provider extends Component {
  // Provider expects props.state to be a Proxy object.
  // The Proxy handles computed properties and local persistence.
  constructor(props) {
    super(props);
    EL = this;
    STATE = this.props.state;
    ACTIONS = this.props.actions;
    this.child = toChildArray(props.children)[0];
    this.state = STATE;
  }

  set(delta, cb) {
    // This assignment triggers the state object's proxy trap.
    // Synchronous side effects triggered by the proxy object
    // yield reactive updates to STATE before this.setState runs.
    const before = Object.assign({}, STATE);
    Object.assign(STATE, delta);
    // this.setState(STATE, cb);
    if(cb) cb();

    const changed = [];
    Object.keys(before).forEach(key => {
      if(before[key] !== STATE[key]){
        changed.push(key);
      }
    });
    SUBSCRIBERS.forEach(sub => sub(changed));
    console.log('Subscriber count', SUBSCRIBERS.length);
  }

  render() {
    return cloneElement(this.child, STATE);
  }
}
