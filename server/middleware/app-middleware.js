module.exports = function(app){
  app.restrict = function(req, res, next){
    if(!req.user) return res.sendStatus(401);
    next();
  }
}
