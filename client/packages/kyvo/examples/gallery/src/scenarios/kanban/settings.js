import { h } from 'kyvo/core';
import { prefs, reset } from './store.js';

export default () => (
  <div class="card settings">
    <label>
      <input type="checkbox" checked={prefs.compact} onchange={e => { prefs.compact = e.target.checked; }} /> Compact cards
    </label>
    <button onclick={reset}>Reset board</button>
  </div>
);
