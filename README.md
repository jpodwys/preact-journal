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

## Architecture

#### Sinlge File

I package the entire site's HTML, CSS, and JS into a single file to optimize the download size.

#### State Management

This project is small enough that passing props to each component layer isn't an inconvenience and actually makes my component code very readable. If there's any prop drilling (passing props through layers that don't need them), then it's extremely limited. As such, and because I'm trying hard to keep my download size small, it seemed unnecessary to go with a robust, off-the-shelf state management solution.

My comfort with passing state as props does not, however, translate to being comfortable passing actions as props. For some reason, that just felt wrong to me in this context. 
