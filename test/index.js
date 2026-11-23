// The app's specs only: the kyvo framework under client/packages/ has its own runner (npm run test:kyvo).
const tests = require.context('../client/', true, /^\.\/(?!packages\/).*\.spec\.js$/);
tests.keys().forEach(tests);
