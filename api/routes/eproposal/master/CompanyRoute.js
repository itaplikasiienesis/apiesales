module.exports.route = {
    "GET /master/company": "transactions/eproposal/master/CompanyController.find",
    "GET /master/company/:id": "transactions/eproposal/master/CompanyController.findOne",
    "POST /master/company": "transactions/eproposal/master/CompanyController.create",
    "PUT /master/company": "transactions/eproposal/master/CompanyController.update",
    "DELETE /master/company/:id": "transactions/eproposal/master/CompanyController.delete"
    
  };
    