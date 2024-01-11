module.exports.route = {
    "GET /markettype": "transactions/eproposal/master/MarketTypeController.getby",
    "GET /master/markettype": "transactions/eproposal/master/MarketTypeController.find",
    "GET /master/markettype/:id": "transactions/eproposal/master/MarketTypeController.findOne",
    "POST /master/markettype": "transactions/eproposal/master/MarketTypeController.create",
    "PUT /master/markettype": "transactions/eproposal/master/MarketTypeController.update",
    "DELETE /master/markettype/:id": "transactions/eproposal/master/MarketTypeController.delete",

  };
    