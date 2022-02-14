module.exports = class UnknownError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnknownError';
    this.status = 400;
  }
};
