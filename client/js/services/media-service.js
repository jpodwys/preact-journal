import xhr from '../xhr';

function uploadFile (file){
  return xhr('/api/media', {
    method: 'POST',
    body: file
  });
}

export default { uploadFile };
