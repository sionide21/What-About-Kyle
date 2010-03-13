//var fu = require('fu');
//var qs = require('querystring');

var cars = [];
var listeners = [];

var HOST = null;
var PORT = 8000;

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
var db = client.db('cars');

http.createServer(function (req, res) {

  // key value pairs in the form:
  //   "/path" : callbackFunction
  var paths = {
    "/getCars"    : getCarsForGroup,
    "/addCar"     : addCar,
    "/modifyCar"  : modifyCar,
    "/deleteCar"  : deleteCar,
    "/listen"     : listen,
    "/hello" : function(req, res, parsedUrl) {
      db.getDoc('my-doc', function(er, doc) {
        if (er) {
          throw er;
        } else {
          if (doc.driver) {
            res.write("driver: " + doc.driver);
          } else {
            log('no driver!!');
          }
        }
        res.close();
      });
    }
  };
  
  // this gets the path part of the url
  // for example, if the user goes to http://localhost/hello?foo=bar
  // the path is "/hello"
  var parsedUrl = url.parse(req.url, true);
  var path = parsedUrl.pathname;

  // does the expected path exist?
  if (paths[path]) {
    log('200: ' + path);
    res.writeHead(200, {'Content-Type': 'text/plain'});
    paths[path](req, res, parsedUrl);
  } else {
    log('404: ' + path);
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.close();
  }

}).listen(PORT);
sys.puts('here we go again! (on port ' + PORT + ')')


// this just outputs something to the console
function log(output) {
  if (DEBUG) {
    sys.puts(output);
  }
}


function addCar(req, res, parsedUrl) {

  var car = parsedUrl.query.car;
  
  log("adding car: " + car);

  // add the car to the storage
  //TODO add car to database here instead of array
  cars.push(car);

  // send the newly added car to all listening clients
  for (var i = 0; i < listeners.length; i++) {
    listeners[i].write(car);
    listeners[i].close();
  }
  res.close();
}

function modifyCar() {
}

function deleteCar() {
}

function getCarsForGroup(req, res, parsedUrl) {
  var groupKey;
  //TODO get groupKey from request
  listeners.push(res);
  for (var i = 0; i < cars.length; i++) {
    res.write(cars[i] + "\n");
  }
  res.close();
}

function listen(req, res, parsedUrl) {
  //TODO get groupKey from request
  // simply adds the request to the array of listeners
  listeners.push(res);

  // not calling res.close() here so that connection stays open.
  // this way, the client will get updates as soon as it occurs.
}

