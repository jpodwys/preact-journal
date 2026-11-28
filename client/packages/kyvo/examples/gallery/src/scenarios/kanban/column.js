import { h } from 'kyvo/core';
import { COLUMNS, moveTo } from './store.js';

// The card being dragged, shared by all columns.
let dragged = 0;

export default function Column(props) {
  const at = COLUMNS.indexOf(props.column);
  return (
    <section class="column" aria-label={props.column}
      ondragover={e => e.preventDefault()}
      ondrop={e => { e.preventDefault(); if (dragged) moveTo(dragged, props.column); dragged = 0; }}>
      <h4>{props.column} ({props.cards.length})</h4>
      <ul>
        {props.cards.map(card => (
          <li key={card.id} class="card" draggable
            ondragstart={e => { dragged = card.id; e.dataTransfer?.setData('text/plain', card.title); }}>
            <span class="title">{card.title}</span>
            <div>
              <button disabled={at === 0} aria-label={'Move ' + card.title + ' left'} onclick={() => moveTo(card.id, COLUMNS[at - 1])}>←</button>
              <button disabled={at === COLUMNS.length - 1} aria-label={'Move ' + card.title + ' right'} onclick={() => moveTo(card.id, COLUMNS[at + 1])}>→</button>
              <button aria-label={'Edit ' + card.title} onclick={() => props.onEdit(card.id)}>Edit</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
