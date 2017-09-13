exports.vary = function(req, res, next){
  res.set({'Vary': 'Accept'});
  next();
}
