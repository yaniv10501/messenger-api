const { v4: uuidv4 } = require('uuid');
const users = require('../states/users');
const User = require('../models/user');
const {
  writeJsonFile,
  updateJsonMessages,
  getMessagesStream,
  checkFilePathExists,
} = require('../utils/fs');
const { webSocketClients } = require('../webSockets/webSockets');
const { getFriendId } = require('./users');
const setItemTime = require('../utils/setItemTime');
const NotFoundError = require('../utils/errors/NotFoundError');
const UnknownError = require('../utils/errors/UnknownError');
const setLastSeenTime = require('../utils/setLastSeenTime');
const { moveChatUp, moveGroupUp } = require('../utils/bulkUpdates');
const { setNewUserNotif } = require('./notifications');
const { NEW_MESSAGE } = require('../assets/notificationsTypes');
const getTime = require('../utils/getTime');
const { encryptMessage, decryptMessage } = require('../utils/chatKeys');

/**
 * @function sendNewMessage
 * @param {String} _id - User id
 * @param {String} chatId - Chat id
 * @param {Object} newMessage - New message object
 * @param {Boolean} isChatMute - Boolean for chat mute state
 * @param {Array} friends - Chat friends array
 * @param {Boolean} isGroup - Boolean for is group state
 * @returns An error if thrown
 */

module.exports.sendNewMessage = async (_id, chatId, newMessage, isChatMute, friends, isGroup) => {
  const moveToTopArray = (array, index) => {
    const temp = array[index];
    array.splice(index, 1);
    array.unshift(temp);
    return array;
  };
  const { messageContent, messageTime } = newMessage;
  const { firstName, lastName, image, chats: userChats, composeList } = users.get(_id);
  let chatIndex;
  const currentUserChat = userChats.find((chat, index) => {
    if (chat.chatId === chatId) {
      chatIndex = index;
    }
    return chat.chatId === chatId;
  });
  if (currentUserChat) {
    currentUserChat.lastMessage = messageContent;
    currentUserChat.lastMessageTime = messageTime;
    currentUserChat.lastMessageByUser = true;
    currentUserChat.unreadCount = 0;
    moveToTopArray(userChats, chatIndex);
  }
  if (!currentUserChat) {
    const newChat = composeList.find((chat) => chat.chatId === chatId);
    const newChats = [
      {
        ...newChat,
        lastMessage: messageContent,
        lastMessageTime: messageTime,
        lastMessageByUser: true,
        unreadCount: 0,
      },
      ...userChats,
    ];
    users.set(
      _id,
      {
        chats: newChats,
      },
      { isNew: false }
    );
  }
  const newFriendMessage = isGroup
    ? {
        ...newMessage,
        unreed: true,
        messageByUser: false,
        messageBy: `${firstName} ${lastName}`,
      }
    : {
        ...newMessage,
        unreed: true,
        messageByUser: false,
      };
  const webSocketsPromises = [];
  const usersPromises = [];
  const messagesPromises = [];
  friends.forEach((friend, index) => {
    const { friendId, mongoChatId } = getFriendId(_id, friend._id, {
      listType: 'chats',
      chatId,
      index,
    });
    const targetClient = webSocketClients.get(friendId, { destruct: false });
    const notifId = setNewUserNotif(friendId, {
      notifType: NEW_MESSAGE,
      otherUser: _id,
      actionId: chatId,
      message: {
        messageContent,
        messageTime,
      },
    });
    if (targetClient) {
      targetClient.forEach(({ socket }) => {
        webSocketsPromises.push(
          socket.send(
            JSON.stringify({
              message: NEW_MESSAGE,
              data: {
                message: newFriendMessage,
                chatId,
                user: {
                  userName: `${firstName} ${lastName}`,
                  image,
                },
                _id: notifId,
              },
            })
          )
        );
      });
    }
    const addFriendMessage = async (friendChatId) => {
      const newFriendEncryptedMessage = encryptMessage(
        friendId,
        _id,
        friendChatId,
        newFriendMessage
      );
      let friendMessages = this.getUserChatMessages(friendId, chatId, { fast: true });
      if (friendMessages instanceof Promise) {
        friendMessages = await friendMessages
          .then(({ messages: chatMessages }) => chatMessages)
          .catch((error) => {
            throw error;
          });
      } else {
        friendMessages = friendMessages.messages;
      }
      const { chats: friendChats } = users.get(friendId);
      let friendChatIndex;
      const currentFriendChat = friendChats.find((chat, friendIndex) => {
        if (chat.chatId === chatId) {
          friendChatIndex = friendIndex;
        }
        return chat.chatId === chatId;
      });
      if (currentFriendChat) {
        const { unreadCount } = currentFriendChat;
        currentFriendChat.lastMessage = newMessage.messageContent;
        currentFriendChat.lastMessageTime = newMessage.messageTime;
        currentFriendChat.lastMessageByUser = false;
        if (isGroup) {
          currentFriendChat.lastMessageBy = `${firstName} ${lastName}`;
        }
        currentFriendChat.unreadCount = unreadCount + 1;
        moveToTopArray(friendChats, friendChatIndex);
      }
      if (!currentUserChat) {
        const { composeList: friendComposeList } = users.get(friendId);
        const newChat = friendComposeList.find((chat) => chat.chatId === chatId);
        const newChats = [
          {
            ...newChat,
            lastMessage: messageContent,
            lastMessageTime: messageTime,
            lastMessageByUser: true,
            unreadCount: 0,
          },
          ...userChats,
        ];
        users.set(
          friendId,
          {
            chats: newChats,
          },
          { isNew: false }
        );
      }
      if (
        (friendMessages[0] && friendMessages[0].messageDate !== newFriendMessage.messageDate) ||
        friendMessages.length < 1
      ) {
        friendMessages.unshift({ chatTime: 'Today' });
      }
      friendMessages.unshift(newFriendEncryptedMessage);
      updateJsonMessages(`../messages/${friendId}/${friendChatId}.json`, (err, data) => {
        if (err) {
          writeJsonFile(`../messages/${friendId}/${friendChatId}.json`, [
            newFriendEncryptedMessage,
          ]);
        }
        if (data) {
          const parsedMessages = JSON.parse(data);
          const newFriendMessages = [newFriendEncryptedMessage, ...parsedMessages];
          writeJsonFile(`../messages/${friendId}/${friendChatId}.json`, newFriendMessages);
        }
      });
    };
    usersPromises.push(
      User.findOne({ _id: friendId })
        .select(['chats'])
        .then(async ({ chats }) => {
          const userAtFriend = chats.find((elem) => elem.chatId === chatId);
          const {
            _id: friendMongoChatId,
            isMute: isFriendChatMute,
            unreadCount: friendUnreadCount,
            friends: friendChatFriends,
            groupName,
            groupImage,
          } = userAtFriend;
          const friendChatId = friendMongoChatId.toString();
          const bulkUpdate = moveChatUp(
            isGroup,
            _id,
            friendId,
            chatId,
            friendChatId,
            friendChatFriends,
            isFriendChatMute,
            friendUnreadCount,
            groupName,
            groupImage,
            mongoChatId,
            isChatMute
          );
          if (!isGroup) {
            const encryptedMessage = encryptMessage(_id, friendId, mongoChatId, newMessage);
            let currentMessages = this.getUserChatMessages(_id, chatId, {
              fast: true,
            });
            if (currentMessages instanceof Promise) {
              currentMessages = await currentMessages
                .then(({ messages: chatMessages }) => chatMessages)
                .catch((error) => {
                  throw error;
                });
            } else {
              currentMessages = currentMessages.messages;
            }
            if (
              (currentMessages[0] && currentMessages[0].messageDate !== newMessage.messageDate) ||
              currentMessages.length < 1
            ) {
              currentMessages.unshift({ chatTime: 'Today' });
            }
            currentMessages.unshift(encryptedMessage);
            updateJsonMessages(`../messages/${_id}/${mongoChatId}.json`, (err, data) => {
              if (err) {
                writeJsonFile(`../messages/${_id}/${mongoChatId}.json`, [encryptedMessage]);
                addFriendMessage(friendChatId);
                messagesPromises.push(User.bulkWrite(bulkUpdate));
              }
              if (data) {
                const parsedMessages = JSON.parse(data);
                const newMessages = [{ ...encryptedMessage }, ...parsedMessages];
                writeJsonFile(`../messages/${_id}/${mongoChatId}.json`, newMessages);
                addFriendMessage(friendChatId);
                messagesPromises.push(User.bulkWrite(bulkUpdate));
              }
            });
          }
          if (isGroup) {
            addFriendMessage(friendChatId);
            messagesPromises.push(User.bulkWrite(bulkUpdate));
          }
        })
        .catch((error) => {
          throw error;
        })
    );
  });
  if (isGroup) {
    usersPromises.push(
      User.findOne({ _id })
        .select(['chats'])
        .then(async ({ chats }) => {
          const groupChat = chats.find((chat) => chat.chatId === chatId);
          const { _id: mongoChatId, friends: groupFriends, groupName, groupImage } = groupChat;
          const groupId = mongoChatId.toString();
          const bulkUpdate = moveGroupUp(
            _id,
            chatId,
            groupId,
            groupFriends,
            isChatMute,
            groupImage,
            groupName
          );
          const encryptedMessage = encryptMessage(_id, groupId, newMessage);
          let currentMessages = this.getUserChatMessages(_id, chatId, { fast: true });
          if (currentMessages instanceof Promise) {
            currentMessages = await currentMessages
              .then(({ messages: chatMessages }) => chatMessages)
              .catch((error) => {
                throw error;
              });
          } else {
            currentMessages = currentMessages.messages;
          }
          if (
            (currentMessages[0] && currentMessages[0].messageDate !== newMessage.messageDate) ||
            currentMessages.length < 1
          ) {
            currentMessages.unshift({ chatTime: 'Today' });
          }
          currentMessages.unshift(encryptedMessage);
          updateJsonMessages(`../messages/${_id}/${groupId}.json`, (err, data) => {
            if (err) {
              writeJsonFile(`../messages/${_id}/${groupId}.json`, [encryptedMessage]);
              messagesPromises.push(User.bulkWrite(bulkUpdate));
            }
            if (data) {
              const parsedMessages = JSON.parse(data);
              const newMessages = [encryptedMessage, ...parsedMessages];
              writeJsonFile(`../messages/${_id}/${groupId}.json`, newMessages);
              messagesPromises.push(User.bulkWrite(bulkUpdate));
            }
          });
        })
        .catch((error) => {
          throw error;
        })
    );
  }
  return Promise.all(webSocketsPromises).then(() =>
    Promise.all(usersPromises).then(() => Promise.all(messagesPromises))
  );
};

/**
 * @function getUserComposeList
 * @param {String} _id - User id
 * @returns User compose list
 */

module.exports.getUserComposeList = (_id) => {
  const { composeList } = users.get(_id);
  const userComposeList = composeList.map((chat) => {
    const { chatId, chatImage, chatName, friends, isGroup, isMute } = chat;
    const friendsList = friends.map((friend) => {
      const {
        firstName: friendFirstName,
        lastName: friendLastName,
        birthday: friendBirthday,
        gender: friendGender,
        image: friendImage,
      } = users.get(friend._id);
      return {
        _id: friend.friendId,
        firstName: friendFirstName,
        lastName: friendLastName,
        birthday: friendBirthday,
        gender: friendGender,
        image: friendImage,
      };
    });
    const { isOnline } = users.get(friends[0]._id);
    const onlineTime = setLastSeenTime(isOnline.time);
    return {
      _id: chatId,
      chatImage,
      chatName,
      friends: friendsList,
      isGroup,
      isMute,
      isOnline: {
        online: isOnline.online,
        time: onlineTime,
      },
    };
  });
  return userComposeList;
};

/**
 * @function setNewUserGroup
 * @param {String} _id - User id
 * @param {String} groupName - Group name
 * @param {Object} groupFriends - Group friends array
 * @param {String} image - String 'Uploaded' for uploaded group image and null for non uploaded group image
 * @returns New group object
 */

module.exports.setNewUserGroup = async (_id, groupName, groupFriends, image) => {
  const webSocketsPromises = [];
  const currentUser = users.get(_id);
  const {
    firstName,
    lastName,
    birthday,
    gender,
    image: userImage,
    emptyGroup,
    chats: userChats,
    messages,
  } = currentUser;
  const userAdminId = uuidv4();
  const friendsIds = [];
  const exGroupFriendsList = [];
  const { itemTime: messageTime, itemDay: messageDay, itemDate: messageDate } = getTime();
  const groupMessages = [];
  const groupFriendsList = groupFriends.map((friend) => {
    const newFriendId = uuidv4();
    const friendId = getFriendId(_id, friend._id, { listType: 'friends' });
    groupMessages.push({
      groupMessage: `${friend.firstName} has been added to the group`,
      messageTime,
      messageDay,
      messageDate,
    });
    friendsIds.push({ _id: friendId });
    exGroupFriendsList.push({
      _id: friendId,
      friendId: newFriendId,
    });
    return {
      _id: friendId,
      friendId: newFriendId,
    };
  });
  const newGroup = {
    chatId: emptyGroup.chatId,
    isMute: 0,
    isGroup: true,
    groupAdmin: userAdminId,
    chatName: groupName,
    chatImage: image,
    lastMessage: groupMessages[0].groupMessage,
    lastMessageTime: messageTime,
    unreadCount: 0,
  };
  const chatsPromises = [];
  currentUser.chatsCount += 1;
  currentUser.loadedChats += 1;
  newGroup.friends = groupFriendsList;
  groupFriendsList.forEach((friend, index) => {
    const friendFriendsIds = friendsIds.map((friendId, friendIndex) =>
      friendIndex === index ? { _id } : friendId
    );
    chatsPromises.push(
      User.findOneAndUpdate(
        {
          _id: friendsIds[index]._id,
        },
        {
          $push: {
            chats: {
              $each: [
                {
                  chatId: newGroup.chatId,
                  isMute: 0,
                  isGroup: true,
                  groupAdmin: { _id },
                  groupName,
                  groupImage: image,
                  friends: friendFriendsIds,
                  unreadCount: 0,
                },
              ],
              $position: 0,
            },
          },
        },
        {
          new: true,
        }
      )
        .select(['chats'])
        .then(({ chats }) => {
          const resultFriendGroup = chats.find((chat) => chat.chatId === newGroup.chatId);
          const friendGroupFriendsList = groupFriendsList.map((groupFriend) =>
            groupFriend._id === friend._id
              ? {
                  _id,
                  friendId: userAdminId,
                }
              : groupFriend
          );
          const friendExGroupFriendsList = exGroupFriendsList.map((exGroupFriend) =>
            exGroupFriend.friendId === friend._id
              ? {
                  _id,
                  friendId: userAdminId,
                }
              : exGroupFriend
          );
          const newFriendGroup = {
            ...newGroup,
            _id: resultFriendGroup._id.toString(),
            groupAdmin: userAdminId,
            friends: friendGroupFriendsList,
          };
          const friendUser = users.get(friendsIds[index]._id);
          friendUser.chatsCount += 1;
          friendUser.loadedChats += 1;
          friendUser.chats.unshift({
            ...newFriendGroup,
            groupAdmin: { _id, userId: userAdminId },
            friends: friendExGroupFriendsList,
          });
          friendUser.messages.set(newGroup.chatId, {
            _id: newFriendGroup._id,
            friends: newFriendGroup.friends,
            messages: groupMessages,
            loadedCount: 49,
            loadedAll: true,
          });
          const targetClient = webSocketClients.get(friendsIds[index]._id, { destruct: false });
          if (targetClient) {
            const friendsList = friendGroupFriendsList.map((friendGroupFriend) => {
              const friendId = friendGroupFriend._id;
              if (friendId === _id) {
                return {
                  _id: userAdminId,
                  firstName,
                  lastName,
                  birthday,
                  gender,
                  image: userImage,
                };
              }
              const {
                firstName: friendFirstName,
                lastName: friendLastName,
                birthday: friendBirthday,
                gender: friendGender,
                image: friendImage,
              } = users.get(friendId);
              return {
                _id: friendGroupFriend.friendId,
                firstName: friendFirstName,
                lastName: friendLastName,
                birthday: friendBirthday,
                gender: friendGender,
                image: friendImage,
              };
            });
            writeJsonFile(
              `../messages/${friendsIds[index]._id}/${newFriendGroup._id}.json`,
              groupMessages
            );
            targetClient.forEach(({ socket }) => {
              webSocketsPromises.push(
                socket.send(
                  JSON.stringify({
                    message: 'New group',
                    data: {
                      group: {
                        _id: newFriendGroup.chatId,
                        chatName: newFriendGroup.chatName,
                        image: newFriendGroup.chatImage,
                        groupAdmin: newFriendGroup.groupAdmin,
                        friends: friendsList,
                        isGroup: true,
                        isMute: 0,
                        lastMessage: groupMessages[0].groupMessage,
                        lastMessageTime: messageTime,
                        unreadCount: 0,
                      },
                    },
                  })
                )
              );
            });
          }
        })
        .catch((error) => {
          throw error;
        })
    );
  });
  const newEmptyGroupId = uuidv4();
  const oldEmptyGroupId = emptyGroup._id.toString();
  chatsPromises.push(
    User.findByIdAndUpdate(
      {
        _id,
      },
      {
        $pull: {
          chats: {
            _id: oldEmptyGroupId,
          },
        },
      }
    )
      .then(() =>
        User.findOneAndUpdate(
          {
            _id,
          },
          {
            $addToSet: {
              chats: {
                chatId: newEmptyGroupId,
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
          .then(async (emptyGroupResult) => {
            const newEmptyGroup = emptyGroupResult.chats.find(({ isEmpty }) => isEmpty);
            currentUser.emptyGroup = newEmptyGroup;
            return User.findOneAndUpdate(
              {
                _id,
              },
              {
                $push: {
                  chats: {
                    $each: [
                      {
                        chatId: newGroup.chatId,
                        isMute: 0,
                        isGroup: true,
                        groupAdmin: { _id },
                        groupName,
                        groupImage: image,
                        friends: friendsIds,
                        unreadCount: 0,
                      },
                    ],
                    $position: 0,
                  },
                },
              },
              {
                new: true,
              }
            )
              .select(['chats'])
              .then(({ chats }) => {
                const currentGroup = chats.find((chat) => chat.chatId === newGroup.chatId);
                newGroup._id = currentGroup._id.toString();
                userChats.unshift({
                  ...newGroup,
                  groupAdmin: { _id, userId: userAdminId },
                  friends: exGroupFriendsList,
                });
                messages.set(newGroup.chatId, {
                  _id: newGroup._id,
                  friends: newGroup.friends,
                  messages: groupMessages,
                  loadedCount: 49,
                  loadedAll: true,
                });
                emptyGroup.chatId = newEmptyGroupId;
              })
              .catch((error) => {
                throw error;
              });
          })
          .catch((error) => {
            throw error;
          })
      )
      .catch((error) => {
        throw error;
      })
  );
  return Promise.all(webSocketsPromises)
    .then(() =>
      Promise.all(chatsPromises)
        .then(() => {
          const friendsList = groupFriendsList.map((friendGroupFriend) => {
            const friendId = friendGroupFriend._id;
            if (friendId === _id) {
              return {
                _id: userAdminId,
                firstName,
                lastName,
                birthday,
                gender,
                image: userImage,
              };
            }
            const {
              firstName: friendFirstName,
              lastName: friendLastName,
              birthday: friendBirthday,
              gender: friendGender,
              image: friendImage,
            } = users.get(friendId);
            return {
              _id: friendGroupFriend.friendId,
              firstName: friendFirstName,
              lastName: friendLastName,
              birthday: friendBirthday,
              gender: friendGender,
              image: friendImage,
            };
          });
          writeJsonFile(`../messages/${_id}/${newGroup._id}.json`, groupMessages);
          return {
            _id: newGroup.chatId,
            chatName: newGroup.chatName,
            image: newGroup.chatImage,
            groupAdmin: newGroup.groupAdmin,
            friends: friendsList,
            isGroup: true,
            isMute: 0,
            lastMessage: groupMessages[0].groupMessage,
            lastMessageTime: messageTime,
            unreadCount: 0,
          };
        })
        .catch((error) => {
          throw error;
        })
    )
    .catch((error) => {
      throw error;
    });
};

/**
 * @function getUserChats
 * @param {String} _id - User id
 * @returns User chats
 */

module.exports.getUserChats = (_id) => {
  const { chats, loadedChats, chatsCount } = users.get(_id);
  const chatsList = chats.map((chat) => {
    let currentChat = chat;
    if (chat.encryptedMessage) {
      currentChat = {
        ...chat,
        ...JSON.parse(decryptMessage(_id, chat._id, chat)),
      };
    }
    const {
      chatId,
      friends,
      isGroup,
      groupAdmin,
      chatName,
      chatImage,
      isMute,
      lastMessage,
      lastMessageByUser,
      lastMessageBy,
      lastMessageTime,
      unreadCount,
    } = currentChat;
    const friendsList = friends.map((friend) => {
      const {
        firstName: friendFirstName,
        lastName: friendLastName,
        birthday: friendBirthday,
        gender: friendGender,
        image: friendImage,
      } = users.get(friend._id);
      return {
        _id: friend.friendId,
        firstName: friendFirstName,
        lastName: friendLastName,
        birthday: friendBirthday,
        gender: friendGender,
        image: friendImage,
      };
    });
    if (!isGroup) {
      const { isOnline } = users.get(friends[0]._id);
      const onlineTime = setLastSeenTime(isOnline.time);
      return {
        _id: chatId,
        friends: friendsList,
        isGroup,
        groupAdmin,
        chatName,
        image: isGroup ? chatImage : friendsList[0].image,
        isMute,
        lastMessage,
        lastMessageByUser,
        lastMessageTime,
        unreadCount,
        isOnline: {
          online: isOnline.online,
          time: onlineTime,
        },
      };
    }
    return {
      _id: chatId,
      friends: friendsList,
      isGroup,
      groupAdmin,
      chatName,
      image: isGroup ? chatImage : friendsList[0].image,
      isMute,
      lastMessage,
      lastMessageByUser,
      lastMessageBy,
      lastMessageTime,
      unreadCount,
    };
  });
  if (loadedChats >= chatsCount) {
    return {
      loadedAll: true,
      chatsList,
    };
  }
  return chatsList;
};

/**
 * @function getMoreUserChats
 * @param {String} _id - User id
 * @returns User more chats
 */

module.exports.getMoreUserChats = async (_id) => {
  const user = users.get(_id);
  const { loadedChats, messages: userMessages, chatsCount } = user;
  if (loadedChats > chatsCount)
    return new Promise((resolve) => {
      resolve({
        loadedAll: true,
      });
    });
  return User.findOne({ _id })
    .orFail(() => {
      throw new NotFoundError('User ID not found');
    })
    .select(['chats'])
    .populate(['chats.friends'])
    .then(async ({ chats: moreChats }) => {
      let chatLimit = loadedChats + 20;
      const chatPromises = [];
      for (let i = loadedChats; i < chatLimit; i += 1) {
        const chat = moreChats[i];
        if (chat) {
          const mongoChatId = chat._id.toString();
          const {
            chatId,
            isGroup,
            friends: chatFriends,
            isMute,
            groupAdmin,
            groupName,
            groupImage,
            unreadCount,
          } = chat;
          const chatFriendsExList = [];
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
          const filePathExists = checkFilePathExists(`../messages/${_id}/${mongoChatId}.json`);
          if (filePathExists) {
            chatPromises.push(
              getMessagesStream(`../messages/${_id}/${mongoChatId}.json`).then(
                ({ messages, loadedAll }) => {
                  userMessages.set(chatId, {
                    _id: mongoChatId,
                    friends: chatFriendsExList,
                    messages,
                    loadedCount: 49,
                    loadedAll,
                  });
                  const lastChatMessage = messages[0];
                  const { messageTime, messageDay, messageDate, dateNow } = lastChatMessage;
                  const lastMessageTime = setItemTime(
                    messageDate,
                    dateNow,
                    messageDay,
                    messageTime
                  );
                  if (isGroup) {
                    return {
                      _id: chatId,
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
                  return {
                    _id: chatId,
                    friends: chatFriendslist,
                    isGroup,
                    chatName: `${chatFriends[0].firstName} ${chatFriends[0].lastName}`,
                    chatImage: chatFriends[0].image,
                    isMute,
                    lastMessage: lastChatMessage.messageContent,
                    lastMessageTime,
                    unreadCount,
                  };
                }
              )
            );
          }
          if (!filePathExists) {
            chatLimit += 1;
          }
        }
      }
      return Promise.all(chatPromises).then((moreChatsList) => {
        user.loadedChats = chatLimit;
        if (chatLimit + 1 >= chatsCount) {
          return {
            loadedAll: true,
            moreChatsList,
          };
        }
        return moreChatsList;
      });
    })
    .catch((error) => {
      throw error;
    });
};

/**
 * @function getUserChatMessages
 * @param {String} _id - User id
 * @param {*} chatId - Chat id
 * @param {*} options.fast - Set true to get only the messages array, default to false
 * @returns Chat messages array
 */

module.exports.getUserChatMessages = (_id, chatId, options) => {
  const { fast = false } = options || {};
  const currentUser = users.get(_id);
  const { messages } = currentUser;
  const userMessages = messages.get(chatId);
  console.log(userMessages);
  if (!userMessages) {
    return User.findOne({ _id })
      .orFail(() => {
        throw new NotFoundError('User ID not found');
      })
      .select(['chats'])
      .then(({ chats }) => {
        const currentChat = chats.find((chat) => chat.chatId === chatId);
        const { friends } = currentChat;
        if (friends.length < 1) {
          throw new UnknownError('An error has occurred');
        }
        const friendsList = friends.map((friend) => {
          const friendMongoId = friend._id.toString();
          const { friendId } = currentUser.friends.find(
            (friendObj) => friendObj._id === friendMongoId
          );
          return {
            _id: friendMongoId,
            friendId,
          };
        });
        const mongoChatId = currentChat._id.toString();
        const { isOnline } = users.get(friendsList.friends[0]._id);
        const friendOnline = {
          online: isOnline.online,
          time: setLastSeenTime(isOnline.time),
        };
        messages.set(chatId, {
          _id: mongoChatId,
          friends: friendsList,
          messages: [],
          isOnline: friendOnline,
          loadedCount: 0,
          loadedAll: true,
        });
        return currentChat.isGroup;
      })
      .then((isGroup) => {
        const newMessages = messages.get(chatId);
        const { messages: chatMessages } = newMessages;
        if (!isGroup) {
          const { isOnline } = users.get(newMessages.friends[0]._id);
          const friendOnline = {
            online: isOnline.online,
            time: setLastSeenTime(isOnline.time),
          };
          return {
            messages: chatMessages,
            isOnline: friendOnline,
            loadedAll: true,
          };
        }
        return {
          messages: chatMessages,
          loadedAll: true,
        };
      })
      .catch((error) => {
        throw error;
      });
  }
  const { messages: chatMessages, loadedAll, friends } = userMessages;
  messages.set(chatId, {
    ...userMessages,
    loadedCount: 49,
  });
  const decryptedMessages = [];
  chatMessages.forEach((message) => {
    if (!message.chatTime) {
      decryptedMessages.push(decryptMessage(_id, friends[0]._id, userMessages._id, message));
    }
  });
  if (loadedAll && !fast) {
    if (friends.length === 1) {
      const { isOnline } = users.get(friends[0]._id);
      const friendOnline = {
        online: isOnline.online,
        time: setLastSeenTime(isOnline.time),
      };
      return {
        messages: decryptedMessages,
        isOnline: friendOnline,
        loadedAll: true,
      };
    }
    return {
      messages: decryptedMessages,
      loadedAll,
    };
  }
  if (friends.length === 1) {
    const { isOnline } = users.get(friends[0]._id);
    const friendOnline = {
      online: isOnline.online,
      time: setLastSeenTime(isOnline.time),
    };
    return {
      messages: decryptedMessages,
      isOnline: friendOnline,
    };
  }
  return {
    messages: decryptedMessages,
  };
};

/**
 * @function getMoreChatsMessages
 * @param {String} _id - User id
 * @param {String} chatId - Chat id
 * @returns More chat messages array
 */

module.exports.getMoreChatsMessages = async (_id, chatId) => {
  const { messages } = users.get(_id);
  const userMessages = messages.get(chatId);
  const { loadedCount, _id: mongoChatId } = userMessages;
  userMessages.loadedCount = Number(loadedCount) + 50;
  return getMessagesStream(`../messages/${_id}/${mongoChatId}.json`, {
    toLoad: userMessages.loadedCount,
  }).then((moreMessages) => {
    const { messages: moreChatMessages, loadedAll } = moreMessages;
    const decryptedMessages = moreChatMessages.map((message) =>
      decryptMessage(_id, chatId, message)
    );
    return {
      messages: decryptedMessages,
      loadedAll,
    };
  });
};

/**
 * @function leaveUserChat
 * @description - Reset chat loaded count to default
 * @param {String} _id - User id
 * @param {String} chatId - Chat id
 */

module.exports.leaveUserChat = (_id, chatId) => {
  const { messages } = users.get(_id);
  const userMessages = messages.get(chatId);
  if (userMessages) {
    userMessages.loadedCount = 49;
  }
};

/**
 * @function leaveUserChats
 * @description - Resest loaded chat count to default
 * @param {String} _id - User id
 */

module.exports.leaveUserChats = (_id) => {
  const user = users.get(_id);
  User.findOne({ _id })
    .select(['chats'])
    .then(({ chats }) => {
      let chatLimit = 20;
      for (let i = 0; i < chatLimit; i += 1) {
        const currentChat = chats[i];
        if (!currentChat) {
          chatLimit = i;
        } else {
          const chatId = currentChat._id.toString();
          const filePathExists = checkFilePathExists(`../messages/${_id}/${chatId}.json`);
          if (!filePathExists) {
            chatLimit += 1;
          }
        }
      }
      user.loadedChats = chatLimit;
    });
};

/**
 * @function setUserChatTyping
 * @description - Send user typing socket messages to chat friends
 * @param {String} _id - User id
 * @param {String} chatId - Chat id
 * @param {Array} friends - Chat friends array
 * @returns An error if thrown
 */

module.exports.setUserChatTyping = (_id, chatId, friends) => {
  const { firstName } = users.get(_id);
  const webSocketsPromises = [];
  friends.forEach((friend, index) => {
    const { friendId } = getFriendId(_id, friend._id, {
      listType: 'chats',
      chatId,
      index,
    });
    const targetClient = webSocketClients.get(friendId.toString(), { destruct: false });
    if (targetClient) {
      targetClient.forEach(({ socket }) => {
        webSocketsPromises.push(
          socket.send(
            JSON.stringify({
              message: 'User typing',
              data: {
                chatId,
                friendName: firstName,
              },
            })
          )
        );
      });
    }
  });
  return Promise.all(webSocketsPromises);
};

/**
 * @function getGroupId
 * @param {String} _id - User id
 * @param {String} chatId - Chat id
 * @returns Group id
 */

module.exports.getGroupId = (_id, chatId) =>
  new Promise((resolve, reject) => {
    const { chats, emptyGroup } = users.get(_id);
    if (chatId === emptyGroup.chatId) {
      const groupId = emptyGroup._id.toString();
      resolve(groupId);
    } else {
      const groupChatsCheck = chats.find((chat) => chat.chatId === chatId);
      if (groupChatsCheck) {
        const groupId = groupChatsCheck._id.toString();
        resolve(groupId);
      } else {
        User.findOne({ _id }, { chats: { $eq: { chatId } } })
          .then((chat) => {
            const groupId = chat._id.toString();
            resolve(groupId);
          })
          .catch((error) => reject(error));
      }
    }
  });

/**
 * @function getUserNewChat
 * @param {String} _id - User id
 * @param {String} chatId - Chat id
 * @returns New chat object
 */

module.exports.getUserNewChat = (_id, chatId) => {
  const { composeList, chats: userChats } = users.get(_id);
  const newChat = composeList.find((chat) => chat.chatId === chatId);
  const newComposeList = composeList.filter((chat) => chat.chatId !== chatId);
  users.set(
    _id,
    {
      chats: [newChat, ...userChats],
      composeList: newComposeList,
    },
    { isNew: false }
  );
  return newChat;
};

/**
 * @function getMoreUserGroupFriends
 * @param {String} _id -User id
 * @param {String} groupId - Group id
 * @returns More user group friends array
 */

module.exports.getMoreUserGroupFriends = (_id, groupId) => {
  const { messages, friends } = users.get(_id);
  const { friends: groupFriends } = messages.get(groupId);
  const friendsList = friends
    .filter((friend) => !groupFriends.some((groupFriend) => groupFriend._id === friend._id))
    .map((friend) => {
      const {
        firstName: friendFirstName,
        lastName: friendLastName,
        birthday: friendBirthday,
        gender: friendGender,
        image: friendImage,
      } = users.get(friend._id);
      return {
        _id: friend.friendId,
        firstName: friendFirstName,
        lastName: friendLastName,
        birthday: friendBirthday,
        gender: friendGender,
        image: friendImage,
      };
    });
  return friendsList;
};

/**
 * @function resetUserChatUnread
 * @description Reset user chat unread count
 * @param {*} _id - User id
 * @param {*} chatId - Chat id
 */

module.exports.resetUserChatUnread = (_id, chatId) => {
  const { chats } = users.get(_id);
  const currentChat = chats.find((chat) => chat.chatId === chatId);
  if (currentChat) {
    currentChat.unreadCount = 0;
    User.findOneAndUpdate(
      {
        _id,
      },
      {
        $set: {
          'chats.$[element].unreadCount': 0,
        },
      },
      {
        arrayFilters: [{ 'element.chatId': { $eq: chatId } }],
        runValidators: true,
      }
    )
      .orFail(() => {
        throw new NotFoundError('User ID not found');
      })
      .catch((error) => {
        throw error;
      });
  }
};
