const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/user');

const { MONGO_DB_SERVER = 'mongodb://localhost:27017' } = process.env;

mongoose.connect(`${MONGO_DB_SERVER}/messenger`);

User.create([
  {
    firstName: 'Daniel',
    lastName: 'Taub',
    gender: 'male',
    birthday: '01/01/2020',
    password: '$2a$10$NYLGEXcuIceWjLEBkvedtOMItrZgaZT3W.fbTQjG3JQ6jaY3BhcsW',
    image: '',
    email: 'daniel@me.com',
  },
  {
    firstName: 'Yaniv',
    lastName: 'Schweitzer',
    gender: 'male',
    birthday: '01/01/2020',
    password: '$2a$10$NYLGEXcuIceWjLEBkvedtOMItrZgaZT3W.fbTQjG3JQ6jaY3BhcsW',
    image: '',
    email: 'yaniv@me.com',
  },
  {
    firstName: 'Nehorai',
    lastName: 'Hillel',
    gender: 'male',
    birthday: '01/01/2020',
    password: '$2a$10$NYLGEXcuIceWjLEBkvedtOMItrZgaZT3W.fbTQjG3JQ6jaY3BhcsW',
    image: '',
    email: 'nehorai@me.com',
  },
])
  .then(async (result) => {
    // eslint-disable-next-line no-console
    console.log(`Users successfully created!`);
    const friendPromises = [];
    for (let userIndex = 0; userIndex < result.length; userIndex += 1) {
      for (let otherIndex = 0; otherIndex < result.length; otherIndex += 1) {
        const chatId = uuidv4();
        if (userIndex < otherIndex) {
          const { _id: user0Id } = result[userIndex];
          const otherUser = result[otherIndex];
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
          ]; // eslint-disable-next-line no-console
          console.log(`Adding friend to user - ${userIndex}, friend - ${otherIndex}`);
          // eslint-disable-next-line no-console
          friendPromises.push(User.bulkWrite(bulkUpdate).catch((error) => console.log(error)));
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
        }
      }
    } // eslint-disable-next-line no-console
    await Promise.all(friendPromises).then(() => console.log('Done!'));
  }) // eslint-disable-next-line no-console
  .catch((error) => console.log(error));
