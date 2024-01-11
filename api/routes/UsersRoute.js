/* eslint-disable no-undef */
module.exports.route = {

    "GET /users": "auth/UsersController.find",
    "GET /users/:id": "auth/UsersController.findOne",
    "GET /users/planner": "auth/UsersController.getPlanner",
    "POST /users": "auth/UsersController.new",
    "POST /users/changepassword": "auth/UsersController.changePassword",
    "POST /users/resetpassword": "auth/UsersController.resetPassword",
    "POST /acces-token": "auth/UsersController.accesToken",
    "POST /login": "auth/UsersController.login",
    "POST /logout": "auth/UsersController.logout",
    "PUT /users": "auth/UsersController.update",
    "DELETE /users": "auth/UsersController.delete",
    "GET /trysendmail" : "SampleSendMailController.trySendMail",
    "GET /samplefilter" : "SampleFilterController.find",
    "GET /cektokencookies" : "auth/UsersController.cekTokenCookies"
    
  };
