const { v4: uuidv4 } = require('uuid');
const users = require('../states/users');
const User = require('../models/user');
const { webSocketClients } = require('../webSockets/webSockets');
const getTime = require('../utils/getTime');
const setItemTime = require('../utils/setItemTime');

/**
 * @function addUserFriendRequest
 * @description Add a new friend request
 * @param {String} _id - User mongo id
 * @param {String} friendId - Friend UUID
 * @param {Number} index - The friend's index in the list
 */

module.exports.addUserFriendRequest = (_id, friendId, index) => {
  const user = users.get(_id);
  const { moreFriends, friendRequests } = user;
  const friendRequest =
    moreFriends[index] || moreFriends.find((friend) => friend.otherUserId === friendId);
  if (friendRequest.otherUserId === friendId) {
    const { otherUserId, firstName, lastName, image, birthday, gender } = friendRequest;
    const { itemTime, itemDay, itemDate, dateNow } = getTime();
    const requestTimeFormat = setItemTime(itemDate, dateNow, itemDay, itemTime);
    const { _id: friendRequestId } = friendRequest;
    moreFriends.splice(index, 1);
    friendRequests.unshift({
      _id: friendRequestId,
      requestId: otherUserId,
      firstName,
      lastName,
      image,
      birthday,
      gender,
      requestTime: requestTimeFormat,
    });
    user.moreFriends = moreFriends;
    user.friendRequests = friendRequests;
    const friendUser = users.get(friendRequestId);
    const { pendingFriendRequests, moreFriends: friendMoreFriends } = friendUser;
    let friendMoreIndex;
    const friendFriendRequest = friendMoreFriends.find((friend, friendIndex) => {
      friendMoreIndex = friendIndex;
      return friend._id === _id;
    });
    friendMoreFriends.splice(friendMoreIndex, 1);
    pendingFriendRequests.unshift({
      _id,
      requestId: friendFriendRequest.otherUserId,
      firstName: friendFriendRequest.firstName,
      lastName: friendFriendRequest.lastName,
      image: friendFriendRequest.image,
      birthday: friendFriendRequest.birthday,
      gender: friendFriendRequest.gender,
      requestTime: requestTimeFormat,
    });
    friendUser.moreFriends = friendMoreFriends;
    friendUser.pendingFriendRequests = pendingFriendRequests;
    const targetClient = webSocketClients.get(friendRequestId);
    console.log(targetClient, friendRequestId);
    if (targetClient) {
      targetClient.send(
        JSON.stringify({
          message: 'Friend request',
          data: {
            _id: friendFriendRequest.otherUserId,
            firstName: friendFriendRequest.firstName,
            lastName: friendFriendRequest.lastName,
            image: friendFriendRequest.image,
            gender: friendFriendRequest.gender,
            requestTime: requestTimeFormat,
          },
        })
      );
    }
    const bulkUpdate = [
      {
        updateOne: {
          filter: { _id },
          update: {
            $push: {
              friendRequests: {
                $each: [
                  {
                    friend: { _id: friendRequestId },
                    requestTime: itemTime,
                    requestDay: itemDay,
                    requestDate: itemDate,
                    dateNow,
                  },
                ],
                $position: 0,
              },
            },
          },
        },
      },
      {
        updateOne: {
          filter: { _id: friendRequestId },
          update: {
            $push: {
              pendingFriendRequests: {
                $each: [
                  {
                    friend: { _id },
                    requestTime: itemTime,
                    requestDay: itemDay,
                    requestDate: itemDate,
                    dateNow,
                  },
                ],
                $position: 0,
              },
            },
          },
          arrayFilter: [{ 'element._id': { $eq: { _id } } }],
        },
      },
    ];
    User.bulkWrite(bulkUpdate)
      .then((result) => console.log(result))
      .catch((error) => {
        throw error;
      });
  }
};

/**
 * @function getUserFriendRequests
 * @description Get friend request list for the user
 * @param {String} _id - User mongo id
 * @param {Object} options - Function options
 * @param {Number} options.start - Start index for the list, Default - 0
 * @returns Friend requests list
 */

module.exports.getUserFriendRequests = (_id, options) => {
  const { start = 0 } = options || {};
  const { friendRequests } = users.get(_id);
  const friendRequestsList = [];
  for (let i = start; i < start + 20; i += 1) {
    const currentRequest = friendRequests[i];
    if (!currentRequest) i = start + 20;
    if (currentRequest) {
      const { requestId, firstName, lastName, image, birthday, gender, requestTime } =
        currentRequest;
      friendRequestsList.push({
        _id: requestId,
        firstName,
        lastName,
        image,
        birthday,
        gender,
        requestTime,
      });
    }
  }
  return friendRequestsList;
};

/**
 * @function getUserPendingFriendRequests
 * @description Get pending friend request list for the user
 * @param {String} _id - User mongo id
 * @param {Object} options - Function options
 * @param {Number} options.start - Start index for the list, Default - 0
 * @returns Pending friend requests list
 */

module.exports.getUserPendingFriendRequests = (_id, options) => {
  const { start = 0 } = options || {};
  const { pendingFriendRequests } = users.get(_id);
  const pendingFriendRequestsList = [];
  for (let i = start; i < start + 20; i += 1) {
    const currentRequest = pendingFriendRequests[i];
    if (!currentRequest) i = start + 20;
    if (currentRequest) {
      const { requestId, firstName, lastName, image, birthday, gender, requestTime } =
        currentRequest;
      pendingFriendRequestsList.push({
        _id: requestId,
        firstName,
        lastName,
        image,
        birthday,
        gender,
        requestTime,
      });
    }
  }
  return pendingFriendRequestsList;
};

/**
 * @function setResponseFriendRequest
 * @description Set response for a friend request
 * @param {String} _id - User mongo id
 * @param {String} otherUserId - Other user UUID
 * @param {Number} index - The friend's index in the list
 */

module.exports.setResponseFriendRequest = (_id, otherUserId, index) => {
  const { pendingFriendRequests, friends, exChatsList } = users.get(_id);
  const currentPendingRequest = pendingFriendRequests[index];
  console.log(currentPendingRequest.requestId, otherUserId);
  if (currentPendingRequest.requestId === otherUserId) {
    const chatId = uuidv4();
    const { _id: friendId, firstName, lastName, birthday, image, gender } = currentPendingRequest;
    const targetClient = webSocketClients.get(friendId);
    console.log(targetClient, friendId);
    if (targetClient) {
      targetClient.send(
        JSON.stringify({
          message: 'Friend accept',
          data: {
            _id: otherUserId,
            firstName,
            lastName,
            image,
            gender,
          },
        })
      );
    }
    pendingFriendRequests.splice(index, 1);
    friends.unshift({
      _id: friendId,
      friendId: otherUserId,
      firstName,
      lastName,
      birthday,
      image,
      gender,
    });
    if (friends.length > 20) {
      friends.splice(20, 1);
    }
    console.log(friends);
    exChatsList.unshift({
      chatId,
      friends: [
        {
          _id: friendId,
          friendId: otherUserId,
          firstName,
          lastName,
          birthday,
          image,
          gender,
        },
      ],
      isGroup: false,
      chatName: `${firstName} ${lastName}`,
      chatImage: image,
      isMute: 0,
    });
    const bulkUpdate = [
      {
        updateOne: {
          filter: { _id },
          update: {
            $addToSet: {
              friends: {
                _id: friendId,
              },
            },
          },
        },
      },
      {
        updateOne: {
          filter: { _id: friendId },
          update: {
            $addToSet: {
              friends: {
                _id,
              },
            },
          },
        },
      },
      {
        updateOne: {
          filter: { _id },
          update: {
            $addToSet: {
              chats: {
                chatId,
                friends: {
                  _id: friendId,
                },
                isGroup: false,
              },
            },
          },
        },
      },
      {
        updateOne: {
          filter: { _id: friendId },
          update: {
            $addToSet: {
              chats: {
                chatId,
                friends: {
                  _id,
                },
                isGroup: false,
              },
            },
          },
        },
      },
      {
        updateOne: {
          filter: { _id },
          update: {
            $pull: {
              pendingFriendRequests: {
                friend: {
                  _id: friendId,
                },
              },
            },
          },
        },
      },
      {
        updateOne: {
          filter: { _id: friendId },
          update: {
            $pull: {
              friendRequests: {
                friend: {
                  _id,
                },
              },
            },
          },
        },
      },
    ];
    User.bulkWrite(bulkUpdate).catch((error) => {
      throw error;
    });
  }
};
