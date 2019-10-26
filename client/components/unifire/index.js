import { useLayoutEffect, useEffect, useState, useMemo } from 'preact/hooks';
import { removeObjectByIndex } from '../../js/utils';

let EL;
let STATE;
let BEFORE;
let ACTIONS;
const SUBSCRIBERS = [];

export function fire (name, payload, e) {
  ACTIONS[name](EL, payload, e);
};

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useUnifire (keys, checkIfShouldUpdate) {
  const [ blank, setState ] = useState({});

  useIsomorphicLayoutEffect(() => {
    const cb = (changedKeys, before, after) => {
      if(checkIfShouldUpdate){
        if(!checkIfShouldUpdate(before, after)) return;
      }
      const changeInKeys = keys.some(key => changedKeys.includes(key));
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
    return [ data, fire ];
  }, [ blank ])
};

export class Provider {
  // Provider expects props.state to be a Proxy object.
  // The Proxy handles computed properties and local persistence.
  constructor({ state, actions }) {
    EL = this;
    STATE = state;
    ACTIONS = actions;
    this.state = STATE;
  }

  set(delta, cb) {
    // This assignment triggers the state object's proxy trap.
    // Synchronous side effects triggered by the proxy object
    // yield reactive updates to STATE before this.setState runs.
    BEFORE = Object.assign({}, STATE);
    Object.assign(STATE, delta);
    // this.setState(STATE, cb);
    if(cb) cb();

    const changedKeys = [];
    Object.keys(BEFORE).forEach(key => {
      if(BEFORE[key] !== STATE[key]){
        changedKeys.push(key);
      }
    });
    SUBSCRIBERS.forEach(sub => sub(changedKeys, BEFORE, STATE));
  }
}
