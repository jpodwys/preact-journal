import { h } from 'preact';
import { fire } from '../unifire';

export default ({ dialogMode, children }) => (
  <div>
    <div class={`modal-dialog modal-${dialogMode} grow`}>
      { children[0] }
    </div>
    <div class={`modal-overlay modal-${dialogMode} fade-in`} onclick={() => fire('linkstate', { key: 'dialogMode' })}></div>
  </div>
);
