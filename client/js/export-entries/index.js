import { fire } from '../../components/unifire';

const anchor = document.createElement('a');
anchor.download = 'journalize.txt';
const CARRIAGE_RETURN = '\r\n';

export default function exportEntries(entries) {
  if (!entries.length) return;
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
  const data = new Blob([ text ], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(data);
  anchor.href = url;
  anchor.click();
  window.URL.revokeObjectURL(url);
  fire('linkstate', { key: 'dialogMode' });
}
