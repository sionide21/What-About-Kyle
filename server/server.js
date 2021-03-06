
var listeners = {};

var HOST = null;
var PORT = 8000;
var DBHOST = "localhost";
var DBPORT = 5984;
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
var client = couchdb.createClient(DBPORT, DBHOST);
var db = client.db(DB);

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

http.createServer(function (req, res) {
    
  // this gets the path part of the url
  // for example, if the user goes to http://localhost/hello?foo=bar
  // the path is "/hello"
  var parsedUrl = url.parse(req.url, true);
  var path = parsedUrl.pathname;

  function error(code, msg) {
	log(code + ': ' + path);
	res.writeHead(code, {'Content-Type': 'text/plain'});
	res.write(msg);
	res.close();
  }

  // does the expected path exist?
  if (paths[path]) {
    paths[path](parsedUrl.query, function(outJSON, notifyGroup) {
        outStr = JSON.stringify(outJSON);
        var jsonCallback = parsedUrl.query.jsoncallback;
        if (jsonCallback) {
            outStr = jsonCallback + "(" + outStr + ");"
        }
        res.writeHead(200, {
          'Content-Type': 'text/javascript',
          'Content-Length': outStr.length
        });
        res.write(outStr);
        res.close();
        if (notifyGroup) {
            var action = parsedUrl.pathname.substr(1);
            updateListeners(outJSON, action, notifyGroup);
        }
    }, error);
  } else {
    error(404, 'Not Found');
  }

}).listen(PORT);
sys.puts('here we go again! (on port ' + PORT + ')')

// this only outputs to the console if DEBUG flag is set
function debug(msg, item) {
  if (DEBUG) {
    if (item) {
		if (typeof(item) !== 'string') {
			log(msg + ": " + JSON.stringify(item));
		} else {
			log(msg + ": " + item);
		}
	} else {
		log(msg);
	}
  }
}

// this just outputs something to the console
function log(output) {
  sys.puts(output);
}

function addCar(query, complete, error) {
  if (query && query.car) {
    var car = query.car;
    var carObj = JSON.parse(car);
    debug('adding car: ', carObj);

    // add the car to the database
    db.saveDoc(carObj, handleDb(function(doc) {
      db.getDoc(doc.id, handleDb(function(doc) {
        complete(doc, {group: carObj.group, date: dateString(carObj.date)});
      }, error));
    }, error));
  } else {
    error(400, 'Missing required fields');
  }
}

function deleteCar(query, complete, error) {
  var car = query.car;
  var carObj = JSON.parse(car);
  debug('about to delete');
  debug(car);

  var id = carObj._id;
  var rev = carObj._rev;
  var group = carObj.group;

  debug('removing doc: id ' + id + '\nrev ' + rev);
  db.removeDoc(id, rev, handleDb(function(doc) {
    complete(carObj, {group: carObj.group, date: dateString(carObj.date)});
  }, error));
}

function getCarsForGroup(query, complete, error) {

  //TODO get cars for a certain date

  var date = dateString(query.date);
  var group = query.group;
  var queryUrl = '/cars/_design/search/_view/listCars?include_docs=true&key=["' + date + '","' + group + '"]';
  var client = couchdb.createClient(DBPORT, DBHOST);
  
  client.request(queryUrl, handleDb(function(docs) {
    var retCars = [];
    for (var i = 0; i < docs.rows.length; i++) {
      retCars.push(docs.rows[i].doc);
    }
    complete(retCars);
  }, error));
}

function listen(query, complete) {
  group = query.group;
  date = dateString(query.date);

  if (!listeners[group]) {
  	listeners[group] = [];
  }
  if (!listeners[group][date]) {
  	listeners[group][date] = [];
  }
  // add the listener callback function to the array of listeners
  debug('Adding listener', [group, date]);
  listeners[group][date].push({
    timestamp: new Date(),
    callback: function (doc, action) {
      complete({
        status: action,
        car: doc
      });
    },
    expire: function () {
      debug("expiring listener");
      complete({status: 'expired'});
    }
  });
}

function clearExpired() {
  var now = new Date();
  for (group in listeners) {
	  for (var i = 0; i < listeners[group].length; i++) {
		  while (listeners[group][i].length > 0 && now - listeners[group][i][0].timestamp > LISTENER_TIMEOUT) {
			listeners[group][i].shift().expire();
		  }
	  }
  }
}

function updateListeners(doc, action, group) {
  debug("group: ", group);
  
  // If the group doesn't yet exist
  if (!listeners[group.group] && !listeners[group.group][group.date]) {
  	return;
  }
  for (var i = 0; i < listeners[group.group][group.date].length; i++) {
      listeners[group.group][group.date][i].callback(doc, action);
  }
}

function handleDb(func,error) {
    return function(er, doc) {
      if (er) {
        printError(er);
        return error(500, JSON.stringify(er));
      }
      func(doc);
    }
}

function dateString(date) {
  var day = new Date(date);
  return day.getFullYear() + '-' + (day.getMonth() + 1) + '-' + day.getDate();
}

function printError(er) {
  for (var field in er) {
    log(field + ": " + er[field]);
  }
}

