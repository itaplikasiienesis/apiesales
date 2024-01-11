module.exports = function serveStatic (sails) {

    let serveStaticHandler;
  
    if ('production' !== sails.config.environment) {
      // Only initializing the module in non-production environment.
      const serveStatic = require('serve-static');
      const path = require('path');
      var staticFilePath = path.join(sails.config.appPath, 'assets');
      serveStaticHandler = serveStatic(staticFilePath);
      sails.log.info('Serving static files from: «%s»', staticFilePath);
    }
  
    // Adding middleware, make sure to enable it in your config.
    sails.config.http.middleware.serveStatic = function (req, res, next) {
      if (serveStaticHandler) {
        serveStaticHandler.apply(serveStaticHandler, arguments);
      } else {
        next();
      }
    };
  
  
    return {};
  
  };