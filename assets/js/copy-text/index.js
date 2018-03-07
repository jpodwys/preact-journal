import select from 'select';
import fire from '../fire';

const textareaId = 'copyTextTextarea';
let textarea = document.createElement('textarea');
textarea.setAttribute('id', textareaId);
textarea.setAttribute('tabindex', '-1');
textarea.setAttribute('style', 'position:absolute;height:1px;width:1px;bottom:-100px;left:-100px;');
document.body.appendChild(textarea);

const hideKeyboard = function(el) {
  el.setAttribute('readonly', 'readonly');
  el.setAttribute('disabled', 'true');
  setTimeout(function() {
    el.blur();
    el.removeAttribute('readonly');
    el.removeAttribute('disabled');
  }, 10);
}

export default function copyText(text) {
  let textarea = document.getElementById(textareaId);
  textarea.value = text;
  select(textarea);
  let successful = document.execCommand('copy');
  if(successful) fire('linkstate', {key: 'toastConfig', val: {type: 'text copied'}})();
  hideKeyboard(textarea);
}
