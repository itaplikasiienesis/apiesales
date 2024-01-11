module.exports.route = {
    "GET /variant": "transactions/eproposal/master/VariantController.getby",
    "GET /master/variant": "transactions/eproposal/master/VariantController.find",
    "GET /master/variant/:id": "transactions/eproposal/master/VariantController.findOne",
    "POST /master/variant": "transactions/eproposal/master/VariantController.create",
    "PUT /master/variant": "transactions/eproposal/master/VariantController.update",
    "DELETE /master/variant/:id": "transactions/eproposal/master/VariantController.delete",
  };
    