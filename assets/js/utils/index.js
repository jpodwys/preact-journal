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

export {
  findObjectIndexById,
  removeObjectByIndex,
  sortObjectsByDate,
  filterObjectsByText
};
