const fs = require('fs');
const path = require('path');

const initStartUp = () => {
  const directories = ['usersImages', 'groupsImages', 'messages', 'keys'];
  directories.forEach((directory) => {
    if (typeof directory === 'string') {
      const currentPath = path.join(__dirname, `../${directory}`);
      if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath);
      }
    } else if (directory.keys && Array.isArray(directory.keys)) {
      const parentDirectory = Object.keys(directory)[0].toString();
      const parentPath = path.join(__dirname, `../${parentDirectory}`);
      if (!fs.existsSync(parentPath)) {
        fs.mkdirSync(parentPath);
      }
      directory.keys.forEach((childDirectory) => {
        const childPath = path.join(__dirname, `../${parentDirectory}/${childDirectory}`);
        if (!fs.existsSync(childPath)) {
          fs.mkdirSync(childPath);
        }
      });
    }
  });
};

module.exports = initStartUp;
