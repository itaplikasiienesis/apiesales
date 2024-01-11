// eslint-disable-next-line no-undef
module.exports.route = {
    "GET /menu": "auth/MenuController.find",
    "GET /menu/:id": "auth/MenuController.findOne",
    "GET /menu/roles": "auth/MenuController.findRoles",
    "POST /menu": "auth/MenuController.new",
    "PUT /menu": "auth/MenuController.update",
    "DELETE /menu": "auth/MenuController.delete"
  };
  