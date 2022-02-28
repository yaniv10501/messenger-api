const mongoose = require('mongoose');
const { isEmail } = require('validator');
const { testUrl } = require('../utils/regex');

const notificationsSchema = new mongoose.Schema({
  notifId: {
    type: String,
    required: true,
  },
  notifType: {
    type: String,
    required: true,
  },
  isSeen: {
    type: Boolean,
    default: false,
  },
  otherUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: false,
  },
  /** Id of the notification action (chat, request) */
  actionId: {
    type: String,
    required: false,
  },
  /** Id for the notification utility (message ...) */
  utilId: {
    type: String,
    required: false,
  },
});

const friendRequestSchema = new mongoose.Schema({
  friend: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  requestTime: {
    type: String,
    required: true,
  },
  requestDay: {
    type: String,
    required: true,
  },
  requestDate: {
    type: String,
    required: true,
  },
  dateNow: {
    type: String,
    required: true,
  },
});

const pendingFriendRequestSchema = new mongoose.Schema({
  friend: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  requestTime: {
    type: String,
    required: true,
  },
  requestDay: {
    type: String,
    required: true,
  },
  requestDate: {
    type: String,
    required: true,
  },
  dateNow: {
    type: String,
    required: true,
  },
});

const chatSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true,
  },
  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      default: [],
    },
  ],
  isMute: {
    type: Number,
    default: 0,
  },
  isGroup: {
    type: Boolean,
    required: true,
  },
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: false,
  },
  groupName: {
    type: String,
    required: false,
  },
  groupImage: {
    type: String,
    required: false,
  },
  unreadCount: {
    type: Number,
    default: 0,
  },
  isEmpty: {
    type: Boolean,
    required: false,
  },
});

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    required: true,
  },
  birthday: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator(value) {
        return isEmail(value);
      },
      message: 'Please fill in a valid email',
    },
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  image: {
    type: String,
    default: '',
    validator: {
      validator(value) {
        return testUrl(value);
      },
      message: 'Please fill in a valid URL',
    },
  },
  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      select: false,
      default: [],
    },
  ],
  friendRequests: {
    type: [friendRequestSchema],
    select: false,
  },
  pendingFriendRequests: {
    type: [pendingFriendRequestSchema],
    select: false,
  },
  chats: {
    type: [chatSchema],
    select: false,
  },
  blockedUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      select: false,
      default: [],
    },
  ],
  dontDisturb: [
    {
      type: String,
      default: [],
    },
  ],
  notifications: {
    type: [notificationsSchema],
    select: false,
  },
});

module.exports = mongoose.model('user', userSchema);
