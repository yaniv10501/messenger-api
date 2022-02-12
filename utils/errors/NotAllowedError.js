module.exports = class NotAllowedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotAllowedError';
    this.status = 403;
  }
};
