module.exports.route = {
    "GET /cmo/getapproval/:nik": "transactions/cmo/DataApprovalCmoController.totalApproval",
    "GET /cmo/dataAprovalSales": "transactions/cmo/DataApprovalCmoController.find",
};