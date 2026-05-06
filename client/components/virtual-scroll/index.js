/**
 * Adapted from preact-scroll-viewport
 * I added an efficiency improvement that removes the original library's
 * requirement to process the entire virtual list's vdom before rendering.
 */

import { h, Component } from 'preact';

const EVENT_OPTS = {
	passive: true,
	capture: true
};

// Buffer of extra rows rendered beyond the visible window in each direction.
// Also the alignment chunk for the start index so we don't shift on every
// scroll tick. Tuned for the entries list; not configurable.
const OVERSCAN = 20;

export default class ScrollViewport extends Component {
	resized = () => {
		let height = innerHeight;
		if (height!==this.state.height) {
			this.setState({ height });
		}
	};

	scrolled = () => {
		let offset = Math.max(0, this.base && -this.base.getBoundingClientRect().top || 0);
		this.setState({ offset });
	};

	componentDidUpdate() {
		this.resized();
	}

	componentDidMount() {
		this.resized();
		this.scrolled();
		addEventListener('resize', this.resized, EVENT_OPTS);
		addEventListener('scroll', this.scrolled, EVENT_OPTS);
	}

	componentWillUnmount() {
		removeEventListener('resize', this.resized, EVENT_OPTS);
		removeEventListener('scroll', this.scrolled, EVENT_OPTS);
	}

	render({ items, renderer, rowHeight, internalClass, ...props }, { offset=0, height=0 }) {
		let estimatedHeight = rowHeight * items.length;
		(props.style || (props.style={})).height = estimatedHeight + 'px';

		let start = (offset / rowHeight)|0;
		let visibleRowCount = (height / rowHeight)|0;

		start = Math.max(0, start - (start % OVERSCAN));
		visibleRowCount += OVERSCAN;

		let end = start + 1 + visibleRowCount;
		let visible = items.slice(start, end);

		return (
			<div {...props}>
				<div class={internalClass} style={{ position: 'relative', top: start*rowHeight }}>
					{renderer(visible)}
				</div>
			</div>
		);
	}
}
