const { v4: uuidv4 } = require('uuid');
const User = require('../models/user');
const users = require('../states/users');
const NotFoundError = require('../utils/errors/NotFoundError');

module.exports.setNewUserNotif = (_id, newNotif) => {
  const notifId = uuidv4();
  users.set(
    _id,
    (value) => {
      const { notifications } = value;
      return {
        ...value,
        notifications: [{ _id: notifId, ...newNotif, isSeen: false }, ...notifications],
      };
    },
    { isNew: false }
  );
  User.findOneAndUpdate(
    {
      _id,
    },
    {
      $push: {
        notifications: {
          $each: [
            {
              notifId,
              ...newNotif,
            },
          ],
          $position: 0,
        },
      },
    }
  ).catch((error) => {
    throw error;
  });
};

module.exports.setUserNotifSeen = (_id, notifId) => {
  users.set(
    _id,
    (value) => {
      const { newNotifications } = value.notifications.map((notif) =>
        notif._id === notifId
          ? {
              ...notif,
              isSeen: true,
            }
          : notif
      );
      return {
        ...value,
        notifications: newNotifications,
      };
    },
    { isNew: false }
  );
  User.findOneAndUpdate(
    {
      _id,
    },
    {
      $set: {
        'notifications.$[element].isSeen': true,
      },
    },
    {
      arrayFilters: [{ 'element.notifId': { $eq: notifId } }],
      runValidators: true,
    }
  ).catch((error) => {
    throw error;
  });
};

module.exports.deleteUserNotif = (_id, notifId) => {
  users.set(
    _id,
    (value) => {
      const newNotifications = value.notifications.filter((notif) => notif._id !== notifId);
      return {
        ...value,
        notifications: newNotifications,
      };
    },
    { isNew: false }
  );
  User.findOneAndUpdate(
    {
      _id,
    },
    {
      $pull: {
        notifications: {
          notifId,
        },
      },
    },
    {
      runValidators: true,
    }
  ).catch((error) => {
    throw error;
  });
};

module.exports.getUserNotifications = (_id, start) => {
  if (start > 20) {
    return this.getMoreUserNotifications(_id, start);
  }
  const { notifications } = users.get(_id);
  return notifications;
};

module.exports.getMoreUserNotifications = (_id, start) => {
  User.findOne({ _id })
    .select(['notifications'])
    .orFail(() => {
      throw new NotFoundError('User id not found');
    })
    .then(({ notifications }) => {
      const notifList = [];
      for (let i = start; i < start + 20; i += 1) {
        const currentNotif = notifications[i] || null;
        if (currentNotif) {
          notifList.push(currentNotif);
        } else {
          i = start + 20;
        }
      }
      return notifList;
    })
    .catch((error) => {
      throw error;
    });
};
