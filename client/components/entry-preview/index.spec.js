import { h } from '../../packages/kyvo/core';
import fetchMock from 'fetch-mock';
import { mount, fireEvent, settle } from '../../../test/mount';
import { app } from '../../js/app-state';
import { mockUpdateEntry, lastBody } from '../../../test/api-mocks';
import EntryPreview from './index';

describe('entry-preview', () => {
  let env;
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    if(env) env.cleanup();
    env = null;
    fetchMock.restore();
    localStorage.clear();
  });

  function mountPreview (entry, filterText = '', props = {}, state = {}) {
    return mount(h(EntryPreview, { entry, filterText, ...props }), { state });
  }

  describe('rendering', () => {
    it('shows the entry date, full text, and a link to the entry', () => {
      env = mountPreview({ id: 7, date: '2024-05-04', text: 'Plain entry' });
      expect(env.getByText('2024-05-04')).to.exist;
      expect(env.getByText('Plain entry')).to.exist;
      expect(env.getByRole('link').getAttribute('href')).to.equal('/entry/7');
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
      expect(env.queryByText('noise')).to.be.null;
    });
  });

  describe('favorite icon', () => {
    it('shows star-filled (visible) when the entry is favorited', () => {
      env = mountPreview({ id: 1, date: 'd', text: 't', favorited: true });
      const icon = env.getByRole('button', { name: 'Toggle favorite' });
      expect(icon.getAttribute('icon')).to.equal('star-filled');
      expect(icon.classList.contains('hide-icon')).to.be.false;
    });

    it('shows star-empty (hidden until hover) when the entry is not favorited', () => {
      env = mountPreview({ id: 1, date: 'd', text: 't', favorited: false });
      const icon = env.getByRole('button', { name: 'Toggle favorite' });
      expect(icon.getAttribute('icon')).to.equal('star-empty');
      expect(icon.classList.contains('hide-icon')).to.be.true;
    });
  });

  describe('slide-in animation', () => {
    const entry = { id: 1, date: '2024-01-01', text: 'incoming' };

    it('applies fade-right when the list says the row is fresh', () => {
      env = mountPreview(entry, '', { fresh: true });
      expect(env.host.querySelector('.fade-right'), 'fade-right class applied').to.exist;
    });

    it('does not animate a row that is not fresh', () => {
      env = mountPreview(entry, '', { fresh: false });
      expect(env.host.querySelector('.fade-right')).to.not.exist;
      env.cleanup();
      env = mountPreview(entry);                                  // no prop at all
      expect(env.host.querySelector('.fade-right')).to.not.exist;
    });

    it('ignores a legacy slideIn flag left on a stored entry', () => {
      const legacy = { ...entry, slideIn: true };
      env = mountPreview(legacy);
      expect(env.host.querySelector('.fade-right')).to.not.exist;
    });
  });

  describe('share icon', () => {
    let original;
    beforeEach(() => { original = Object.getOwnPropertyDescriptor(navigator, 'share'); });
    afterEach(() => {
      if(original) Object.defineProperty(navigator, 'share', original);
      else delete navigator.share;
    });

    it('renders and calls navigator.share with the entry text when share is supported', () => {
      const shareSpy = sinon.spy();
      Object.defineProperty(navigator, 'share', { configurable: true, value: shareSpy });

      env = mountPreview({ id: 9, date: '2024-05-01', text: 'shareable' });
      fireEvent.click(env.getByRole('button', { name: 'Share entry' }));

      expect(shareSpy.calledOnce).to.be.true;
      expect(shareSpy.args[0][0]).to.deep.equal({ text: '2024-05-01 shareable' });
    });

    it('omits the share icon when navigator.share is unavailable', () => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      env = mountPreview({ id: 9, date: '2024-05-01', text: 'shareable' });
      expect(env.queryByRole('button', { name: 'Share entry' })).to.be.null;
    });
  });

  describe('interactions', () => {
    it('opens the delete confirmation for this entry when delete is clicked', () => {
      const entry = { id: 9, date: 'd', text: 't' };
      env = mountPreview(entry);
      fireEvent.click(env.getByRole('button', { name: 'Delete entry' }));
      expect(app.dialogMode).to.equal('modal:delete');
      expect(app.entryId).to.equal(9);
    });

    it('toggles favorited in the store and PATCHes the inverted value when the favorite icon is clicked', async () => {
      mockUpdateEntry(9);
      const entry = { id: 9, date: 'd', text: 't', favorited: true };
      env = mountPreview(entry, '', {}, { entries: [entry] });
      fireEvent.click(env.getByRole('button', { name: 'Toggle favorite' }));
      expect(app.entries[0].favorited).to.be.false;
      expect(lastBody('/api/entry/9')).to.deep.equal({ favorited: false });
      await settle();
    });
  });
});
