module.exports = class ValidationError extends Error {
  constructor(message) {
    super(
      message.indexOf(':') === -1
        ? message
        : message
            .slice(message.indexOf(':') + 2)
            .replace(/Path\s`\w{1,}`\s/g, '')
            .replace(/.,/g, ',')
    );
    this.name = 'ValidationError';
    this.status = 400;
  }
};
