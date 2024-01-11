module.exports.route = {
    "GET /datacentercustomer": "master/DatabaseCenterCustomerController.find",
    "GET /datacentercustomer/all": "master/DatabaseCenterCustomerController.findAll",
    "GET /datacentercustomer/:id": "master/DatabaseCenterCustomerController.findOne",
    "POST /upload/database/customer": "master/DatabaseCenterCustomerController.upload"

};
  