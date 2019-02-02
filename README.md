# preact-journal

14k offline-capable journaling PWA using preact, node, MySQL, and IndexedDB.

[![Build Status](https://travis-ci.org/jpodwys/preact-journal.svg?branch=master)](https://travis-ci.org/jpodwys/preact-journal)

## 14k?

The HTML, CSS, and JS necessary to run Journalize in its entirety while online weighs 13.43k (compressed using brotli). Add a service worker download for under 500 bytes and you're ready to work offline. The other downloads are the favicon, manifest, and whichever home screen icon your device downloads. I don't include these items in the 14k total, but they do indeed get downloaded.

To helpt get the bundle as small as it is, I combine the HTML, CSS, and JS into a single HTML file.

#### What NPM Packages are Included in that 14k?

* [preact](https://github.com/developit/preact) ([3.5k](https://bundlephobia.com/result?p=preact@8.4.2))
* [preact-scroll-viewport](https://github.com/developit/preact-scroll-viewport) ([1k](https://bundlephobia.com/result?p=preact-scroll-viewport@0.2.0))
* [idb-keyval](https://github.com/jakearchibald/idb-keyval) ([597b](https://bundlephobia.com/result?p=idb-keyval@3.1.0))
* [select](https://github.com/zenorocha/select) ([364b](https://bundlephobia.com/result?p=select@1.1.2))

That's it! Everything else is app code I wrote myself.

## Features

* **Offline Capable**: You can CRUD entries to your heart's content while offline. The next time you boot Journalize while online, the changes you made while offline will sync to the server. Similarly, changes you made on other devices while online will sync back to your devices that didn't have a connection at the time. You cannot login, create an account, or logout while offline.
* **Favorites**
* **Dark Mode**
* **Share/Copy**: Clicking the copy icon in [browsers that support the `navigator.share` API](https://caniuse.com/#search=share%20api), will bring up the operating system's native share UI. In all other browsers, it will copy the entry to the clipboard.
* **Search/Filter**: Search by plain text or entry date and/or favorites.

## Stack

* **Preact**: Front end components
* **Node/Express**: API/DB calls/file server. I'd like to move the file server to a CDN and the API from Express to [Polka](https://github.com/lukeed/polka) at some point.
* **MySQL**: DB
* **IndexedDB**: Client-side data storage (I'm using the excellent [idb-keyval](https://github.com/jakearchibald/idb-keyval)

## State Management

This app is tiny and will stay that way. As such, a complex state management solution is not necessary. However, there are a few design principles by which I abide.

#### State as Props

In such a small app, passing state as props to each application layer works extremely well. In fact, for an app this small, passing state as props makes the app's markup extremely readable.

#### Mutations in Actions

All state mutations are triggered from one of two places:

1. Actions
2. The state object (more on that in the **Derived State** section)

Actions accept three arguments:

1. `el` which can be destructured as `{ state, set }`. Actions can provide a delta and a callback to `set`.
2. `detail` which is provided by the caller of the action.
3. `e` which is a DOM event when user interaction directly triggers calling an action.

These arguments make more sense after reading the **Eventing for Actions** section.

#### Eventing for Actions

The only way to execute actions outside of other actions is to fire events. This ensures components recieve props, return markup, and fire events, all of which are simple to test. Firing events allows me to avoid passing actions as props.

To help facilitate this, I've created `unifire`, which exports a higher-order component called `Provider` and an event firing utility method called `fire`. `Provider` accepts `state` and `actions`. It then creates a document-level event listener for the `UNIFIRE` event. The `fire` method accepts two arguments (`name` and optionally `detail`) and returns a function that optionally accepts a DOM event object. `fire` ultimately emits the `UNIFIRE` event with the name of the action to be executed, they detail object to provide to it, and the DOM event that triggered it.

You may wonder why I'm ok with passing state as props but not actions. In this app, passing state as props results in almost no prop drilling. Passing actions as props would result in quite a bit of prop drilling. It would also make the app's markup far too verbose.

#### Derived State

A [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) object sits at the heart of my state management approach. When I need to define a computed property or observer, I do so within the Proxy. As such, incoming state deltas triggered by actions can in turn result in side effects.

Consider two examples:

1. Which entries populate the entries list (called `viewEntries`) depends on the value of four other state variables: `entries`, `filter`, `filterText`, and `showFilterInput`. Therefore, when an action updates any of these four variables, the Proxy recomputes `viewEntries` before the next render.
2. Proxies are also great for persistence. For example, any time the user changes their dark mode preference, the Proxy catches that change and writes the preference to localStorage so it's available the next time the user launches the app.

## UX Principles

Journalize obviously mimics some of Google's [material design](https://material.io/). Specifically, I modeled the header, new entry button, and dialog boxes after material design. And all of the icons are [material design icons](https://material.io/tools/icons/?style=baseline) that I've run through [SVGOMG](https://jakearchibald.github.io/svgomg/) to save on download size. However, there are a couple of additional principles to which I adhere.

#### Network Optimism

Journalize has no loading spinners or progress bars. I've gone through quite a bit of effort to make Journalize's network layer resilient to spotty connections. As such, your changes *will* sync the server at some point. Until then, they're saved locally on your device. Therefore, there's no need to inform the user that they're waiting because, in reality, they're not.

#### Route Transitions

Journalize is simple--it only has three views.

1. Login
2. Entry list
3. Entry view

Once you're past the login page, there are only two other pages to switch between. With that in mind, I've implemented a simple up/down transition between pages. The entry list fades down and the entry view fades up. I've also applied this to route-specific header icons. It's not fancy. My implementation exclusively uses CSS `animation`s via class names and therefore can only fade in, not out like [react-transition-group](https://github.com/reactjs/react-transition-group) can do. However, it's minimal in both UX and code which makes me happy.
