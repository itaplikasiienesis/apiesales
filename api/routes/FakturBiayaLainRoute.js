// eslint-disable-next-line no-undef
module.exports.route = {
    "GET /fakturbiayalain": "transactions/FakturBiayaLainController.find",
    "GET /fakturbiayalain/:id": "transactions/FakturBiayaLainController.findByInvoiceId",
    "POST /fakturbiayalain": "transactions/FakturBiayaLainController.new",
    "PUT /fakturbiayalain": "transactions/FakturBiayaLainController.update",
    "DELETE /fakturbiayalain": "transactions/FakturBiayaLainController.delete"
  };