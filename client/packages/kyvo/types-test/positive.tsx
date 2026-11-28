// Everything here is valid usage and must compile with NO errors.
import { h, render, store, watch, Ctx, Component, WithChildren, Child, VNode } from '../core';
import { listen, debounced, lazy, effect, LazyFailure } from '../helpers';

interface Entry { id: number; text: string; tags: string[]; favorited?: boolean }

// ---- store ----
const app = store({ view: '/entries', dark: false, entries: [] as Entry[], user: null as { name: string } | null });
app.view = '/search';
app.entries = [...app.entries, { id: 1, text: 'a', tags: [] }];            // replace: fine
app.entries = app.entries.filter(e => e.id !== 1);
app.entries = app.entries.map(e => ({ ...e, favorited: !e.favorited }));
app.entries = app.entries.slice().sort((a, b) => a.id - b.id);              // copy then sort: fine
app.user = { name: 'x' };
const first: string = app.entries[0]?.text ?? '';
Object.assign(app, { view: '/', dark: true });

watch(app, (key, next, prev) => {
  if (key === 'dark') { const n: boolean = next; const p: boolean = prev; void n; void p; }
  if (key === 'view') { const v: string = next; void v; }
  if (key === 'entries') { const count: number = next.length; void count; }
});

// ---- components ----
const Plain: Component<{ label: string; n?: number }> = ({ label, n = 0 }) => <p>{label}{n}</p>;
const Nothing = () => null;
const Text = () => 'text';
const Zero = () => 0;
const MaybeOff = ({ on }: { on: boolean }) => (on ? <i /> : false);

const List = ({ items, children }: WithChildren<{ items: Entry[] }>) => (
  <ul>{items.map(e => <li key={e.id}>{e.text}</li>)}{children}</ul>
);

declare module '../core' { interface Ctx { el?: HTMLElement | null; timer?: number } }

const Stateful = ({ id }: { id: number }, ctx: Ctx) => {
  const s = ctx.state({ editing: false, draft: '', n: 0 });
  const stats = ctx.state({ added: 0 }, 'stats');
  const lazy = ctx.state(() => ({ big: [1, 2, 3] }), Symbol('lazy'));
  s.editing = true; s.draft = 'x'; s.n++; stats.added += 1; lazy.big = [...lazy.big, 4];
  ctx.el = null; ctx.timer = 1;
  ctx.mount(() => { document.title = String(id); });
  ctx.mount(() => {
    const t = setInterval(() => {}, 1000);
    return () => clearInterval(t);
  });
  listen(ctx, window, 'resize', e => { const t: UIEvent = e; void t; }, { passive: true, capture: true });
  listen(ctx, document, 'keydown', e => { if (e.key === 'Escape') s.editing = false; });
  listen(ctx, document.body, 'click', e => { const x: number = e.clientX; void x; });
  listen(ctx, new EventTarget(), 'custom', e => { const t: string = e.type; void t; });
  const search = debounced(ctx, (q: string, n: number) => { void q; void n; }, 100);
  effect(ctx, () => () => {}, [app.view]);
  effect(ctx, () => { void app.view; }, [], 'second');
  search('a', 1);
  const onInput = debounced(ctx, (e: Event) => { void e; }, 50, 'second');
  return (
    <div class="x" id="y" style={{ top: '40px', position: 'relative' }} data-id={id} aria-label="hello" ref={el => { ctx.el = el; }}>
      <input value={s.draft} placeholder="p" type="text" disabled={!s.editing} autocomplete="off"
        oninput={e => { s.draft = e.currentTarget.value; }} onInput={onInput}
        onkeydown={e => { if (e.key === 'Enter') s.editing = false; }} ref={el => el?.focus()} />
      <button onclick={e => { e.preventDefault(); s.n++; }} class={s.n ? 'a' : null}>go</button>
      <a href={'/entry/' + id} onclick={e => e.currentTarget.href}>link</a>
      <div contenteditable="plaintext-only" />
      <div contenteditable />
      <form onsubmit={e => e.preventDefault()}><input type="checkbox" checked={s.editing} onchange={() => {}} /></form>
      <svg class="icon" viewBox="0 0 24 24" width={24} stroke-width="2"><path d="M0 0" fill="red" stroke-linecap="round" /></svg>
      <my-widget foo="bar" />
      <Plain label="a" /><Plain label="b" n={3} key="k" />
      <Nothing /><Text /><Zero /><MaybeOff on />
      <List items={[]}><b>one</b>{'two'}{null}{false}{[1, 2].map(n => <i>{n}</i>)}</List>
    </div>
  );
};

const Child1: Component<{ children: Child[] }> = ({ children }) => <div>{children}</div>;
const el: VNode = <Child1><p /></Child1>;

render(<Stateful id={1} />, document.body);
render(null, document.body);
void [first, Plain, el];

// A field that starts empty: annotate the initial value so later assignments type-check.
const emptyStart = store({ entry: undefined as Entry | undefined, list: [] as Entry[] });
emptyStart.entry = { id: 1, text: 'a', tags: [] };
emptyStart.entry = undefined;

// ---- lazy ----
// A module with a default export (what `import()` gives), and the component itself; P is inferred or given.
const Later = lazy(() => Promise.resolve({ default: Plain }));
const Direct = lazy(() => Promise.resolve(Stateful));
const Fancy = lazy(
  () => Promise.resolve({ default: List }),
  () => <p>loading</p>,
  ({ error, retry }: LazyFailure) => { void error; return <button onclick={retry}>again</button>; }
);
Later.preload().then(() => {});
const lazyUse = (
  <div>
    <Later label="x" n={2} /><Direct id={1} /><Fancy items={[]}><b>kids</b>{'more'}</Fancy>
  </div>
);
void lazyUse;
