import { h } from 'kyvo/core';

const PLANETS = [
  { id: 'me', name: 'Mercury', moons: 0 },
  { id: 've', name: 'Venus', moons: 0 },
  { id: 'ea', name: 'Earth', moons: 1 },
  { id: 'ma', name: 'Mars', moons: 2 }
];

// Turn data into elements with map. A key tells kyvo which item is which.
export default () => (
  <ul>
    {PLANETS.map(planet => (
      <li key={planet.id}>{planet.name}: {planet.moons} moons</li>
    ))}
  </ul>
);
