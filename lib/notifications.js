const users = require('../states/users');

module.exports.setNewUserNotif = (_id, newNotif) => {
  users.set(
    _id,
    (value) => {
      const { notifications } = value;
      return {
        ...value,
        notifications: [newNotif, ...notifications],
      };
    },
    { isNew: false }
  );
};

module.exports.setUserNotifSeen = (_id, notifId) => {
  users.set(
    _id,
    (value) => {
      const { newNotifications } = value.notifications.map((notif) =>
        notif._id === notifId
          ? {
              ...notif,
              seen: true,
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
};
