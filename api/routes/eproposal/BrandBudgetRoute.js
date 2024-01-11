/* eslint-disable no-undef */
module.exports.route = {
    "GET /brandbudget": "transactions/eproposal/BrandBudgetController.find",
    "GET /brandbudget/:id": "transactions/eproposal/BrandBudgetController.findOne",
    "GET /brandbudget/excel": "transactions/eproposal/BrandBudgetController.exportToExcel",
    "GET /brandbudget/csv": "transactions/eproposal/BrandBudgetController.exportToCsv",
  };
    