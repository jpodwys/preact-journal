// The four idb-keyval calls the app uses, against the same database ('keyval-store' / 'keyval'), so existing data is untouched.
const p = r => new Promise((ok, no) => {
  r.oncomplete = r.onsuccess = () => ok(r.result);
  r.onabort = r.onerror = () => no(r.error);
});
let db;
const store = mode => (db || (db = (r => (r.onupgradeneeded = () => r.result.createObjectStore('keyval'), p(r)))(indexedDB.open('keyval-store'))))
  .then(d => d.transaction('keyval', mode).objectStore('keyval'));
export const get = k => store('readonly').then(s => p(s.get(k)));
export const set = (k, v) => store('readwrite').then(s => (s.put(v, k), p(s.transaction)));
export const del = k => store('readwrite').then(s => (s.delete(k), p(s.transaction)));
export const clear = () => store('readwrite').then(s => (s.clear(), p(s.transaction)));
