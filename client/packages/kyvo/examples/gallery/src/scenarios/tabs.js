import { h } from 'kyvo/core';

// Panel only holds content. Tabs reads its title.
const Panel = ({ children }) => <div>{children}</div>;

function Tabs(props, ctx) {
  const s = ctx.state({ active: 0 });
  // A child written as {cond && <Panel />} is '' while cond is false. Skip it with `panel &&`, rather than filtering
  // it out: the empty slot is what keeps the later panels, and what is typed in them, in place.

  return (
    <div>
      <div>
        {props.children.map((panel, i) => panel && (
          <button aria-pressed={String(i === s.active)} onclick={() => { s.active = i; }}>{panel.props.title}</button>
        ))}
      </div>
      {/* Every panel stays on the page, so what you typed in one survives a visit to another. */}
      {props.children.map((panel, i) => panel && <div class="panel" hidden={i !== s.active}>{panel}</div>)}
    </div>
  );
}

// Each section keeps its own open flag. The parent does not need to know about it.
function Section(props, ctx) {
  const s = ctx.state({ open: false });
  return (
    <div class="section">
      <button aria-expanded={String(s.open)} onclick={() => { s.open = !s.open; }}>{props.title}</button>
      {s.open && <div class="body">{props.children}</div>}
    </div>
  );
}

export default function TabsDemo(props, ctx) {
  const s = ctx.state({ admin: false });
  return (
    <div>
      <label>
        <input type="checkbox" checked={s.admin} onchange={e => { s.admin = e.target.checked; }} /> Show the admin tab
      </label>
      <Tabs>
        <Panel title="Profile"><input aria-label="Nickname" placeholder="Nickname" /></Panel>
        {s.admin && <Panel title="Admin">Secret settings.</Panel>}
        <Panel title="Help">
          <Section title="Shipping">Ships in two days.</Section>
          <Section title="Returns">Thirty days, no questions.</Section>
        </Panel>
      </Tabs>
    </div>
  );
}
