/* eslint-disable no-undef */
module.exports.route = {
    "GET /payment/generate": "transactions/eproposal/report/PaymentController.generate",
    "GET /payment/generate/excel": "transactions/eproposal/report/PaymentGenerateToExcelController.generate",
    "GET /payment/generate/csv": "transactions/eproposal/report/PaymentGenerateToCsvController.generate",
    "GET /payment/generate/pdf": "transactions/eproposal/report/PaymentGeneratePdfController.generate",
};