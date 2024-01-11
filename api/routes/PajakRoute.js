/* eslint-disable no-undef */
module.exports.route = {
    "GET /pajak": "master/PajakController.find",
    "GET /pajak/:id": "master/PajakController.findOne",
    "POST /pajak": "master/PajakController.new",
    "DELETE /pajak": "master/PajakController.delete"
  };