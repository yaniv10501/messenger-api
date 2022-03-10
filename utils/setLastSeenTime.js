const { weekMs, dayMs, hourMs, minuteMs } = require('../assets/time');

const setLastSeenTime = (lastSeenTime) => {
  if (!lastSeenTime) return '';
  const timeNow = Date.now();
  const timeDif = timeNow - lastSeenTime;
  const lastSeenDate = new Date(lastSeenTime).toLocaleDateString('en-GB');
  const currentWeekDay = new Date().toLocaleDateString('en-GB', { weekday: 'long' });
  const lastSeendDay = new Date(lastSeenTime).toLocaleDateString('en-GB', { weekday: 'long' });
  if (timeDif > weekMs) {
    return `at ${lastSeenDate}`;
  }
  if (timeDif > dayMs) {
    if (currentWeekDay === lastSeendDay) {
      return `at ${lastSeenDate}`;
    }
    const dayDif = Math.round(timeDif / dayMs);
    return `${dayDif} days ago`;
  }
  if (timeDif > hourMs) {
    const hourDif = Math.round(timeDif / hourMs);
    return `${hourDif} hours ago`;
  }
  const minuteDif = Math.round(timeDif / minuteMs);
  return `${minuteDif === 0 ? 1 : minuteDif} minutes ago`;
};

module.exports = setLastSeenTime;
