const findObjectIndexById = function(id, list) {
  return list.map(function(obj){
    return obj.id;
  }).indexOf(id);
};

const removeObjectByIndex = function(index, list) {
  list.splice(index, 1);
  return list;
};

const sortObjectsByDate = function(list) {
  if(!list) return [];
  return list.sort(function(a, b){
    return new Date(b.date) - new Date(a.date);
  });
};

const filterObjectsByText = function(query, list) {
  if(!query) return list;
  return list.filter(function(obj){
    return ~obj.text.toLowerCase().indexOf(query)
      || ~obj.date.indexOf(query);
  });
};

const filterHiddenEntries = function(entries) {
  return entries.filter(function(entry){
    return !(entry.deleted || entry.newEntry && !entry.postPending);
  });
};

const applyFilters = function(query, list){
  list = filterHiddenEntries(list);
  return filterObjectsByText(query, list);
};

const clearLocalStorage = function(){
  localStorage.removeItem('entries');
  localStorage.removeItem('timestamp');
};

export {
  findObjectIndexById,
  removeObjectByIndex,
  sortObjectsByDate,
  filterObjectsByText,
  filterHiddenEntries,
  applyFilters,
  clearLocalStorage
};
