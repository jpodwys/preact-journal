const findObjectIndexById = function(id, list) {
  return list.map(function(obj){ return obj.id; }).indexOf(id);
};

const removeObjectByIndex = function(index, list) {
  return list.splice(index, 1);
};

export { findObjectIndexById, removeObjectByIndex };
