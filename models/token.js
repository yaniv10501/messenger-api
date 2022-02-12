const mongoose = require('mongoose');

const tokenSchema = mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  refreshTokens: [
    {
      token: {
        type: String,
        required: true,
      },
      expires: {
        type: Number,
        required: true,
      },
      default: [],
    },
  ],
  usedTokens: [
    {
      type: String,
      default: [],
    },
  ],
  wsAuthTokens: [
    {
      token: {
        type: String,
        required: true,
      },
      expires: {
        type: Number,
        required: true,
      },
      default: [],
    },
  ],
  usedWsTokens: [
    {
      type: String,
      default: [],
    },
  ],
});

module.exports = mongoose.model('token', tokenSchema);
