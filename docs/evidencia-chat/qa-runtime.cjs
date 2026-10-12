const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');

// Dependencias de QA aisladas del producto; ver README.md de este directorio.
const repositoryRoot = path.resolve(__dirname, '../..');
const qaRequire = createRequire(path.join(repositoryRoot, '.tmp/qa/package.json'));

module.exports = {
  require: qaRequire,
  moduleUrl: (name) => pathToFileURL(qaRequire.resolve(name)).href,
  output: __dirname,
  file: (name) => path.join(__dirname, name),
  chromePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
};
