/* eslint-disable no-undef */
module.exports.route = {
    "GET /summary/eprop": "transactions/eproposal/report/SummaryEpropController.getData",
    "GET /summary/eprop/channel": "transactions/eproposal/report/SummaryReportByChannelController.find",
    "GET /summary/eprop/channel/exportExcel": "transactions/eproposal/report/SummaryReportByChannelController.exportExcel",
    "GET /summary/eprop/nomorEprop": "transactions/eproposal/report/SummaryEpropController.find",
    "GET /summary/eprop/nomorEprop/exportExcel": "transactions/eproposal/report/SummaryEpropController.exportExcel"

};