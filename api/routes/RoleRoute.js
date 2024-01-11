/* eslint-disable no-undef */
module.exports.route = {

    "GET /role": "master/RoleController.find",
    "GET /role/:id": "master/RoleController.findOne",
    "POST /role": "master/RoleController.new",
    "PUT /role": "master/RoleController.update",
    "DELETE /role": "master/RoleController.delete"
  
  };  