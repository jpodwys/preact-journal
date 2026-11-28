import { h } from 'kyvo/core';

// A fake server: the name "taken" is already used.
const register = ({ name }) => new Promise((resolve, reject) => setTimeout(
  () => (name === 'taken' ? reject(new Error('That name is taken')) : resolve()), 400));

// Errors are derived from the fields. They are never stored, so they cannot get out of step.
const check = ({ name, email, password }) => ({
  name: name.length < 3 && 'At least 3 characters',
  email: !email.includes('@') && 'Needs an @',
  password: password.length < 8 && 'At least 8 characters'
});

export default function Signup(props, ctx) {
  const s = ctx.state({ name: '', email: '', password: '', tried: false, pending: false, failed: '', done: false });
  const errors = check(s);

  const submit = async e => {
    e.preventDefault();
    s.tried = true;
    // Check again here: `errors` above is from the last render, which can be a keystroke behind.
    if (s.pending || Object.values(check(s)).some(Boolean)) return;
    Object.assign(s, { pending: true, failed: '' });
    try {
      await register(s);
      s.done = true;
    } catch (error) {
      s.failed = error.message;
    }
    s.pending = false;
  };

  const field = (key, label, type) => (
    <label>{label}
      <input name={key} type={type} value={s[key]} oninput={e => { s[key] = e.target.value; }} />
      {s.tried && errors[key] && <small class="error">{errors[key]}</small>}
    </label>
  );

  if (s.done) return <p class="done">Welcome, {s.name}.</p>;
  return (
    <form onsubmit={submit} novalidate>
      {field('name', 'Name', 'text')}
      {field('email', 'Email', 'email')}
      {field('password', 'Password', 'password')}
      <button disabled={s.pending}>{s.pending ? 'Creating…' : 'Create account'}</button>
      {s.failed && <p role="alert">{s.failed}</p>}
    </form>
  );
}
