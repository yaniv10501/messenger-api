const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/user');
const { writeJsonFile, readJsonFileSync } = require('../utils/fs');
const getTime = require('../utils/getTime');

const { MONGO_DB_SERVER = 'mongodb://localhost:27017' } = process.env;

mongoose.connect(`${MONGO_DB_SERVER}/messenger`);

const usersIds = [];
const usersArray = [];
const userMessages = [];
const friendMessages = [];
const messagesTime = [];

for (let i = 24; i < 10000; i += 1) {
  messagesTime.push(getTime({ customTime: i }));
}
for (let i = 0; i < 100; i += 1) {
  const userText = `User${i}`;
  usersArray.push({
    userName: userText,
    firstName: userText,
    lastName: userText,
    gender: 'male',
    birthday: '01/01/2020',
    password: '$2a$10$NYLGEXcuIceWjLEBkvedtOMItrZgaZT3W.fbTQjG3JQ6jaY3BhcsW',
    image: '',
    email: `user${i}@me.com`,
  });
  const tempUserMessages = [];
  const tempFriendMessages = [];
  for (let userI = 0; userI < 500; userI += 1) {
    const messageId = uuidv4();
    const {
      itemTime: messageTime,
      itemDay: messageDay,
      itemDate: messageDate,
      dateNow,
    } = messagesTime[499 - userI];
    const newMessage = {
      _id: messageId,
      messageTime,
      messageDay,
      messageDate,
      dateNow,
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
  // eslint-disable-next-line no-console
  console.log(`Finished writing messages for user - ${i}!`);
}

User.deleteMany()
  .then(async () => {
    await User.create(usersArray)
      .then(async (result) => {
        // eslint-disable-next-line no-console
        console.log(`Users successfully created!`);
        const friendPromises = [];
        await result.forEach((user, userIndex) => {
          const user0Id = user._id.toString();
          usersIds.push(user0Id);
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
            if (userIndex < otherIndex && userIndex + 5 > otherIndex) {
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
              // eslint-disable-next-line no-console
              console.log(`Adding friend to user - ${userIndex}, friend - ${otherIndex}`);
              // eslint-disable-next-line no-console
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
                if (index < 20) {
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
                                  // eslint-disable-next-line no-console
                                  console.log(
                                    `Writing messages to friend of user - ${index}, chat- ${chatIndex}`
                                  );
                                } catch (error) {
                                  writeJsonFile(
                                    `../messages/${friendId}/${friendChatId}.json`,
                                    friendMessages[index],
                                    'sync'
                                  );
                                  // eslint-disable-next-line no-console
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
                                // eslint-disable-next-line no-console
                                console.log(
                                  `Writing messages to user - ${index}, chat- ${chatIndex}`
                                );
                                addFriendMessage();
                                bulkPromises.push(
                                  User.bulkWrite(bulkUpdate).then(() =>
                                    // eslint-disable-next-line no-console
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
                                // eslint-disable-next-line no-console
                                console.log(
                                  `Writing new messages to user - ${index}, chat- ${chatIndex}`
                                );
                                addFriendMessage();
                                bulkPromises.push(
                                  User.bulkWrite(bulkUpdate).then(() =>
                                    // eslint-disable-next-line no-console
                                    console.log(
                                      `Pushed friend to top of list user - ${index} chat - ${chatIndex}`
                                    )
                                  )
                                );
                              }
                            }) // eslint-disable-next-line no-console
                            .catch((error) => console.log(error))
                        );
                      }
                    }
                  );
                }
              });
              await Promise.all(messagesPromises).then(async () => {
                await Promise.all(bulkPromises).then(() => {
                  writeJsonFile('../utils/usersIds.json', usersIds, 'sync');
                  // eslint-disable-next-line no-console
                  console.log('Done!');
                });
              });
            }) // eslint-disable-next-line no-console
            .catch((error) => console.log(error));
        });
      }) // eslint-disable-next-line no-console
      .catch((error) => console.log(error));
  }) // eslint-disable-next-line no-console
  .catch((error) => console.log(error));
