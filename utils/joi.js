const Joi = require('joi');
const AuthorizationError = require('./errors/AuthorizationError');
const ValidationError = require('./errors/ValidationError');
const { testName, testEmail, testStrength, testMessage, testUrl } = require('./regex');

const HeaderstTokenSchema = Joi.object({
  authorization: Joi.string().required(),
}).unknown();

module.exports.validateHeaderstTokenSchema = (req, res, next) => {
  const { error } = HeaderstTokenSchema.validate(req.headers);
  if (error) return next(new AuthorizationError('Authorization is required'));
  return next();
};

const headersIdParamScehema = Joi.object({
  articleId: Joi.string().length(24).required(),
});

module.exports.validateHeadersIdParamScehema = (req, res, next) => {
  const { error } = headersIdParamScehema.validate(req.params);
  if (error) return next(new ValidationError('Invalid request'));
  return next();
};

const emailMethod = (value, helpers) => {
  const emailValid = testEmail(value);
  if (!emailValid.valid) {
    return helpers.error('any.invalid');
  }
  return value;
};

const passwordMethod = (value, helpers) => {
  const passwordValid = testMessage(value);
  if (passwordValid.valid) {
    const passwordStrong = testStrength(value);
    if (!passwordStrong) {
      return helpers.error('any.invalid');
    }
    return value;
  }
  return helpers.error('any.invalid');
};

const nameMethod = (value, helpers) => {
  const nameValid = testName(value);
  if (!nameValid.valid) {
    return helpers.error('any.invalid');
  }
  return value;
};

const stringMethod = (value, helpers) => {
  const stringValid = testMessage(value);
  if (!stringValid.valid) {
    return helpers.error('any.invalid');
  }
  return value;
};

const urlMethod = (value, helpers) => {
  const urlValid = testUrl(value);
  if (!urlValid.valid) {
    return helpers.error('any.invalid');
  }
  return value;
};

const userSchema = Joi.object({
  firstName: Joi.string().custom(nameMethod).max(30).required(),
  lastName: Joi.string().custom(nameMethod).max(30).required(),
  gender: Joi.string().custom(stringMethod).required(),
  birthday: Joi.string().custom(stringMethod).required(),
  email: Joi.string().custom(emailMethod).required(),
  password: Joi.string().custom(passwordMethod).required(),
}).unknown();

module.exports.validateUserSchema = (req, res, next) => {
  const { error } = userSchema.validate(req.body);
  if (error) return next(new ValidationError('Invalid request'));
  return next();
};

const loginSchema = Joi.object({
  email: Joi.string().custom(emailMethod).required(),
  password: Joi.string().custom(passwordMethod).required(),
});

module.exports.validateLoginSchema = (req, res, next) => {
  const { error } = loginSchema.validate(req.body);
  if (error) return next(new ValidationError('Invalid request'));
  return next();
};

const articleSchema = Joi.object({
  keyword: Joi.string().custom(stringMethod).required(),
  title: Joi.string().custom(stringMethod).required(),
  text: Joi.string().custom(stringMethod).required(),
  date: Joi.string().custom(stringMethod).required(),
  source: Joi.string().custom(stringMethod).required(),
  link: Joi.string().custom(urlMethod).required(),
  image: Joi.string().custom(urlMethod).required(),
});

module.exports.validateArticleSchema = (req, res, next) => {
  const { error } = articleSchema.validate(req.body);
  if (error) return next(new ValidationError('Invalid request'));
  return next();
};
