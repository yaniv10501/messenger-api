const { v4: uuidv4 } = require('uuid');
const getTime = require('../utils/getTime');
const checkErrors = require('../utils/checkErrors');
const {
  sendNewMessage,
  getUserChatMessages,
  getMoreChatsMessages,
  leaveUserChat,
} = require('../lib/chats');

module.exports.sendMessage = async (req, res, next) => {
  try {
    const { _id } = req.user;
    const { chatId } = req.params;
    const { messageId } = uuidv4();
    const { message, isMute: isChatdMute, friends, isGroup } = req.body;
    const { itemTime: messageTime, itemDay: messageDay, itemDate: messageDate } = getTime();
    const newMessage = {
      _id: messageId,
      messageTime,
      messageDay,
      messageDate,
      messageContent: message,
      unreed: false,
      messageByUser: true,
    };
    await sendNewMessage(_id, chatId, newMessage, isChatdMute, friends, isGroup);
    return res.status(201).json({ message: 'Message sent successfully!', data: newMessage });
  } catch (error) {
    return checkErrors(error, next);
  }
};

module.exports.getMessages = async (req, res, next) => {
  try {
    const { _id } = req.user;
    const { chatId } = req.params;
    try {
      const messages = getUserChatMessages(_id, chatId);
      const { loadedAll } = messages;
      if (loadedAll) {
        res.json({
          _id: chatId,
          ...messages,
        });
      }
      if (!loadedAll) {
        res.json({
          _id: chatId,
          messages,
        });
      }
    } catch (error) {
      res.json({
        _id: chatId,
        messages: [],
        loadedAll: true,
      });
    }
  } catch (error) {
    checkErrors(error, next);
  }
};

module.exports.getMoreMessages = (req, res, next) => {
  const { _id } = req.user;
  const { chatId } = req.params;
  getMoreChatsMessages(_id, chatId)
    .then((moreMessages) => {
      res.json(moreMessages);
    })
    .catch((error) => checkErrors(error, next));
};

module.exports.leaveChat = (req, res, next) => {
  try {
    const { _id } = req.user;
    const { chatId } = req.params;
    leaveUserChat(_id, chatId);
    res.json({ message: `Chat - ${chatId} loaded messages are reset` });
  } catch (error) {
    checkErrors(error, next);
  }
};
