const tests = require.context('../client/js/', true, /\.spec.js$/);
tests.keys().forEach(tests);
