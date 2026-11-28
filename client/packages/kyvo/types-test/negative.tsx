// Each line marked @ts-expect-error MUST be a type error. If one compiles, tsc reports "Unused
// '@ts-expect-error' directive", so this file fails when a type stops catching its mistake.
import { h, store, watch, Ctx, Component, WithChildren } from '../core';
import { listen, debounced, lazy } from '../helpers';

interface Entry { id: number; text: string; tags: string[] }
const app = store({ view: '/entries', dark: false, entries: [] as Entry[], user: null as { name: string } | null });

// ---- store: the replace-don't-mutate rule, enforced at compile time ----
// @ts-expect-error in-place mutation of a stored array
app.entries.push({ id: 1, text: 'a', tags: [] });
// @ts-expect-error in-place mutation of a stored element
app.entries[0].text = 'x';
// @ts-expect-error nested write
if (app.user) app.user.name = 'x';
// @ts-expect-error in-place sort of the stored array
app.entries.sort();
// @ts-expect-error unknown field (typo)
app.entres = [];
// @ts-expect-error wrong value type
app.dark = 'yes';
// @ts-expect-error wrong element type
app.entries = [{ id: 'one' }];
// @ts-expect-error reading an unknown field
const nope = app.vieww;
void nope;

// ---- watch ----
watch(app, (key, next) => {
  // @ts-expect-error `next` is a boolean when key is 'dark'
  if (key === 'dark') next.length;
});
// @ts-expect-error listener must be a function
watch(app, 42);

// ---- ctx ----
const C = (props: {}, ctx: Ctx) => {
  // @ts-expect-error typo in a ctx method
  ctx.statee({ a: 1 });
  const s = ctx.state({ editing: false, draft: '' });
  // @ts-expect-error unknown field on local state
  s.edting = true;
  // @ts-expect-error wrong type for a local field
  s.editing = 'yes';
  // @ts-expect-error state must be an object
  ctx.state(5);
  // @ts-expect-error slot keys are string or symbol
  ctx.state({}, 5);
  // @ts-expect-error a field nobody declared on ctx (declare yours by augmenting Ctx)
  ctx.timerr = 1;
  // @ts-expect-error mount returning a non-function value (e.g. an arrow returning setInterval's id)
  ctx.mount(() => setInterval(() => {}, 1000));
  // @ts-expect-error mount takes a function
  ctx.mount('x');
  // @ts-expect-error mutating a stored array held in local state
  s.draft.length = 0;
  // @ts-expect-error unknown event name for window
  listen(ctx, window, 'resizee', () => {});
  // @ts-expect-error `key` does not exist on a click event
  listen(ctx, document.body, 'click', e => e.key);
  // @ts-expect-error debounced wants a function
  debounced(ctx, 5, 100);
  // @ts-expect-error debounced's trigger takes the arguments of fn
  debounced(ctx, (q: string) => {}, 100)(5);
  // @ts-expect-error the trigger is a plain function: there is no flush or cancel
  debounced(ctx, () => {}, 100).flush();
  // @ts-expect-error ms must be a number
  debounced(ctx, () => {}, '100');
  return null;
};
void C;

// ---- components and JSX ----
const Needs: Component<{ label: string; n?: number }> = ({ label }) => <p>{label}</p>;
const Kids = ({ children }: WithChildren) => <div>{children}</div>;
const Bad1 = () => <div />;
void [Needs, Kids, Bad1];

const checks = <div>
  {/* @ts-expect-error missing required prop */}
  <Needs />
  {/* @ts-expect-error wrong prop type */}
  <Needs label={5} />
  {/* @ts-expect-error unknown prop on a component */}
  <Needs label="a" lable="b" />
  {/* @ts-expect-error component that takes children given none */}
  <Kids />
  {/* @ts-expect-error unknown HTML tag */}
  <divv />
  {/* @ts-expect-error unknown attribute on an HTML element (typo) */}
  <div clas="x" />
  {/* @ts-expect-error value must be a string */}
  <input value={5} />
  {/* @ts-expect-error numeric style values need units */}
  <div style={{ top: 40 }} />
  {/* @ts-expect-error unknown style property */}
  <div style={{ topp: '1px' }} />
  {/* @ts-expect-error wrong event for the element: handler param is typed */}
  <button onclick={(e: KeyboardEvent) => e.key} />
  {/* @ts-expect-error currentTarget of an input has no `href` */}
  <input oninput={e => e.currentTarget.href} />
  {/* @ts-expect-error ref must match the element type */}
  <input ref={(el: HTMLCanvasElement | null) => { void el; }} />
  {/* @ts-expect-error misspelled SVG attribute (it is viewBox) */}
  <svg viewbox="0 0 24 24" />
  {/* @ts-expect-error contenteditable takes a boolean or a known string */}
  <div contenteditable="maybe" />
  {/* @ts-expect-error `type` is a string */}
  <input type={1} />
  {/* @ts-expect-error checked is a boolean */}
  <input type="checkbox" checked="yes" />
</div>;
void checks;

// @ts-expect-error a component may not return an array (the runtime throws on it)
const ReturnsArray: Component = () => [<i />, <b />];
// @ts-expect-error a component may not return `true`
const ReturnsTrue: Component = () => true;
// @ts-expect-error a component returning an object that is not a vnode
const ReturnsObject: Component = () => ({ nope: 1 });
void [ReturnsArray, ReturnsTrue, ReturnsObject];

// Without the annotation the field is typed as only `undefined` (strict mode), so assigning an entry is an error.
const emptyUnannotated = store({ entry: undefined });
// @ts-expect-error `entry` was inferred as undefined
emptyUnannotated.entry = { id: 1 };

// ---- lazy ----
const Typed = lazy(() => Promise.resolve({ default: ({ id }: { id: number }) => <p>{id}</p> }));
// @ts-expect-error a prop the loaded component does not take
<Typed name="x" />;
// @ts-expect-error a required prop is missing
<Typed />;
// @ts-expect-error the loader must produce a component
lazy(() => Promise.resolve(42));
// @ts-expect-error the loader must return a promise
lazy(() => ({ default: () => null }));
// @ts-expect-error Failed receives { error, retry }, not an arbitrary shape
lazy(() => Promise.resolve({ default: () => null }), null, ({ nope }: { nope: string }) => <p>{nope}</p>);
