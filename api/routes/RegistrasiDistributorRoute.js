// eslint-disable-next-line no-undef
module.exports.route = {

    "GET /register": "transactions/RegistrasiDistributorController.find",
    "GET /register/:id": "transactions/RegistrasiDistributorController.findOne",
    "POST /register": "transactions/RegistrasiDistributorController.new",
    "POST /register/sales": "transactions/RegistrasiDistributorController.approveSales",
    "POST /register/accounting": "transactions/RegistrasiDistributorController.approveAccounting",
    "POST /register/logistik": "transactions/RegistrasiDistributorController.approveLogistik",
    "PUT /register": "transactions/RegistrasiDistributorController.update",
    "DELETE /register": "transactions/RegistrasiDistributorController.delete"
  
  };
  