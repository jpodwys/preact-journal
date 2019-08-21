const thirtyOneDaysInSeconds = 31 * 24 * 60 * 60;

const getTimestampFromThirtyOneDaysAgo = function(){
  return Date.now() - thirtyOneDaysInSeconds;
}

const getHumanReadableOneMonthFromNow = function(){
  return (new Date((new Date()).getTime() + thirtyOneDaysInSeconds));
}

const getLastFiveFromTimestamp = function(){
  return Date.now().toString().substr(-5);
}

exports.getTimestampFromThirtyOneDaysAgo = getTimestampFromThirtyOneDaysAgo;
exports.getLastFiveFromTimestamp = getLastFiveFromTimestamp;
exports.getHumanReadableOneMonthFromNow = getHumanReadableOneMonthFromNow;
