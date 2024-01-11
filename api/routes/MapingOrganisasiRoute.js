module.exports.route = {
    "GET /mapingorganisasi/list": "transactions/MapingOrganisasiController.find",
    "GET /mapingorganisasi/:id": "transactions/MapingOrganisasiController.findOne",
    "POST /mapingorganisasi/action": "transactions/MapingOrganisasiController.action",
}