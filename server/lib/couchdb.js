var
  sys = require("sys"),
  events = require("events"),
  http = require('http'),
  fs = require('fs'),
  path = require('path'),
  sys = require('sys'),
  querystring = require('querystring'),
  mime = require('./dep/mime'),
  base64 = require('./dep/base64');

// Stringify function embedded inside of objects. Useful for couch views
exports.toJSON = function(data) {
  return JSON.stringify(data, function(key, val) {
    if (typeof val == 'function') {
      return val.toString();
    }
    return val;
  });
};

// Encode query values to JSON except the stale parameter
exports.toQuery = function(query) {
  for (var k in query) {
    if (k !== 'stale') {
      query[k] = JSON.stringify(query[k]);
    }
  }
  return querystring.stringify(query);
};

// Helps turning a file into an inline CouchDB attachment
exports.toAttachment = function(file, cb) {
  fs.readFile(file, 'binary', function (er, data) {
    if (er) return cb && cb(er, data);
    var ext = path.extname(file).substr(1);
    cb && cb(null, {
      content_type: mime.lookup(ext),
      data: base64.encode(data)
    });
  })
};

exports.createClient = function(port, host) {
  if (isNaN(port)) {
    host = port;
    port = 5984;
  }
  host = host || "localhost";

  var
    httpClient = http.createClient(port, host),
    couchClient = new Client();

  couchClient.__defineGetter__('host', function() {
    return host;
  });

  couchClient.__defineGetter__('port', function() {
    return port;
  });

  couchClient._queueRequest = function(options, cb) {
    if (options.query) {
      options.path += '?'+exports.toQuery(options.query);
      delete options.query;
    }

    var
      request = httpClient.request(
        options.method.toUpperCase(),
        options.path,
        options.headers
      ),
      cbFired = false,
      onClose = function(hadError, reason) {
        if (hadError && !cbFired) cb && cb(new Error(reason));
        httpClient.removeListener('close', onClose);
      };
    
    httpClient.addListener('close', onClose);

    if (options.data && typeof options.data != 'string') {
      options.data = exports.toJSON(options.data);
    }

    if (options.data) {
      request.write(options.data, options.requestEncoding || 'utf8');
    }
    request.addListener("response", function(res) {
      var buffer = '';
      res.setBodyEncoding(options.responseEncoding || 'utf8');
      res
        .addListener('data', function(chunk) {
          buffer += (chunk || '');
        })
        .addListener('end', function() {
          if(options.responseEncoding == 'binary') {
            cbFired = true;
            return cb && cb(null, buffer);
          }

          var json;
          try {
            json = JSON.parse(buffer);
          } catch (e) {
            cbFired = true;
            return cb && cb(new Error('invalid json: '+json+" "+e.message));
          }

          if ('error' in json) {
            cbFired = true;
            return cb && cb(json);
          }

          if (!options.full) {
            cbFired = true;
            return cb && cb(null, json);
          }

          cbFired = true;
          cb && cb(null, {
            headers: res.headers,
            json: json,
          });
        });
      
    });
    request.close();
  };

  return couchClient;
};

var Client = exports.Client = function() {

}; 

function requestOptions (args) {
  var options;
  // might get between 0 and 3 strings,
  // and then a function
  var args = Array.prototype.slice.call(args, 0);
  cb = (typeof args[args.length-1] === "function") ? args.pop() : null;
  // sys.debug(args.length);
  // sys.debug(sys.inspect(args));
  
  var method = args.shift(),
    path = args.shift(),
    data = args.shift();
  
  if (typeof method == 'object') {
    options = method;
  } else if (typeof method == 'string' && typeof path != 'string') {
    options = {
      path: method,
      query: path
    };
  } else {
    options = {
      method: method,
      path: path,
      data: data
    }
  }
  options.cb = cb;
  // sys.debug("requestOptions2 "+sys.inspect(options));
  return options;
}

Client.prototype.request = function(method, path, data, cb) {
  var
    defaults = {
      method: 'get',
      path: '/',
      headers: {},
      data: null,
      query: null,
      full: false
    },
    options = requestOptions(arguments);

  options = process.mixin(defaults, options);
  options.headers.host = options.headers.host || this.host;

  return this._queueRequest(options, options.cb);
};

Client.prototype.allDbs = function(cb) {
  return this.request({
    path: '/_all_dbs'
  }, cb);
};

Client.prototype.config = function(cb) {
  return this.request({
    path: '/_config'
  }, cb);
};

Client.prototype.uuids = function(count, cb) {
  if (!cb && typeof(count) === "function") {
    cb = count;
    count = "";
  }
  return this.request({
    path: '/_uuids'+(count ? '?count='+count : '')
  }, cb);
};

Client.prototype.replicate = function(source, target, options, cb) {
  if (!cb && typeof(options) === "function") {
    cb = options;
    options = {};
  }
  options = process.mixin({
    source: source,
    target: target,
  }, options || {});

  return this.request({
    method: 'POST',
    path: '/_replicate',
    data: options
  }, cb);
};

Client.prototype.stats = function() {
  var args = Array.prototype.slice.call(arguments),
    cb = (typeof args[args.length - 1] === "function") ? args.pop() : null;
  return this.request({
    path: '/_stats'+((args) ? '/'+args.join('/') : '')
  }, cb);
};

Client.prototype.activeTasks = function(cb) {
  return this.request({
    path: '/_active_tasks'
  }, cb);
};

Client.prototype.db = function(name) {
  var
    couchClient = this,
    couchDb = new Db();

  couchDb.__defineGetter__('name', function() {
    return name;
  });

  couchDb.__defineGetter__('client', function() {
    return couchClient;
  });

  couchDb.request = function(method, path, data, cb) {
    var options = requestOptions(arguments);
    options.path = '/'+name+(options.path || '');
    return couchClient.request(options, options.cb);
  };

  return couchDb;
};

var Db = exports.Db = function() {
  
}; 

Db.prototype.exists = function(cb) {
  this.request({path: ''}, function (er) {
    // if it was an error, then that's a "no" on the existing.
    cb && cb(null, !(er && er.error == 'not_found'));
  });
};

Db.prototype.info = function(cb) {
  return this.request({}, cb);
};

Db.prototype.create = function(cb) {
  return this.request({
    method: 'PUT'
  }, cb);
};

Db.prototype.remove = function(cb) {
  return this.request('DELETE', '', cb);
};

Db.prototype.getDoc = function(id, cb) {
  return this.request({
    path: '/'+id
  }, cb);
};

Db.prototype.saveDoc = function(id, doc, cb) {
  if (typeof id == 'object') {
    cb = doc;
    return this.request({
      method: 'POST',
      path: '/',
      data: id,
    }, cb);
  }

  return this.request({
    method: 'PUT',
    path: '/'+id,
    data: doc,
  }, cb);
};

Db.prototype.removeDoc = function(id, rev, cb) {
  return this.request({
    method: 'DELETE',
    path: '/'+id + '?rev=' + rev
//    query: {rev: rev}
  }, cb);
};

Db.prototype.copyDoc = function(srcId, destId, destRev, cb) {
  if (!cb && typeof(destRev) === "function") {
    cb = destRev;
    destRev = null;
  }
  if (destRev) {
    destId += '?rev='+destRev;
  }

  return this.request({
    method: 'COPY',
    path: '/'+srcId,
    headers: {
      'Destination': destId
    }
  }, cb);
}

Db.prototype.bulkDocs = function(data, cb) {
  if (!cb && typeof(data) === "function") {
    cb = data;
    data = null;
  }
  return this.request({
    method: 'POST',
    path: '/_bulk_docs',
    data: data,
  }, cb);
};

Db.prototype.saveDesign = function(design, doc, cb) {
  if (typeof design == 'object') {
    if (design._id && !design._id.match(/^_design\//)) {
      design._id = '_design/'+design._id;
    }
    return this.saveDoc(design, doc, cb);
  }

  return this.saveDoc('_design/' + design, doc, cb);
};

Db.prototype.saveAttachment = function(file, docId, options, cb) {
  var
    self = this,
    ext = path.extname(file).substr(1);
  
  if (!cb && typeof(options) === "function") {
    cb = options;
    options = {};
  }
  
  options = process.mixin({
    name: path.basename(file),
    contentType: mime.lookup(ext),
    rev: null
  }, options || {});

  // We could stream the file here, but I doubt people store big enough files
  // in couch to make this worth it?
  fs.readFile(file, 'binary', function (er, data) {
    if (er) return cb && cb(er);
    self.request({
      method: 'PUT',
      requestEncoding: 'binary',
      path: '/'+docId+'/'+options.name+(options.rev ? '?'+options.rev : ''),
      headers: {
        'Content-Type': options.contentType
      },
      data: data,
    }, cb);
  });
};

Db.prototype.removeAttachment = function(docId, attachmentId, docRev, cb) {
  return this.request({
    method: 'DELETE',
    path: '/'+docId+'/'+attachmentId,
    query: {rev: docRev}
  }, cb)
};

Db.prototype.getAttachment = function(docId, attachmentId, cb) {
  return this.request({
    path: '/'+docId+'/'+attachmentId,
    responseEncoding: 'binary',
  }, cb);
};

Db.prototype.allDocs = function(query, cb) {
  if (!cb && typeof(query) === "function") {
    cb = query;
    query = null;
  }
  return this.request({
    path: '/_all_docs',
    query: query
  }, cb);
};

Db.prototype.allDocsBySeq = function(query, cb) {
  if (!cb && typeof(query) === "function") {
    cb = query;
    query = null;
  }
  return this.request({
    path: '/_all_docs_by_seq',
    query: query
  }, cb);
};

Db.prototype.compact = function(design, cb) {
  if (!cb && typeof(design) === "function") {
    cb = design;
    design = null;
  }
  return this.request({
    method: 'POST',
    path: '/_compact'+(design ? '/'+design : ''),
  }, cb);
};

Db.prototype.tempView = function(data, query, cb) {
  return this.request({
    method: 'POST',
    path: '/_temp_view',
    data: data,
    query: query
  }, cb);
};

Db.prototype.viewCleanup = function(cb) {
  return this.request({
    method: 'POST',
    path: '/_view_cleanup',
  }, cb);
};

Db.prototype.view = function(design, view, query, cb) {
  return this.request({
    path: '/_design/'+design+'/_view/'+view,
    query: query
  }, cb);
};

Db.prototype.changes = function(query, cb) {
  return this.request({
    path: '/_changes',
    query: query
  }, cb);
};

Db.prototype.changesStream = function(query, options) {
  query = process.mixin({
    feed: "continuous",
    heartbeat: 1 * 1000
  }, query || {});

  options = process.mixin({
    timeout: 0,
  }, options);

  var
    stream = new process.EventEmitter(),
    client = http.createClient(this.client.port, this.client.host),
    path = '/'+this.name+'/_changes?'+exports.toQuery(query),
    headers = {'Host': this.client.host},
    request = client.request('GET', path, headers),
    buffer = '';

  client.setTimeout(options.timeout);
  request.addListener("response", function(res) {
    res.addListener('data', function(chunk) {
      buffer += (chunk || '');

      var offset, change;
      while ((offset = buffer.indexOf("\n")) >= 0) {
        change = buffer.substr(0, offset);
        buffer = buffer.substr(offset +1);

        // Couch sends an empty line as the "heartbeat"
        if (change == '') {
          return stream.emit('heartbeat');
        }

        try {
          change = JSON.parse(change);
        } catch (e) {
          return stream.emit('error', 'invalid json: '+change);
        }

        stream.emit('data', change);
      }
    })
  });
  request.close();

  client.addListener('close', function(hadError) {
    stream.emit('end', hadError);
  });

  stream.close = function() {
    return client.forceClose();
  };

  return stream;
};
