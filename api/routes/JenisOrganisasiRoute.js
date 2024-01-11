/* eslint-disable no-undef */
module.exports.route = {
  "GET /jenisorganisasi": "master/JenisOrganisasiController.find",
  "GET /jenisorganisasi/:id": "master/JenisOrganisasiController.findOne",
  "POST /jenisorganisasi": "master/JenisOrganisasiController.new",
  "PUT /jenisorganisasi": "master/JenisOrganisasiController.update",
  "DELETE /jenisorganisasi": "master/JenisOrganisasiController.delete"
};
  