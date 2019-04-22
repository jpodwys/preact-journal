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

exports.getUtcZeroTimestamp = getUtcZeroTimestamp;
exports.getUtcZeroFromThirtyOneDaysAgo = getUtcZeroFromThirtyOneDaysAgo;
exports.getLastFiveFromTimestamp =getLastFiveFromTimestamp;
