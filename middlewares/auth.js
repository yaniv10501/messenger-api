const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Tokens = require('../models/token');
const checkErrors = require('../utils/checkErrors');
const AuthorizationError = require('../utils/errors/AuthorizationError');

module.exports = async (req, res, next) => {
  let currentRefreshToken;
  // Trying to authorize a user
  try {
    const { authorization, refreshToken: refreshJwt, wsAuth: wsJwt } = req.cookies;

    // If no token and no refreshToken throw an error
    if ((!authorization || !authorization.startsWith('Bearer ')) && !refreshJwt) {
      throw new AuthorizationError('Authorization is required');
    }

    const token = authorization?.replace('Bearer ', '');
    const { JWT_SECRET = 'Secret-key' } = process.env;

    const checkToken = async (userId, refreshToken, refreshTokens, usedTokens, wsAuthTokens) => {
      const isUsed = usedTokens.some((usedToken) => usedToken === refreshToken);
      if (isUsed) {
        await Tokens.findOneAndUpdate(
          { userId },
          {
            $pullAll: { refreshTokens, usedTokens, wsAuthTokens },
          }
        );
        throw new AuthorizationError('Authorization is required');
      }
      const isValid = refreshTokens.some(({ token: validToken }) => validToken === refreshToken);
      if (!isValid) {
        await Tokens.findOneAndUpdate(
          { userId },
          {
            $pullAll: { refreshTokens, usedTokens, wsAuthTokens },
          }
        );
        throw new AuthorizationError('Authorization is required');
      }
    };

    // Checking the websocket token

    try {
      jwt.verify(wsJwt, JWT_SECRET);
      currentRefreshToken = refreshJwt;
    } catch (err) {
      // If the token is not verified try to use the refreshToken
      const { _id: userId, token: refreshToken } = jwt.verify(refreshJwt, JWT_SECRET);
      await Tokens.findOne({ userId })
        .orFail(() => {
          throw new AuthorizationError('Authorization is required');
        })
        .then(async ({ refreshTokens, usedTokens, wsAuthTokens }) => {
          await checkToken(userId, refreshToken, refreshTokens, usedTokens, wsAuthTokens)
            .then(async () => {
              const { token: oldWsToken } = jwt.decode(wsJwt, JWT_SECRET);
              const newWsToken = uuidv4();
              const newWsJwt = jwt.sign({ _id: userId, token: newWsToken }, JWT_SECRET, {
                expiresIn: '10m',
              });
              const newRefreshToken = uuidv4();
              const newRefreshJwt = jwt.sign(
                {
                  _id: userId,
                  token: newRefreshToken,
                },
                JWT_SECRET,
                {
                  expiresIn: '7d',
                }
              );
              const bulkUpdate = [
                {
                  updateOne: {
                    filter: {
                      userId,
                    },
                    update: {
                      $pull: {
                        wsAuthTokens: {
                          token: oldWsToken,
                        },
                      },
                    },
                  },
                },
                {
                  updateOne: {
                    filter: { userId },
                    update: {
                      $pull: {
                        refreshTokens: {
                          token: refreshToken,
                        },
                      },
                    },
                  },
                },
                {
                  updateOne: {
                    filter: {
                      userId,
                    },
                    update: {
                      $addToSet: {
                        wsAuthTokens: {
                          token: newWsToken,
                          expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
                        },
                        usedWsTokens: oldWsToken,
                        refreshTokens: {
                          token: newRefreshToken,
                          expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
                        },
                        usedTokens: refreshToken,
                      },
                    },
                  },
                },
                {
                  updateOne: {
                    filter: {
                      userId,
                    },
                    update: {
                      $push: {
                        usedTokens: {
                          $each: [],
                          $slice: -5,
                        },
                        usedWsTokens: {
                          $each: [],
                          $slice: -5,
                        },
                      },
                    },
                  },
                },
              ];
              await Tokens.bulkWrite(bulkUpdate);
              currentRefreshToken = newRefreshJwt;
              res.cookie('wsAuth', `${newWsJwt}`, {
                maxAge: 1000 * 60 * 60 * 24 * 7,
                httpOnly: false,
                secure: false,
                // domain: 'ymwebapp.com',
              });
              res.cookie('refreshToken', newRefreshJwt, {
                maxAge: 1000 * 60 * 60 * 24 * 7,
                httpOnly: false,
                secure: false,
                // domain: 'ymwebapp.com',
              });
            })
            .catch((error) => {
              throw error;
            });
        })
        .catch((error) => {
          throw error;
        });
    }

    let payload;

    // Try to verify the token
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // If the token is not verified try to use the refreshToken
      const { _id: userId, token: refreshToken } = jwt.verify(currentRefreshToken, JWT_SECRET);
      await Tokens.findOne({ userId })
        .orFail(() => {
          throw new AuthorizationError('Authorization is required');
        })
        .then(async ({ refreshTokens, usedTokens, wsAuthTokens }) => {
          await checkToken(userId, refreshToken, refreshTokens, usedTokens, wsAuthTokens)
            .then(async () => {
              const newToken = jwt.sign({ _id: userId }, JWT_SECRET, { expiresIn: '10m' });
              const newRefreshToken = uuidv4();
              const newRefreshJwt = jwt.sign(
                {
                  _id: userId,
                  token: newRefreshToken,
                },
                JWT_SECRET,
                {
                  expiresIn: '7d',
                }
              );
              const bulkUpdate = [
                {
                  updateOne: {
                    filter: { userId },
                    update: {
                      $pull: { refreshTokens: { token: refreshToken } },
                    },
                  },
                },
                {
                  updateOne: {
                    filter: { userId },
                    update: {
                      $addToSet: {
                        refreshTokens: {
                          token: newRefreshToken,
                          expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
                        },
                        usedTokens: refreshToken,
                      },
                    },
                  },
                },
                {
                  updateOne: {
                    filter: { userId },
                    update: {
                      $push: {
                        usedTokens: {
                          $each: [],
                          $slice: -5,
                        },
                      },
                    },
                  },
                },
              ];
              await Tokens.bulkWrite(bulkUpdate);
              res.cookie('authorization', `Bearer ${newToken}`, {
                maxAge: 1000 * 60 * 15,
                httpOnly: false,
                secure: false,
                // domain: 'ymwebapp.com',
              });
              res.cookie('refreshToken', newRefreshJwt, {
                maxAge: 1000 * 60 * 60 * 24 * 7,
                httpOnly: false,
                secure: false,
                // domain: 'ymwebapp.com',
              });
              payload = { _id: userId };
            })
            .catch((error) => {
              throw error;
            });
        })
        .catch((error) => {
          throw error;
        });
    }

    req.user = payload;

    next();
  } catch (error) {
    checkErrors(error, next);
  }
};
