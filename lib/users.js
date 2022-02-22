const { v4: uuidv4 } = require('uuid');
const User = require('../models/user');
const users = require('../states/users');

module.exports.getUser = (_id) => {
  const currentUser = users.get(_id);
  return currentUser;
};

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
    try {
      const { messages } = currentUser;
      const messagesId = chatId || friendId;
      const { _id: mongoChatId, friends } = messages.get(messagesId);
      const friendIndex = Number(index) || 0;
      return {
        friendId: friends[friendIndex]._id,
        mongoChatId,
      };
    } catch (error) {
      const { exChatsList } = currentUser;
      const { _id: mongoChatId, friends } = exChatsList.find((chat) => chat.chatId === chatId);
      const friendIndex = Number(index) || 0;
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
      const { exChatsList } = currentUser;
      const { friends } = exChatsList.find((chat) => chat.chatId === friendId);
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
      const { exChatsList } = currentUser;
      const { _id: mongoChatId, friends } = exChatsList.find((chat) => chat.chatId === chatId);
      const friendIndex = index instanceof Number ? index : 0;
      return {
        friendId: friends[friendIndex]._id,
        mongoChatId,
      };
    }
  }
  return null;
};

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

module.exports.getUserGroupFriendsList = (_id, options) => {
  const { start = 0 } = options || {};
  const friendsList = this.getUserFriendsList(_id, { start });
  const { emptyGroup } = users.get(_id);
  const { chatId: groupId } = emptyGroup;
  return { friendsList, groupId };
};

module.exports.getUserMoreFriendsList = (_id, options) => {
  let loadedAll = false;
  const { start = 0 } = options || {};
  const moreFriendsList = [];
  const moreFriendsState = [];
  const startIndex = Number(start);
  const currentUser = users.get(_id);
  const {
    moreFriends: currentMoreList = [],
    friends,
    friendRequests,
    pendingFriendRequests,
  } = currentUser;
  const moreFriends = users.getList(startIndex, [
    ...friends,
    ...friendRequests,
    ...pendingFriendRequests,
  ]);
  for (let i = 0; i < 20; i += 1) {
    const currentOtherUser = moreFriends[i];
    if (!currentOtherUser) {
      i = startIndex + 20;
      loadedAll = true;
    }
    if (currentOtherUser) {
      const { firstName, lastName, gender, birthday, image } = currentOtherUser;
      const newOtherUserId = uuidv4();
      moreFriendsList.push({
        _id: newOtherUserId,
        firstName,
        lastName,
        gender,
        birthday,
        image,
      });
      moreFriendsState.push({
        _id: currentOtherUser._id,
        otherUserId: newOtherUserId,
        firstName,
        lastName,
        gender,
        birthday,
        image,
      });
    }
    currentUser.moreFriends = [...currentMoreList, ...moreFriendsState];
  }
  if (loadedAll) {
    return {
      loadedAll,
      moreFriendsList,
    };
  }
  return moreFriendsList;
};

module.exports.setNewUser = (_id, user) => {
  users.set(_id, user);
};

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
          tasks: ['chats', 'exChats', 'messages', 'friends'],
        });
      });
    });
};

module.exports.setUserDontDisturbProfile = (_id) => {
  users.set(
    _id,
    {
      dontDisturb: (list) => {
        list.push('profile');
        return list;
      },
    },
    {
      isNew: false,
    }
  );
};
