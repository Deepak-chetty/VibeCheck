const serverless = require('serverless-http');
const app = require('../../server');

// Wrap Express app with serverless-http
module.exports.handler = serverless(app);
