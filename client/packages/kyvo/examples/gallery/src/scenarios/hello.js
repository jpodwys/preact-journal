import { h } from 'kyvo/core';

// A component is a function that returns what to show.
// JSX such as <p> becomes calls to h(), which is why h is imported.
export default function Hello() {
  const name = 'kyvo';

  return (
    <div>
      <p>Hello from {name}.</p>
      <p>Two plus two is {2 + 2}.</p>
    </div>
  );
}

// An app puts its top component on the page once:
// render(<Hello />, document.body);
