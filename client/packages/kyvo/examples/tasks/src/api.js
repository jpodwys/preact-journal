// A fake remote API. An object so tests can replace `api.notes` (ES exports cannot be stubbed).
export const api = {
  notes: id => new Promise(resolve => setTimeout(() => resolve('Notes for task ' + id), 20))
};
