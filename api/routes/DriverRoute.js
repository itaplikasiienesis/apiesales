/* eslint-disable no-undef */
module.exports.route = {
    "GET /driver": "master/DriverController.find",
    "GET /driver/:id": "master/DriverController.findOne",
    "POST /driver": "master/DriverController.new",
    "PUT /driver": "master/DriverController.update",
    "DELETE /driver": "master/DriverController.delete"
  };
    