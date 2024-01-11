/* eslint-disable no-undef */
module.exports.route = {
    "GET /billing/addcost": "transactions/submitfaktur/AddCostTransporterController.find",
    "GET /billing/addcost/:id": "transactions/submitfaktur/AddCostTransporterController.findOne"
};
    