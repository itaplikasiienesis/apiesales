/* eslint-disable no-undef */
module.exports.route = {
    "GET /roles": "roles/RolesController.find",
    "GET /roles/:id": "roles/RolesController.findOne",
    "POST /roles": "roles/RolesController.new",
    "PUT /roles": "roles/RolesController.update",
    "DELETE /roles": "roles/RolesController.delete",
    "POST /roles/attribute": "roles/RolesController.getattribute",
    "POST /maintaindata": "roles/RolesController.maintaindata",
    
  };
    