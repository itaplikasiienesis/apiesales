/* eslint-disable no-undef */
/**
 * api/responses/success.js
 *
 * This will be available in controllers as res.success(data);
 */

module.exports = function(responseData, status = 200) {
  var res = this.res;

  var result = {};

  result.status = status;
  result.error = false;

  result.message = "Data fetched successfully";
  if (responseData.message) {
    result.message = responseData.message;
  }

  if (responseData.hasOwnProperty("result")) {
    if (responseData.result) {
      if (Array.isArray(responseData.result)) {
        result.results = responseData.result;
      } else {
        result.result = responseData.result;
      }
    }

    if (responseData.meta) {
      result.meta = responseData.meta;
    }
  } else {
    result.data = responseData.data;
  }

  if (responseData.error) {
    result.error = responseData.error;
  }

  return res.status(status).json(result);
};
