# Tasks: a second, different app on the ctx-framework

A small task manager written to stress the parts of the framework the journal app barely touches:
per-row local state through reorders, several state slots in one component, controlled inputs with
validation, debounced search, a timer that only exists while a row is running, a confirm dialog whose
Escape listener exists only while open, and a data fetch that must be cancelled when the selection changes.

    node build.js test && ../../../../node_modules/.bin/karma start karma.conf.js     # 26 specs (PROD=1 for the minified bundle)
    node size.js                                                                     # production size
    node build.js app   # then open index.html

193 lines of app code (`src/`), 26 specs (`test/`). Idioms it settled on, instead of effect dependency arrays:
**conditional rendering** (a `Ticker` or `Confirm` component that exists only while needed; its `ctx.mount`
starts and its cleanup stops the work) and **keyed remount** (`<Detail key={id}/>`; a new id is a new instance whose
`mount` fetches and whose cleanup cancels the stale response).
