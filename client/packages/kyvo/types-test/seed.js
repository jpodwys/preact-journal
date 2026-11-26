// Seeds realistic authoring mistakes into the throwaway copy of the journal app. Each one is a single-line
// edit; `real-app.js` diffs the checker's output against the unseeded baseline to see which were caught.
const fs = require('fs'), path = require('path');
// What adopting the types costs in plain JS: ONE JSDoc comment on each component that uses ctx, so `ctx` is typed.
module.exports.annotate = function annotate(dir) {
  const edit = (file, from, to) => {
    const p = path.join(dir, file), s = fs.readFileSync(p, 'utf8');
    if (!s.includes(from)) throw new Error('annotate target missing in ' + file);
    fs.writeFileSync(p, s.replace(from, to));
  };
  const CTX = "@param {import('../../packages/kyvo/core').Ctx} ctx";
  edit('components/virtual-scroll/index.js', 'export default ({ items, renderer, rowHeight }, ctx) => {', `/** @param {{ items: readonly any[], renderer: (rows: any[]) => any, rowHeight: number }} props\n * ${CTX} */\nexport default ({ items, renderer, rowHeight }, ctx) => {`);
  edit('components/entry/index.js', 'export default (props, ctx) => {', `/** @param {any} props\n * ${CTX} */\nexport default (props, ctx) => {`);
  edit('components/router/index.js', 'function Router(props, ctx) {', `/** @param {any} props\n * ${CTX} */\nfunction Router(props, ctx) {`);
};

module.exports = Object.assign(function seed(dir) {
  const edit = (file, from, to) => {
    const p = path.join(dir, file), s = fs.readFileSync(p, 'utf8');
    if (!s.includes(from)) throw new Error('seed target missing in ' + file + ': ' + from);
    fs.writeFileSync(p, s.replace(from, to));
  };
  // 1. mutate the store in place instead of replacing the value (the #1 rule of the framework)
  edit('js/actions/entry-actions.js', "set({ entryId: entry.id, entries: [entry, ...app.entries] });", "app.entries.push(entry); set({ entryId: entry.id });");
  // 2. typo in a ctx method
  edit('components/virtual-scroll/index.js', "const s = ctx.state({ offset: 0, height: 0 });", "const s = ctx.statee({ offset: 0, height: 0 });");
  // 3. unitless numeric style (the browser silently ignores it)
  edit('components/virtual-scroll/index.js', "top: start*rowHeight + 'px'", "top: start*rowHeight");
  // 4. misspelled store field read
  edit('components/header/index.js', "const { view, userId, filter, filterText } = app,", "const { view, userIdd, filter, filterText } = app,");
  // 5. wrong event name
  edit('components/virtual-scroll/index.js', "listen(ctx, window, 'resize', resized, EVENT_OPTS);", "listen(ctx, window, 'resizee', resized, EVENT_OPTS);");
  // 6. misspelled local-state field
  edit('components/entry/index.js', "{s.text}\n      </div>", "{s.txt}\n      </div>");
  // 7. ctx.mount whose arrow accidentally returns a timer id instead of a cleanup function
  edit('components/router/index.js', "ctx.mount(() => {\n    LIVE = props;", "ctx.mount(() => setInterval(() => {}, 1000)); ctx.mount(() => {\n    LIVE = props;");
  // 8. wrong value type written to the store
  edit('js/actions/global-actions.js', "set({ dark: !app.dark, dialogMode: '' });", "set({ dark: 'toggle', dialogMode: '' });");
}, { annotate: module.exports.annotate });
