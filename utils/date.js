const getUtcZeroTimestamp = function(){
  return Math.trunc(Date.now() / 1000 - new Date().getTimezoneOffset() * 60);
}

const getLastFiveFromTimestamp = function(){
  return getUtcZeroTimestamp().toString().substr(-5);
}

exports.getUtcZeroTimestamp = getUtcZeroTimestamp;
exports.getLastFiveFromTimestamp =getLastFiveFromTimestamp;
