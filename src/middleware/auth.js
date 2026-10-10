/**
 * Auth Middleware — barrel re-export: CSRF + cookies
 */

module.exports = {
  ...require("./csrf"),
  ...require("./cookies"),
};
