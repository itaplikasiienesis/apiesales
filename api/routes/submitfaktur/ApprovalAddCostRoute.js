

/* eslint-disable no-undef */
module.exports.route = {
    "POST /billing/approve/addcost": "transactions/submitfaktur/ApprovalAddCostController.approve",
    "POST /billing/reject/addcost": "transactions/submitfaktur/ApprovalAddCostController.reject"
};

