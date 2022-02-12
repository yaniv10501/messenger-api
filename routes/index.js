const router = require('express').Router();
const { validateUserSchema, validateLoginSchema } = require('../utils/joi');
const {
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
} = require('../controllers/users');
const { login, logout } = require('../controllers/auth');
const auth = require('../middlewares/auth');
const { sendMessage, getMessages, getMoreMessages, leaveChat } = require('../controllers/messages');

router.post('/api/signup', validateUserSchema, createUser);

router.post('/api/signin', validateLoginSchema, login);

router.use(auth);

router.get('/api/users/me', getUserMe);

router.get('/api/new/:chatId', getNewChat);

router.get('/api/users/me/image', getUserImage);

router.get('/api/:friendId/image', getFriendImage);

router.patch('/api/users/me/image', setUserImage);

router.post('/api/:friendId/mute', setChatMute);

router.get('/api/chats', getChats);

router.get('/api/chats/more', getMoreChats);

router.get('/api/user/friends', getFriendList);

router.get('/api/user/friends/group', getGroupFriendsList);

router.get('/api/friends/compose', getComposeList);

router.get('/api/friends/requests', getFriendRequests);

router.get('/api/friends/pending', getPendingFriendRequests);

router.post('/api/friends/:friendId/:index', addFriend);

router.post('/api/:requestId/accept', acceptFriendRequest);

router.get('/api/:chatId/messages', getMessages);

router.get('/api/:chatId/messages/more', getMoreMessages);

router.patch('/api/:chatId/image', setGroupImage);

router.post('/api/group/new', initNewGroup);

router.post('/api/:chatId/leave', leaveChat);

router.get('/api/friends/more', getMoreFriends);

router.post('/api/:chatId/type', setUserTyping);

router.post('/api/:chatId/message', sendMessage);

router.post('/api/signout', logout);

module.exports = router;
