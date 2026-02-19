import { clear, del } from 'idb-keyval';

const findObjectIndexById = (id, list) => list.findIndex(obj => obj.id === id);

function sortObjectsByDate (list, sort = 'desc') {
  if(!list) return [];
  return list.sort((a, b) =>
    sort === 'desc'
      ? (a.date < b.date) - (a.date > b.date)
      : (a.date > b.date) - (a.date < b.date)
  );
};

function filterObjectsByText (query, list) {
  if(!query) return list;
  query = query.toLowerCase();
  return list.reduce((accumulator, obj) => {
    var index = obj.text.toLowerCase().indexOf(query);
    if(~index){
      obj = {...obj};
      index = Math.max(0, index - 40);
      var ellipses = index ? '...' : '';
      obj.previewText = ellipses + obj.text.substr(index);
      accumulator.push(obj);
    } else if(~obj.date.indexOf(query)) {
      accumulator.push(obj);
    }
    return accumulator;
  }, []);
};

function applyFilters (view, query, filter, sort, list) {
  if(view === '/search' && !query && !filter) return [];
  list = list.filter(entry => !entry.deleted);
  if(filter === 'favorites') list = list.filter(entry => entry.favorited);
  list = sortObjectsByDate(list, sort);
  return filterObjectsByText(query, list);
};

function getViewFromPathname (href) {
  if(href.includes('/new')) return '/new';
  var i = href.lastIndexOf('/');
  return i > 0 ? href.substr(0, i) : href;
};

const isActiveEntryId = (el, id) => el.state.entry?.id === id;

function getAccounts () {
  try {
    return JSON.parse(localStorage.getItem('accounts')) || [];
  } catch(e) {
    return [];
  }
}

function getActiveUserId () {
  var active = getAccounts().find(a => a.active);
  return active ? String(active.id) : '';
}

function saveAccounts (accounts) {
  localStorage.setItem('accounts', JSON.stringify(accounts));
}

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
  isActiveEntryId,
  getAccounts,
  getActiveUserId,
  saveAccounts,
  clearData
};
