const request = {
  req: {
    user: {
      _id: '1',
    },
  },
  res: {
    json: (response) => {
      console.log(response);
    },
  },
  next: () => {},
};

module.exports = request;
