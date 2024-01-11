module.exports.route = {
    "GET /activity": "transactions/eproposal/master/ActivityController.getby",
    "GET /master/activity": "transactions/eproposal/master/ActivityController.find",
    "GET /master/activity/:id": "transactions/eproposal/master/ActivityController.findOne",
    "POST /master/activity": "transactions/eproposal/master/ActivityController.create",
    "PUT /master/activity": "transactions/eproposal/master/ActivityController.update",
    "DELETE /master/activity/:id": "transactions/eproposal/master/ActivityController.delete",
    "GET /master/activity/getByGroupAndYear": "transactions/eproposal/master/ActivityController.getByGroupAndYear",

    
    
  };
    