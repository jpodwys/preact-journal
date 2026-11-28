import { h } from 'kyvo/core';

// Whatever is written between a component's tags arrives as props.children.
const Box = ({ title, children }) => (
  <section class="card">
    <h3>{title}</h3>
    {children}
  </section>
);

export default () => (
  <div class="cards">
    <Box title="Text">
      <p>Just a paragraph.</p>
    </Box>
    <Box title="A list">
      <ul>
        <li>One</li>
        <li>Two</li>
      </ul>
    </Box>
  </div>
);
