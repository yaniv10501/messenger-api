const { v4: uuidv4 } = require('uuid');
const User = require('../models/user');
const users = require('../states/users');
const NotFoundError = require('../utils/errors/NotFoundError');

/**
 * @function getUser
 * @param {String} _id - User id
 * @returns User state
 */

module.exports.getUser = (_id) => {
  const currentUser = users.get(_id);
  return currentUser;
};

/**
 * @function getFriendId
 * @description Get friend id from a list in user state
 * @param {String} _id - User id
 * @param {String} friendId - Friend id
 * @param {String} options.listType - The list type to search in the user state -
 * pendingRequests, friendRequests, moreFriends, friends, chats, messageNotif, group
 * @param {Number} options.index - Index of the friend item in the list (not required)
 * @param {String} options.chatId - Chat id for the list (not required)
 * @returns Friend id
 */

module.exports.getFriendId = (_id, friendId, options) => {
  const { listType = null, index = null, chatId = null } = options || {};
  const currentUser = users.get(_id);
  if (listType === 'pendingRequests') {
    const { pendingFriendRequests } = currentUser;
    try {
      const pendingFriend = pendingFriendRequests[index];
      if (pendingFriend.requestId === friendId) {
        return pendingFriend._id;
      }
    } catch (error) {
      const pendingFriendTry = pendingFriendRequests.find(
        (pendingRequest) => pendingRequest.requestId === friendId
      );
      return pendingFriendTry._id;
    }
  }
  if (listType === 'friendRequests') {
    const { friendRequests } = currentUser;
    try {
      const friendRequest = friendRequests[index];
      if (friendRequest.requestId === friendId) {
        return friendRequest._id;
      }
    } catch {
      const friendRequestTry = friendRequests.find((request) => request.requestId === friendId);
      return friendRequestTry._id;
    }
  }
  if (listType === 'moreFriends') {
    const { moreFriends } = currentUser;
    try {
      const otherUser = moreFriends[index];
      if (otherUser.otherUserId === friendId) {
        return otherUser._id;
      }
    } catch (error) {
      const otherUserTry = moreFriends.find((request) => request.otherUserId === friendId);
      return otherUserTry._id;
    }
  }
  if (listType === 'friends') {
    const { friends } = currentUser;
    try {
      if (!index) {
        throw new Error();
      }
      const friend = friends[index];
      if (friend && friend.friendId === friendId) {
        return friend._id;
      }
    } catch (error) {
      const friendTry = friends.find((friendItem) => friendItem.friendId === friendId);
      return friendTry._id;
    }
  }
  if (listType === 'chats') {
    const friendIndex = index && index !== 'null' ? Number(index) : 0;
    try {
      const { messages } = currentUser;
      const messagesId = chatId || friendId;
      const { _id: mongoChatId, friends } = messages.get(messagesId);
      return {
        friendId: friends[friendIndex]._id,
        mongoChatId,
      };
    } catch (error) {
      const { chats, composeList } = currentUser;
      console.log(chats, chatId);
      const { _id: mongoChatId, friends } =
        chats.find((chat) => chat.chatId === chatId) ||
        composeList.find((chat) => chat.chatId === chatId);
      console.log(index);
      return {
        friendId: friends[friendIndex]._id,
        mongoChatId,
      };
    }
  }
  if (listType === 'messageNotif') {
    try {
      const { messages } = currentUser;
      const { friends } = messages.get(friendId);
      return friends[0]._id;
    } catch (error) {
      const { chats } = currentUser;
      const { friends } = chats.find((chat) => chat.chatId === friendId);
      return friends[0]._id;
    }
  }
  if (listType === 'group') {
    try {
      const { messages } = currentUser;
      const { friends } = messages.get(chatId);
      const currentFriend = friends.find((friend) => friend.friendId === friendId);
      return currentFriend._id;
    } catch (error) {
      const { chats } = currentUser;
      const { _id: mongoChatId, friends } = chats.find((chat) => chat.chatId === chatId);
      const friendIndex = index instanceof Number ? index : 0;
      return {
        friendId: friends[friendIndex]._id,
        mongoChatId,
      };
    }
  }
  return null;
};

/**
 * @function getUserFriendsList
 * @param {String} _id - User id
 * @param {Number} options.start - Start index for friends list
 * @returns User friends list
 */

module.exports.getUserFriendsList = (_id, options) => {
  const { start = 0 } = options || {};
  const { friends } = users.get(_id);
  const friendsList = [];
  for (let i = start; i < start + 20; i += 1) {
    const currentFriend = friends[i];
    if (!currentFriend) i = start + 20;
    if (currentFriend) {
      const { firstName, lastName, gender, birthday, image } = users.get(currentFriend._id);
      friendsList.push({
        _id: currentFriend.friendId,
        firstName,
        lastName,
        gender,
        birthday,
        image,
      });
    }
  }
  return friendsList;
};

/**
 * @function getUserGroupFriendsList
 * @param {String} _id - User id
 * @param {Number} options.start - Start index for friends list
 * @returns Friends list and empty group id
 */

module.exports.getUserGroupFriendsList = (_id, options) => {
  const { start = 0 } = options || {};
  const friendsList = this.getUserFriendsList(_id, { start });
  const { emptyGroup } = users.get(_id);
  const { chatId: groupId } = emptyGroup;
  return { friendsList, groupId };
};

/**
 * @function getUserMoreFriendsList
 * @param {*} _id - User id
 * @param {*} options.start - Start index for friends list
 * @returns More friends list
 */

module.exports.getUserMoreFriendsList = (_id, options) => {
  let loadedAll = false;
  const { start = 0 } = options || {};
  const moreFriendsList = [];
  const moreFriendsState = [];
  const startIndex = Number(start);
  const currentUser = users.get(_id);
  const {
    moreFriends: currentMoreList = [],
    friends = [],
    friendRequests = [],
    pendingFriendRequests = [],
    blockedUsers = [],
  } = currentUser;
  const moreFriends = users.getList(startIndex, [
    { _id },
    ...friends,
    ...friendRequests,
    ...pendingFriendRequests,
  ]);
  let listLimit = 20;
  for (let i = 0; i < listLimit; i += 1) {
    const currentOtherUser = moreFriends[i];
    if (!currentOtherUser) {
      i = startIndex + 20;
      loadedAll = true;
    }
    if (currentOtherUser) {
      const isBlocked = blockedUsers.some(
        (blockedUser) => blockedUser._id.toString() === currentOtherUser._id
      );
      if (!isBlocked || moreFriends.length <= listLimit) {
        const {
          firstName,
          lastName,
          gender,
          birthday,
          image,
          blockedUsers: otherBlockedUsers,
        } = currentOtherUser;
        const isBlockedByOther = otherBlockedUsers.some(
          (blockedUser) => blockedUser._id.toString() === _id
        );
        if (!isBlockedByOther) {
          const newOtherUserId = uuidv4();
          moreFriendsList.push({
            _id: newOtherUserId,
            firstName,
            lastName,
            gender,
            birthday,
            image,
            isBlocked,
          });
          moreFriendsState.push({
            _id: currentOtherUser._id,
            otherUserId: newOtherUserId,
            firstName,
            lastName,
            gender,
            birthday,
            image,
            isBlocked,
          });
        } else {
          listLimit += 1;
        }
      }
    }
  }
  users.set(
    _id,
    {
      moreFriends:
        startIndex === 0 ? [...moreFriendsState] : [...currentMoreList, ...moreFriendsState],
    },
    { isNew: false }
  );
  console.log(currentUser);
  if (loadedAll) {
    return {
      loadedAll,
      moreFriendsList,
    };
  }
  return moreFriendsList;
};

/**
 * @function setNewUser
 * @param {String} _id - User id
 * @param {Object} user - New user object
 */

module.exports.setNewUser = (_id, user) => {
  users.set(_id, user);
};

/**
 * @function setUserNewImage
 * @param {String} _id - User id
 */

module.exports.setUserNewImage = (_id) => {
  users.set(_id, { image: 'Uploaded' }, { isNew: false });
  User.findOne({ _id })
    .select(['friends'])
    .populate(['friends'])
    .then(({ friends }) => {
      friends.forEach((friend) => {
        const friendId = friend._id.toString();
        const { queue } = users.get(friendId);
        queue.push({
          _id,
          tasks: ['chats', 'messages', 'friends'],
        });
      });
    });
};

/**
 * @function setUserDontDisturbProfile
 * @param {String} _id - User id
 */

module.exports.setUserDontDisturbProfile = (_id) => {
  users.set(
    _id,
    (user) => {
      user.dontDisturb.push('profile');
      return user;
    },
    {
      isNew: false,
    }
  );
  User.findOneAndUpdate(
    {
      _id,
    },
    {
      $addToSet: {
        dontDisturb: 'profile',
      },
    }
  )
    .orFail(() => {
      throw new NotFoundError('User ID not found');
    })
    .catch((error) => {
      throw error;
    });
};
