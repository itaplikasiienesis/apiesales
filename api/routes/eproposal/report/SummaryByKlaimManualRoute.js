/* eslint-disable no-undef */
module.exports.route = {
    "GET /summary/eprop/klaimManual": "transactions/eproposal/report/SummaryByKlaimManualController.find",
    "GET /summary/eprop/klaimManual/exportExcel": "transactions/eproposal/report/SummaryByKlaimManualController.exportExcel",
};