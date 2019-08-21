const oneMonth = 60 * 60 * 1000 * 24 * 30;
const thirtyOneDaysInSeconds = 31 * 24 * 60 * 60;

const getTimestampFromThirtyOneDaysAgo = function(){
  return Date.now() - thirtyOneDaysInSeconds;
}

const getLastFiveFromTimestamp = function(){
  return Date.now().toString().substr(-5);
}

const getHumanReadableOneMonthFromNow = function(){
  return (new Date((new Date()).getTime() + oneMonth));
}

exports.getTimestampFromThirtyOneDaysAgo = getTimestampFromThirtyOneDaysAgo;
exports.getLastFiveFromTimestamp = getLastFiveFromTimestamp;
exports.getHumanReadableOneMonthFromNow = getHumanReadableOneMonthFromNow;
