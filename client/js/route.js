import { store } from '../packages/kyvo/core';

// Make sure new pages are always scrolled to the top
// while history entries maintain their scroll position.
const { pushState } = history;
history.pushState = (a, b, url) => {
  pushState.call(history, a, b, url);
  scrollTo(0, 0);
};

// `location` IS the router state: the Router renders from location.pathname, so there is
// nothing to keep in sync. This store exists only so that a navigation re-renders the app.
export const nav = store({ n: 0 });

let listener;
export const onRoute = fn => { listener = fn; };
export const notify = url => listener && listener(url);

export const route = (url, replace) => {
  notify(url);
  history[replace ? 'replaceState' : 'pushState'](null, null, url);
  nav.n++;
};
