import { h } from 'preact';
import { fire } from '../unifire';

const hideDialog = fire('linkstate', {key: 'dialogMode'});

export default ({ dialogMode, children }) => (
  <div
    class={`modal-overlay modal-${dialogMode} fade-in`}
    onclick={hideDialog}
    ontouchstart={hideDialog}>
    <div class={`modal-dialog modal-${dialogMode} grow`} ontouchstart={e => e.stopPropagation()}>
      { children[0] }
    </div>
  </div>
);
