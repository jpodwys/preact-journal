export default optimizeImage = file => {
  return new Promise (resolve => {
    const canvas = document.createElement('canvas');
    const canvasContext = canvas.getContext('2d');
    canvas.setAttribute("style", 'opacity:0;position:absolute;z-index:-1;top:-100000000;left:-1000000000;width:320px;height:240px;');
    document.body.appendChild(canvas);
    const img = new Image;
    img.onload = () => {
      canvasContext.drawImage(img, 0, 0, 320, 240);
      document.body.removeChild(canvas);
      URL.revokeObjectURL(img.src);
      const base64Image = canvas.toDataURL('image/png');
      return resolve(base64Image);
    }
    img.src = URL.createObjectURL(file);
  });
};
