import { h } from 'kyvo/core';

// A component receives what its parent passed as `props`.
const Greeting = ({ name, times = 1, excited }) => (
  <p>{'Hello, '.repeat(times)}{name}{excited ? '!' : '.'}</p>
);

export default () => (
  <div>
    <Greeting name="Ada" />
    {/* Strings use quotes. Anything else goes in braces. */}
    <Greeting name="Grace" times={2} />
    {/* A prop with no value is true. */}
    <Greeting name="Alan" excited />
  </div>
);
