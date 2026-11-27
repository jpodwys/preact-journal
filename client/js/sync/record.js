// An entry and what is left to send for it, as pure functions.
//
//   `needsSync`  set while the server is behind. It counts the changes, so a response can tell whether the entry changed
//                again while its request was out. (Entries cached by earlier versions have `true`.)
//   `newEntry`   the server has never had it
//   `deleted`    a tombstone, kept until the server has deleted it
//
// `id` never changes once an entry exists on this device. `sid` is the server's id when that is a different number.
// An unsent entry is all or nothing: it is sent whole, and the server's copy does not replace any part of it.

export const serverId = entry => entry.sid || entry.id;
export const isNew = entry => !!entry.newEntry;
export const isDirty = entry => !!entry.needsSync;

export const edit = (entry, values) => ({ ...entry, ...values, needsSync: (entry.needsSync | 0) + 1 });

// The server accepted the entry as it was at revision `sent`, and knows it as `id`.
export const accepted = (entry, sent, id) => {
  const { needsSync, newEntry, postPending, ...rest } = entry;
  const next = id && id !== entry.id ? { ...rest, sid: id } : rest;
  return needsSync === sent ? next : { ...next, needsSync };
};

// The server's entries applied to a list, for a full fetch and for changes alike. A delete on the server wins.
export function merge (list, remotes){
  const incoming = new Map(remotes.map(({ deleted, ...r }) => [r.id, deleted ? { id: r.id, deleted } : r]));
  const kept = list.flatMap(entry => {
    const remote = !isNew(entry) && incoming.get(serverId(entry));
    if(!remote) return entry;
    incoming.delete(remote.id);
    if(remote.deleted) return [];
    if(isDirty(entry)) return entry;
    return entry.sid ? { ...remote, id: entry.id, sid: entry.sid } : remote;
  });
  return [...[...incoming.values()].filter(r => !r.deleted), ...kept];
}
