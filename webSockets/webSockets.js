const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const users = require('../states/users');
const { objectifyCookie } = require('../utils/cookie');
const AvlTree = require('../utils/AvlTree');

const wsServer = new WebSocket.WebSocketServer({ noServer: true });

const clients = new AvlTree();

const { JWT_SECRET = 'Secret-key' } = process.env;

module.exports.initWebSocket = (server) => {
  server.on('upgrade', (request, socket, head) => {
    const { wsAuth } = objectifyCookie(request.headers.cookie);
    if (!wsAuth) {
      // eslint-disable-next-line no-console
      console.log('Connection refused');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wsServer.handleUpgrade(request, socket, head, (websocket) => {
      wsServer.emit('connection', websocket, request);
    });
  });

  wsServer.on('connection', (socket, request) => {
    const ws = socket;
    const objectedCookies = objectifyCookie(request.headers.cookie);
    try {
      const { wsAuth: JwtWsToken } = objectedCookies;
      const { _id, token } = jwt.verify(JwtWsToken, JWT_SECRET);
      // eslint-disable-next-line no-console
      console.log(`A new client has connected to websocket, userId - ${_id}, token - ${token}`);
      clients.set(_id, ws);
      users.set(
        _id,
        {
          isOnline: {
            online: true,
            time: null,
          },
        },
        {
          isNew: false,
        }
      );
      ws.isAlive = true;
      ws.on('pong', () => {
        // eslint-disable-next-line no-console
        console.log(`UserId - ${_id} has ponged back`);
        const targetClient = clients.get(_id, { destruct: false });
        targetClient.isAlive = true;
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Connection refused');
    }
  });

  const interval = setInterval(() => {
    // eslint-disable-next-line no-console
    console.log(`There are ${clients.size} clients connected`);
    clients.forEach((webSocket, _id) => {
      if (webSocket) {
        const currentSocket = webSocket;
        if (currentSocket.isAlive === false) {
          currentSocket.terminate();
          clients.delete(_id);
          users.set(
            _id,
            {
              isOnline: {
                online: false,
                time: Date.now(),
              },
            },
            {
              isNew: false,
            }
          );
        } else {
          // eslint-disable-next-line no-console
          console.log(`Trying to ping userId - ${_id}`);
          currentSocket.isAlive = false;
          currentSocket.ping();
        }
      }
    });
  }, 10000);

  wsServer.on('close', () => {
    clearInterval(interval);
  });
};

module.exports.webSocketClients = clients;
