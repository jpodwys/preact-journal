// Hand-written types for helpers.js. See core.d.ts.
import type { Ctx, Component } from './core';

type Opts = boolean | AddEventListenerOptions;

/** Adds the listener on mount, removes it on unmount. `fn` is the first render's closure: read `props.x`. */
export function listen<K extends keyof WindowEventMap>(ctx: Ctx, target: Window, event: K, fn: (e: WindowEventMap[K]) => void, opts?: Opts): void;
export function listen<K extends keyof DocumentEventMap>(ctx: Ctx, target: Document, event: K, fn: (e: DocumentEventMap[K]) => void, opts?: Opts): void;
export function listen<K extends keyof HTMLElementEventMap>(ctx: Ctx, target: HTMLElement, event: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: Opts): void;
/** Any other EventTarget takes a free-form event name (a typo on window/document/an element is still caught above). */
export function listen<T extends EventTarget>(ctx: Ctx, target: T, event: T extends Window | Document | HTMLElement ? never : string, fn: (e: Event) => void, opts?: Opts): void;

/**
 * Debounces calls to the LATEST `fn`, passing the most recent call's arguments. Each `key` has its own timer;
 * a pending call is never lost: it runs once if the component unmounts.
 */
export function debounced<A extends any[]>(ctx: Ctx, fn: (...args: A) => void, ms: number, key?: string): (...args: A) => void;

/**
 * Runs `fn` after the first commit and again when a value in `deps` changes; a returned function runs before each rerun
 * and on unmount. `deps` says only when to restart. A second effect in one component needs a `key`.
 */
export function effect(ctx: Ctx, fn: () => unknown, deps: readonly unknown[], key?: string): void;

/** What `lazy` hands its `Failed` component. */
export interface LazyFailure { error: unknown; retry(): void }

/**
 * A component whose code loads on first render: `lazy(() => import('./stats.js'))`. Loads once, shows `Loading` meanwhile
 * (nothing if omitted) and `Failed` if the load rejects (`retry()` tries again). `preload()` starts the load early.
 * It has exactly the props of the component it loads.
 */
export function lazy<C extends Component<any>>(
  load: () => Promise<C | { default: C }>,
  Loading?: Component<{}> | null,
  Failed?: Component<LazyFailure> | null
): C & { preload(): Promise<void> };
