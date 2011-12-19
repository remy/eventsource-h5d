var fs = require('fs'),
    connect = require('connect'),
    exec = require('child_process').exec,
    connections = [],
    history = [],
    lastMessageId = 0,
    uptimeTimeout = 0.1 * 1000;

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

function router(app) {
  app.get('/stats', function (req, res, next) {
    if (req.headers.accept == 'text/event-stream') {
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache'
      });

      // support the polyfill
      res.xhr = (req.headers['x-requested-with'] == 'XMLHttpRequest');
      if (res.xhr) {
        res.write(':' + Array(2049).join(' ') + '\n\n'); //2kb padding for IE
      }


      console.log('connected: ' + connections.length);
      if (req.headers['last-event-id']) {
        console.log('sending history from: ' + req.headers['last-event-id']);
        var id = parseInt(req.headers['last-event-id']);
        for (var i = 0; i < history.length; i++) {
          if (history[i].id >= id) {
            sendSSE(res, history[i].id, history[i].type, history[i].message);
          }
        }

      } else {
        res.write('id\n\n');
      }

      connections.push(res);
      broadcast('connection', req.headers['user-agent']);
      broadcast('connections', connections.length);

      req.on('close', function () {
        var i = connections.indexOf(res);
        if (i !== -1) {
          connections.splice(i, 1);
        }
      });
    } else {
      // arbitrarily redirect them away from this url
      res.redirect('/index.html');
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

  console.log('broadcast to %d connections', connections.length);

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
  console.log(data);
}

var app = connect.createServer().listen(process.env.PORT || 8000);

app.use(connect.logger());
app.use(connect.static(__dirname + '/public'));
app.use(connect.router(router));


console.log("Listening on port %d", app.address().port);
