# preact-journal

14k offline-capable journaling PWA using preact, node, MySQL, and IndexedDB.

[![Build Status](https://travis-ci.org/jpodwys/preact-journal.svg?branch=master)](https://travis-ci.org/jpodwys/preact-journal)

## 14k?

The HTML, CSS, and JS necessary to run Journalize in its entirety while online weighs 13.43k (compressed using brotli). Add a service worker download for under 500 bytes and you're ready to work offline. The other donwloads are the favicon, manifest, and whichever home screen icon your device downloads. I don't include these items in the 14k total, but they do indeed get downloaded.

## Features

* **Offline Capable**. You can CRUD entries to your heart's content while offline. The next time you boot Journalize while online, the changes you made while offline will sync to the server. Similarly, changes you made on other devices while online will sync back to your devices that didn't have a connection at the time. You cannot login, create an account, or logout while offline.
* **Favorites**.
* **Dark Mode**.
* **Share/Copy**. Clicking the copy icon in [browsers that support the `navigator.share` API](https://caniuse.com/#search=share%20api), will bring up the operating system's native share UI. In all other browsers, it will copy the entry to the clipboard.
* **Search/Filter**. Search by plain text or entry date and/or favorites.

## Stack

* **Preact**: Front end components
* **Node/Express**: API/DB calls/file server. I'd like to move the file server to a CDN and the API from Express to [Polka](https://github.com/lukeed/polka) and at some point.
* **MySQL**: DB
* **IndexedDB**: Client-side data storage (I'm using the excellent [idb-keyval](https://github.com/jakearchibald/idb-keyval)

## What NPM Packages Do I Include in My Bundle?

* [preact](https://github.com/developit/preact)
* [preact-scroll-viewport](https://github.com/developit/preact-scroll-viewport)
* [idb-keyval](https://github.com/jakearchibald/idb-keyval)npmj
* [select](https://github.com/zenorocha/select)

That's it! Everything else is app code I wrote myself.

## Sinlge File

I package the entire site's HTML, CSS, and JS into a single file to optimize the download size.

## State Management

This app is tiny and will stay that way. As such, a complex state management solution is not necessary. However, there are a few design principles by which I abide.

#### State as Props

In such a small app, passing state as props to each application layer works extremely well. In fact, for an app this small, passing state as props makes the app's markup extremely readable.

#### Mutations in Actions

All state mutations are triggered from one of two places:

1. the state object (more on that in the **Derived State** section)
2. Actions

#### Eventing for Actions

The only way to execute actions outside of other actions is to fire events. This ensures components recieve props, return markup, and fire events, all of which is very testable. Firing events allows me to avoid passing actions as props.

You may wonder why I'm ok with passing state as props but not actions. In this app, passing state as props results in almost no prop drilling. Passing actions as props would result in quite a bit of prop drilling. It would also make the app's markup far too verbose.

#### Derived State

A [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) object sits at the heart of my state management approach. When I need to define a computed property or observer, I do so within the Proxy. As such, incoming state deltas triggered by actions can in turn result in side effects.

Consider two examples:

1. Which entries populate the entries list (called `viewEntries`) depends on the value of four other state variables: `entries`, `filter`, `filterText`, and `showFilterInput`. Therefore, when an action updates any of these four variables, the Proxy recomputes `viewEntries` before the next render.
2. Proxies are also great for persistence. For example, any time the user changes their dark mode preference, the Proxy catches that change and writes the preference to localStorage so it's available the next time the user launches the app.
