var userHandlers = require('./user-handlers');
var entryHandlers = require('./entry-handlers');

var defaultHandlers = {
  handleError: function(req, res, err) {
    var status = err.status || 500;
    var message = (status >= 500) ? 'Internal server error' : err.message;
    res.status(status).send(message);
  }
};

module.exports = Object.assign(userHandlers, entryHandlers, defaultHandlers);
