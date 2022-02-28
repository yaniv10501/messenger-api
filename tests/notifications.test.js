const User = require('./fakeMongo');
const { setNewUserNotif, setUserNotifSeen, deleteUserNotif } = require('./notifications');
const users = require('./fakeUsers');

describe('Add notification test', () => {
  it('Create a notification in state and mongo', () => {
    /** Set new user */
    const newUser = {
      userName: 'testuser',
      firstName: 'test',
      lastName: 'test',
      gender: 'male',
      birthday: '01/01/2020',
      password: '$2a$10$NYLGEXcuIceWjLEBkvedtOMItrZgaZT3W.fbTQjG3JQ6jaY3BhcsW',
      image: '',
      email: `test@me.com`,
      chats: [],
      messages: new Map(),
      loadedChats: 0,
      chatsCount: 0,
      friends: [],
      moreFirends: [],
      friendRequests: [],
      pendingFriendRequests: [],
      dontDisturb: [],
      notifications: [],
      queue: [],
    };
    const user = User.create(newUser);
    const otherUserId = '621bd273d8ecfdb64a587c83';
    const { _id } = user;
    users.set(_id, newUser);
    /** Set new message notif */
    setNewUserNotif(_id, {
      notifType: 'New message',
      otherUser: otherUserId,
      actionId: '621bd273d8ecfdb64a587c84',
      utilId: '621bd273d8ecfdb64a587c85',
    });
    let currentUser = users.get(_id);
    let { notifications: userNotifications } = currentUser;
    /** Check notif */
    expect(userNotifications[0].otherUser).toBe(otherUserId);
    let mongoUser = User.findOne({ _id });
    /** Check notif in fake mongo */
    expect(mongoUser.notifications[0].otherUser).toBe(otherUserId);
    setNewUserNotif(_id, {
      notifType: 'Friend request',
      otherUser: otherUserId,
      actionId: '621bd273d8ecfdb64a587c84',
      utilId: '621bd273d8ecfdb64a587c85',
    });
    currentUser = users.get(_id);
    userNotifications = currentUser.notifications;
    expect(userNotifications[0].notifType).toBe('Friend request');
    expect(userNotifications[1].notifType).toBe('New message');
    mongoUser = User.findOne({ _id });
    expect(mongoUser.notifications[0].notifType).toBe('Friend request');
    expect(mongoUser.notifications[1].notifType).toBe('New message');
    setUserNotifSeen(_id, userNotifications[0]._id);
    currentUser = users.get(_id);
    userNotifications = currentUser.notifications;
    expect(userNotifications[0].isSeen).toBe(true);
    expect(userNotifications[1].isSeen).toBe(false);
    mongoUser = User.findOne({ _id });
    expect(mongoUser.notifications[0].isSeen).toBe(true);
    expect(mongoUser.notifications[1].isSeen).toBe(false);
    deleteUserNotif(_id, userNotifications[0]._id);
    currentUser = users.get(_id);
    userNotifications = currentUser.notifications;
    expect(userNotifications[0].isSeen).toBe(false);
    expect(userNotifications[0].notifType).toBe('New message');
    expect(userNotifications[1]).toBe(null || undefined);
    mongoUser = User.findOne({ _id });
    expect(mongoUser.notifications[0].isSeen).toBe(false);
    expect(mongoUser.notifications[0].notifType).toBe('New message');
    expect(mongoUser.notifications[1]).toBe(null || undefined);
    User.deleteOne({ _id });
  });
});
