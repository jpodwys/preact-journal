import { h } from 'kyvo/core';

// A fake server. User 3 always fails.
const fetchUser = id => new Promise((resolve, reject) => setTimeout(
  () => (id === 3 ? reject(new Error('No such user')) : resolve({ name: ['Ada', 'Grace'][id - 1] })), 300));

function Card(props, ctx) {
  const s = ctx.state({ name: 'Loading…', error: '', message: '' });

  // Runs once for each Card instance, so it only ever fetches the id it started with.
  ctx.mount(() => {
    let live = true;
    fetchUser(props.id).then(
      user => { if (live) s.name = user.name; },
      e => { if (live) Object.assign(s, { name: '', error: e.message }); }
    );
    // A late answer for a card that has been removed is ignored.
    return () => { live = false; };
  });

  return (
    <div class="card">
      <h3>{s.name}</h3>
      {s.error && <p role="alert">{s.error}</p>}
      <input aria-label="Message" placeholder="Write a message" value={s.message} oninput={e => { s.message = e.target.value; }} />
    </div>
  );
}

export default function Profiles(props, ctx) {
  const s = ctx.state({ id: 1 });
  return (
    <div>
      {[1, 2, 3].map(id => <button aria-pressed={String(s.id === id)} onclick={() => { s.id = id; }}>User {id}</button>)}
      <div class="cards">
        <section aria-label="Without a key">
          <h4>Without a key (wrong)</h4>
          {/* The same instance is reused: old name, old message, no new fetch. */}
          <Card id={s.id} />
        </section>
        <section aria-label="With a key">
          <h4>With a key (right)</h4>
          {/* A new key is a new instance: fresh state, and mount runs again. */}
          <Card key={s.id} id={s.id} />
        </section>
      </div>
    </div>
  );
}
