/* eslint-disable no-undef */
/**
 * api/responses/success.js
 *
 * This will be available in controllers as res.success(data);
 */

module.exports = function(
  error,
  message = "Oops.. Your request failed!",
  status = 500
) {
  var res = this.res;

  var result = {
    status,
    error: true,
    message,
    meta: error
  };

  return res.status(status).json(result);
};
