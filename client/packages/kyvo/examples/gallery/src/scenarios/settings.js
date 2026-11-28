import { h } from 'kyvo/core';

export default function Settings(props, ctx) {
  const s = ctx.state({ color: 'teal', density: 'cosy', size: 16, bold: false });

  return (
    <div>
      <label>Color
        <select value={s.color} onchange={e => { s.color = e.target.value; }}>
          <option value="teal">Teal</option>
          <option value="crimson">Crimson</option>
          <option value="indigo">Indigo</option>
        </select>
      </label>
      {['cosy', 'compact'].map(density => (
        <label>
          <input type="radio" name="density" value={density} checked={s.density === density}
            onchange={() => { s.density = density; }} /> {density}
        </label>
      ))}
      <label>Size
        {/* A range hands back a string. Convert it before storing. */}
        <input type="range" min="12" max="28" value={s.size} oninput={e => { s.size = Number(e.target.value); }} />
      </label>
      <label>
        <input type="checkbox" checked={s.bold} onchange={e => { s.bold = e.target.checked; }} /> Bold
      </label>
      {/* Style objects take CSS custom properties. Numbers need units. */}
      <p class="preview" style={{
        '--accent': s.color,
        color: 'var(--accent)',
        fontSize: s.size + 'px',
        fontWeight: s.bold ? '700' : '400',
        lineHeight: s.density === 'cosy' ? '2' : '1.2'
      }}>The quick brown fox jumps over the lazy dog.</p>
    </div>
  );
}
