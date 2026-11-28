# Spreading data into props

**Status: a design note. The proposal below is not built or measured.**

`<div {...obj} />` should work for any object a developer wrote. The risk is an object that someone else controls (parsed
JSON, say): it chooses which props exist, not only their values. kyvo sees keys and values, not where they came from.

## What kyvo does today

- Objects shaped like vnodes are never rendered: `h()` tags its own with a private symbol.
- `innerHTML` and `outerHTML` are ignored, from any source. To set HTML you trust, use a `ref`.
- A string `onclick` does not run. It is stored as a listener, so the event throws a `TypeError`.
- `ONCLICK` (any `on*` name that starts with a capital `O`) becomes a real attribute, so the browser would run it.
- A `javascript:` `href` is set as given.
- `href`, `style` and every other prop apply normally. Spread data can use them to redirect a click or cover the page.

The journal app's CSP blocks the script in the `ONCLICK` and `javascript:` cases. An app on kyvo without such a CSP is
exposed to both. Until that changes, pass fields by name when the data is not yours:

```js
<a href={link.url} title={link.title} />   // not <a {...link} />
```

## What other frameworks do

Parsed JSON spread onto an element, production builds, no CSP, headless Chrome, 2026-11-27:

| | Markup through a prop | `javascript:` link runs | String handler runs |
|---|---|---|---|
| React 19.3.1 | via `dangerouslySetInnerHTML` | no | no |
| Preact 8.3.1 | via `dangerouslySetInnerHTML` | yes | `ONCLICK` only |
| Preact 10.29.8 | via `dangerouslySetInnerHTML` or `innerHTML` | yes | `ONCLICK` only |
| Vue 3.5.46 | via `innerHTML` | yes | `onclick`, `ONCLICK` |
| Solid 1.9.20 (`spread()`) | via `innerHTML` | yes | `ONCLICK` only |
| Svelte 5.59.2 | no | yes | no |

Only `div` and `a` were tried, with the props above. None of these was safe on every count. `{ __html }` is a plain
object, so JSON can supply it.

## Proposal

The goal: spread data cannot create markup or run code, while a developer's own objects spread as written. Since kyvo
cannot tell where a string came from, markup would need a value that JSON cannot produce, as elements already do.

```js
const props = { class: 'note', innerHTML: html(renderedMarkdown) };
<div {...props} />
```

- `innerHTML`: accepted only when wrapped by `html()`, which marks the value with a private symbol. A plain string is
  ignored, and throws in development so that it does not vanish silently.
- `on*`: attach functions only, matching the `on` prefix in any case.
- `outerHTML`: stay ignored. It would replace the element kyvo is tracking.
- Everything else: unchanged.

`html()` would not sanitize anything. It records that a developer chose to treat a string as markup.

What it would not cover: `href`, `style` and other ordinary attributes still apply, and URL or document props
(`javascript:` links, `srcdoc`) would still rely on a CSP or on the app checking values.

Open questions:

- The size cost. The journal uses neither `innerHTML` nor `html()`, so the helper itself should tree-shake away.
- Re-renders must compare the wrapped string, not the wrapper, or `innerHTML` is rewritten every time.
- What happens to an element that has both `innerHTML` and children.
