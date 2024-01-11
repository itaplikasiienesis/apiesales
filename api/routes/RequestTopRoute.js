/* eslint-disable no-undef */
module.exports.route = {
    "GET /requesttop": "transactions/RequestTopController.find",
    "GET /requesttop/:id": "transactions/RequestTopController.findOne",
    "POST /requesttop/process": "transactions/RequestTopController.prosesTop"
};