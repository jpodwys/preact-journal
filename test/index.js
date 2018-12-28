const tests = require.context('../client/', true, /\.spec.js$/);
tests.keys().forEach(tests);
