/* eslint-disable no-undef */
module.exports.route = {
    "GET /budgetactivity": "transactions/eproposal/BudgetAcivityController.find",
    "GET /budgetactivity/:id": "transactions/eproposal/BudgetAcivityController.findOne",
    "GET /budgetactivity/excel": "transactions/eproposal/BudgetAcivityController.exportToExcel",
    "GET /budgetactivity/csv": "transactions/eproposal/BudgetAcivityController.exportToCsv",
    "GET /budgetsummary": "transactions/eproposal/BudgetAcivityController.findSummary",
    "GET /budgetsummary/excel": "transactions/eproposal/BudgetAcivityController.exportToExcelSummary",
    "GET /budgetsummary/csv": "transactions/eproposal/BudgetAcivityController.exportToCsvSummary"
  };
    