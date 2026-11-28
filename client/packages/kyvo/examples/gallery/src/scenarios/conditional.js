import { h } from 'kyvo/core';

export default function Conditional(props, ctx) {
  const s = ctx.state({ signedIn: false, unread: 0 });

  return (
    <div>
      <button onclick={() => { s.signedIn = !s.signedIn; }}>{s.signedIn ? 'Sign out' : 'Sign in'}</button>
      <button onclick={() => s.unread++}>New message</button>

      {/* Either of two things */}
      {s.signedIn ? <p class="who">Welcome back.</p> : <p class="who">Please sign in.</p>}

      {/* One thing or nothing. false, null and undefined show nothing. */}
      {s.unread > 0 && <p class="unread">{s.unread} unread</p>}
    </div>
  );
}
