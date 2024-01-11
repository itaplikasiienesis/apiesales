module.exports.route = {
    "GET /workflowdetail": "transactions/alternativesupplier/WorkflowAlternativeSupplierDetailController.find",
    "GET /workflowdetail/:id": "transactions/alternativesupplier/WorkflowAlternativeSupplierDetailController.findOne",
    "GET /workflowdetail/header/:id": "transactions/alternativesupplier/WorkflowAlternativeSupplierDetailController.findByHeader",
};