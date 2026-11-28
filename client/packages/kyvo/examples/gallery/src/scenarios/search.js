import { h } from 'kyvo/core';
import { debounced } from 'kyvo/helpers';

const PEOPLE = ['Ada Lovelace', 'Alan Turing', 'Barbara Liskov', 'Donald Knuth', 'Grace Hopper', 'Margaret Hamilton'];

export default function Search(props, ctx) {
  const s = ctx.state({ query: '' });
  // Waits for a pause in typing before updating the query.
  const find = debounced(ctx, value => { s.query = value; }, 200);

  // Derived data is just an expression. It is recomputed on every render.
  const matches = PEOPLE.filter(name => name.toLowerCase().includes(s.query.toLowerCase()));

  return (
    <div>
      <input aria-label="Search" placeholder="Search names" oninput={e => find(e.target.value)} />
      <p class="count">{matches.length} of {PEOPLE.length}</p>
      <ul>{matches.map(name => <li key={name}>{name}</li>)}</ul>
    </div>
  );
}
