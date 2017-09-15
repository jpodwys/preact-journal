const toQueryString = function(params) {
  var pairs = [];
  for (var i in (params || {})) {
    pairs.push(encodeURIComponent(i) + '=' + encodeURIComponent(params[i]));
  }

  if (pairs.length === 0) { //no params
    return "";
  }
  return pairs.join('&');
};

const parseURL = function(url){
  var parser = document.createElement('a');
  parser.href = url;

  // remove trailing &
  if (parser.href.length > 0 && (parser.href[parser.href.length - 1] === '&')) {
      parser.href = parser.href.slice(0, -1);
  }

  return parser;
};

const appendParams = function(url, params) {
  var parsedURL = parseURL(url),
      parsedParams = parsedURL.search,
      queryString = toQueryString(params);

  if (queryString.length === 0) {
    return url;
  }


  if(parsedParams.length !== 0){
    if (parsedURL.search[parsedURL.search.length - 1] === '&') {
      parsedURL.search = parsedURL.search.slice(0, -1);
    }

    parsedURL.search += '&'+queryString;
  } else {
    parsedURL.search = queryString;
  }

  return parsedURL.href;
};

export { toQueryString, parseURL, appendParams };
