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
    res.writeHead(200, {'Content-Type': 'application/json'});
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

// this is the form of a jsonobject representing a car the client should send
//{
//  "date": "March 12, 2010 11:30:00",
//  "driver": "Alex",
//  "passengers": ["Nathan", "David"],
//  "numSeats": 4,
//  "dest": "Taco Bell",
//  "location": {
//    "lat": 11,
//    "lon": 22
//  },
//  "group": "coop"
//}

//  var car = parsedUrl.query.car;
    //JSON.stringify(docs.rows)
  var car = {
    driver: parsedUrl.query.car
  };
  db.saveDoc(car);
  
  log("adding car: " + car);

  // add the car to the database
  //TODO add car to database here instead of array
  //cars.push(car);

  // notify all listening clients
  for (var i = 0; i < listeners.length; i++) {
    listeners[i].write(JSON.stringify(car));
    listeners[i].close();
  }
  res.close();
}

function modifyCar() {
}

function deleteCar() {
}

function getCarsForGroup(req, res, parsedUrl) {

  //TODO get group from request
  //var group = parsedUrl.query.group;
  
  var query = couchdb.toQuery({
    include_docs: true,
    limit: 1
  });

  //log(query);

  var client = couchdb.createClient();
  client.request('/cars/_all_docs?include_docs=true', function(er, docs) {

//  db.allDocs(query, function(er, docs) {
    if (er) throw er;

    var retCars = [];
    for  (var i = 0; i < docs.total_rows; i++) {
      retCars.push(docs.rows[i].doc);
    }
    
    log(JSON.stringify(retCars));
    res.write(JSON.stringify(retCars));
    res.close();
  });
}

function listen(req, res, parsedUrl) {
  //TODO get groupKey from request
  //var group = parsedUrl.query.group;

  // add the request to the array of listeners
  listeners.push(res);

  // not calling res.close() here so that connection stays open.
  // this way, the client will get updates as soon as it occurs.
}

