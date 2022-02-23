const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Tokens = require('../models/token');
const AuthorizationError = require('../utils/errors/AuthorizationError');
const checkErrors = require('../utils/checkErrors');
const users = require('../states/users');
const { webSocketClients } = require('../webSockets/webSockets');

module.exports.login = (req, res, next) => {
  const { JWT_SECRET = 'Secret-key' } = process.env;
  const { email, password } = req.body;
  User.findOne({ email })
    .orFail(() => {
      throw new AuthorizationError('Incorrect email or password');
    })
    .select('+password')
    .then((user) =>
      bcrypt
        .compare(password, user.password)
        .then(async (matched) => {
          if (!matched) throw new AuthorizationError('Incorrect email or password');
          const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: '10s' });
          const refreshToken = uuidv4();
          const wsToken = uuidv4();
          const jwtWsToken = jwt.sign({ _id: user._id, token: wsToken }, JWT_SECRET, {
            expiresIn: '10s',
          });
          const refreshJwt = jwt.sign({ _id: user._id, token: refreshToken }, JWT_SECRET, {
            expiresIn: '7d',
          });
          await Tokens.create({
            userId: user._id,
            refreshTokens: [
              {
                token: refreshToken,
                expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
              },
            ],
            wsAuthTokens: [
              {
                token: wsToken,
                expires: Date.now() + 1000 * 10,
              },
            ],
          })
            .then(() => {
              res.cookie('authorization', `Bearer ${token}`, {
                maxAge: 1000 * 60 * 60 * 24 * 7,
                httpOnly: false,
                secure: false,
                // domain: 'ymwebapp.com',
              });
              res.cookie('refreshToken', refreshJwt, {
                maxAge: 1000 * 60 * 60 * 24 * 7,
                httpOnly: false,
                secure: false,
                // domain: 'ymwebapp.com',
              });
              res.cookie('wsAuth', jwtWsToken, {
                maxAge: 1000 * 60 * 60 * 24 * 7,
                httpOnly: false,
                secure: false,
                // domain: 'ymwebapp.com',
              });
              return res.json({
                email: user.email,
                name: user.name,
              });
            })
            .catch((error) => {
              if (
                error.name !== 'MongoServerError' ||
                !error.message.includes('userId_1 dup key')
              ) {
                throw error;
              }
              Tokens.findOneAndUpdate(
                { userId: user._id },
                {
                  $addToSet: {
                    refreshTokens: {
                      token: refreshToken,
                      expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
                    },
                    wsAuthTokens: {
                      token: wsToken,
                      expires: Date.now() + 1000 * 10,
                    },
                  },
                }
              )
                .then(async (result) => {
                  await result.refreshTokens.forEach(async (item) => {
                    if (Date.now() >= item.expires) {
                      await Tokens.findOneAndUpdate(
                        { userId: user._id },
                        {
                          $pull: { refreshTokens: { token: item.token } },
                        }
                      );
                    }
                  });
                  res.cookie('authorization', `Bearer ${token}`, {
                    maxAge: 1000 * 10,
                    httpOnly: false,
                    secure: false,
                    // domain: 'ymwebapp.com',
                  });
                  res.cookie('refreshToken', refreshJwt, {
                    maxAge: 1000 * 60 * 60 * 24 * 7,
                    httpOnly: false,
                    secure: false,
                    // domain: 'ymwebapp.com',
                  });
                  res.cookie('wsAuth', jwtWsToken, {
                    maxAge: 1000 * 60 * 60 * 24 * 7,
                    httpOnly: false,
                    secure: false,
                    // domain: 'ymwebapp.com',
                  });
                  return res.json({
                    message: 'Successfully logged in',
                  });
                })
                .catch((err) => {
                  throw err;
                });
            });
        })
        .catch((error) => {
          throw error;
        })
    )
    .catch((error) => checkErrors(error, next));
};

module.exports.logout = (req, res, next) => {
  const { _id } = req.user;
  Tokens.deleteOne({ userId: _id })
    .then(() => {
      const currentUser = users.get(_id, { destruct: false });
      const currentSocket = webSocketClients.get(_id, { destruct: false });
      currentUser.isOnline = false;
      currentSocket.terminate();
      webSocketClients.delete(_id);
      res.cookie('authorization', '', {
        maxAge: 0,
        httpOnly: false,
        secure: false,
        // domain: 'ymwebapp.com',
      });
      res.cookie('refreshToken', '', {
        maxAge: 0,
        httpOnly: false,
        secure: false,
        // domain: 'ymwebapp.com',
      });
      res.cookie('wsAuth', '', {
        maxAge: 0,
        httpOnly: false,
        secure: false,
        // domain: 'ymwebapp.com',
      });
      res.json({ message: 'Successfully logged out' });
    })
    .catch((error) => checkErrors(error, next));
};
