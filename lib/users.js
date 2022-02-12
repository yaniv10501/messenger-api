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
    const pendingFriend = pendingFriendRequests[index];
    if (pendingFriend.requestId === friendId) {
      return pendingFriend._id;
    }
    const pendingFriendTry = pendingFriendRequests.find(
      (pendingRequest) => pendingRequest.requestId === friendId
    );
    return pendingFriendTry._id;
  }
  if (listType === 'friendRequests') {
    const { friendRequests } = currentUser;
    const friendRequest = friendRequests[index];
    if (friendRequest.requestId === friendId) {
      return friendRequest._id;
    }
    const friendRequestTry = friendRequests.find((request) => request.requestId === friendId);
    return friendRequestTry._id;
  }
  if (listType === 'moreFriends') {
    const { moreFriends } = currentUser;
    const otherUser = moreFriends[index];
    if (otherUser.otherUserId === friendId) {
      return otherUser._id;
    }
    const otherUserTry = moreFriends.find((request) => request.otherUserId === friendId);
    return otherUserTry._id;
  }
  if (listType === 'friends') {
    const { friends } = currentUser;
    const friend = friends[index];
    if (friend && friend.friendId === friendId) {
      return friend._id;
    }
    const friendTry = friends.find((friendItem) => friendItem.friendId === friendId);
    return friendTry._id;
  }
  if (listType === 'chats') {
    try {
      const { messages } = currentUser;
      const messagesId = chatId || friendId;
      const { _id: mongoChatId, friends } = messages.get(messagesId);
      return {
        friendId: friends[0]._id,
        mongoChatId,
      };
    } catch (error) {
      const { exChatsList } = currentUser;
      const { _id: mongoChatId, friends } = exChatsList.find((chat) => chat.chatId === chatId);
      console.log(friends);
      return {
        friendId: friends[0]._id,
        mongoChatId,
      };
    }
  }
  if (listType === 'messageNotif') {
    const { messages } = currentUser;
    const { friends } = messages.get(friendId);
    return friends[0]._id;
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
      const { friendId, firstName, lastName, gender, birthday, image } = currentFriend;
      friendsList.push({
        _id: friendId,
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
  const { start = 0 } = options || {};
  const { moreFriends } = users.get(_id);
  const moreFriendsList = [];
  for (let i = start; i < start + 20; i += 1) {
    const currentFriend = moreFriends[i];
    if (!currentFriend) i = start + 20;
    if (currentFriend) {
      const { otherUserId, firstName, lastName, gender, birthday, image } = currentFriend;
      moreFriendsList.push({
        _id: otherUserId,
        firstName,
        lastName,
        gender,
        birthday,
        image,
      });
    }
  }
  return moreFriendsList;
};

module.exports.setNewUser = (_id, user) => {
  users.set(_id, user);
  console.log(users);
};

module.exports.setUserNewImage = (_id) => {
  const currentUser = users.get(_id);
  users.set(_id, { ...currentUser, image: 'Uploaded' });
  console.log(users);
};
