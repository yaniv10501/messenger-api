require('dotenv').config();
const express = require('express');
const path = require('path');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const ServerError = require('./utils/errors/ServerError');
const ResourceNotFound = require('./utils/errors/ResourceNotFound');
const routes = require('./routes/index');
const corsOptions = require('./utils/cors');
const { initWebSocket } = require('./webSockets/webSockets');
const initStartUp = require('./utils/startUp');

const app = express();

const {
  PORT = 3000,
  NODE_ENV = 'development',
  MONGO_DB_SERVER = 'mongodb://localhost:27017',
  COOKIE_SECRET = 'cookie-secret',
} = process.env;

initStartUp();

mongoose.connect(`${MONGO_DB_SERVER}/messenger`);

app.set('port', PORT);
app.set('env', NODE_ENV);

app.use(fileUpload());
app.use(express.json());
app.use(cookieParser(COOKIE_SECRET));
app.use(cors(corsOptions));
app.use(helmet());

app.use('/usersImages', express.static('usersImages'));

app.use(routes);

app.get('/image/profile', (req, res) => {
  const { _id } = req.user;
  res.sendFile(path.join(__dirname, `./usersImages/${_id}/profile-pic.png`));
});

app.use((req, res, next) => new ResourceNotFound(req, res, next));

app.use(ServerError);

const server = app.listen(PORT, () => {
  logger.log(`Listening on Port - ${PORT}, Environment - ${NODE_ENV}`);
});

initWebSocket(server);
