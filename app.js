var fs = require('fs'),
    connect = require('connect'),
    exec = require('child_process').exec,
    connections = [],
    history = [],
    lastMessageId = 0,
    uptimeTimeout = 1 * 1000,
    totalRequests = 0;

setTimeout(function uptime() {
  var child = exec('uptime', function (err, stdout, stderr) {
    if (!err) {
      var loadraw = stdout.trim().replace(/,/g, '').split(/\s+/),
          load = {
            15: loadraw.pop(),
            5: loadraw.pop(),
            1: loadraw.pop()
          };
      broadcast('uptime', load);
    }
    setTimeout(uptime, uptimeTimeout);
  });
}, uptimeTimeout);

setTimeout(function time() {
  broadcast('time', +new Date);
  setTimeout(time, uptimeTimeout);
}, uptimeTimeout);

function removeConnection(res) {
  var i = connections.indexOf(res);
  if (i !== -1) {
    connections.splice(i, 1);
  }
}

function router(app) {
  app.get('/stats', function (req, res, next) {
    if (req.headers.accept == 'text/event-stream') {
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        'connection': 'keep-alive'
      });

      // support the polyfill
      if (req.headers['x-requested-with'] == 'XMLHttpRequest') {
        res.xhr = null;
      }


      if (req.headers['last-event-id']) {
        var id = parseInt(req.headers['last-event-id']);
        for (var i = 0; i < history.length; i++) {
          if (history[i].id >= id) {
            sendSSE(res, history[i].id, history[i].event, history[i].message);
          }
        }
      } else {
        // resets the ID
        res.write('id\n\n');
      }

      connections.push(res);
      broadcast('connections', connections.length);

      req.on('close', function () {
        removeConnection(res);
      });
    } else {
      // arbitrarily redirect them away from this url
      res.writeHead(302, { location: "/index.html" });
      res.end();
    }
  });
}

function broadcast(event, message) {
  message = JSON.stringify(message);
  ++lastMessageId;
  history.push({
    id: lastMessageId,
    event: event,
    message: message
  });

  //console.log('broadcast to %d connections', connections.length);

  connections.forEach(function (res) {
    sendSSE(res, lastMessageId, event, message);
  });
}

function sendSSE(res, id, event, message) {
  var data = '';
  if (event) {
    data += 'event: ' + event + '\n';
  }

  // blank id resets the id counter
  if (id) {
    data += 'id: ' + id + '\n';
  } else {
    data += 'id\n';
  }

  if (message) {
    data += 'data: ' + message.split(/\n/).join('\ndata:') + '\n';
  }
  data += '\n'; // final part of message

  res.write(data);

  if (res.hasOwnProperty('xhr')) {
    clearTimeout(res.xhr);
    res.xhr = setTimeout(function () {
      res.end();
      removeConnection(res);
    }, 250);
  }
  // console.log(data);
}

var app = connect.createServer().listen(process.env.PORT || 8000);

app.use(function (req, res, next) {
  broadcast('requests', ++totalRequests);
  next();
});
app.use(connect.static(__dirname + '/public'));
app.use(connect.router(router));


console.log("Listening on port %d", app.address().port);
