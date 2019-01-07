import { h } from 'preact';
import { fire } from '../unifire';

export default ({ dialogMode, children }) => (
  <div class={`modal-overlay modal-${dialogMode} fade-in`} onclick={fire('linkstate', {key: 'dialogMode'})}>
    <div class={`modal-dialog modal-${dialogMode} grow`}>
      { children[0] }
    </div>
  </div>
);
