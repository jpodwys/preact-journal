// A fixed-row-height virtual list. Only the rows in (and just beyond) the viewport are rendered;
// everything else is a spacer. `renderRow(id, y)` returns one keyed vnode per visible item.
import { h } from '../../../../core.js';

export const Grid = ({ ids, rowH, height, overscan = 6, renderRow }, ctx) => {
  const s = ctx.state({ top: 0 });
  const first = Math.max(0, Math.floor(s.top / rowH) - overscan);
  const last = Math.min(ids.length, Math.ceil((s.top + height) / rowH) + overscan);
  const rows = [];
  for (let k = first; k < last; k++) rows.push(renderRow(ids[k], k * rowH));
  return (
    <div class="grid-scroll" style={`height:${height}px`} onScroll={e => { s.top = e.currentTarget.scrollTop; }}>
      <div class="grid-space" style={`height:${ids.length * rowH}px`}>{rows}</div>
    </div>
  );
};
