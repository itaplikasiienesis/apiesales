/* eslint-disable no-undef */
module.exports.route = {

    "GET /userorganisasi": "master/UserOrganisasiController.find",
    "GET /userorganisasi/:id": "master/UserOrganisasiController.findOne",
    "POST /userorganisasi": "master/UserOrganisasiController.new",
    "PUT /userorganisasi": "master/UserOrganisasiController.update",
    "DELETE /userorganisasi": "master/UserOrganisasiController.delete"
  };  