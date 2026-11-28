import { h, store } from 'kyvo/core';

const tasks = store({ items: ['Design', 'Build', 'Test', 'Ship'] });

// Move one item to where another one is.
const move = (name, onto) => {
  const from = tasks.items.indexOf(name), to = tasks.items.indexOf(onto);
  if (from < 0 || to < 0 || from === to) return;
  const items = tasks.items.slice();
  items.splice(to, 0, ...items.splice(from, 1));
  tasks.items = items;
};

// What is being dragged. Nothing shows it, so a plain variable is enough.
let dragged;

function Row(props) {
  const shift = by => {
    const other = tasks.items[tasks.items.indexOf(props.name) + by];
    if (other) move(props.name, other);
  };
  return (
    <li draggable
      ondragstart={e => { dragged = props.name; e.dataTransfer?.setData('text/plain', props.name); }}
      ondragover={e => e.preventDefault()}
      ondrop={e => { e.preventDefault(); move(dragged, props.name); }}>
      <span class="title">{props.name}</span>
      <input aria-label={'Note for ' + props.name} placeholder="Note" />
      <button aria-label={'Move ' + props.name + ' up'} onclick={() => shift(-1)}>↑</button>
      <button aria-label={'Move ' + props.name + ' down'} onclick={() => shift(1)}>↓</button>
    </li>
  );
}

export default function Reorder() {
  return (
    <ul class="reorder">
      {/* The key moves each row, with whatever was typed in it, instead of rewriting rows in place. */}
      {tasks.items.map(name => <Row key={name} name={name} />)}
    </ul>
  );
}
