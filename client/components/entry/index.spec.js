import { h } from '../../packages/kyvo/core';
import fetchMock from 'fetch-mock';
import { mount, fireEvent, waitFor, nextRender } from '../../../test/mount';
import { mockUpdateEntry, mockCreateEntry, lastBody } from '../../../test/api-mocks';
import { app, selected } from '../../js/app-state';
import { handleRouteChange } from '../../js/actions/global-actions';
import Router from '../router';
import Entry from './index';

describe('entry', () => {
  let env, clock;
  afterEach(() => {
    if(env) env.cleanup();
    env = null;
    if(clock) clock.restore();
    clock = null;
    fetchMock.restore();
    history.replaceState(null, '', '/');
  });

  // Fake only timers: rendering runs on requestAnimationFrame, which must stay real.
  const fakeTimers = () => { clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); };

  function mountEntry (state = {}) {
    return mount(h(Entry, null), {
      // `view` goes first: the app-state watcher reacts to view writes.
      state: Object.assign(
        { view: '/entry', userId: '1', entry: null, viewEntries: [], entryIndex: -1 },
        state
      )
    });
  }

  const $ed = () => env.host.querySelector('#ed');
  const $et = () => env.host.querySelector('#et');
  // Browsers edit the existing text node while the user types; do the same so
  // a re-render that rewrote the node would visibly clobber the typing.
  const type = (el, text) => {
    if(el.firstChild && el.firstChild.nodeType === 3) el.firstChild.data = text;
    else el.textContent = text;
  };

  it('renders a not-found heading when there is no entry', () => {
    env = mountEntry({ entry: null });
    expect(env.getByRole('heading').textContent).to.equal("Looks like that doesn't exist!");
  });

  it('renders the entry date and text in contenteditable elements', () => {
    env = mountEntry({
      entry: { id: 5, date: '2024-04-04', text: 'hello world' },
      viewEntries: [{ id: 5 }],
      entryIndex: 0
    });
    expect($ed().textContent.trim()).to.equal('2024-04-04');
    expect($et().textContent.trim()).to.equal('hello world');
    expect($ed().hasAttribute('contenteditable')).to.be.true;
    expect($et().getAttribute('contenteditable')).to.equal('plaintext-only');
  });

  describe('navigation arrows on /entry', () => {
    const items = [{ id: 1, date: '2024-01-03', text: 'one' }, { id: 2, date: '2024-01-02', text: 'two' }, { id: 3, date: '2024-01-01', text: 'three' }];

    it('hides the left arrow at the first entry and shows the right rotated', () => {
      env = mountEntry({ entry: items[0], viewEntries: items, entryIndex: 0 });
      expect(env.getByRole('button', { name: 'Previous entry' }).classList.contains('hidden')).to.be.true;
      const next = env.getByRole('button', { name: 'Next entry' });
      expect(next.classList.contains('hidden')).to.be.false;
      expect(next.classList.contains('rotate180')).to.be.true;
    });

    it('hides the right arrow at the last entry', () => {
      env = mountEntry({ entry: items[2], viewEntries: items, entryIndex: 2 });
      expect(env.getByRole('button', { name: 'Previous entry' }).classList.contains('hidden')).to.be.false;
      expect(env.getByRole('button', { name: 'Next entry' }).classList.contains('hidden')).to.be.true;
    });

    it('shows both arrows for a middle entry', () => {
      env = mountEntry({ entry: items[1], viewEntries: items, entryIndex: 1 });
      expect(env.getByRole('button', { name: 'Previous entry' }).classList.contains('hidden')).to.be.false;
      expect(env.getByRole('button', { name: 'Next entry' }).classList.contains('hidden')).to.be.false;
    });

    it('clicking the left arrow navigates (replace) to the previous entry', () => {
      history.replaceState(null, '', '/entry/2');
      const replaceSpy = sinon.spy(history, 'replaceState');
      try {
        env = mountEntry({ entry: items[1], viewEntries: items, entryIndex: 1 });
        fireEvent.click(env.getByRole('button', { name: 'Previous entry' }));
        expect(replaceSpy.calledOnce).to.be.true;
        expect(location.pathname).to.equal('/entry/1');
      } finally {
        replaceSpy.restore();
      }
    });

    it('clicking the right arrow navigates (replace) to the next entry', () => {
      history.replaceState(null, '', '/entry/2');
      env = mountEntry({ entry: items[1], viewEntries: items, entryIndex: 1 });
      fireEvent.click(env.getByRole('button', { name: 'Next entry' }));
      expect(location.pathname).to.equal('/entry/3');
    });

    it('clicking through with the real router reseeds date and text from the new entry', async () => {
      history.replaceState(null, '', '/entry/2');
      env = mount(
        h(Router, { onChange: handleRouteChange }, h(Entry, { path: '/entry/:id' })),
        { state: { view: '/entry', userId: '1', entries: items } }
      );
      const shows = (text, date) => waitFor(() => {
        expect($et().textContent).to.equal(text);
        expect($ed().textContent).to.equal(date);
      });
      await shows('two', '2024-01-02');

      fireEvent.click(env.getByRole('button', { name: 'Next entry' }));
      expect(location.pathname).to.equal('/entry/3');
      expect(selected()[0].id).to.equal(3);
      await shows('three', '2024-01-01');

      fireEvent.click(env.getByRole('button', { name: 'Previous entry' }));
      await shows('two', '2024-01-02');
      fireEvent.click(env.getByRole('button', { name: 'Previous entry' }));
      await shows('one', '2024-01-03');
      expect(env.getByRole('button', { name: 'Previous entry' }).classList.contains('hidden')).to.be.true;
    });
  });

  describe('local copies of date/text', () => {
    const entry = { id: 5, date: '2024-01-01', text: 'original' };

    it('an unrelated store write never touches text the user is typing', async () => {
      env = mountEntry({ entry, entries: [entry], viewEntries: [entry], entryIndex: 0 });
      type($et(), 'typed but not saved');
      type($ed(), '2030-01-01');
      app.dark = !app.dark;
      app.filterText = 'x';
      await nextRender();
      expect($et().textContent).to.equal('typed but not saved');
      expect($ed().textContent).to.equal('2030-01-01');
      document.body.classList.remove('dark');
    });

    it('the debounced save writing the entry back does not clobber typing that continued', async () => {
      fakeTimers();
      mockUpdateEntry(5);
      env = mountEntry({ entry, entries: [entry], viewEntries: [entry], entryIndex: 0 });
      const et = $et();
      type(et, 'hello');
      fireEvent.input(et);
      clock.tick(500);
      // The save wrote { text: 'hello' } into selected()[0]; the user kept typing
      // before the next frame rendered it.
      expect(selected()[0].text).to.equal('hello');
      type(et, 'hello wor');
      await nextRender();
      expect($et()).to.equal(et);
      expect(et.textContent).to.equal('hello wor');
    });

    it('a store write of a different entry id reseeds date and text', async () => {
      env = mountEntry({ entry, entries: [entry], viewEntries: [entry], entryIndex: 0 });
      type($et(), 'stale typing');
      Object.assign(app, { entries: [{ id: 6, date: '2024-02-02', text: 'other entry' }], entryId: 6 });
      await waitFor(() => expect($et().textContent).to.equal('other entry'));
      expect($ed().textContent).to.equal('2024-02-02');
    });

    it('a store write of the same entry id with new text does not reseed', async () => {
      env = mountEntry({ entry, entries: [entry], viewEntries: [entry], entryIndex: 0 });
      app.entries = [Object.assign({}, entry, { text: 'changed elsewhere' })];
      await nextRender();
      expect($et().textContent).to.equal('original');
    });
  });

  describe('on /new', () => {
    afterEach(() => { if(document.activeElement) document.activeElement.blur(); });

    it('does not render the navigation arrows', () => {
      env = mountEntry({
        view: '/new',
        entry: { id: 1000, date: '', text: '', newEntry: true }
      });
      expect(env.queryByRole('button', { name: 'Previous entry' })).to.not.exist;
      expect(env.queryByRole('button', { name: 'Next entry' })).to.not.exist;
      expect($ed()).to.exist;
      expect($et()).to.exist;
    });

    it('focuses #et when mounted directly on /new', () => {
      env = mountEntry({ view: '/new', entry: { id: 1000, date: '2024-12-25', text: '', newEntry: true } });
      expect(document.activeElement).to.equal($et());
    });

    it('focuses #et when transitioning from an existing entry to /new', async () => {
      env = mountEntry({
        view: '/entry',
        entry: { id: 5, date: '2024-04-04', text: 'old' },
        viewEntries: [{ id: 5 }],
        entryIndex: 0
      });
      expect(document.activeElement).to.not.equal($et());

      const blank = { id: 1000, date: '2024-12-25', text: '', newEntry: true };
      Object.assign(app, { view: '/new', entries: [blank, ...app.entries], entryId: 1000 });
      await waitFor(() => expect(document.activeElement.id).to.equal('et'));

      expect($ed().textContent).to.equal('2024-12-25');
    });

    it('does not steal focus back from the date field on later renders', async () => {
      env = mountEntry({ view: '/new', entry: { id: 1000, date: '2024-12-25', text: '', newEntry: true } });
      expect(document.activeElement).to.equal($et());

      $ed().focus();
      type($ed(), '2024-12-26');
      fireEvent.input($ed());
      app.dark = !app.dark;
      await nextRender();
      app.filterText = 'y';
      await nextRender();

      expect(document.activeElement).to.equal($ed());
      expect($ed().textContent).to.equal('2024-12-26');
      document.body.classList.remove('dark');
    });
  });

  describe('editing flow (debounced)', () => {
    beforeEach(fakeTimers);

    it('PATCHes the new text after the debounce window and updates the store', async () => {
      mockUpdateEntry(5);
      const entry = { id: 5, date: '2024-01-01', text: 'original' };
      env = mountEntry({ entry, entries: [entry], viewEntries: [entry], entryIndex: 0 });

      type($et(), 'edited text');
      fireEvent.input($et());

      clock.tick(499);
      expect(fetchMock.called('/api/entry/5')).to.be.false;
      clock.tick(1);

      expect(fetchMock.calls('/api/entry/5').length).to.equal(1);
      expect(fetchMock.lastOptions('/api/entry/5').method).to.equal('PATCH');
      expect(lastBody('/api/entry/5')).to.deep.equal({ text: 'edited text' });
      expect(selected()[0]).to.include({ id: 5, text: 'edited text', needsSync: true });
      expect(app.entries[0].text).to.equal('edited text');

      await waitFor(() => expect(app.entries[0].needsSync).to.be.undefined);
    });

    it('PATCHes the trimmed date when the date field is edited', () => {
      mockUpdateEntry(7);
      const entry = { id: 7, date: '2024-01-01', text: 'unchanged' };
      env = mountEntry({ entry, entries: [entry], viewEntries: [entry], entryIndex: 0 });

      type($ed(), '  2025-12-31  ');
      fireEvent.input($ed());
      clock.tick(500);

      expect(fetchMock.calls('/api/entry/7').length).to.equal(1);
      expect(lastBody('/api/entry/7')).to.deep.equal({ date: '2025-12-31' });
      expect(app.entries[0].date).to.equal('2025-12-31');
    });

    it('coalesces a burst of edits into a single PATCH of the last text', () => {
      mockUpdateEntry(5);
      const entry = { id: 5, date: 'd', text: 'a' };
      env = mountEntry({ entry, entries: [entry], viewEntries: [entry], entryIndex: 0 });

      const et = $et();
      type(et, 'ab'); fireEvent.input(et);
      clock.tick(200);
      type(et, 'abc'); fireEvent.input(et);
      clock.tick(200);
      type(et, 'abcd'); fireEvent.input(et);
      clock.tick(500);

      expect(fetchMock.calls('/api/entry/5').length).to.equal(1);
      expect(lastBody('/api/entry/5')).to.deep.equal({ text: 'abcd' });
    });

    it('POSTs a new entry with date and text read from the DOM, then adopts the server id', async () => {
      mockCreateEntry({ id: 42 });
      const entry = { id: 1000, date: '', text: '', newEntry: true, needsSync: true };
      env = mountEntry({ view: '/new', entry, entries: [entry] });

      type($ed(), '2024-12-25');
      type($et(), 'first entry');
      fireEvent.input($et());
      clock.tick(500);

      expect(fetchMock.calls('/api/entry').length).to.equal(1);
      expect(fetchMock.lastOptions('/api/entry').method).to.equal('POST');
      expect(lastBody('/api/entry')).to.deep.equal({ date: '2024-12-25', text: 'first entry' });
      expect(selected()[0]).to.include({ id: 1000, text: 'first entry', postPending: true });

      await waitFor(() => expect(app.entries[0]).to.deep.equal({ id: 42, date: '2024-12-25', text: 'first entry' }));
      await nextRender();                                // the editor must survive rendering the new id
      expect(selected()[0].id).to.equal(42);
      expect($et().textContent).to.equal('first entry');
    });

    it('keeps the same editor element, caret and typing when the first save swaps the client id for the server id', async () => {
      mockCreateEntry({ id: 42 });
      const entry = { id: 1000, date: '', text: '', newEntry: true, needsSync: true };
      env = mountEntry({ view: '/new', entry, entries: [entry] });
      const et = $et();

      type($ed(), '2024-12-25');
      type(et, 'first entry');
      fireEvent.input(et);
      clock.tick(500);                                   // the POST goes out

      // The user keeps typing while it is in flight, with the caret after "first entry and".
      type(et, 'first entry and more');
      const range = document.createRange();
      range.setStart(et.firstChild, 'first entry and'.length);
      range.collapse(true);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      // The response arrives: id 1000 becomes 42. Then render it, which must leave the editor alone.
      await waitFor(() => expect(selected()[0].id).to.equal(42));
      await nextRender();
      expect($et(), 'the editor was not rebuilt').to.equal(et);
      expect($et().textContent, 'what was typed meanwhile survives').to.equal('first entry and more');
      expect(selection.anchorNode, 'the caret is still in the same text node').to.equal(et.firstChild);
      expect(selection.anchorOffset, 'and at the same place').to.equal('first entry and'.length);
    });

    it('rebuilds the editor when the user moves to a different entry', async () => {
      const a = { id: 1, date: '2024-01-01', text: 'a' }, b = { id: 2, date: '2024-01-02', text: 'b' };
      env = mountEntry({ view: '/entry', entry: a, entries: [a, b], viewEntries: [a, b], entryIndex: 0 });
      const first = $et();
      app.entryId = b.id;
      await waitFor(() => expect($et().textContent).to.equal('b'));
      expect($et()).to.not.equal(first);
    });

    it('a pending save runs, and is not lost, when the entry unmounts', () => {
      mockUpdateEntry(5);
      const entry = { id: 5, date: '2024-01-01', text: 'original' };
      env = mountEntry({ entry, entries: [entry], viewEntries: [entry], entryIndex: 0 });
      type($et(), 'edited');
      fireEvent.input($et());
      expect(fetchMock.called('/api/entry/5')).to.be.false;   // still debouncing
      env.cleanup();
      env = null;
      expect(fetchMock.calls('/api/entry/5').length).to.equal(1);   // saved on the way out
      expect(lastBody('/api/entry/5')).to.deep.equal({ text: 'edited' });
      clock.tick(500);
      expect(fetchMock.calls('/api/entry/5').length).to.equal(1);   // and only once
    });

    it('leaving a brand-new entry within the debounce window still creates it (DOM read while attached)', () => {
      mockCreateEntry({ id: 42 });
      const entry = { id: 1000, date: '', text: '', newEntry: true, needsSync: true };
      env = mountEntry({ view: '/new', entry, entries: [entry] });
      type($ed(), '2024-12-25');
      type($et(), 'typed then left');
      fireEvent.input($et());
      env.cleanup();
      env = null;
      expect(fetchMock.calls('/api/entry').length).to.equal(1);
      expect(lastBody('/api/entry')).to.deep.equal({ date: '2024-12-25', text: 'typed then left' });
      clock.tick(500);
      expect(fetchMock.calls('/api/entry').length).to.equal(1);
    });

    it('typing in a second entry within the window saves both entries, each on its own timer', async () => {
      mockUpdateEntry(1);
      mockUpdateEntry(2);
      const items = [{ id: 1, date: '2024-01-02', text: 'one' }, { id: 2, date: '2024-01-01', text: 'two' }];
      env = mountEntry({ entry: items[0], entries: items, viewEntries: items, entryIndex: 0 });

      type($et(), 'one edited');
      fireEvent.input($et());
      app.entryId = items[1].id;
      await waitFor(() => expect($et().textContent).to.equal('two'));
      type($et(), 'two edited');
      fireEvent.input($et());                       // entry 2 gets its own debounce; entry 1's is not replaced
      expect(fetchMock.called('/api/entry/1')).to.be.false;
      expect(fetchMock.called('/api/entry/2')).to.be.false;
      clock.tick(500);
      expect(fetchMock.calls('/api/entry/1').length).to.equal(1);
      expect(lastBody('/api/entry/1')).to.deep.equal({ text: 'one edited' });
      expect(fetchMock.calls('/api/entry/2').length).to.equal(1);
      expect(lastBody('/api/entry/2')).to.deep.equal({ text: 'two edited' });
    });

    it('a save still pending when navigating to another entry goes to the entry that was edited', async () => {
      mockUpdateEntry(1);
      mockUpdateEntry(2);
      const items = [{ id: 1, date: '2024-01-02', text: 'one' }, { id: 2, date: '2024-01-01', text: 'two' }];
      env = mountEntry({ entry: items[0], entries: items, viewEntries: items, entryIndex: 0 });

      type($et(), 'one edited');
      fireEvent.input($et());
      app.entryId = items[1].id;
      await waitFor(() => expect($et().textContent).to.equal('two'));
      clock.tick(500);

      expect(fetchMock.called('/api/entry/2')).to.be.false;
      expect(lastBody('/api/entry/1')).to.deep.equal({ text: 'one edited' });
      expect(app.entries.find(e => e.id === 1).text).to.equal('one edited');
      expect(app.entries.find(e => e.id === 2).text).to.equal('two');
      // The late save must not pull the screen back to entry 1.
      expect(selected()[0].id).to.equal(2);
      await nextRender();
      expect($et().textContent).to.equal('two');
    });
  });
});
