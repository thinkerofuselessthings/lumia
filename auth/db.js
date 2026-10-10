/**
 * DB Auth — barrel re-export: password + sessions + seed
 */

module.exports = {
  ...require("./password"),
  ...require("./sessions"),
  ...require("./seed"),
};
