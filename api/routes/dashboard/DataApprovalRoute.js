/* eslint-disable no-undef */
module.exports.route = {
    "GET /dashboard/approval/:id": "transactions/dashboard/DataApprovalController.findOne",
    "GET /dashboard/apep/:id": "transactions/dashboard/DataApprovalController.findOneEProp",
    "GET /dashboard/approvalEProp/:id": "transactions/dashboard/DataApprovalController.findOneEProp",
  };
    