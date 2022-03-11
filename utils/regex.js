module.exports.testUrl = (url) => {
  const pattern =
    /https?:\/\/(www\.)?[\w._-~:/?%#[\]@!$&'()*+,;=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([\w._-~:/?%#[\]@\-!$&'()*+,;=]*)/;
  console.log(url, pattern.test(url));
  return {
    valid: pattern.test(url),
    match: url.match(pattern),
  };
};

module.exports.testEmail = (email) => {
  const emailToTest = email.toLowerCase();
  const pattern =
    /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[x01-x08x0bx0cx0e-x1fx21x23-x5bx5d-x7f]|\\[x01-x09x0bx0cx0e-x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[x01-x08x0bx0cx0e-x1fx21-x5ax53-x7f]|\\[x01-x09x0bx0cx0e-x7f])+)\])/;
  console.log(emailToTest, pattern.test(emailToTest));
  return {
    valid: pattern.test(emailToTest),
    match: emailToTest.match(pattern),
  };
};

module.exports.testName = (name) => {
  const pattern = /^[a-zA-Z]+$/;
  console.log(name, pattern.test(name));
  return {
    valid: pattern.test(name),
    match: name.match(pattern),
  };
};

module.exports.testStrength = (string) => {
  const pattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.*\s).*$/;
  console.log(string, pattern.test(string));
  return pattern.test(string);
};

module.exports.testMessage = (message) => {
  const pattern = /[<>]/;
  console.log(message, pattern.test(message));
  return {
    valid: !pattern.test(message),
    match: message.match(pattern),
  };
};

module.exports.replace24Pattern = /^24/;
module.exports.removeSecondsPattern = /:[0-9]{2}$/;
