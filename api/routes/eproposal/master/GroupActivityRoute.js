module.exports.route = {
    "GET /groupactivity": "transactions/eproposal/master/GroupActivityController.getby",
    "GET /master/groupactivity": "transactions/eproposal/master/GroupActivityController.find",
    "GET /master/groupactivity/:id": "transactions/eproposal/master/GroupActivityController.findOne",
    "POST /master/groupactivity": "transactions/eproposal/master/GroupActivityController.create",
    "PUT /master/groupactivity": "transactions/eproposal/master/GroupActivityController.update",
    "DELETE /master/groupactivity/:id": "transactions/eproposal/master/GroupActivityController.delete",
    "GET /groupactivity/budgeting/:budgetYear": "transactions/eproposal/master/GroupActivityController.getByYearBudgeting",
    "GET /groupactivity/budgetactivity/:budgetYear": "transactions/eproposal/master/GroupActivityController.getByYearBudgetActivity"
  };
    