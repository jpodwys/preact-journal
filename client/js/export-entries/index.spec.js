import copyEntries from './index';
import { Provider } from '../../components/unifire';

describe('exportEntries', () => {
  // let setToast;
  // let provider;

  // beforeEach(() => {
  //   setToast = sinon.spy();
  //   provider = new Provider({
  //     state: { loggedIn: true },
  //     actions: { setToast },
  //     children: []
  //   });
  // });

  // it('should fire setToast', () => {
  //   document.execCommand = () => true;
  //   copyText('bogus');
  //   expect(setToast.calledWithExactly(provider, undefined, undefined)).to.be.true;
  // });

  // it('should use the share API when available', () => {
  //   navigator.share = sinon.stub().returns(true);
  //   copyText('bogus');
  //   expect(navigator.share.args[0][0].text).to.equal('bogus');
  //   expect(setToast.called).to.be.false;
  // });

});
