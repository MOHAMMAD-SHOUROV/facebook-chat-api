const loginHelper = require('./api');
const utils = require('./utils');

module.exports = function login(credentials, callback) {
  if (!credentials || (!credentials.email && !credentials.appState)) {
    return callback({ error: 'Missing credentials' });
  }

  loginHelper(credentials, (err, api) => {
    if (err) return callback(err);

    // Attach utilities and listenMqtt
    const listenMqtt = require('./listenMqtt')(api);
    callback(null, {
      ...api,
      listenMqtt,
      ...utils
    });
  });