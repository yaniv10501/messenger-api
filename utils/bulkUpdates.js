const moveChatUp = (
  isGroup,
  _id,
  friendId,
  chatId,
  friendChatId,
  friendChatFriends,
  isFriendChatMute,
  friendUnreadCount,
  groupName,
  groupImage,
  mongoChatId,
  isChatMute
) =>
  isGroup
    ? [
        {
          updateOne: {
            filter: { _id: friendId },
            update: {
              $pull: {
                chats: {
                  chatId,
                },
              },
            },
          },
        },
        {
          updateOne: {
            filter: { _id: friendId },
            update: {
              $push: {
                chats: {
                  $each: [
                    {
                      _id: friendChatId,
                      chatId,
                      friends: friendChatFriends,
                      isMute: isFriendChatMute,
                      isGroup: true,
                      groupAdmin: {
                        _id,
                      },
                      unreadCount: friendUnreadCount + 1,
                      groupName,
                      groupImage,
                    },
                  ],
                  $position: 0,
                },
              },
            },
          },
        },
      ]
    : [
        {
          updateOne: {
            filter: { _id },
            update: {
              $pull: {
                chats: {
                  chatId,
                },
              },
            },
          },
        },
        {
          updateOne: {
            filter: { _id },
            update: {
              $push: {
                chats: {
                  $each: [
                    {
                      _id: mongoChatId,
                      chatId,
                      friends: {
                        _id: friendId,
                      },
                      isMute: isChatMute,
                      isGroup: false,
                      unreadCount: 0,
                    },
                  ],
                  $position: 0,
                },
              },
            },
          },
        },
        {
          updateOne: {
            filter: { _id: friendId },
            update: {
              $pull: {
                chats: {
                  chatId,
                },
              },
            },
          },
        },
        {
          updateOne: {
            filter: { _id: friendId },
            update: {
              $push: {
                chats: {
                  $each: [
                    {
                      _id: friendChatId,
                      chatId,
                      friends: {
                        _id,
                      },
                      isMute: isFriendChatMute,
                      isGroup: false,
                      unreadCount: friendUnreadCount + 1,
                    },
                  ],
                  $position: 0,
                },
              },
            },
          },
        },
      ];

const moveGroupUp = (_id, chatId, groupId, groupFriends, isChatMute, groupImage, groupName) => [
  {
    updateOne: {
      filter: { _id },
      update: {
        $pull: {
          chats: {
            chatId,
          },
        },
      },
    },
  },
  {
    updateOne: {
      filter: { _id },
      update: {
        $push: {
          chats: {
            $each: [
              {
                _id: groupId,
                chatId,
                friends: groupFriends,
                isMute: isChatMute,
                isGroup: true,
                groupAdmin: {
                  _id,
                },
                unreadCount: 0,
                groupName,
                groupImage,
              },
            ],
            $position: 0,
          },
        },
      },
      arrayFilter: [{ 'element._id': { $eq: { _id } } }],
    },
  },
];

const addFriend = (_id, friendRequestId, itemTime, itemDay, itemDate, dateNow) => [
  {
    updateOne: {
      filter: { _id },
      update: {
        $push: {
          friendRequests: {
            $each: [
              {
                friend: { _id: friendRequestId },
                requestTime: itemTime,
                requestDay: itemDay,
                requestDate: itemDate,
                dateNow,
              },
            ],
            $position: 0,
          },
        },
      },
    },
  },
  {
    updateOne: {
      filter: { _id: friendRequestId },
      update: {
        $push: {
          pendingFriendRequests: {
            $each: [
              {
                friend: { _id },
                requestTime: itemTime,
                requestDay: itemDay,
                requestDate: itemDate,
                dateNow,
              },
            ],
            $position: 0,
          },
        },
      },
      arrayFilter: [{ 'element._id': { $eq: { _id } } }],
    },
  },
];

const responseFriendRequest = (_id, friendId, chatId) => [
  {
    updateOne: {
      filter: { _id },
      update: {
        $addToSet: {
          friends: {
            _id: friendId,
          },
        },
      },
    },
  },
  {
    updateOne: {
      filter: { _id: friendId },
      update: {
        $addToSet: {
          friends: {
            _id,
          },
        },
      },
    },
  },
  {
    updateOne: {
      filter: { _id },
      update: {
        $addToSet: {
          chats: {
            chatId,
            friends: {
              _id: friendId,
            },
            isGroup: false,
          },
        },
      },
    },
  },
  {
    updateOne: {
      filter: { _id: friendId },
      update: {
        $addToSet: {
          chats: {
            chatId,
            friends: {
              _id,
            },
            isGroup: false,
          },
        },
      },
    },
  },
  {
    updateOne: {
      filter: { _id },
      update: {
        $pull: {
          pendingFriendRequests: {
            friend: {
              _id: friendId,
            },
          },
        },
      },
    },
  },
  {
    updateOne: {
      filter: { _id: friendId },
      update: {
        $pull: {
          friendRequests: {
            friend: {
              _id,
            },
          },
        },
      },
    },
  },
];

const setNewTokens = (userId, oldWsToken, refreshToken, newWsToken, newRefreshToken) => [
  {
    updateOne: {
      filter: {
        userId,
      },
      update: {
        $pull: {
          wsAuthTokens: {
            token: oldWsToken,
          },
        },
      },
    },
  },
  {
    updateOne: {
      filter: { userId },
      update: {
        $pull: {
          refreshTokens: {
            token: refreshToken,
          },
        },
      },
    },
  },
  {
    updateOne: {
      filter: {
        userId,
      },
      update: {
        $addToSet: {
          wsAuthTokens: {
            token: newWsToken,
            expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
          },
          usedWsTokens: oldWsToken,
          refreshTokens: {
            token: newRefreshToken,
            expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
          },
          usedTokens: refreshToken,
        },
      },
    },
  },
  {
    updateOne: {
      filter: {
        userId,
      },
      update: {
        $push: {
          usedTokens: {
            $each: [],
            $slice: -5,
          },
          usedWsTokens: {
            $each: [],
            $slice: -5,
          },
        },
      },
    },
  },
];

const updateRefreshToken = (userId, refreshToken, newRefreshToken) => [
  {
    updateOne: {
      filter: { userId },
      update: {
        $pull: { refreshTokens: { token: refreshToken } },
      },
    },
  },
  {
    updateOne: {
      filter: { userId },
      update: {
        $addToSet: {
          refreshTokens: {
            token: newRefreshToken,
            expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
          },
          usedTokens: refreshToken,
        },
      },
    },
  },
  {
    updateOne: {
      filter: { userId },
      update: {
        $push: {
          usedTokens: {
            $each: [],
            $slice: -5,
          },
        },
      },
    },
  },
];

module.exports = {
  moveChatUp,
  moveGroupUp,
  addFriend,
  responseFriendRequest,
  setNewTokens,
  updateRefreshToken,
};
