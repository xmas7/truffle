// mocha is a dependency of @truffle/require, thus it is locally installed.
const mocha = require("mocha");

module.exports = function () {
  return mocha;
};
