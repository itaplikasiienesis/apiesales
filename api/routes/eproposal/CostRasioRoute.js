/* eslint-disable no-undef */
module.exports.route = {
    "GET /proposal/costrasio": "transactions/eproposal/CostRasioController.find",
    "GET /proposal/costrasio/:id": "transactions/eproposal/CostRasioController.findOne",
    "GET /proposal/history/costrasio": "transactions/eproposal/CostRasioController.findHistory",
    "GET /proposal/history/costrasio/:id": "transactions/eproposal/CostRasioController.findOneHistory",
    "POST /proposal/costrasio": "transactions/eproposal/CostRasioController.prosesCostRasio",

  };

    

  