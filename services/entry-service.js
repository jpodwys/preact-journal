module.exports = function(Entry, sequelize){
  var self = this;

  self.getEntriesByOwnerId = function(userId, limit, offset){
    return new Promise(function (resolve, reject){
      var doEntriesQuery = function(){
        return Entry.findAll({
          where: {ownerId: userId},
          attributes: [
            'id', 'date', 'isPublic',
            [sequelize.fn('date_format', sequelize.col('date'), '%Y-%m-%d'), 'date'],
            [sequelize.fn('CONCAT',
              sequelize.fn('LEFT', sequelize.col('text'), 140),
              sequelize.fn('IF', 
                sequelize.literal('LENGTH(text) > 140'),
              "...", "")),
            'text']
          ],
          order: [
            ['date', 'DESC'],
            ['updated_at', 'DESC']
          ],
          limit: limit,
          offset: offset,
          raw: true
        });
      }

      Promise.all([self.getAllEntryIdsByOwnerId(userId), doEntriesQuery()]).then(function (response){
        return resolve({ids: response[0], rows: response[1]});
      }, function (err){
        console.log('Err', err);
        return reject(err);
      });
    });
  }

  self.getAllEntriesByOwnerId = function(userId, limit, offset){
    return Entry.findAndCountAll({
      where: {ownerId: userId},
      attributes: [
        'id', 'date', 'text', 'isPublic',
        [sequelize.fn('date_format', sequelize.col('date'), '%Y-%m-%d'), 'date'],
      ],
      order: [
        ['date', 'DESC'],
        ['updated_at', 'DESC']
      ],
      raw: true
    });
  }

  self.getEntriesByTextSearch = function(text, userId, index, offset){
    return new Promise(function (resolve, reject){
      var totalQuery =    'SELECT id ' +
                          'FROM ( ' +
                            'SELECT id, date, text, updated_at ' +
                            'FROM entries ' +
                            'WHERE owner_id = :ownerId ' +
                          ') AS subQuery ' +
                          'WHERE LOWER(text) LIKE :text ' +
                          'ORDER BY date DESC, updated_at DESC';
      var entriesQuery =  'SELECT id, date, ' +
                            'IF(LENGTH(text) > 140, CONCAT(LEFT(text, 140), "..."), text) AS text ' +
                          'FROM ( ' +
                            'SELECT id, owner_id AS ownerId, date_format(date, "%Y-%m-%d") AS date, text, updated_at ' +
                            'FROM entries ' +
                            'WHERE owner_id = :ownerId ' +
                          ') AS subQuery ' +
                          'WHERE LOWER(text) LIKE :text ' +
                          'ORDER BY date DESC, updated_at DESC ' +
                          'LIMIT :index, :offset;';

      var doTotalQuery = function(){
        return sequelize.query(totalQuery, {
          replacements: {
            ownerId: userId,
            text: '%' + text + '%',
          },
          type: sequelize.QueryTypes.SELECT
        });
      }

      var doEntriesQuery = function(){
        return sequelize.query(entriesQuery, {
          replacements: {
            ownerId: userId,
            text: '%' + text + '%',
            index: index,
            offset: offset
          },
          type: sequelize.QueryTypes.SELECT
        });
      }

      Promise.all([doTotalQuery(), doEntriesQuery()]).then(function (response){
        return resolve({ids: response[0], rows: response[1]});
      }, function (err){
        console.log('Err', err);
        return reject(err);
      });
    });
  }

  self.getAllEntryIdsByOwnerId = function(userId){
    return Entry.findAll({
      where: {ownerId: userId},
      attributes: ['id'],
      order: [
        ['date', 'DESC'],
        ['updated_at', 'DESC']
      ],
      raw: true
    });
  }

  self.getAllEntryIdsByOwnerId = function(userId){
    return Entry.findAll({
      where: {ownerId: userId},
      attributes: [
        'id',
        [sequelize.fn('date_format', sequelize.col('date'), '%Y-%m-%d'), 'date'],
      ],
      order: [
        ['date', 'DESC'],
        ['updated_at', 'DESC']
      ],
      raw: true
    });
  }

  self.getEntryById = function(id){
    return Entry.findOne({
      where: {id: id},
      attributes: [
        'id', 'ownerId', 'text', 'isPublic',
        [sequelize.fn('date_format', sequelize.col('date'), '%Y-%m-%d'), 'date'],
      ],
      raw: true
    });
  }

  self.createEntry = function(data, ownerId){
    return new Promise(function (resolve, reject){
      Entry.create({
        ownerId: ownerId,
        date: data.date,
        text: data.text,
        isPublic: (!!data.isPublic) ? 1 : 0
      }).then(function (entry){
        return resolve(entry);
      }, function (err){
        return reject(err);
      });
    });
  }

  self.updateEntry = function(data){
    return Entry.update({
      date: data.date,
      text: data.text,
      isPublic: (!!data.isPublic) ? 1 : 0
    }, {
      where: {id: data.id}
    });
  }

  self.deleteEntry = function(entryId){
    return Entry.destroy({
      where: {id: entryId}
    });
  }

  self.getEntryCount = function(){
    return Entry.count();
  }
}
