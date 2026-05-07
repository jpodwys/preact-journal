var cron = require('node-cron');

// Daily maintenance at 03:00 UTC: hard-delete soft-deleted-old entries, then back up if changed.
var SCHEDULE = '0 3 * * *';

module.exports = function(){
  var Sequelize = require('sequelize'),
    db = require('./db')(Sequelize),
    entryModel = require('./models/entry-model')(db, Sequelize),
    userModel = require('./models/user-model')(db, Sequelize),
    entryService = new (require('./services/entry-service'))(entryModel, db),
    backupService = new (require('./services/backup-service'))({
      entryModel: entryModel,
      userModel: userModel,
      jawsdbUrl: process.env.JAWSDB_URL,
      repo: process.env.BACKUP_REPO,
      pat: process.env.GITHUB_PAT,
      encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
    });

  async function runDailyMaintenance(){
    console.log('[maintenance] starting');
    try {
      var removed = await entryService.removeAllDeletedEntries();
      console.log('[maintenance] cleanup hard-deleted ' + removed + ' entries');
    } catch(err) {
      console.error('[maintenance] cleanup failed', err);
    }
    try {
      await backupService.run();
    } catch(err) {
      console.error('[maintenance] backup failed', err);
    }
    console.log('[maintenance] done');
  }

  cron.schedule(SCHEDULE, runDailyMaintenance, { timezone: 'UTC' });
  console.log('[maintenance] scheduled (' + SCHEDULE + ' UTC)');
};
