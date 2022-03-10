const { weekMs, dayMs } = require('../assets/time');

const setItemTime = (itemDate, itemDateNow, itemDay, itemTime) => {
  const date = new Date();
  const currentDate = date.toLocaleDateString('en-GB');
  if (itemDate !== currentDate) {
    const currentDateNow = date.getTime();
    if (currentDateNow - itemDateNow > weekMs) {
      return itemDate;
    }
    console.log(currentDateNow, itemDateNow);
    if (currentDateNow - itemDateNow > dayMs) {
      const currentWeekDay = date.toLocaleDateString('en-GB', { weekday: 'long' });
      console.log(currentWeekDay, itemDay);
      if (currentWeekDay === itemDay) {
        return itemDate;
      }
      return itemDay;
    }
    return 'Yesterday';
  }
  return itemTime;
};

module.exports = setItemTime;
