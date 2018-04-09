function findObjectIndexById (id, list) {
  return list.map(function(obj){
    return obj.id;
  }).indexOf(id);
};

function removeObjectByIndex (index, list) {
  list.splice(index, 1);
  return list;
};

function sortObjectsByDate (list) {
  if(!list) return [];
  return list.sort(function(a, b){
    return new Date(b.date) - new Date(a.date);
  });
};

function filterObjectsByText (query, list) {
  if(!query) return list;
  return list.filter(function(obj){
    return ~obj.text.toLowerCase().indexOf(query)
      || ~obj.date.indexOf(query);
  });
};

function filterHiddenEntries (entries) {
  return entries.filter(function(entry){
    return !entry.deleted;
  });
};

function applyFilters (query, list) {
  list = filterHiddenEntries(list);
  return filterObjectsByText(query, list);
};

function clearLocalStorage () {
  localStorage.removeItem('entries');
  localStorage.removeItem('timestamp');
  localStorage.removeItem('dark');
};

function getViewFromHref (href) {
  if(~href.indexOf('/new')) return '/new';
  return href.lastIndexOf('/') > 0
    ? href.substr(0, href.lastIndexOf('/'))
    : href;
};

export {
  findObjectIndexById,
  removeObjectByIndex,
  sortObjectsByDate,
  filterObjectsByText,
  filterHiddenEntries,
  applyFilters,
  clearLocalStorage,
  getViewFromHref
};
