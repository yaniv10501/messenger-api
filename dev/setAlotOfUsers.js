const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/user');
const { writeJsonFile, readJsonFileSync } = require('../utils/fs');
const getTime = require('../utils/getTime');

const { MONGO_DB_SERVER = 'mongodb://localhost:27017' } = process.env;

mongoose.connect(`${MONGO_DB_SERVER}/messenger`);

const usersArray = [];
const userMessages = [];
const friendMessages = [];

for (let i = 0; i < 10; i += 1) {
  usersArray.push({
    firstName: `User${i}`,
    lastName: `User${i}`,
    gender: 'male',
    birthday: '01/01/2020',
    password: '$2a$10$NYLGEXcuIceWjLEBkvedtOMItrZgaZT3W.fbTQjG3JQ6jaY3BhcsW',
    image: '',
    email: `user${i}@me.com`,
  });
  const tempUserMessages = [];
  const tempFriendMessages = [];
  for (let userI = 0; userI < 60; userI += 1) {
    const messageId = uuidv4();
    const { itemTime: messageTime, itemDay: messageDay, itemDate: messageDate } = getTime();
    const newMessage = {
      _id: messageId,
      messageTime,
      messageDay,
      messageDate,
      messageContent: `message${userI}`,
      unreed: false,
      messageByUser: true,
    };
    const newFriendMessage = {
      ...newMessage,
      unreed: true,
      messageByUser: false,
    };
    tempUserMessages.unshift(newMessage);
    tempFriendMessages.unshift(newFriendMessage);
  }
  userMessages.push(tempUserMessages);
  friendMessages.push(tempFriendMessages);
  console.log(`Finished writing messages for user - ${i}!`);
}

User.deleteMany()
  .then(async () => {
    await User.create(usersArray)
      .then(async (result) => {
        console.log(`Users successfully created!`);
        const friendPromises = [];
        await result.forEach((user, userIndex) => {
          const user0Id = user._id.toString();
          const emptyGroupId = uuidv4();
          friendPromises.push(
            User.findOneAndUpdate(
              { _id: user0Id },
              {
                $addToSet: {
                  chats: {
                    chatId: emptyGroupId,
                    isGroup: true,
                    isEmpty: true,
                  },
                },
              }
            )
          );
          result.forEach((otherUser, otherIndex) => {
            const chatId = uuidv4();
            if (userIndex < otherIndex) {
              const friendId = otherUser._id.toString();
              const bulkUpdate = [
                {
                  updateOne: {
                    filter: { _id: user0Id },
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
                          _id: user0Id,
                        },
                      },
                    },
                  },
                },
                {
                  updateOne: {
                    filter: { _id: user0Id },
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
                            _id: user0Id,
                          },
                          isGroup: false,
                        },
                      },
                    },
                  },
                },
              ];
              console.log(`Adding friend to user - ${userIndex}, friend - ${otherIndex}`);
              friendPromises.push(User.bulkWrite(bulkUpdate).catch((error) => console.log(error)));
            }
          });
        });
        await Promise.all(friendPromises).then(() => {
          User.find()
            .select(['chats'])
            .populate(['chats.friends'])
            .then(async (users) => {
              const messagesPromises = [];
              const bulkPromises = [];
              users.forEach(({ _id, chats }, index) => {
                chats.forEach(
                  ({ _id: mongoChatId, chatId, friends, unreadCount, isEmpty }, chatIndex) => {
                    if (!isEmpty) {
                      const mChatId = mongoChatId.toString();
                      const userId = _id.toString();
                      const friendId = friends[0]._id.toString();
                      messagesPromises.push(
                        User.findOne({ _id: friendId })
                          .select(['chats'])
                          .then(async ({ chats: friendChats }) => {
                            const currentFriendChat = friendChats.find(
                              ({ chatId: friendChatId }) => friendChatId === chatId
                            );
                            const friendChatId = currentFriendChat._id.toString();
                            const friendUnreadCount = currentFriendChat.unreadCount + 500;
                            const bulkUpdate = [
                              {
                                updateOne: {
                                  filter: { _id: userId },
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
                                  filter: { _id: userId },
                                  update: {
                                    $push: {
                                      chats: {
                                        $each: [
                                          {
                                            _id: mChatId,
                                            chatId,
                                            friends: {
                                              _id: friendId,
                                            },
                                            isGroup: false,
                                            unreadCount,
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
                                              _id: userId,
                                            },
                                            isGroup: false,
                                            unreadCount: friendUnreadCount,
                                          },
                                        ],
                                        $position: 0,
                                      },
                                    },
                                  },
                                },
                              },
                            ];
                            const addFriendMessage = () => {
                              try {
                                const friendData = readJsonFileSync(
                                  `../messages/${friendId}/${friendChatId}.json`
                                );
                                const currentFriendMessages = JSON.parse(friendData);
                                const newFriendMessages = [
                                  ...friendMessages[index],
                                  ...currentFriendMessages[index],
                                ];
                                writeJsonFile(
                                  `../messages/${friendId}/${friendChatId}.json`,
                                  newFriendMessages[index],
                                  'sync'
                                );
                                console.log(
                                  `Writing messages to friend of user - ${index}, chat- ${chatIndex}`
                                );
                              } catch (error) {
                                writeJsonFile(
                                  `../messages/${friendId}/${friendChatId}.json`,
                                  friendMessages[index],
                                  'sync'
                                );
                                console.log(
                                  `Writing new messages to friend of user - ${index}, chat- ${chatIndex}`
                                );
                              }
                            };
                            try {
                              const data = readJsonFileSync(
                                `../messages/${userId}/${mChatId}.json`
                              );
                              const currentMessages = JSON.parse(data);
                              const newUserMessage = [...userMessages[index], ...currentMessages];
                              writeJsonFile(
                                `../messages/${userId}/${mChatId}.json`,
                                newUserMessage,
                                'sync'
                              );
                              console.log(
                                `Writing messages to user - ${index}, chat- ${chatIndex}`
                              );
                              addFriendMessage();
                              bulkPromises.push(
                                User.bulkWrite(bulkUpdate).then(() =>
                                  console.log(
                                    `Pushed friend to top of list user - ${index} chat - ${chatIndex}`
                                  )
                                )
                              );
                            } catch (err) {
                              writeJsonFile(
                                `../messages/${userId}/${mChatId}.json`,
                                userMessages[index],
                                'sync'
                              );
                              console.log(
                                `Writing new messages to user - ${index}, chat- ${chatIndex}`
                              );
                              addFriendMessage();
                              bulkPromises.push(
                                User.bulkWrite(bulkUpdate).then(() =>
                                  console.log(
                                    `Pushed friend to top of list user - ${index} chat - ${chatIndex}`
                                  )
                                )
                              );
                            }
                          })
                          .catch((error) => console.log(error))
                      );
                    }
                  }
                );
              });
              await Promise.all(messagesPromises).then(async () => {
                await Promise.all(bulkPromises).then(() => console.log('Done!'));
              });
            })
            .catch((error) => console.log(error));
        });
      })
      .catch((error) => console.log(error));
  })
  .catch((error) => console.log(error));
