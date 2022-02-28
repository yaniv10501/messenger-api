const User = {
  users: [],
  create: (user) => {
    const newUser = { _id: '621d2554ac84334d7be5d2d3', ...user };
    User.users.push(newUser);
    return newUser;
  },
  findOne: (filter) =>
    User.users.find((user) => user[Object.keys(filter)[0]] === Object.values(filter)[0]),
  findOneAndUpdate: (filter, update) => {
    let userIndex;
    const currentUser = User.users.find((user, index) => {
      userIndex = index;
      return user[Object.keys(filter)[0]] === Object.values(filter)[0];
    });
    const newUser = update(currentUser);
    User.users[userIndex] = newUser;
  },
  deleteOne: (filter) =>
    User.users.filter((user) => user[Object.keys(filter)[0]] !== Object.values(filter)[0]),
};

module.exports = User;
