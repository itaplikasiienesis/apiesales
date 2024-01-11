module.exports.route = {
    "GET /master/brand": "transactions/eproposal/master/BrandController.find",
    "GET /master/brand/:id": "transactions/eproposal/master/BrandController.findOne",
    "GET /brand": "transactions/eproposal/master/BrandController.getby",
    "POST /master/brand": "transactions/eproposal/master/BrandController.create",
    "PUT /master/brand": "transactions/eproposal/master/BrandController.update",
    "DELETE /master/brand/:id": "transactions/eproposal/master/BrandController.delete",
  };
    