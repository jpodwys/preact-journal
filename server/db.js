var isDevMode = (process.env.NODE_ENV === 'development');
// var fs = require('fs');
const awsCaBundle = require('aws-ssl-profiles');

module.exports = function(Sequelize){
  // var globalBundle = fs.readFileSync('./ssl/global-bundle.pem');
  var db = new Sequelize(process.env.JAWSDB_URL, {
    dialectOptions: {
      ssl: {
        // ca: process.env.SQL_SSL_CA,
        // cert: process.env.SQL_SSL_CERT,
        // key: process.env.SQL_SSL_KEY,
        rejectUnauthorized: true,
        verifyIdentity: true,
        ca: awsCaBundle.ca,
      },
    },
    omitNull: true,
    benchmark: isDevMode
  });
  return db;
}
