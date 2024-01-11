module.exports.route = {
    "GET /master/workflow": "transactions/eproposal/master/WorkFlowController.find",
    "GET /master/workflow/:id": "transactions/eproposal/master/WorkFlowController.findOne",
    "POST /master/workflow": "transactions/eproposal/master/WorkFlowController.create",
    "PUT /master/workflow": "transactions/eproposal/master/WorkFlowController.update",
    "DELETE /master/workflow/:id": "transactions/eproposal/master/WorkFlowController.delete",
    "DELETE /master/workflow/details/:id": "transactions/eproposal/master/WorkFlowController.deleteDetails"
  };