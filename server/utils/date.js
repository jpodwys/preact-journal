const thirtyOneDaysInSeconds = 31 * 24 * 60 * 60;

const getUtcZeroTimestamp = function(){
  return Math.trunc(Date.now() / 1000 - new Date().getTimezoneOffset() * 60);
}

const getUtcZeroFromThirtyOneDaysAgo = function(){
  return getUtcZeroTimestamp - thirtyOneDaysInSeconds;
}

const getLastFiveFromTimestamp = function(){
  return getUtcZeroTimestamp().toString().substr(-5);
}

const getOneMonth = function(){
  return (new Date((new Date()).getTime() + (60 * 60 * 1000 * 24 * 30)));
}

exports.getUtcZeroTimestamp = getUtcZeroTimestamp;
exports.getUtcZeroFromThirtyOneDaysAgo = getUtcZeroFromThirtyOneDaysAgo;
exports.getLastFiveFromTimestamp =getLastFiveFromTimestamp;
exports.getOneMonth = getOneMonth;
