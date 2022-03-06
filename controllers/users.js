const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/user');
const NotFoundError = require('../utils/errors/NotFoundError');
const NotAllowedError = require('../utils/errors/NotAllowedError');
const checkErrors = require('../utils/checkErrors');
const {
  setNewUser,
  setUserNewImage,
  getFriendId,
  getUserMoreFriendsList,
  getUserFriendsList,
  getUserGroupFriendsList,
  setUserDontDisturbProfile,
} = require('../lib/users');
const {
  getUserChats,
  getMoreUserChats,
  setUserChatTyping,
  setNewUserGroup,
  getGroupId,
  getUserComposeList,
  getUserNewChat,
  getMoreUserGroupFriends,
  resetUserChatUnread,
} = require('../lib/chats');
const {
  addUserFriendRequest,
  setResponseFriendRequest,
  getUserFriendRequests,
  getUserPendingFriendRequests,
} = require('../lib/friendRequests');
const users = require('../states/users');
const { checkFilePathExists } = require('../utils/fs');
const { NEW_MESSAGE } = require('../assets/notificationsTypes');

module.exports.createUser = (req, res, next) => {
  try {
    const { userName, firstName, lastName, gender, birthday, email, password } = req.body;
    const emptyGroupId = uuidv4();
    bcrypt
      .hash(password, 10)
      .then((hash) =>
        User.create({
          userName,
          firstName,
          lastName,
          gender,
          birthday,
          email,
          password: hash,
          chats: [
            {
              chatId: emptyGroupId,
              isGroup: true,
              isEmpty: true,
            },
          ],
        })
          .then((newUser) => {
            const _id = newUser._id.toString();
            const newEmptyGroup = newUser.chats[0];
            setNewUser(_id, {
              userName,
              firstName,
              lastName,
              gender,
              birthday,
              email,
              image: '',
              emptyGroup: newEmptyGroup,
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
            });
            res.status(201).json({
              message: 'A new user has been created',
              user: {
                name: newUser.firstName,
                userName: newUser.userName,
                email: newUser.email,
              },
            });
          })
          .catch((error) => {
            throw error;
          })
      )
      .catch((error) => {
        throw error;
      });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.setUserImage = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { profilePic } = req.files;
    const profilePicDirName = path.join(__dirname, `../usersImages/${_id}/`);
    if (!fs.existsSync(profilePicDirName)) {
      fs.mkdirSync(profilePicDirName);
    }
    const imageTypes = ['png', 'jpeg', 'jpg'];
    const isValidType = imageTypes.some((imageType) => profilePic.mimetype.includes(imageType));
    if (!isValidType) {
      throw new NotAllowedError('Image type is not allowed');
    }
    imageTypes.forEach((imageType) => {
      const imagePath = path.join(__dirname, `../usersImages/${_id}/profile-pic.${imageType}`);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    });
    profilePic.mv(`${profilePicDirName}profile-pic.${profilePic.mimetype.replace('image/', '')}`);
    setUserNewImage(_id);
    res.json({ image: 'Uploaded' });
    User.findOneAndUpdate(
      { _id },
      { image: 'Uploaded' },
      {
        new: true,
        runValidators: true,
      }
    )
      // eslint-disable-next-line no-console
      .then(() => console.log('Profile image status updated in mongo'))
      .catch((error) => {
        throw error;
      });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.getUserImage = (req, res, next) => {
  try {
    const { _id } = req.user;
    const imageTypes = ['png', 'jpeg', 'jpg'];
    imageTypes.some((imageType, index) => {
      const imagePath = path.join(__dirname, `../usersImages/${_id}/profile-pic.${imageType}`);
      if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
        return true;
      }
      if (index + 1 === imageTypes.length) {
        res.status(404).json({ message: 'No user image' });
        return true;
      }
      return false;
    });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.getFriendImage = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { friendId: _fId } = req.params;
    const { listType, index: listIndex, chatId } = req.query;
    const friendId = getFriendId(_id, _fId, { listType, index: listIndex, chatId });
    const { friendId: fId } = friendId || { friendId };
    const imageTypes = ['png', 'jpeg', 'jpg'];
    imageTypes.some((imageType, index) => {
      const imagePath = path.join(
        __dirname,
        `../usersImages/${fId || friendId}/profile-pic.${imageType}`
      );
      if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
        return true;
      }
      if (index + 1 === imageTypes.length) {
        res.status(404).json({ message: 'No friend image' });
        return true;
      }
      return false;
    });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.getUserMe = (req, res, next) => {
  try {
    const { _id } = req.user;
    const currentUser = users.get(_id);
    const { firstName, lastName, email, image, messages, dontDisturb, notifications } = currentUser;
    User.findOne({ _id })
      .select(['chats'])
      .then(({ chats }) => {
        let chatLimit = 20;
        for (let i = 0; i < chats.length; i += 1) {
          const currentChat = chats[i];
          const chatId = currentChat._id.toString();
          const filePathExists = checkFilePathExists(`../messages/${_id}/${chatId}.json`);
          if (!filePathExists) {
            chatLimit += 1;
          }
          if (i > chatLimit) {
            messages.delete(currentChat.chatId);
          }
        }
        currentUser.loadedChats = chatLimit;
      });
    const notifList = notifications.map((notif) => {
      console.log(notif);
      const {
        firstName: friendFirstName,
        lastName: friendLastName,
        image: friendImage,
      } = users.get(notif.otherUser.toString());
      if (notif.notifType === NEW_MESSAGE) {
        return {
          _id: notif.notifId,
          type: NEW_MESSAGE,
          chatId: notif.actionId,
          user: {
            firstName: friendFirstName,
            lastName: friendLastName,
            image: friendImage,
          },
          message: notif.message,
          isSeen: notif.isSeen,
        };
      }
      return null;
    });
    res.json({
      user: {
        name: `${firstName} ${lastName}`,
        email,
        image,
        dontDisturb,
      },
      notifications: notifList,
    });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.getNewChat = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { chatId } = req.params;
    const newChat = getUserNewChat(_id, chatId);
    res.json(newChat);
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.setGroupImage = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { chatId } = req.params;
    const { groupPic } = req.files || {};
    if (!groupPic) {
      throw new NotFoundError('Image file not found');
    }
    getGroupId(_id, chatId)
      .then((groupId) => {
        const profilePicDirName = path.join(__dirname, `../groupsImages/${groupId}/`);
        if (!fs.existsSync(profilePicDirName)) {
          fs.mkdirSync(profilePicDirName);
        }
        const imageTypes = ['png', 'jpeg'];
        const isValidType = imageTypes.some((imageType) => groupPic.mimetype.includes(imageType));
        if (!isValidType) {
          throw new NotAllowedError('Image type is not allowed');
        }
        imageTypes.forEach((imageType) => {
          const imagePath = path.join(
            __dirname,
            `../groupsImages/${groupId}/group-pic.${imageType}`
          );
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        });
        groupPic.mv(`${profilePicDirName}group-pic.${groupPic.mimetype.replace('image/', '')}`);
        res.json({ message: 'Group image uploaded' });
      })
      .catch((error) => {
        throw error;
      });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.initNewGroup = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { groupName, groupFriends, image } = req.body;
    setNewUserGroup(_id, groupName, groupFriends, image);
    res.json({ message: 'Hey' });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.getChats = (req, res, next) => {
  try {
    const { _id } = req.user;
    const chats = getUserChats(_id);
    res.json(chats);
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.getMoreChats = (req, res, next) => {
  try {
    const { _id } = req.user;
    getMoreUserChats(_id)
      .then((moreChats) => {
        res.json(moreChats);
      })
      .catch((error) => {
        throw error;
      });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.getMoreFriends = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { start = 0 } = req.query;
    const moreFriendsList = getUserMoreFriendsList(_id, { start });
    res.json(moreFriendsList);
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.getFriendRequests = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { start = 0 } = req.query;
    const friendRequestsList = getUserFriendRequests(_id, { start });
    res.json(friendRequestsList);
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.getPendingFriendRequests = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { start = 0 } = req.query;
    const pendingFriendRequestsList = getUserPendingFriendRequests(_id, { start });
    res.json(pendingFriendRequestsList);
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.getComposeList = (req, res, next) => {
  try {
    const { _id } = req.user;
    const composeList = getUserComposeList(_id);
    res.json(composeList);
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.addFriend = async (req, res, next) => {
  try {
    const { _id } = req.user;
    const { friendId, index } = req.params;
    const newFriendRequest = await addUserFriendRequest(_id, friendId, index);
    res.json(newFriendRequest);
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.acceptFriendRequest = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { requestId } = req.params;
    const { index } = req.query;
    setResponseFriendRequest(_id, requestId, index);
    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.setChatMute = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { chatId } = req.params;
    User.findOneAndUpdate(
      {
        _id,
      },
      {
        $bit: {
          'chats.$[element].isMute': {
            xor: 1,
          },
        },
      },
      {
        arrayFilters: [{ 'element._id': { $eq: { _id: chatId } } }],
        new: true,
        runValidators: true,
      }
    )
      .orFail(() => {
        throw new NotFoundError('User ID not found');
      })
      .select(['chats'])
      .then(({ chats }) => {
        const newChat = chats.find((chat) => chat.toString() === chatId);
        res.json(newChat);
      })
      .catch((error) => {
        throw error;
      });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.setUserTyping = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { chatId } = req.params;
    const { friends } = req.body;
    setUserChatTyping(_id, chatId, friends)
      .then(() => {
        res.json({ message: 'Action sent' });
      })
      .catch((error) => {
        throw error;
      });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.getFriendList = (req, res, next) => {
  try {
    const { _id } = req.user;
    const friendsList = getUserFriendsList(_id);
    res.json(friendsList);
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.getGroupFriendsList = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { groupId, friendsList } = getUserGroupFriendsList(_id);
    res.json({ groupId, friendsList });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.getMoreGroupFriends = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { groupId } = req.params;
    const moreGroupFriends = getMoreUserGroupFriends(_id, groupId);
    res.json(moreGroupFriends);
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.setDontDisturbProfile = (req, res, next) => {
  try {
    const { _id } = req.user;
    setUserDontDisturbProfile(_id);
    res.json({ message: 'Wont disturb about profile no more' });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.resetChatUnread = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { chatId } = req.params;
    resetUserChatUnread(_id, chatId);
    res.json({ message: `Chat - ${chatId} unread count is now 0` });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.checkUserTaken = (req, res, next) => {
  try {
    const { userName } = req.body;
    console.log(userName, req.body);
    const isTaken = users.check('userName', userName);
    res.json({ isTaken });
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.findOtherUsers = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { userQuery } = req.query;
    const moreFriendsList = [];
    const moreFriendsState = [];
    const otherUsersList = users.findList(_id, userQuery);
    for (let i = 0; i < 20; i += 1) {
      const currentOtherUser = otherUsersList[i];
      if (!currentOtherUser) {
        i = 20;
      }
      if (currentOtherUser) {
        const { firstName, lastName, gender, birthday, image } = currentOtherUser;
        const newOtherUserId = uuidv4();
        moreFriendsList.push({
          _id: newOtherUserId,
          firstName,
          lastName,
          gender,
          birthday,
          image,
        });
        moreFriendsState.push({
          _id: currentOtherUser._id,
          otherUserId: newOtherUserId,
          firstName,
          lastName,
          gender,
          birthday,
          image,
        });
      }
    }
    res.json(moreFriendsList);
  } catch (error) {
    checkErrors(error, next);
  }
};
