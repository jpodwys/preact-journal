import { clear, del } from '../idb';

const findObjectIndexById = (id, list) => list.findIndex(obj => obj.id === id);

// Newest first. The oldest-first choice is switched off: sort order is switched off
function sortObjectsByDate (list /* , sort = 'desc' */) {
  if(!list) return [];
  return list.sort((a, b) => (a.date < b.date) - (a.date > b.date) /* ) * (sort === 'desc' ? 1 : -1 */);
};

function applyFilters (view, query, filter, /* sort, */ list) {
  if(view === '/search' && !query && !filter) return [];
  list = list.filter(entry => !entry.deleted);
  if(filter === 'favorites') list = list.filter(entry => entry.favorited);
  list = sortObjectsByDate(list /* , sort */);
  if(!query) return list;
  query = query.toLowerCase();
  return list.flatMap(obj => {
    const i = obj.text.toLowerCase().indexOf(query), start = Math.max(0, i - 40);
    return i < 0 ? obj.date.includes(query) ? obj : [] : { ...obj, previewText: (start ? '...' : '') + obj.text.substr(start) };
  });
};

function getViewFromPathname (href) {
  if(href.includes('/new')) return '/new';
  var i = href.lastIndexOf('/');
  return i > 0 ? href.substr(0, i) : href;
};

function clearData (userId) {
  if(userId) {
    del('entries_' + userId);
    localStorage.removeItem('timestamp_' + userId);
  } else {
    clear();
    localStorage.clear();
  }
};

export {
  findObjectIndexById,
  sortObjectsByDate,
  applyFilters,
  getViewFromPathname,
  clearData
};
