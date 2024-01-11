module.exports.route = {
    "GET /division": "transactions/eproposal/master/DivisionController.getby",
    "GET /master/division": "transactions/eproposal/master/DivisionController.find",
    "GET /master/division/:id": "transactions/eproposal/master/DivisionController.findOne",
    "POST /master/division": "transactions/eproposal/master/DivisionController.create",
    "PUT /master/division": "transactions/eproposal/master/DivisionController.update",
    "DELETE /master/division/:id": "transactions/eproposal/master/DivisionController.delete"
  };
    