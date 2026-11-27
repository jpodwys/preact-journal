// The only code that sends entries to the server or fetches them. Actions write the store (which persists it) and then
// call `sync()`. One request is out at a time, so responses cannot overtake each other and a fetch cannot cross a send.
import xhr from '../api';
import { get, set as idbSet } from '../idb';
import { app, isHeld } from '../app-state';
import { serverId, isNew, isDirty, accepted, merge } from './record';

let running, requested, stale, sending;
export const isSending = id => sending === app.userId + ':' + id;

// Send whatever the server lacks. Cheap to call after any change, however often.
export function sync (){
  // Nothing runs before the cached entries are read: the list in memory is not the whole list until then.
  if(!app.userId || isHeld()) return;
  requested = true;
  if(!running) run();
};

// Fetch from the server as well.
export function refresh (){
  stale = true;
  sync();
};

// For tests: forget everything this module remembers between calls.
export function resetSync (){
  running = requested = stale = sending = undefined;
};

async function run (){
  running = true;
  while(requested && app.userId){
    requested = false;
    const userId = app.userId;
    // A fetch that fails is tried again on the next call.
    if(stale) { stale = false; await pull(userId).catch(() => { stale = true; }); }
    await push(userId).catch(() => {});
  }
  running = false;
};

// Applies `change(entries)` to a user's entries: the live store, or the cached copy of a user switched away from. A user
// who has since logged out or expired has nothing cached, and gets nothing written back.
function update (userId, change, timestamp){
  if(userId === app.userId) {
    app.entries = change(app.entries);
    if(timestamp) app.timestamp = timestamp;
  } else if(app.accounts.some(a => String(a.id) === userId && !a.expired)) {
    if(timestamp) localStorage.setItem('timestamp_' + userId, timestamp);
    return get('entries_' + userId).then((entries = []) => idbSet('entries_' + userId, change(entries)));
  }
};

async function pull (userId){
  const since = app.timestamp;
  const { entries, timestamp } = await xhr(since ? '/api/entries/sync/' + since : '/api/entries');
  // Entries that are new to this device slide in once.
  if(since && userId === app.userId) {
    const known = new Set(app.entries.map(serverId));
    const added = entries.filter(e => !e.deleted && !known.has(e.id)).map(e => e.id);
    if(added.length) app.fresh = added;
  }
  await update(userId, list => entries.length ? merge(list, entries) : list, timestamp);
};

// The one request that brings the server up to date with `entry`.
function request (entry){
  const { date, text, favorited } = entry;
  if(isNew(entry)) return { method: 'POST', url: '/api/entry', body: { date, text } };

  const url = '/api/entry/' + serverId(entry);
  if(entry.deleted) return { method: 'DELETE', url };
  return { method: 'PATCH', url, body: { date, text, favorited: !!favorited } };
};

async function push (userId){
  for(const id of app.entries.filter(isDirty).map(e => e.id)){
    if(app.userId !== userId) return;
    const entry = app.entries.find(e => e.id === id);
    if(!entry || !isDirty(entry)) continue;
    const drop = list => list.filter(e => e.id !== id);
    if(isNew(entry)) {
      if(entry.deleted) { update(userId, drop); continue; }   // the server never had it
      if(!entry.text) continue;                                // nothing written yet
    }

    const { method, url, body } = request(entry);
    // A create cannot carry a favorite, so an entry already favorited stays unsent and goes again.
    const again = method === 'POST' && entry.favorited;
    const sent = again ? 0 : entry.needsSync;
    sending = userId + ':' + id;
    try {
      const data = await xhr(url, { method, body });
      await update(userId, list => method === 'DELETE' ? drop(list) : list.map(e => e.id === id ? accepted(e, sent, data?.id) : e));
      if(again) requested = true;
    } catch(res) {
      if(!res.status) throw res;   // no connection: stop. A refused request does not block the others.
    } finally {
      sending = undefined;
    }
  }
};

addEventListener('online', refresh);
