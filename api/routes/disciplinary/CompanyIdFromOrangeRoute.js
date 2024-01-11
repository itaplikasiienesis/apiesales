/* eslint-disable no-undef */
module.exports.route = {
    "GET /orange/company": "transactions/disciplinary/CompanyIdFromOrangeController.find",
    "GET /orange/company/:company_id": "transactions/disciplinary/CompanyIdFromOrangeController.findOne"
  };
    