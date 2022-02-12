module.exports = class AlreadyUsedError extends Error {
  constructor(message) {
    super(message);
    this.status = 409;
    this.name = 'AlreadyUsedError';
  }
};
