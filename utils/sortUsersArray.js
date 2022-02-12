const sortUsersArray = (usersArray) => {
  const sortedUsersList = usersArray.sort((a, b) => {
    if (a.firstName) {
      const nameA = a.firstName.toUpperCase();
      const nameB = b.firstName.toUpperCase();
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      const lastNameA = a.lastName.toUpperCase();
      const lastNameB = b.lastName.toUpperCase();
      if (lastNameA < lastNameB) {
        return -1;
      }
      if (lastNameA > lastNameB) {
        return 1;
      }
      return 0;
    }
    const nameA = a.friend.firstName.toUpperCase();
    const nameB = b.friend.firstName.toUpperCase();
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    const lastNameA = a.friend.lastName.toUpperCase();
    const lastNameB = b.friend.lastName.toUpperCase();
    if (lastNameA < lastNameB) {
      return -1;
    }
    if (lastNameA > lastNameB) {
      return 1;
    }
    return 0;
  });
  return sortedUsersList;
};

module.exports = sortUsersArray;
