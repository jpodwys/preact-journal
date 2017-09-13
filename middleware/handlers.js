var userHandlers = require('./user-handlers');
var entryHandlers = require('./entry-handlers');

var defaultHandlers = {
  handleError: function(req, res, err) {
    res.status(err.status || 500).send(err.message);
  }
};

module.exports = Object.assign(userHandlers, entryHandlers, defaultHandlers);