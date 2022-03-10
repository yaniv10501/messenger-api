const { hourMs } = require('../assets/time');

const getTime = (options) => {
  const { customTime = false } = options || {};

  const removeSecondsPattern = /:[0-9]{2}$/;
  const date = customTime ? new Date(Date.now() - hourMs * 3 * customTime) : new Date();
  const time = date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Jerusalem',
    hour12: false,
  });
  const itemTime = time.replace(removeSecondsPattern, '');
  const itemDay = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const itemDate = date.toLocaleDateString('en-GB');
  const dateNow = date.getTime();
  return {
    itemTime,
    itemDay,
    itemDate,
    dateNow,
  };
};

module.exports = getTime;
