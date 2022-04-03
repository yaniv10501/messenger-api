const NodeRSA = require('node-rsa');
const NotFoundError = require('./errors/NotFoundError');
const UnknownError = require('./errors/UnknownError');
const { writeJsonFile, readJsonFileSync } = require('./fs');

const getKey = (_id, chatId, callBack) => {
  let key = callBack(_id, chatId);
  if (key instanceof Error) {
    this.createKey(_id, chatId);
    key = callBack(_id, chatId);
  }
  return new NodeRSA(key);
};

module.exports.createKey = (_id, chatId) => {
  try {
    const key = new NodeRSA();
    key.generateKeyPair(2048, 65537);
    const publickey = key.exportKey('pkcs8-public-pem');
    const privatekey = key.exportKey('pkcs8-private-pem');
    writeJsonFile(`../keys/${_id}/${chatId}/public.json`, { key: publickey }, 'sync');
    writeJsonFile(`../keys/${_id}/${chatId}/private.json`, { key: privatekey }, 'sync');
  } catch (error) {
    throw new UnknownError(`An error has occurred ${error}`);
  }
};

module.exports.getPublicKey = (_id, chatId) => {
  try {
    const { key } = JSON.parse(readJsonFileSync(`../keys/${_id}/${chatId}/public.json`));
    return key;
  } catch (error) {
    return new NotFoundError(`Key doesn't exist`);
  }
};

module.exports.getPrivateKey = (_id, chatId) => {
  try {
    const { key } = JSON.parse(readJsonFileSync(`../keys/${_id}/${chatId}/private.json`));
    return key;
  } catch (error) {
    return new NotFoundError(`Key doesn't exist`);
  }
};

module.exports.encryptMessage = (_id, friendId, chatId, message) => {
  const { messageDate, dateNow, messageDay, messageTime } = message;
  const userKey = getKey(_id, chatId, this.getPublicKey);
  const friendKey = getKey(friendId, chatId, this.getPublicKey);
  const firstEncryptedMessage = friendKey.encrypt(message, 'base64');
  const encryptedMessage = userKey.encrypt(firstEncryptedMessage, 'base64');
  return { encryptedMessage, messageDate, dateNow, messageDay, messageTime };
};

module.exports.decryptMessage = (_id, friendId, chatId, message) => {
  const userKey = getKey(_id, chatId, this.getPrivateKey);
  const friendKey = getKey(friendId, chatId, this.getPrivateKey);
  const firstDecryptedMessage = userKey.decrypt(message.encryptedMessage, 'utf8');
  const decryptedMessage = JSON.parse(friendKey.decrypt(firstDecryptedMessage, 'utf8'));
  return decryptedMessage;
};
