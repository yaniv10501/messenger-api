const { v4: uuidv4 } = require('uuid');
const User = require('../models/user');
const AvlTree = require('../utils/AvlTree');
const { getMessagesStream, checkFilePathExists } = require('../utils/fs');
const setItemTime = require('../utils/setItemTime');

const users = new AvlTree();

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
    'dontDisturb',
    'notifications',
  ])
  .then(async (currentRegisteredUsers) => {
    // eslint-disable-next-line no-console
    console.log('All users found!');
    const usersPromises = [];
    currentRegisteredUsers.forEach((registerdUser, index) => {
      // eslint-disable-next-line no-console
      console.log(`Getting user info user - ${index}`);
      const {
        _id: mongoUserId,
        userName,
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
        dontDisturb,
        notifications,
      } = registerdUser;
      const userId = mongoUserId.toString();
      const user = {
        userName,
        firstName,
        lastName,
        email,
        gender,
        birthday,
        image,
        blockedUsers,
        dontDisturb,
        chatsCount: chats.length,
      };
      // eslint-disable-next-line no-console
      console.log(`Got user info user - ${index}`);
      const friendList = [];
      const composeList = [];
      for (let i = 0; i < 20; i += 1) {
        const friend = friends[i];
        if (friend) {
          const friendId = uuidv4();
          friendList.push({
            _id: friends[i]._id.toString(),
            friendId,
          });
        }
      }
      user.queue = [];
      user.friends = friendList;
      const userMessages = new Map();
      let chatLimit = 20;
      const chatPromises = [];
      for (let i = 0; i < chatLimit; i += 1) {
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
              const { _id: mongoFriendId } = chatFriend;
              const friendId = uuidv4();
              return {
                _id: mongoFriendId.toString(),
                friendId,
              };
            });
            const filePathExists = checkFilePathExists(`../messages/${userId}/${_id}.json`);
            if (filePathExists) {
              chatPromises.push(
                getMessagesStream(`../messages/${userId}/${_id}.json`).then(
                  ({ messages, loadedAll }) => {
                    // eslint-disable-next-line no-console
                    console.log(`Got messages for user - ${userId}, chat - ${_id}`);
                    userMessages.set(chatId, {
                      _id,
                      friends: chatFriendslist,
                      messages,
                      loadedCount: 49,
                      loadedAll,
                    });
                    const lastChatMessage = messages[1];
                    const {
                      messageTime,
                      messageDay,
                      messageDate,
                      dateNow,
                      messageByUser,
                      messageBy,
                    } = lastChatMessage;
                    const lastMessageTime = setItemTime(
                      messageDate,
                      dateNow,
                      messageDay,
                      messageTime
                    );
                    if (isGroup) {
                      return {
                        _id,
                        chatId,
                        isGroup,
                        groupAdmin,
                        friends: chatFriendslist,
                        chatName: groupName,
                        chatImage: groupImage,
                        isMute,
                        lastMessage: lastChatMessage.messageContent || lastChatMessage.groupMessage,
                        lastMessageByUser: messageByUser,
                        lastMessageBy: messageBy,
                        lastMessageTime,
                        unreadCount,
                      };
                    }
                    return {
                      _id,
                      chatId,
                      friends: chatFriendslist,
                      isGroup,
                      chatName: `${chatFriends[0].firstName} ${chatFriends[0].lastName}`,
                      chatImage: chatFriends[0].image,
                      isMute,
                      lastMessage: lastChatMessage.messageContent,
                      lastMessageByUser: messageByUser,
                      lastMessageTime,
                      unreadCount,
                    };
                  }
                )
              );
            }
            if (!filePathExists) {
              userMessages.set(chatId, {
                _id,
                friends: chatFriendslist,
                messages: [],
                loadedCount: 49,
                loadedAll: true,
              });
              if (!isGroup) {
                chatLimit += 1;
                composeList.push({
                  _id,
                  chatId,
                  friends: chatFriendslist,
                  isGroup,
                  chatName: `${chatFriends[0].firstName} ${chatFriends[0].lastName}`,
                  chatImage: chatFriends[0].image,
                  isMute,
                });
              }
              if (isGroup) {
                chatPromises.push(
                  new Promise((resolve) => {
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
          // eslint-disable-next-line no-console
          console.log(`Got user chat and messages list user - ${index}`);
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
              requestTime: requestTimeFormat,
            };
          });
          // eslint-disable-next-line no-console
          console.log(`Got all user friend list user - ${index}`);
          user.pendingFriendRequests = pendingFriendRequestsList;
          user.isOnline = {
            online: false,
            time: null,
          };
          user.composeList = composeList;
          user.notifications = notifications.map(
            ({ notifId, notifType, isSeen, otherUser, actionId, message }) => ({
              notifId,
              notifType,
              isSeen,
              otherUser,
              actionId,
              message,
            })
          );
          users.set(userId, user);
        })
      );
    });
    await Promise.all(usersPromises).then(async () =>
      // eslint-disable-next-line no-console
      console.log('Got all users')
    );
  }) // eslint-disable-next-line no-console
  .catch((error) => console.log(error))
  .finally(() => {
    // eslint-disable-next-line no-console
    console.log(users.toObject());
    // eslint-disable-next-line no-console
    console.log('Finally done!');
  });

module.exports = users;
