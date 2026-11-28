import { h } from 'kyvo/core';
import { effect } from 'kyvo/helpers';

// A fake server. User 3 always fails.
const fetchUser = id => new Promise((resolve, reject) => setTimeout(
  () => (id === 3 ? reject(new Error('No such user')) : resolve({ name: ['Ada', 'Grace'][id - 1] })), 300));

function Profile(props, ctx) {
  const s = ctx.state({ loading: true, user: null, error: '' });

  // Runs after the first render and again when props.id changes.
  effect(ctx, () => {
    let live = true;
    Object.assign(s, { loading: true, user: null, error: '' });
    fetchUser(props.id).then(
      user => { if (live) Object.assign(s, { loading: false, user }); },
      e => { if (live) Object.assign(s, { loading: false, error: e.message }); }
    );
    // Runs before the next fetch and on removal, so a late answer is ignored.
    return () => { live = false; };
  }, [props.id]);

  if (s.loading) return <p class="result">Loading…</p>;
  if (s.error) return <p class="result" role="alert">{s.error}</p>;
  return <p class="result">{s.user.name}</p>;
}

export default function ProfileDemo(props, ctx) {
  const s = ctx.state({ id: 1 });
  return (
    <div>
      {[1, 2, 3].map(id => <button aria-pressed={String(s.id === id)} onclick={() => { s.id = id; }}>User {id}</button>)}
      <Profile id={s.id} />
    </div>
  );
}
