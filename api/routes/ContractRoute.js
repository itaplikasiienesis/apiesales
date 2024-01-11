// eslint-disable-next-line no-undef
module.exports.route = {
    "GET /contract": "transactions/ContractController.find",
    "GET /contract/:id": "transactions/ContractController.findOne",
    "PUT /contract": "transactions/ContractController.assignDriver"
};
  