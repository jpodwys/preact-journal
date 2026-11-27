const test = require('node:test');
const assert = require('node:assert');
const EntryBl = require('../../server/bl/entry-bl');

// A stand-in for the entry service: entry 5 belongs to user 1, entry 5000 to user 2.
const setup = () => {
  const owners = { 5: 1, 5000: 2 };
  const writes = [];
  const service = {
    getEntryById: id => Promise.resolve(owners[id] ? { id, ownerId: owners[id] } : null),
    updateEntry: (id, body, deviceId, ownerId) => { writes.push(['update', id, ownerId]); return Promise.resolve(); },
    deleteEntry: (id, deviceId, ownerId) => { writes.push(['delete', id, ownerId]); return Promise.resolve(); }
  };
  return { bl: new EntryBl(service), writes };
};
const request = id => ({ params: { id }, body: { text: 'x' }, user: { id: 1, deviceId: '00000' } });

for(const method of ['updateEntry', 'deleteEntry']){
  const verb = method.replace('Entry', '');

  test(method + ' writes the checked numeric id, scoped to the owner', async () => {
    const { bl, writes } = setup();
    await bl[method](request('5'));
    assert.deepStrictEqual(writes, [[verb, 5, 1]]);
  });

  test(method + ' refuses another user\'s entry', async () => {
    const { bl, writes } = setup();
    await assert.rejects(bl[method](request('5000')), { status: 400 });
    assert.deepStrictEqual(writes, []);
  });

  // Each of these starts with an id user 1 owns, but is not that id to the database.
  test(method + ' refuses ids that are not plain digits', async () => {
    for(const id of ['5e3', '5abc', '5.1e3', '5 ', ' 5', '-5', '0x5', '', undefined]){
      const { bl, writes } = setup();
      await assert.rejects(bl[method](request(id)), { status: 400 }, String(id));
      assert.deepStrictEqual(writes, [], String(id));
    }
  });
}
