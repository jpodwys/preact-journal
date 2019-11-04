var date = require('../utils/date');

module.exports = function(Entry){
  var self = this;

  self.createMedia = function(publicId, entryId){
    return new Promise(function (resolve, reject){
      Entry.create({
        id: publicId,
        entryId,
        updatedAt: date.getUtcZeroTimestamp()
      }).then(function (media){
        return resolve(media);
      }, function (err){
        return reject(err);
      });
    });
  }
}
