const router = require('express').Router();
const { validateUserSchema, validateLoginSchema } = require('../utils/joi');
const {
  checkUserTaken,
  getUserMe,
  createUser,
  addFriend,
  getChats,
  setUserImage,
  getMoreFriends,
  getUserImage,
  getFriendImage,
  getComposeList,
  setUserTyping,
  setChatMute,
  getFriendList,
  getFriendRequests,
  getPendingFriendRequests,
  acceptFriendRequest,
  getMoreChats,
  initNewGroup,
  getGroupFriendsList,
  setGroupImage,
  getNewChat,
  getMoreGroupFriends,
  setDontDisturbProfile,
  resetChatUnread,
  findOtherUsers,
  getGroupImage,
} = require('../controllers/users');
const { login, logout } = require('../controllers/auth');
const auth = require('../middlewares/auth');
const {
  sendMessage,
  getMessages,
  getMoreMessages,
  leaveChat,
  leaveChats,
} = require('../controllers/messages');
const {
  setNewNotif,
  setNotifSeen,
  deleteNotif,
  getNotifications,
  deleteNotifType,
} = require('../controllers/notifications');

router.post('/api/users/name/check', checkUserTaken);

router.post('/api/signup', validateUserSchema, createUser);

router.post('/api/signin', validateLoginSchema, login);

router.use(auth);

router.get('/api/users/me', getUserMe);

router.get('/api/users/find', findOtherUsers);

router.get('/api/new/:chatId', getNewChat);

router.get('/api/users/me/image', getUserImage);

router.get('/api/image/:friendId', getFriendImage);

router.get('/api/group/image/:groupId', getGroupImage);

router.patch('/api/users/me/image', setUserImage);

router.post('/api/users/me/dontdisturb/profile', setDontDisturbProfile);

router.post('/api/mute/:friendId', setChatMute);

router.get('/api/chats', getChats);

router.get('/api/chats/more', getMoreChats);

router.get('/api/user/friends', getFriendList);

router.get('/api/user/friends/group', getGroupFriendsList);

router.get('/api/friends/compose', getComposeList);

router.get('/api/friends/requests', getFriendRequests);

router.get('/api/friends/pending', getPendingFriendRequests);

router.post('/api/friends/add/:friendId/:index', addFriend);

router.post('/api/friends/response/:requestId', acceptFriendRequest);

router.get('/api/messages/:chatId', getMessages);

router.get('/api/messages/more/:chatId', getMoreMessages);

router.patch('/api/group/image/:chatId', setGroupImage);

router.post('/api/group/new', initNewGroup);

router.get('/api/friends/more/:groupId', getMoreGroupFriends);

router.post('/api/chats/unread/reset/:chatId', resetChatUnread);

router.post('/api/leave/:chatId', leaveChat);

router.post('/api/chats/leave', leaveChats);

router.get('/api/friends/more', getMoreFriends);

router.post('/api/type/:chatId', setUserTyping);

router.post('/api/message/:chatId', sendMessage);

router.get('/api/notifications', getNotifications);

router.post('/api/notifications/new', setNewNotif);

router.post('/api/notifications/seen/:notificationId', setNotifSeen);

router.delete('/api/notifications/delete/:notificationId', deleteNotif);

router.delete('/api/notifications/delete/type/:notificationType', deleteNotifType);

router.post('/api/signout', logout);

module.exports = router;
