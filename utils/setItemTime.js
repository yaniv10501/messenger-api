const { weekMs, dayMs } = require('../assets/time');

const setItemTime = (itemDate, itemDateNow, itemDay, itemTime) => {
  const date = new Date();
  const currentDate = date.toLocaleDateString('en-GB');
  try {
    if (itemDate !== currentDate) {
      const currentDateNow = date.getTime();
      const timeDif = currentDateNow - itemDateNow;
      if (timeDif > weekMs) {
        return itemDate;
      }
      if (timeDif > dayMs) {
        const currentWeekDay = date.toLocaleDateString('en-GB', { weekday: 'long' });
        if (currentWeekDay === itemDay) {
          return itemDate;
        }
        if (Math.round(timeDif / dayMs) === 1) {
          return 'Yesterday';
        }
        return itemDay;
      }
      return 'Yesterday';
    }
  } catch (error) {
    console.log(error);
  }
  return itemTime;
};

module.exports = setItemTime;
