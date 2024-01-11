/* eslint-disable no-undef */
module.exports.route = {
    "GET /summary/eprop/po": "transactions/eproposal/report/SummaryEpropByPoController.find",
    "GET /summary/eprop/po/exportExcel": "transactions/eproposal/report/SummaryEpropByPoController.exportExcel"
};

