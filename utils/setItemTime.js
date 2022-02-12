const setItemTime = (itemDate, itemDateNow, itemDay, itemTime) => {
  const date = new Date();
  const currentDate = date.toLocaleDateString('en-GB');
  if (itemDate !== currentDate) {
    const currentDateNow = date.getTime();
    const dayMs = 1000 * 60 * 60 * 24;
    const weekMs = dayMs * 7;
    if (currentDateNow - itemDateNow > weekMs) {
      return itemDate;
    }
    if (currentDateNow - itemDateNow > dayMs * 2) {
      const currentWeekDay = date.toLocaleDateString('en-GB', { weekday: 'long' });
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
