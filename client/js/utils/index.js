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
  return list.reduce(function(accumulator, obj){
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

function filterHiddenEntries (entries) {
  if(!entries) return entries;
  return entries.filter(entry => !entry.deleted);
};

function filterByFavorited (entries) {
  if(!entries) return entries;
  return entries.filter(entry => !!entry.favorited);
};

function applyFilters (query, filter, list) {
  list = filterHiddenEntries(list);
  if(filter === 'favorites') list = filterByFavorited(list);
  return filterObjectsByText(query, list);
};

function clearLocalStorage () {
  localStorage.clear();
  // localStorage.removeItem('entries');
  // localStorage.removeItem('timestamp');
  // localStorage.removeItem('dark');
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
