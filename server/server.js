
var listeners = [];

var HOST = null;
var PORT = 8000;
var DB = 'cars';
var LISTENER_TIMEOUT = 30 * 1000;

// command line arguments
var argv = process.argv;
var argc = argv.length;

// use the DEBUG flag from the command line to get extra output
var DEBUG = false;
for (var i = 0; i < argc; i++) {
  if (argv[i].match("DEBUG")) {
    DEBUG = true;
  }
}

var sys = require('sys');
var url = require('url');
var http = require('http');

var couchdb = require('./lib/couchdb');
var client = couchdb.createClient(5984, 'localhost');
var db = client.db(DB);

http.createServer(function (req, res) {

  // key value pairs in the form:
  //   "/path" : callbackFunction
  var paths = {
    "/getCars"    : getCarsForGroup,
    "/addCar"     : addCar,
    "/modifyCar"  : addCar,
    "/deleteCar"  : deleteCar,
    "/listen"     : listen,
  };

  // check for expired listeners once per second
  setInterval(clearExpired, 1000);
    
  // this gets the path part of the url
  // for example, if the user goes to http://localhost/hello?foo=bar
  // the path is "/hello"
  var parsedUrl = url.parse(req.url, true);
  var path = parsedUrl.pathname;

  // does the expected path exist?
  if (paths[path]) {
    log('200: ' + path);
    paths[path](req, res, parsedUrl);
  } else {
    log('404: ' + path);
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.close();
  }

}).listen(PORT);
sys.puts('here we go again! (on port ' + PORT + ')')

// this only outputs to the console if DEBUG flag is set
function debug(output) {
  if (DEBUG) {
    log(output);
  }
}

// this just outputs something to the console
function log(output) {
  sys.puts(output);
}

function addCar(req, res, parsedUrl) {
  if (parsedUrl.query && parsedUrl.query.car) {
    var car = parsedUrl.query.car;
    var carObj = JSON.parse(car);
    var group = carObj.group;
    debug("adding car to group: " + group);
    var jsonCallback = parsedUrl.query.jsoncallback;
    debug('adding car: ' + carObj);

    // add the car to the database
    db.saveDoc(carObj, function(er, doc) {
      if (er) printError(er);
      db.getDoc(doc.id, function(er, doc) {

        var action = parsedUrl.pathname.substr(1);
        var docJson = JSON.stringify(doc);
        var docStr = jsonCallback + "(" + docJson + ");";

        // return the newly added car to the client that uploaded it
        res.writeHead(200, {
          'Content-Type': 'text/javascript',
          'Content-Length': docStr.length});
        res.write(docStr);
        res.close();

        // notify all listening clients
        debug("pushing " + action + " updates to " + listeners.length + " listeners.");
        updateListeners(doc, action, group);
      });
    });

  } else {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.close();
  }
}

function deleteCar(req, res, parsedUrl) {
  var car = parsedUrl.query.car;
  var carObj = JSON.parse(car);
  debug('about to delete');
  debug(car);

  var id = carObj._id;
  var rev = carObj._rev;
  var group = carObj.group;

  debug('removing doc: id ' + id + '\nrev ' + rev);
  db.removeDoc(id, rev, function(er, doc) {
    if (er) printError(er);

    var jsonCallback = parsedUrl.query.jsoncallback;
    var action = 'deleteCar';
    var docStr = jsonCallback + "(" + JSON.stringify(carObj) + ");";
    debug(docStr);

    res.writeHead(200, {
      'Content-Type': 'text/javascript',
      'Content-Length': docStr.length});
    res.write(docStr);
    res.close();

    // notify all listening clients
    updateListeners(carObj, action, group);
  });
}

function getCarsForGroup(req, res, parsedUrl) {

  //TODO get cars for a certain date

  var day = new Date(parsedUrl.query.date);
  var jsonCallback = parsedUrl.query.jsoncallback;
  var group = parsedUrl.query.group;
  var queryUrl = '/cars/_design/search/_view/groupsearch?include_docs=true&key="' + group + '"';
  var client = couchdb.createClient();
  client.request(queryUrl, function(er, docs) {
    if (er) printError(er);

    var retCars = [];
    for  (var i = 0; i < docs.total_rows; i++) {
      retCars.push(docs.rows[i].doc);
    }
    
    var retCarsStr = jsonCallback + "(" + JSON.stringify(retCars) + ");";
    debug(retCarsStr);
    res.writeHead(200, {
      'Content-Type': 'text/javascript', 
      'Content-Length': retCarsStr.length});
    res.write(retCarsStr);
    res.close();
  });
}

function listen(req, res, parsedUrl) {
  //TODO get only on a certain date
  var group = parsedUrl.query.group;

  // add the listener callback function to the array of listeners
  listeners.push({
    timestamp: new Date(),
    group: group,
    callback: function (doc, action) {
      var docStr = '{ status : "' + action + '", car: ' + JSON.stringify(doc) + '}';
      debug(docStr);

      var jsonCallback = parsedUrl.query.jsoncallback;
      var update = jsonCallback + "(" + docStr + ");";
      res.writeHead(200, {
        'Content-Type': 'text/javascript',
        'Content-Length': update.length});
      res.write(update);
      res.close();
    },
    expire: function () {
      debug("expiring listener");
      var jsonCallback = parsedUrl.query.jsoncallback;
      var expireStr = '{status: "expired"}';
      var update = jsonCallback + "(" + expireStr + ");";
      res.writeHead(200, {
        'Content-Type': 'text/javascript',
        'Content-Length': update.length});
      res.write(update);
      res.close();
    }
  });
}

function clearExpired() {
  var now = new Date();
  while (listeners.length > 0 && now - listeners[0].timestamp > LISTENER_TIMEOUT) {
    listeners.shift().expire();
  }
}

function updateListeners(doc, action, group) {
  debug("group: " + group);
  for (var i = 0; i < listeners.length; i++) {
    // check if the listener is in the right group
    debug("listener's group: " + listeners[i].group);
    if (listeners[i].group === group) {
      listeners[i].callback(doc, action);
    }
  }
}

function printError(er) {
  for (var field in er) {
    log(field + ": " + er[field]);
  }

  // uncommenting the next line will cause the server to halt on error
//  throw er;
}

