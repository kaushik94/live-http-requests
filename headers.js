// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var tabId = parseInt(window.location.search.substring(1));
var currrentDomain = '';

window.addEventListener("load", function() {
  chrome.debugger.sendCommand({tabId:tabId}, "Network.enable");
  chrome.debugger.onEvent.addListener(onEvent);
});

window.addEventListener("unload", function() {
  chrome.debugger.detach({tabId:tabId});
});

var requests = {};

function onEvent(debuggeeId, message, params) {
  if (tabId != debuggeeId.tabId)
    return;

  if (message == "Network.requestWillBeSent") {
    var checkUrl = params.request.url;
    if (ignoreUrl(checkUrl, params.type)) { return; }
    var requestDiv = requests[params.requestId];
    if (!requestDiv) {
      var requestDiv = document.createElement("div");
      requestDiv.className = "request";
      requests[params.requestId] = requestDiv;
      var urlLine = document.createElement("div");
      urlLine.textContent = params.request.url;
      requestDiv.appendChild(urlLine);
    }

    if (params.redirectResponse)
      appendResponse(params.requestId, params.redirectResponse);

    var requestLine = document.createElement("div");
    var urlObj = parseURL(params.request.url);
    requestLine.textContent = "\n" + params.request.method + " " +
        urlObj.path;
    requestDiv.appendChild(requestLine);
    var queryStringParams = parseQueryString(params.request.url);
    if (queryStringParams.params) {
      appendQueryParams(params.requestId, queryStringParams.string);
    }
    if (params.request.postData) {
      var postData = document.createElement("div");
      postData.textContent = "POST DATA: " + params.request.postData;
      requestDiv.appendChild(postData);
    }
  } else if (message == "Network.responseReceived") {
    console.log(params.type, "response type");
    if (!ignoreType(params.type)) {
      document.getElementById("container").appendChild(requests[params.requestId]);
      appendResponse(params.requestId, params.response);
    }
  }
}

function appendQueryParams(requestId, response) {
  var requestDiv = requests[requestId];
  var queryParamsDiv = document.createElement("div");
  queryParamsDiv.textContent = response;
  requestDiv.appendChild(queryParamsDiv);
}

function appendResponse(requestId, response) {
  var requestDiv = requests[requestId];
  // requestDiv.appendChild(formatHeaders(response.requestHeaders));

  var statusLine = document.createElement("div");
  if (response.status == 200) {
    statusLine.style.backgroundColor = '#5fba7d';
  } else {
    statusLine.style.backgroundColor = '#FF8C00';
  }
  statusLine.textContent = response.status + " " +
      response.statusText;
  requestDiv.appendChild(statusLine);
}

function formatHeaders(headers) {
  var text = "";
  for (name in headers)
    text += name + ": " + headers[name] + "\n";
  var div = document.createElement("div");
  div.textContent = text;
  return div;
}

function parseURL(url) {
  var result = {};
  var match = url.match(
      /^([^:]+):\/\/([^\/:]*)(?::([\d]+))?(?:(\/[^#]*)(?:#(.*))?)?$/i);
  if (!match)
    return result;
  result.scheme = match[1].toLowerCase();
  result.host = match[2];
  result.port = match[3];
  result.path = match[4] || "/";
  result.fragment = match[5];
  console.log(result);
  return result;
}

function parseQueryString (url) {
  var urlParams = url.split('?');
  var parsedParameters = {};
  if (urlParams.length === 2) {
    var paramsString = '\n';
    var uriParameters = urlParams[1].replace('/', '').split('&');
    for (var i = 0; i < uriParameters.length; i++) {
      var parameter = uriParameters[i].split('=');
      if (parameter[1] !== 'undefined' && parameter[0] !== 'undefined') {
        var value = decodeURIComponent(parameter[1]);
        parsedParameters[parameter[0]] = value;
        paramsString = paramsString + parameter[0] + ': ' + value + "\n";
      }
    }
    paramsString = paramsString + '\n';
    return {url: urlParams[0], params: parsedParameters, string: paramsString};
  }
  return {url: url, params: false};
}

function ignoreUrl(url, type) {
  var ending = url.split('.').pop();
  if (['js', 'png', 'jpg', 'css', 'woff2', 'woff'].indexOf(ending) >= 0) {
    return true;
  }
  return false;
}

function ignoreType(type) {
  if (['Image', 'Stylesheet', 'Media', 'Font', 'Script'].indexOf(type) >= 0) {
    return true;
  }
  return false;
}