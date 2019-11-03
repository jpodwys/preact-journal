import xhr from '../xhr';

function uploadImage (image){
  return xhr('/api/image', {
    method: 'POST',
    body: image
  });
}

export default { uploadImage };
