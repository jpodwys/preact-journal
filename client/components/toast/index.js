import { h } from 'preact';
import { useUnifire } from '../unifire';

export default () => {
  const [{ toast }] = useUnifire([ 'toast' ]);

  return (
    <toast class={toast ? 'show' : ''}>
      <span class="toast-label">{toast}</span>
    </toast>
  );
}
