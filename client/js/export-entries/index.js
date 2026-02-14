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
  anchor.href = URL.createObjectURL(data);
  setTimeout(() => URL.revokeObjectURL(anchor.href), 4E4); // 40s
  setTimeout(() => anchor.click());
  fire('linkstate', { key: 'dialogMode' });
}
