import { h } from 'kyvo/core';

// A small highlighter for the gallery's own scenarios: JavaScript and JSX, by pattern rather than by parsing. It only
// has to be right for the files in scenarios/ (avoid apostrophes in on-screen text there). The pieces always add up to exactly the source text.
const PATTERNS = [
  ['comment', /\{\/\*[\s\S]*?\*\/\}|\/\*[\s\S]*?\*\/|\/\/.*/],
  ['string', /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/],
  ['tag', /<\/?[A-Za-z][\w.-]*|<\/?>|\/>/],
  ['attr', /(?<=\s)[A-Za-z][\w-]*(?==["{])/],
  ['keyword', /(?<![.\w])(?:import|from|export|default|function|const|let|return|if|else|new|async|await|try|catch)(?![\w:])/],
  ['literal', /(?<![.\w])(?:true|false|null|undefined|\d+(?:\.\d+)?)(?!\w)/],
  ['call', /[A-Za-z_$][\w$]*(?=\()/]
];
const ALL = new RegExp(PATTERNS.map(([, re]) => '(' + re.source + ')').join('|'), 'g');

function tokenize(source) {
  const out = [];
  let end = 0;
  for (const m of source.matchAll(ALL)) {
    if (m.index > end) out.push(source.slice(end, m.index));
    const kind = PATTERNS[m.slice(1).findIndex(group => group !== undefined)][0];
    out.push(<span class={'tok-' + kind}>{m[0]}</span>);
    end = m.index + m[0].length;
  }
  out.push(source.slice(end));
  return out;
}

// Every store write re-renders the page, so each file is tokenized once.
const cache = new Map();
export const highlight = source => cache.get(source) || cache.set(source, tokenize(source)).get(source);
