const logger = require('../logger');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  logger.log(err);
  res.status(err.status || 500);
  res.json({ message: err.message || 'An error has occurred on the server' });
};
