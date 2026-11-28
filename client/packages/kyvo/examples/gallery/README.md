# Gallery: kyvo by example

Twenty-eight scenarios in eight stages, from a first component to two small apps, each with an explanation, a thing to watch out for, the running demo and the code
that runs it.

    node build.js app && open index.html     # PROD=1 for a minified build
    npm run test:gallery                     # from the repo root

Most scenarios are one file in `src/scenarios/`; `mail/` and `kanban/` are folders, and their Code tab has a file picker.
`src/scenarios.js` imports each file twice, as a module and as text (`?source`), so the Code tab cannot drift from the
demo. To add one: write the file, add its entry there (with its stage), add a spec.

Real code splitting is shown in `../splitting/` (the gallery builds one bundle) and large lists in `../dashboard/`.
