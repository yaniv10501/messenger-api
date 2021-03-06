const { NEW_MESSAGE } = require('../assets/notificationsTypes');
const {
  setNewUserNotif,
  setUserNotifSeen,
  deleteUserNotif,
  getUserNotifications,
  deleteUserNotifType,
} = require('../lib/notifications');
const users = require('../states/users');
const checkErrors = require('../utils/checkErrors');

module.exports.setNewNotif = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { newNotification } = req.body;
    setNewUserNotif(_id, newNotification);
    res.json({ message: 'New notification has been set' });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.setNotifSeen = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { notificationId } = req.params;
    setUserNotifSeen(_id, notificationId);
    res.json({ message: 'Notification has been set to seen' });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.deleteNotif = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { notificationId } = req.params;
    deleteUserNotif(_id, notificationId);
    res.json({ message: 'Notification has been deleted' });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.deleteNotifType = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { notificationType } = req.params;
    deleteUserNotifType(_id, notificationType)
      .then((notifications) => {
        res.json(notifications);
      })
      .catch((error) => {
        throw error;
      });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.getNotifications = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { start } = req.body;
    const notifList = getUserNotifications(_id, start);
    if (notifList instanceof Promise) {
      getUserNotifications(_id, start).then((userNotifList) => {
        const notifications = userNotifList.map((notif) => {
          const { firstName, lastName, image } = users.get(notif.otherUser);
          if (notif.notifType === NEW_MESSAGE) {
            return {
              _id: notif.notifId,
              type: notif.notifType,
              chatId: notif.actionId,
              user: {
                firstName,
                lastName,
                image,
              },
              message: notif.message,
              isSeen: notif.isSeen,
            };
          }
          return null;
        });
        res.json(notifications);
      });
    } else {
      const notifications = notifList.map((notif) => {
        const { firstName, lastName, image } = users.get(notif.otherUser);
        if (notif.notifType === NEW_MESSAGE) {
          return {
            _id: notif.notifId,
            type: notif.notifType,
            chatId: notif.actionId,
            user: {
              firstName,
              lastName,
              image,
            },
            message: notif.message,
            isSeen: notif.isSeen,
          };
        }
        return null;
      });
      res.json(notifications);
    }
  } catch (error) {
    checkErrors(error, next);
  }
};
