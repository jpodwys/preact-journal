module.exports = function(Media, Entry){
  var self = this;
  const fourHundred = { status: 400, message: 'Must provide a file.' };
  const fourOhFour = { status: 400, message: 'Entry not found.' };
  const fiveHundred = { status: 500, message: 'There was an error.' };

  const postMedia = (file) => {

  };

  const postMediaSuccess = (resolve, publicId, entryId) => {
    Media.createMedia(publicId, entryId).then(function (media){
      return resolve(publicId);
    });
  };

  const postMediaFailure = (reject, err) => {
    return reject(fiveHundred);
  };

  self.createMedia = function({body, query, params, user}){
    return new Promise(function (resolve, reject){
      if(!body) return reject(fourHundred)
      var entryId = parseInt(params.entryId, 10);
      Entry.getEntryById(entryId).then(function (entry){
        if(!entry || user.id !== entry.ownerId) return reject(fourOhFour);
        postMedia(body)
          .then(({ publicId }) => postMediaSuccess(resolve, publicId, entryId))
          .catch(postMediaFailure);
      }, function (err){
        return reject(fiveHundred);
      });
    });
  }
}
