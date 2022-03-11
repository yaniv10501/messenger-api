const { hourMs } = require('../assets/time');
const { replace24Pattern, removeSecondsPattern } = require('./regex');

const getTime = (options) => {
  const { customTime = false } = options || {};
  const date = customTime ? new Date(Date.now() - hourMs * customTime) : new Date();
  const time = date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Jerusalem',
    hour12: false,
  });
  const itemTime = time.replace(replace24Pattern, '00').replace(removeSecondsPattern, '');
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
