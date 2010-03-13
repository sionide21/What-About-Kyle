//var fu = require('fu');
//var qs = require('querystring');

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
    "/modifyCar"  : addCar,
    //"/modifyCar"  : modifyCar,
    "/deleteCar"  : deleteCar,
    "/listen"     : listen,
    "/hello" : function(req, res, parsedUrl) {
      var body = "Hlelo world!";
      res.writeHead({
        'Content-type' : 'text/html',
        'Content-length' : body.length
      });
      res.write(body);
      res.close();
      /*db.getDoc('my-doc', function(er, doc) {
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
      */
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
//    "lng": 22
//  },
//  "group": "coop"
//}

  if (parsedUrl.query && parsedUrl.query.car) {
    var car = parsedUrl.query.car;
    var carObj = JSON.parse(car);
    var jsonCallback = parsedUrl.query.jsoncallback;
    log('adding car: ' + carObj);

    // add the car to the database
    db.saveDoc(carObj, function(er, doc) {
      if (er) throw er;
      db.getDoc(doc.id, function(er, doc) {

        var action = parsedUrl.pathname.substr(1);
        var docJson = JSON.stringify(doc);
        var docStr = jsonCallback + "(" + docJson + ");";

        res.writeHead(200, {
          'Content-Type': 'text/json',
          'Content-Length': docStr.length});
        res.write(docStr);
        res.close();

        // notify all listening clients
        log("pushing " + action + " updates to " + listeners.length + " listeners.");

        // return the newly added car to the client that uploaded it

        for (var i = 0; i < listeners.length; i++) {
          listeners[i](doc, action);
  //var jsonCallback = parsedUrl.query.jsoncallback;
        }
      });
    });

  } else {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.close();
  }
}

function modifyCar() {
}

function deleteCar(req, res, parsedUrl) {
  var car = parsedUrl.query.car;
  var carObj = JSON.parse(car);
  var id = carObj.id;
  var rev = carObj.rev;

  //TODO implement group stuff
//  var group = parsedUrl.query.group;

  log('removing doc ' + id);
  db.removeDoc(id, rev, function(er, doc) {
    if (er) throw er;

    var docJson = JSON.stringify(doc);
    var docStr = jsonCallback + "(" + docJson + ");";

    res.writeHead(200, {
      'Content-Type': 'text/json',
      'Content-Length': docStr.length});
    res.write(docStr);
    res.close();

    // notify the listeners of the delete
    for (var i = 0; i < listeners.length; i++) {
      listeners[i](doc, "deleteCar");
    }
  });

  log('done removing doc');
  res.close();
  log('called close');
}

function getCarsForGroup(req, res, parsedUrl) {

  var jsonCallback = parsedUrl.query.jsoncallback;

  //TODO get group from request
  //var group = parsedUrl.query.group;
  
  var query = couchdb.toQuery({
    include_docs: true,
    limit: 1
  });

  var client = couchdb.createClient();
  client.request('/cars/_all_docs?include_docs=true', function(er, docs) {

//  db.allDocs(query, function(er, docs) {
    if (er) throw er;

    var retCars = [];
    for  (var i = 0; i < docs.total_rows; i++) {
      retCars.push(docs.rows[i].doc);
    }
    

/*    var retCarsStr = 
'{  "date": "March 12, 2010 11:30:00",  "driver": "Alex",  "passengers": ["Nathan", "David"],  "numSeats": 4,  "dest": "Taco Bell",  "location": {   "lat": 11,    "lon": 22  },  "group": "coop"}';*/
    
    var retCarsStr = jsonCallback + "(" + JSON.stringify(retCars) + ");";
    log(retCarsStr);
    res.writeHead(200, {
      'Content-Type': 'text/json', 
      'Content-Length': retCarsStr.length});
    res.write(retCarsStr);
    res.close();
  });
}

function listen(req, res, parsedUrl) {
  //TODO get only on a certain date
  //TODO get groupKey from request
  //var group = parsedUrl.query.group;

  // add the listener callback function to the array of listeners
  listeners.push(function (doc, action) {
    var docStr = '{ status : "' + action + '", car: ' + JSON.stringify(doc) + '}';

    // log the update
    log(docStr);

    var jsonCallback = parsedUrl.query.jsoncallback;
    var update = jsonCallback + "(" + docStr + ");";
      res.writeHead(200, {
        'Content-Type': 'text/json',
        'Content-Length': update.length});
      res.write(update);
      res.close();
  });

  // not calling res.close() here so that connection stays open.
  // this way, the client will get updates as soon as it occurs.
}

