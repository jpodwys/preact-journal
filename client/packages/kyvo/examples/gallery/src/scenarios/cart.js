import { h, store } from 'kyvo/core';

const PRODUCTS = [{ id: 1, name: 'Tea', price: 4 }, { id: 2, name: 'Mug', price: 9 }];
const find = id => PRODUCTS.find(p => p.id === id);

// Shared state is an object any component can import and read. No provider, no subscription.
const cart = store({ items: [] });

// Actions are plain functions. Replace the array; never push into it.
const add = id => { cart.items = [...cart.items, id]; };
const remove = index => { cart.items = cart.items.filter((_, i) => i !== index); };

// Derived data sits beside the actions. It is worked out when asked for, never stored, so it cannot go stale.
const total = () => cart.items.reduce((sum, id) => sum + find(id).price, 0);

const Badge = () => <h3>Cart ({cart.items.length})</h3>;

const Products = () => (
  <ul>
    {PRODUCTS.map(p => (
      <li key={p.id}>{p.name} ${p.price} <button onclick={() => add(p.id)}>Add {p.name}</button></li>
    ))}
  </ul>
);

const Items = () => (
  <div>
    <ul>
      {/* No key needed: a row is only text and a button, so it does not matter if kyvo reuses it for another line.
          Rows with their own state or inputs do need one (see Todo list). */}
      {cart.items.map((id, i) => (
        <li>{find(id).name} <button onclick={() => remove(i)}>Remove</button></li>
      ))}
    </ul>
    <p class="total">Total: ${total()}</p>
  </div>
);

export default () => (
  <div>
    <Products />
    <Badge />
    <Items />
  </div>
);
