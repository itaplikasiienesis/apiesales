/* eslint-disable no-undef */
module.exports.route = {
    "GET /termofpayment": "transactions/TermOfPaymentController.find",
    "GET /termofpayment/:id": "transactions/TermOfPaymentController.findOne",
    "POST /termofpayment": "transactions/TermOfPaymentController.new",
    "POST /termofpayment/calculation": "transactions/TermOfPaymentController.calculation",
    "POST /termofpayment/requesttop": "transactions/TermOfPaymentController.requestTop"

};