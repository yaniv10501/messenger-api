const NodeRSA = require('node-rsa');
const NotFoundError = require('./errors/NotFoundError');
const UnknownError = require('./errors/UnknownError');
const { writeJsonFile, readJsonFileSync } = require('./fs');

module.exports.createKey = async (_id, chatId) => {
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

module.exports.encryptMessage = (_id, chatId, message) => {
  let key = this.getPublicKey(_id, chatId);
  if (key instanceof Error) {
    this.createKey(_id, chatId);
    key = this.getPublicKey(_id, chatId);
  }
  const rsaKey = new NodeRSA(key);
  const encryptedMessage = rsaKey.encrypt(message, 'base64');
  return encryptedMessage;
};

module.exports.decryptMessage = (_id, chatId, message) => {
  const key = this.getPrivateKey(_id, chatId);
  if (key instanceof Error) {
    return new NotFoundError(`Key doesn't exist`);
  }
  const rsaKey = new NodeRSA(key);
  const decryptedMessage = rsaKey.decrypt(message, 'utf8');
  return decryptedMessage;
};
