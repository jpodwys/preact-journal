// Adapted from here: https://stackoverflow.com/questions/10730362/get-cookie-by-name
function get (name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if(match) return match[2];
}

export default { get };
