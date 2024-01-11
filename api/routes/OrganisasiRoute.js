/* eslint-disable no-undef */
module.exports.route = {

  "GET /organisasi": "master/OrganisasiController.find",
  "GET /organisasi/:id": "master/OrganisasiController.findOne",
  "POST /organisasi": "master/OrganisasiController.new",
  "PUT /organisasi": "master/OrganisasiController.update",
  "DELETE /organisasi": "master/OrganisasiController.delete"

};
    