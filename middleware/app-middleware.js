module.exports = function(app){
  app.restrict = function(req, res, next){
    if(!req.user) res.sendStatus(401);
    else next();
  }
}
