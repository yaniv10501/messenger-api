const { v4: uuidv4 } = require('uuid');
const User = require('./fakeMongo');
const users = require('./fakeUsers');

const setNewUserNotif = (_id, newNotif) => {
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
    (user) => {
      user.notifications.unshift({
        notifId,
        ...newNotif,
        isSeen: false,
      });
      return user;
    }
  );
};

const setUserNotifSeen = (_id, notifId) => {
  users.set(
    _id,
    (value) => {
      const notifications = value.notifications.map((notif) =>
        notif._id === notifId
          ? {
              ...notif,
              isSeen: true,
            }
          : notif
      );
      return {
        ...value,
        notifications,
      };
    },
    { isNew: false }
  );
  User.findOneAndUpdate(
    {
      _id,
    },
    (user) => {
      const notifications = user.notifications.map((notif) =>
        notif.notifId === notifId
          ? {
              ...notif,
              isSeen: true,
            }
          : notif
      );
      return { ...user, notifications };
    }
  );
};

const deleteUserNotif = (_id, notifId) => {
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
    (user) => {
      const newNotifs = user.notifications.filter((notif) => notif.notifId !== notifId);
      return {
        ...user,
        notifications: newNotifs,
      };
    }
  );
};

module.exports = {
  users,
  setNewUserNotif,
  setUserNotifSeen,
  deleteUserNotif,
};
