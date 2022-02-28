const { setNewUserNotif, setUserNotifSeen, deleteUserNotif } = require('../lib/notifications');
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
    const { notificationId } = req.body;
    setUserNotifSeen(_id, notificationId);
    res.json({ message: 'Notification has been set to seen' });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.deleteNotif = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { notificationId } = req.body;
    deleteUserNotif(_id, notificationId);
    res.json({ message: 'Notification has been deleted' });
  } catch (error) {
    checkErrors(error, next);
  }
};
