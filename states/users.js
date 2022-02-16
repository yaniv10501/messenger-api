const { v4: uuidv4 } = require('uuid');
const User = require('../models/user');
const { getMessagesStream, checkFilePathExists } = require('../utils/fs');
const setItemTime = require('../utils/setItemTime');
const sortUsersArray = require('../utils/sortUsersArray');

const users = new Map();

User.find()
  .populate([
    'friends',
    'chats',
    'chats.friends',
    'friendRequests',
    'friendRequests.friend',
    'pendingFriendRequests',
    'pendingFriendRequests.friend',
    'blockedUsers',
  ])
  .then(async (currentRegisteredUsers) => {
    console.log('All users found!');
    const usersPromises = [];
    const moreListPromises = [];
    currentRegisteredUsers.forEach((registerdUser, index) => {
      console.log(`Getting user info user - ${index}`);
      const {
        _id: mongoUserId,
        firstName,
        lastName,
        email,
        gender,
        birthday,
        image,
        friends,
        chats,
        friendRequests,
        pendingFriendRequests,
        blockedUsers,
      } = registerdUser;
      const userId = mongoUserId.toString();
      const user = {
        firstName,
        lastName,
        email,
        gender,
        birthday,
        image,
        chats,
        friendRequests,
        pendingFriendRequests,
        blockedUsers,
        chatsCount: chats.length,
      };
      console.log(`Got user info user - ${index}`);
      const friendList = [];
      for (let i = 0; i < 20; i += 1) {
        const friend = friends[i];
        if (friend) {
          const friendId = uuidv4();
          friendList.push({
            _id: friends[i]._id.toString(),
            friendId,
            firstName: friends[i].firstName,
            lastName: friends[i].lastName,
            gender: friends[i].gender,
            birthday: friends[i].birthday,
            image: friends[i].image,
          });
        }
      }
      user.queue = [];
      user.friends = friendList;
      const userMessages = new Map();
      const exChatsList = [];
      let chatLimit = 20;
      const chatPromises = [];
      for (let i = 0; i < chatLimit; i += 1) {
        const chatFriendsExList = [];
        const chat = chats[i];
        if (chat) {
          const _id = chat._id.toString();
          const {
            chatId,
            isGroup,
            friends: chatFriends,
            isMute,
            groupAdmin,
            groupName,
            groupImage,
            unreadCount,
            isEmpty,
          } = chat;
          if (isEmpty) {
            user.emptyGroup = chat;
          }
          if (!isEmpty) {
            const chatFriendslist = chatFriends.map((chatFriend) => {
              const {
                _id: mongoFriendId,
                firstName: friendFirstName,
                lastName: friendLastName,
                birthday: friendBirthday,
                gender: friendGender,
                image: friendImage,
              } = chatFriend;
              const friendId = uuidv4();
              chatFriendsExList.push({
                _id: mongoFriendId.toString(),
                friendId,
                firstName: friendFirstName,
                lastName: friendLastName,
                birthday: friendBirthday,
                gender: friendGender,
                image: friendImage,
              });
              return {
                _id: friendId,
                firstName: friendFirstName,
                lastName: friendLastName,
                birthday: friendBirthday,
                gender: friendGender,
                image: friendImage,
              };
            });
            const filePathExists = checkFilePathExists(`../messages/${userId}/${_id}.json`);
            if (filePathExists) {
              chatPromises.push(
                getMessagesStream(`../messages/${userId}/${_id}.json`).then((messages) => {
                  console.log(`Got messages for user - ${userId}, chat - ${_id}`);
                  if (messages.length <= 49) {
                    userMessages.set(chatId, {
                      _id,
                      friends: chatFriendsExList,
                      messages,
                      loadedCount: 49,
                      loadedAll: true,
                    });
                  }
                  if (messages.length > 49) {
                    userMessages.set(chatId, {
                      _id,
                      friends: chatFriendsExList,
                      messages,
                      loadedCount: 49,
                    });
                  }
                  const lastChatMessage = messages[0];
                  const { messageTime, messageDay, messageDate, dateNow } = lastChatMessage;
                  const lastMessageTime = setItemTime(
                    messageDate,
                    dateNow,
                    messageDay,
                    messageTime
                  );
                  if (isGroup) {
                    exChatsList.push({
                      _id,
                      chatId,
                      isGroup,
                      groupAdmin,
                      friends: chatFriendsExList,
                      chatName: groupName,
                      chatImage: groupImage,
                      isMute,
                      lastMessage: lastChatMessage.messageContent,
                      lastMessageTime,
                      unreadCount,
                    });
                    return {
                      _id,
                      chatId,
                      isGroup,
                      groupAdmin,
                      friends: chatFriendslist,
                      chatName: groupName,
                      chatImage: groupImage,
                      isMute,
                      lastMessage: lastChatMessage.messageContent,
                      lastMessageTime,
                      unreadCount,
                    };
                  }
                  exChatsList.push({
                    _id,
                    chatId,
                    friends: chatFriendsExList,
                    isGroup,
                    chatName: `${chatFriends[0].firstName} ${chatFriends[0].lastName}`,
                    chatImage: chatFriends[0].image,
                    isMute,
                    lastMessage: lastChatMessage.messageContent,
                    lastMessageTime,
                    unreadCount,
                  });
                  return {
                    _id,
                    chatId,
                    friends: chatFriendslist,
                    isGroup,
                    chatName: `${chatFriends[0].firstName} ${chatFriends[0].lastName}`,
                    chatImage: chatFriends[0].image,
                    isMute,
                    lastMessage: lastChatMessage.messageContent,
                    lastMessageTime,
                    unreadCount,
                  };
                })
              );
            }
            if (!filePathExists) {
              chatLimit += 1;
              userMessages.set(chatId, {
                _id,
                friends: chatFriendsExList,
                messages: [],
                loadedCount: 49,
                loadedAll: true,
              });
              if (isGroup) {
                chatPromises.push(
                  new Promise((resolve) => {
                    exChatsList.push({
                      _id,
                      chatId,
                      isGroup,
                      groupAdmin,
                      friends: chatFriendsExList,
                      chatName: groupName,
                      chatImage: groupImage,
                      isMute,
                      lastMessage: '',
                      lastMessageTime: '',
                      unreadCount: 0,
                    });
                    resolve({
                      _id,
                      chatId,
                      isGroup,
                      groupAdmin,
                      friends: chatFriendslist,
                      chatName: groupName,
                      chatImage: groupImage,
                      isMute,
                      lastMessage: '',
                      lastMessageTime: '',
                      unreadCount: 0,
                    });
                  })
                );
              }
              if (!isGroup) {
                exChatsList.push({
                  _id,
                  chatId,
                  friends: chatFriendsExList,
                  isGroup,
                  chatName: `${chatFriends[0].firstName} ${chatFriends[0].lastName}`,
                  chatImage: chatFriends[0].image,
                  isMute,
                });
              }
            }
          }
        }
      }
      if (!user.emptyGroup) {
        const emptyGroup = chats.find(({ isEmpty }) => isEmpty);
        if (!emptyGroup) {
          const emptyGroupId = uuidv4();
          usersPromises.push(
            User.findOneAndUpdate(
              { _id: mongoUserId },
              {
                $addToSet: {
                  chats: {
                    chatId: emptyGroupId,
                    isGroup: true,
                    isEmpty: true,
                  },
                },
              },
              {
                new: true,
              }
            )
              .select(['chats'])
              .then((emptyGroupResult) => {
                const newEmptyGroup = emptyGroupResult.chats.find(({ isEmpty }) => isEmpty);
                user.emptyGroup = newEmptyGroup;
              })
          );
        }
        if (emptyGroup) {
          user.emptyGroup = emptyGroup;
        }
      }
      usersPromises.push(
        Promise.all(chatPromises).then((chatsList) => {
          console.log(`Got user chat and messages list user - ${index}`);
          user.exChatsList = exChatsList;
          user.chats = chatsList;
          user.messages = userMessages;
          user.loadedChats = chatLimit;
          const friendRequestsIds = [];
          const friendRequestsList = friendRequests.map((friendRequest) => {
            const { friend, requestTime, requestDay, requestDate, dateNow } = friendRequest;
            const requestTimeFormat = setItemTime(requestDate, dateNow, requestDay, requestTime);
            const _id = friend._id.toString();
            friendRequestsIds.push(_id);
            const requestId = uuidv4();
            return {
              requestId,
              _id,
              firstName: friend.firstName,
              lastName: friend.lastName,
              gender: friend.gender,
              birthday: friend.birthday,
              image: friend.image,
              requestTime: requestTimeFormat,
            };
          });
          user.friendRequests = friendRequestsList;
          const pendingFriendRequestsList = pendingFriendRequests.map((pendingRequest) => {
            const { friend, requestTime, requestDay, requestDate, dateNow } = pendingRequest;
            const requestTimeFormat = setItemTime(requestDate, dateNow, requestDay, requestTime);
            const _id = friend._id.toString();
            friendRequestsIds.push(_id);
            const requestId = uuidv4();
            return {
              requestId,
              _id,
              firstName: friend.firstName,
              lastName: friend.lastName,
              gender: friend.gender,
              birthday: friend.birthday,
              image: friend.image,
              requestTime: requestTimeFormat,
            };
          });
          console.log(`Got all user friend list user - ${index}`);
          user.pendingFriendRequests = pendingFriendRequestsList;
          const friendsIds = friends.map((friend) => friend._id);
          moreListPromises.push(
            User.find({ _id: { $nin: [userId, ...friendsIds, ...friendRequestsIds] } })
              .then((othersResult) => {
                const sortedOthersList = sortUsersArray(othersResult);
                const moreFriendsList = sortedOthersList.map((otherUser) => {
                  const otherUserId = uuidv4();
                  return {
                    otherUserId,
                    _id: otherUser._id.toString(),
                    firstName: otherUser.firstName,
                    lastName: otherUser.lastName,
                    gender: otherUser.gender,
                    birthday: otherUser.birthday,
                    image: otherUser.image,
                  };
                });
                user.moreFriends = moreFriendsList;
                const _id = userId.toString();
                users.set(_id, user);
              })
              .catch((error) => {
                console.log(error);
              })
          );
        })
      );
    });
    await Promise.all(usersPromises).then(async () => {
      console.log('Got all users');
      await Promise.all(moreListPromises);
    });
  })
  .catch((error) => console.log(error))
  .finally(() => console.log('Finally done!'));

module.exports = users;
