const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const users = require('../states/users');
const { objectifyCookie } = require('../utils/cookie');
const AvlTree = require('../utils/AvlTree');
const { NEW_MESSAGE } = require('../assets/notificationsTypes');
const { deleteUserNotif } = require('../lib/notifications');

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
      const socketId = uuidv4();
      console.log(
        `A new client has connected to websocket, userId - ${_id}, socket - ${socketId} token - ${token}`
      );
      if (clients.get(_id)) {
        clients.set(
          _id,
          (value) => [
            ...value,
            {
              _id: socketId,
              socket: ws,
            },
          ],
          {
            isNew: false,
          }
        );
      } else {
        clients.set(_id, [
          {
            _id: socketId,
            socket: ws,
          },
        ]);
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
      }
      ws.isAlive = true;
      ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);
        const { message: type } = parsedMessage;
        if (type === NEW_MESSAGE) {
          const { chats, notifId } = parsedMessage;
          if (chats) {
            deleteUserNotif(_id, notifId);
          }
        }
        console.log(parsedMessage);
      });
      ws.on('pong', () => {
        // eslint-disable-next-line no-console
        console.log(`UserId - ${_id} at socket - ${socketId} has ponged back`);
        const targetClient = clients.get(_id, { destruct: false });
        const currentClient = targetClient.find((client) => client._id === socketId);
        if (currentClient) {
          currentClient.socket.isAlive = true;
        }
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
        webSocket.forEach(({ _id: socketId, socket }) => {
          const currentSocket = socket;
          if (currentSocket.isAlive === false) {
            currentSocket.terminate();
            if (webSocket.length < 2) {
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
              clients.set(
                _id,
                (value) => {
                  const newValue = value.filter((item) => item._id !== socketId);
                  return newValue;
                },
                {
                  isNew: false,
                }
              );
            }
          } else {
            // eslint-disable-next-line no-console
            console.log(`Trying to ping userId - ${_id} at socket - ${socketId}`);
            currentSocket.isAlive = false;
            currentSocket.ping();
          }
        });
      }
    });
  }, 5000);

  wsServer.on('close', () => {
    clearInterval(interval);
  });
};

module.exports.webSocketClients = clients;
