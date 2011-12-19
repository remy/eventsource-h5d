var connStatus = document.getElementById('connStatus'),
    connections = document.getElementById('connections'),
    useragentHistory = document.getElementById('useragentHistory'),
    load = { 1: document.getElementById('l1'), 5: document.getElementById('l5'), 15: document.getElementById('l15') };

function connectionOpen(open) {
  connStatus.className = open ? 'open' : '';
  connStatus.innerHTML = open ? 'Active connection to server' : 'Connection dropped - trying to reopen';
}

function updateConnections(event) {
  connections.innerHTML = JSON.parse(event.data);
}

function newConnection(event) {
  useragentHistory.innerHTML = JSON.parse(event.data);
}

var lastL1 = null,
    history = [];

function updateUptime(event) {
  var loadData = JSON.parse(event.data);
  for (var key in loadData) {
    load[key].innerHTML = loadData[key];
  }

  // normalise
  var l1 = (loadData[1] * 100 | 0) + 0.5;

  history.unshift(l1);
  if (history.length > 400) {
    history.splice(400, 400 - history.length);
  }

  var max = Math.max.apply(Math, history) * 1.25;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillText(loadData[1], 0, 50 - (history[0]/max * 50));
  ctx.restore();
  ctx.beginPath();
  for (var i = 0; i < history.length; i++) {
    ctx.lineTo(i + 20.5, 50 - (history[i-1]/max * 50) + 0.5);
  }
  ctx.stroke();
  ctx.closePath();
}

var source = new EventSource('/stats');
source.addEventListener('open', function () { connectionOpen(true); }, false);
source.addEventListener('error', function () { connectionOpen(false); }, false);
source.addEventListener('connections', updateConnections, false);
source.addEventListener('connection', newConnection, false);
source.addEventListener('uptime', updateUptime, false);

var ctx = document.getElementById('spark').getContext('2d');
ctx.canvas.height = 50;
ctx.canvas.width = 400;
ctx.fillStyle = '#259BDA';
ctx.strokeStyle = '#259BDA';
