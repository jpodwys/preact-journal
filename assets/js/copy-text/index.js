import select from 'select';
import fire from '../fire';

const textareaId = 'copyTextTextarea';

const createTextarea = function() {
  let textarea = document.createElement('textarea');
  textarea.setAttribute('id', textareaId);
  textarea.setAttribute('tabindex', '-1');
  textarea.setAttribute('style', 'position:absolute;height:1px;width:1px;bottom:-100px;left:-100px;');
  return document.body.appendChild(textarea);
}

export default function copyText(text, e) {
  let textarea = createTextarea();
  textarea.value = text;
  select(textarea);
  let successful = document.execCommand('copy');
  if(successful) fire('linkstate', {key: 'toastConfig', val: {type: 'text copied'}})();
  document.removeElementById(textareaId);
}
