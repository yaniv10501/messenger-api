const mongoose = require('mongoose');
const User = require('../models/user');

const { MONGO_DB_SERVER = 'mongodb://localhost:27017' } = process.env;

mongoose.connect(`${MONGO_DB_SERVER}/messenger`);

const usersArray = [];

for (let i = 0; i < 1000; i += 1) {
  usersArray.push({
    userName: `user${i}`,
    firstName: `User${i}`,
    lastName: `User${i}`,
    gender: 'male',
    birthday: '01/01/2020',
    password: '$2a$10$NYLGEXcuIceWjLEBkvedtOMItrZgaZT3W.fbTQjG3JQ6jaY3BhcsW',
    image: '',
    email: `user${i}@me.com`,
  });
}

User.deleteMany().then(() => User.create(usersArray).then(() => console.log('Done!')));
