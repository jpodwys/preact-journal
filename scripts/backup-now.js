// Manually run the backup service once. Useful for local testing and ad-hoc snapshots.
// Usage: node scripts/backup-now.js
require('dotenv').load();

var Sequelize = require('sequelize');
var db = require('../server/db')(Sequelize);
var entryModel = require('../server/models/entry-model')(db, Sequelize);
var userModel  = require('../server/models/user-model')(db, Sequelize);
var BackupService = require('../server/services/backup-service');

var backup = new BackupService({
  entryModel: entryModel,
  userModel: userModel,
  jawsdbUrl: process.env.JAWSDB_URL,
  repo: process.env.BACKUP_REPO,
  pat: process.env.GITHUB_PAT,
  encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
});

backup.run()
  .then(function(result){
    console.log('result:', result);
    process.exit(0);
  })
  .catch(function(err){
    console.error(err);
    process.exit(1);
  });
