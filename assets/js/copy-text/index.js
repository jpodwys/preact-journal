import select from 'select';
import fire from '../fire';

let textarea = document.createElement('textarea');
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

const tryShareApi = function(text) {
  if(navigator.share){
    return navigator.share({text: text});
  }
  return false;
}

export default function copyText(text) {
  if(tryShareApi(text)) return;
  textarea.value = text;
  select(textarea);
  let successful = document.execCommand('copy');
  if(successful) fire('linkstate', {key: 'toastConfig', val: {type: 'text copied'}})();
  hideKeyboard(textarea);
}
