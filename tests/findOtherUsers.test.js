const { req, res } = require('./fakeRequest');
const users = require('./fakeUsers');

for (let i = 0; i < 1000; i += 1) {
  users.set(i, {
    userName: `user${i}`,
    firstName: `user${i}`,
    lastName: `user${i}`,
  });
}

describe('Find other users test', () => {
  it('Find users by query', () => {
    const { _id } = req.user;
    const userQuery = 'user2';
    const otherUsersList = users.findList(_id, userQuery);
    res.json(otherUsersList);
  });
});
