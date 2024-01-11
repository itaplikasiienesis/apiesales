/* eslint-disable no-undef */
module.exports.route = {
    "GET /logbook/generate": "transactions/eproposal/report/LogbookController.generate",
    "GET /logbook/generate/excel": "transactions/eproposal/report/LogbookGenerateToExcelController.generate",
    "GET /logbook/generate/csv": "transactions/eproposal/report/LogbookGenerateToCsvController.generate",
    "GET /logbook/generate/pdf": "transactions/eproposal/report/LogbookGeneratePdfController.generate",
};