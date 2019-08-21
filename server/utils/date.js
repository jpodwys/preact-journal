const thirtyOneDaysInSeconds = 31 * 24 * 60 * 60;

const getUtcZeroFromThirtyOneDaysAgo = function(){
  return Date.now() - thirtyOneDaysInSeconds;
}

const getLastFiveFromTimestamp = function(){
  return Date.now().toString().substr(-5);
}

exports.getUtcZeroFromThirtyOneDaysAgo = getUtcZeroFromThirtyOneDaysAgo;
exports.getLastFiveFromTimestamp = getLastFiveFromTimestamp;
