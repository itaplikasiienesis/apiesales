// eslint-disable-next-line no-undef
module.exports.route = {

  "GET /kendaraan": "master/KendaraanController.find",
  "GET /kendaraan/:id": "master/KendaraanController.findOne",
  "POST /kendaraan": "master/KendaraanController.new",
  "POST /kendaraan/calculation": "master/KendaraanController.calculation",
  "PUT /kendaraan": "master/KendaraanController.update",
  "DELETE /kendaraan": "master/KendaraanController.delete"

};
