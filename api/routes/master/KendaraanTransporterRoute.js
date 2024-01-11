module.exports.route = {
    "GET /master/kendaraan/transporter": "master/KendaraanTransporterController.find",
    "GET /master/kendaraan/transporter/:id": "master/KendaraanTransporterController.findOne",
    "POST /master/kendaraan/transporter": "master/KendaraanTransporterController.new",
    "PUT /master/kendaraan/transporter": "master/KendaraanTransporterController.update",
    "DELETE /master/kendaraan/transporter/:id": "master/KendaraanTransporterController.delete",
};