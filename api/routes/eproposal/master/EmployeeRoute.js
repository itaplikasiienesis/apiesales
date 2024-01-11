module.exports.route = {
    "GET /master/employee": "transactions/eproposal/master/EmployeeController.find",
    "GET /master/employee/all": "transactions/eproposal/master/EmployeeController.findAll",
    "GET /master/employee/:id": "transactions/eproposal/master/EmployeeController.findOne",
    "POST /master/employee": "transactions/eproposal/master/EmployeeController.create",
    "PUT /master/employee": "transactions/eproposal/master/EmployeeController.update",
    "DELETE /master/employee/:id": "transactions/eproposal/master/EmployeeController.delete"
  };