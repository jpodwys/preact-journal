import { h } from 'preact';
import { mount, fireEvent } from '../../../test/mount';
import EntryPreview from './index';

describe('entry-preview (DOM)', () => {
  let env;
  afterEach(() => { if(env) env.cleanup(); env = null; });

  function mountPreview (entry, filterText = '', actions = {}) {
    return mount(h(EntryPreview, null), {
      state: { entry, filterText },
      actions
    });
  }

  describe('rendering', () => {
    it('shows the entry date, full text, and a link to the entry', () => {
      env = mountPreview({ id: 7, date: '2024-05-04', text: 'Plain entry' });
      expect(env.getByText('2024-05-04')).to.exist;
      expect(env.getByText('Plain entry')).to.exist;
      expect(env.host.querySelector('a').getAttribute('href')).to.equal('/entry/7');
    });

    it('highlights the matched substring inside previewText', () => {
      env = mountPreview(
        { id: 8, date: '2024-05-04', text: 'noise', previewText: 'before MATCH after' },
        'match'
      );
      const highlight = env.host.querySelector('.highlight');
      expect(highlight).to.exist;
      expect(highlight.textContent).to.equal('MATCH');
      expect(env.host.textContent).to.contain('before ');
      expect(env.host.textContent).to.contain(' after');
    });
  });

  describe('favorite icon', () => {
    it('shows star-filled (visible) when the entry is favorited', () => {
      env = mountPreview({ id: 1, date: 'd', text: 't', favorited: true });
      const icon = env.host.querySelector('svg[icon="star-filled"]');
      expect(icon).to.exist;
      expect(icon.classList.contains('hide-icon')).to.be.false;
    });

    it('shows star-empty (hidden until hover) when the entry is not favorited', () => {
      env = mountPreview({ id: 1, date: 'd', text: 't', favorited: false });
      const icon = env.host.querySelector('svg[icon="star-empty"]');
      expect(icon).to.exist;
      expect(icon.classList.contains('hide-icon')).to.be.true;
    });
  });

  describe('interactions', () => {
    it('fires showConfirmDeleteEntryModal with the entry when delete is clicked', () => {
      const showConfirmDeleteEntryModal = sinon.spy();
      const entry = { id: 9, date: 'd', text: 't' };
      env = mountPreview(entry, '', { showConfirmDeleteEntryModal });
      fireEvent.click(env.host.querySelector('svg[icon="delete"]'));
      expect(showConfirmDeleteEntryModal.calledOnce).to.be.true;
      expect(showConfirmDeleteEntryModal.args[0][1].entry).to.equal(entry);
    });

    it('fires toggleFavorite with id and inverted favorited when the favorite icon is clicked', () => {
      const toggleFavorite = sinon.spy();
      const entry = { id: 9, date: 'd', text: 't', favorited: true };
      env = mountPreview(entry, '', { toggleFavorite });
      fireEvent.click(env.host.querySelector('svg[icon="star-filled"]'));
      expect(toggleFavorite.calledOnce).to.be.true;
      expect(toggleFavorite.args[0][1]).to.deep.equal({ id: 9, favorited: false });
    });
  });
});
