import { h, store } from 'kyvo/core';
import { listen } from 'kyvo/helpers';

const SIZE = 36;

// History is just old values. Nothing is copied until a change makes a new array.
const art = store({ past: [], cells: Array(SIZE).fill(false), future: [] });

const paint = i => Object.assign(art, {
  past: [...art.past, art.cells],
  cells: art.cells.map((on, j) => (j === i ? !on : on)),
  future: []
});

const undo = () => {
  if (!art.past.length) return;
  Object.assign(art, { past: art.past.slice(0, -1), cells: art.past[art.past.length - 1], future: [art.cells, ...art.future] });
};

const redo = () => {
  if (!art.future.length) return;
  Object.assign(art, { past: [...art.past, art.cells], cells: art.future[0], future: art.future.slice(1) });
};

export default function Pixels(props, ctx) {
  // Ctrl+Z or Cmd+Z undoes. Add Shift to redo.
  listen(ctx, document, 'keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    }
  });

  return (
    <div>
      <div class="pixels">
        {art.cells.map((on, i) => (
          <button aria-label={'Cell ' + (i + 1)} aria-pressed={String(on)} onclick={() => paint(i)} />
        ))}
      </div>
      <button disabled={!art.past.length} onclick={undo}>Undo</button>
      <button disabled={!art.future.length} onclick={redo}>Redo</button>
      <p class="steps">{art.past.length} steps back, {art.future.length} forward</p>
    </div>
  );
}
