module.exports.route = {
    "GET /region": "transactions/eproposal/master/RegionController.getby",
    "GET /master/region": "transactions/eproposal/master/RegionController.find",
    "GET /master/region/:id": "transactions/eproposal/master/RegionController.findOne",
    "POST /master/region": "transactions/eproposal/master/RegionController.create",
    "PUT /master/region": "transactions/eproposal/master/RegionController.update",
    "DELETE /master/region/:id": "transactions/eproposal/master/RegionController.delete",
  };
    