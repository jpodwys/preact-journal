/**
 * Adapted from preact-scroll-viewport
 * Renders only the rows near the viewport.
 */

import { h } from '../../packages/kyvo/core';
import { listen } from '../../packages/kyvo/helpers';

const EVENT_OPTS = {
	passive: true,
	capture: true
};

// Buffer of extra rows rendered beyond the visible window in each direction.
// Also the alignment chunk for the start index so we don't shift on every
// scroll tick. Tuned for the entries list; not configurable.
const OVERSCAN = 20;

export default ({ items, renderer, rowHeight }, ctx) => {
	const s = ctx.state({ offset: 0, height: 0 });

	const resized = () => {
		if (innerHeight !== s.height) s.height = innerHeight;
	};

	const scrolled = () => {
		s.offset = Math.max(0, ctx.el && -ctx.el.getBoundingClientRect().top || 0);
	};

	listen(ctx, window, 'resize', resized, EVENT_OPTS);
	listen(ctx, window, 'scroll', scrolled, EVENT_OPTS);
	// Refs run before mount callbacks, so ctx.el is set by the time this measures.
	ctx.mount(() => { resized(); scrolled(); });

	let start = (s.offset / rowHeight)|0;
	let visibleRowCount = (s.height / rowHeight)|0;

	start = Math.max(0, start - (start % OVERSCAN));
	visibleRowCount += OVERSCAN;

	const visible = items.slice(start, start + 1 + visibleRowCount);

	return (
		<div style={{ height: rowHeight * items.length + 'px' }} ref={el => { ctx.el = el; }}>
			<div class="fade-down" style={{ position: 'relative', top: start*rowHeight + 'px' }}>
				{renderer(visible)}
			</div>
		</div>
	);
}
