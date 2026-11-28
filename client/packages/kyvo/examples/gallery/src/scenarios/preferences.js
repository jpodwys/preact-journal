import { h, store, watch } from 'kyvo/core';

const KEY = 'gallery:preferences';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };

const preferences = store({ name: '', newsletter: false, ...load() });

// Runs after every changed write, whoever made it, so no action can forget to save.
// Register it once, outside any component.
watch(preferences, () => localStorage.setItem(KEY, JSON.stringify(preferences)));

export default () => (
  <div>
    <label>Name
      <input value={preferences.name} oninput={e => { preferences.name = e.target.value; }} />
    </label>
    <label>
      <input type="checkbox" checked={preferences.newsletter} onchange={e => { preferences.newsletter = e.target.checked; }} />
      {' '}Newsletter
    </label>
    <p>Reload the page: these are still here.</p>
  </div>
);
