module.exports = class CastError extends Error {
  constructor(message) {
    super(
      String(message)
        .slice(String(message).indexOf(':') + 2)
        .replace('Argument', 'Id')
    );
    this.name = 'CastError';
    this.status = 400;
  }
};
