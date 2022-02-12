const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const NotFoundError = require('../utils/errors/NotFoundError');
const NotAllowedError = require('../utils/errors/NotAllowedError');
const checkErrors = require('../utils/checkErrors');
const {
  setNewUser,
  setUserNewImage,
  getFriendId,
  getUser,
  getUserMoreFriendsList,
  getUserFriendsList,
  getUserGroupFriendsList,
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
} = require('../lib/chats');
const {
  addUserFriendRequest,
  setResponseFriendRequest,
  getUserFriendRequests,
  getUserPendingFriendRequests,
} = require('../lib/friendRequests');

module.exports.createUser = (req, res, next) => {
  try {
    const { firstName, lastName, gender, birthday, email, password } = req.body;
    bcrypt
      .hash(password, 10)
      .then((hash) =>
        User.create({
          firstName,
          lastName,
          gender,
          birthday,
          email,
          password: hash,
        })
          .then((newUser) => {
            const _id = newUser._id.toString();
            setNewUser(_id, {
              firstName,
              lastName,
              gender,
              birthday,
              email,
              image: '',
            });
            res.status(201).json({
              message: 'A new user has been created',
              user: {
                name: newUser.firstName,
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
    const imageTypes = ['png', 'jpeg'];
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
    res.json({ message: 'Profile image uploaded' });
    User.findOneAndUpdate(
      { _id },
      { image: 'Uploaded' },
      {
        new: true,
        runValidators: true,
      }
    )
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
    const imageTypes = ['png', 'jpeg'];
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
    const { listType, index: listIndex } = req.query;
    const friendId = getFriendId(_id, _fId, { listType, index: listIndex });
    console.log(friendId);
    const { friendId: fId } = friendId;
    const imageTypes = ['.png', '.jpeg'];
    imageTypes.some((imageType, index) => {
      const imagePath = path.join(
        __dirname,
        `../usersImages/${fId || friendId}/profile-pic${imageType}`
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
    const { firstName, lastName, email } = getUser(_id);
    res.json({ name: `${firstName} ${lastName}`, email });
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
    const moreFriendsList = getUserMoreFriendsList(_id);
    res.json(moreFriendsList);
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

module.exports.addFriend = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { friendId, index } = req.params;
    addUserFriendRequest(_id, friendId, index);
    res.json({ message: 'friend request sent' });
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

module.exports.getFriendRequests = (req, res, next) => {
  try {
    const { _id } = req.user;

    const friendRequestsList = getUserFriendRequests(_id);
    res.json(friendRequestsList);
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.getPendingFriendRequests = (req, res, next) => {
  try {
    const { _id } = req.user;
    const pendingFriendRequestsList = getUserPendingFriendRequests(_id);
    res.json(pendingFriendRequestsList);
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.getMoreGroupFriends = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { groupId } = req.params;
    const moreGroupFriends = getMoreUserGroupFriends(_id, groupId);
    console.log(moreGroupFriends);
    res.json(moreGroupFriends);
  } catch (error) {
    checkErrors(error, next);
  }
};
