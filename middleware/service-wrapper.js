/* 
 * This module wraps the business logic layer of the application 
 * to reduce repetitive code and so that the business logic code
 * doesn't need to know anything about being middleware.
 */

var handlers = require('./handlers');

function serviceWrapper(service){
  Object.keys(service).forEach(func => {
    this[func] = function (req, res){
      service[func](req).then(response => {
        handlers[func](req, res, response);
      }).catch(handlers.handleError.bind(this, req, res));
    }
  });
}

module.exports = serviceWrapper;
