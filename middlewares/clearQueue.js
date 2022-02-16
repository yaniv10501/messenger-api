const users = require('../states/users');
const checkErrors = require('../utils/checkErrors');

const clearQueue = (req, res, next) => {
  try {
    const { _id } = req.user;
    const currentUser = users.get(_id);
    if (!Array.isArray(currentUser.queue)) {
      currentUser.queue = [];
    }
    if (currentUser.queue.length > 0) {
      currentUser.queue.forEach((action) => {
        action();
      });
      currentUser.queue = [];
    }
    next();
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports = clearQueue;
