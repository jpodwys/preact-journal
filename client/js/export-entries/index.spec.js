import exportEntries from './index';
import { app, resetState } from '../app-state';

// exportEntries closes the dialog by writing the store, which is asserted directly. The download is
// observed through the DOM prototype / URL statics, which sinon can stub.
describe('exportEntries', () => {
  let createObjectURL;
  let revokeObjectURL;
  let click;
  let clock;

  const readBlob = blob => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(blob);
  });

  beforeEach(() => {
    localStorage.clear();
    resetState();
    app.dialogMode = 'menu';
    createObjectURL = sinon.stub(window.URL, 'createObjectURL').returns('blob:test');
    revokeObjectURL = sinon.stub(window.URL, 'revokeObjectURL');
    click = sinon.stub(HTMLAnchorElement.prototype, 'click');
    clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    if(clock) clock.restore();
    createObjectURL.restore();
    revokeObjectURL.restore();
    click.restore();
    resetState();
  });

  it('should do nothing when entries is empty', () => {
    exportEntries([]);
    clock.tick(4E4);
    expect(createObjectURL.called).to.be.false;
    expect(click.called).to.be.false;
    expect(app.dialogMode).to.equal('menu');
  });

  it('should create a blob with formatted entry text', () => {
    exportEntries([{ date: '2024-01-01', text: 'Hello' }]);
    expect(createObjectURL.calledOnce).to.be.true;
    const blob = createObjectURL.args[0][0];
    expect(blob).to.be.an.instanceof(Blob);
    expect(blob.type).to.equal('text/plain;charset=utf-8');
  });

  it('should clear dialogMode to close the dialog', () => {
    exportEntries([{ date: '2024-01-01', text: 'Hello' }]);
    expect(app.dialogMode).to.not.be.ok;
  });

  it('should click a download anchor pointing at the blob URL on the next tick', () => {
    exportEntries([{ date: '2024-01-01', text: 'Hello' }]);
    expect(click.called).to.be.false;
    clock.tick(0);
    expect(click.calledOnce).to.be.true;
    const anchor = click.thisValues[0];
    expect(anchor.download).to.equal('journalize.txt');
    expect(anchor.getAttribute('href')).to.equal('blob:test');
  });

  it('should format multiple entries with carriage returns', async () => {
    const entries = [
      { date: '2024-01-01', text: 'First' },
      { date: '2024-01-02', text: 'Second' }
    ];
    exportEntries(entries);
    clock.restore(); // keep the event loop real while the FileReader works
    clock = null;
    const text = await readBlob(createObjectURL.args[0][0]);
    expect(text).to.equal(
      '2024-01-01\r\n\r\nFirst\r\n\r\n\r\n' +
      '2024-01-02\r\n\r\nSecond\r\n\r\n\r\n'
    );
  });

  it('should revoke the blob URL after 40 seconds', () => {
    exportEntries([{ date: '2024-01-01', text: 'Hello' }]);
    clock.tick(4E4 - 1);
    expect(revokeObjectURL.called).to.be.false;
    clock.tick(1);
    expect(revokeObjectURL.calledOnce).to.be.true;
    expect(revokeObjectURL.calledWithExactly('blob:test')).to.be.true;
  });
});
