// Hand-written types for core.js (the JS is the source of truth). Needs TypeScript >= 5.1
// (JSX.ElementType). See ../../../README.md ("Types").

export type Key = string | number;

/** What `h()` produces (and what JSX evaluates to). */
export interface VNode {
  type: string | ((props: any, ctx: Ctx) => Result);
  props: { children: Child[]; [prop: string]: any };
  key: Key | undefined;
}

/** A child after `h()` has flattened and filtered it. */
export type Child = VNode | string | number;

/** Anything allowed inside JSX braces. `null`, `undefined` and booleans render nothing. */
export type Children = Child | null | undefined | boolean | readonly Children[];

/** What a component may return. One vnode (no arrays, no fragments); `true` is not allowed. */
export type Result = VNode | string | number | null | undefined | false;

/**
 * A component. Props are one live object per instance; declare `children: Child[]` (or
 * `WithChildren<P>`) only on components that take children.
 */
export type Component<P = {}> = (props: P, ctx: Ctx) => Result;
export type WithChildren<P = {}> = P & { children: Child[] };

/**
 * Stored values read as deeply readonly, so an in-place mutation (`app.items.push(x)`) is a type
 * error: replace the value instead. This is the compile-time twin of the dev-mode deep freeze.
 */
export type DeepReadonly<T> = T extends (...args: any[]) => any
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

/** A store: fields are assignable at the top level; what you read from them is readonly. */
export type Store<T extends object> = { -readonly [K in keyof T]: DeepReadonly<T[K]> };

/** `Change` without `prev`, for listeners that declare two parameters. */
export type Change2<S> = { [K in keyof S]-?: [key: K, next: S[K]] }[keyof S];

/** The arguments `watch` listeners receive, as a union so checking `key` narrows `next` and `prev`. */
export type Change<S> = { [K in keyof S]-?: [key: K, next: S[K], prev: S[K]] }[keyof S];

/**
 * The per-instance object passed to every component. It is open on purpose at runtime (you may hang
 * non-reactive fields on it); in types, declare yours by augmenting this interface:
 * `declare module '<path>/ui/core' { interface Ctx { el?: HTMLElement } }`.
 */
export interface Ctx {
  /** Persistent per-instance store. One unkeyed slot per component; extra slots need a key. */
  state<T extends object>(init: () => T, key?: string | symbol): Store<T>;
  state<T extends object>(init: T, key?: string | symbol): Store<T>;
  /** Runs once after the first commit. A returned function runs on unmount. */
  mount(fn: () => void | (() => void)): void;
}

export function h(
  type: string | ((props: any, ctx: Ctx) => Result),
  props?: Record<string, any> | null,
  ...children: Children[]
): VNode;

export function render(vnode: VNode | null, host: Element): void;

export function store<T extends object>(init: T): Store<T>;

/** `watch(store, (key, next, prev) => ...)`: checking `key` narrows `next` and `prev`. Listeners may take fewer parameters. */
export function watch<S extends object>(store: S, fn: (...change: Change<S>) => void): void;
export function watch<S extends object>(store: S, fn: (...change: Change2<S>) => void): void;
export function watch<S extends object>(store: S, fn: (key: keyof S) => void): void;

// ---- JSX -------------------------------------------------------------------------------------

export type Ref<T> = ((el: T | null) => void) | null;

/** Style objects take strings only: numbers need units (`'40px'`), the browser ignores `40`. */
export type StyleObject = { [K in keyof CSSStyleDeclaration as CSSStyleDeclaration[K] extends string ? K : never]?: string };

type IfEquals<X, Y, A, B> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? A : B;
type WritableKeys<T> = { [K in keyof T]-?: IfEquals<{ [Q in K]: T[K] }, { -readonly [Q in K]: T[K] }, K, never> }[keyof T];

/** DOM properties the framework can set (it assigns a property when the element has one). */
type Settable<T> = {
  // Index signatures (HTMLFormElement has `[name: string]: any`) must not leak in and make every attribute `any`.
  [K in WritableKeys<T> as string extends K ? never : number extends K ? never
    : K extends `on${string}` | 'style' | 'children' | 'classList' | 'innerHTML' | 'outerHTML' ? never
    : T[K] extends (...args: any[]) => any ? never : K]?: T[K] | null;
};

type Handler<E, T> = (e: E & { currentTarget: T }) => unknown;
type EventHandlers<T> = {
  [K in keyof HTMLElementEventMap as `on${K}`]?: Handler<HTMLElementEventMap[K], T> | null;
} & {
  [K in keyof HTMLElementEventMap as `on${Capitalize<K>}`]?: Handler<HTMLElementEventMap[K], T> | null;
};

type Common<T> = {
  key?: Key;
  ref?: Ref<T>;
  class?: string | null;
  style?: string | StyleObject | null;
  children?: Children;
  [attr: `data-${string}`]: any;
  [attr: `aria-${string}`]: any;
};

type ElementAttrs<T> = Settable<T> & EventHandlers<T> & Common<T> & {
  contenteditable?: boolean | 'true' | 'false' | 'plaintext-only';
};
/**
 * SVG attributes are set with setAttribute. The common ones are listed so editors can complete them and a
 * misspelled camelCase one (`viewbox`) is caught; hyphenated ones (`stroke-width`, `fill-rule`) are open.
 */
type SVGAttrs<T> = EventHandlers<T> & Common<T> & {
  viewBox?: string; xmlns?: string; d?: string; points?: string; transform?: string; href?: string;
  fill?: string; stroke?: string; opacity?: string | number;
  width?: string | number; height?: string | number;
  x?: string | number; y?: string | number; cx?: string | number; cy?: string | number;
  r?: string | number; rx?: string | number; ry?: string | number;
  x1?: string | number; y1?: string | number; x2?: string | number; y2?: string | number;
  [attr: `${string}-${string}`]: any;
};

type HTMLTags = { [K in keyof HTMLElementTagNameMap]: ElementAttrs<HTMLElementTagNameMap[K]> };
type SVGOnly = Omit<SVGElementTagNameMap, keyof HTMLElementTagNameMap>;
type SVGTags = { [K in keyof SVGOnly]: SVGAttrs<SVGOnly[K]> };

declare global {
  namespace JSX {
    type Element = VNode;
    type ElementType = string | ((props: any, ctx: Ctx) => Result);
    interface ElementChildrenAttribute { children: {} }
    interface IntrinsicAttributes { key?: Key }
    /**
     * At runtime `children` is a flat Child[] (h() drops null/false/booleans and flattens), so a component reads
     * it as one; but what JSX may pass is any Children (`{cond && <X/>}`, one child, nested arrays).
     */
    type LibraryManagedAttributes<C, P> = 0 extends 1 & P
      ? P                                  // untyped props (any): leave them alone
      : 'children' extends keyof P
        ? Omit<P, 'children'> & ({} extends Pick<P, 'children'> ? { children?: Children } : { children: Children })
        : P;
    interface IntrinsicElements extends HTMLTags, SVGTags {
      [customElement: `${string}-${string}`]: any;
    }
  }
}
