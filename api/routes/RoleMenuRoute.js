/* eslint-disable no-undef */
module.exports.route = {
    "GET /rolemenu": "master/RoleMenuController.find",
    "GET /rolemenu/:id": "master/RoleMenuController.findOne",
    "POST /rolemenu": "master/RoleMenuController.new",
    "PUT /rolemenu": "master/RoleMenuController.update",
    "DELETE /rolemenu": "master/RoleMenuController.delete"
};