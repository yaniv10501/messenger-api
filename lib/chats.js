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

module.exports.getUserChatMessages = (_id, chatId, options) => {
  const { fast = false } = options || {};
  const currentUser = users.get(_id);
  const { messages } = currentUser;
  const userMessages = messages.get(chatId);
  if (!userMessages) {
    return User.findOne({ _id })
      .select(['chats'])
      .then(({ chats }) => {
        const { exChatsList } = currentUser;
        const currentExChat = exChatsList.find((chat) => chat.chatId === chatId);
        const { friends } = currentExChat;
        const currentChat = chats.find((chat) => chat.chatId === chatId);
        const mongoChatId = currentChat._id.toString();
        currentExChat._id = mongoChatId;
        messages.set(chatId, {
          _id: mongoChatId,
          friends,
          messages: [],
          loadedCount: 0,
        });
      })
      .then(() => {
        const newMessages = messages.get(chatId);
        const { messages: chatMessages } = newMessages;
        return chatMessages;
      });
  }
  const { messages: chatMessages, loadedAll } = userMessages;
  if (loadedAll && !fast) {
    return {
      messages: chatMessages,
      loadedAll,
    };
  }
  return chatMessages;
};

module.exports.sendNewMessage = async (_id, chatId, newMessage, isChatMute, friends, isGroup) => {
  const { firstName, lastName, image, chats: userChats, exChatsList: userExChats } = users.get(_id);
  const currentUserChat = userChats.find((chat) => chat.chatId === chatId);
  if (!currentUserChat) {
    const currentExChat = userExChats.find((chat) => chat.chatId === chatId);
    const { friends: userExChatFriends } = currentExChat;
    const chatFriendsList = userExChatFriends.map((exChatfriend) => {
      const {
        friendId,
        firstName: friendName,
        lastName: friendLastName,
        birthday: friendBirthday,
        gender: friendGender,
        image: friendImage,
      } = exChatfriend;
      return {
        _id: friendId,
        firstName: friendName,
        lastName: friendLastName,
        birthday: friendBirthday,
        gender: friendGender,
        image: friendImage,
      };
    });
    userChats.unshift({
      ...currentExChat,
      friends: chatFriendsList,
      lastMessage: newMessage.messageContent,
      lastMessageTime: newMessage.messageTime,
      unreadCount: 0,
    });
  }
  if (currentUserChat) {
    currentUserChat.lastMessage = newMessage.messageContent;
    currentUserChat.lastMessageTime = newMessage.messageTime;
    currentUserChat.unreadCount = 0;
  }
  const newFriendMessage = {
    ...newMessage,
    unreed: true,
    messageByUser: false,
  };
  const webSocketsPromises = [];
  const usersPromises = [];
  const messagesPromises = [];
  friends.forEach((friend, index) => {
    const { friendId, mongoChatId } = getFriendId(_id, friend._id, {
      listType: 'group',
      chatId,
      index,
    });
    const targetClient = webSocketClients.get(friendId);
    if (targetClient) {
      webSocketsPromises.push(
        targetClient.send(
          JSON.stringify({
            message: 'New message',
            data: {
              message: newFriendMessage,
              chatId,
              user: {
                userName: `${firstName} ${lastName}`,
                image,
              },
            },
          })
        )
      );
    }
    const addFriendMessage = async (friendChatId) => {
      let friendMessages = this.getUserChatMessages(friendId, chatId, { fast: true });
      if (friendMessages instanceof Promise) {
        friendMessages = await this.getUserChatMessages(friendId, chatId, { fast: true }).then(
          (chatMessages) => chatMessages
        );
      }
      const { chats: friendChats, exChatsList: friendExChats } = users.get(friendId);
      const currentFriendChat = friendChats.find((chat) => chat.chatId === chatId);
      if (!currentFriendChat) {
        const friendExChat = friendExChats.find((chat) => chat.chatId === chatId);
        const { friends: friendExChatFriends } = friendExChat;
        friendExChat.friends = friendExChatFriends.map((exChatfriend) => {
          const {
            friendId: userIdAtFriend,
            firstName: friendName,
            lastName: friendLastName,
            birthday: friendBirthday,
            gender: friendGender,
            image: friendImage,
          } = exChatfriend;
          return {
            _id: userIdAtFriend,
            friendName,
            friendLastName,
            friendBirthday,
            friendGender,
            friendImage,
          };
        });
        friendChats.unshift({
          ...friendExChat,
          lastMessage: newMessage.messageContent,
          lastMessageTime: newMessage.messageTime,
          unreadCount: 1,
        });
      }
      if (currentFriendChat) {
        const { unreadCount } = currentFriendChat;
        currentFriendChat.lastMessage = newMessage.messageContent;
        currentFriendChat.lastMessageTime = newMessage.messageTime;
        currentFriendChat.unreadCount = unreadCount + 1;
      }
      friendMessages.unshift(newFriendMessage);
      updateJsonMessages(`../messages/${friendId}/${friendChatId}.json`, (err, data) => {
        if (err) {
          writeJsonFile(`../messages/${friendId}/${friendChatId}.json`, [newFriendMessage]);
        }
        if (data) {
          const parsedMessages = JSON.parse(data);
          const newFriendMessages = [newFriendMessage, ...parsedMessages];
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
          const bulkUpdate = isGroup
            ? [
                {
                  updateOne: {
                    filter: { _id: friendId },
                    update: {
                      $pull: {
                        chats: {
                          chatId,
                        },
                      },
                    },
                  },
                },
                {
                  updateOne: {
                    filter: { _id: friendId },
                    update: {
                      $push: {
                        chats: {
                          $each: [
                            {
                              _id: friendChatId,
                              chatId,
                              friends: friendChatFriends,
                              isMute: isFriendChatMute,
                              isGroup: true,
                              groupAdmin: {
                                _id,
                              },
                              unreadCount: friendUnreadCount + 1,
                              groupName,
                              groupImage,
                            },
                          ],
                          $position: 0,
                        },
                      },
                    },
                    arrayFilter: [{ 'element._id': { $eq: { _id } } }],
                  },
                },
              ]
            : [
                {
                  updateOne: {
                    filter: { _id },
                    update: {
                      $pull: {
                        chats: {
                          chatId,
                        },
                      },
                    },
                  },
                },
                {
                  updateOne: {
                    filter: { _id },
                    update: {
                      $push: {
                        chats: {
                          $each: [
                            {
                              _id: mongoChatId,
                              chatId,
                              friends: {
                                _id: friendId,
                              },
                              isMute: isChatMute,
                              isGroup: false,
                              unreadCount: 0,
                            },
                          ],
                          $position: 0,
                        },
                      },
                    },
                    arrayFilter: [{ 'element._id': { $eq: { _id: friendId } } }],
                  },
                },
                {
                  updateOne: {
                    filter: { _id: friendId },
                    update: {
                      $pull: {
                        chats: {
                          chatId,
                        },
                      },
                    },
                  },
                },
                {
                  updateOne: {
                    filter: { _id: friendId },
                    update: {
                      $push: {
                        chats: {
                          $each: [
                            {
                              _id: friendChatId,
                              chatId,
                              friends: {
                                _id,
                              },
                              isMute: isFriendChatMute,
                              isGroup: false,
                              unreadCount: friendUnreadCount + 1,
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
          if (!isGroup) {
            let currentMessages = this.getUserChatMessages(_id, chatId, { fast: true });
            if (currentMessages instanceof Promise) {
              currentMessages = await this.getUserChatMessages(_id, chatId, { fast: true }).then(
                (chatMessages) => chatMessages
              );
            }
            currentMessages.unshift(newMessage);
            updateJsonMessages(`../messages/${_id}/${mongoChatId}.json`, (err, data) => {
              if (err) {
                writeJsonFile(`../messages/${_id}/${mongoChatId}.json`, [newMessage]);
                addFriendMessage(friendChatId);
                messagesPromises.push(User.bulkWrite(bulkUpdate));
              }
              if (data) {
                const parsedMessages = JSON.parse(data);
                const newMessages = [newMessage, ...parsedMessages];
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
          const bulkUpdate = [
            {
              updateOne: {
                filter: { _id },
                update: {
                  $pull: {
                    chats: {
                      chatId,
                    },
                  },
                },
              },
            },
            {
              updateOne: {
                filter: { _id },
                update: {
                  $push: {
                    chats: {
                      $each: [
                        {
                          _id: groupId,
                          chatId,
                          friends: groupFriends,
                          isMute: isChatMute,
                          isGroup: true,
                          groupAdmin: {
                            _id,
                          },
                          unreadCount: 0,
                          groupName,
                          groupImage,
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
          let currentMessages = this.getUserChatMessages(_id, chatId, { fast: true });
          if (currentMessages instanceof Promise) {
            currentMessages = await this.getUserChatMessages(_id, chatId, { fast: true }).then(
              (chatMessages) => chatMessages
            );
          }
          currentMessages.unshift(newMessage);
          updateJsonMessages(`../messages/${_id}/${groupId}.json`, (err, data) => {
            if (err) {
              writeJsonFile(`../messages/${_id}/${groupId}.json`, [newMessage]);
              messagesPromises.push(User.bulkWrite(bulkUpdate));
            }
            if (data) {
              const parsedMessages = JSON.parse(data);
              const newMessages = [newMessage, ...parsedMessages];
              writeJsonFile(`../messages/${_id}/${groupId}.json`, newMessages);
              messagesPromises.push(User.bulkWrite(bulkUpdate));
            }
          });
        })
    );
  }
  return Promise.all(webSocketsPromises).then(() =>
    Promise.all(usersPromises).then(() => Promise.all(messagesPromises))
  );
};

module.exports.getUserComposeList = (_id) => {
  const { exChatsList } = users.get(_id);
  const composeList = exChatsList.map((chat) => {
    const { chatId, chatImage, chatName, friends, isGroup, isMute } = chat;
    const { friendId, firstName, lastName, gender, image } = friends[0];
    return {
      _id: chatId,
      chatImage,
      chatName,
      friends: [
        {
          _id: friendId,
          firstName,
          lastName,
          gender,
          image,
        },
      ],
      isGroup,
      isMute,
    };
  });
  return composeList;
};

module.exports.setNewUserGroup = async (_id, groupName, groupFriends, image) => {
  const webSocketsPromises = [];
  const {
    firstName,
    lastName,
    birthday,
    gender,
    image: userImage,
    emptyGroup,
    chats: userChats,
    exChatsList,
  } = users.get(_id);
  const userAdminId = uuidv4();
  const newGroup = {
    chatId: emptyGroup.chatId,
    isMute: 0,
    isGroup: true,
    groupAdmin: userAdminId,
    chatName: groupName,
    chatImage: image,
    unreadCount: 0,
  };
  const friendsIds = [];
  const exGroupFriendsList = [];
  const groupFriendsList = groupFriends.map((friend) => {
    const newFriendId = uuidv4();
    const friendId = getFriendId(_id, friend._id, { listType: 'friends' });
    const {
      firstName: friendFirstName,
      lastName: friendLastName,
      birthday: friendBirthday,
      gender: friendGender,
      image: friendImage,
    } = users.get(friendId);
    friendsIds.push({ _id: friendId });
    exGroupFriendsList.push({
      _id: friendId,
      friendId: newFriendId,
      firstName: friendFirstName,
      lastName: friendLastName,
      birthday: friendBirthday,
      gender: friendGender,
      image: friendImage,
    });
    return {
      _id: newFriendId,
      firstName: friendFirstName,
      lastName: friendLastName,
      birthday: friendBirthday,
      gender: friendGender,
      image: friendImage,
    };
  });
  const chatsPromises = [];
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
                  _id: userAdminId,
                  firstName,
                  lastName,
                  birthday,
                  gender,
                  image: userImage,
                }
              : groupFriend
          );
          const friendExGroupFriendsList = exGroupFriendsList.map((exGroupFriend) =>
            exGroupFriend.friendId === friend._id
              ? {
                  _id,
                  friendId: userAdminId,
                  firstName,
                  lastName,
                  birthday,
                  gender,
                  image: userImage,
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
          friendUser.chats.unshift(newFriendGroup);
          friendUser.exChatsList.unshift({
            ...newFriendGroup,
            groupAdmin: { _id, userId: userAdminId },
            friends: friendExGroupFriendsList,
          });
          const targetClient = webSocketClients.get(friendsIds[index]._id);
          if (targetClient) {
            webSocketsPromises.push(
              targetClient.send(
                JSON.stringify({
                  message: 'New group',
                  data: {
                    group: {
                      _id: newFriendGroup.chatId,
                      chatName: newFriendGroup.chatName,
                      chatImage: newFriendGroup.chatImage,
                      groupAdmin: newFriendGroup.groupAdmin,
                      friends: newFriendGroup.friends,
                      isGroup: true,
                      isMute: 0,
                      unreadCount: 0,
                    },
                  },
                })
              )
            );
          }
        })
    );
  });
  chatsPromises.push(
    User.findOneAndUpdate(
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
        const newEmptyGroupId = uuidv4();
        userChats.unshift(newGroup);
        exChatsList.unshift({
          ...newGroup,
          groupAdmin: { _id, userId: userAdminId },
          friends: exGroupFriendsList,
        });
        emptyGroup.chatId = newEmptyGroupId;
      })
  );
  await Promise.all(webSocketsPromises).then(() =>
    Promise.all(chatsPromises).then(() => console.log('Done'))
  );
};

module.exports.getUserChats = (_id) => {
  const { chats, loadedChats, chatsCount } = users.get(_id);
  const chatsList = chats.map((chat) => {
    const {
      chatId,
      friends,
      isGroup,
      groupAdmin,
      chatName,
      chatImage,
      isMute,
      lastMessage,
      lastMessageTime,
      unreadCount,
    } = chat;
    return {
      _id: chatId,
      friends,
      isGroup,
      groupAdmin,
      chatName,
      image: chatImage,
      isMute,
      lastMessage,
      lastMessageTime,
      unreadCount,
    };
  });
  if (loadedChats > chatsCount) {
    return {
      loadedAll: true,
      chatsList,
    };
  }
  return chatsList;
};

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
    .select(['chats'])
    .populate(['chats.friends'])
    .then(async ({ chats: moreChats }) => {
      let chatLimit = loadedChats + 20;
      const exChatsList = [];
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
          const filePathExists = checkFilePathExists(`../messages/${_id}/${mongoChatId}.json`);
          if (filePathExists) {
            chatPromises.push(
              getMessagesStream(`../messages/${_id}/${mongoChatId}.json`).then((messages) => {
                userMessages.set(chatId, {
                  _id: mongoChatId,
                  friends: chatFriendsExList,
                  messages,
                  loadedCount: 49,
                });
                const lastChatMessage = messages[0];
                const { messageTime, messageDay, messageDate, dateNow } = lastChatMessage;
                const lastMessageTime = setItemTime(messageDate, dateNow, messageDay, messageTime);
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
              })
            );
          }
          if (!filePathExists) {
            chatLimit += 1;
            exChatsList.push({
              _id: chatId,
              friends: chatFriendslist,
              isGroup,
              chatName: `${chatFriends[0].firstName} ${chatFriends[0].lastName}`,
              chatImage: chatFriends[0].image,
              isMute,
            });
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
    });
};

module.exports.getMoreChatsMessages = (_id, chatId) => {
  const { messages } = users.get(_id);
  const userMessages = messages.get(chatId);
  const { loadedCount, _id: mongoChatId } = userMessages;
  userMessages.loadedCount = Number(loadedCount) + 50;
  return getMessagesStream(`../messages/${_id}/${mongoChatId}.json`, {
    toLoad: userMessages.loadedCount,
  }).then((moreMessages) => moreMessages);
};

module.exports.leaveUserChat = (_id, chatId) => {
  const { messages } = users.get(_id);
  const userMessages = messages.get(chatId);
  if (userMessages) {
    userMessages.loadedCount = 49;
  }
};

module.exports.setUserChatTyping = (_id, chatId, friends) => {
  const { firstName } = users.get(_id);
  const webSocketsPromises = [];
  friends.forEach((friend, index) => {
    const friendId = getFriendId(_id, friend._id, {
      listType: 'group',
      chatId,
      index,
    });
    const targetClient = webSocketClients.get(friendId.toString());
    if (targetClient) {
      webSocketsPromises.push(
        targetClient.send(
          JSON.stringify({
            message: 'User typing',
            data: {
              chatId,
              friendName: firstName,
            },
          })
        )
      );
    }
  });
  return Promise.all(webSocketsPromises);
};

module.exports.getGroupId = (_id, chatId) =>
  new Promise((resolve, reject) => {
    const { chats, emptyGroup } = users.get(_id);
    if (chatId === emptyGroup.chatId) {
      const groupId = emptyGroup._id.toString();
      resolve(groupId);
    }
    const groupChatsCheck = chats.find((chat) => chat.chatId === chatId);
    if (groupChatsCheck) {
      const groupId = groupChatsCheck._id.toString();
      resolve(groupId);
    }
    User.findOne({ _id }, { chats: { $eq: { chatId } } })
      .then((chat) => {
        const groupId = chat._id.toString();
        resolve(groupId);
      })
      .catch((error) => reject(error));
  });

module.exports.getUserNewChat = (_id, chatId) => {
  const { exChatsList } = users.get(_id);
  const newChat = exChatsList.find((chat) => chat.chatId === chatId);
  return newChat;
};

module.exports.getMoreUserGroupFriends = (_id, groupId) => {
  const { messages, friends } = users.get(_id);
  const { friends: groupFriends } = messages.get(groupId);
  const friendsList = friends.filter(
    (friend) => !groupFriends.some((groupFriend) => groupFriend._id === friend._id)
  );
  return friendsList;
};
