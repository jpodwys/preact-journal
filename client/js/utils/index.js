import { clear } from 'idb-keyval';

const findObjectIndexById = (id, list) => list.map(obj => obj.id).indexOf(id);

function removeObjectByIndex (index, list) {
  list.splice(index, 1);
  return list;
};

function sortObjectsByDate (list, sort = 'desc') {
  if(!list) return [];
  return list.sort((a, b) => {
    const aDate = new Date(a.date);
    const bDate = new Date(b.date);
    return sort === 'desc'
      ? bDate - aDate
      : aDate - bDate;
  });
};

function filterObjectsByText (query, list) {
  if(!query) return list;
  query = query.toLowerCase();
  return list.reduce((accumulator, obj) => {
    var index = obj.text.toLowerCase().indexOf(query);
    if(~index){
      obj = Object.assign({}, obj);
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

const filterHiddenEntries = entries => entries.filter(entry => !entry.deleted);

function filterByFavorited (entries) {
  if(!entries) return entries;
  return entries.filter(entry => !!entry.favorited);
};

function applyFilters (view, query, filter, sort, list) {
  if(view === '/search' && !query && !filter) return [];
  list = filterHiddenEntries(list);
  if(filter === 'favorites') list = filterByFavorited(list);
  list = sortObjectsByDate(list, sort);
  return filterObjectsByText(query, list);
};

function getViewFromPathname (href) {
  if(~href.indexOf('/new')) return '/new';
  return href.lastIndexOf('/') > 0
    ? href.substr(0, href.lastIndexOf('/'))
    : href;
};

function isActiveEntryId (el, id) {
  if(!el.state.entry) return false;
  return el.state.entry.id === id;
};

function clearData () {
  clear();
  localStorage.clear();
};

export {
  findObjectIndexById,
  removeObjectByIndex,
  sortObjectsByDate,
  filterObjectsByText,
  filterHiddenEntries,
  applyFilters,
  getViewFromPathname,
  isActiveEntryId,
  clearData
};
