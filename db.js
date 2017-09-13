var isDevMode = (process.env.NODE_ENV === 'development');

module.exports = function(Sequelize){
  var db = new Sequelize(process.env.DB_URL, {
    dialectOptions: {
      // debug: isDevMode,
      ssl: {
        // Run this command for each SSL ENV
        // heroku config:set SQL_SSL_CA="$(cat ca.pem)" -a riot-demo
        // Run this to pull/push ENVs form heroku to .env or back
        // heroku config:pull -a riot-demo
        // heroku config:push -a riot-demo
        ca: process.env.SQL_SSL_CA,
        cert: process.env.SQL_SSL_CERT,
        key: process.env.SQL_SSL_KEY
      }
    },
    omitNull: true,
    // logging: isDevMode ? console.log : false,
    benchmark: isDevMode
  });
  return db;
}
