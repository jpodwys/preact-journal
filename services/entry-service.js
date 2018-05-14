var date = require('../utils/date');

module.exports = function(Entry, sequelize){
  var self = this;

  self.getAllEntriesByOwnerId = function(userId, limit, offset){
    return Entry.findAndCountAll({
      where: {
        ownerId: userId,
        deleted: { $ne: 1 }
      },
      attributes: [
        'id', 'date', 'text',
        [sequelize.fn('date_format', sequelize.col('date'), '%Y-%m-%d'), 'date'],
      ],
      order: [
        ['date', 'DESC'],
        ['updated_at', 'DESC']
      ],
      raw: true
    });
  }

  self.getUpdatesSinceTimestamp = function(ownerId, timestamp, deviceId){
    return Entry.findAll({
      where: {
        ownerId: ownerId,
        updatedAt: { $gt: timestamp },
        deviceId: { $ne: deviceId }
      },
      attributes: [
        'id', 'date', 'text', 'deleted',
        [sequelize.fn('date_format', sequelize.col('date'), '%Y-%m-%d'), 'date'],
      ],
      order: [
        ['date', 'DESC'],
        ['updated_at', 'DESC']
      ],
      raw: true
    });
  }

  self.createEntry = function(data, ownerId, deviceId){
    return new Promise(function (resolve, reject){
      Entry.create({
        ownerId: ownerId,
        date: data.date,
        text: data.text,
        isPublic: 0,
        updatedAt: date.getUtcZeroTimestamp(),
        deviceId: deviceId
      }).then(function (entry){
        return resolve(entry);
      }, function (err){
        return reject(err);
      });
    });
  }

  self.updateEntry = function(entryId, data, deviceId){
    data.isPublic = 0;
    data.updatedAt = date.getUtcZeroTimestamp();
    data.deviceId = deviceId;

    return Entry.update(data, {
      where: {id: entryId}
    });
  }

  self.deleteEntry = function(entryId, deviceId){
    var data = {
      text: '',
      isPublic: 0,
      deleted: 1,
      updatedAt: date.getUtcZeroTimestamp(),
      deviceId: deviceId
    };

    return Entry.update(data, {
      where: {id: entryId}
    });
  }

  self.getEntryCount = function(){
    return Entry.count();
  }
}
