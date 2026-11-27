import fetchMock from 'fetch-mock';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { app } from '../app-state';
import { sync, refresh } from './index';
import { merge } from './record';
import { editEntry, deleteEntry, newEntry, toggleFavorite, loadAccount } from '../actions/entry-actions';
import { handleRouteChange } from '../actions/global-actions';
import { resetAll, seed, preserveLocation, settleNetwork, eventually, tick, ACCOUNT_1 } from '../actions/spec-helpers';

// A server that behaves like the real one where it matters: its own ids, tombstones, changes since a time (not this
// device's own), and a `favorited` that is left out when false.
function fakeServer () {
  const rows = new Map();
  let nextId = 100, clock = 1;
  const out = ({ at, by, favorited, deleted, ...row }) => deleted ? { id: row.id, deleted: 1 } : favorited ? { ...row, favorited: 1 } : row;
  const server = {
    rows, echo: false, online: true, hold: false, held: [], log: [], refuse: () => false,
    write (id, values, by) { rows.set(id, { ...rows.get(id), ...values, at: ++clock, by }); },
    create (values, by) { const id = nextId++; server.write(id, { id, favorited: false, ...values }, by); return id; },
    live: () => [...rows.values()].filter(r => !r.deleted).map(r => ({ id: r.id, date: r.date, text: r.text, favorited: !!r.favorited })),
    handle (url, { method = 'GET', body }) {
      const data = body && JSON.parse(body), id = +url.split('/').pop();
      server.log.push([method, url, data]);
      if(server.refuse(method, url, data)) return 500;
      if(method === 'POST') return { id: server.create(data, 'me') };
      if(method === 'PATCH') { server.write(id, data, 'me'); return 204; }
      if(method === 'DELETE') { server.write(id, { deleted: 1, text: '', favorited: false }, 'me'); return 204; }
      const since = url.indexOf('/sync/') > -1 ? id : undefined;
      const found = [...rows.values()].filter(r => since === undefined ? !r.deleted : r.at > since && (server.echo || r.by !== 'me'));
      return { timestamp: clock, entries: found.map(out) };
    },
    // Responds at once, or when released. Offline, the request never arrives.
    install () {
      fetchMock.mock(/\/api\/entr/, (url, opts) => {
        const answer = () => { if(!server.online) throw new TypeError('offline'); return server.handle(url, opts); };
        if(!server.hold) return Promise.resolve().then(answer);
        return new Promise((ok, no) => server.held.push(() => { try { ok(answer()); } catch(e) { no(e); } }));
      });
    },
    async release () { const next = server.held.shift(); if(next) next(); await tick(5); }
  };
  return server;
}

const view = e => ({ id: e.sid || e.id, date: e.date, text: e.text, favorited: !!e.favorited });
const byId = (a, b) => a.id - b.id;
const sentBy = (server, method) => server.log.filter(r => r[0] === method).map(r => r.slice(1));

describe('sync', () => {
  let server;
  preserveLocation();
  beforeEach(async () => {
    await resetAll({ accounts: [ACCOUNT_1] });
    server = fakeServer(); server.install();
    seed({ view: '/entries' });
  });
  afterEach(async () => { server.hold = false; while(server.held.length) await server.release(); await settleNetwork(); fetchMock.restore(); });

  const type = (text, i = 0) => { editEntry(app.entries[i].id, { text }); sync(); };
  const idle = async () => { await settleNetwork(); await tick(20); };

  it('persists locally with no request, then creates on sync, keeping the local id', async () => {
    newEntry();
    const { id } = app.entries[0];
    editEntry(id, { text: 'hello' });
    await eventually(async () => expect((await idbGet('entries_1'))[0]).to.include({ text: 'hello', newEntry: true }));
    expect(server.log).to.deep.equal([]);
    sync(); await idle();
    expect(app.entries[0]).to.include({ id, sid: 100, text: 'hello' });
    expect(app.entries[0]).to.not.have.property('needsSync');
  });

  it('sends the whole entry', async () => {
    server.write(5, { id: 5, date: 'd', text: 'a' }, 'other');
    seed({ entries: [{ id: 5, date: 'd', text: 'a' }] });
    type('b'); await idle();
    expect(sentBy(server, 'PATCH')).to.deep.equal([['/api/entry/5', { date: 'd', text: 'b', favorited: false }]]);
  });

  it('keeps one request out, then sends what changed meanwhile', async () => {
    server.hold = true;
    newEntry(); type('hello'); type('hello world');
    expect(server.held.length).to.equal(1);
    await server.release(); await server.release(); await idle();
    expect(sentBy(server, 'PATCH')).to.deep.equal([['/api/entry/100', { date: app.entries[0].date, text: 'hello world', favorited: false }]]);
    expect(server.live().map(r => r.text)).to.deep.equal(['hello world']);
  });

  it('keeps a later edit unsent when it fails after an earlier one succeeded', async () => {
    seed({ entries: [{ id: 5, date: 'd', text: 'a' }] });
    server.hold = true;
    type('ab'); type('abc');
    await server.release();
    server.online = false; await server.release(); await idle();
    expect(app.entries[0]).to.include({ text: 'abc' });
    expect(app.entries[0].needsSync).to.be.ok;
    expect(server.rows.get(5).text).to.equal('ab');
    server.online = true; server.hold = false; dispatchEvent(new Event('online')); await idle();
    expect(app.entries[0]).to.not.have.property('needsSync');
  });

  it('never sends an entry written and deleted offline', async () => {
    server.online = false;
    newEntry(); type('x'); await idle();
    deleteEntry({ id: app.entries[0].id }); await idle();
    expect(app.entries).to.deep.equal([]);
    expect(server.log).to.deep.equal([]);
  });

  it('deletes by server id an entry deleted while its create was out', async () => {
    server.hold = true;
    newEntry(); type('x');
    deleteEntry({ id: app.entries[0].id });
    handleRouteChange('/entries');
    await server.release(); await server.release(); await idle();
    expect(sentBy(server, 'DELETE')).to.deep.equal([['/api/entry/100', undefined]]);
    expect(app.entries).to.deep.equal([]);
  });

  it('never creates a blank entry', async () => {
    newEntry(); editEntry(app.entries[0].id, { text: 'a' }); editEntry(app.entries[0].id, { text: '' });
    sync(); await idle();
    handleRouteChange('/entries');
    expect(app.entries).to.deep.equal([]);
    expect(server.log).to.deep.equal([]);
  });

  it('keeps an entry with unsent changes whole, and sends it', async () => {
    server.write(5, { id: 5, date: 'theirs', text: 'theirs', favorited: false }, 'other');
    seed({ timestamp: 1, entries: [{ id: 5, date: 'old', text: 'mine', needsSync: 1 }] });
    refresh(); await idle();
    expect(app.entries[0]).to.deep.equal({ id: 5, date: 'old', text: 'mine' });
    expect(server.live()).to.deep.equal([{ id: 5, date: 'old', text: 'mine', favorited: false }]);
  });

  it('takes an unfavorite from the server, which omits the field', () => {
    const [entry] = merge([{ id: 5, date: 'd', text: 'a', favorited: true }], [{ id: 5, date: 'd', text: 'a' }]);
    expect(entry).to.deep.equal({ id: 5, date: 'd', text: 'a' });
  });

  it('retries a failed fetch on the next call', async () => {
    server.write(5, { id: 5, date: 'd', text: 'a' }, 'other');
    server.online = false; refresh(); await idle();
    server.online = true; sync(); await idle();
    expect(app.entries.map(e => e.id)).to.deep.equal([5]);
  });

  it('goes on to other entries when the server refuses one', async () => {
    server.refuse = (method, url) => url.endsWith('/5');
    seed({ entries: [{ id: 5, date: 'd', text: 'a' }, { id: 6, date: 'd', text: 'a' }] });
    editEntry(5, { text: 'b' }); editEntry(6, { text: 'b' }); sync(); await idle();
    expect(app.entries[0].needsSync).to.be.ok;
    expect(app.entries[1]).to.not.have.property('needsSync');
  });

  it('writes a response for a user switched away from to their cache', async () => {
    seed({ entries: [{ id: 5, date: 'd', text: 'a' }] });
    server.hold = true; type('b');
    await eventually(async () => expect((await idbGet('entries_1'))[0].text).to.equal('b'));
    app.userId = '2'; app.entries = [];
    await server.release(); await idle();
    expect(app.entries).to.deep.equal([]);
    await eventually(async () => expect((await idbGet('entries_1'))[0]).to.deep.equal({ id: 5, date: 'd', text: 'b' }));
  });

  it('writes nothing back for a user who has since logged out', async () => {
    server.write(5, { id: 5, date: 'd', text: 'secret' }, 'other');
    server.hold = true; refresh();
    app.accounts = []; app.userId = '';
    await server.release(); await idle();
    expect(await idbGet('entries_1')).to.be.undefined;
    expect(localStorage.getItem('timestamp_1')).to.be.null;
  });

  it('sends entries cached by the previous version', async () => {
    server.write(5, { id: 5, date: 'd', text: 'server' }, 'me');
    server.write(6, { id: 6, date: 'd', text: 'server', favorited: true }, 'me');
    server.write(7, { id: 7, date: 'd', text: 'server' }, 'me');
    await idbSet('entries_1', [
      { id: 1, date: 'd', text: 'new', newEntry: true, needsSync: true, postPending: true },
      { id: 5, date: 'd', text: 'edited', needsSync: true },
      { id: 6, date: 'd', text: 'server', favorited: false, needsSync: true },
      { id: 7, date: 'd', text: '', deleted: true, needsSync: true }
    ]);
    await loadAccount('1'); await idle();
    expect(server.live().sort(byId)).to.deep.equal([
      { id: 5, date: 'd', text: 'edited', favorited: false },
      { id: 6, date: 'd', text: 'server', favorited: false },
      { id: 100, date: 'd', text: 'new', favorited: false }
    ]);
    expect(app.entries).to.deep.equal([
      { id: 1, date: 'd', text: 'new', sid: 100 },
      { id: 5, date: 'd', text: 'edited' },
      { id: 6, date: 'd', text: 'server', favorited: false }
    ]);
  });

  // A known cost, accepted because two devices do not work on the same entry: an entry is sent whole, so saving a copy
  // that missed another device's change overwrites that change. (The server leaves a device's own writes out of its
  // changes, so the copy stays that way.)
  it('overwrites a change from another device when a stale copy is saved', async () => {
    server.write(5, { id: 5, date: 'd', text: 'a' }, 'me');
    seed({ timestamp: 2, entries: [{ id: 5, date: 'd', text: 'a' }] });
    server.write(5, { text: 'theirs' }, 'other');
    toggleFavorite({ id: 5, favorited: true }); await idle();
    refresh(); await idle();
    expect(app.entries[0].text).to.equal('a');
    expect(server.live()[0].text).to.equal('a');
  });

  it('follows a create with a favorite set before it', async () => {
    server.online = false;
    newEntry(); type('hi'); toggleFavorite({ id: app.entries[0].id, favorited: true }); await idle();
    server.online = true; sync(); await idle();
    expect(server.live()[0].favorited).to.be.true;
  });

  // Agreement alone would not notice work thrown away. Here only this device writes, and a separate record of what was
  // done on it says what the server must end up with, whatever the network and restarts did.
  it('loses nothing done on this device', async function () {
    this.timeout(60000);
    for(let seedNumber = 1; seedNumber <= 40; seedNumber++) {
      await resetAll({ accounts: [ACCOUNT_1] });
      server = fakeServer(); server.install();   // own writes are left out of changes, as the real server does
      seed({ view: '/entries' });
      let n = seedNumber * 7, step = 0;
      const random = max => (n = (n * 48271) % 2147483647) % max;
      const done = new Map(), trace = [];
      const pick = () => [...done.keys()][random(done.size)];
      const change = (id, values) => { done.set(id, { ...done.get(id), ...values }); };
      const actions = {
        create: async () => { await tick(2); newEntry(); const { id, date } = app.entries[0]; const text = 'new ' + ++step; change(id, { date, text, favorited: false }); type(text); },
        edit: () => { const id = pick(); if(!id) return; const text = 'edit ' + ++step; change(id, { text }); editEntry(id, { text }); if(random(2)) sync(); },
        favorite: () => { const id = pick(); if(!id) return; const favorited = !done.get(id).favorited; change(id, { favorited }); toggleFavorite({ id, favorited }); },
        remove: () => { const id = pick(); if(!id) return; done.delete(id); deleteEntry({ id }); },
        network: () => { server.online = !server.online; },
        hold: () => { server.hold = !server.hold; },
        release: () => server.release(),
        refresh: () => refresh(),
        restart: async () => { server.hold = false; while(server.held.length) await server.release(); await tick(10); await loadAccount('1', { userId: '1' }); }
      };
      const names = Object.keys(actions);
      for(let i = 0; i < 60; i++) {
        const name = names[random(names.length)];
        trace.push(name);
        await actions[name]();
        if(random(2)) await tick(1);
      }
      server.online = true; server.hold = false;
      while(server.held.length) await server.release();
      for(let i = 0; i < 3; i++) { sync(); await idle(); }

      const sorted = list => list.map(({ date, text, favorited }) => JSON.stringify([date, text, !!favorited])).sort();
      expect(sorted(server.live()), 'seed ' + seedNumber + ': ' + trace.join(' ')).to.deep.equal(sorted([...done.values()]));
      fetchMock.restore();
    }
  });

  // Random edits here and elsewhere, outages, held responses, refusals and restarts. Once things settle, the device and
  // the server must agree. Run against a server that reports every change, own ones included. A response lost AFTER the
  // server acted is not modelled.
  it('converges with the server whatever the order of events', async function () {
    this.timeout(60000);
    for(let seedNumber = 1; seedNumber <= 40; seedNumber++) {
      await resetAll({ accounts: [ACCOUNT_1] });
      server = fakeServer(); server.install();
      server.echo = true;
      seed({ view: '/entries' });
      let n = seedNumber, step = 0;
      const random = max => (n = (n * 48271) % 2147483647) % max;
      const trace = [];
      const pick = () => { const live = app.entries.filter(e => !e.deleted); return live[random(live.length)]; };
      const actions = {
        create: async () => { await tick(2); newEntry(); type('new ' + ++step); },   // ids are timestamps
        edit: () => { const e = pick(); if(e) { editEntry(e.id, { text: 'mine ' + ++step }); if(random(2)) sync(); } },
        favorite: () => { const e = pick(); if(e) toggleFavorite({ id: e.id, favorited: !e.favorited }); },
        remove: () => { const e = pick(); if(e) deleteEntry({ id: e.id }); },
        elsewhere: () => { const rows = server.live(); const r = rows[random(rows.length)];
          if(!r || !random(4)) server.create({ date: 'd', text: 'theirs ' + ++step }, 'other');
          else server.write(r.id, random(5) ? { date: 'date ' + ++step, favorited: !!random(2) } : { deleted: 1, text: '' }, 'other'); },
        network: () => { server.online = !server.online; },
        hold: () => { server.hold = !server.hold; },
        release: () => server.release(),
        refresh: () => refresh(),
        restart: async () => {
          // Everything in flight finishes or fails, then the app reads its cache again.
          server.hold = false; while(server.held.length) await server.release(); await tick(10);
          await loadAccount('1', { userId: '1' });
        }
      };
      const names = Object.keys(actions);
      for(let i = 0; i < 60; i++) {
        const name = names[random(names.length)];
        trace.push(name);
        await actions[name]();
        if(random(2)) await tick(1);
      }
      server.online = true; server.hold = false;
      while(server.held.length) await server.release();
      for(let i = 0; i < 3; i++) { refresh(); await idle(); }

      const here = app.entries.filter(e => !e.deleted && !(e.newEntry && !e.text)).map(view).sort(byId);
      if(JSON.stringify(here) !== JSON.stringify(server.live().sort(byId))) throw new Error('seed ' + seedNumber + '\nHERE ' + JSON.stringify(here) + '\nSRVR ' + JSON.stringify(server.live().sort(byId)) + '\nRAW ' + JSON.stringify(app.entries) + '\n' + trace.join(' '));
      expect(app.entries.filter(e => e.needsSync && !(e.newEntry && !e.text)), 'seed ' + seedNumber + ' unsent').to.deep.equal([]);
      fetchMock.restore();
    }
  });
});
