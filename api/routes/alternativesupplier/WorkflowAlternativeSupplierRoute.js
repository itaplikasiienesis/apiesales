module.exports.route = {
    "GET /alternativesupplier/workflow": "transactions/alternativesupplier/WorkflowAlternativeSupplierController.find",
    "GET /alternativesupplier/workflow/:id": "transactions/alternativesupplier/WorkflowAlternativeSupplierController.findOne",
    "POST /alternativesupplier/workflow": "transactions/alternativesupplier/WorkflowAlternativeSupplierController.new",
    "DELETE /alternativesupplier/workflow/:id": "transactions/alternativesupplier/WorkflowAlternativeSupplierController.deleteData",
    "PUT /alternativesupplier/workflow": "transactions/alternativesupplier/WorkflowAlternativeSupplierController.updateData",
};