# Gallery: kyvo by example

Ten scenarios in order of difficulty, each with an explanation, a thing to watch out for, the running demo and the code
that runs it.

    node build.js app && open index.html     # PROD=1 for a minified build
    npm run test:gallery                     # from the repo root

Each scenario is one file in `src/scenarios/`. `src/scenarios.js` imports it twice, as a module and as text
(`?source`), so the Code tab cannot drift from the demo. To add one: write the file, add its entry there, add a spec.

Lazy loading is left to `../splitting/` and large lists to `../dashboard/`.
