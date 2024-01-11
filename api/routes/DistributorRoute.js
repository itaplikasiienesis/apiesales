/* eslint-disable no-undef */
module.exports.route = {
    "GET /shipto": "master/DistributorController.getshipto",
    "GET /shiptoall": "master/DistributorController.getshipto2",
    "GET /distributor": "master/DistributorController.find",
    "GET /distributor/:id": "master/DistributorController.findOne",
    "GET /distributor/cekstatus/:id": "master/DistributorController.cekDistributor",
    "POST /distributor": "master/DistributorController.new",
    "POST /distributor/createAccount": "master/DistributorController.createAccount",
    "DELETE /distributor": "master/DistributorController.delete"
  };