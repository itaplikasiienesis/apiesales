// eslint-disable-next-line no-undef
module.exports.route = {

    "GET /transporter": "master/TransporterController.find",
    "GET /transporter/checktransporter/:id": "master/TransporterController.checkTransporter",
    "GET /transporter/:id": "master/TransporterController.findOne",
    "DELETE /transporter": "master/TransporterController.delete"
  
  };
    