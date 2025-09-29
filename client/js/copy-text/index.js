import select from 'select';
import { fire } from '../../components/unifire';

const textarea = document.createElement('textarea');
textarea.setAttribute('tabindex', '-1');
textarea.setAttribute('style', 'position:absolute;height:1px;width:1px;left:-100px;');
document.body.appendChild(textarea);

function hideKeyboard (el) {
  el.setAttribute('readonly', 'readonly');
  el.setAttribute('disabled', 'true');
  setTimeout(function() {
    el.blur();
    el.removeAttribute('readonly');
    el.removeAttribute('disabled');
  }, 10);
}

const tryShareApi = text => navigator.share
  ? navigator.share({ text })
  : false;

export default text => {
  if(tryShareApi(text)) return;
  textarea.value = text;
  select(textarea);
  let successful = document.execCommand('copy');
  if(successful) fire('setToast');
  hideKeyboard(textarea);
}
