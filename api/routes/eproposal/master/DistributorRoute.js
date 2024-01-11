module.exports.route = {
    "GET /distributor_mt": "transactions/eproposal/master/DistributorController.getby",
    "GET /master/distributor": "transactions/eproposal/master/DistributorController.find",
    "GET /master/distributor/:id": "transactions/eproposal/master/DistributorController.findOne",
    "POST /master/distributor": "transactions/eproposal/master/DistributorController.create",
    "PUT /master/distributor": "transactions/eproposal/master/DistributorController.update",
    "DELETE /master/distributor/:id": "transactions/eproposal/master/DistributorController.delete",
    
  };
    