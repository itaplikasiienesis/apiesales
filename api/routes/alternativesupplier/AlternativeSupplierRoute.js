module.exports.route = {
    "GET /alternativesupplier": "transactions/alternativesupplier/AlternativeSupplierController.find",
    "GET /alternativesupplier/:id": "transactions/alternativesupplier/AlternativeSupplierController.findOne",
    "POST /alternativesupplier": "transactions/alternativesupplier/AlternativeSupplierController.create",
    "POST /alternativesupplier/reject": "transactions/alternativesupplier/ApprovalAlternativeSupplierController.reject",
    "POST /alternativesupplier/approve": "transactions/alternativesupplier/ApprovalAlternativeSupplierController.approve",
    "POST /alternativesupplier/result": "transactions/alternativesupplier/ApprovalAlternativeSupplierController.result",
    "GET /alternativesupplier/download": "transactions/alternativesupplier/ApprovalAlternativeSupplierController.download",
    "GET /alternativesupplier/getheaddivision": "transactions/alternativesupplier/AlternativeSupplierController.getheaddivision",
    "GET /alternativesupplier/getapproval/:nip": "transactions/alternativesupplier/AlternativeSupplierController.getApproval",
    "GET /alternativesupplier/gettesting/:nip": "transactions/alternativesupplier/AlternativeSupplierController.getTesting"
    
};