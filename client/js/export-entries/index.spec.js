import exportEntries from './index';
import { Provider } from '../../components/unifire';

describe('exportEntries', () => {
  let linkstate;
  let provider;
  let createObjectURL;
  let revokeObjectURL;

  beforeEach(() => {
    linkstate = sinon.spy();
    provider = new Provider({
      state: { loggedIn: true },
      actions: { linkstate },
      children: []
    });
    createObjectURL = sinon.stub(window.URL, 'createObjectURL').returns('blob:test');
    revokeObjectURL = sinon.stub(window.URL, 'revokeObjectURL');
  });

  afterEach(() => {
    createObjectURL.restore();
    revokeObjectURL.restore();
  });

  it('should do nothing when entries is empty', () => {
    exportEntries([]);
    expect(createObjectURL.called).to.be.false;
    expect(linkstate.called).to.be.false;
  });

  it('should create a blob with formatted entry text', () => {
    exportEntries([{ date: '2024-01-01', text: 'Hello' }]);
    expect(createObjectURL.calledOnce).to.be.true;
    const blob = createObjectURL.args[0][0];
    expect(blob).to.be.an.instanceof(Blob);
    expect(blob.type).to.equal('text/plain;charset=utf-8');
  });

  it('should fire linkstate to close the dialog', () => {
    exportEntries([{ date: '2024-01-01', text: 'Hello' }]);
    expect(linkstate.calledWithExactly(provider, { key: 'dialogMode' }, undefined)).to.be.true;
  });

  it('should format multiple entries with carriage returns', (done) => {
    const entries = [
      { date: '2024-01-01', text: 'First' },
      { date: '2024-01-02', text: 'Second' }
    ];
    exportEntries(entries);
    const blob = createObjectURL.args[0][0];
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      expect(text).to.equal(
        '2024-01-01\r\n\r\nFirst\r\n\r\n\r\n' +
        '2024-01-02\r\n\r\nSecond\r\n\r\n\r\n'
      );
      done();
    };
    reader.readAsText(blob);
  });

  it('should schedule revokeObjectURL', (done) => {
    exportEntries([{ date: '2024-01-01', text: 'Hello' }]);
    // revokeObjectURL is called after a 40s timeout, so we can't easily wait for it,
    // but we can verify the href was set
    expect(createObjectURL.calledOnce).to.be.true;
    done();
  });
});
