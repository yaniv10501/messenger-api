const fs = require('fs');
const path = require('path');
const JSONStream = require('JSONStream');
const setItemTime = require('./setItemTime');

const createJsonReadStream = (filePath) =>
  fs.createReadStream(path.join(__dirname, filePath), { encoding: 'utf8' });

module.exports.readJsonFileSync = (filePath) =>
  fs.readFileSync(path.join(__dirname, filePath), 'utf-8');

module.exports.updateJsonMessages = (filePath, callBack) =>
  fs.readFile(path.join(__dirname, filePath), 'utf-8', callBack);

module.exports.writeJsonFile = (filePath, info, options) => {
  const dirname = path.join(__dirname, path.dirname(filePath));

  if (!fs.existsSync(dirname)) {
    const parentDirectory = path.dirname(dirname);
    if (!fs.existsSync(parentDirectory)) {
      fs.mkdirSync(parentDirectory);
    }
    fs.mkdirSync(dirname);
  }

  if (options === 'sync') {
    return fs.writeFileSync(path.join(__dirname, filePath), JSON.stringify(info), 'utf-8');
  }
  return fs.writeFile(path.join(__dirname, filePath), JSON.stringify(info), 'utf-8', (err) => {
    if (err) throw err;
  });
};

module.exports.checkFilePathExists = (filePath) => fs.existsSync(path.join(__dirname, filePath));

module.exports.getMessagesStream = async (filePath, options) => {
  const streamPromise = new Promise((resolve, reject) => {
    const { toLoad = 49 } = options || {};
    const messages = [];
    const stream = createJsonReadStream(filePath);
    const parser = JSONStream.parse('*');
    stream.pipe(parser);
    const start = toLoad - 49;
    let i = 0;
    let messageBefore;
    parser.on('data', (obj) => {
      if (i >= start) {
        const { messageDate, messageDay, messageTime, dateNow } = obj;
        if (!messageBefore && i === 0) {
          const todayDate = new Date().toLocaleDateString('en-GB');
          if (messageDate !== todayDate) {
            messages.push({
              chatTime: setItemTime(messageDate, dateNow, messageDay, messageTime, {
                chatTime: true,
              }),
            });
          } else {
            messages.push({
              chatTime: 'Today',
            });
          }
        }
        if (messageBefore) {
          if (messageDate !== messageBefore.messageDate) {
            messages.push({
              chatTime: setItemTime(messageDate, dateNow, messageDay, messageTime, {
                chatTime: true,
              }),
            });
          }
        }
        messageBefore = obj;
      }
      messages.push(obj);
      i += 1;
      if (i > toLoad) {
        parser.end();
      }
      if (i < start) i += 1;
    });

    parser.on('end', () => {
      if (i <= toLoad) {
        resolve({
          messages,
          loadedAll: true,
        });
      } else {
        resolve({
          messages,
          loadedAll: false,
        });
      }
      stream.close();
    });
    parser.on('error', (error) => {
      const err = new Error(error);
      err.status = 500;
      reject(err);
    });
  });
  return streamPromise.then((userMessages) => userMessages).catch((err) => console.log(err));
};
