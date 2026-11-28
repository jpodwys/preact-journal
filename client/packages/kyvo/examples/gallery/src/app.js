import { h, store } from 'kyvo/core';
import { scenarios } from './scenarios.js';
import { highlight } from './highlight.js';

// Hash routing: #/<scenario id>. The tab is not part of the address and goes back to the demo on each new page.
const fromHash = () => (scenarios.find(s => '#/' + s.id === location.hash) || scenarios[0]).id;
export const nav = store({ id: fromHash(), tab: 'demo' });
export const sync = () => {
  const id = fromHash();
  if (id !== nav.id) Object.assign(nav, { id, tab: 'demo' });
};
addEventListener('hashchange', sync);

const Tab = ({ name, label }) => (
  <button role="tab" aria-selected={String(nav.tab === name)} onclick={() => { nav.tab = name; }}>{label}</button>
);

// Both panels stay on the page, one hidden, so switching tabs does not reset the demo.
const Page = ({ scenario }) => {
  const { Demo } = scenario;
  return (
    <article>
      <h1>{scenario.title}</h1>
      <p>{scenario.about}</p>
      <p class="footgun"><strong>Watch out:</strong> {scenario.footgun}</p>
      <div role="tablist"><Tab name="demo" label="Demo" /><Tab name="code" label="Code" /></div>
      <section class="demo" aria-label="Demo" hidden={nav.tab !== 'demo'}><Demo /></section>
      <pre aria-label="Code" hidden={nav.tab !== 'code'}><code>{highlight(scenario.source)}</code></pre>
    </article>
  );
};

export const App = () => {
  const scenario = scenarios.find(s => s.id === nav.id);
  return (
    <div class="layout">
      <nav aria-label="Scenarios">
        <h2>kyvo gallery</h2>
        <ol>
          {scenarios.map(s => (
            <li key={s.id}>
              <a href={'#/' + s.id} aria-current={s.id === nav.id ? 'page' : null}>{s.title}<small>{s.teaches}</small></a>
            </li>
          ))}
        </ol>
      </nav>
      <main><Page key={scenario.id} scenario={scenario} /></main>
    </div>
  );
};
