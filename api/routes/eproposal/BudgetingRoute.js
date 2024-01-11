/* eslint-disable no-undef */
module.exports.route = {
    "GET /budgeting": "transactions/eproposal/BudgetingController.find",
    "GET /budgeting/exportexcel": "transactions/eproposal/BudgetingController.exportExcel",
    "POST /budgeting": "transactions/eproposal/BudgetingController.create",
    "POST /movement/budgeting": "transactions/eproposal/BudgetingController.movebudget",
    "GET /budgeting/:id": "transactions/eproposal/BudgetingController.findOne",
  };
    


  