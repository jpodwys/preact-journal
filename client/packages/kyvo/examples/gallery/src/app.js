import { h, store } from 'kyvo/core';
import { scenarios } from './scenarios.js';
import { highlight } from './highlight.js';

// Hash routing: #/<scenario id>. The tab is not part of the address and goes back to the demo on each new page.
// Anything after the id (#/mail/2) belongs to the scenario itself.
const fromHash = () => (scenarios.find(s => s.id === location.hash.split('/')[1]) || scenarios[0]).id;
export const nav = store({ id: fromHash(), tab: 'demo', file: 0 });
export const sync = () => {
  const id = fromHash();
  if (id !== nav.id) Object.assign(nav, { id, tab: 'demo', file: 0 });
};
addEventListener('hashchange', sync);

const Tab = ({ name, label }) => (
  <button role="tab" aria-selected={String(nav.tab === name)} onclick={() => { nav.tab = name; }}>{label}</button>
);

const Code = ({ files }) => {
  const shown = files[nav.file] || files[0];
  return (
    <div class="code">
      {files.length > 1 && (
        <div class="files" aria-label="Files">
          {files.map((f, i) => <button aria-pressed={String(f === shown)} onclick={() => { nav.file = i; }}>{f.name}</button>)}
        </div>
      )}
      <pre aria-label={shown.name}><code>{highlight(shown.source)}</code></pre>
    </div>
  );
};

// Both panels stay on the page, one hidden, so switching tabs does not reset the demo.
const Page = ({ scenario }) => {
  const { Demo } = scenario;
  return (
    <article>
      <h1>{scenario.title}</h1>
      <p>{scenario.about}</p>
      {scenario.footgun && <p class="footgun"><strong>Watch out:</strong> {scenario.footgun}</p>}
      {scenario.tip && <p class="tip"><strong>Tip:</strong> {scenario.tip}</p>}
      <div role="tablist"><Tab name="demo" label="Demo" /><Tab name="code" label="Code" /></div>
      <section class="demo" aria-label="Demo" hidden={nav.tab !== 'demo'}><Demo /></section>
      <section aria-label="Code" hidden={nav.tab !== 'code'}><Code files={scenario.files} /></section>
    </article>
  );
};

const stages = [...new Set(scenarios.map(s => s.stage))];

export const App = () => {
  const scenario = scenarios.find(s => s.id === nav.id);
  return (
    <div class="layout">
      <nav aria-label="Scenarios">
        <h2>kyvo gallery</h2>
        {stages.map(stage => (
          <div key={stage}>
            <h3>{stage}</h3>
            <ul>
              {scenarios.filter(s => s.stage === stage).map(s => (
                <li key={s.id}>
                  <a href={'#/' + s.id} aria-current={s.id === nav.id ? 'page' : null}>{s.title}<small>{s.teaches}</small></a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <main><Page key={scenario.id} scenario={scenario} /></main>
    </div>
  );
};
