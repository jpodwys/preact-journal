import { h } from 'preact';

export default ({ toast }) => (
  <toast class={toast ? 'show' : ''}>
    <span class="toast-label">{toast}</span>
  </toast>
);
