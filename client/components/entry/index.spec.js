import { h } from 'preact';
import { mount, fireEvent } from '../../../test/mount';
import Entry from './index';

describe('entry (DOM)', () => {
  let env;
  afterEach(() => { if(env) env.cleanup(); env = null; });

  function mountEntry (state = {}, actions = {}) {
    return mount(h(Entry, null), {
      state: Object.assign(
        { view: '/entry', entry: null, viewEntries: [], entryIndex: -1 },
        state
      ),
      actions
    });
  }

  it('renders the 404 component when there is no entry', () => {
    env = mountEntry({ entry: null });
    expect(env.getByText("Looks like that doesn't exist!")).to.exist;
    expect(env.host.querySelector('.entry')).to.not.exist;
  });

  it('renders the entry date and text in contenteditable elements', () => {
    env = mountEntry({
      entry: { id: 5, date: '2024-04-04', text: 'hello world' },
      viewEntries: [{ id: 5 }],
      entryIndex: 0
    });
    const date = env.host.querySelector('#entryDate');
    const text = env.host.querySelector('#entryText');
    expect(date.textContent.trim()).to.equal('2024-04-04');
    expect(text.textContent.trim()).to.equal('hello world');
    expect(date.hasAttribute('contenteditable')).to.be.true;
    expect(text.hasAttribute('contenteditable')).to.be.true;
  });

  describe('navigation arrows on /entry', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];

    it('hides the left arrow at the first entry and shows a rotated right arrow', () => {
      env = mountEntry({ entry: items[0], viewEntries: items, entryIndex: 0 });
      const arrows = env.host.querySelectorAll('svg[icon="left"]');
      expect(arrows.length).to.equal(2);
      expect(arrows[0].classList.contains('hidden')).to.be.true;
      expect(arrows[1].classList.contains('hidden')).to.be.false;
      expect(arrows[1].classList.contains('rotate180')).to.be.true;
    });

    it('hides the right arrow at the last entry', () => {
      env = mountEntry({ entry: items[2], viewEntries: items, entryIndex: 2 });
      const arrows = env.host.querySelectorAll('svg[icon="left"]');
      expect(arrows[0].classList.contains('hidden')).to.be.false;
      expect(arrows[1].classList.contains('hidden')).to.be.true;
    });

    it('shows both arrows for a middle entry', () => {
      env = mountEntry({ entry: items[1], viewEntries: items, entryIndex: 1 });
      const arrows = env.host.querySelectorAll('svg[icon="left"]');
      expect(arrows[0].classList.contains('hidden')).to.be.false;
      expect(arrows[1].classList.contains('hidden')).to.be.false;
    });

    it('fires shiftEntry(-1) when the left arrow is clicked', () => {
      const shiftEntry = sinon.spy();
      env = mountEntry(
        { entry: items[1], viewEntries: items, entryIndex: 1 },
        { shiftEntry }
      );
      fireEvent.click(env.host.querySelectorAll('svg[icon="left"]')[0]);
      expect(shiftEntry.calledOnce).to.be.true;
      expect(shiftEntry.args[0][1]).to.equal(-1);
    });

    it('fires shiftEntry(1) when the right arrow is clicked', () => {
      const shiftEntry = sinon.spy();
      env = mountEntry(
        { entry: items[1], viewEntries: items, entryIndex: 1 },
        { shiftEntry }
      );
      fireEvent.click(env.host.querySelectorAll('svg[icon="left"]')[1]);
      expect(shiftEntry.calledOnce).to.be.true;
      expect(shiftEntry.args[0][1]).to.equal(1);
    });
  });

  describe('on /new', () => {
    it('does not render the navigation arrows', () => {
      env = mountEntry({
        view: '/new',
        entry: { id: 'new', date: '', text: '', newEntry: true }
      });
      expect(env.host.querySelector('svg[icon="left"]')).to.not.exist;
      expect(env.host.querySelector('#entryDate')).to.exist;
      expect(env.host.querySelector('#entryText')).to.exist;
    });
  });

  describe('editing flow (debounced)', () => {
    let clock;
    beforeEach(() => { clock = sinon.useFakeTimers(); });
    afterEach(() => clock.restore());

    it('fires updateEntry with the new text after the debounce window', () => {
      const updateEntry = sinon.spy();
      const entry = { id: 5, date: '2024-01-01', text: 'original' };
      env = mountEntry(
        { entry, viewEntries: [entry], entryIndex: 0 },
        { updateEntry }
      );

      const text = env.host.querySelector('#entryText');
      text.innerText = 'edited text';
      fireEvent.input(text);

      expect(updateEntry.called).to.be.false;
      clock.tick(499);
      expect(updateEntry.called).to.be.false;
      clock.tick(1);

      expect(updateEntry.calledOnce).to.be.true;
      expect(updateEntry.args[0][1]).to.deep.equal({
        entry: { text: 'edited text' },
        property: 'text',
        entryId: 5
      });
    });

    it('fires updateEntry with the new date when the date field is edited', () => {
      const updateEntry = sinon.spy();
      const entry = { id: 7, date: '2024-01-01', text: 'unchanged' };
      env = mountEntry(
        { entry, viewEntries: [entry], entryIndex: 0 },
        { updateEntry }
      );

      const date = env.host.querySelector('#entryDate');
      date.innerText = '  2025-12-31  ';
      fireEvent.input(date);
      clock.tick(500);

      expect(updateEntry.calledOnce).to.be.true;
      expect(updateEntry.args[0][1]).to.deep.equal({
        entry: { date: '2025-12-31' },
        property: 'date',
        entryId: 7
      });
    });

    it('coalesces a burst of edits into a single updateEntry call', () => {
      const updateEntry = sinon.spy();
      const entry = { id: 5, date: 'd', text: 'a' };
      env = mountEntry(
        { entry, viewEntries: [entry], entryIndex: 0 },
        { updateEntry }
      );

      const text = env.host.querySelector('#entryText');
      text.innerText = 'ab';
      fireEvent.input(text);
      clock.tick(200);
      text.innerText = 'abc';
      fireEvent.input(text);
      clock.tick(200);
      text.innerText = 'abcd';
      fireEvent.input(text);
      clock.tick(500);

      expect(updateEntry.calledOnce).to.be.true;
      expect(updateEntry.args[0][1].entry.text).to.equal('abcd');
    });

    it('fires createEntry with date and text read from the DOM for a new entry', () => {
      const createEntry = sinon.spy();
      env = mountEntry(
        {
          view: '/new',
          entry: { newEntry: true, id: 'new', date: '', text: '' }
        },
        { createEntry }
      );

      env.host.querySelector('#entryDate').innerText = '2024-12-25';
      env.host.querySelector('#entryText').innerText = 'first entry';
      fireEvent.input(env.host.querySelector('#entryText'));
      clock.tick(500);

      expect(createEntry.calledOnce).to.be.true;
      const payload = createEntry.args[0][1];
      expect(payload.entry.date).to.equal('2024-12-25');
      expect(payload.entry.text).to.equal('first entry');
    });
  });
});
