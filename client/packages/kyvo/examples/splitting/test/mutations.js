// Deliberately broken versions of the app, applied inside the build (an esbuild plugin that rewrites a module as it is
// read), so the source tree is never touched and there is nothing to put back.
const fs = require('fs');

// The stats page imported statically: its code lands in the first download instead of its own chunk.
const staticStats = {
  name: 'static-stats',
  setup(build) {
    build.onLoad({ filter: /src[\\/]components\.js$/ }, args => {
      const src = fs.readFileSync(args.path, 'utf8');
      const broken = src
        .replace("import { Routes, Link, nav } from './router.js';", "import { Routes, Link, nav } from './router.js';\nimport * as Stats from './pages/stats.js';")
        .replace("page('stats', () => import('./pages/stats.js'))", "page('stats', () => Promise.resolve(Stats))");
      if (broken === src || !broken.includes('Promise.resolve(Stats)')) throw new Error('static-stats mutation no longer applies to components.js');
      return { contents: broken, loader: 'jsx' };
    });
  }
};

module.exports = { 'static-stats': staticStats };
