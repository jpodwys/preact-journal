const getLastFiveFromTimestamp = function(){
  return Date.now().toString().substr(-5);
}

exports.getLastFiveFromTimestamp =getLastFiveFromTimestamp;
