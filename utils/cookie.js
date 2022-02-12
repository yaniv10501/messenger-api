exports.objectifyCookie = (cookie, splitChar) => {
  if (!cookie) return {};

  if (!splitChar) {
    const objectedCookie = {};
    cookie.split('; ').forEach((item) => {
      const [key, value] = item.split('=');
      objectedCookie[key] = value;
    });
    return objectedCookie;
  }

  const arrayCookie = cookie
    .split(splitChar)
    .map((item) => (item.includes(':') ? item.replace(':', '') : item));

  const objectedCookie = {};

  for (let i = 0; i < arrayCookie.length; i += 1) {
    objectedCookie[arrayCookie[i]] = arrayCookie[i + 1];

    i += 1;
  }

  return objectedCookie;
};
