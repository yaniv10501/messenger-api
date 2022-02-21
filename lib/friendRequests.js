const { v4: uuidv4 } = require('uuid');
const users = require('../states/users');
const User = require('../models/user');
const { webSocketClients } = require('../webSockets/webSockets');
const getTime = require('../utils/getTime');
const setItemTime = require('../utils/setItemTime');
const UnknownError = require('../utils/errors/UnknownError');

/**
 * @function addUserFriendRequest
 * @description Add a new friend request
 * @param {String} _id - User mongo id
 * @param {String} friendId - Friend UUID
 * @param {Number} index - The friend's index in the list
 */

module.exports.addUserFriendRequest = async (_id, friendId, index) => {
  try {
    const user = users.get(_id);
    const { moreFriends, friendRequests } = user;
    console.log(moreFriends);
    const friendRequest =
      moreFriends[index] || moreFriends.find((friend) => friend.otherUserId === friendId);
    if (friendRequest.otherUserId === friendId) {
      const { _id: friendRequestId, otherUserId } = friendRequest;
      const friendUser = users.get(friendRequestId);
      const {
        firstName,
        lastName,
        image,
        birthday,
        gender,
        pendingFriendRequests,
        moreFriends: friendMoreFriends = [],
      } = friendUser;
      const { itemTime, itemDay, itemDate, dateNow } = getTime();
      const requestTimeFormat = setItemTime(itemDate, dateNow, itemDay, itemTime);
      moreFriends.splice(index, 1);
      friendRequests.unshift({
        _id: friendRequestId,
        requestId: otherUserId,
        requestTime: requestTimeFormat,
      });
      user.moreFriends = moreFriends;
      user.friendRequests = friendRequests;
      let friendMoreIndex;
      const friendFriendRequest =
        friendMoreFriends.length > 0
          ? friendMoreFriends.find((friend, friendIndex) => {
              if (friendIndex + 1 === friendMoreFriends.length && friend._id !== _id) {
                return {
                  _id,
                  otherUserId: uuidv4(),
                  firstName,
                  lastName,
                  gender,
                  birthday,
                  image,
                };
              }
              friendMoreIndex = friendIndex;
              return friend._id === _id;
            })
          : {
              _id,
              otherUserId: uuidv4(),
              firstName,
              lastName,
              gender,
              birthday,
              image,
            };
      friendMoreFriends.splice(friendMoreIndex, 1);
      pendingFriendRequests.unshift({
        _id,
        requestId: friendFriendRequest.otherUserId,
        requestTime: requestTimeFormat,
      });
      friendUser.moreFriends = friendMoreFriends;
      friendUser.pendingFriendRequests = pendingFriendRequests;
      const targetClient = webSocketClients.get(friendRequestId);
      if (targetClient) {
        targetClient.send(
          JSON.stringify({
            message: 'Friend request',
            data: {
              _id: friendFriendRequest.otherUserId,
              firstName: user.firstName,
              lastName: user.lastName,
              image: user.image,
              gender: user.gender,
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
      return User.bulkWrite(bulkUpdate)
        .then(() => ({
          _id: otherUserId,
          firstName,
          lastName,
          image,
          birthday,
          gender,
          requestTime: requestTimeFormat,
        }))
        .catch((error) => {
          throw error;
        });
    }
    return null;
  } catch (error) {
    throw new UnknownError(`An error has occurred - ${error}`);
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
  let loadedAll = false;
  const { start = 0 } = options || {};
  const { friendRequests } = users.get(_id);
  const friendRequestsList = [];
  const startIndex = Number(start);
  for (let i = startIndex; i < startIndex + 20; i += 1) {
    const currentRequest = friendRequests[i];
    if (!currentRequest) {
      i = startIndex + 20;
      loadedAll = true;
    }
    if (currentRequest) {
      const { firstName, lastName, gender, birthday, image } = users.get(currentRequest._id);
      const { requestId, requestTime } = currentRequest;
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
  if (loadedAll) {
    return {
      loadedAll,
      friendRequestsList,
    };
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
  let loadedAll = false;
  const { start = 0 } = options || {};
  const { pendingFriendRequests } = users.get(_id);
  const pendingFriendRequestsList = [];
  const startIndex = Number(start);
  for (let i = startIndex; i < startIndex + 20; i += 1) {
    const currentRequest = pendingFriendRequests[i];
    if (!currentRequest) {
      i = startIndex + 20;
      loadedAll = true;
    }
    if (currentRequest) {
      const { firstName, lastName, gender, birthday, image } = users.get(currentRequest._id);
      const { requestId, requestTime } = currentRequest;
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
  if (loadedAll) {
    return {
      loadedAll,
      pendingFriendRequestsList,
    };
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
  const currentUser = users.get(_id);
  const {
    firstName: userFirstName,
    lastName: userLastName,
    image: userImage,
    pendingFriendRequests,
    friends,
    exChatsList,
  } = currentUser;
  const currentPendingRequest = pendingFriendRequests[index];
  if (currentPendingRequest.requestId === otherUserId) {
    const chatId = uuidv4();
    const { _id: friendId } = currentPendingRequest;
    const currentFriend = users.get(friendId);
    const {
      firstName,
      lastName,
      image,
      friendRequests,
      friends: friendFriends,
      exChatsList: friendExChatsList,
    } = currentFriend;
    currentFriend.chatsCount += 1;
    const userAtFriend = friendRequests.find((request) => request._id === _id);
    const userIndexAtFriend = friendRequests.findIndex((request) => request._id === _id);
    const { requestId: userIdAtFriend } = userAtFriend;
    const targetClient = webSocketClients.get(friendId);
    if (targetClient) {
      targetClient.send(
        JSON.stringify({
          message: 'Friend accept',
          data: {
            _id: userIdAtFriend,
            firstName: userFirstName,
            lastName: userLastName,
            image: userImage,
          },
        })
      );
    }
    currentUser.chatsCount += 1;
    pendingFriendRequests.splice(index, 1);
    friends.unshift({
      _id: friendId,
      friendId: otherUserId,
    });
    if (friends.length > 20) {
      friends.splice(20, 1);
    }
    exChatsList.unshift({
      chatId,
      friends: [
        {
          _id: friendId,
          friendId: otherUserId,
        },
      ],
      isGroup: false,
      chatName: `${firstName} ${lastName}`,
      chatImage: image,
      isMute: 0,
    });
    friendRequests.splice(userIndexAtFriend, 1);
    friendFriends.unshift({
      _id,
      friendId: userIdAtFriend,
    });
    if (friends.length > 20) {
      friends.splice(20, 1);
    }
    friendExChatsList.unshift({
      chatId,
      friends: [
        {
          _id,
          friendId: userIdAtFriend,
        },
      ],
      isGroup: false,
      chatName: `${userFirstName} ${userLastName}`,
      chatImage: userImage,
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
