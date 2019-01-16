# preact-journal

14k offline-capable journaling PWA using preact, node, MySQL, and IndexedDB.

[![Build Status](https://travis-ci.org/jpodwys/preact-journal.svg?branch=master)](https://travis-ci.org/jpodwys/preact-journal)

## 15k?

The HTML, CSS, and JS necessary to run Journalize in its entirety while online weighs 15k. Add a service worker download for under 500 bytes and you're ready to work offline. The other donwloads are the favicon, manifest, and whichever home screen icon your device downloads.

## Features

* **Offline Capable**. You can CRUD entries to your heart's content while offline. The next time you boot Journalize while online, the changes you made while offline will sync to the server. Similarly, changes you made on other devices while online will sync back to your devices that didn't have a connection at the time. You cannot login, create an account, or logout while offline.
* **Favorites**. This blurb seems redundant.
* **Dark Mode**. This one too.
* **Share/Copy**. Clicking the copy icon in browsers that support the `navigator.share` API ([currently only mobile Chrome](https://caniuse.com/#search=share%20api)), will bring up the operating system's native share UI. In all other browsers, it will copy the entry to the clipboard.
* **Search/Filter**. Search by plain text, entry date, and/or favorites.
