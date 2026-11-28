export const money = n => n.toFixed(2);
export const signed = n => (n > 0 ? '+' : '') + n.toFixed(2);
export const compact = n => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n));
export const dirClass = n => (n > 0 ? 'up' : n < 0 ? 'dn' : '');
