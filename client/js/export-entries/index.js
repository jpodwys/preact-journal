import { fire } from '../../components/unifire';

const anchor = document.createElement('a');
anchor.setAttribute('tabindex', '-1');
anchor.setAttribute('download', 'journalize.txt');
anchor.setAttribute('style', 'position:absolute;height:1px;width:1px;left:-100px;');

const CARRIAGE_RETURN = '\r\n';

export default function exportEntries(entries) {
  let text = '';
  entries.forEach(entry => {
    text += entry.date
      + CARRIAGE_RETURN
      + CARRIAGE_RETURN
      + entry.text
      + CARRIAGE_RETURN
      + CARRIAGE_RETURN
      + CARRIAGE_RETURN;
  });
  const data = new Blob([ text ], { type: 'text/plain' });
  const url = window.URL.createObjectURL(data);
  anchor.setAttribute('href', url);
  anchor.click();
  fire('linkstate', { key: 'dialogMode' });
}
